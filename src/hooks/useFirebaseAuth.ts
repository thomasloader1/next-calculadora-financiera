import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, User } from "firebase/auth";
import {app} from '@/Services/firebase'

// Definimos un tipo para el usuario autenticado.
type AuthUser = User | null;

// Creamos un custom hook para verificar la autenticación del usuario.
const useFirebaseAuth = (): AuthUser => {
  const auth = getAuth(app);
  const router = useRouter();

  const [user, setUser] = useState<AuthUser>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        router.push("/"); // Redirecciona al dashboard si el usuario ya está autenticado.
      }else{
        router.push("/login")
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return user;
};

export default useFirebaseAuth;
