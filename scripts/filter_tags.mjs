import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { parseArgs } from "node:util";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_INPUT = "data/steam_top_5000_games.json";
const OUTPUT_DIR    = "data";
const OUTPUT_JSON   = "top_80_tags.json";
const TOP_N_DEFAULT = 80;

// Minimum games a tag must appear on to be included
const MIN_GAMES_THRESHOLD = 10;

// Max pairs to sample per tag for Jaccard loyalty computation
const MAX_SAMPLE_PAIRS = 200;

// Scoring weights (must sum to 1.0)
const WEIGHTS = {
  revenueWeight:     0.35,
  retentionSignal:   0.30,
  loyaltyIndex:      0.25,
  inversePrevalence: 0.10,
};

// ---------------------------------------------------------------------------
// Load data
// ---------------------------------------------------------------------------

const loadGames = async (inputPath) => {
  console.log(`Loading games from ${inputPath}...`);
  const raw = await readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw);

  // Support both raw array and the wrapped { games: [...] } shape
  // that fetch_steam_games.js produces
  const games = Array.isArray(parsed) ? parsed : (parsed.games ?? []);
  console.log(`  Loaded ${games.length} games.`);
  return games;
};

// ---------------------------------------------------------------------------
// Build tag index
//
// Tags come from two sources in the fetch output:
//   game.tags    — [{ tag: string, votes: number }, ...]
//   game.genres  — [string, ...]
//
// tag_index[tagName] = { games: [...], appids: Set }
// ---------------------------------------------------------------------------

const buildTagIndex = (games) => {
  const tagIndex = new Map();

  const getOrCreate = (tagName) => {
    if (!tagIndex.has(tagName)) {
      tagIndex.set(tagName, { games: [], appids: new Set() });
    }
    return tagIndex.get(tagName);
  };

  for (const game of games) {
    const appid = game.appid;

    // SteamSpy tags: [{ tag, votes }]
    for (const { tag } of (game.tags ?? [])) {
      const entry = getOrCreate(tag);
      if (!entry.appids.has(appid)) {
        entry.games.push(game);
        entry.appids.add(appid);
      }
    }

    // Steam Store genres: [string]
    for (const genre of (game.genres ?? [])) {
      const entry = getOrCreate(genre);
      if (!entry.appids.has(appid)) {
        entry.games.push(game);
        entry.appids.add(appid);
      }
    }
  }

  // Filter tags with too few games
  for (const [tag, data] of tagIndex) {
    if (data.appids.size < MIN_GAMES_THRESHOLD) tagIndex.delete(tag);
  }

  console.log(`  Unique tags (>= ${MIN_GAMES_THRESHOLD} games): ${tagIndex.size}`);
  return tagIndex;
};

// ---------------------------------------------------------------------------
// Dimension 1: Revenue Weight
//
// Average popularity score across games carrying this tag.
// Falls back to log(ownersLower) if popularity.score is missing.
// ---------------------------------------------------------------------------

const computeRevenueWeights = (tagIndex) => {
  const result = new Map();
  for (const [tag, { games }] of tagIndex) {
    const vals = games.map((g) => {
      const s = g.popularity?.score;
      return s != null ? s : Math.log1p(g.ownersLower ?? 0);
    });
    result.set(tag, vals.length ? mean(vals) : 0);
  }
  return result;
};

// ---------------------------------------------------------------------------
// Dimension 2: Retention Signal
//
// Average log(avgPlaytimeForever + 1) across games with this tag.
// ---------------------------------------------------------------------------

const computeRetentionSignals = (tagIndex) => {
  const result = new Map();
  for (const [tag, { games }] of tagIndex) {
    const vals = games.map((g) => Math.log1p(g.avgPlaytimeForever ?? 0));
    result.set(tag, vals.length ? mean(vals) : 0);
  }
  return result;
};

// ---------------------------------------------------------------------------
// Dimension 3: Genre Loyalty Index
//
// Approximated via Jaccard similarity of tag sets between pairs of games
// that share a tag. High Jaccard = games in this tag cluster tightly together
// = players who like one are likely to like others.
//
// Seeded deterministic sampling so results are reproducible.
// ---------------------------------------------------------------------------

