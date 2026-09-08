import { useEffect, useMemo, useRef, useState } from 'react';

// Debounced equity calculation via a Web Worker. Returns { result, computing }.
export function useEquity(payload, { debounce = 180, enabled = true } = {}) {
  const workerRef = useRef(null);
  const reqId = useRef(0);
  const [result, setResult] = useState(null);
  const [computing, setComputing] = useState(false);

  // Stable stringified key so we only recompute when inputs actually change.
  const key = useMemo(() => JSON.stringify(payload), [payload]);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../poker/equity.worker.js', import.meta.url),
      { type: 'module' }
    );
    workerRef.current.onmessage = (e) => {
      const { id, result: r } = e.data;
      if (id === reqId.current) {
        setResult(r);
        setComputing(false);
      }
    };
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
      workerRef.current.postMessage({ id, payload });
    }, debounce);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, debounce]);

  return { result, computing };
}
