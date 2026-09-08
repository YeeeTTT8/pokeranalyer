// Pot-odds and raise (fold-equity) math. All transparent — every number the
// UI shows comes from here so the reasoning can be displayed, not hidden.

// Required equity to call: you invest `call` to win the pot that already
// contains `pot` (plus your call). Break-even equity = call / (pot + call).
export function requiredEquityToCall(pot, call) {
  if (call <= 0) return 0;
  const denom = pot + call;
  if (denom <= 0) return 0;
  return (call / denom) * 100;
}

export function callDecision({ pot, call, equity }) {
  const required = requiredEquityToCall(pot, call);
  const profitable = equity >= required;
  // EV of calling (in chips), relative to folding (= 0):
  //   win prob * pot  -  lose prob * call
  const p = equity / 100;
  const ev = p * pot - (1 - p) * call;
  return { required, profitable, ev, margin: equity - required };
}

// Semi-bluff raise: hero risks `raise` chips as a bet/raise into a pot of
// `pot`. Villain either folds (hero wins `pot`) or calls `raise` (pot becomes
// pot + 2*raise, hero realizes `equity` of it).
//
// Break-even fold equity solves EV = 0:
//   EV = FE*pot + (1-FE)*(E*(pot+2*raise) - raise) = 0
//   => FE* = K / (K - pot),  where K = E*(pot+2*raise) - raise
//
// With E = 0 this reduces to the classic bluff break-even raise/(raise+pot).
export function raiseFoldEquity({ pot, raise, equity }) {
  const E = equity / 100;
  const K = E * (pot + 2 * raise) - raise;
  const denom = K - pot;
  let fe;
  if (denom === 0) fe = 0;
  else fe = (K / denom) * 100;
  fe = Math.max(0, Math.min(100, fe));

  const pureBluffFe = raise + pot > 0 ? (raise / (raise + pot)) * 100 : 0;
  return { foldEquityNeeded: fe, pureBluffFe };
}
