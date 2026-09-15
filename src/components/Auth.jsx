import { useState } from 'react';
import { useData } from '../data/store.jsx';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../data/config.js';

// The Project URL should look exactly like https://<ref>.supabase.co
const URL_OK = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SUPABASE_URL);
function urlHost() {
  try {
    return new URL(SUPABASE_URL).host;
  } catch (e) {
    return SUPABASE_URL || '(not set)';
  }
}

// Shown when Supabase is configured but nobody is signed in. Magic-link only —
// no passwords.
export default function Auth() {
  const { signIn, useDeviceOnly } = useData();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [test, setTest] = useState(null); // null | 'testing' | 'ok' | string
  const [showDiag, setShowDiag] = useState(false);

  const isFetchFail = err && /failed to fetch|networkerror|load failed/i.test(err);

  const testConnection = async () => {
    setTest('testing');
    try {
      const base = (SUPABASE_URL || '').replace(/\/$/, '');
      const r = await fetch(`${base}/auth/v1/health`, { headers: { apikey: SUPABASE_ANON_KEY } });
      setTest(r.ok ? 'ok' : `reached, but returned HTTP ${r.status}`);
    } catch (e) {
      setTest('unreachable');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const addr = email.trim();
    if (!addr) return;
    setBusy(true);
    setErr(null);
    try {
      await signIn(addr);
      setSent(true);
    } catch (e2) {
      setErr(e2.message || String(e2));
      setShowDiag(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto text-center">
      <div className="text-5xl mb-3">♠</div>
      <h1 className="text-2xl font-black mb-1">Poker Assistant</h1>
      <p className="text-white/60 text-sm mb-8">
        Sign in to sync your sessions and hands across every device.
      </p>

      {sent ? (
        <div className="w-full rounded-2xl bg-felt-800 border border-white/10 p-5">
          <div className="text-3xl mb-2">📬</div>
          <p className="text-sm">
            Check <b>{email}</b> for a sign-in link. Open it on this device to finish.
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-4 text-xs text-white/50 active:text-white"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="w-full">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none text-center mb-3"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-emerald-500 text-felt-900 font-semibold py-3 active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Email me a sign-in link'}
          </button>
          {err && (
            <div className="mt-3 text-sm">
              <p className="text-rose-400">{err}</p>
              {isFetchFail && (
                <p className="text-white/60 text-xs mt-1">
                  The app couldn't reach your Supabase project — this is a URL/network issue, not a
                  login error. Check the connection below.
                </p>
              )}
            </div>
          )}
        </form>
      )}

      {/* Connection diagnostic (public info — the anon URL is not a secret) */}
      <div className="w-full mt-4">
        <button
          onClick={() => setShowDiag((s) => !s)}
          className="text-xs text-white/40 active:text-white"
        >
          {showDiag ? 'Hide' : 'Connection details'}
        </button>
        {showDiag && (
          <div className="mt-2 rounded-xl bg-felt-800 border border-white/10 p-3 text-left text-xs space-y-2">
            <div>
              <span className="text-white/50">Supabase URL:</span>{' '}
              <span className={URL_OK ? 'text-emerald-300' : 'text-amber-300'}>{urlHost()}</span>
            </div>
            {!URL_OK && (
              <p className="text-amber-300">
                ⚠ This doesn't look like a Project URL. It should be exactly
                <b> https://&lt;your-ref&gt;.supabase.co</b> (no path, no trailing slash). Fix the
                <b> VITE_SUPABASE_URL</b> repo secret, then redeploy.
              </p>
            )}
            <button
              onClick={testConnection}
              className="rounded-lg bg-white/10 px-3 py-1.5 active:bg-white/20"
            >
              Test connection
            </button>
            {test === 'testing' && <span className="ml-2 text-white/50">testing…</span>}
            {test === 'ok' && <span className="ml-2 text-emerald-300">✓ reachable</span>}
            {test === 'unreachable' && (
              <span className="ml-2 text-rose-300">✗ unreachable — URL is wrong or project is paused</span>
            )}
            {test && test !== 'testing' && test !== 'ok' && test !== 'unreachable' && (
              <span className="ml-2 text-amber-300">{test}</span>
            )}
          </div>
        )}
      </div>

      <button
        onClick={useDeviceOnly}
        className="mt-8 text-sm text-white/50 underline underline-offset-4 active:text-white"
      >
        Skip — use this device only
      </button>
      <p className="text-[11px] text-white/40 mt-2 max-w-xs">
        Device-only mode keeps data in this browser (no sync). You can turn on sync later from the
        header.
      </p>
    </div>
  );
}
