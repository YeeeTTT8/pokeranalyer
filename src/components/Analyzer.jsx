import { useMemo, useState } from 'react';
import PlayingCard from './PlayingCard.jsx';
import CardPicker from './CardPicker.jsx';
import { useEquity } from '../hooks/useEquity.js';
import { evaluate, categoryName } from '../poker/evaluator.js';
import { callDecision, raiseFoldEquity, requiredEquityToCall } from '../poker/decision.js';
import { RANGES, rangePercent } from '../poker/ranges.js';

// Precompute range widths once.
const RANGE_PCT = {
  loose: rangePercent('loose'),
  tight: rangePercent('tight'),
};

const ASSUMPTIONS = [
  { key: 'random', label: 'Random', desc: 'any two cards' },
  { key: 'loose', label: 'Loose', desc: `~top ${RANGE_PCT.loose}%` },
  { key: 'tight', label: 'Tight', desc: `~top ${RANGE_PCT.tight}%` },
];

function NumberField({ label, value, onChange, step = 5 }) {
  const num = value === '' ? 0 : Number(value);
  return (
    <div className="flex-1">
      <label className="block text-xs text-white/60 mb-1">{label}</label>
      <div className="flex items-stretch rounded-xl overflow-hidden bg-white/10">
        <button
          type="button"
          onClick={() => onChange(String(Math.max(0, num - step)))}
          className="w-11 text-2xl font-bold bg-white/5 active:bg-white/20"
        >
          −
        </button>
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
          className="flex-1 min-w-0 bg-transparent text-center text-xl font-semibold outline-none"
          placeholder="0"
        />
        <button
          type="button"
          onClick={() => onChange(String(num + step))}
          className="w-11 text-2xl font-bold bg-white/5 active:bg-white/20"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function Analyzer({ onSaveHand }) {
  const [hero, setHero] = useState([null, null]);
  const [board, setBoard] = useState([null, null, null, null, null]);
  const [opponents, setOpponents] = useState(1);
  const [assumption, setAssumption] = useState('random');

  const [useKnownVillain, setUseKnownVillain] = useState(false);
  const [villain, setVillain] = useState([null, null]);

  const [pot, setPot] = useState('');
  const [toCall, setToCall] = useState('');

  const [showRaise, setShowRaise] = useState(false);
  const [raise, setRaise] = useState('');

  // Picker state: which slot is being edited.
  const [picker, setPicker] = useState(null); // {kind:'hero'|'board'|'villain', index}

  const usedCards = useMemo(
    () => [...hero, ...board, ...villain].filter((c) => c != null),
    [hero, board, villain]
  );

  const heroComplete = hero[0] != null && hero[1] != null;
  const boardCards = board.filter((c) => c != null);
  const villainComplete = villain[0] != null && villain[1] != null;

  // Build the equity payload.
  const opponentList = useMemo(() => {
    const list = [];
    let unknown = opponents;
    if (useKnownVillain && villainComplete) {
      list.push({ type: 'cards', cards: villain });
      unknown = Math.max(0, opponents - 1);
    }
    for (let i = 0; i < unknown; i++) {
      if (assumption === 'random') list.push({ type: 'random' });
      else list.push({ type: 'range', rangeKey: assumption });
    }
    return list.length ? list : [{ type: 'random' }];
  }, [opponents, assumption, useKnownVillain, villainComplete, villain]);

  const iters = Math.max(8000, Math.min(30000, Math.round(30000 / Math.max(1, opponents))));

  const payload = useMemo(
    () => ({
      hero: heroComplete ? hero : null,
      board: boardCards,
      opponents: opponentList,
      iters,
    }),
    [heroComplete, hero, boardCards, opponentList, iters]
  );

  const { result, computing } = useEquity(payload, { enabled: heroComplete });

  const equity = result?.equity ?? 0;

  // Hero's current made hand (needs >= 5 known cards).
  const madeHand = useMemo(() => {
    if (!heroComplete || boardCards.length < 3) return null;
    return categoryName(evaluate([...hero, ...boardCards]));
  }, [heroComplete, hero, boardCards]);

  const potNum = pot === '' ? 0 : Number(pot);
  const callNum = toCall === '' ? 0 : Number(toCall);
  const potReady = callNum > 0;
  const decision = potReady ? callDecision({ pot: potNum, call: callNum, equity }) : null;
  const required = potReady ? requiredEquityToCall(potNum, callNum) : 0;

  const raiseNum = raise === '' ? 0 : Number(raise);
  const raiseInfo =
    showRaise && raiseNum > 0
      ? raiseFoldEquity({ pot: potNum, raise: raiseNum, equity })
      : null;

  const openPicker = (kind, index) => setPicker({ kind, index });
  const closePicker = () => setPicker(null);

  const setCard = (idx) => {
    if (!picker) return;
    if (picker.kind === 'hero') {
      const next = [...hero];
      next[picker.index] = idx;
      setHero(next);
    } else if (picker.kind === 'board') {
      const next = [...board];
      next[picker.index] = idx;
      setBoard(next);
    } else if (picker.kind === 'villain') {
      const next = [...villain];
      next[picker.index] = idx;
      setVillain(next);
    }
    closePicker();
  };

  const clearCard = () => {
    if (!picker) return;
    if (picker.kind === 'hero') {
      const next = [...hero];
      next[picker.index] = null;
      setHero(next);
    } else if (picker.kind === 'board') {
      const next = [...board];
      next[picker.index] = null;
      setBoard(next);
    } else {
      const next = [...villain];
      next[picker.index] = null;
      setVillain(next);
    }
    closePicker();
  };

  const currentCardForPicker =
    picker == null
      ? null
      : picker.kind === 'hero'
      ? hero[picker.index]
      : picker.kind === 'board'
      ? board[picker.index]
      : villain[picker.index];

  const pickerTitle =
    picker == null
      ? ''
      : picker.kind === 'hero'
      ? 'Your card'
      : picker.kind === 'villain'
      ? 'Villain card'
      : ['Flop', 'Flop', 'Flop', 'Turn', 'River'][picker.index];

  const resetBoard = () => setBoard([null, null, null, null, null]);
  const newHand = () => {
    setHero([null, null]);
    setBoard([null, null, null, null, null]);
    setVillain([null, null]);
    setPot('');
    setToCall('');
    setRaise('');
  };

  const canSave = heroComplete;

  return (
    <div className="px-4 pb-28 pt-3 max-w-md mx-auto">
      {/* Hero cards */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-white/80">Your hole cards</h2>
          <button onClick={newHand} className="text-xs text-white/50 active:text-white">
            New hand
          </button>
        </div>
        <div className="flex gap-3 justify-center">
          {hero.map((cardVal, i) => (
            <PlayingCard
              key={i}
              card={cardVal}
              size="lg"
              onClick={() => openPicker('hero', i)}
            />
          ))}
        </div>
      </section>

      {/* Board */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-white/80">Board (optional preflop)</h2>
          {boardCards.length > 0 && (
            <button onClick={resetBoard} className="text-xs text-white/50 active:text-white">
              Clear board
            </button>
          )}
        </div>
        <div className="flex gap-1.5 justify-center">
          {board.map((cardVal, i) => (
            <PlayingCard
              key={i}
              card={cardVal}
              size="md"
              placeholder={i < 3 ? '⬦' : i === 3 ? 'T' : 'R'}
              onClick={() => openPicker('board', i)}
            />
          ))}
        </div>
      </section>

      {/* Equity result */}
      <section className="mb-4 rounded-2xl bg-felt-800 border border-white/10 p-4">
        {!heroComplete ? (
          <p className="text-center text-white/50 py-4">
            Pick your 2 hole cards to see equity.
          </p>
        ) : (
          <>
            <div className="flex items-end justify-center gap-2">
              <span className="text-5xl font-black tabular-nums text-emerald-400">
                {equity.toFixed(1)}
                <span className="text-2xl">%</span>
              </span>
              {computing && (
                <span className="mb-2 text-xs text-white/40 animate-pulse">updating…</span>
              )}
            </div>
            <p className="text-center text-xs text-white/60 mt-1">
              your equity {result ? `· win ${result.win.toFixed(1)}% · tie ${result.tie.toFixed(1)}%` : ''}
            </p>
            {madeHand && (
              <p className="text-center text-sm mt-2 text-white/80">
                Current hand: <span className="font-semibold text-white">{madeHand}</span>
              </p>
            )}
            <div className="mt-3 text-[11px] leading-snug text-amber-300/90 bg-amber-500/10 rounded-lg px-3 py-2">
              ⓘ Equity vs {opponents} opponent{opponents > 1 ? 's' : ''}{' '}
              {useKnownVillain && villainComplete
                ? '(one with the cards you set, rest '
                : '('}
              assumed to hold{' '}
              <b>
                {assumption === 'random'
                  ? 'a random hand'
                  : `a ${RANGES[assumption].short.toLowerCase()} range (~top ${RANGE_PCT[assumption]}%)`}
              </b>
              {useKnownVillain && villainComplete ? ')' : ')'} — not their real cards.
              {result ? ` ${result.iters.toLocaleString()} simulations.` : ''}
            </div>
          </>
        )}
      </section>

      {/* Opponents & assumption */}
      <section className="mb-4">
        <h2 className="text-sm font-semibold text-white/80 mb-2">Opponents in hand</h2>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-stretch rounded-xl overflow-hidden bg-white/10">
            <button
              onClick={() => setOpponents((n) => Math.max(1, n - 1))}
              className="w-12 h-12 text-2xl font-bold bg-white/5 active:bg-white/20"
            >
              −
            </button>
            <div className="w-12 flex items-center justify-center text-xl font-bold">
              {opponents}
            </div>
            <button
              onClick={() => setOpponents((n) => Math.min(8, n + 1))}
              className="w-12 h-12 text-2xl font-bold bg-white/5 active:bg-white/20"
            >
              +
            </button>
          </div>
          <p className="text-xs text-white/50 flex-1">
            You don't need their cards. Add opponents so equity & pot are accurate.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {ASSUMPTIONS.map((a) => (
            <button
              key={a.key}
              onClick={() => setAssumption(a.key)}
              className={`rounded-xl py-2 text-center border-2 active:scale-95 transition ${
                assumption === a.key
                  ? 'bg-emerald-500/20 border-emerald-400'
                  : 'bg-white/5 border-transparent'
              }`}
            >
              <div className="font-semibold text-sm">{a.label}</div>
              <div className="text-[10px] text-white/50">{a.desc}</div>
            </button>
          ))}
        </div>

        {/* Known villain */}
        <div className="mt-3">
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={useKnownVillain}
              onChange={(e) => setUseKnownVillain(e.target.checked)}
              className="w-5 h-5 accent-emerald-500"
            />
            I know a villain's exact cards
          </label>
          {useKnownVillain && (
            <div className="flex gap-3 justify-center mt-2">
              {villain.map((cardVal, i) => (
                <PlayingCard
                  key={i}
                  card={cardVal}
                  size="md"
                  onClick={() => openPicker('villain', i)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pot odds */}
      <section className="mb-4">
        <h2 className="text-sm font-semibold text-white/80 mb-2">Pot & bet facing</h2>
        <div className="flex gap-3">
          <NumberField label="Pot size" value={pot} onChange={setPot} />
          <NumberField label="Amount to call" value={toCall} onChange={setToCall} />
        </div>

        {potReady && heroComplete && (
          <div
            className={`mt-3 rounded-2xl p-4 border-2 ${
              decision.profitable
                ? 'bg-emerald-500/15 border-emerald-400'
                : 'bg-rose-500/15 border-rose-400'
            }`}
          >
            <div className="text-2xl font-black">
              {decision.profitable ? '✅ Call — profitable' : '⛔ Fold'}
            </div>
            <p className="text-sm mt-1 text-white/85">
              You need <b>{required.toFixed(1)}%</b> equity to call, you have{' '}
              <b>{equity.toFixed(1)}%</b>.
              {decision.profitable
                ? ` That's a ${decision.margin.toFixed(1)}-pt edge.`
                : ` You're ${Math.abs(decision.margin).toFixed(1)} pts short.`}
            </p>
            <div className="mt-2 text-xs text-white/60 space-y-0.5">
              <div>
                Pot odds: call {callNum} to win {potNum} → {callNum} / ({potNum} + {callNum}) ={' '}
                {required.toFixed(1)}%
              </div>
              <div>
                EV of calling ≈{' '}
                <span className={decision.ev >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                  {decision.ev >= 0 ? '+' : ''}
                  {decision.ev.toFixed(1)} chips
                </span>{' '}
                ({(equity / 100).toFixed(3)}×{potNum} − {(1 - equity / 100).toFixed(3)}×{callNum})
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Raise analysis */}
      <section className="mb-4">
        <button
          onClick={() => setShowRaise((s) => !s)}
          className="w-full flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 active:bg-white/10"
        >
          <span className="text-sm font-semibold text-white/80">
            Considering a raise / semi-bluff?
          </span>
          <span className="text-white/50">{showRaise ? '▲' : '▼'}</span>
        </button>
        {showRaise && (
          <div className="mt-3">
            <NumberField label="Your raise size (chips you put in)" value={raise} onChange={setRaise} />
            {raiseInfo && heroComplete && (
              <div className="mt-3 rounded-2xl bg-felt-800 border border-white/10 p-4">
                <p className="text-sm">
                  To break even on this raise, villain must fold at least{' '}
                  <b className="text-emerald-400">{raiseInfo.foldEquityNeeded.toFixed(1)}%</b> of
                  the time.
                </p>
                <div className="mt-2 text-xs text-white/60 space-y-1">
                  <div>
                    Semi-bluff: credits your <b>{equity.toFixed(1)}%</b> equity for the times you get
                    called.
                  </div>
                  <div>
                    A pure bluff (0% equity when called) would need{' '}
                    <b>{raiseInfo.pureBluffFe.toFixed(1)}%</b> fold equity: {raiseNum} / ({raiseNum} +{' '}
                    {potNum}).
                  </div>
                </div>
              </div>
            )}
            {showRaise && raiseNum <= 0 && (
              <p className="text-xs text-white/50 mt-2">
                Enter your raise size to see the fold equity you need.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Save hand */}
      {onSaveHand && (
        <button
          disabled={!canSave}
          onClick={() =>
            onSaveHand({
              hero: [...hero],
              board: boardCards,
              equity: result?.equity ?? null,
              opponents,
              assumption,
            })
          }
          className="w-full rounded-xl bg-white/10 py-3 font-semibold disabled:opacity-40 active:bg-white/20"
        >
          Save this hand to log
        </button>
      )}

      <CardPicker
        open={picker != null}
        title={pickerTitle}
        usedCards={usedCards}
        currentCard={currentCardForPicker}
        onSelect={setCard}
        onClear={clearCard}
        onClose={closePicker}
      />
    </div>
  );
}
