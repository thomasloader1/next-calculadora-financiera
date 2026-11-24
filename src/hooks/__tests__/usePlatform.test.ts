import { describe, it, expect } from 'vitest';
import { detectOS, getOSDisplayName } from '../usePlatform';

describe('usePlatform & detectOS', () => {
  it('detects iOS when userAgent contains iPhone', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)';
    expect(detectOS(ua)).toBe('ios');
    expect(getOSDisplayName('ios')).toBe('iPhone / iOS');
  });

  it('detects Android when userAgent contains Android', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8)';
    expect(detectOS(ua)).toBe('android');
    expect(getOSDisplayName('android')).toBe('Android');
  });

  it('detects Windows when userAgent contains Windows', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
    expect(detectOS(ua)).toBe('windows');
    expect(getOSDisplayName('windows')).toBe('Windows');
  });

  it('detects macOS when userAgent contains Macintosh', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';
    expect(detectOS(ua)).toBe('macos');
    expect(getOSDisplayName('macos')).toBe('Mac');
  });

  it('detects Linux when userAgent contains Linux without Android', () => {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64)';
    expect(detectOS(ua)).toBe('linux');
    expect(getOSDisplayName('linux')).toBe('Linux');
  });

  it('returns unknown when empty', () => {
    expect(detectOS('', '')).toBe('unknown');
    expect(getOSDisplayName('unknown')).toBe('tu dispositivo');
  });
});
