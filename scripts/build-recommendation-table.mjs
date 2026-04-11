import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_GAMES_INPUT = "data/steam_top_5000_games.json";
const DEFAULT_TAGS_INPUT  = "data/top_80_tags.json";
const OUTPUT_DIR          = "data";
const OUTPUT_FILE         = "recommendation_table.json";
const OUTPUT_CSV          = "recommendation_table.csv";

// ---------------------------------------------------------------------------
// Load inputs
// ---------------------------------------------------------------------------

const loadGames = async (path) => {
  const raw = JSON.parse(await readFile(path, "utf8"));
  const games = Array.isArray(raw) ? raw : (raw.games ?? []);
  console.log(`Loaded ${games.length} games from ${path}`);
  return games;
};

const loadTopTags = async (path) => {
  const raw = JSON.parse(await readFile(path, "utf8"));
  // Support both { tags: [...] } envelope and raw array
  const tags = Array.isArray(raw) ? raw : (raw.tags ?? []);
  const vocab = tags.map((t) => t.tag);
  console.log(`Loaded ${vocab.length} tags from ${path}`);
  return vocab;
};

// ---------------------------------------------------------------------------
// One-hot encoding
//
// vocab  — ordered list of tag/genre strings (from top_80_tags.json)
// gameTagSet — Set of tag/genre strings present on this game
//
// Returns a 0/1 array aligned to vocab order.
// ---------------------------------------------------------------------------

const oneHot = (vocab, gameTagSet) =>
  vocab.map((v) => (gameTagSet.has(v) ? 1 : 0));

// Build a unified tag+genre set for a game.
// game.tags  = [{ tag, votes }, ...]
// game.genres = [string, ...]
const gameTagSet = (game) => {
  const s = new Set();
  for (const { tag } of (game.tags ?? [])) s.add(tag);
  for (const genre of (game.genres ?? [])) s.add(genre);
  return s;
};

// ---------------------------------------------------------------------------
// Numeric feature normalization
//
// All numeric features are normalized to [0, 1] across the full dataset
// so they sit on the same scale as the one-hot columns.
//
// medianPlaytime — log-normalized (heavy right skew; CS2 has ~10k hrs median)
// totalReviews   — log-normalized (same issue)
// positiveRatio  — linear (already bounded 0–1, just clamp missing values)
// ---------------------------------------------------------------------------

const logNorm = (values) => {
  const logged = values.map((v) => Math.log1p(v));
  const min = Math.min(...logged);
  const max = Math.max(...logged);
  const range = max - min || 1;
  return logged.map((v) => round4((v - min) / range));
};

const linearNorm = (values) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v) => round4((v - min) / range));
};

// ---------------------------------------------------------------------------
// Build the feature table
// ---------------------------------------------------------------------------

const buildTable = (games, vocab) => {
  // Extract raw numeric vectors across all games first (needed for normalization)
  const rawMedianPlaytime = games.map((g) => g.medianPlaytimeForever ?? 0);
  const rawTotalReviews   = games.map((g) => g.review?.total ?? 0);
  const rawPositiveRatio  = games.map((g) => g.review?.positiveRatio ?? 0.5);

  const normMedianPlaytime = logNorm(rawMedianPlaytime);
  const normTotalReviews   = logNorm(rawTotalReviews);
  const normPositiveRatio  = linearNorm(rawPositiveRatio);

  const rows = games.map((game, i) => {
    const tagSet    = gameTagSet(game);
    const hotVector = oneHot(vocab, tagSet);

    return {
      // --- Identity ---
      appid: game.appid,
      name:  game.name,

      // --- Numeric features (normalized) ---
      features: {
        medianPlaytimeNorm: normMedianPlaytime[i],
        totalReviewsNorm:   normTotalReviews[i],
        positiveRatioNorm:  normPositiveRatio[i],
      },

      // --- Raw values (kept for display / debugging) ---
      raw: {
        medianPlaytimeMinutes: rawMedianPlaytime[i],
        totalReviews:          rawTotalReviews[i],
        positiveRatio:         rawPositiveRatio[i],
      },

      // --- One-hot tag/genre vector ---
      // Aligned to vocab order. Use output.vocab to interpret columns.
      tagVector: hotVector,
    };
  });

  return rows;
};

// ---------------------------------------------------------------------------
// Build the full feature vector (numeric + one-hot concatenated)
//
// This is the flat array your model will actually train on:
//   [ medianPlaytimeNorm, totalReviewsNorm, positiveRatioNorm, ...tagVector ]
//
// Column names are stored in output.featureColumns for reference.
// ---------------------------------------------------------------------------