const computeLoyaltyIndices = (tagIndex) => {
  console.log("Computing loyalty indices (Jaccard tag-set similarity)...");
  const result = new Map();

  for (const [tag, { games }] of tagIndex) {
    if (games.length < 2) {
      result.set(tag, 0);
      continue;
    }

    // Build a flat tag+genre set per game
    const tagSets = games.map((g) => {
      const s = new Set();
      for (const { tag: t } of (g.tags ?? [])) s.add(t);
      for (const genre of (g.genres ?? [])) s.add(genre);
      return s;
    });

    // Generate all pairs, sample if too many
    const allPairs = [];
    for (let i = 0; i < tagSets.length - 1; i++) {
      for (let j = i + 1; j < tagSets.length; j++) {
        allPairs.push([i, j]);
      }
    }

    const sampled =
      allPairs.length > MAX_SAMPLE_PAIRS
        ? seededSample(allPairs, MAX_SAMPLE_PAIRS, tag)
        : allPairs;

    const jaccScores = [];
    for (const [i, j] of sampled) {
      const a = tagSets[i];
      const b = tagSets[j];
      const intersection = countIntersection(a, b);
      const union = a.size + b.size - intersection;
      if (union > 0) jaccScores.push(intersection / union);
    }

    result.set(tag, jaccScores.length ? mean(jaccScores) : 0);
  }

  return result;
};

// ---------------------------------------------------------------------------
// Dimension 4: Inverse Prevalence
//
// 1 - (gamesWithTag / totalGames)
// ---------------------------------------------------------------------------

const computeInversePrevalence = (tagIndex, totalGames) => {
  const result = new Map();
  for (const [tag, { appids }] of tagIndex) {
    result.set(tag, 1 - appids.size / totalGames);
  }
  return result;
};

// ---------------------------------------------------------------------------
// Normalize a Map<string, number> to 0–1 range
// ---------------------------------------------------------------------------

const normalizeMap = (map) => {
  const vals = Array.from(map.values());
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const out = new Map();
  for (const [k, v] of map) out.set(k, (v - min) / range);
  return out;
};

// ---------------------------------------------------------------------------
// Final scoring + ranking
// ---------------------------------------------------------------------------

const computeFinalScores = (tagIndex, revNorm, retNorm, loyNorm, prevNorm) => {
  const rows = [];

  for (const [tag] of tagIndex) {
    const r  = revNorm.get(tag)  ?? 0;
    const rt = retNorm.get(tag)  ?? 0;
    const l  = loyNorm.get(tag)  ?? 0;
    const p  = prevNorm.get(tag) ?? 0;

    const score =
      WEIGHTS.revenueWeight     * r  +
      WEIGHTS.retentionSignal   * rt +
      WEIGHTS.loyaltyIndex      * l  +
      WEIGHTS.inversePrevalence * p;

    rows.push({
      tag,
      score:              round4(score),
      revenueWeightNorm:  round4(r),
      retentionNorm:      round4(rt),
      loyaltyNorm:        round4(l),
      invPrevalenceNorm:  round4(p),
    });
  }

  rows.sort((a, b) => b.score - a.score);
  rows.forEach((row, i) => { row.rank = i + 1; });
  return rows;
};

// ---------------------------------------------------------------------------
// Tier assignment based on score quartiles
//
// Tier 1 = top 25%  — strongest recommendation signals
// Tier 2 = 50–75%   — strong, broad signals
// Tier 3 = 25–50%   — moderate, useful in combination
// Tier 4 = bottom 25% — weak discriminators, use as filters only
// ---------------------------------------------------------------------------

const assignTiers = (rows) => {
  const scores = rows.map((r) => r.score).sort((a, b) => a - b);
  const q25 = quantile(scores, 0.25);
  const q50 = quantile(scores, 0.50);
  const q75 = quantile(scores, 0.75);

  return rows.map((row) => ({
    ...row,
    tier:
      row.score >= q75 ? 1 :
      row.score >= q50 ? 2 :
      row.score >= q25 ? 3 : 4,
  }));
};

