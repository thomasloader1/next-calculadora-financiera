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
      aria-label="Aviso de modo local"
      className="border-b border-rule bg-paper-2"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <i className="pi pi-database text-sm text-muted mt-1" aria-hidden="true"></i>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Modo local: tus datos están solo en este dispositivo</p>
            <p className="text-sm text-muted">
              Si borrás los datos del navegador se pierden. Descargá un backup
              {cloudAvailable ? ' o iniciá sesión con Google para sincronizarlos.' : '.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={handleBackup} className="calm-btn-secondary">
            <i className="pi pi-download text-xs" aria-hidden="true"></i>
            <span>Backup</span>
          </button>
          {cloudAvailable && (
            <button type="button" onClick={loginWithGoogle} className="calm-btn-secondary">
              <i className="pi pi-google text-xs" aria-hidden="true"></i>
              <span>Sincronizar</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            title="Cancelar aviso"
            aria-label="Cancelar aviso"
            className="w-10 h-10 rounded-input flex items-center justify-center text-muted hover:text-ink hover:bg-paper-3 transition-colors cursor-pointer shrink-0 ml-auto sm:ml-0"
          >
            <i className="pi pi-times text-xs" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </aside>
  );
};
