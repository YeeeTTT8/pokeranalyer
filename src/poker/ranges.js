// Preflop opponent range estimation.
//
// IMPORTANT: ranges are an *estimate* the user chooses, not the villain's
// real cards. We score any two-card starting hand with the Chen formula
// and accept it into a range if its score clears a threshold. This is an
// approximation of "how tight/loose" an opponent plays, disclosed in the UI.

import { cardRank, cardSuit, RANK_LABELS } from './cards.js';

// Chen formula score for a two-card starting hand.
export function chenScore(cardA, cardB) {
  let r1 = cardRank(cardA);
  let r2 = cardRank(cardB);
  const suited = cardSuit(cardA) === cardSuit(cardB);
  if (r1 < r2) [r1, r2] = [r2, r1]; // r1 = high

  const highCardPoints = (r) => {
    if (r === 14) return 10; // A
    if (r === 13) return 8; // K
    if (r === 12) return 7; // Q
    if (r === 11) return 6; // J
    return r / 2;
  };

  let score = highCardPoints(r1);

  if (r1 === r2) {
    // Pair: multiply by 2, minimum 5.
    score = Math.max(score * 2, 5);
    return Math.round(score);
  }

  if (suited) score += 2;

  const gap = r1 - r2 - 1;
  if (gap === 1) score -= 1;
  else if (gap === 2) score -= 2;
  else if (gap === 3) score -= 4;
  else if (gap >= 4) score -= 5;

  // Straight bonus: 0 or 1 gap and both cards below Q.
  if (gap <= 1 && r1 < 12) score += 1;

  return Math.round(score);
}

// Range definitions by Chen threshold.
export const RANGES = {
  random: { key: 'random', label: 'Any two cards', short: 'Random', threshold: -Infinity },
  loose: { key: 'loose', label: 'Loose range', short: 'Loose', threshold: 5 },
  tight: { key: 'tight', label: 'Tight range', short: 'Tight', threshold: 8 },
};

export function handInRange(cardA, cardB, rangeKey) {
  const range = RANGES[rangeKey];
  if (!range) return true;
  if (range.threshold === -Infinity) return true;
  return chenScore(cardA, cardB) >= range.threshold;
}

// Fraction of all 1326 starting-hand combinations that fall in a range.
// Computed once for display so the user can see how wide each range is.
export function rangePercent(rangeKey) {
  const range = RANGES[rangeKey];
  if (!range || range.threshold === -Infinity) return 100;
  let inRange = 0;
  let total = 0;
  for (let a = 0; a < 52; a++) {
    for (let b = a + 1; b < 52; b++) {
      total++;
      if (chenScore(a, b) >= range.threshold) inRange++;
    }
  }
  return Math.round((inRange / total) * 100);
}

// Human label for a canonical hand class, e.g. "AKs".
export function handClassLabel(cardA, cardB) {
  let r1 = cardRank(cardA);
  let r2 = cardRank(cardB);
  const suited = cardSuit(cardA) === cardSuit(cardB);
  if (r1 < r2) [r1, r2] = [r2, r1];
  if (r1 === r2) return RANK_LABELS[r1] + RANK_LABELS[r2];
  return RANK_LABELS[r1] + RANK_LABELS[r2] + (suited ? 's' : 'o');
}
