import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const STEAMSPY_URL = "https://steamspy.com/api.php?request=all&page=";
const STEAMSPY_APPDETAILS_URL = "https://steamspy.com/api.php?request=appdetails&appid=";
const TARGET_COUNT = 5000;
const OUTPUT_DIR = "data";
const OUTPUT_FILE = "steam_top_5000_games.json";
const METADATA_CONCURRENCY = 20;

const toNumber = (value) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const computeReviewRatio = (positive, negative) => {
  const total = positive + negative;
  if (total <= 0) return null;
  return Math.round((positive / total) * 10000) / 10000;
};

const normalizeTags = (tagsObj) => {
  if (!tagsObj || typeof tagsObj !== "object") return [];
  return Object.keys(tagsObj).sort((a, b) => {
    const bv = toNumber(tagsObj[b]);
    const av = toNumber(tagsObj[a]);
    return bv - av;
  });
};

const fetchSteamSpyPage = async (page) => {
  const res = await fetch(`${STEAMSPY_URL}${page}`);
  if (!res.ok) {
    throw new Error(`SteamSpy page ${page} failed with status ${res.status}`);
  }
  return res.json();
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchSteamSpyAppDetails = async (appid, attempt = 1) => {
  const res = await fetch(`${STEAMSPY_APPDETAILS_URL}${appid}`);
  if (!res.ok) {
    if (attempt < 3) {
      await delay(200 * attempt);
      return fetchSteamSpyAppDetails(appid, attempt + 1);
    }
    return null;
  }

  const json = await res.json();
  if (!json || typeof json !== "object") {
    return null;
  }
  return json;
};

const parseGenres = (rawGenre) => {
  if (!rawGenre || typeof rawGenre !== "string") return [];
  return rawGenre
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

const mergeUnique = (left, right) => {
  return Array.from(new Set([...(left ?? []), ...(right ?? [])]));
};

const enrichRankedWithMetadata = async (ranked) => {
  const enriched = new Array(ranked.length);

  for (let i = 0; i < ranked.length; i += METADATA_CONCURRENCY) {
    const batch = ranked.slice(i, i + METADATA_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (game) => {
        const details = await fetchSteamSpyAppDetails(game.appid);
        if (!details) return game;

        const detailGenres = parseGenres(details.genre);
        const detailTags = normalizeTags(details.tags);

        return {
          ...game,
          genres: mergeUnique(game.genres, detailGenres),
          tags: mergeUnique(game.tags, detailTags),
        };
      })
    );

    for (let j = 0; j < batchResults.length; j += 1) {
      enriched[i + j] = batchResults[j];
    }

    console.log(`Enriched metadata for ${Math.min(i + batch.length, ranked.length)} / ${ranked.length} games.`);
  }

  return enriched;
};

const main = async () => {
  console.log("Fetching SteamSpy game pages...");

  const allGames = new Map();
  let page = 0;

  while (allGames.size < TARGET_COUNT) {
    const payload = await fetchSteamSpyPage(page);
    const entries = Object.values(payload ?? {});

    if (!entries.length) {
      break;
    }

    for (const game of entries) {
      const appid = toNumber(game.appid);
      if (!appid) continue;
      allGames.set(appid, game);
    }

    console.log(`Collected ${allGames.size} unique games (page ${page}).`);
    page += 1;
  }

  const ranked = Array.from(allGames.values())
    .map((g) => {
      const positive = toNumber(g.positive);
      const negative = toNumber(g.negative);
      const reviewRatio = computeReviewRatio(positive, negative);

      return {
        appid: toNumber(g.appid),
        name: g.name ?? "",
        genres: (g.genre ?? "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        tags: normalizeTags(g.tags),
        review: {
          positive,
          negative,
          total: positive + negative,
          positiveRatio: reviewRatio,
        },
        popularity: {
          score: positive,
        },
      };
    })
    .sort((a, b) => {
      if (b.popularity.score !== a.popularity.score) {
        return b.popularity.score - a.popularity.score;
      }
      return b.review.total - a.review.total;
    })
    .slice(0, TARGET_COUNT)
    .map((g, idx) => ({
      popularityRank: idx + 1,
      ...g,
    }));

  console.log("Enriching genres/tags via SteamSpy appdetails...");
  const enrichedGames = await enrichRankedWithMetadata(ranked);

  const output = {
    generatedAt: new Date().toISOString(),
    source: "steamspy",
    notes: [
      "Popularity rank is derived from positive review count, then total review volume.",
      "Genres and tags are enriched from SteamSpy appdetails per appid.",
      "This script is intended as a one-time bootstrap for a candidate game table.",
    ],
    gameCount: ranked.length,
    games: enrichedGames,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  const targetPath = join(OUTPUT_DIR, OUTPUT_FILE);
  await writeFile(targetPath, JSON.stringify(output, null, 2), "utf8");

  console.log(`Wrote ${ranked.length} games to ${targetPath}`);
};

main().catch((err) => {
  console.error("Failed to build top 5000 table:", err);
  process.exit(1);
});
