'use client'
import { getFirebaseAuth } from '@/Services/firebase'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import { FcGoogle } from 'react-icons/fc'

const Page = () => {
    const router = useRouter();
    const auth = getFirebaseAuth();

    useEffect(() => {
        if (!auth) {
            // No Firebase configured — go straight to app
            router.push('/');
            return;
        }

        import('firebase/auth').then(({ onAuthStateChanged }) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    router.push('/');
                }
            });
            return () => unsubscribe();
        });
    }, [auth, router]);

    const handleLogin = async () => {
        if (!auth) return;
        const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth');
        const provider = new GoogleAuthProvider();
        const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)
            || ('ontouchstart' in window && window.innerWidth < 768);
        try {
            if (isMobile) {
                await signInWithRedirect(auth, provider);
            } else {
                await signInWithPopup(auth, provider);
            }
        } catch (e) {
            console.error('Login error:', e);
        }
    };

    // No Firebase configured — skip login page
    if (!auth) return null;

    return (
        <section className='p-4 container mx-auto max-w-md mt-32'>
            <div className='bg-cds-dark rounded-cds-lg p-8 text-center'>
                <h1 className='text-2xl font-normal text-cds-canvas mb-2 tracking-tight'>Calculadora de gastos</h1>
                <p className='text-cds-muted text-sm mb-8'>Iniciá sesión para guardar y consultar tus meses</p>
                <Button
                    onClick={handleLogin}
                    startContent={<FcGoogle size={18} />}
                >
                    Iniciar sesión con Google
                </Button>
            </div>
        </section>
    )
}

export default Page
