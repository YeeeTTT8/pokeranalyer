import { useEffect, useMemo, useRef, useState } from 'react';
import { computeEquity } from '../poker/equity.js';

// A single-file build (e.g. the hosted page) can't ship a separate worker
// chunk, so allow forcing the synchronous main-thread path.
const NO_WORKER = import.meta.env.VITE_NO_WORKER === '1';

// Debounced equity calculation. Uses a Web Worker when available so the UI
// never freezes; falls back to a debounced main-thread computation otherwise.
export function useEquity(payload, { debounce = 180, enabled = true } = {}) {
  const workerRef = useRef(null);
  const reqId = useRef(0);
  const [result, setResult] = useState(null);
  const [computing, setComputing] = useState(false);

  // Stable stringified key so we only recompute when inputs actually change.
  const key = useMemo(() => JSON.stringify(payload), [payload]);

  useEffect(() => {
    if (NO_WORKER || typeof Worker === 'undefined') return undefined;
    try {
      const w = new Worker(new URL('../poker/equity.worker.js', import.meta.url), {
        type: 'module',
      });
      w.onmessage = (e) => {
        const { id, result: r } = e.data;
        if (id === reqId.current) {
          setResult(r);
          setComputing(false);
        }
      };
      workerRef.current = w;
    } catch (e) {
      workerRef.current = null; // fall back to main thread
    }
    return () => workerRef.current && workerRef.current.terminate();
  }, []);

  useEffect(() => {
    if (!enabled) {
      setResult(null);
      setComputing(false);
      return undefined;
    }
    setComputing(true);
    const t = setTimeout(() => {
      const id = ++reqId.current;
      if (workerRef.current) {
        workerRef.current.postMessage({ id, payload });
      } else {
        // Main-thread fallback: yield first so the "updating…" state paints.
        const r = computeEquity(payload);
        if (id === reqId.current) {
          setResult(r);
          setComputing(false);
        }
      }
    }, debounce);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, debounce]);

  return { result, computing };
}
