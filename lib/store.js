// lib/store.js
// Persists test results with a UUID-style ID.
// Backends: Firestore (preferred) → flat JSON file (fallback).

const { nanoid } = require('nanoid');
const path = require('path');
const fs = require('fs');
const fbAdmin = require('./firebase-admin');

const COLLECTION = 'sharedResults';
const STORE_PATH = path.join(__dirname, '../data/results.json');

// ── Firestore backend ──────────────────────────────────────────────────────
let db = null;
const fbApp = fbAdmin.init();
if (fbApp) {
  db = fbAdmin.admin.firestore(fbApp);
}

// ── File backend helpers ───────────────────────────────────────────────────
function ensureFile() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, '{}');
}

function readFile() {
  ensureFile();
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch { return {}; }
}

function writeFile(data) {
  ensureFile();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

// ── Level distribution (for viral "X% of users" copy) ──────────────────────
// Approximate real-world CEFR test distribution – update with real analytics
const LEVEL_DISTRIBUTION = { A1: 14, A2: 24, B1: 31, B2: 21, C1: 10 };

// ── Public API ─────────────────────────────────────────────────────────────
/**
 * Save a result and return its share ID.
 * @param {{ score:number, level:string, levelName:string,
 *           total:number, wrongs:Array }} data
 */
async function createResult(data) {
  const id = nanoid(14); // 14-char URL-safe, non-guessable
  const payload = {
    ...data,
    wrongs: (data.wrongs || []).slice(0, 50), // cap size
    createdAt: Date.now(),
  };

  if (db) {
    await db.collection(COLLECTION).doc(id).set({
      ...payload,
      createdAt: fbAdmin.admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    const store = readFile();
    store[id] = payload;
    writeFile(store);
  }

  return id;
}

/**
 * Retrieve a result by ID. Returns null if not found or ID is invalid.
 */
async function getResult(id) {
  if (!isValidId(id)) return null;

  if (db) {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    const d = doc.data();
    // Convert Firestore Timestamp → ms number
    return { ...d, createdAt: d.createdAt?.toMillis?.() ?? Date.now() };
  } else {
    const store = readFile();
    return store[id] || null;
  }
}

/**
 * Returns the approximate % of test-takers at a given level.
 */
function getLevelPercentage(level) {
  return LEVEL_DISTRIBUTION[level] ?? 0;
}

function isValidId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{8,20}$/.test(id);
}

module.exports = { createResult, getResult, getLevelPercentage };