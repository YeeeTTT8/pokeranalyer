// Pure mappers between the app's data model and Supabase table rows.
// Kept dependency-free so they are trivially unit-testable.
//
// The data model is unchanged from the localStorage version:
//   Session { id, date, name, defaultBuyIn, players:[{id,name,buyIns:[],cashOut}], createdAt }
//   Hand    { id, savedAt, hero:[..], board:[..], equity, opponents, assumption, result, notes }

export function sessionToRow(s, owner) {
  return {
    id: s.id,
    owner,
    date: s.date ?? null,
    name: s.name ?? '',
    default_buy_in: s.defaultBuyIn ?? 0,
    players: s.players ?? [],
    created_at: s.createdAt ?? Date.now(),
  };
}

export function rowToSession(r) {
  return {
    id: r.id,
    date: r.date ?? '',
    name: r.name ?? '',
    defaultBuyIn: Number(r.default_buy_in ?? 0),
    players: Array.isArray(r.players) ? r.players : [],
    createdAt: Number(r.created_at ?? 0),
  };
}

export function handToRow(h, owner) {
  return {
    id: h.id,
    owner,
    hero: h.hero ?? [],
    board: h.board ?? [],
    equity: h.equity ?? null,
    opponents: h.opponents ?? null,
    assumption: h.assumption ?? null,
    result: h.result ?? null,
    notes: h.notes ?? '',
    saved_at: h.savedAt ?? Date.now(),
  };
}

export function rowToHand(r) {
  return {
    id: r.id,
    savedAt: Number(r.saved_at ?? 0),
    hero: Array.isArray(r.hero) ? r.hero : [],
    board: Array.isArray(r.board) ? r.board : [],
    equity: r.equity == null ? null : Number(r.equity),
    opponents: r.opponents == null ? null : Number(r.opponents),
    assumption: r.assumption ?? null,
    result: r.result ?? null,
    notes: r.notes ?? '',
  };
}
