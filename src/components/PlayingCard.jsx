import { cardRank, cardSuit, RANK_LABELS, SUIT_LABELS } from '../poker/cards.js';

const SUIT_COLOR = ['text-gray-900', 'text-red-600', 'text-red-600', 'text-gray-900'];

// A rendered card face. size: 'sm' | 'md' | 'lg'
export default function PlayingCard({ card, size = 'md', onClick, placeholder, dim }) {
  const dims = {
    sm: 'w-9 h-12 text-base rounded-md',
    md: 'w-12 h-16 text-xl rounded-lg',
    lg: 'w-14 h-20 text-2xl rounded-lg',
  }[size];

  if (card == null) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${dims} flex items-center justify-center border-2 border-dashed border-white/30 bg-white/5 text-white/40 font-semibold active:scale-95 transition`}
      >
        {placeholder || '+'}
      </button>
    );
  }

  const rank = RANK_LABELS[cardRank(card)];
  const suit = SUIT_LABELS[cardSuit(card)];
  const color = SUIT_COLOR[cardSuit(card)];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${dims} ${dim ? 'opacity-40' : ''} flex flex-col items-center justify-center bg-white font-bold shadow-md active:scale-95 transition leading-none`}
    >
      <span className={color}>{rank}</span>
      <span className={`${color} text-[0.85em]`}>{suit}</span>
    </button>
  );
}
