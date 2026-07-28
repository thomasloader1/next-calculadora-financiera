'use client';
import { useAuthContext } from '@/context/Auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { FcGoogle } from 'react-icons/fc';

const Page = () => {
  const { user, loading, loginWithGoogle } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !user.isAnonymous) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Always show a loading/skeleton state, even while loading
  if (loading) return null;
  // Already logged in with Google
  if (user && !user.isAnonymous) return null;

  return (
    <section className='p-4 container mx-auto max-w-md mt-32'>
      <div className='bg-cds-dark rounded-cds-lg p-8 text-center'>
        <h1 className='text-2xl font-normal text-cds-canvas mb-2 tracking-tight'>Calculadora de gastos</h1>
        <p className='text-cds-muted text-sm mb-4'>Iniciá sesión para guardar en la nube</p>
        <p className='text-cds-muted text-xs mb-8'>Si no iniciás sesión, los datos se guardan localmente en el navegador.</p>
        <Button
          onClick={loginWithGoogle}
          startContent={<FcGoogle size={18} />}
        >
          Iniciar sesión con Google
        </Button>
        <div className="mt-4">
          <button
            onClick={() => router.push('/')}
            className="text-xs text-cds-muted hover:text-cds-canvas transition-colors underline"
          >
            O usar sin sesión
          </button>
        </div>
      </div>
    </section>
  );
};

export default Page;
