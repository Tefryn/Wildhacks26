import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const INPUT_PATH = join("data", "steam_top_5000_games.json");
const OUTPUT_PATH = join("data", "recommendation_feature_table.json");

const MIN_PREVALENCE_RATIO = 0.01; // present in at least 1% of games
const MAX_SELECTED_FEATURES = 120;
const JACCARD_OVERLAP_THRESHOLD = 0.85;

const canonicalOverrides = new Map([
  ["fps", "shooter_fps"],
  ["first person", "shooter_fps"],
  ["first-person", "shooter_fps"],
  ["first person shooter", "shooter_fps"],
  ["third person", "third_person"],
  ["third-person", "third_person"],
  ["third person shooter", "third_person_shooter"],
  ["co op", "coop"],
  ["co-op", "coop"],
  ["online co op", "coop"],
  ["online co-op", "coop"],
  ["player versus player", "pvp"],
  ["free to play", "free_to_play"],
  ["e sports", "esports"],
  ["e-sports", "esports"],
]);

const normalizeBase = (value) => {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[&]/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const canonicalizeFeature = (value) => {
  const base = normalizeBase(value);
  if (!base) return "";
  const overridden = canonicalOverrides.get(base) ?? base;
  return overridden.replace(/\s+/g, "_");
};

const safeRatio = (n, d) => (d > 0 ? n / d : 0);

const jaccardSimilarity = (a, b) => {
  if (!a.size && !b.size) return 1;
  let intersection = 0;
  for (const x of a) {
    if (b.has(x)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return safeRatio(intersection, union);
};

const main = async () => {
  const raw = await readFile(INPUT_PATH, "utf8");
  const parsed = JSON.parse(raw);

  const games = Array.isArray(parsed.games) ? parsed.games : [];
  if (!games.length) {
    throw new Error("Input file has no games array.");
  }

  const featureToGameSet = new Map();
  const gameFeatureSets = [];

  for (let i = 0; i < games.length; i += 1) {
    const game = games[i];
    const genres = Array.isArray(game.genres) ? game.genres : [];
    const tags = Array.isArray(game.tags) ? game.tags : [];

    const combinedSet = new Set();
    for (const g of genres) {
      const c = canonicalizeFeature(g);
      if (c) combinedSet.add(c);
    }
    for (const t of tags) {
      const c = canonicalizeFeature(t);
      if (c) combinedSet.add(c);
    }

    gameFeatureSets.push(combinedSet);

    for (const feature of combinedSet) {
      if (!featureToGameSet.has(feature)) {
        featureToGameSet.set(feature, new Set());
      }
      featureToGameSet.get(feature).add(i);
    }
  }

  const minCount = Math.ceil(games.length * MIN_PREVALENCE_RATIO);
  const gameLogPopularity = games.map((g) => Math.log1p(Number(g?.popularity?.score ?? 0)));

  const candidates = [];
  for (const [feature, gameSet] of featureToGameSet.entries()) {
    const count = gameSet.size;
    if (count < minCount) continue;

    let withSum = 0;
    let withoutSum = 0;
    let withCount = 0;
    let withoutCount = 0;

    for (let i = 0; i < games.length; i += 1) {
      if (gameSet.has(i)) {
        withSum += gameLogPopularity[i];
        withCount += 1;
      } else {
        withoutSum += gameLogPopularity[i];
        withoutCount += 1;
      }
    }

    const withMean = safeRatio(withSum, withCount);
    const withoutMean = safeRatio(withoutSum, withoutCount);
    const usefulness = Math.abs(withMean - withoutMean);

    candidates.push({
      feature,
      count,
      prevalence: safeRatio(count, games.length),
      usefulness,
      score: safeRatio(count, games.length) + usefulness,
      gameSet,
    });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.count !== a.count) return b.count - a.count;
    return a.feature.localeCompare(b.feature);
  });

  const selected = [];
  for (const c of candidates) {
    if (selected.length >= MAX_SELECTED_FEATURES) break;

    let overlapsTooMuch = false;
    for (const kept of selected) {
      const overlap = jaccardSimilarity(c.gameSet, kept.gameSet);
      if (overlap >= JACCARD_OVERLAP_THRESHOLD) {
        overlapsTooMuch = true;
        break;
      }
    }

    if (!overlapsTooMuch) {
      selected.push(c);
    }
  }

  const selectedFeatures = selected.map((s) => s.feature);

  const table = games.map((game, idx) => {
    const oneHot = {};
    for (const f of selectedFeatures) {
      oneHot[f] = gameFeatureSets[idx].has(f) ? 1 : 0;
    }

    return {
      appid: Number(game.appid),
      name: String(game.name ?? ""),
      positiveRatio: Number(game?.review?.positiveRatio ?? 0),
      popularityScore: Number(game?.popularity?.score ?? 0),
      features: oneHot,
    };
  });

  const output = {
    generatedAt: new Date().toISOString(),
    sourceFile: INPUT_PATH,
    params: {
      minPrevalenceRatio: MIN_PREVALENCE_RATIO,
      maxSelectedFeatures: MAX_SELECTED_FEATURES,
      jaccardOverlapThreshold: JACCARD_OVERLAP_THRESHOLD,
    },
    selectedFeatureCount: selectedFeatures.length,
    selectedFeatures,
    featureStats: selected.map((s) => ({
      feature: s.feature,
      prevalence: s.prevalence,
      count: s.count,
      usefulness: Number(s.usefulness.toFixed(6)),
      score: Number(s.score.toFixed(6)),
    })),
    gameCount: table.length,
    table,
  };

  await mkdir("data", { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

  console.log(`Built recommendation table for ${table.length} games.`);
  console.log(`Selected ${selectedFeatures.length} features.`);
  console.log(`Wrote ${OUTPUT_PATH}`);
};

main().catch((err) => {
  console.error("Failed to build recommendation table:", err);
  process.exit(1);
});
