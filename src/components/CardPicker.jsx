import { useEffect, useState } from 'react';
import { cardIndex, RANKS, RANK_LABELS, SUIT_LABELS } from '../poker/cards.js';

const SUIT_COLOR = ['text-gray-100', 'text-red-400', 'text-red-400', 'text-gray-100'];
const SUIT_BG = [
  'bg-gray-700 border-gray-500',
  'bg-red-900/40 border-red-500',
  'bg-red-900/40 border-red-500',
  'bg-gray-700 border-gray-500',
];

// Bottom-sheet card picker. Pick a suit (tab) then a rank (grid) -> selects
// immediately. Cards already in use are disabled. `title` labels the slot.
export default function CardPicker({ open, title, usedCards, currentCard, onSelect, onClear, onClose }) {
  const [suit, setSuit] = useState(3); // default spades

  useEffect(() => {
    if (open) setSuit(3);
  }, [open]);

  if (!open) return null;

  const used = new Set(usedCards);
  // The card currently in this slot should still be selectable (to reselect).
  if (currentCard != null) used.delete(currentCard);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-felt-800 rounded-t-2xl border-t border-white/10 p-4 pb-6 safe-bottom animate-[slideUp_.15s_ease-out]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex gap-2">
            {currentCard != null && (
              <button
                onClick={onClear}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-sm active:scale-95"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-sm active:scale-95"
            >
              Done
            </button>
          </div>
        </div>

        {/* Suit tabs */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {SUIT_LABELS.map((label, s) => (
            <button
              key={s}
              onClick={() => setSuit(s)}
              className={`h-12 rounded-xl border-2 text-2xl active:scale-95 transition ${SUIT_COLOR[s]} ${
                suit === s ? SUIT_BG[s] : 'bg-white/5 border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Rank grid for the chosen suit */}
        <div className="grid grid-cols-5 gap-2">
          {RANKS.map((r) => {
            const idx = cardIndex(r, suit);
            const isUsed = used.has(idx);
            const isCurrent = idx === currentCard;
            return (
              <button
                key={r}
                disabled={isUsed}
                onClick={() => onSelect(idx)}
                className={`h-14 rounded-xl font-bold text-lg active:scale-95 transition flex items-center justify-center gap-0.5
                  ${isUsed ? 'bg-white/5 text-white/20' : 'bg-white text-gray-900'}
                  ${isCurrent ? 'ring-2 ring-emerald-400' : ''}`}
              >
                <span>{RANK_LABELS[r]}</span>
                <span className={SUIT_COLOR[suit] === 'text-red-400' ? 'text-red-600' : 'text-gray-900'}>
                  {SUIT_LABELS[suit]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}
