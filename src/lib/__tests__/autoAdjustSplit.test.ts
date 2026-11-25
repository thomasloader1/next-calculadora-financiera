import { describe, it, expect } from 'vitest';
import { autoAdjustSplit } from '../budgetCalculator';

describe('autoAdjustSplit', () => {
  const base = { needs: 50, wants: 30, savings: 20 };

  it('keeps total at 100 when increasing needs, taking from wants first then savings', () => {
    expect(autoAdjustSplit('needs', 60, base)).toEqual({ needs: 60, wants: 20, savings: 20 });
    expect(autoAdjustSplit('needs', 90, base)).toEqual({ needs: 90, wants: 0, savings: 10 });
  });

  it('keeps total at 100 when decreasing needs, giving back to wants', () => {
    expect(autoAdjustSplit('needs', 40, base)).toEqual({ needs: 40, wants: 40, savings: 20 });
  });

  it('keeps integer percentages summing to 100 when adjusting wants proportionally', () => {
    const res = autoAdjustSplit('wants', 17, base);
    expect(Number.isInteger(res.needs)).toBe(true);
    expect(Number.isInteger(res.wants)).toBe(true);
    expect(Number.isInteger(res.savings)).toBe(true);
    expect(res.needs + res.wants + res.savings).toBe(100);
    expect(res.wants).toBe(17);
  });

  it('clamps extreme 0 and 100 values cleanly', () => {
    expect(autoAdjustSplit('savings', 100, base)).toEqual({ needs: 0, wants: 0, savings: 100 });
    expect(autoAdjustSplit('wants', 0, base)).toEqual({ needs: 71, wants: 0, savings: 29 });
  });
});
