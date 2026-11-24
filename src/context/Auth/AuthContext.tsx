'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { getFirebaseAuthAsync, getCurrentUserId, setFirebaseUserUid, ensureUserDocument, migrateAnonymousDataToUser, clearLocalCache, isFirebaseConfigured } from '@/Services/firebase';
import { getAuthErrorMessage } from './authErrors';
import { toast } from 'sonner';

type User = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** False when Firebase env vars are missing: only local mode is available */
  cloudAvailable: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/** Create a local anonymous user from localStorage uid */
function getLocalUser(): User {
  const uid = getCurrentUserId();
  return {
    uid,
    displayName: null,
    email: null,
    photoURL: null,
    isAnonymous: true,
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let unsubscribe: (() => void) | null = null;

    (async () => {
      const auth = await getFirebaseAuthAsync();

      if (!auth) {
        // No Firebase Auth — use local anonymous user
        setUser(getLocalUser());
        setLoading(false);
        return;
      }

      try {
        const { onAuthStateChanged, getRedirectResult, setPersistence, browserLocalPersistence } = await import('firebase/auth');

        await setPersistence(auth, browserLocalPersistence).catch((err: any) =>
          console.warn('Could not set auth persistence:', err));

        // Surface errors from a signInWithRedirect flow (mobile)
        getRedirectResult(auth).catch((err: any) => {
          const msg = getAuthErrorMessage(err?.code);
          if (msg) toast.error(msg);
        });

        unsubscribe = onAuthStateChanged(auth, async (fbUser: any) => {
          if (fbUser) {
            setFirebaseUserUid(fbUser.uid);
            // Sequential on purpose: the user doc must exist before merging anonymous
            // months into it, and both must finish before ExpenseContext loads this uid.
            try {
              await ensureUserDocument(fbUser.uid, {
                email: fbUser.email,
                displayName: fbUser.displayName,
                photoURL: fbUser.photoURL,
              });
            } catch (err) {
              console.warn('Error ensuring user doc:', err);
            }
            try {
              const migrated = await migrateAnonymousDataToUser(fbUser.uid);
              if (migrated > 0) {
                toast.success(`Se sincronizaron ${migrated} mes(es) con tu cuenta de Google.`);
              }
            } catch (err) {
              console.warn('Error migrating anonymous data:', err);
            }
            setUser({
              uid: fbUser.uid,
              displayName: fbUser.displayName,
              email: fbUser.email,
              photoURL: fbUser.photoURL,
              isAnonymous: fbUser.isAnonymous || false,
            });
          } else {
            // No Firebase user — use local anonymous
            setFirebaseUserUid(null);
            setUser(getLocalUser());
          }
          setLoading(false);
        });
      } catch (err) {
        console.warn('Firebase Auth error:', err);
        setUser(getLocalUser());
        setLoading(false);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    const auth = await getFirebaseAuthAsync();
    if (!auth) {
      toast.error('El inicio de sesión con Google no está configurado.');
      return;
    }

    try {
      const { signInWithPopup, signInWithRedirect, GoogleAuthProvider } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      if (isMobile()) {
        await signInWithRedirect(auth, provider);
      } else {
        try {
          await signInWithPopup(auth, provider);
        } catch (popupError: any) {
          // Fallback to redirect if popup fails
          if (popupError?.code === 'auth/popup-blocked' || popupError?.code === 'auth/cancelled-popup-request') {
            await signInWithRedirect(auth, provider);
          } else {
            throw popupError;
          }
        }
      }
    } catch (error: any) {
      console.error('Error al autenticar con Google:', error);
      const msg = getAuthErrorMessage(error?.code);
      if (msg) toast.error(msg);
    }
  };

  const logout = async () => {
    const auth = await getFirebaseAuthAsync();
    if (!auth) return;

    try {
      const { signOut } = await import('firebase/auth');
      const uid = auth.currentUser?.uid as string | undefined;
      await signOut(auth);
      // Don't leave the account's cached data on this device
      if (uid) clearLocalCache(uid);
      toast.success('Sesión cerrada. Seguís en modo local.');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('No se pudo cerrar la sesión.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, cloudAvailable: isFirebaseConfigured(), loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
