import { useMemo, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { computeBalances, settle } from '../poker/settlement.js';

const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const money = (n) => (Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function BuyInTracker() {
  const [sessions, setSessions] = useLocalStorage('pa_sessions', []);
  const [activeId, setActiveId] = useState(null);

  const active = sessions.find((s) => s.id === activeId) || null;

  const createSession = () => {
    const s = {
      id: uid(),
      date: todayISO(),
      name: '',
      defaultBuyIn: 20,
      players: [],
      createdAt: Date.now(),
    };
    setSessions([s, ...sessions]);
    setActiveId(s.id);
  };

  const updateSession = (id, patch) =>
    setSessions(sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const deleteSession = (id) => {
    setSessions(sessions.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  if (active) {
    return (
      <SessionDetail
        session={active}
        onBack={() => setActiveId(null)}
        onChange={(patch) => updateSession(active.id, patch)}
        onDelete={() => deleteSession(active.id)}
      />
    );
  }

  return (
    <div className="px-4 pb-28 pt-3 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Sessions</h2>
        <button
          onClick={createSession}
          className="rounded-xl bg-emerald-500 text-felt-900 font-semibold px-4 py-2 active:scale-95"
        >
          + New session
        </button>
      </div>

      {sessions.length === 0 && (
        <p className="text-white/50 text-center py-10">
          No sessions yet. Start one to track buy-ins.
        </p>
      )}

      <div className="space-y-2">
        {sessions.map((s) => {
          const balances = computeBalances(s.players);
          const pot = balances.reduce((sum, b) => sum + b.buyInTotal, 0);
          return (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className="w-full text-left rounded-xl bg-felt-800 border border-white/10 p-4 active:bg-felt-700"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{s.name || s.date}</span>
                <span className="text-xs text-white/50">{s.date}</span>
              </div>
              <div className="text-xs text-white/60 mt-1">
                {s.players.length} players · {money(pot)} total on table
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SessionDetail({ session, onBack, onChange, onDelete }) {
  const [name, setName] = useState('');
  const [showSettle, setShowSettle] = useState(false);

  const balances = useMemo(() => computeBalances(session.players), [session.players]);
  const totalIn = balances.reduce((s, b) => s + b.buyInTotal, 0);
  const totalOut = balances.reduce((s, b) => s + b.cashOut, 0);
  const allCashedOut =
    session.players.length > 0 && session.players.every((p) => p.cashOut != null);
  const netSum = balances.reduce((s, b) => s + b.net, 0);
  const payments = useMemo(() => settle(balances), [balances]);

  const addPlayer = () => {
    const nm = name.trim();
    if (!nm) return;
    onChange({
      players: [
        ...session.players,
        { id: uid(), name: nm, buyIns: [session.defaultBuyIn], cashOut: null },
      ],
    });
    setName('');
  };

  const patchPlayer = (pid, fn) =>
    onChange({ players: session.players.map((p) => (p.id === pid ? fn(p) : p)) });

  const addBuyIn = (pid, amount) =>
    patchPlayer(pid, (p) => ({ ...p, buyIns: [...p.buyIns, amount] }));

  const removeLastBuyIn = (pid) =>
    patchPlayer(pid, (p) => ({ ...p, buyIns: p.buyIns.slice(0, -1) }));

  const setCashOut = (pid, val) =>
    patchPlayer(pid, (p) => ({ ...p, cashOut: val === '' ? null : Number(val) }));

  const removePlayer = (pid) =>
    onChange({ players: session.players.filter((p) => p.id !== pid) });

  return (
    <div className="px-4 pb-28 pt-3 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onBack} className="text-white/70 active:text-white">
          ‹ Sessions
        </button>
        <button
          onClick={() => {
            if (confirm('Delete this session?')) onDelete();
          }}
          className="text-rose-400 text-sm active:text-rose-300"
        >
          Delete
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={session.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={`Session — ${session.date}`}
          className="flex-1 rounded-xl bg-white/10 px-3 py-2 outline-none"
        />
        <input
          type="date"
          value={session.date}
          onChange={(e) => onChange({ date: e.target.value })}
          className="rounded-xl bg-white/10 px-2 py-2 outline-none text-sm"
        />
      </div>

      {/* Default buy-in */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <span className="text-white/60">Default buy-in</span>
        <input
          inputMode="decimal"
          value={session.defaultBuyIn}
          onChange={(e) =>
            onChange({ defaultBuyIn: Number(e.target.value.replace(/[^0-9.]/g, '')) || 0 })
          }
          className="w-20 rounded-lg bg-white/10 px-2 py-1 text-center outline-none"
        />
      </div>

      {/* Add player */}
      <div className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
          placeholder="Player name"
          className="flex-1 rounded-xl bg-white/10 px-3 py-3 outline-none"
        />
        <button
          onClick={addPlayer}
          className="rounded-xl bg-emerald-500 text-felt-900 font-semibold px-4 active:scale-95"
        >
          Add
        </button>
      </div>

      {/* Ledger */}
      <div className="space-y-2">
        {session.players.map((p) => {
          const bal = balances.find((b) => b.id === p.id);
          return (
            <div key={p.id} className="rounded-xl bg-felt-800 border border-white/10 p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{p.name}</span>
                <span
                  className={`font-bold tabular-nums ${
                    bal.net > 0 ? 'text-emerald-400' : bal.net < 0 ? 'text-rose-400' : 'text-white/60'
                  }`}
                >
                  {bal.net > 0 ? '+' : ''}
                  {money(bal.net)}
                </span>
              </div>
              <div className="text-xs text-white/50 mt-0.5">
                In: {money(bal.buyInTotal)} ({p.buyIns.length}×) · Out:{' '}
                {p.cashOut == null ? '—' : money(p.cashOut)}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  onClick={() => addBuyIn(p.id, session.defaultBuyIn)}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm active:bg-white/20"
                >
                  + Buy-in ({money(session.defaultBuyIn)})
                </button>
                <button
                  onClick={() => {
                    const v = prompt('Custom buy-in / re-buy amount');
                    const n = Number(v);
                    if (v != null && !Number.isNaN(n) && n > 0) addBuyIn(p.id, n);
                  }}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm active:bg-white/20"
                >
                  + Custom
                </button>
                {p.buyIns.length > 0 && (
                  <button
                    onClick={() => removeLastBuyIn(p.id)}
                    className="rounded-lg bg-white/5 px-2 py-1.5 text-sm text-white/60 active:bg-white/10"
                  >
                    Undo
                  </button>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-xs text-white/50">Cash out</span>
                  <input
                    inputMode="decimal"
                    value={p.cashOut == null ? '' : p.cashOut}
                    onChange={(e) => setCashOut(p.id, e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="—"
                    className="w-20 rounded-lg bg-white/10 px-2 py-1 text-center outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => removePlayer(p.id)}
                className="text-[11px] text-white/40 mt-2 active:text-rose-300"
              >
                Remove player
              </button>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      {session.players.length > 0 && (
        <div className="mt-4 rounded-xl bg-white/5 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-white/60">Total bought in</span>
            <span className="tabular-nums">{money(totalIn)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Total cashed out</span>
            <span className="tabular-nums">{money(totalOut)}</span>
          </div>
          {Math.abs(netSum) > 0.005 && (
            <div className="flex justify-between text-amber-300 mt-1">
              <span>Chips unaccounted (in − out)</span>
              <span className="tabular-nums">{money(totalIn - totalOut)}</span>
            </div>
          )}
        </div>
      )}

      {/* Settlement */}
      {session.players.length > 1 && (
        <div className="mt-4">
          <button
            onClick={() => setShowSettle((s) => !s)}
            className="w-full rounded-xl bg-emerald-500/90 text-felt-900 font-semibold py-3 active:scale-[0.99]"
          >
            {showSettle ? 'Hide settlement' : 'Settle up'}
          </button>

          {showSettle && (
            <div className="mt-3 rounded-xl bg-felt-800 border border-white/10 p-4">
              {!allCashedOut && (
                <p className="text-xs text-amber-300 mb-2">
                  Note: some players haven't cashed out — they're treated as 0 until you enter a
                  cash-out.
                </p>
              )}
              {Math.abs(netSum) > 0.005 && (
                <p className="text-xs text-amber-300 mb-2">
                  Buy-ins and cash-outs don't balance by {money(Math.abs(netSum))}. Check the
                  numbers — settlement assumes they net to zero.
                </p>
              )}
              {payments.length === 0 ? (
                <p className="text-white/60 text-sm">Everyone's even — no payments needed.</p>
              ) : (
                <>
                  <p className="text-xs text-white/50 mb-2">
                    Minimal payments to settle everyone ({payments.length}):
                  </p>
                  <ul className="space-y-2">
                    {payments.map((p, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span>
                          <b className="text-rose-300">{p.from}</b> →{' '}
                          <b className="text-emerald-300">{p.to}</b>
                        </span>
                        <span className="font-bold tabular-nums">{money(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
