// Monte Carlo equity simulation over the remaining deck.
//
// Hero's equity is computed against opponents that are, by default, *random*
// hands (or a chosen range, or specific known cards). Equity is the average
// share of the pot hero wins: a solo win counts 1, a k-way split counts 1/k.

import { deckExcluding } from './cards.js';
import { evaluate } from './evaluator.js';
import { handInRange } from './ranges.js';

function drawOne(avail) {
  const i = (Math.random() * avail.length) | 0;
  const c = avail[i];
  avail[i] = avail[avail.length - 1];
  avail.pop();
  return c;
}

function drawRangeHand(avail, rangeKey) {
  for (let attempt = 0; attempt < 300; attempt++) {
    if (avail.length < 2) break;
    const i = (Math.random() * avail.length) | 0;
    let j = (Math.random() * avail.length) | 0;
    if (i === j) continue;
    const a = avail[i];
    const b = avail[j];
    if (handInRange(a, b, rangeKey)) {
      const hi = Math.max(i, j);
      const lo = Math.min(i, j);
      avail[hi] = avail[avail.length - 1];
      avail.pop();
      avail[lo] = avail[avail.length - 1];
      avail.pop();
      return [a, b];
    }
  }
  // Fallback (range too narrow for remaining deck): any two cards.
  return [drawOne(avail), drawOne(avail)];
}

// opponents: array of
//   { type: 'random' }
//   { type: 'range', rangeKey }
//   { type: 'cards', cards: [c1, c2] }
export function computeEquity({ hero, board = [], opponents, iters = 20000 }) {
  if (!hero || hero.length !== 2) {
    return { equity: 0, win: 0, tie: 0, iters: 0, valid: false };
  }
  const oppList = opponents && opponents.length ? opponents : [{ type: 'random' }];

  const permanentUsed = [...hero, ...board];
  for (const opp of oppList) {
    if (opp.type === 'cards' && opp.cards) permanentUsed.push(...opp.cards);
  }
  const baseDeck = deckExcluding(permanentUsed);
  const boardNeed = 5 - board.length;

  let eqSum = 0;
  let wins = 0;
  let ties = 0;

  for (let it = 0; it < iters; it++) {
    const avail = baseDeck.slice();

    const oppHoles = [];
    for (const opp of oppList) {
      if (opp.type === 'cards') oppHoles.push(opp.cards);
      else if (opp.type === 'range') oppHoles.push(drawRangeHand(avail, opp.rangeKey));
      else oppHoles.push([drawOne(avail), drawOne(avail)]);
    }

    const fullBoard = board.slice();
    for (let k = 0; k < boardNeed; k++) fullBoard.push(drawOne(avail));

    const heroScore = evaluate([hero[0], hero[1], ...fullBoard]);

    let maxScore = heroScore;
    let countAtMax = 1;
    for (const oh of oppHoles) {
      const s = evaluate([oh[0], oh[1], ...fullBoard]);
      if (s > maxScore) {
        maxScore = s;
        countAtMax = 1;
      } else if (s === maxScore) {
        countAtMax++;
      }
    }

    if (heroScore === maxScore) {
      if (countAtMax === 1) {
        wins++;
        eqSum += 1;
      } else {
        ties++;
        eqSum += 1 / countAtMax;
      }
    }
  }

  return {
    equity: (eqSum / iters) * 100,
    win: (wins / iters) * 100,
    tie: (ties / iters) * 100,
    iters,
    valid: true,
  };
}
