// Correctness checks for the poker engine. Run: npm run test:engine
import { cardIndex } from '../src/poker/cards.js';
import { evaluate, categoryName, categoryOf } from '../src/poker/evaluator.js';
import { computeEquity } from '../src/poker/equity.js';
import { settle, computeBalances } from '../src/poker/settlement.js';
import { requiredEquityToCall, callDecision, raiseFoldEquity } from '../src/poker/decision.js';

let pass = 0;
let fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log('  ok  ', name); }
  else { fail++; console.log('  FAIL', name); }
}
function approx(name, got, want, tol) {
  const good = Math.abs(got - want) <= tol;
  if (good) { pass++; console.log(`  ok   ${name}  (${got.toFixed(2)} ~ ${want}±${tol})`); }
  else { fail++; console.log(`  FAIL ${name}  got ${got.toFixed(2)} want ${want}±${tol}`); }
}

// helper: 'As' etc
const R = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };
const S = { c:0, d:1, h:2, s:3 };
const c = (str) => cardIndex(R[str[0]], S[str[1]]);
const H = (...strs) => strs.map(c);

console.log('\n== evaluator categories ==');
ok('royal flush', categoryName(evaluate(H('As','Ks','Qs','Js','Ts'))) === 'Straight Flush');
ok('quads', categoryName(evaluate(H('9c','9d','9h','9s','2c'))) === 'Four of a Kind');
ok('full house', categoryName(evaluate(H('9c','9d','9h','2s','2c'))) === 'Full House');
ok('flush', categoryName(evaluate(H('2h','5h','8h','Jh','Kh'))) === 'Flush');
ok('straight', categoryName(evaluate(H('4c','5d','6h','7s','8c'))) === 'Straight');
ok('wheel straight', categoryName(evaluate(H('Ac','2d','3h','4s','5c'))) === 'Straight');
ok('trips', categoryName(evaluate(H('9c','9d','9h','2s','5c'))) === 'Three of a Kind');
ok('two pair', categoryName(evaluate(H('9c','9d','5h','5s','2c'))) === 'Two Pair');
ok('one pair', categoryName(evaluate(H('9c','9d','5h','8s','2c'))) === 'Pair');
ok('high card', categoryName(evaluate(H('9c','Jd','5h','8s','2c'))) === 'High Card');

console.log('\n== evaluator 7-card best-of ==');
// board makes a flush, hole cards irrelevant
ok('7-card flush from board', categoryName(evaluate(H('2c','3d','5h','8h','Jh','Kh','9h'))) === 'Flush');
// full house beats flush
ok('full house > flush score',
  evaluate(H('9c','9d','9h','2s','2c','3d','4d')) > evaluate(H('2h','5h','8h','Jh','Kh','9c','9d')));

console.log('\n== evaluator comparisons ==');
ok('AA > KK', evaluate(H('Ac','Ad','2c','7d','9s')) > evaluate(H('Kc','Kd','2c','7d','9s')));
ok('higher kicker wins', evaluate(H('Ac','Ad','Kc','7d','2s')) > evaluate(H('Ac','As','Qc','7d','2s')));
ok('straight beats trips', evaluate(H('4c','5d','6h','7s','8c')) > evaluate(H('9c','9d','9h','2s','5c')));
ok('flush beats straight', evaluate(H('2h','5h','8h','Jh','Kh')) > evaluate(H('4c','5d','6h','7s','8c')));
ok('ace-high straight > king-high straight',
  evaluate(H('Ac','Kd','Qh','Js','Tc')) > evaluate(H('Kc','Qd','Jh','Ts','9c')));
ok('wheel < six-high straight',
  evaluate(H('Ac','2d','3h','4s','5c')) < evaluate(H('2c','3d','4h','5s','6c')));

console.log('\n== Monte Carlo equity (heads-up, all-in preflop) ==');
// Known references (accepted tolerances account for MC noise + range estimate).
const it = 60000;
const e_AAvsKK = computeEquity({ hero: H('Ac','Ad'), opponents: [{ type: 'cards', cards: H('Kc','Kd') }], iters: it });
approx('AA vs KK ~ 82.4%', e_AAvsKK.equity, 82.4, 1.5);

