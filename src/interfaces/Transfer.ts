export type CategoryKey = 'needs' | 'wants' | 'savings';

export interface Transfer {
  id: string;
  from: CategoryKey;
  to: CategoryKey;
  amount: number;
  reason?: string;
  isAutomatic: boolean;
  createdAt: string;
}
