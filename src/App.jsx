import { useState } from 'react';
import Analyzer from './components/Analyzer.jsx';
import BuyInTracker from './components/BuyInTracker.jsx';
import HandLog from './components/HandLog.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';

const uid = () => Math.random().toString(36).slice(2, 10);

const TABS = [
  { key: 'analyze', label: 'Analyze', icon: '🎯' },
  { key: 'bank', label: 'Buy-ins', icon: '💰' },
  { key: 'log', label: 'Log', icon: '📓' },
];

export default function App() {
  const [tab, setTab] = useState('analyze');
  const [hands, setHands] = useLocalStorage('pa_hands', []);

  const saveHand = (h) => {
    setHands([{ id: uid(), savedAt: Date.now(), result: null, notes: '', ...h }, ...hands]);
    setTab('log');
  };
  const updateHand = (id, patch) =>
    setHands(hands.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  const removeHand = (id) => setHands(hands.filter((h) => h.id !== id));

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-30 bg-felt-900/95 backdrop-blur border-b border-white/10">
        <div className="max-w-md mx-auto px-4 py-3">
          <h1 className="text-lg font-black tracking-tight">
            ♠ Poker Assistant
          </h1>
        </div>
      </header>

      <main className="flex-1">
        {tab === 'analyze' && <Analyzer onSaveHand={saveHand} />}
        {tab === 'bank' && <BuyInTracker />}
        {tab === 'log' && <HandLog hands={hands} onUpdate={updateHand} onRemove={removeHand} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-felt-900/95 backdrop-blur border-t border-white/10 safe-bottom">
        <div className="max-w-md mx-auto grid grid-cols-3">
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
