'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { getFirebaseAuthAsync, getCurrentUserId, setFirebaseUserUid, ensureUserDocument } from '@/Services/firebase';

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
        const { onAuthStateChanged } = await import('firebase/auth');

        unsubscribe = onAuthStateChanged(auth, (fbUser: any) => {
          if (fbUser) {
            const localUser: User = {
              uid: fbUser.uid,
              displayName: fbUser.displayName,
              email: fbUser.email,
              photoURL: fbUser.photoURL,
              isAnonymous: fbUser.isAnonymous || false,
            };
            setUser(localUser);
            setFirebaseUserUid(fbUser.uid);
            // Create/update user document in financeCalculator
            ensureUserDocument(fbUser.uid, {
              email: fbUser.email,
              displayName: fbUser.displayName,
              photoURL: fbUser.photoURL,
            }).catch((err: any) => console.warn('Error ensuring user doc:', err));
          } else {
            // No Firebase user — use local anonymous
            setUser(getLocalUser());
            setFirebaseUserUid(null);
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
    if (!auth) return;

    try {
      const { signInWithPopup, signInWithRedirect, GoogleAuthProvider } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();

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
      console.error("Error al autenticar con Google:", error);
      // App still works with local user — no need to alert the user
    }
  };

  const logout = async () => {
    const auth = await getFirebaseAuthAsync();
    if (!auth) return;

    try {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
      // After sign out, user falls back to local anonymous
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
