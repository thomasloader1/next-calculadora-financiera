'use client';

import React, { useState } from 'react';
import { usePlatform } from '@/hooks/usePlatform';
import { toast } from 'sonner';

interface InstallPromptBannerProps {
  onOpenWidgetModal: (tab?: 'widget' | 'android' | 'shortcut') => void;
}

export const InstallPromptBanner: React.FC<InstallPromptBannerProps> = ({
  onOpenWidgetModal,
}) => {
  const { os, osName, isMobile, isStandalone, canPromptNativeInstall, promptInstall } = usePlatform();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  // If already running in standalone PWA mode, don't show
  if (isStandalone) {
    return null;
  }

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
    if (os === 'android') {
      onOpenWidgetModal('android');
    } else {
      onOpenWidgetModal('widget');
    }
  };

  if (isDismissed) {
    return (
      <div className="fixed bottom-20 sm:bottom-6 right-4 z-40 animate-in fade-in zoom-in-95">
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#D46743] hover:bg-[#BF5835] text-white text-xs font-semibold rounded-full shadow-lg shadow-[#D46743]/30 transition-all cursor-pointer active:scale-95"
        >
          <i className="pi pi-download text-xs"></i>
          <span>Instalar App {isMobile ? '/ Widget' : ''}</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Aviso de instalación"
      className="mb-5 bg-[#EDF9FA] dark:bg-[#132426] border border-[#BFE7EA] dark:border-[#1E373A] rounded-3xl p-4 sm:p-5 shadow-xs transition-all"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        {/* Left icon & text */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#D46743] text-white flex items-center justify-center shrink-0 shadow-xs text-xs">
            {os === 'ios' ? (
              <i className="pi pi-apple"></i>
            ) : os === 'android' ? (
              <i className="pi pi-android"></i>
            ) : (
              <i className="pi pi-check"></i>
            )}
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#2C211B] dark:text-white">
                Instalá la App en tu {osName}
              </span>
              <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full bg-[#BFE7EA] dark:bg-[#1E373A] text-[#1E373A] dark:text-[#BFE7EA]">
                {os.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-[#6B5547] dark:text-[#C4B1A3] leading-relaxed">
              {isMobile
                ? 'Acceso instantáneo, sin conexión y con atajo rápido para tus gastos diarios.'
                : 'Instalá la app en tu computadora para acceso rápido en ventana propia.'}
            </p>
          </div>
        </div>

        {/* Action Buttons: Pill shapes per CALM / KIT Study */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
          <button
            type="button"
            onClick={handleInstallApp}
            className="flex-1 sm:flex-initial calm-btn-primary py-2 px-4 text-xs"
          >
            <i className="pi pi-download text-xs"></i>
            <span>Instalar App</span>
          </button>

          {isMobile && (
            <button
              type="button"
              onClick={handleInstallWidget}
              className="flex-1 sm:flex-initial calm-btn-secondary py-2 px-3.5 text-xs"
            >
              <i className="pi pi-th-large text-xs text-[#D46743]"></i>
              <span>Widget</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#6B5547] hover:text-[#2C211B] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0 ml-auto sm:ml-0"
            title="Minimizar aviso"
            aria-label="Minimizar aviso"
          >
            <i className="pi pi-times text-[10px]"></i>
          </button>
        </div>
      </div>

      {/* iOS Step-by-Step popup guide if user taps 'Instalar App' on Safari */}
      {showIosGuide && (
        <div className="mt-3 pt-3 border-t border-[#BFE7EA] dark:border-[#1E373A] text-xs text-[#2C211B] dark:text-[#C4B1A3] space-y-2 animate-in fade-in duration-150">
          <p className="font-semibold flex items-center gap-1.5">
            <i className="pi pi-info-circle text-[#D46743]"></i>
            <span>Para instalar en Safari (iOS):</span>
          </p>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#6B5547] dark:text-[#C4B1A3]">
            <li>Tocá el botón <strong>Compartir</strong> en la barra inferior de Safari (icono de cuadrado con flecha).</li>
            <li>Deslizá hacia abajo y seleccioná <strong>&quot;Añadir a la pantalla de inicio&quot;</strong>.</li>
            <li>Tocá <strong>&quot;Añadir&quot;</strong> en la esquina superior derecha.</li>
          </ol>
          <button
            type="button"
            onClick={() => setShowIosGuide(false)}
            className="text-[11px] font-semibold text-[#D46743] hover:underline"
          >
            Entendido
          </button>
        </div>
      )}
    </aside>
  );
};