const buildFeatureVectors = (rows, vocab) => {
  const numericCols = ["medianPlaytimeNorm", "totalReviewsNorm", "positiveRatioNorm"];
  const featureColumns = [...numericCols, ...vocab];

  const enriched = rows.map((row) => ({
    ...row,
    featureVector: [
      row.features.medianPlaytimeNorm,
      row.features.totalReviewsNorm,
      row.features.positiveRatioNorm,
      ...row.tagVector,
    ],
  }));

  return { enriched, featureColumns };
};

// ---------------------------------------------------------------------------
// Summary stats
// ---------------------------------------------------------------------------

const summarize = (rows, vocab) => {
  const tagCoverage = vocab.map((tag, i) => ({
    tag,
    gamesWithTag: rows.filter((r) => r.tagVector[i] === 1).length,
    coverage: round4(rows.filter((r) => r.tagVector[i] === 1).length / rows.length),
  })).sort((a, b) => b.gamesWithTag - a.gamesWithTag);

  const avgTagsPerGame = round4(
    rows.reduce((sum, r) => sum + r.tagVector.reduce((s, v) => s + v, 0), 0) / rows.length
  );

  return { tagCoverage, avgTagsPerGame };
};

// ---------------------------------------------------------------------------
// CSV serialization
//
// Columns: appid, name, medianPlaytimeNorm, totalReviewsNorm, positiveRatioNorm,
//          ...one column per tag in vocab order (0 or 1)
// ---------------------------------------------------------------------------

const escapeCsv = (val) => {
  const str = String(val ?? "");
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
};

const buildCsv = (rows, featureColumns) => {
  const header = ["appid", "name", ...featureColumns].map(escapeCsv).join(",");
  const lines = rows.map((row) =>
    [row.appid, row.name, ...row.featureVector].map(escapeCsv).join(",")
  );
  return [header, ...lines].join("\n");
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const round4 = (n) => Math.round(n * 10000) / 10000;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  const { values: args } = parseArgs({
    options: {
      games: { type: "string", default: DEFAULT_GAMES_INPUT },
      tags:  { type: "string", default: DEFAULT_TAGS_INPUT  },
    },
  });

  const games = await loadGames(args.games);
  const vocab = await loadTopTags(args.tags);

  console.log("\nBuilding feature table...");
  const rows = buildTable(games, vocab);

  console.log("Concatenating feature vectors...");
  const { enriched, featureColumns } = buildFeatureVectors(rows, vocab);

  console.log("Computing summary stats...");
  const { tagCoverage, avgTagsPerGame } = summarize(rows, vocab);

  // Build output
  const output = {
    generatedAt:    new Date().toISOString(),
    gameCount:      enriched.length,
    featureCount:   featureColumns.length,
    avgTagsPerGame,

    // Column manifest — use this to interpret featureVector columns by index
    featureColumns,

    // Vocab used for one-hot encoding (same as featureColumns[3:])
    vocab,

    // How many games each tag covers (useful for debugging sparse tags)
    tagCoverage,

    // The actual table — one row per game
    // Each row: { appid, name, features, raw, tagVector, featureVector }
    games: enriched,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outPath = join(OUTPUT_DIR, OUTPUT_FILE);
  await writeFile(outPath, JSON.stringify(output, null, 2), "utf8");

  const csvPath = join(OUTPUT_DIR, OUTPUT_CSV);
  const csv = buildCsv(enriched, featureColumns);
  await writeFile(csvPath, csv, "utf8");

  // Print summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("  RECOMMENDATION TABLE SUMMARY");
  console.log(`${"=".repeat(60)}`);
  console.log(`  Games:            ${enriched.length}`);
  console.log(`  Feature columns:  ${featureColumns.length}`);
  console.log(`    Numeric:        3  (medianPlaytime, totalReviews, positiveRatio)`);
  console.log(`    One-hot tags:   ${vocab.length}`);
  console.log(`  Avg tags/game:    ${avgTagsPerGame}`);
  console.log(`\n  Top 10 tags by coverage:`);
  for (const t of tagCoverage.slice(0, 10)) {
    const bar = "█".repeat(Math.round(t.coverage * 20));
    console.log(`    ${t.tag.padEnd(30)} ${String(t.gamesWithTag).padStart(4)} games  ${bar}`);
  }
  console.log(`${"=".repeat(60)}`);
  console.log(`\nSaved → ${outPath}`);
  console.log(`Saved → ${csvPath}`);
};

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});