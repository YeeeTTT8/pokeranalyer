import { useState } from 'react';
import Analyzer from './components/Analyzer.jsx';
import BuyInTracker from './components/BuyInTracker.jsx';
import HandLog from './components/HandLog.jsx';
import Reports from './components/Reports.jsx';
import Auth from './components/Auth.jsx';
import { DataProvider, useData } from './data/store.jsx';

const TABS = [
  { key: 'analyze', label: 'Analyze', icon: '🎯' },
  { key: 'session', label: 'Live Session', icon: '💰' },
  { key: 'reports', label: 'Reports', icon: '📊' },
  { key: 'log', label: 'Hand Log', icon: '📓' },
];

export default function App() {
  return (
    <DataProvider>
      <AppInner />
    </DataProvider>
  );
}

function AppInner() {
  const [tab, setTab] = useState('analyze');
  const { status, saveHand, hands, updateHand, removeHand } = useData();

  if (status === 'loading') {
    return (
      <div className="min-h-full flex items-center justify-center text-white/50">
        <div className="animate-pulse">Loading…</div>
      </div>
    );
  }

  if (status === 'signed_out') {
    return <Auth />;
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-30 bg-felt-900/95 backdrop-blur border-b border-white/10">
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
          <h1 className="text-lg font-black tracking-tight">♠ Poker Assistant</h1>
          <AccountBadge />
        </div>
      </header>

      <ImportBanner />
      <ErrorBanner />

      <main className="flex-1">
        {tab === 'analyze' && (
          <Analyzer
            onSaveHand={(h) => {
              saveHand(h);
              setTab('log');
            }}
          />
        )}
        {tab === 'session' && <BuyInTracker />}
        {tab === 'reports' && <Reports />}
        {tab === 'log' && <HandLog hands={hands} onUpdate={updateHand} onRemove={removeHand} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-felt-900/95 backdrop-blur border-t border-white/10 safe-bottom">
        <div className="max-w-md mx-auto grid grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-2.5 flex flex-col items-center gap-0.5 active:scale-95 transition ${
                tab === t.key ? 'text-emerald-400' : 'text-white/50'
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              <span className="text-[11px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function AccountBadge() {
  const { status, user, configured, signOut, enableSync } = useData();
  if (status === 'supabase' && user) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-emerald-400" title="Synced">
          ☁︎ synced
        </span>
        <button onClick={signOut} className="text-white/50 active:text-white underline underline-offset-2">
          Sign out
        </button>
      </div>
    );
  }
  // local mode
  if (configured) {
    return (
      <button
        onClick={enableSync}
        className="text-xs rounded-lg bg-emerald-500/90 text-felt-900 font-semibold px-2.5 py-1 active:scale-95"
      >
        Sync across devices
      </button>
    );
  }
  return <span className="text-xs text-white/40">this device</span>;
}

function ImportBanner() {
  const { importInfo, clearImportInfo } = useData();
  if (!importInfo || (!importInfo.sessions && !importInfo.hands)) return null;
  return (
    <div className="bg-emerald-500/15 border-b border-emerald-400/30">
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between text-sm">
        <span>
          Imported {importInfo.sessions} session{importInfo.sessions === 1 ? '' : 's'} and{' '}
          {importInfo.hands} hand{importInfo.hands === 1 ? '' : 's'} from this device into your
          account.
        </span>
        <button onClick={clearImportInfo} className="text-white/60 active:text-white ml-3">
          ✕
        </button>
      </div>
    </div>
  );
}

function ErrorBanner() {
  const { error, clearError } = useData();
  if (!error) return null;
  return (
    <div className="bg-rose-500/15 border-b border-rose-400/30">
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between text-sm">
        <span className="text-rose-200">{error}</span>
        <button onClick={clearError} className="text-white/60 active:text-white ml-3">
          ✕
        </button>
      </div>
    </div>
  );
}
