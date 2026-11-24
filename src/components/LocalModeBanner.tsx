'use client';

import React, { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/Auth/AuthContext';
import { getAllMonths } from '@/Services/firebase';
import { downloadBackupJSON } from '@/lib/excel';
import { toast } from 'sonner';

const DISMISS_KEY = 'calc:local-banner-dismissed';

/**
 * Shown to users without a Google session: their data lives only in this browser,
 * so offer a backup download and (if configured) Google sign-in.
 */
export const LocalModeBanner: React.FC = () => {
  const { user, loading, cloudAvailable, loginWithGoogle } = useAuthContext();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (loading || !user || !user.isAnonymous || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  const handleBackup = async () => {
    try {
      const months = await getAllMonths(user.uid);
      if (Object.keys(months).length === 0) {
        toast.error('Todavía no hay meses guardados para respaldar');
        return;
      }
      downloadBackupJSON(months, `calculadora-backup-${new Date().toISOString().slice(0, 10)}`);
      toast.success('Backup descargado. Guardalo en un lugar seguro.');
    } catch {
      toast.error('No se pudo generar el backup');
    }
  };

  return (
    <aside
      role="status"
      className="calm-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-in fade-in duration-200"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="w-8 h-8 rounded-full bg-[#FDF5EC] dark:bg-[#2D1F13] text-[#E89B5B] flex items-center justify-center text-xs shrink-0">
          <i className="pi pi-database"></i>
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#2C211B] dark:text-white">Modo local: tus datos están solo en este dispositivo</p>
          <p className="text-[11px] text-[#6B5547] dark:text-[#C4B1A3] leading-relaxed">
            Si borrás los datos del navegador se pierden. Descargá un backup
            {cloudAvailable ? ' o iniciá sesión con Google para sincronizarlos.' : '.'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleBackup}
          className="calm-btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
        >
          <i className="pi pi-download text-xs"></i>
          <span>Backup</span>
        </button>
        {cloudAvailable && (
          <button
            type="button"
            onClick={loginWithGoogle}
            className="calm-btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <i className="pi pi-google text-xs"></i>
            <span>Sincronizar</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Ocultar aviso"
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#9E8575] hover:bg-[#FFEAD3] dark:hover:bg-[#261F1A] cursor-pointer"
        >
          <i className="pi pi-times text-[10px]"></i>
        </button>
      </div>
    </aside>
  );
};
