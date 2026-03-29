// ─────────────────────────────────────────────────────────────────────────────
// surveyQueue.js  —  Queue for concurrent survey submissions
//
// TWO MODES (auto-detected):
//   PRODUCTION  → Bull queue backed by Redis (set REDIS_URL in .env)
//   DEVELOPMENT → In-memory async queue (no Redis needed)
//
// Usage in controller:
//   const { enqueueSurvey } = require('./surveyQueue');
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const crypto   = require('crypto');
const mongoose = require('mongoose');
const { State, District, Mandal, Secretariat } = require('../models/surveySchemas');
const { Survey }   = require('../models/SurveySchema');
const { generateAgentId } = require('../../generateId');

// ── Shared processor ─────────────────────────────────────────────────────────
// This is the actual DB work — runs for BOTH queue modes.
async function processSurveyJob(data) {
  const { villageId, surveyorId, stateName, districtName, MandalName, VillageName } = data;

  // 1. Generate unique survey ID
  const surveyId = generateAgentId({
    state:    stateName,
    district: districtName,
    mandal:   MandalName,
    village:  VillageName,
    user:     true,
  });

  // 2. Save survey
  const survey = new Survey({ ...data, surveyId });
  await survey.save();

  // 3. Increment subAgent count (best-effort — don't fail the job if missing)
  if (surveyorId && villageId) {
    const updated = await Secretariat.findOneAndUpdate(
      {
        _id:                   new mongoose.Types.ObjectId(villageId),
        'subAgent.AgentId':    surveyorId,
      },
      { $inc: { 'subAgent.$.count': 1 } },
      { new: true }
    );

    if (!updated) {
      console.warn(`⚠️  Survey saved (${surveyId}) but surveyor ${surveyorId} not found in village ${villageId}`);
    }
  }

  return { surveyId };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE A — Bull queue (Redis)
// Activated when REDIS_URL is set in environment.
// Pros: survives server restarts, distributed, retry logic, dashboard support.
// ─────────────────────────────────────────────────────────────────────────────
let bullQueue = null;

function tryInitBull() {
  if (!process.env.REDIS_URL) return false;
  try {
    const Bull = require('bull');
    bullQueue = new Bull('survey-submissions', {
      redis: process.env.REDIS_URL,
      defaultJobOptions: {
        attempts:    3,                   // retry failed jobs up to 3 times
        backoff:     { type: 'exponential', delay: 2000 },
        removeOnComplete: 500,            // keep last 500 completed jobs
        removeOnFail:     200,            // keep last 200 failed jobs
      },
    });

    // Register processor — concurrency 5 means 5 parallel DB writes max
    bullQueue.process(5, async (job) => {
      return processSurveyJob(job.data);
    });

    bullQueue.on('failed', (job, err) => {
      console.error(`❌ Survey job ${job.id} failed (attempt ${job.attemptsMade}):`, err.message);
    });

    bullQueue.on('completed', (job, result) => {
      console.log(`✅ Survey job ${job.id} completed → surveyId: ${result.surveyId}`);
    });

    console.log('📬 Survey queue: Bull (Redis) mode —', process.env.REDIS_URL);
    return true;
  } catch (e) {
    console.warn('⚠️  Bull init failed, falling back to in-memory queue:', e.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE B — In-memory queue (no Redis)
// A simple FIFO async queue. Jobs run one after another (or in small batches).
// Survives concurrent HTTP requests but not server restarts.
// ─────────────────────────────────────────────────────────────────────────────
const memQueue = {
  _jobs:        [],          // pending jobs: { id, data, resolve, reject }
  _running:     0,
  _concurrency: 5,           // process up to 5 surveys simultaneously
  _stats:       { completed: 0, failed: 0, pending: 0 },

  push(data) {
    return new Promise((resolve, reject) => {
      const id = crypto.randomBytes(6).toString('hex');
      this._jobs.push({ id, data, resolve, reject });
      this._stats.pending++;
      this._tick();
    });
  },

  _tick() {
    while (this._running < this._concurrency && this._jobs.length > 0) {
      const job = this._jobs.shift();
      this._stats.pending--;
      this._running++;
      this._run(job);
    }
  },

  async _run({ id, data, resolve, reject }) {
    const MAX_RETRIES = 3;
    let lastErr;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await processSurveyJob(data);
        this._stats.completed++;
        this._running--;
        console.log(`✅ [mem-queue] job ${id} done → surveyId: ${result.surveyId}`);
        resolve(result);
        this._tick();
        return;
      } catch (err) {
        lastErr = err;
        console.warn(`⚠️  [mem-queue] job ${id} attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);
        if (attempt < MAX_RETRIES) {
          // Exponential back-off: 500ms, 1000ms, 2000ms
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
        }
      }
    }

    this._stats.failed++;
    this._running--;
    console.error(`❌ [mem-queue] job ${id} permanently failed:`, lastErr.message);
    reject(lastErr);
    this._tick();
  },

  stats() {
    return {
      mode:      'in-memory',
      running:   this._running,
      pending:   this._stats.pending,
      completed: this._stats.completed,
      failed:    this._stats.failed,
    };
  },
};

// ── Init ─────────────────────────────────────────────────────────────────────
const usingBull = tryInitBull();
if (!usingBull) {
  console.log('📬 Survey queue: in-memory mode (set REDIS_URL to enable Bull)');
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a survey to the queue.
 * Returns a Promise that resolves with { surveyId } once the job completes.
 *
 * In Bull mode  → job is queued in Redis; result polled via job.finished()
 * In memory mode → job runs in-process; Promise resolves when done
 */
async function enqueueSurvey(data) {
  if (usingBull && bullQueue) {
    const job = await bullQueue.add(data);
    return job.finished(); // waits for the worker to complete
  }
  return memQueue.push(data);
}

/**
 * Queue health/stats — useful for a /health or /admin/queue endpoint.
 */
async function queueStats() {
  if (usingBull && bullQueue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      bullQueue.getWaitingCount(),
      bullQueue.getActiveCount(),
      bullQueue.getCompletedCount(),
      bullQueue.getFailedCount(),
      bullQueue.getDelayedCount(),
    ]);
    return { mode: 'bull-redis', waiting, active, completed, failed, delayed };
  }
  return memQueue.stats();
}

module.exports = { enqueueSurvey, queueStats };