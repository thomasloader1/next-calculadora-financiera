export interface SplitPercentages {
  needs: number;
  wants: number;
  savings: number;
}

export interface Income {
  id: string;
  description: string;
  amount: number;
  currency: 'ARS' | 'USD';
  originalAmount?: number;
  exchangeRate?: number;
  /** Source of the exchange rate: oficial, mep, or custom */
  rateSource?: 'oficial' | 'mep' | 'custom';
  /** Custom rate value when rateSource is 'custom' */
  customRate?: number;
  /** When set, this income uses its own split instead of the global one */
  splitOverride?: SplitPercentages;
}
