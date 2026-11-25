'use client';
import { useCallback, useState } from 'react';
import type { FieldError } from '@/lib/validation';

/**
 * Decides when a field's error becomes visible: after the person leaves the
 * field, or after they try to submit. Never while they are still typing.
 */
export function useFieldErrors<F extends string>() {
  const [touched, setTouched] = useState<Partial<Record<F, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  /** The error to render for a field, or null while it should stay quiet */
  const shown = useCallback(
    (field: F, error: FieldError): string | null => (touched[field] || submitted ? error : null),
    [touched, submitted]
  );

  /** onBlur handler that marks a field as visited */
  const touch = useCallback((field: F) => () => {
    setTouched(t => (t[field] ? t : { ...t, [field]: true }));
  }, []);

  /** Call on a submit attempt; returns true when there are no errors */
  const attempt = useCallback((errors: FieldError[]) => {
    setSubmitted(true);
    return errors.every(e => !e);
  }, []);

  const reset = useCallback(() => {
    setTouched({});
    setSubmitted(false);
  }, []);

  return { shown, touch, attempt, reset };
}
