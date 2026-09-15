// Supabase-backed repository, scoped to one authenticated user (owner).
// Rows are keyed by the app's own string ids; `owner` = auth.uid() and is
// enforced by Row Level Security (see SUPABASE_SETUP.md).
import {
  sessionToRow,
  rowToSession,
  handToRow,
  rowToHand,
} from './mappers.js';

export function createSupabaseRepo(supabase, userId) {
  return {
    mode: 'supabase',
    userId,

    async loadSessions() {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(rowToSession);
    },

    async loadHands() {
      const { data, error } = await supabase
        .from('hands')
        .select('*')
        .order('saved_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(rowToHand);
    },

    async upsertSession(session) {
      const { error } = await supabase
        .from('sessions')
        .upsert(sessionToRow(session, userId));
      if (error) throw error;
    },

    async deleteSession(id) {
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) throw error;
    },

    async upsertHand(hand) {
      const { error } = await supabase.from('hands').upsert(handToRow(hand, userId));
      if (error) throw error;
    },

    async deleteHand(id) {
      const { error } = await supabase.from('hands').delete().eq('id', id);
      if (error) throw error;
    },

    // Realtime: notify on any change to this user's rows (other devices/tabs).
    subscribe(onChange) {
      const channel = supabase
        .channel('pa_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sessions', filter: `owner=eq.${userId}` },
          () => onChange('sessions')
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'hands', filter: `owner=eq.${userId}` },
          () => onChange('hands')
        )
        .subscribe();
      return () => {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          /* ignore */
        }
      };
    },
  };
}
