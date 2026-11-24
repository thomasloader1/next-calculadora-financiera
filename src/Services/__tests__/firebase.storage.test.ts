import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MonthBudget } from '@/interfaces/Expense';

// --- In-memory localStorage + window for the node test environment ---
function installLocalStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
  (globalThis as any).localStorage = ls;
  (globalThis as any).window = globalThis;
  return store;
}

// --- Firestore mock: one in-memory collection ---
const firestoreDocs = new Map<string, Record<string, any>>();
const authState: { currentUser: { uid: string } | null } = { currentUser: null };

function deepMerge(target: any, src: any): any {
  const out = { ...(target || {}) };
  for (const [k, v] of Object.entries(src)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(out[k], v) : v;
  }
  return out;
}

vi.mock('firebase/app', () => ({
  initializeApp: () => ({}),
  getApps: () => [],
}));
vi.mock('firebase/auth', () => ({
  getAuth: () => authState,
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  doc: (_db: unknown, _col: string, id: string) => ({ id }),
  getDoc: async (ref: { id: string }) => ({
    exists: () => firestoreDocs.has(ref.id),
    data: () => firestoreDocs.get(ref.id),
  }),
  setDoc: async (ref: { id: string }, data: Record<string, any>, opts?: { merge?: boolean }) => {
    const { updatedAt, ...rest } = data;
    firestoreDocs.set(ref.id, opts?.merge ? deepMerge(firestoreDocs.get(ref.id), rest) : rest);
  },
  serverTimestamp: () => 'ts',
}));

function makeMonth(description: string): MonthBudget {
  return {
    schemaVersion: 2,
    totalAmount: 1000,
    cash: { needs: 500, wants: 300, savings: 200, totalIncome: 1000, split: { needs: 50, wants: 30, savings: 20 } },
    needs: [{ id: 'n1', description, amount: 100 }],
    wants: [],
    savings: [],
    incomes: [],
    transfers: [],
  };
}

async function loadModule({ withFirebase }: { withFirebase: boolean }) {
  vi.resetModules();
  if (withFirebase) vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'test-key');
  else vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', '');
  const mod = await import('../firebase');
  await mod.getFirebaseAuthAsync(); // initializes auth when configured
  return mod;
}

describe('firebase storage layer', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installLocalStorage();
    firestoreDocs.clear();
    authState.currentUser = null;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('without session (local mode)', () => {
    it('saves months only to localStorage, never to Firestore', async () => {
      const fb = await loadModule({ withFirebase: true });
      await fb.saveMonthBudget('anon-1', '2026-11', makeMonth('Alquiler'));

      expect(firestoreDocs.size).toBe(0);
      expect(JSON.parse(store.get('calc:anon-1:doc')!).months['2026-11'].needs[0].description).toBe('Alquiler');
    });

    it('saves and loads the profile locally instead of hitting Firestore (no permission-denied)', async () => {
      const fb = await loadModule({ withFirebase: true });
      await fb.saveUserProfile('anon-1', { birthDate: '1990-01-01' } as any);

      expect(firestoreDocs.size).toBe(0);
      const profile = await fb.loadUserProfile('anon-1');
      expect((profile as any).birthDate).toBe('1990-01-01');
    });

    it('reports Firebase as not configured when env vars are missing', async () => {
      const fb = await loadModule({ withFirebase: false });
      expect(fb.isFirebaseConfigured()).toBe(false);
    });
  });

  describe('with Google session', () => {
    it('saves months to localStorage cache and Firestore', async () => {
      const fb = await loadModule({ withFirebase: true });
      authState.currentUser = { uid: 'g-1' };

      await fb.saveMonthBudget('g-1', '2026-11', makeMonth('Luz'));

      expect(firestoreDocs.get('g-1')!.months['2026-11'].needs[0].description).toBe('Luz');
      expect(store.has('calc:g-1:doc')).toBe(true);
    });

    it('getAllMonths reads every month from Firestore', async () => {
      const fb = await loadModule({ withFirebase: true });
      authState.currentUser = { uid: 'g-1' };
      firestoreDocs.set('g-1', { months: { '2026-10': makeMonth('A'), '2026-11': makeMonth('B') } });

      const months = await fb.getAllMonths('g-1');
      expect(Object.keys(months).sort()).toEqual(['2026-10', '2026-11']);
    });
  });

  describe('migrateAnonymousDataToUser', () => {
    it('copies only months the account does not have and never overwrites cloud data', async () => {
      const fb = await loadModule({ withFirebase: true });
      store.set('calc:anon-uid', 'anon-1');
      store.set('calc:anon-1:doc', JSON.stringify({
        months: { '2026-10': makeMonth('anon-oct'), '2026-11': makeMonth('anon-nov') },
      }));
      firestoreDocs.set('g-1', { months: { '2026-11': makeMonth('cloud-nov') } });
      authState.currentUser = { uid: 'g-1' };

      const migrated = await fb.migrateAnonymousDataToUser('g-1');

      expect(migrated).toBe(1);
      const months = firestoreDocs.get('g-1')!.months;
      expect(months['2026-10'].needs[0].description).toBe('anon-oct');
      expect(months['2026-11'].needs[0].description).toBe('cloud-nov');
      expect(store.has('calc:anon-1:doc')).toBe(false);
    });

    it('local fallback (no Firebase) does not overwrite existing target months', async () => {
      const fb = await loadModule({ withFirebase: false });
      store.set('calc:anon-uid', 'anon-1');
      store.set('calc:anon-1:doc', JSON.stringify({ months: { '2026-11': makeMonth('anon') } }));
      store.set('calc:g-1:doc', JSON.stringify({ months: { '2026-11': makeMonth('existing') } }));

      const migrated = await fb.migrateAnonymousDataToUser('g-1');

      expect(migrated).toBe(0);
      expect(JSON.parse(store.get('calc:g-1:doc')!).months['2026-11'].needs[0].description).toBe('existing');
    });
  });

  describe('restoreMonths', () => {
    it('restores missing months and skips existing ones', async () => {
      const fb = await loadModule({ withFirebase: false });
      store.set('calc:anon-1:doc', JSON.stringify({ months: { '2026-11': makeMonth('existing') } }));

      const result = await fb.restoreMonths('anon-1', {
        '2026-10': makeMonth('backup-oct'),
        '2026-11': makeMonth('backup-nov'),
      });

      expect(result).toEqual({ restored: ['2026-10'], skipped: ['2026-11'] });
      const months = JSON.parse(store.get('calc:anon-1:doc')!).months;
      expect(months['2026-10'].needs[0].description).toBe('backup-oct');
      expect(months['2026-11'].needs[0].description).toBe('existing');
    });
  });

  describe('clearLocalCache', () => {
    it('removes the account cache on logout', async () => {
      const fb = await loadModule({ withFirebase: false });
      store.set('calc:g-1:doc', '{}');
      fb.clearLocalCache('g-1');
      expect(store.has('calc:g-1:doc')).toBe(false);
    });
  });
});
