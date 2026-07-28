export const formatAmount = (amount: string | number | undefined) => {
    return Number(amount || 0).toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS'})
}

export const formatUsdAmount = (amount: number) => {
    return `USD ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}