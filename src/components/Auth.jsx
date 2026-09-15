import { useState } from 'react';
import { useData } from '../data/store.jsx';

// Shown when Supabase is configured but nobody is signed in. Magic-link only —
// no passwords.
export default function Auth() {
  const { signIn, useDeviceOnly } = useData();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

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
          {err && <p className="text-rose-400 text-sm mt-3">{err}</p>}
        </form>
      )}

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
