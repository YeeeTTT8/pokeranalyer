// localStorage-backed repository. Synchronous under the hood but exposed with
// the same async, granular shape as the Supabase repo so the store treats both
// the same way.
import { LS_SESSIONS, LS_HANDS } from './config.js';

function read(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw != null) return JSON.parse(raw);
  } catch (e) {
    /* ignore */
  }
  return [];
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* ignore quota / private mode */
  }
}

function upsert(list, item) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...list];
  const next = list.slice();
  next[i] = item;
  return next;
}

export function createLocalRepo() {
  return {
    mode: 'local',
    async loadSessions() {
      return read(LS_SESSIONS);
    },
    async loadHands() {
      return read(LS_HANDS);
    },
    async upsertSession(session) {
      write(LS_SESSIONS, upsert(read(LS_SESSIONS), session));
    },
    async deleteSession(id) {
      write(LS_SESSIONS, read(LS_SESSIONS).filter((s) => s.id !== id));
    },
    async upsertHand(hand) {
      write(LS_HANDS, upsert(read(LS_HANDS), hand));
    },
    async deleteHand(id) {
      write(LS_HANDS, read(LS_HANDS).filter((h) => h.id !== id));
    },
    // No cross-device realtime for localStorage.
    subscribe() {
      return () => {};
    },
  };
}
