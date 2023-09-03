'use client'
import { app, handleSignInWithGoogle } from '@/Services/firebase'
import { Button } from '@nextui-org/react'
import { getAuth } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import {FcGoogle} from 'react-icons/fc'

const Page = () => {

    const router = useRouter();
  
    useEffect(() => {
      const auth = getAuth(app);
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
         router.push("/"); // Redirecciona al dashboard si el usuario ya está autenticado.
            console.log({user})
        }
      });
  
      return () => {
        unsubscribe();
      };
    }, []);

  return (
    <section className='p-4 container mx-auto max-w-md mt-52'>
      <h1 className='text-2xl mb-3'>Iniciar sesión con Google</h1>
      
      <Button className='w-full' onClick={handleSignInWithGoogle}>
        <FcGoogle className='mr-1' /> 
        Iniciar sesión
        </Button>
      
    </section>
  )
}

export default Page