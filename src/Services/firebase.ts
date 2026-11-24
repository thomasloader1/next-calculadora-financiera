import { MonthBudget } from '@/interfaces/Expense';
import { UserProfile } from '@/interfaces/UserProfile';
import { CashState } from '@/interfaces/Cash';
import { Income } from '@/interfaces/Income';
import { Transfer } from '@/interfaces/Transfer';

const DEFAULT_SPLIT = { needs: 50, wants: 30, savings: 20 } as const;
const COLLECTION = 'financeCalculator';

type MonthMap = Record<string, MonthBudget>;

interface UserDoc {
  email?: string;
  displayName?: string;
  photoURL?: string;
  birthDate?: string;
  createdAt?: any;
  updatedAt?: any;
  months?: MonthMap;
}

function migrateCash(cash: Record<string, unknown> | undefined): CashState {
  if (!cash) {
    return { needs: 0, wants: 0, savings: 0, totalIncome: 0, split: { ...DEFAULT_SPLIT } };
  }
  const needs = Number(cash.needs) || 0;
  const wants = Number(cash.wants) || 0;
  const savings = Number(cash.savings) || 0;
  return {
    needs,
    wants,
    savings,
    totalIncome: Number(cash.totalIncome) || (needs + wants + savings),
    split: cash.split
      ? { ...DEFAULT_SPLIT, ...(cash.split as Record<string, number>) }
      : { ...DEFAULT_SPLIT },
  };
}

function migrateV1ToV2(doc: Record<string, unknown>): MonthBudget {
  const totalAmount = Number(doc.totalAmount) || 0;
  const cash = migrateCash(doc.cash as Record<string, unknown> | undefined);

  const existingIncomes = Array.isArray(doc.incomes) ? doc.incomes : [];
  const incomes: Income[] = existingIncomes.length > 0
    ? (existingIncomes as Income[])
    : [{
        id: 'migrated-income',
        description: 'Ingreso principal',
        amount: totalAmount,
        currency: 'ARS' as const,
      }];

  return {
    schemaVersion: 2,
    totalAmount,
    cash,
    needs: Array.isArray(doc.needs) ? doc.needs : [],
    wants: Array.isArray(doc.wants) ? doc.wants : [],
    savings: Array.isArray(doc.savings) ? doc.savings : [],
    incomes,
    transfers: Array.isArray(doc.transfers) ? (doc.transfers as Transfer[]) : [],
    globalSplit: doc.globalSplit
      ? { ...DEFAULT_SPLIT, ...(doc.globalSplit as Record<string, number>) }
      : { ...DEFAULT_SPLIT },
    updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : undefined,
  };
}

// --- Firebase config ---
const FIREBASE_CONFIG = (() => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
})();

// --- Lazy Firebase init with ESM ---
let firebaseApp: any = null;
let firebaseDb: any = null;
let firebaseAuth: any = null;
let firebasePromise: Promise<boolean> | null = null;

async function initFirebase(): Promise<boolean> {
  if (firebaseApp) return true;
  if (!FIREBASE_CONFIG) return false;
  if (firebasePromise) return firebasePromise;
  
  firebasePromise = (async () => {
    try {
      const { initializeApp, getApps } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');
      
      firebaseApp = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
      firebaseAuth = getAuth(firebaseApp);
      return true;
    } catch (e) {
      console.warn('Firebase init error:', e);
      return false;
    }
  })();
  
  return firebasePromise;
}

async function initFirestore(): Promise<boolean> {
  if (firebaseDb) return true;
  const ok = await initFirebase();
  if (!ok) return false;
  
  try {
    const { getFirestore } = await import('firebase/firestore');
    firebaseDb = getFirestore(firebaseApp);
    return true;
  } catch (e) {
    console.warn('Firestore init error:', e);
    return false;
  }
}

// --- Local uid ---
function getLocalUid(): string {
  if (typeof window === 'undefined') return 'server_uid';
  const KEY = 'calc:anon-uid';
  let uid = localStorage.getItem(KEY);
  if (!uid) {
    uid = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : 'anon_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    localStorage.setItem(KEY, uid);
  }
  return uid;
}

// --- Exported API ---

/** Returns the Firebase Auth instance or null if not available */
export async function getFirebaseAuthAsync(): Promise<any | null> {
  const ok = await initFirebase();
  return ok ? firebaseAuth : null;
}

/** Returns current user ID: Google uid if logged in, otherwise local anonymous uid */
export function getCurrentUserId(): string {
  return (globalThis as any).__firebaseUserUid || getLocalUid();
}

/** Store the current Firebase user uid so getCurrentUserId() returns it */
export function setFirebaseUserUid(uid: string | null): void {
  (globalThis as any).__firebaseUserUid = uid;
}

/** True when Firebase env vars are present (Google login can be offered). */
export function isFirebaseConfigured(): boolean {
  return FIREBASE_CONFIG !== null;
}

