import { useCallback, useEffect, useRef, useState } from 'react';

// Persisted state backed by localStorage, resilient to unavailable storage
// (private mode, quota) and to bad JSON.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw);
    } catch (e) {
      /* ignore */
    }
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  });

  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch (e) {
      /* ignore quota / private mode */
    }
  }, [value]);

  const update = useCallback((v) => setValue(v), []);
  return [value, update];
}
