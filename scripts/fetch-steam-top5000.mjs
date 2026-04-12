import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STEAMSPY_URL            = "https://steamspy.com/api.php?request=all&page=";
const STEAMSPY_APPDETAILS_URL = "https://steamspy.com/api.php?request=appdetails&appid=";
const TARGET_COUNT            = 5000;
const OUTPUT_DIR              = "data";
const OUTPUT_FILE             = "steam_top_5000_games.json";

const METADATA_CONCURRENCY = 5;
const RETRY_ATTEMPTS       = 4;

// Popularity score weights (must sum to 1.0)
const SCORE_WEIGHTS = {
  owners:      0.50,
  reviewRatio: 0.30,
  playtime:    0.20,
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const toNumber = (value) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const parseOwnersLower = (ownersStr) => {
  // SteamSpy format: "1,000,000 .. 2,000,000"
  if (!ownersStr || typeof ownersStr !== "string") return 0;
  const lower = ownersStr.split("..")[0].replace(/,/g, "").trim();
  const n = Number(lower);
  return Number.isFinite(n) ? n : 0;
};

const computeReviewRatio = (positive, negative) => {
  const total = positive + negative;
  if (total <= 0) return null;
  return Math.round((positive / total) * 10000) / 10000;
};

/**
 * Normalize tag object into an array of { tag, votes } sorted by votes desc.
 * Preserves vote counts for use in the tag scorer downstream.
 */
const normalizeTags = (tagsObj) => {
  if (!tagsObj || typeof tagsObj !== "object" || Array.isArray(tagsObj)) return [];
  return Object.entries(tagsObj)
    .map(([tag, votes]) => ({ tag, votes: toNumber(votes) }))
    .sort((a, b) => b.votes - a.votes);
};

const parseGenres = (rawGenre) => {
  if (!rawGenre || typeof rawGenre !== "string") return [];
  return rawGenre.split(",").map((v) => v.trim()).filter(Boolean);
};

/**
 * Merge two genre arrays, deduplicating case-insensitively.
 * Preserves original casing from the first occurrence.
 */
const mergeGenres = (left = [], right = []) => {
  const seen = new Map();
  for (const g of [...left, ...right]) {
    const key = g.toLowerCase();
    if (!seen.has(key)) seen.set(key, g);
  }
  return Array.from(seen.values());
};

/**
 * Merge two tag arrays (each item: { tag, votes }).
 * On collision, keeps the higher vote count.
 */
const mergeTags = (left = [], right = []) => {
  const map = new Map();
  for (const { tag, votes } of [...left, ...right]) {
    const existing = map.get(tag);
    if (!existing || votes > existing.votes) {
      map.set(tag, { tag, votes });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.votes - a.votes);
};

// ---------------------------------------------------------------------------
// Log(x + 1) normalizer — applied across a full array to get 0–1 values
// ---------------------------------------------------------------------------

const logNormalize = (values) => {
  const logged = values.map((v) => Math.log1p(v));
  const min = Math.min(...logged);
  const max = Math.max(...logged);
  const range = max - min || 1;
  return logged.map((v) => (v - min) / range);
};

const linearNormalize = (values) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v) => (v - min) / range);
};

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

const fetchWithRetry = async (url, attempt = 1) => {
  try {
    const res = await fetch(url);
    if (res.status === 429) {
      // Rate limited — retry immediately, server will pace us
      console.warn(`  Rate limited. Retrying attempt ${attempt}...`);
      if (attempt < RETRY_ATTEMPTS) return fetchWithRetry(url, attempt + 1);
      return null;
    }
    if (!res.ok) {
      if (attempt < RETRY_ATTEMPTS) return fetchWithRetry(url, attempt + 1);
      console.warn(`  Request failed: ${url} (status ${res.status})`);
      return null;
    }
    return res.json();
  } catch (err) {
    if (attempt < RETRY_ATTEMPTS) return fetchWithRetry(url, attempt + 1);
    console.warn(`  Request error: ${url} — ${err.message}`);
    return null;
  }
};

const fetchSteamSpyPage = (page) =>
  fetchWithRetry(`${STEAMSPY_URL}${page}`);

const fetchSteamSpyAppDetails = (appid) =>
  fetchWithRetry(`${STEAMSPY_APPDETAILS_URL}${appid}`);

// ---------------------------------------------------------------------------
// Step 1 — Collect all games from SteamSpy paginated endpoint
// ---------------------------------------------------------------------------

const collectAllGames = async () => {
  console.log("Fetching SteamSpy game pages...");
  const allGames = new Map();
  let page = 0;

  while (allGames.size < TARGET_COUNT) {
    const payload = await fetchSteamSpyPage(page);
    const entries = Object.values(payload ?? {});

    if (!entries.length) {
      console.log("  Empty page returned — stopping pagination.");
      break;
    }

    for (const game of entries) {
      const appid = toNumber(game.appid);
      if (!appid) continue;
      allGames.set(appid, game);
    }

    console.log(`  Collected ${allGames.size} unique games (page ${page}).`);
    page += 1;
  }

  return allGames;
};

// ---------------------------------------------------------------------------
// Step 2 — Parse raw SteamSpy entries into structured game objects
// ---------------------------------------------------------------------------