/** Returns true if Firebase (Cloud) is available and initialized */
export async function isFirebaseAvailable(): Promise<boolean> {
  return initFirebase();
}

// --- Storage helpers ---

function lsDocKey(uid: string) {
  return `calc:${uid}:doc`;
}

function readDoc(uid: string): UserDoc {
  try {
    return JSON.parse(localStorage.getItem(lsDocKey(uid)) || '{}');
  } catch {
    return {};
  }
}

function writeDoc(uid: string, doc: UserDoc): void {
  localStorage.setItem(lsDocKey(uid), JSON.stringify(doc));
}

/** Removes undefined values recursively for Firestore compat */
function stripUndefined(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      result[k] = stripUndefined(v);
    }
  }
  return result;
}

// --- Read/Write user doc from Firestore ---

async function getFirestoreDoc(uid: string): Promise<UserDoc | null> {
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(firebaseDb, COLLECTION, uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

async function setFirestoreDoc(uid: string, data: Partial<UserDoc>, merge = true): Promise<void> {
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  await setDoc(
    doc(firebaseDb, COLLECTION, uid),
    stripUndefined({ ...data, updatedAt: serverTimestamp() }),
    { merge }
  );
}

function isAuthUser(uid: string): boolean {
  return !!firebaseAuth?.currentUser && firebaseAuth.currentUser.uid === uid;
}

// --- Budget operations (stored in doc.months) ---

export const saveMonthBudget = async (uid: string, month: string, data: MonthBudget) => {
  // Always update localStorage for fast cache & offline support
  const doc = readDoc(uid);
  doc.months = doc.months || {};
  doc.months[month] = data as any;
  writeDoc(uid, doc);

  // If authenticated with Firebase, also persist to Firestore
  if (isAuthUser(uid)) {
    const fbOk = await initFirestore();
    if (fbOk) {
      try {
        await setFirestoreDoc(uid, {
          months: { [month]: { ...stripUndefined(data), schemaVersion: 2 } },
        });
      } catch (err) {
        console.warn('Error saving to Firestore, local copy preserved:', err);
      }
    }
  }
};

export const loadMonthBudget = async (uid: string, month: string): Promise<MonthBudget | null> => {
  // If authenticated, attempt to fetch from Firestore first
  if (isAuthUser(uid)) {
    const fbOk = await initFirestore();
    if (fbOk) {
      try {
        const userDoc = await getFirestoreDoc(uid);
        const raw = userDoc?.months?.[month];
        if (raw) {
          const version = (raw as any).schemaVersion;
          const budget = (!version || version < 2)
            ? migrateV1ToV2(raw as unknown as Record<string, unknown>)
            : (raw as MonthBudget);
          
          // Sync back to local cache
          const localDoc = readDoc(uid);
          localDoc.months = localDoc.months || {};
          localDoc.months[month] = budget as any;
          writeDoc(uid, localDoc);

          return budget;
        }
      } catch (err) {
        console.warn('Error loading from Firestore, falling back to localStorage:', err);
      }
    }
  }

  // Fallback / unauthenticated (deslogeado) mode: read from localStorage
  const doc = readDoc(uid);
  return (doc.months?.[month] as MonthBudget) || null;
};

export const getUserMonths = async (uid: string): Promise<string[]> => {
  // If authenticated, attempt to fetch from Firestore
  if (isAuthUser(uid)) {
    const fbOk = await initFirestore();
    if (fbOk) {
      try {
        const userDoc = await getFirestoreDoc(uid);
        if (userDoc?.months) {
          return Object.keys(userDoc.months).sort().reverse();
        }
      } catch (err) {
        console.warn('Error getting months from Firestore, falling back to localStorage:', err);
      }
    }
  }

  // Local fallback
  const doc = readDoc(uid);
  return Object.keys(doc.months || {}).sort().reverse();
};

/**
 * Migrates data entered anonymously into the authenticated Google account.
 */
export const migrateAnonymousDataToUser = async (targetUid: string): Promise<number> => {
  if (typeof window === 'undefined') return 0;
  const anonUid = localStorage.getItem('calc:anon-uid');
  if (!anonUid || anonUid === targetUid) return 0;

  const anonDoc = readDoc(anonUid);
  const anonMonths = anonDoc.months || {};
  const monthKeys = Object.keys(anonMonths);

  if (monthKeys.length === 0) return 0;

  const fbOk = await initFirestore();
  if (fbOk) {
    try {
      const existingDoc = await getFirestoreDoc(targetUid);
      const existingMonths = existingDoc?.months || {};

      const mergedMonths = { ...existingMonths };
      let migratedCount = 0;

      for (const m of monthKeys) {
        // If user doesn't have this month or it's empty, copy anonymous data
        if (!mergedMonths[m] || Object.keys(mergedMonths[m]).length === 0) {
          mergedMonths[m] = anonMonths[m];
          migratedCount++;
        }
      }

      if (migratedCount > 0) {
        await setFirestoreDoc(targetUid, { months: stripUndefined(mergedMonths) });
        // Update local cache for target user
        const targetLocalDoc = readDoc(targetUid);
        targetLocalDoc.months = { ...(targetLocalDoc.months || {}), ...mergedMonths };
        writeDoc(targetUid, targetLocalDoc);
      }

      // Remove anon doc now that it's migrated
      localStorage.removeItem(lsDocKey(anonUid));
      return migratedCount;
    } catch (err) {
      // Keep the anonymous data so the migration can be retried on the next login
      console.warn('Failed to migrate anonymous data to Firestore:', err);
      return 0;
    }
  }

  // Local-only migration fallback (never overwrite months the target already has)
  const targetLocalDoc = readDoc(targetUid);
  const targetMonths = { ...(targetLocalDoc.months || {}) };
  let migratedCount = 0;
  for (const m of monthKeys) {
    if (!targetMonths[m] || Object.keys(targetMonths[m]).length === 0) {
      targetMonths[m] = anonMonths[m];
      migratedCount++;
    }
  }
  targetLocalDoc.months = targetMonths;
  writeDoc(targetUid, targetLocalDoc);
  localStorage.removeItem(lsDocKey(anonUid));
  return migratedCount;
};

// --- User profile (stored in doc root) ---

export const saveUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  if (isAuthUser(uid) && await initFirestore()) {
    await setFirestoreDoc(uid, data as any);
    return;
  }
  const doc = readDoc(uid);
  Object.assign(doc, data);
  writeDoc(uid, doc);
};

export const loadUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (isAuthUser(uid) && await initFirestore()) {
    const userDoc = await getFirestoreDoc(uid);
    if (!userDoc) return null;
    const { months, ...profile } = userDoc;
    return profile as UserProfile;
  }
  const doc = readDoc(uid);
  const { months, ...profile } = doc;
  return Object.keys(profile).length > 0 ? (profile as UserProfile) : null;
};

