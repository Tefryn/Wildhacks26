import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_CSV_INPUT  = "data/recommendation_table.csv";
const GAMES_COLLECTION   = "games";
const META_COLLECTION    = "meta";
const META_DOC_ID        = "recommendation_schema";
const BATCH_SIZE         = 400;
const BATCH_CONCURRENCY  = 3;

// ---------------------------------------------------------------------------
// CSV parsing
//
// CSV columns: appid, name, medianPlaytimeNorm, totalReviewsNorm,
//              positiveRatioNorm, <tag_0> ... <tag_79>
//
// No external dependencies — handles quoted fields with embedded commas.
// ---------------------------------------------------------------------------

const parseCsvRow = (line) => {
  const fields = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
};

const parseCsv = (text) => {
  const lines = text.split("\n").filter((l) => l.trim());
  const headers = parseCsvRow(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvRow(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
  return { headers, rows };
};

// ---------------------------------------------------------------------------
// Parse a CSV row into a typed Firestore document
// ---------------------------------------------------------------------------

const NUMERIC_FEATURES = ["medianPlaytimeNorm", "totalReviewsNorm", "positiveRatioNorm"];

const toFirestoreDoc = (row, tagColumns) => {
  const numericValues = NUMERIC_FEATURES.map((col) => parseFloat(row[col]) || 0);
  const tagValues     = tagColumns.map((col) => parseInt(row[col], 10) || 0);

  // One named field per tag/genre: { Action: 0, RPG: 1, "Souls-like": 0, ... }
  const tagFields = {};
  tagColumns.forEach((col, i) => { tagFields[col] = tagValues[i]; });

  return {
    appid:  parseInt(row.appid, 10),
    name:   row.name,

    // Compressed: full feature vector as a single array for similarity math
    featureVector: [...numericValues, ...tagValues],

    // Decompressed numeric features
    medianPlaytimeNorm: numericValues[0],
    totalReviewsNorm:   numericValues[1],
    positiveRatioNorm:  numericValues[2],

    // Decompressed one-hot tag/genre columns (one field per tag)
    ...tagFields,

    ingestedAt: FieldValue.serverTimestamp(),
  };
};

// ---------------------------------------------------------------------------
// Batch write with retry
// ---------------------------------------------------------------------------

const commitWithRetry = async (batch, attempt = 1) => {
  try {
    await batch.commit();
  } catch (err) {
    if (attempt >= 4) throw err;
    const wait = 500 * attempt;
    console.warn(`  Batch commit failed (attempt ${attempt}): ${err.message}. Retrying in ${wait}ms...`);
    await new Promise((r) => setTimeout(r, wait));
    return commitWithRetry(batch, attempt + 1);
  }
};

// ---------------------------------------------------------------------------
// Ingest all game rows
// ---------------------------------------------------------------------------

const ingestGames = async (db, rows, tagColumns) => {
  const chunks = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    chunks.push(rows.slice(i, i + BATCH_SIZE));
  }

  console.log(`\nIngesting ${rows.length} games in ${chunks.length} batches (${BATCH_SIZE}/batch, concurrency=${BATCH_CONCURRENCY})...`);

  let completed = 0;

  for (let i = 0; i < chunks.length; i += BATCH_CONCURRENCY) {
    const window = chunks.slice(i, i + BATCH_CONCURRENCY);

    await Promise.all(
      window.map(async (chunk) => {
        const batch = db.batch();
        for (const row of chunk) {
          const ref = db.collection(GAMES_COLLECTION).doc(String(parseInt(row.appid, 10)));
          batch.set(ref, toFirestoreDoc(row, tagColumns));
        }
        await commitWithRetry(batch);
        completed += chunk.length;
        console.log(`  ${completed} / ${rows.length} games written`);
      })
    );
  }
};

// ---------------------------------------------------------------------------
// Write schema metadata so Cloud Functions know the vocab order
// ---------------------------------------------------------------------------

const ingestMeta = async (db, { vocab, featureColumns, gameCount }) => {
  console.log("\nWriting schema metadata...");
  await db.collection(META_COLLECTION).doc(META_DOC_ID).set({
    vocab,
    featureColumns,
    gameCount,
    ingestedAt: FieldValue.serverTimestamp(),
  });
  console.log(`  Written -> ${META_COLLECTION}/${META_DOC_ID}`);
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  const { values: args } = parseArgs({
    options: {
      input:       { type: "string", default: DEFAULT_CSV_INPUT },
      credentials: { type: "string", default: "serviceAccountKey.json" },
    },
  });

  // --- Init Firebase Admin ---
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(await readFile(args.credentials, "utf8"));
  } catch {
    console.error(`\nCould not read credentials file: ${args.credentials}`);
    console.error("Generate one at: Firebase Console -> Project Settings -> Service Accounts -> Generate new private key");
    console.error(`Then run: node ingest_to_firestore.js --credentials path/to/key.json\n`);
    process.exit(1);
  }

  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  // --- Parse CSV ---
  console.log(`Loading CSV from ${args.input}...`);
  const text = await readFile(args.input, "utf8");
  const { headers, rows } = parseCsv(text);

  if (!rows.length) throw new Error("CSV is empty or could not be parsed.");

  // Columns: appid, name, medianPlaytimeNorm, totalReviewsNorm, positiveRatioNorm, [tags...]
  const tagColumns     = headers.slice(5);   // after appid, name, 3 numeric
  const featureColumns = headers.slice(2);   // after appid, name
  const vocab          = tagColumns;

  console.log(`  ${rows.length} games, ${tagColumns.length} tag columns`);

  // --- Ingest ---
  const start = Date.now();
  await ingestGames(db, rows, tagColumns);
  await ingestMeta(db, { vocab, featureColumns, gameCount: rows.length });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`\n${"=".repeat(55)}`);
  console.log("  INGESTION COMPLETE");
  console.log(`${"=".repeat(55)}`);
  console.log(`  Games written:    ${rows.length}`);
  console.log(`  Feature columns:  ${featureColumns.length}`);
  console.log(`  Tag columns:      ${tagColumns.length}`);
  console.log(`  Time elapsed:     ${elapsed}s`);
  console.log(`  Collection:       ${GAMES_COLLECTION}`);
  console.log(`  Schema doc:       ${META_COLLECTION}/${META_DOC_ID}`);
  console.log(`${"=".repeat(55)}\n`);
};

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});