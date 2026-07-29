export const formatAmount = (amount: string | number | undefined) => {
    return Number(amount || 0).toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS'});
};

export const formatUsdAmount = (amount: number) => {
    return `USD ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/** Parse a masked amount string (e.g. "1.500,50" or "1500,50") back to a number */
export function parseMaskedAmount(value: string): number {
    if (!value) return 0;
    return Number(value.replace(/\./g, '').replace(',', '.'));
}

/** Parse a DD/MM/YYYY date string to ISO (YYYY-MM-DD) for storage */
export function parseDateDMY(value: string): string {
    if (!value || value.length < 10) return value;
    const [d, m, y] = value.split('/');
    if (!d || !m || !y) return value;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Format YYYY-MM-DD to DD/MM/YYYY for display */
export function formatDateISOtoDMY(value: string): string {
    if (!value || value.length < 10) return value;
    const [y, m, d] = value.split('-');
    if (!y || !m || !d) return value;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}