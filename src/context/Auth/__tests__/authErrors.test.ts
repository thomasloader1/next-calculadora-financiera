import { describe, it, expect } from 'vitest';
import { getAuthErrorMessage } from '../authErrors';

describe('getAuthErrorMessage', () => {
  it('stays silent when the user closes or cancels the popup', () => {
    expect(getAuthErrorMessage('auth/popup-closed-by-user')).toBeNull();
    expect(getAuthErrorMessage('auth/cancelled-popup-request')).toBeNull();
    expect(getAuthErrorMessage(undefined)).toBeNull();
  });

  it('explains configuration problems', () => {
    expect(getAuthErrorMessage('auth/unauthorized-domain')).toMatch(/dominio no está autorizado/);
    expect(getAuthErrorMessage('auth/operation-not-allowed')).toMatch(/no está habilitado/);
  });

  it('explains network failures', () => {
    expect(getAuthErrorMessage('auth/network-request-failed')).toMatch(/conexión/);
  });

  it('falls back to a generic message for unknown codes', () => {
    expect(getAuthErrorMessage('auth/something-new')).toMatch(/No se pudo iniciar sesión/);
  });
});
