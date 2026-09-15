import { useMemo, useRef, useState } from 'react';
import { useData } from '../data/store.jsx';
import {
  aggregatePlayers,
  perSessionBreakdown,
  overallTotals,
  toCSV,
} from '../poker/reports.js';
import { parseImport } from '../data/migrate.js';
import { downloadText, copyText } from '../lib/download.js';

const money = (n) =>
  (n < 0 ? '-' : '') +
  Math.abs(Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
const signed = (n) => (n > 0 ? '+' : '') + money(n);
const netClass = (n) => (n > 0 ? 'text-emerald-400' : n < 0 ? 'text-rose-400' : 'text-white/60');

export default function Reports() {
  const { sessions, exportJSON, importJSON } = useData();
  const [expanded, setExpanded] = useState({});
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  const players = useMemo(() => aggregatePlayers(sessions), [sessions]);
  const totals = useMemo(() => overallTotals(sessions), [sessions]);
  const breakdown = useMemo(() => perSessionBreakdown(sessions), [sessions]);

  const flash = (t) => {
    setMsg(t);
    setTimeout(() => setMsg(null), 3500);
  };

  const exportCSV = async () => {
    const csv = toCSV(sessions);
    const name = `poker-report-${new Date().toISOString().slice(0, 10)}.csv`;
    if (!downloadText(name, csv, 'text/csv')) {
      const ok = await copyText(csv);
      flash(ok ? 'Download blocked here — CSV copied to clipboard instead.' : 'Could not export CSV.');
    } else {
      flash('CSV downloaded.');
    }
  };

  const exportBackup = async () => {
    const json = exportJSON();
    const name = `poker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    if (!downloadText(name, json, 'application/json')) {
      const ok = await copyText(json);
      flash(ok ? 'Download blocked here — backup JSON copied to clipboard.' : 'Could not export backup.');
    } else {
      flash('Backup downloaded.');
    }
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const data = parseImport(text);
      const counts = await importJSON(data, 'skip');
      flash(`Imported ${counts.sessions} session(s), ${counts.hands} hand(s).`);
    } catch (err) {
      flash('Import failed: ' + (err.message || err));
    }
  };

  const hasData = sessions.length > 0;

  return (
    <div className="px-4 pb-28 pt-3 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold">Reports</h2>
        <button
          onClick={exportCSV}
          disabled={!hasData}
          className="rounded-lg bg-emerald-500 text-felt-900 font-semibold px-3 py-1.5 text-sm active:scale-95 disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>
      <p className="text-xs text-white/50 mb-4">
        Auto-updates across every recorded session. {totals.sessionCount} session
        {totals.sessionCount === 1 ? '' : 's'} · {totals.playerCount} player
        {totals.playerCount === 1 ? '' : 's'}.
      </p>

      {msg && (
        <div className="mb-3 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80">{msg}</div>
      )}

      {!hasData && (
        <p className="text-white/50 text-center py-10">
          No sessions yet. Track a session in Live Session and it'll show up here.
        </p>
      )}

      {hasData && (
        <>
          {/* Overall totals */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <Stat label="Total buy-in" value={money(totals.buyIn)} />
            <Stat label="Total cash-out" value={money(totals.cashOut)} />
            <Stat label="Net (all)" value={signed(totals.net)} valueClass={netClass(totals.net)} />
          </div>

          {/* Leaderboard */}
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-white/80 mb-2">All-time leaderboard</h3>
            <div className="rounded-xl overflow-hidden border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-white/60 text-xs">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">#</th>
                    <th className="text-left px-2 py-2 font-medium">Player</th>
                    <th className="text-right px-2 py-2 font-medium">In</th>
                    <th className="text-right px-2 py-2 font-medium">Out</th>
                    <th className="text-right px-3 py-2 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={p.name + i} className="border-t border-white/5">
                      <td className="px-3 py-2 text-white/50">{i + 1}</td>
                      <td className="px-2 py-2 font-medium">
                        {p.name}
                        <span className="text-white/40 text-xs"> · {p.sessions}×</span>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-white/70">{money(p.buyIn)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-white/70">{money(p.cashOut)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-bold ${netClass(p.net)}`}>
                        {signed(p.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Per-session breakdown */}
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-white/80 mb-2">Per-session breakdown</h3>
            <div className="space-y-2">
              {breakdown.map((s) => {
                const open = expanded[s.id];
                return (
                  <div key={s.id} className="rounded-xl bg-felt-800 border border-white/10">
                    <button
                      onClick={() => setExpanded((e) => ({ ...e, [s.id]: !e[s.id] }))}
                      className="w-full flex items-center justify-between px-3 py-3 active:bg-felt-700"
                    >
                      <span className="text-left">
                        <span className="font-medium">{s.label}</span>
                        <span className="block text-xs text-white/50">
                          {s.date} · {s.players.length} players · {money(s.totalIn)} on table
                        </span>
                      </span>
                      <span className="text-white/40">{open ? '▲' : '▼'}</span>
                    </button>
                    {open && (
                      <div className="px-3 pb-3">
                        <table className="w-full text-sm">
                          <thead className="text-white/50 text-xs">
                            <tr>
                              <th className="text-left py-1 font-medium">Player</th>
                              <th className="text-right py-1 font-medium">Buy-in</th>
                              <th className="text-right py-1 font-medium">Cash-out</th>
                              <th className="text-right py-1 font-medium">Net</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.players.map((p, i) => (
                              <tr key={p.name + i} className="border-t border-white/5">
                                <td className="py-1.5">{p.name}</td>
                                <td className="py-1.5 text-right tabular-nums text-white/70">{money(p.buyIn)}</td>
                                <td className="py-1.5 text-right tabular-nums text-white/70">
                                  {p.cashedOut ? money(p.cashOut) : '—'}
                                </td>
                                <td className={`py-1.5 text-right tabular-nums font-semibold ${netClass(p.net)}`}>
                                  {signed(p.net)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Backup & restore */}
      <section className="mt-6 border-t border-white/10 pt-4">
        <h3 className="text-sm font-semibold text-white/80 mb-2">Backup &amp; restore</h3>
        <p className="text-xs text-white/50 mb-3">
          Export a JSON backup of all sessions and hands, or import one (useful when moving
          between devices/origins). Import skips anything already present.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportBackup} className="rounded-lg bg-white/10 px-3 py-2 text-sm active:bg-white/20">
            Export JSON backup
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm active:bg-white/20"
          >
            Import JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, valueClass = '' }) {
  return (
    <div className="rounded-xl bg-felt-800 border border-white/10 p-3 text-center">
      <div className={`text-lg font-black tabular-nums ${valueClass}`}>{value}</div>
      <div className="text-[10px] text-white/50 mt-0.5">{label}</div>
    </div>
  );
}
