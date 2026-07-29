import { SplitPercentages } from './Income';

export type PoolResult = { needs: number; wants: number; savings: number };

export interface CashState {
  needs: number;
  wants: number;
  savings: number;
  totalIncome?: number;
  split?: SplitPercentages;
  pool?: PoolResult;
}
