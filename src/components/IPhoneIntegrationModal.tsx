'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import { detectOS } from '@/hooks/usePlatform';

interface IPhoneIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'pwa-ios' | 'android' | 'shortcuts' | 'widget' | 'shortcut' | 'pwa';
}

export const IPhoneIntegrationModal: React.FC<IPhoneIntegrationModalProps> = ({
  isOpen,
  onClose,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<'pwa-ios' | 'android' | 'shortcuts'>('pwa-ios');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'android') {
        setActiveTab('android');
      } else if (initialTab === 'shortcut' || initialTab === 'shortcuts') {
        setActiveTab('shortcuts');
      } else {
        setActiveTab('pwa-ios');
      }
    } else {
      const os = detectOS();
      if (os === 'android') {
        setActiveTab('android');
      } else {
        setActiveTab('pwa-ios');
      }
    }
  }, [initialTab, isOpen]);

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://tu-calculadora.app';
  };

  const quickAddUrl = `${getBaseUrl()}/quick-add`;
  const apiEndpointUrl = `${getBaseUrl()}/api/quick-record`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Widget Web & Acceso Rápido">
      <div className="space-y-5">
        {/* Modern Segmented Navigation */}
        <div className="flex p-1 bg-paper-3 border border-rule rounded-card flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('pwa-ios')}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-input transition cursor-pointer ${
              activeTab === 'pwa-ios' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
            }`}
          >
            iPhone (Safari PWA)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-input transition cursor-pointer ${
              activeTab === 'android' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
            }`}
          >
            Android
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-input transition cursor-pointer ${
              activeTab === 'shortcuts' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
            }`}
          >
            Siri / Botón Acción
          </button>
        </div>

        {/* Tab 1: Widget Web iPhone (PWA Standalone) */}
        {activeTab === 'pwa-ios' && (
          <div className="space-y-4">
            <div className="p-4 bg-paper border border-rule rounded-card space-y-3">
              <div className="flex items-center gap-2 text-ink font-semibold text-xs">
                <i className="pi pi-apple text-accent"></i>
                <span>Cómo instalar el Widget Web en tu iPhone (100% Web)</span>
              </div>
              <ol className="text-xs text-muted space-y-2.5 list-decimal list-inside">
                <li>
                  Abrí en Safari el enlace de registro rápido:
                  <div className="flex items-center gap-2 mt-1.5">
                    <code className="flex-1 px-2.5 py-1.5 bg-surface border border-rule rounded-input text-xs font-mono text-accent truncate">
                      {quickAddUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(quickAddUrl, 'quickAddUrl')}
                      className="px-2.5 py-1.5 bg-accent hover:bg-accent-deep text-accent-ink rounded-input text-xs font-medium transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <i className={`pi ${copiedKey === 'quickAddUrl' ? 'pi-check' : 'pi-copy'} text-xs`}></i>
                      <span>{copiedKey === 'quickAddUrl' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </li>
                <li>
                  Tocá el botón <strong>Compartir</strong> en la barra inferior de Safari (ícono de cuadrado con flecha hacia arriba <span className="font-mono">⎋</span>).
                </li>
                <li>
                  Deslizá hacia abajo y seleccioná <strong>&quot;Añadir a la pantalla de inicio&quot;</strong>.
                </li>
                <li>
                  Nombralo <strong>&quot;Gasto Rápido&quot;</strong> y tocá <strong>Añadir</strong>.
                </li>
              </ol>

              <div className="p-3 bg-paper-2 border border-accent-soft rounded-input text-accent text-xs space-y-1">
                <p className="font-medium">Experiencia modo widget nativa:</p>
                <p>
                  Al tocar el ícono desde tu pantalla de inicio, se abrirá en <strong>0.1 segundos en pantalla completa</strong> (sin barra de direcciones ni pestañas de Safari), con teclado numérico gigante, botones rápidos y vibración háptica.
                </p>
              </div>

              <div className="p-3 bg-paper-3/60 border border-rule rounded-input text-xs space-y-1">
                <p className="font-semibold text-muted flex items-center gap-1.5">
                  <i className="pi pi-hand text-accent"></i>
                  <span>Atajo Haptic Touch (Mantener presionado el ícono):</span>
                </p>
                <p className="text-muted">
                  Si mantenés presionado el ícono de la app instalada en tu pantalla de inicio, iOS te mostrará directamente los accesos directos: <strong>&quot;Nuevo Gasto&quot;</strong> y <strong>&quot;Nuevo Ingreso&quot;</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Widget Android */}
        {activeTab === 'android' && (
          <div className="space-y-4">
            <div className="p-4 bg-paper border border-rule rounded-card space-y-3">
              <div className="flex items-center gap-2 text-ink font-semibold text-xs">
                <i className="pi pi-android text-accent"></i>
                <span>Widget y Atajo en Android (Chrome & Samsung Internet)</span>
              </div>
              <ol className="text-xs text-muted space-y-2.5 list-decimal list-inside">
                <li>Abrí el menú de opciones tocando los <strong>tres puntos (⋮)</strong> en Chrome.</li>
                <li>Tocá <strong>&quot;Instalar aplicación&quot;</strong> o <strong>&quot;Añadir a la pantalla de inicio&quot;</strong>.</li>
                <li>En tu pantalla de inicio, <strong>mantené presionado el icono de la app</strong>: aparecerán los atajos <strong>&quot;Nuevo Gasto&quot;</strong> y <strong>&quot;Nuevo Ingreso&quot;</strong>.</li>
                <li>Arrastrá cualquiera de ellos a tu pantalla para tener un botón widget de un solo toque.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab 3: Shortcut & Siri */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-4">
            <div className="p-4 bg-paper border border-rule rounded-card space-y-3">
              <div className="flex items-center gap-2 text-ink font-semibold text-xs">
                <i className="pi pi-bolt text-accent"></i>
                <span>Siri, Pantalla de Bloqueo y Botón de Acción</span>
              </div>
              <p className="text-xs text-muted">
                Podés usar la app <strong>Atajos</strong> de tu iPhone para conectar la URL de la web y activar el registro con la voz o botones físicos:
              </p>
              <ol className="text-xs text-muted space-y-2 list-decimal list-inside">
                <li>Abrí <strong>Atajos</strong> en tu iPhone y creá uno nuevo.</li>
                <li>Agregá la acción <strong>&quot;Abrir URL&quot;</strong> y pegá: <span className="font-mono text-accent">{quickAddUrl}</span></li>
                <li>Nombralo <strong>&quot;Registrar Gasto&quot;</strong>.</li>
                <li>Ahora decile a Siri: <em>&quot;Oye Siri, registrar gasto&quot;</em> o agregalo al <strong>Botón de Acción</strong> (iPhone 15/16 Pro).</li>
              </ol>
            </div>
          </div>
        )}

        {/* Action button: Test Now */}
        <div className="pt-2 flex items-center justify-between border-t border-paper-3">
          <a
            href="/quick-add"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-accent hover:underline flex items-center gap-1.5"
          >
            <i className="pi pi-external-link text-xs"></i>
            <span>Probar registro rápido ahora</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-paper-3 hover:bg-rule text-ink-2 text-xs font-semibold rounded-input transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
