import { describe, it, expect } from 'vitest';
import { canAutoSave } from '../sessionGuard';

describe('canAutoSave (session switch guard)', () => {
  it('blocks saving before any uid has been hydrated', () => {
    expect(canAutoSave(null, 'google-uid')).toBe(false);
  });

  it('blocks saving the previous session state right after login (uid changed, not yet hydrated)', () => {
    expect(canAutoSave('anon-uid', 'google-uid')).toBe(false);
  });

  it('blocks saving right after logout (google -> anon)', () => {
    expect(canAutoSave('google-uid', 'anon-uid')).toBe(false);
  });

  it('allows saving once the current uid data is hydrated', () => {
    expect(canAutoSave('google-uid', 'google-uid')).toBe(true);
  });

  it('never saves without a user', () => {
    expect(canAutoSave(null, null)).toBe(false);
    expect(canAutoSave(null, undefined)).toBe(false);
  });
});
