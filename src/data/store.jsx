import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isSupabaseConfigured, LS_LOCAL_ONLY } from './config.js';
import { getSupabase } from './supabaseClient.js';
import { createLocalRepo } from './localRepo.js';
import { createSupabaseRepo } from './supabaseRepo.js';
import { autoImportLocal, importIntoRepo, serializeExport } from './migrate.js';

const uid = () => Math.random().toString(36).slice(2, 10);
const DataContext = createContext(null);

// status: 'loading' | 'local' | 'signed_out' | 'supabase'
export function DataProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [hands, setHands] = useState([]);
  const [error, setError] = useState(null);
  const [importInfo, setImportInfo] = useState(null); // {sessions,hands} last auto-import

  const repoRef = useRef(null);
  const realtimeCleanupRef = useRef(null);
  const sessionsRef = useRef([]);
  const handsRef = useRef([]);
  sessionsRef.current = sessions;
  handsRef.current = hands;

  const localOnly = () => {
    try {
      return window.localStorage.getItem(LS_LOCAL_ONLY) === '1';
    } catch (e) {
      return false;
    }
  };

  const loadAll = useCallback(async (repo) => {
    const [s, h] = await Promise.all([repo.loadSessions(), repo.loadHands()]);
    setSessions(s);
    setHands(h);
  }, []);

  const startLocal = useCallback(async () => {
    const repo = createLocalRepo();
    repoRef.current = repo;
    await loadAll(repo);
    setStatus('local');
  }, [loadAll]);

  const startSupabase = useCallback(
    async (supabase, authUser) => {
      const repo = createSupabaseRepo(supabase, authUser.id);
      repoRef.current = repo;
      try {
        const info = await autoImportLocal(repo, authUser.id);
        if (info && (info.sessions || info.hands)) setImportInfo(info);
      } catch (e) {
        // Import failure shouldn't block usage; surface it.
        setError('Could not import local data: ' + (e.message || e));
      }
      await loadAll(repo);
      setStatus('supabase');
      // Realtime: reload the changed collection when another device edits.
      if (realtimeCleanupRef.current) realtimeCleanupRef.current();
      realtimeCleanupRef.current = repo.subscribe(async (which) => {
        try {
          if (which === 'sessions') setSessions(await repo.loadSessions());
          else setHands(await repo.loadHands());
        } catch (e) {
          /* ignore transient */
        }
      });
    },
    [loadAll]
  );

  // Boot + auth wiring.
  useEffect(() => {
    let unsub = null;
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured() || localOnly()) {
        await startLocal();
        return;
      }
      let supabase;
      try {
        supabase = await getSupabase();
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        const authUser = data?.session?.user || null;
        setUser(authUser);
        if (authUser) await startSupabase(supabase, authUser);
        else setStatus('signed_out');
      } catch (e) {
        // Misconfigured/unreachable Supabase must not hang on "Loading".
        if (cancelled) return;
        setError('Could not reach the sync service. Using this device only. ' + (e.message || ''));
        await startLocal();
        return;
      }

      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        const u = session?.user || null;
        setUser(u);
        if (u && repoRef.current?.mode !== 'supabase') startSupabase(supabase, u);
        if (!u) {
          if (realtimeCleanupRef.current) {
            realtimeCleanupRef.current();
            realtimeCleanupRef.current = null;
          }
          repoRef.current = null;
          setSessions([]);
          setHands([]);
          if (!localOnly()) setStatus('signed_out');
        }
      });
      unsub = sub?.subscription?.unsubscribe;
    })();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [startLocal, startSupabase]);

  // ---- auth actions ----
  const signIn = useCallback(async (email) => {
    const supabase = await getSupabase();
    const redirect = window.location.origin + window.location.pathname;
    const { error: e } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect },
    });
    if (e) throw e;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
  }, []);

  const useDeviceOnly = useCallback(async () => {
    try {
      window.localStorage.setItem(LS_LOCAL_ONLY, '1');
    } catch (e) {
      /* ignore */
    }
    await startLocal();
  }, [startLocal]);

  const enableSync = useCallback(() => {
    try {
      window.localStorage.removeItem(LS_LOCAL_ONLY);
    } catch (e) {
      /* ignore */
    }
    setStatus('signed_out');
  }, []);

  // ---- persistence helper: optimistic state + repo op, resync on failure ----
  const persist = useCallback(async (op) => {
    try {
      await op();
    } catch (e) {
      setError(e.message || String(e));
      // Resync from source of truth.
      if (repoRef.current) {
        try {
          await loadAll(repoRef.current);
        } catch (_) {
          /* ignore */
        }
      }
    }
  }, [loadAll]);

  // ---- session mutators ----
  const createSession = useCallback(() => {
    const s = {
      id: uid(),
      date: new Date().toISOString().slice(0, 10),
      name: '',
      defaultBuyIn: 20,
      players: [],
      createdAt: Date.now(),
    };
    setSessions((prev) => [s, ...prev]);
    persist(() => repoRef.current.upsertSession(s));
    return s;
  }, [persist]);

  const updateSession = useCallback((id, patch) => {
    let updated = null;
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        updated = { ...s, ...patch };
        return updated;
      })
    );
    persist(() => repoRef.current.upsertSession(updated ?? { ...sessionsRef.current.find((s) => s.id === id), ...patch }));
  }, [persist]);

  const deleteSession = useCallback((id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    persist(() => repoRef.current.deleteSession(id));
  }, [persist]);

  // ---- hand mutators ----
  const saveHand = useCallback((h) => {
    const hand = { id: uid(), savedAt: Date.now(), result: null, notes: '', ...h };
    setHands((prev) => [hand, ...prev]);
    persist(() => repoRef.current.upsertHand(hand));
    return hand;
  }, [persist]);

  const updateHand = useCallback((id, patch) => {
    let updated = null;
    setHands((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        updated = { ...h, ...patch };
        return updated;
      })
    );
    persist(() => repoRef.current.upsertHand(updated ?? { ...handsRef.current.find((h) => h.id === id), ...patch }));
  }, [persist]);

  const removeHand = useCallback((id) => {
    setHands((prev) => prev.filter((h) => h.id !== id));
    persist(() => repoRef.current.deleteHand(id));
  }, [persist]);

  // ---- backup / restore ----
  const exportJSON = useCallback(
    () => serializeExport(sessionsRef.current, handsRef.current),
    []
  );

  const importJSON = useCallback(
    async (data, mode = 'skip') => {
      if (!repoRef.current) throw new Error('No storage ready.');
      const counts = await importIntoRepo(repoRef.current, data, { mode });
      await loadAll(repoRef.current);
      return counts;
    },
    [loadAll]
  );

  const value = useMemo(
    () => ({
      status,
      user,
      sessions,
      hands,
      error,
      importInfo,
      clearError: () => setError(null),
      clearImportInfo: () => setImportInfo(null),
      // auth
      signIn,
      signOut,
      useDeviceOnly,
      enableSync,
      configured: isSupabaseConfigured(),
      // mutators
      createSession,
      updateSession,
      deleteSession,
      saveHand,
      updateHand,
      removeHand,
      // backup
      exportJSON,
      importJSON,
    }),
    [
      status, user, sessions, hands, error, importInfo,
      signIn, signOut, useDeviceOnly, enableSync,
      createSession, updateSession, deleteSession,
      saveHand, updateHand, removeHand, exportJSON, importJSON,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