const e_AKsvsQQ = computeEquity({ hero: H('Ah','Kh'), opponents: [{ type: 'cards', cards: H('Qc','Qd') }], iters: it });
approx('AKs vs QQ ~ 46.2%', e_AKsvsQQ.equity, 46.2, 1.5);

const e_AKovs22 = computeEquity({ hero: H('Ah','Kc'), opponents: [{ type: 'cards', cards: H('2c','2d') }], iters: it });
approx('AKo vs 22 ~ 47.0%', e_AKovs22.equity, 47.0, 1.5);

// vs a single random opponent, AA is ~85%
const e_AArandom = computeEquity({ hero: H('Ac','Ad'), opponents: [{ type: 'random' }], iters: it });
approx('AA vs random ~ 85.2%', e_AArandom.equity, 85.2, 1.5);

// made flush on the flop vs random should be very strong
const e_flopflush = computeEquity({ hero: H('Ah','Kh'), board: H('2h','7h','Th'), opponents: [{ type: 'random' }], iters: it });
approx('nut flush flopped vs random > 90%', e_flopflush.equity, 95, 4);

// dominated: AK vs random with 2 opponents lower than heads up
const e_AKvs2 = computeEquity({ hero: H('Ah','Kc'), opponents: [{ type: 'random' }, { type: 'random' }], iters: it });
ok('AK vs 2 randoms < AK vs 1 random',
  e_AKvs2.equity < computeEquity({ hero: H('Ah','Kc'), opponents: [{ type: 'random' }], iters: it }).equity);

console.log('\n== pot odds / decision ==');
approx('required equity: call 50 into pot 150 = 25%', requiredEquityToCall(150, 50), 25, 0.001);
approx('required equity: call 50 into pot 100 = 33.3%', requiredEquityToCall(100, 50), 33.33, 0.01);
approx('required equity: call 100 into pot 100 = 50%', requiredEquityToCall(100, 100), 50, 0.01);
ok('call profitable when equity > required', callDecision({ pot: 150, call: 50, equity: 40 }).profitable === true);
ok('fold when equity < required', callDecision({ pot: 100, call: 100, equity: 30 }).profitable === false);

console.log('\n== raise fold-equity ==');
approx('pure bluff (E=0) fold equity: bet 100 into 100 = 50%',
  raiseFoldEquity({ pot: 100, raise: 100, equity: 0 }).foldEquityNeeded, 50, 0.01);
const sb = raiseFoldEquity({ pot: 100, raise: 100, equity: 30 });
ok('semi-bluff needs less fold equity than pure bluff', sb.foldEquityNeeded < 50);

console.log('\n== settlement ==');
{
  const players = [
    { id: 'a', name: 'A', buyIns: [100], cashOut: 250 }, // +150
    { id: 'b', name: 'B', buyIns: [100], cashOut: 0 },   // -100
    { id: 'c', name: 'C', buyIns: [100], cashOut: 50 },  // -50
  ];
  const balances = computeBalances(players);
  const sumNet = balances.reduce((s, x) => s + x.net, 0);
  ok('balances net to zero', Math.abs(sumNet) < 1e-9);
  const pay = settle(balances);
  const totalPaid = pay.reduce((s, x) => s + x.amount, 0);
  ok('total paid = amount owed to winners (150)', Math.abs(totalPaid - 150) < 0.01);
  ok('minimal payments (2 for this 3-player case)', pay.length === 2);
  // Everyone ends square
  const received = {};
  balances.forEach((b) => (received[b.id] = 0));
  pay.forEach((p) => { received[p.toId] += p.amount; received[p.fromId] -= p.amount; });
  const settled = balances.every((b) => Math.abs(received[b.id] - b.net) < 0.01);
  ok('all players settled correctly', settled);
}

console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
process.exit(fail ? 1 : 0);
