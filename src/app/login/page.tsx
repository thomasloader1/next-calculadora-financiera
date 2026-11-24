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
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] dark:bg-[#15110E]">
        <i className="pi pi-spin pi-spinner text-2xl text-[#D46743]"></i>
      </div>
    );
  }

  if (user && !user.isAnonymous) return null;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#FAF6F0] dark:bg-[#15110E]">
      <div className="w-full max-w-md calm-card p-8 sm:p-10 text-center space-y-6">
        {/* Brand Icon */}
        <div className="w-14 h-14 bg-[#D46743] rounded-2xl flex items-center justify-center mx-auto shadow-sm shadow-[#D46743]/20">
          <i className="pi pi-chart-pie text-white text-2xl"></i>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#2C211B] dark:text-white tracking-tight">
            Calculadora 50/30/20
          </h1>
          <p className="text-sm text-[#6B5547] dark:text-[#C4B1A3] leading-relaxed">
            Gestioná tus finanzas personales con la regla del 50/30/20 y sincronizá tus datos de forma segura.
          </p>
        </div>

        {cloudAvailable ? (
          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 calm-btn-secondary text-sm font-semibold cursor-pointer shadow-sm"
            >
              <FcGoogle size={20} />
              <span>Continuar con Google</span>
            </button>

            <p className="text-[11px] text-[#9E8575]">
              Tus datos locales se sincronizan automáticamente con tu cuenta de Google.
            </p>
          </div>
        ) : (
          <p className="pt-2 text-[11px] text-[#9E8575]">
            El inicio de sesión con Google no está disponible. Podés usar la app en modo local y exportar tus datos cuando quieras.
          </p>
        )}

        <div className="pt-4 border-t border-[#F0D7BC] dark:border-[#3A2E25]">
          <Link
            href="/"
            className="text-xs font-semibold text-[#D46743] hover:text-[#BF5835] dark:text-[#E28669] transition-colors inline-flex items-center gap-1.5"
          >
            <span>Continuar sin cuenta (datos en este dispositivo, exportables)</span>
            <i className="pi pi-arrow-right text-[10px]"></i>
          </Link>
        </div>
      </div>
    </div>
  );
}