// ---------------------------------------------------------------------------
// Save output
// ---------------------------------------------------------------------------

const saveOutput = async (rows, topN) => {
  const top = rows.slice(0, topN);

  const output = {
    generatedAt: new Date().toISOString(),
    weights: WEIGHTS,
    tagCount: top.length,
    tags: top,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outPath = join(OUTPUT_DIR, OUTPUT_JSON);
  await writeFile(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`\nSaved → ${outPath}`);
};

// ---------------------------------------------------------------------------
// Summary table
// ---------------------------------------------------------------------------

const printSummary = (rows, topN) => {
  const tierStars = { 1: "★★★★", 2: "★★★ ", 3: "★★  ", 4: "★   " };
  const top = rows.slice(0, topN);

  console.log(`\n${"=".repeat(65)}`);
  console.log(`  TOP ${topN} STEAM TAGS / GENRES BY RECOMMENDATION WEIGHT`);
  console.log(`${"=".repeat(65)}`);
  console.log(`${"Rank".padEnd(5)} ${"Tag".padEnd(35)} ${"Score".padEnd(7)} Tier`);
  console.log(`${"-".repeat(65)}`);

  for (const row of top) {
    const rank  = String(row.rank).padEnd(4);
    const tag   = row.tag.padEnd(35);
    const score = String(row.score).padEnd(7);
    const stars = tierStars[row.tier] ?? "";
    console.log(`  ${rank} ${tag} ${score} ${stars}`);
  }

  console.log(`${"=".repeat(65)}`);
  console.log("\nTier guide:");
  console.log("  Tier 1 (★★★★) — Strongest signals. Use full weight.");
  console.log("  Tier 2 (★★★ ) — Strong, broad signals. Use with context.");
  console.log("  Tier 3 (★★  ) — Moderate signals. Useful in combination.");
  console.log("  Tier 4 (★   ) — Weak discriminators. Use as filters only.");
};

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;

const round4 = (n) => Math.round(n * 10000) / 10000;

const countIntersection = (setA, setB) => {
  let count = 0;
  for (const v of setA) if (setB.has(v)) count++;
  return count;
};

/** Linear interpolation quantile (matches numpy default) */
const quantile = (sorted, q) => {
  const pos = q * (sorted.length - 1);
  const lo  = Math.floor(pos);
  const hi  = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

/**
 * Deterministic seeded sampler (mulberry32 PRNG).
 * Using the tag name as seed keeps results reproducible across runs.
 */
const seededSample = (arr, n, seed) => {
  // Hash seed string to uint32
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }

  // mulberry32
  const rand = () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };

  // Fisher-Yates on a copy, take first n
  const copy = arr.slice();
  const limit = Math.min(n, copy.length);
  for (let i = 0; i < limit; i++) {
    const j = i + Math.floor(rand() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, limit);
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  const { values: args } = parseArgs({
    options: {
      input: { type: "string", default: DEFAULT_INPUT },
      top:   { type: "string", default: String(TOP_N_DEFAULT) },
    },
  });

  const topN = parseInt(args.top, 10);
  const games = await loadGames(args.input);

  console.log("Building tag index...");
  const tagIndex = buildTagIndex(games);

  console.log("Computing scoring dimensions...");
  const revRaw  = computeRevenueWeights(tagIndex);
  const retRaw  = computeRetentionSignals(tagIndex);
  const loyRaw  = computeLoyaltyIndices(tagIndex);
  const prevRaw = computeInversePrevalence(tagIndex, games.length);

  console.log("Normalizing...");
  const revNorm  = normalizeMap(revRaw);
  const retNorm  = normalizeMap(retRaw);
  const loyNorm  = normalizeMap(loyRaw);
  const prevNorm = normalizeMap(prevRaw);

  console.log("Computing final scores...");
  const scored = computeFinalScores(tagIndex, revNorm, retNorm, loyNorm, prevNorm);
  const tiered = assignTiers(scored);

  await saveOutput(tiered, topN);
  printSummary(tiered, topN);

  console.log(`\nDone! Top ${topN} tags saved to ${join(OUTPUT_DIR, OUTPUT_JSON)}`);
};

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});