const parseGame = (g) => {
  const positive = toNumber(g.positive);
  const negative = toNumber(g.negative);
  const ownersLower = parseOwnersLower(g.owners);

  return {
    appid:       toNumber(g.appid),
    name:        g.name ?? "",
    genres:      parseGenres(g.genre),
    tags:        normalizeTags(g.tags),
    ownersLower,
    avgPlaytimeForever:    toNumber(g.average_forever),
    medianPlaytimeForever: toNumber(g.median_forever),
    review: {
      positive,
      negative,
      total:         positive + negative,
      positiveRatio: computeReviewRatio(positive, negative),
    },
  };
};

// ---------------------------------------------------------------------------
// Step 3 — Compute composite popularity score across full dataset
//
// Score = 0.50 * norm(log(owners))
//       + 0.30 * norm(positiveRatio)       ← quality signal
//       + 0.20 * norm(log(avgPlaytime))    ← engagement signal
//
// All dimensions normalized 0–1 across the full dataset before weighting,
// so no single dimension dominates due to scale differences.
// ---------------------------------------------------------------------------

const computePopularityScores = (games) => {
  const owners   = games.map((g) => g.ownersLower);
  const ratios   = games.map((g) => g.review.positiveRatio ?? 0.5);
  const playtime = games.map((g) => g.avgPlaytimeForever);

  const ownersNorm   = logNormalize(owners);
  const ratiosNorm   = linearNormalize(ratios);
  const playtimeNorm = logNormalize(playtime);

  return games.map((g, i) => {
    const score =
      SCORE_WEIGHTS.owners      * ownersNorm[i] +
      SCORE_WEIGHTS.reviewRatio * ratiosNorm[i] +
      SCORE_WEIGHTS.playtime    * playtimeNorm[i];

    return {
      ...g,
      popularity: {
        score:           Math.round(score * 10000) / 10000,
        ownersLower:     g.ownersLower,
        positiveRatio:   g.review.positiveRatio,
        avgPlaytimeHours: Math.round(g.avgPlaytimeForever / 60 * 10) / 10,
      },
    };
  });
};

// ---------------------------------------------------------------------------
// Step 4 — Enrich genres & tags via SteamSpy appdetails
//
// The paginated /all endpoint sometimes returns sparse tag/genre data.
// Per-appid detail calls fill in the gaps with richer metadata.
// ---------------------------------------------------------------------------

const enrichWithMetadata = async (games) => {
  console.log(`\nEnriching ${games.length} games via SteamSpy appdetails...`);
  console.log(`  Concurrency: ${METADATA_CONCURRENCY}`);

  const enriched = new Array(games.length);

  for (let i = 0; i < games.length; i += METADATA_CONCURRENCY) {
    const batch = games.slice(i, i + METADATA_CONCURRENCY);

    const results = await Promise.all(
      batch.map(async (game) => {
        const details = await fetchSteamSpyAppDetails(game.appid);
        if (!details || typeof details !== "object") return game;

        const detailGenres = parseGenres(details.genre);
        const detailTags   = normalizeTags(details.tags);

        return {
          ...game,
          genres: mergeGenres(game.genres, detailGenres),
          tags:   mergeTags(game.tags, detailTags),
        };
      })
    );

    for (let j = 0; j < results.length; j++) {
      enriched[i + j] = results[j];
    }

    const done = Math.min(i + batch.length, games.length);
    console.log(`  Enriched ${done} / ${games.length} games.`);
  }

  return enriched;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  // Step 1: Collect raw data
  const allGames = await collectAllGames();

  // Step 2: Parse into structured objects
  const parsed = Array.from(allGames.values()).map(parseGame);

  // Step 3: Score across full dataset, then sort + slice top N
  const scored = computePopularityScores(parsed)
    .sort((a, b) => b.popularity.score - a.popularity.score)
    .slice(0, TARGET_COUNT)
    .map((g, idx) => ({ popularityRank: idx + 1, ...g }));

  // Step 4: Enrich with per-game metadata
  const enriched = await enrichWithMetadata(scored);

  // Build output
  const output = {
    generatedAt: new Date().toISOString(),
    source:      "steamspy",
    scoreWeights: SCORE_WEIGHTS,
    notes: [
      "Popularity score is a weighted composite: 50% log(owners), 30% positive review ratio, 20% log(avg playtime).",
      "All score dimensions are normalized 0–1 across the full dataset before weighting.",
      "Tags preserve vote counts ({ tag, votes }) for downstream tag scoring.",
      "Genres are merged from both the paginated list and per-appid detail calls.",
      "This dataset is intended as a one-time bootstrap for the recommendation candidate table.",
    ],
    gameCount: enriched.length,
    games:     enriched,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  const targetPath = join(OUTPUT_DIR, OUTPUT_FILE);
  await writeFile(targetPath, JSON.stringify(output, null, 2), "utf8");

  console.log(`\nDone. Wrote ${enriched.length} games to ${targetPath}`);
  console.log("Top 5 by popularity score:");
  for (const g of enriched.slice(0, 5)) {
    console.log(`  #${g.popularityRank} ${g.name} (score=${g.popularity.score}, owners=${g.ownersLower.toLocaleString()})`);
  }
};

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});