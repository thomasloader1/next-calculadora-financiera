/**
 * Auto-save is only allowed once the data of `currentUid` has been hydrated into memory.
 * Prevents writing the previous session's in-memory state under a new uid after
 * login/logout (which would overwrite that account's stored months).
 */
export function canAutoSave(hydratedUid: string | null, currentUid: string | null | undefined): boolean {
  return !!currentUid && hydratedUid === currentUid;
}
