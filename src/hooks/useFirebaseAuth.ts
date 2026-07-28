import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from '@/Services/firebase';

type AuthUser = { uid: string; displayName: string | null; email: string | null; photoURL: string | null } | null;

const useFirebaseAuth = (): AuthUser => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      router.push("/");
      return;
    }

    import("firebase/auth").then(({ onAuthStateChanged }) => {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        setUser(fbUser ? { uid: fbUser.uid, displayName: fbUser.displayName, email: fbUser.email, photoURL: fbUser.photoURL } : null);
        router.push(fbUser ? "/" : "/login");
      });
      return () => unsubscribe();
    });
  }, [router]);

  return user;
};

export default useFirebaseAuth;
