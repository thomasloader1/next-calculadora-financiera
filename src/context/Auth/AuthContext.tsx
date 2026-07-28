'use client'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getFirebaseAuth } from '@/Services/firebase';

type User = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
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
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || ('ontouchstart' in window && window.innerWidth < 768);
}

// Convert Firebase User to our local User type
function toLocalUser(fbUser: any): User {
    return {
        uid: fbUser.uid,
        displayName: fbUser.displayName,
        email: fbUser.email,
        photoURL: fbUser.photoURL,
    };
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const auth = getFirebaseAuth();
        if (!auth) {
            // Firebase not configured — app works without auth
            setLoading(false);
            return;
        }

        // Dynamic import Firebase auth methods
        import('firebase/auth').then(({ onAuthStateChanged, getRedirectResult }) => {
            // Handle redirect result (from mobile signInWithRedirect)
            getRedirectResult(auth)
                .then((result) => {
                    if (result) {
                        console.log("Login exitoso via redirect:", result.user.displayName);
                    }
                })
                .catch((error) => {
                    console.error("Error en redirect result:", error);
                });

            const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
                setUser(fbUser ? toLocalUser(fbUser) : null);
                setLoading(false);
            });
            return () => unsubscribe();
        }).catch(() => setLoading(false));
    }, []);

    const loginWithGoogle = async () => {
        const auth = getFirebaseAuth();
        if (!auth) return;

        const { signInWithPopup, signInWithRedirect, GoogleAuthProvider } = await import('firebase/auth');
        const provider = new GoogleAuthProvider();

        try {
            if (isMobile()) {
                await signInWithRedirect(auth, provider);
            } else {
                await signInWithPopup(auth, provider);
            }
        } catch (error) {
            console.error("Error al autenticar con Google:", error);
            if (!isMobile()) {
                try {
                    await signInWithRedirect(auth, provider);
                } catch (redirectError) {
                    console.error("Error en redirect fallback:", redirectError);
                }
            }
        }
    };

    const logout = async () => {
        const auth = getFirebaseAuth();
        if (!auth) return;

        const { signOut } = await import('firebase/auth');
        try {
            await signOut(auth);
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
