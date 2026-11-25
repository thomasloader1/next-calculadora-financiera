'use client';

import React, { useEffect, useState } from 'react';
import { usePlatform } from '@/hooks/usePlatform';
import { toast } from 'sonner';
import { IPhoneIntegrationModal } from './IPhoneIntegrationModal';

const DISMISS_KEY = 'calc:install-banner-dismissed';

interface InstallPromptBannerProps {
  onOpenWidgetModal?: (tab?: 'widget' | 'android' | 'shortcut') => void;
}

export const InstallPromptBanner: React.FC<InstallPromptBannerProps> = ({
  onOpenWidgetModal,
}) => {
  const { os, osName, isMobile, isStandalone, canPromptNativeInstall, promptInstall } = usePlatform();
  const [isDismissed, setIsDismissed] = useState(true);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [widgetModalTab, setWidgetModalTab] = useState<'widget' | 'android' | 'shortcut'>('widget');

  useEffect(() => {
    try {
      setIsDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setIsDismissed(false);
    }
  }, []);

  // If already running in standalone PWA mode or dismissed, don't show
  if (isStandalone || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const handleInstallApp = async () => {
    if (canPromptNativeInstall) {
      const installed = await promptInstall();
      if (installed) {
        toast.success('¡App instalada correctamente!');
      }
    } else if (os === 'ios') {
      setShowIosGuide(true);
    } else {
      toast.info('Abrí las opciones de tu navegador (⋮) y seleccioná "Instalar aplicación" o "Añadir a la pantalla de inicio".');
    }
  };

  const handleInstallWidget = () => {
    const tab = os === 'android' ? 'android' : 'widget';
    if (onOpenWidgetModal) {
      onOpenWidgetModal(tab);
    } else {
      setWidgetModalTab(tab);
      setShowWidgetModal(true);
    }
  };

  return (
    <>
      <aside
        aria-label="Aviso de instalación"
        className="border-b border-rule bg-paper-2"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <i
                className={`pi ${os === 'ios' ? 'pi-apple' : os === 'android' ? 'pi-android' : 'pi-desktop'} text-sm text-muted mt-1`}
                aria-hidden="true"
              ></i>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">Instalá la app en tu {osName}</p>
                <p className="text-sm text-muted">
                  {isMobile
                    ? 'Acceso instantáneo, sin conexión y con atajo rápido para tus gastos diarios.'
                    : 'Instalá la app en tu computadora para acceso rápido en ventana propia.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button type="button" onClick={handleInstallApp} className="calm-btn-secondary flex-1 sm:flex-initial">
                <i className="pi pi-download text-xs" aria-hidden="true"></i>
                <span>Instalar app</span>
              </button>

              {isMobile && (
                <button type="button" onClick={handleInstallWidget} className="calm-btn-secondary flex-1 sm:flex-initial">
                  <i className="pi pi-th-large text-xs" aria-hidden="true"></i>
                  <span>Widget</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDismiss}
                className="w-10 h-10 rounded-input flex items-center justify-center text-muted hover:text-ink hover:bg-paper-3 transition-colors cursor-pointer shrink-0 ml-auto sm:ml-0"
                title="Cancelar aviso"
                aria-label="Cancelar aviso"
              >
                <i className="pi pi-times text-xs" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          {/* iOS Step-by-Step popup guide if user taps 'Instalar App' on Safari */}
          {showIosGuide && (
            <div className="mt-3 pt-3 border-t border-rule text-sm text-ink space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <i className="pi pi-info-circle text-accent"></i>
                <span>Para instalar en Safari (iOS):</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-ink-2">
                <li>Tocá el botón <strong>Compartir</strong> en la barra inferior de Safari (icono de cuadrado con flecha).</li>
                <li>Deslizá hacia abajo y seleccioná <strong>&quot;Añadir a la pantalla de inicio&quot;</strong>.</li>
                <li>Tocá <strong>&quot;Añadir&quot;</strong> en la esquina superior derecha.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-sm font-medium text-accent hover:underline"
              >
                Entendido
              </button>
            </div>
          )}
        </div>
      </aside>

      {!onOpenWidgetModal && (
        <IPhoneIntegrationModal
          isOpen={showWidgetModal}
          onClose={() => setShowWidgetModal(false)}
          initialTab={widgetModalTab}
        />
      )}
    </>
  );
};
