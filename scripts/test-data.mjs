// Tests for the data layer: reports aggregation, CSV, mappers, migration.
// Run: npm run test:data
import { aggregatePlayers, perSessionBreakdown, overallTotals, toCSV } from '../src/poker/reports.js';
import { sessionToRow, rowToSession, handToRow, rowToHand } from '../src/data/mappers.js';
import { parseImport, buildExport, importIntoRepo } from '../src/data/migrate.js';

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name); } };
const approx = (name, got, want, tol = 1e-9) => ok(`${name} (${got} ~ ${want})`, Math.abs(got - want) <= tol);

// Sample data: two sessions, overlapping players by name.
const sessions = [
  {
    id: 's1', name: 'Friday', date: '2026-01-02', defaultBuyIn: 20, createdAt: 2,
    players: [
      { id: 'a', name: 'Alice', buyIns: [20, 20], cashOut: 100 }, // in 40 out 100 net +60
      { id: 'b', name: 'Bob', buyIns: [20], cashOut: 0 },          // in 20 out 0 net -20
      { id: 'c', name: 'Cara', buyIns: [20], cashOut: 0 },         // in 20 out 0 net -20 (fills the -60/+60? no)
    ],
  },
  {
    id: 's2', name: 'Saturday', date: '2026-01-09', defaultBuyIn: 25, createdAt: 1,
    players: [
      { id: 'd', name: 'alice', buyIns: [25], cashOut: 0 },   // case-insensitive merge -> Alice, net -25
      { id: 'e', name: 'Bob', buyIns: [25], cashOut: 75 },     // net +50
    ],
  },
];

console.log('\n== aggregatePlayers (all-time, by name) ==');
const agg = aggregatePlayers(sessions);
const byName = Object.fromEntries(agg.map((p) => [p.name, p]));
approx('Alice net = 60 + (-25) = 35', byName['Alice'].net, 35);
approx('Alice buy-in = 40 + 25 = 65', byName['Alice'].buyIn, 65);
approx('Alice sessions = 2', byName['Alice'].sessions, 2);
approx('Bob net = -20 + 50 = 30', byName['Bob'].net, 30);
approx('Cara net = -20', byName['Cara'].net, -20);
ok('leaderboard sorted by net desc', agg[0].net >= agg[1].net && agg[1].net >= agg[2].net);
ok('case-insensitive merge (alice+Alice = 1 row)', agg.filter((p) => p.name.toLowerCase() === 'alice').length === 1);

console.log('\n== overallTotals ==');
const tot = overallTotals(sessions);
approx('total buy-in = 40+20+20+25+25 = 130', tot.buyIn, 130);
approx('total cash-out = 100+0+0+0+75 = 175', tot.cashOut, 175);
approx('net sum = 45', tot.net, 45);
approx('session count', tot.sessionCount, 2);
approx('player count', tot.playerCount, 3);

console.log('\n== perSessionBreakdown ==');
const bd = perSessionBreakdown(sessions);
ok('two sessions', bd.length === 2);
const s1 = bd.find((s) => s.id === 's1');
approx('s1 totalIn = 80', s1.totalIn, 80);
approx('s1 Alice net +60', s1.players.find((p) => p.name === 'Alice').net, 60);
ok('cashedOut flag true for Alice', s1.players.find((p) => p.name === 'Alice').cashedOut === true);
ok('cashedOut flag true for Bob (cashOut 0 explicitly set)', s1.players.find((p) => p.name === 'Bob').cashedOut === true);

console.log('\n== CSV ==');
const csv = toCSV(sessions);
ok('has leaderboard header', csv.includes('All-time leaderboard'));
ok('has per-session header', csv.includes('Per-session breakdown'));
ok('contains a player row', /Alice/.test(csv));
ok('quotes fields with commas', (() => {
  const s = [{ id: 'x', name: 'Home game, main', date: '2026-01-01', createdAt: 1, players: [{ id: 'p', name: 'Zoe', buyIns: [10], cashOut: 5 }] }];
  return toCSV(s).includes('"Home game, main"');
})());

console.log('\n== mappers round-trip ==');
const sess = sessions[0];
ok('session round-trip preserves model', JSON.stringify(rowToSession(sessionToRow(sess, 'u1'))) === JSON.stringify({
  id: sess.id, date: sess.date, name: sess.name, defaultBuyIn: sess.defaultBuyIn, players: sess.players, createdAt: sess.createdAt,
}));
const hand = { id: 'h1', savedAt: 5, hero: [1, 2], board: [3, 4, 5], equity: 55.5, opponents: 2, assumption: 'tight', result: 'Won', notes: 'nice' };
ok('hand round-trip', JSON.stringify(rowToHand(handToRow(hand, 'u1'))) === JSON.stringify(hand));
ok('sessionToRow stamps owner', sessionToRow(sess, 'u1').owner === 'u1');

console.log('\n== migrate: parseImport ==');
const exp = buildExport(sessions, [hand]);
const parsed = parseImport(JSON.stringify(exp));
ok('parseImport returns sessions+hands', parsed.sessions.length === 2 && parsed.hands.length === 1);
let threw = false; try { parseImport('not json'); } catch (e) { threw = true; }
ok('parseImport rejects bad json', threw);
threw = false; try { parseImport('{"sessions":[],"hands":[]}'); } catch (e) { threw = true; }
ok('parseImport rejects empty', threw);

console.log('\n== migrate: importIntoRepo (fake repo, skip mode) ==');
{
  const store = { sessions: [{ id: 's1', name: 'existing' }], hands: [] };
  const repo = {
    async loadSessions() { return store.sessions; },
    async loadHands() { return store.hands; },
    async upsertSession(s) { const i = store.sessions.findIndex((x) => x.id === s.id); if (i === -1) store.sessions.push(s); else store.sessions[i] = s; },
    async upsertHand(h) { store.hands.push(h); },
  };
  const counts = await importIntoRepo(repo, parsed, { mode: 'skip' });
  ok('skips existing s1', counts.sessions === 1); // only s2 written
  ok('writes the hand', counts.hands === 1);
  ok('existing s1 untouched', store.sessions.find((s) => s.id === 's1').name === 'existing');
  ok('s2 added', store.sessions.some((s) => s.id === 's2'));
}

console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
process.exit(fail ? 1 : 0);
