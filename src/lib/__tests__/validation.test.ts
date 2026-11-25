import { describe, it, expect } from 'vitest';
import { parseAmount, validateAmount, validateRate, validateDescription, isStorableAmount, MAX_AMOUNT } from '../validation';

describe('parseAmount', () => {
  it.each([
    ['15000', 15000],
    ['1.500', 1500],
    ['1.500.000', 1500000],
    ['1.500,50', 1500.5],
    ['1500,50', 1500.5],
    ['1500.50', 1500.5],
    ['1,500.50', 1500.5],
    ['1.5', 1.5],
    ['0.500', 0.5],
    ['12,', 12],
    [',5', 0.5],
    ['$ 2.000', 2000],
    ['US$100', 100],
    [' 300 ', 300],
    ['ARS 1.200', 1200],
    ['USD 50,25', 50.25],
  ])('reads %j as %d', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(['', '   ', 'abc', '-200', '1e9', 'Infinity', '1500,5,3', '1.50.000', '12a', '1,2.3,4'])(
    'rejects %j',
    (input) => {
      expect(parseAmount(input)).toBeNaN();
    }
  );

  it('passes finite numbers through and rejects non-finite ones', () => {
    expect(parseAmount(42)).toBe(42);
    expect(parseAmount(Infinity)).toBeNaN();
    expect(parseAmount(null)).toBeNaN();
  });
});

describe('validateAmount', () => {
  it('accepts a valid amount', () => {
    expect(validateAmount('1.500,50')).toBeNull();
  });

  it('asks for an amount when empty', () => {
    expect(validateAmount('')).toMatch(/Ingresá/);
  });

  it('rejects zero, text and huge amounts', () => {
    expect(validateAmount('0')).toMatch(/mayor a cero/);
    expect(validateAmount('abc')).toMatch(/solo números/);
    expect(validateAmount(String(MAX_AMOUNT * 10))).toMatch(/demasiado grande/);
  });

  it('enforces a custom max with its message', () => {
    expect(validateAmount('500', { max: 100, maxMessage: 'Solo tenés $100' })).toBe('Solo tenés $100');
    expect(validateAmount('100', { max: 100 })).toBeNull();
  });
});

describe('validateRate', () => {
  it('accepts a typical rate and rejects nonsense', () => {
    expect(validateRate('1.215,50')).toBeNull();
    expect(validateRate('0')).not.toBeNull();
    expect(validateRate('x')).not.toBeNull();
    expect(validateRate('')).not.toBeNull();
  });
});

describe('validateDescription', () => {
  it('is optional unless required, and capped in length', () => {
    expect(validateDescription('')).toBeNull();
    expect(validateDescription('', { required: true })).not.toBeNull();
    expect(validateDescription('a'.repeat(81))).not.toBeNull();
  });
});

describe('isStorableAmount', () => {
  it('only lets finite positive amounts through', () => {
    expect(isStorableAmount(10)).toBe(true);
    expect(isStorableAmount(NaN)).toBe(false);
    expect(isStorableAmount(-1)).toBe(false);
    expect(isStorableAmount(0)).toBe(false);
    expect(isStorableAmount(Infinity)).toBe(false);
    expect(isStorableAmount('10')).toBe(false);
  });
});