/** Removes the local cache of an account (called on logout so data doesn't linger on shared devices). */
export function clearLocalCache(uid: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(lsDocKey(uid));
}

/** Returns every stored month for a uid (Firestore when authenticated, localStorage otherwise). */
export const getAllMonths = async (uid: string): Promise<Record<string, MonthBudget>> => {
  if (isAuthUser(uid) && await initFirestore()) {
    try {
      const userDoc = await getFirestoreDoc(uid);
      if (userDoc?.months) return userDoc.months;
    } catch (err) {
      console.warn('Error reading months from Firestore, falling back to localStorage:', err);
    }
  }
  return readDoc(uid).months || {};
};

/**
 * Restores months from a backup. Only months the user doesn't already have are written
 * (existing data is never overwritten). Returns which months were restored / skipped.
 */
export const restoreMonths = async (
  uid: string,
  months: Record<string, MonthBudget>
): Promise<{ restored: string[]; skipped: string[] }> => {
  const existing = await getAllMonths(uid);
  const restored: string[] = [];
  const skipped: string[] = [];
  for (const [month, data] of Object.entries(months)) {
    if (existing[month] && Object.keys(existing[month]).length > 0) {
      skipped.push(month);
      continue;
    }
    await saveMonthBudget(uid, month, data);
    restored.push(month);
  }
  return { restored, skipped };
};

export const ensureUserDocument = async (
  uid: string,
  profile: { email: string | null; displayName: string | null; photoURL: string | null }
) => {
  const fbOk = await initFirestore();
  if (fbOk) {
    const existing = await getFirestoreDoc(uid);
    if (!existing) {
      const { serverTimestamp } = await import('firebase/firestore');
      await setFirestoreDoc(uid, {
        email: profile.email || '',
        displayName: profile.displayName || '',
        photoURL: profile.photoURL || '',
        months: {},
        createdAt: serverTimestamp(),
      }, false);
    } else {
      await setFirestoreDoc(uid, {
        email: profile.email || '',
        displayName: profile.displayName || '',
        photoURL: profile.photoURL || '',
      });
    }
    return;
  }
  const doc = readDoc(uid);
  if (!doc.email && !doc.displayName) {
    doc.email = profile.email || '';
    doc.displayName = profile.displayName || '';
    doc.photoURL = profile.photoURL || '';
    doc.months = doc.months || {};
    doc.createdAt = new Date().toISOString();
    writeDoc(uid, doc);
  }
};

export const computeBalance = (cash: CashState | null, needs: MonthBudget['needs'], wants: MonthBudget['wants'], savings: MonthBudget['savings']): number => {
  const totalIncome = cash?.totalIncome ?? 0;
  const totalExpenses = [...needs, ...wants, ...savings].reduce((sum, e) => sum + e.amount, 0);
  return totalIncome - totalExpenses;
};

/** For backward compatibility — returns null, use getFirebaseAuthAsync() instead */
export const getFirebaseAuth = () => null;
