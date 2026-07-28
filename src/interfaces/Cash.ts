import { SplitPercentages } from './Income';

export interface CashState {
  needs: number;
  wants: number;
  savings: number;
  totalIncome?: number;
  split?: SplitPercentages;
}
