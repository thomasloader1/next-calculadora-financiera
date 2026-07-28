import { MonthBudget } from '@/interfaces/Expense';
import { UserProfile } from '@/interfaces/UserProfile';
import { CashState } from '@/interfaces/Cash';
import { Income } from '@/interfaces/Income';
import { Transfer } from '@/interfaces/Transfer';

const DEFAULT_SPLIT = { needs: 50, wants: 30, savings: 20 } as const;

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

// --- Firebase (optional) ---
let firebaseApp: any = null;
let firebaseDb: any = null;
let firebaseEnabled = false;

function getFirebase() {
  if (firebaseEnabled) return { app: firebaseApp, db: firebaseDb };
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;
  try {
    // Dynamic imports to avoid crashing when Firebase isn't configured
    const { initializeApp } = require('firebase/app');
    const { getFirestore } = require('firebase/firestore');
    const config = {
      apiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    firebaseApp = initializeApp(config);
    firebaseDb = getFirestore(firebaseApp);
    firebaseEnabled = true;
    return { app: firebaseApp, db: firebaseDb };
  } catch (e) {
    console.warn('Firebase not available, using localStorage fallback');
    return null;
  }
}

// --- localStorage fallback ---
function lsKey(uid: string, month: string) {
  return `calc:${uid}:${month}`;
}

function lsMonthsKey(uid: string) {
  return `calc:${uid}:months`;
}

// --- Exported API (Firebase or localStorage) ---

export const saveMonthBudget = async (uid: string, month: string, data: MonthBudget) => {
  const fb = getFirebase();
  if (fb) {
    const { doc, setDoc, serverTimestamp } = require('firebase/firestore');
    await setDoc(doc(fb.db, 'users', uid, 'months', month), {
      ...data,
      schemaVersion: 2,
      updatedAt: serverTimestamp()
    });
    return;
  }
  // localStorage fallback
  localStorage.setItem(lsKey(uid, month), JSON.stringify(data));
  const months = JSON.parse(localStorage.getItem(lsMonthsKey(uid)) || '[]');
  if (!months.includes(month)) {
    months.push(month);
    localStorage.setItem(lsMonthsKey(uid), JSON.stringify(months.sort().reverse()));
  }
};

export const loadMonthBudget = async (uid: string, month: string): Promise<MonthBudget | null> => {
  const fb = getFirebase();
  if (fb) {
    const { doc, getDoc } = require('firebase/firestore');
    const snap = await getDoc(doc(fb.db, 'users', uid, 'months', month));
    if (!snap.exists()) return null;
    const raw = snap.data();
    const version = raw.schemaVersion;
    if (!version || version < 2) {
      return migrateV1ToV2(raw as Record<string, unknown>);
    }
    return raw as MonthBudget;
  }
  // localStorage fallback
  const raw = localStorage.getItem(lsKey(uid, month));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MonthBudget;
  } catch {
    return null;
  }
};

export const getUserMonths = async (uid: string): Promise<string[]> => {
  const fb = getFirebase();
  if (fb) {
    const { collection, getDocs } = require('firebase/firestore');
    const snap = await getDocs(collection(fb.db, 'users', uid, 'months'));
    return snap.docs.map((d: any) => d.id).sort().reverse();
  }
  // localStorage fallback
  const months = JSON.parse(localStorage.getItem(lsMonthsKey(uid)) || '[]');
  return months.sort().reverse();
};

export const saveUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  const fb = getFirebase();
  if (fb) {
    const { doc, setDoc } = require('firebase/firestore');
    await setDoc(doc(fb.db, 'users', uid), { ...data }, { merge: true });
    return;
  }
  localStorage.setItem(`calc:${uid}:profile`, JSON.stringify(data));
};

export const loadUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const fb = getFirebase();
  if (fb) {
    const { doc, getDoc } = require('firebase/firestore');
    const snap = await getDoc(doc(fb.db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  }
  const raw = localStorage.getItem(`calc:${uid}:profile`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
};

export const computeBalance = (cash: CashState | null, needs: MonthBudget['needs'], wants: MonthBudget['wants'], savings: MonthBudget['savings']): number => {
  const totalIncome = cash?.totalIncome ?? 0;
  const totalExpenses = [...needs, ...wants, ...savings].reduce((sum, e) => sum + e.amount, 0);
  return totalIncome - totalExpenses;
};

// Export for AuthContext — returns null if Firebase isn't available
export const getFirebaseAuth = () => {
  const fb = getFirebase();
  if (!fb) return null;
  try {
    const { getAuth } = require('firebase/auth');
    return getAuth(fb.app);
  } catch {
    return null;
  }
};
