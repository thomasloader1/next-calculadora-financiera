'use client';

import { useAuthContext } from '@/context/Auth/AuthContext';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { FcGoogle } from 'react-icons/fc';
import Link from 'next/link';

export default function LoginPage() {
  const { user, loading, cloudAvailable, loginWithGoogle } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !user.isAnonymous) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <i className="pi pi-spin pi-spinner text-2xl text-accent"></i>
      </div>
    );
  }

  if (user && !user.isAnonymous) return null;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-paper">
      <div className="w-full max-w-md calm-card p-8 sm:p-10 text-center space-y-6">
        {/* Brand Icon */}
        <div className="w-14 h-14 bg-accent rounded-input flex items-center justify-center mx-auto">
          <i className="pi pi-chart-pie text-accent-ink text-2xl" aria-hidden="true"></i>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl text-ink">
            Calculadora 50/30/20
          </h1>
          <p className="text-base text-ink-2 leading-relaxed">
            Gestioná tus finanzas personales con la regla del 50/30/20 y sincronizá tus datos de forma segura.
          </p>
        </div>

        {cloudAvailable ? (
          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={loginWithGoogle}
              className="calm-btn-secondary w-full min-h-[52px] gap-3 text-base"
            >
              <FcGoogle size={20} />
              <span>Continuar con Google</span>
            </button>

            <p className="text-sm text-muted">
              Tus datos locales se sincronizan automáticamente con tu cuenta de Google.
            </p>
          </div>
        ) : (
          <p className="pt-2 text-sm text-muted">
            El inicio de sesión con Google no está disponible. Podés usar la app en modo local y exportar tus datos cuando quieras.
          </p>
        )}

        <div className="pt-4 border-t border-rule">
          <Link
            href="/"
            className="text-sm font-medium text-accent hover:underline inline-flex items-center gap-1.5"
          >
            <span>Continuar sin cuenta (datos en este dispositivo, exportables)</span>
            <i className="pi pi-arrow-right text-xs" aria-hidden="true"></i>
          </Link>
        </div>
      </div>
    </div>
  );
}
