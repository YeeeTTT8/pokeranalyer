// Aggregations for Reports mode. Pure functions over the session list so they
// auto-update whenever sessions change and are unit-testable without a browser.
import { computeBalances } from './settlement.js';

// Players are tracked by name across sessions. Aggregate case-insensitively by
// trimmed name, displaying the first-seen original spelling.
function nameKey(name) {
  return (name || '').trim().toLowerCase();
}

// Per-session breakdown: each session with every player's buy-in, cash-out, net.
export function perSessionBreakdown(sessions) {
  return (sessions || []).map((s) => {
    const balances = computeBalances(s.players || []);
    const totalIn = balances.reduce((a, b) => a + b.buyInTotal, 0);
    const totalOut = balances.reduce((a, b) => a + b.cashOut, 0);
    return {
      id: s.id,
      label: s.name || s.date || '(untitled)',
      date: s.date || '',
      createdAt: s.createdAt || 0,
      players: balances.map((b) => ({
        name: b.name,
        buyIn: b.buyInTotal,
        cashOut: b.cashOut,
        net: b.net,
        cashedOut: (s.players.find((p) => p.id === b.id) || {}).cashOut != null,
      })),
      totalIn,
      totalOut,
      net: totalOut - totalIn,
    };
  });
}

// All-time totals per player, summed across every session.
export function aggregatePlayers(sessions) {
  const map = new Map();
  for (const s of sessions || []) {
    const balances = computeBalances(s.players || []);
    for (const b of balances) {
      const key = nameKey(b.name);
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, {
          name: (b.name || '').trim(),
          buyIn: 0,
          cashOut: 0,
          net: 0,
          sessions: 0,
        });
      }
      const agg = map.get(key);
      agg.buyIn += b.buyInTotal;
      agg.cashOut += b.cashOut;
      agg.net += b.net;
      agg.sessions += 1;
    }
  }
  // Leaderboard order: highest net first.
  return Array.from(map.values()).sort((a, b) => b.net - a.net);
}

export function overallTotals(sessions) {
  const players = aggregatePlayers(sessions);
  return {
    buyIn: players.reduce((a, p) => a + p.buyIn, 0),
    cashOut: players.reduce((a, p) => a + p.cashOut, 0),
    net: players.reduce((a, p) => a + p.net, 0),
    playerCount: players.length,
    sessionCount: (sessions || []).length,
  };
}

// ---- CSV ----
function esc(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function row(cells) {
  return cells.map(esc).join(',');
}
const round2 = (n) => Math.round(n * 100) / 100;

// One CSV covering the leaderboard and every per-session line — a single file
// that opens cleanly in any spreadsheet.
export function toCSV(sessions) {
  const lines = [];
  const players = aggregatePlayers(sessions);
  const totals = overallTotals(sessions);

  lines.push(row(['All-time leaderboard']));
  lines.push(row(['Rank', 'Player', 'Sessions', 'Total buy-in', 'Total cash-out', 'Net']));
  players.forEach((p, i) => {
    lines.push(row([i + 1, p.name, p.sessions, round2(p.buyIn), round2(p.cashOut), round2(p.net)]));
  });
  lines.push(row(['', 'TOTAL', totals.sessionCount, round2(totals.buyIn), round2(totals.cashOut), round2(totals.net)]));
  lines.push('');

  lines.push(row(['Per-session breakdown']));
  lines.push(row(['Date', 'Session', 'Player', 'Buy-in', 'Cash-out', 'Net', 'Cashed out?']));
  for (const s of perSessionBreakdown(sessions)) {
    for (const p of s.players) {
      lines.push(
        row([s.date, s.label, p.name, round2(p.buyIn), round2(p.cashOut), round2(p.net), p.cashedOut ? 'yes' : 'no'])
      );
    }
  }
  return lines.join('\n');
}
