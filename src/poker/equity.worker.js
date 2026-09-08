// Runs Monte Carlo equity off the main thread so the UI never freezes.
import { computeEquity } from './equity.js';

self.onmessage = (e) => {
  const { id, payload } = e.data;
  try {
    const result = computeEquity(payload);
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message ? err.message : err) });
  }
};
