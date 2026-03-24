const { State, District, Mandal, Secretariat } = require("../models/surveySchemas");

const BATCH_SIZE = 100; // rows processed in parallel at a time

// ─── In-memory cache to avoid re-querying same parents ───────────────────────
// Key format:  "StateName" / "StateName|DistrictName" / etc.
const cache = {
  states:     new Map(),
  districts:  new Map(),
  mandals:    new Map(),
};

// ─── Upsert State ─────────────────────────────────────────────────────────────
async function upsertState(name) {
  if (cache.states.has(name)) return cache.states.get(name);

  const doc = await State.findOneAndUpdate(
    { name },
    { name },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  cache.states.set(name, doc._id);
  return doc._id;
}

// ─── Upsert District ──────────────────────────────────────────────────────────
async function upsertDistrict(name, state_id) {
  const key = `${state_id}|${name}`;
  if (cache.districts.has(key)) return cache.districts.get(key);

  const doc = await District.findOneAndUpdate(
    { name, state_id },
    { name, state_id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  cache.districts.set(key, doc._id);
  return doc._id;
}

// ─── Upsert Mandal ────────────────────────────────────────────────────────────
async function upsertMandal(name, district_id) {
  const key = `${district_id}|${name}`;
  if (cache.mandals.has(key)) return cache.mandals.get(key);

  const doc = await Mandal.findOneAndUpdate(
    { name, district_id },
    { name, district_id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  cache.mandals.set(key, doc._id);
  return doc._id;
}

// ─── Upsert Secretariat ───────────────────────────────────────────────────────
// Secretariats are NOT cached — house_count must always be updated
async function upsertSecretariat(name, mandal_id, house_count) {
  await Secretariat.findOneAndUpdate(
    { name, mandal_id },
    { name, mandal_id, house_count },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// ─── Process One Row ──────────────────────────────────────────────────────────
async function processRow(row) {
  const stateName       = (row["State"]       || "").trim();
  const districtName    = (row["District"]    || "").trim();
  const mandalName      = (row["Mandal"]      || "").trim();
  const secretariatName = (row["Secretariat"] || "").trim();
  const houseCount      = parseInt(row["N of Households Surveyed"], 10) || 0;

  if (!stateName || !districtName || !mandalName || !secretariatName) {
    throw new Error(`Missing required fields in row: ${JSON.stringify(row)}`);
  }

  // These are sequential ON PURPOSE — each depends on parent ID
  const state_id    = await upsertState(stateName);
  const district_id = await upsertDistrict(districtName, state_id);
  const mandal_id   = await upsertMandal(mandalName, district_id);
  await upsertSecretariat(secretariatName, mandal_id, houseCount);
}

// ─── Process All Rows in Parallel Batches ────────────────────────────────────
async function processAllRows(rows) {
  const results = { success: 0, failed: 0, errors: [] };

  // Clear cache before each full upload
  cache.states.clear();
  cache.districts.clear();
  cache.mandals.clear();

  // Split rows into chunks of BATCH_SIZE
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    // Run all rows in this batch in parallel
    const settled = await Promise.allSettled(batch.map(processRow));

    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(outcome.reason?.message || "Unknown error");
      }
    }

    console.log(`Processed ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length} rows...`);
  }

  return results;
}

module.exports = { processAllRows };
