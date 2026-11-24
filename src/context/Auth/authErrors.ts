/**
 * Maps Firebase Auth error codes to user-facing Spanish messages.
 * Returns null for codes that should not be shown (e.g. the user closed the popup).
 */
const SILENT_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

const MESSAGES: Record<string, string> = {
  'auth/unauthorized-domain': 'Este dominio no está autorizado para iniciar sesión. Agregalo en Firebase Console → Authentication → Settings.',
  'auth/operation-not-allowed': 'El inicio de sesión con Google no está habilitado en Firebase.',
  'auth/network-request-failed': 'Sin conexión. Revisá tu red e intentá de nuevo.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permití los pop-ups e intentá de nuevo.',
  'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.',
  'auth/account-exists-with-different-credential': 'Ya existe una cuenta con ese email usando otro método de acceso.',
};

export function getAuthErrorMessage(code: string | undefined | null): string | null {
  if (!code || SILENT_CODES.has(code)) return null;
  return MESSAGES[code] ?? 'No se pudo iniciar sesión con Google. Intentá de nuevo.';
}
