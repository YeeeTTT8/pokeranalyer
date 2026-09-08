import PlayingCard from './PlayingCard.jsx';
import { RANGES } from '../poker/ranges.js';

const money = (n) => (n == null ? '' : (n > 0 ? '+' : '') + n);

export default function HandLog({ hands, onUpdate, onRemove }) {
  return (
    <div className="px-4 pb-28 pt-3 max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-1">Hand log</h2>
      <p className="text-xs text-white/50 mb-4">
        Optional. Save hands from the Analyzer, then add the result and notes for review.
      </p>

      {(!hands || hands.length === 0) && (
        <p className="text-white/50 text-center py-10">
          No saved hands yet. Use “Save this hand to log” in the Analyzer.
        </p>
      )}

      <div className="space-y-3">
        {hands.map((h) => (
          <div key={h.id} className="rounded-xl bg-felt-800 border border-white/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50">
                {new Date(h.savedAt).toLocaleString()}
              </span>
              <button
                onClick={() => onRemove(h.id)}
                className="text-[11px] text-white/40 active:text-rose-300"
              >
                Delete
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1">
                {h.hero.map((c, i) => (
                  <PlayingCard key={i} card={c} size="sm" />
                ))}
              </div>
              {h.board.length > 0 && (
                <>
                  <span className="text-white/30">|</span>
                  <div className="flex gap-1">
                    {h.board.map((c, i) => (
                      <PlayingCard key={i} card={c} size="sm" />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="text-xs text-white/60 mt-2">
              {h.equity != null && <>Equity {h.equity.toFixed(1)}% · </>}
              {h.opponents} opp · {RANGES[h.assumption]?.short || h.assumption}
            </div>

            <div className="flex gap-2 mt-3">
              {['Won', 'Lost', 'Folded'].map((r) => (
                <button
                  key={r}
                  onClick={() => onUpdate(h.id, { result: h.result === r ? null : r })}
                  className={`rounded-lg px-3 py-1.5 text-sm active:scale-95 ${
                    h.result === r ? 'bg-emerald-500 text-felt-900 font-semibold' : 'bg-white/10'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <input
              value={h.notes || ''}
              onChange={(e) => onUpdate(h.id, { notes: e.target.value })}
              placeholder="Notes…"
              className="mt-3 w-full rounded-lg bg-white/10 px-3 py-2 text-sm outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
