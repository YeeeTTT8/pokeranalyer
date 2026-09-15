// Backup/restore and one-time localStorage -> backend import.
import { LS_SESSIONS, LS_HANDS, LS_MIGRATED_PREFIX } from './config.js';

export const EXPORT_VERSION = 1;

function readLS(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw != null) return JSON.parse(raw);
  } catch (e) {
    /* ignore */
  }
  return [];
}

export function readLocalData() {
  return { sessions: readLS(LS_SESSIONS), hands: readLS(LS_HANDS) };
}

export function buildExport(sessions, hands) {
  return {
    app: 'poker-assistant',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    sessions: sessions || [],
    hands: hands || [],
  };
}

export function serializeExport(sessions, hands) {
  return JSON.stringify(buildExport(sessions, hands), null, 2);
}

// Parse and validate an export blob. Returns { sessions, hands } or throws.
export function parseImport(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    throw new Error('Not valid JSON.');
  }
  if (!obj || typeof obj !== 'object') throw new Error('Unexpected file contents.');
  const sessions = Array.isArray(obj.sessions) ? obj.sessions : [];
  const hands = Array.isArray(obj.hands) ? obj.hands : [];
  if (!sessions.length && !hands.length) {
    throw new Error('No sessions or hands found in this file.');
  }
  // Light shape check on sessions.
  for (const s of sessions) {
    if (typeof s.id !== 'string' || !Array.isArray(s.players)) {
      throw new Error('A session in the file is malformed.');
    }
  }
  return { sessions, hands };
}

// Import a set of sessions/hands into a repo. `mode` controls id collisions:
//  - 'skip'  : leave existing rows with the same id untouched (default)
//  - 'overwrite' : upsert regardless
// Returns counts of what was written.
export async function importIntoRepo(repo, { sessions = [], hands = [] }, { mode = 'skip' } = {}) {
  const existingSessions = await repo.loadSessions();
  const existingHands = await repo.loadHands();
  const haveSession = new Set(existingSessions.map((s) => s.id));
  const haveHand = new Set(existingHands.map((h) => h.id));

  let sWritten = 0;
  let hWritten = 0;
  for (const s of sessions) {
    if (mode === 'skip' && haveSession.has(s.id)) continue;
    await repo.upsertSession(s);
    sWritten++;
  }
  for (const h of hands) {
    if (mode === 'skip' && haveHand.has(h.id)) continue;
    await repo.upsertHand(h);
    hWritten++;
  }
  return { sessions: sWritten, hands: hWritten };
}

// One-time auto-import of this browser's localStorage into the given backend,
// keyed per user so it only runs once per account on this device.
export async function autoImportLocal(repo, userId) {
  const flagKey = LS_MIGRATED_PREFIX + userId;
  try {
    if (window.localStorage.getItem(flagKey)) return null;
  } catch (e) {
    /* ignore */
  }
  const local = readLocalData();
  if (!local.sessions.length && !local.hands.length) {
    markMigrated(userId);
    return { sessions: 0, hands: 0 };
  }
  const counts = await importIntoRepo(repo, local, { mode: 'skip' });
  markMigrated(userId);
  return counts;
}

export function markMigrated(userId) {
  try {
    window.localStorage.setItem(LS_MIGRATED_PREFIX + userId, String(Date.now()));
  } catch (e) {
    /* ignore */
  }
}
