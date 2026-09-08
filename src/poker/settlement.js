// Debt-simplification settlement.
//
// Given each player's net result (positive = is owed money, negative = owes),
// produce a minimal set of payments. This is a greedy largest-debtor /
// largest-creditor match — the standard approach used by settle-up apps. It is
// not naive pairwise settling and produces at most (players - 1) payments,
// which is optimal in the common case.

// balances: [{ id, name, net }]  (net in currency units; sum should be ~0)
export function settle(balances, epsilon = 0.005) {
  const creditors = [];
  const debtors = [];
  for (const b of balances) {
    if (b.net > epsilon) creditors.push({ ...b, remaining: b.net });
    else if (b.net < -epsilon) debtors.push({ ...b, remaining: -b.net });
  }
  // Sort descending by remaining so we always match the biggest first.
  creditors.sort((a, b) => b.remaining - a.remaining);
  debtors.sort((a, b) => b.remaining - a.remaining);

  const payments = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = Math.min(c.remaining, d.remaining);
    if (amount > epsilon) {
      payments.push({
        from: d.name,
        fromId: d.id,
        to: c.name,
        toId: c.id,
        amount: Math.round(amount * 100) / 100,
      });
    }
    c.remaining -= amount;
    d.remaining -= amount;
    if (c.remaining <= epsilon) ci++;
    if (d.remaining <= epsilon) di++;
  }
  return payments;
}

// Compute net per player from a session's ledger entries.
// player: { id, name, buyIns: [amounts], cashOut: number|null }
export function computeBalances(players) {
  return players.map((p) => {
    const totalIn = (p.buyIns || []).reduce((s, x) => s + x, 0);
    const out = p.cashOut == null ? 0 : p.cashOut;
    return {
      id: p.id,
      name: p.name,
      buyInTotal: totalIn,
      cashOut: out,
      net: out - totalIn,
    };
  });
}
