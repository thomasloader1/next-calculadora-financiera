export const formatAmount = (amount: string | number | undefined) => {
    return Number(amount).toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS'})
}