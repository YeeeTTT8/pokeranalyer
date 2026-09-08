// Card model: a card is an integer 0..51.
// rank: 2..14 (11=J,12=Q,13=K,14=A).  suit: 0..3 (c,d,h,s)
// index = (rank-2)*4 + suit

export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
export const RANK_LABELS = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};
export const SUITS = [0, 1, 2, 3];
export const SUIT_LABELS = ['♣', '♦', '♥', '♠'];
export const SUIT_KEYS = ['c', 'd', 'h', 's'];

export function cardIndex(rank, suit) {
  return (rank - 2) * 4 + suit;
}
export function cardRank(idx) {
  return Math.floor(idx / 4) + 2;
}
export function cardSuit(idx) {
  return idx % 4;
}
export function cardLabel(idx) {
  return RANK_LABELS[cardRank(idx)] + SUIT_LABELS[cardSuit(idx)];
}
export function cardKey(idx) {
  return RANK_LABELS[cardRank(idx)] + SUIT_KEYS[cardSuit(idx)];
}
export function isRed(idx) {
  const s = cardSuit(idx);
  return s === 1 || s === 2; // diamonds, hearts
}

export const FULL_DECK = Array.from({ length: 52 }, (_, i) => i);

// Build a deck excluding the given used card indices.
export function deckExcluding(used) {
  const usedSet = new Set(used);
  const deck = [];
  for (let i = 0; i < 52; i++) if (!usedSet.has(i)) deck.push(i);
  return deck;
}
