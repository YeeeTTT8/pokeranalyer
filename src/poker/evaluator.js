// 7-card (works for 5..7) poker hand evaluator.
// Returns a single integer score; higher is a better hand. Scores are
// directly comparable across all hand categories.
//
// Category codes (high 3 bits of meaning):
//   8 straight flush, 7 quads, 6 full house, 5 flush,
//   4 straight, 3 trips, 2 two pair, 1 pair, 0 high card
// Tiebreakers are packed base-15 so category always dominates.

import { cardRank, cardSuit } from './cards.js';

function pack(category, tiebreakers) {
  let s = category;
  for (let i = 0; i < 5; i++) {
    s = s * 15 + (tiebreakers[i] || 0);
  }
  return s;
}

// Highest card of the best straight given a boolean presence array (index 2..14).
// Returns 0 if no straight. Handles the wheel (A-2-3-4-5).
function straightHigh(present) {
  let ace = present[14];
  let run = 0;
  for (let r = 14; r >= 2; r--) {
    if (present[r]) {
      run++;
      if (run >= 5) return r + 4;
    } else {
      run = 0;
    }
  }
  // wheel: 5-4-3-2-A
  if (ace && present[5] && present[4] && present[3] && present[2]) return 5;
  return 0;
}

// cards: array of card indices (length 5..7)
export function evaluate(cards) {
  const rankCount = new Array(15).fill(0);
  const suitCount = [0, 0, 0, 0];
  const suitRanksPresent = [
    new Array(15).fill(false),
    new Array(15).fill(false),
    new Array(15).fill(false),
    new Array(15).fill(false),
  ];
  const present = new Array(15).fill(false);

  for (const c of cards) {
    const r = cardRank(c);
    const s = cardSuit(c);
    rankCount[r]++;
    suitCount[s]++;
    suitRanksPresent[s][r] = true;
    present[r] = true;
  }

  // Flush / straight flush
  let flushSuit = -1;
  for (let s = 0; s < 4; s++) if (suitCount[s] >= 5) flushSuit = s;
  if (flushSuit >= 0) {
    const sfHigh = straightHigh(suitRanksPresent[flushSuit]);
    if (sfHigh) return pack(8, [sfHigh]);
  }

  // Group ranks by count, high to low.
  const quads = [];
  const trips = [];
  const pairs = [];
  const singles = [];
  for (let r = 14; r >= 2; r--) {
    const c = rankCount[r];
    if (c === 4) quads.push(r);
    else if (c === 3) trips.push(r);
    else if (c === 2) pairs.push(r);
    else if (c === 1) singles.push(r);
  }

  const kickersExcluding = (excluded, n) => {
    const out = [];
    for (let r = 14; r >= 2 && out.length < n; r--) {
      if (rankCount[r] > 0 && !excluded.includes(r)) out.push(r);
    }
    return out;
  };

  // Four of a kind
  if (quads.length) {
    const q = quads[0];
    const k = kickersExcluding([q], 1);
    return pack(7, [q, k[0]]);
  }

  // Full house (trips + pair, or two sets of trips)
  if (trips.length >= 1 && (pairs.length >= 1 || trips.length >= 2)) {
    const t = trips[0];
    const pairRank = trips.length >= 2 ? Math.max(trips[1], pairs[0] || 0) : pairs[0];
    return pack(6, [t, pairRank]);
  }

  // Flush
  if (flushSuit >= 0) {
    const top = [];
    for (let r = 14; r >= 2 && top.length < 5; r--) {
      if (suitRanksPresent[flushSuit][r]) top.push(r);
    }
    return pack(5, top);
  }

  // Straight
  const sHigh = straightHigh(present);
  if (sHigh) return pack(4, [sHigh]);

  // Three of a kind
  if (trips.length) {
    const t = trips[0];
    const k = kickersExcluding([t], 2);
    return pack(3, [t, k[0], k[1]]);
  }

  // Two pair
  if (pairs.length >= 2) {
    const p1 = pairs[0];
    const p2 = pairs[1];
    const k = kickersExcluding([p1, p2], 1);
    return pack(2, [p1, p2, k[0]]);
  }

  // One pair
  if (pairs.length === 1) {
    const p = pairs[0];
    const k = kickersExcluding([p], 3);
    return pack(1, [p, k[0], k[1], k[2]]);
  }

  // High card
  return pack(0, singles.slice(0, 5));
}

export const HAND_CATEGORY_NAMES = [
  'High Card',
  'Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
];

export function categoryOf(score) {
  return Math.floor(score / (15 * 15 * 15 * 15 * 15));
}
export function categoryName(score) {
  return HAND_CATEGORY_NAMES[categoryOf(score)];
}
