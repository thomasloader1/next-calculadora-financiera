'use client';

import { useState, useEffect } from 'react';

export type OperatingSystem = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'unknown';

export interface PlatformInfo {
  os: OperatingSystem;
  osName: string;
  isMobile: boolean;
  isStandalone: boolean;
  canPromptNativeInstall: boolean;
  promptInstall: () => Promise<boolean>;
}

export function detectOS(customUA?: string, customPlatform?: string): OperatingSystem {
  const userAgent = customUA !== undefined
    ? customUA
    : (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
  const platform = customPlatform !== undefined
    ? customPlatform
    : (typeof navigator !== 'undefined' ? (navigator as any).platform || '' : '');

  if (!userAgent && !platform) {
    return 'unknown';
  }

  // iOS detection (iPhone, iPad, iPod)
  if (/iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }

  // Android detection
  if (/Android/i.test(userAgent)) {
    return 'android';
  }

  // Windows detection
  if (/Win32|Win64|Windows|WinCE/i.test(userAgent) || /Win/i.test(platform)) {
    return 'windows';
  }

  // macOS detection
  if (/Macintosh|MacIntel|MacPPC|Mac68K/i.test(userAgent) || /Mac/i.test(platform)) {
    return 'macos';
  }

  // Linux detection
  if (/Linux/i.test(userAgent) || /Linux/i.test(platform)) {
    return 'linux';
  }

  return 'unknown';
}

export function getOSDisplayName(os: OperatingSystem): string {
  switch (os) {
    case 'ios':
      return 'iPhone / iOS';
    case 'android':
      return 'Android';
    case 'macos':
      return 'Mac';
    case 'windows':
      return 'Windows';
    case 'linux':
      return 'Linux';
    default:
      return 'tu dispositivo';
  }
}

export function usePlatform(): PlatformInfo {
  const [os, setOs] = useState<OperatingSystem>('unknown');
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Detect OS
    setOs(detectOS());

    // 2. Detect standalone PWA mode
    const checkStandalone = () => {
      const isStandaloneMode =
        (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
        (typeof navigator !== 'undefined' && (navigator as any).standalone === true) ||
        (typeof document !== 'undefined' && document.referrer.includes('android-app://'));
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // 3. Capture beforeinstallprompt for Chrome / Android / Edge
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsStandalone(true);
          return true;
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }
    return false;
  };

  const isMobile = os === 'ios' || os === 'android';

  return {
    os,
    osName: getOSDisplayName(os),
    isMobile,
    isStandalone,
    canPromptNativeInstall: !!deferredPrompt,
    promptInstall,
  };
}
