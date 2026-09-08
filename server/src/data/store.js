// Minimal JSON-file-backed persistence for holdings and watchlist items.
// Good enough for a single-user hobby tracker; swap for a real database if
// this ever needs multiple users or concurrent writers.

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'db.json');

const DEFAULT_DB = { holdings: [], watchlist: [] };

async function readDb() {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await writeDb(DEFAULT_DB);
      return structuredClone(DEFAULT_DB);
    }
    throw err;
  }
}

async function writeDb(db) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

export async function listHoldings() {
  const db = await readDb();
  return db.holdings;
}

export async function addHolding(holding) {
  const db = await readDb();
  const record = { id: randomUUID(), ...holding };
  db.holdings.push(record);
  await writeDb(db);
  return record;
}

export async function updateHolding(id, patch) {
  const db = await readDb();
  const idx = db.holdings.findIndex((h) => h.id === id);
  if (idx === -1) return null;
  db.holdings[idx] = { ...db.holdings[idx], ...patch };
  await writeDb(db);
  return db.holdings[idx];
}

export async function removeHolding(id) {
  const db = await readDb();
  const before = db.holdings.length;
  db.holdings = db.holdings.filter((h) => h.id !== id);
  await writeDb(db);
  return db.holdings.length < before;
}

export async function listWatchlist() {
  const db = await readDb();
  return db.watchlist;
}

export async function addWatch(item) {
  const db = await readDb();
  const record = { id: randomUUID(), ...item };
  db.watchlist.push(record);
  await writeDb(db);
  return record;
}

export async function removeWatch(id) {
  const db = await readDb();
  const before = db.watchlist.length;
  db.watchlist = db.watchlist.filter((w) => w.id !== id);
  await writeDb(db);
  return db.watchlist.length < before;
}
