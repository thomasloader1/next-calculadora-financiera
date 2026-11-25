/**
 * Form validation shared by every money form.
 * Messages are written in rioplatense Spanish, the voice of the rest of the app.
 */

/** Largest amount a single movement may carry (a guard against typos like 1e15) */
export const MAX_AMOUNT = 1_000_000_000_000;
export const MAX_DESCRIPTION = 80;

/**
 * Parse an amount typed by a person, accepting both "1.500,50" (es-AR)
 * and "1500.50" (a phone keyboard with a dot). Returns NaN for anything
 * that is not a plain positive number: letters, signs, exponents, Infinity.
 *
 * Separator rules:
 * - both "." and ",": the last one is the decimal mark, the other groups thousands
 * - only ",": one comma is the decimal mark; several commas are invalid
 * - only ".": several dots group thousands ("1.500.000"); a single dot followed by
 *   exactly three digits groups thousands ("1.500" = 1500), otherwise it is decimal
 */
export function parseAmount(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
  if (raw == null) return NaN;

  const s = String(raw).replace(/\s| /g, '').replace(/^(ARS|USD|US)?\$?/i, '');
  if (s === '') return NaN;
  if (!/^[\d.,]+$/.test(s)) return NaN;

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let normalized: string;

  if (lastDot !== -1 && lastComma !== -1) {
    const decimalMark = lastDot > lastComma ? '.' : ',';
    const groupMark = decimalMark === '.' ? ',' : '.';
    const [intPart, ...rest] = s.split(decimalMark);
    if (rest.length !== 1) return NaN;
    if (!isValidGrouping(intPart, groupMark)) return NaN;
    normalized = `${intPart.split(groupMark).join('')}.${rest[0]}`;
  } else if (lastComma !== -1) {
    const parts = s.split(',');
    if (parts.length !== 2) return NaN;
    normalized = `${parts[0]}.${parts[1]}`;
  } else if (lastDot !== -1) {
    const parts = s.split('.');
    if (parts.length > 2) {
      if (!isValidGrouping(s, '.')) return NaN;
      normalized = parts.join('');
    } else if (parts[1].length === 3 && parts[0].length > 0 && parts[0] !== '0') {
      normalized = parts.join('');
    } else {
      normalized = `${parts[0]}.${parts[1]}`;
    }
  } else {
    normalized = s;
  }

  // "12," or ",5" leave an empty side; treat them as 12 and 0.5
  if (normalized.endsWith('.')) normalized = normalized.slice(0, -1);
  if (normalized.startsWith('.')) normalized = `0${normalized}`;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return NaN;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

/** Groups after the first must be exactly three digits: "1.500.000" yes, "1.50.000" no */
function isValidGrouping(intPart: string, mark: string): boolean {
  const groups = intPart.split(mark);
  if (groups.length === 1) return /^\d*$/.test(intPart);
  return /^\d{1,3}$/.test(groups[0]) && groups.slice(1).every(g => /^\d{3}$/.test(g));
}

export type FieldError = string | null;

interface AmountRules {
  /** Upper bound, e.g. the money left in the source bucket */
  max?: number;
  /** Message to show when the amount goes over `max` */
  maxMessage?: string;
  label?: string;
}

/** Returns the error for an amount field, or null when it is valid */
export function validateAmount(raw: string, rules: AmountRules = {}): FieldError {
  const label = rules.label ?? 'el monto';
  if (raw.trim() === '') return `Ingresá ${label}.`;
  const n = parseAmount(raw);
  if (Number.isNaN(n)) return 'Usá solo números, por ejemplo 15000 o 1.500,50.';
  if (n <= 0) return 'El monto tiene que ser mayor a cero.';
  if (n > MAX_AMOUNT) return 'El monto es demasiado grande. Revisá que no sobren ceros.';
  if (rules.max !== undefined && n > rules.max) {
    return rules.maxMessage ?? 'El monto supera lo disponible.';
  }
  return null;
}

/** Exchange rate typed by hand: a positive number within a sane range */
export function validateRate(raw: string): FieldError {
  if (raw.trim() === '') return 'Ingresá el tipo de cambio.';
  const n = parseAmount(raw);
  if (Number.isNaN(n)) return 'Usá solo números, por ejemplo 1200 o 1.215,50.';
  if (n <= 0) return 'El tipo de cambio tiene que ser mayor a cero.';
  if (n > 1_000_000) return 'El tipo de cambio parece demasiado alto.';
  return null;
}

export function validateDescription(raw: string, { required = false } = {}): FieldError {
  const v = raw.trim();
  if (required && v === '') return 'Ingresá una descripción.';
  if (v.length > MAX_DESCRIPTION) return `Máximo ${MAX_DESCRIPTION} caracteres.`;
  return null;
}

/** True for an amount that may be stored: finite, positive, within the ceiling */
export function isStorableAmount(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT;
}
