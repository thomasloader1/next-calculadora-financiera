'use client'
import React from 'react';
import { Button } from '@/components/ui/Button';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { useAuthContext } from '@/context/Auth/AuthContext';

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function parseMonth(month: string): { year: number; monthIndex: number } {
    const [y, m] = month.split('-').map(Number);
    return { year: y, monthIndex: m - 1 };
}

function formatMonth(year: number, monthIndex: number): string {
    return `${MONTH_NAMES[monthIndex]} ${year}`;
}

function toMonthKey(year: number, monthIndex: number): string {
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

interface MonthSelectorProps {
    isLoading?: boolean;
}

const MonthSelector: React.FC<MonthSelectorProps> = ({ isLoading = false }) => {
    const { currentMonth, loadMonth, setCurrentMonth, isSaving, savedMonths } = useExpenseContext();
    const { user } = useAuthContext();
    const { year, monthIndex } = parseMonth(currentMonth);

    const currentCalendarMonth = getCurrentCalendarMonth();

    // Prev: only if the previous month exists in savedMonths
    const prevMonth = monthIndex === 0
        ? { year: year - 1, monthIndex: 11 }
        : { year, monthIndex: monthIndex - 1 };
    const prevKey = toMonthKey(prevMonth.year, prevMonth.monthIndex);
    const canGoPrev = savedMonths.includes(prevKey);

    // Next: only if the next month is saved AND not in the future
    const nextMonth = monthIndex === 11
        ? { year: year + 1, monthIndex: 0 }
        : { year, monthIndex: monthIndex + 1 };
    const nextKey = toMonthKey(nextMonth.year, nextMonth.monthIndex);
    const canGoNext = savedMonths.includes(nextKey) && nextKey <= currentCalendarMonth;

    const handlePrev = async () => {
        if (!canGoPrev || isLoading) return;
        const key = toMonthKey(prevMonth.year, prevMonth.monthIndex);
        setCurrentMonth(key);
        await loadMonth(key);
    };

    const handleNext = async () => {
        if (!canGoNext || isLoading) return;
        const key = toMonthKey(nextMonth.year, nextMonth.monthIndex);
        setCurrentMonth(key);
        await loadMonth(key);
    };

    return (
        <div className="flex items-center gap-1 bg-paper-3 p-1 rounded-input">
            <button
                type="button"
                onClick={handlePrev}
                disabled={!canGoPrev || isLoading}
                className="w-9 h-9 rounded-input flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Mes anterior"
                aria-label="Mes anterior"
            >
                <i className="pi pi-chevron-left text-xs" aria-hidden="true"></i>
            </button>
            {isLoading ? (
                <span className="min-w-[132px] text-center">
                    <span className="inline-block h-3.5 w-20 bg-rule rounded-md animate-pulse" />
                </span>
            ) : (
                <span className="font-medium text-sm min-w-[132px] text-center text-ink tabular-nums flex items-center justify-center gap-1.5 px-2 whitespace-nowrap">
                    {formatMonth(year, monthIndex)}
                    {isSaving && (
                        <svg aria-hidden="true" className="animate-spin h-3 w-3 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    )}
                </span>
            )}
            <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext || isLoading}
                className="w-9 h-9 rounded-input flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Mes siguiente"
                aria-label="Mes siguiente"
            >
                <i className="pi pi-chevron-right text-xs" aria-hidden="true"></i>
            </button>
        </div>
    );
};

function getCurrentCalendarMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default MonthSelector;
