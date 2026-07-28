export type RateSource = 'oficial' | 'mep' | 'custom';

export interface DollarRate {
  compra: number;
  venta: number;
  casa: string;
  nombre: string;
  moneda: string;
  fechaActualizacion: string;
}

const rateCache: Record<string, { rate: DollarRate; ts: number }> = {};
const CACHE_DURATION_MS = 5 * 60 * 1000;

async function fetchRate(endpoint: string): Promise<DollarRate> {
  const res = await fetch(`https://dolarapi.com/v1/dolares/${endpoint}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getRate(source: RateSource): Promise<DollarRate> {
  const cached = rateCache[source];
  if (cached && Date.now() - cached.ts < CACHE_DURATION_MS) {
    return cached.rate;
  }

  const endpoints: Record<string, string> = {
    oficial: 'oficial',
    mep: 'blue', // MEP is close to blue in dolarapi
  };

  const endpoint = endpoints[source];
  if (!endpoint) throw new Error(`Unknown rate source: ${source}`);

  try {
    const rate = await fetchRate(endpoint);
    rateCache[source] = { rate, ts: Date.now() };
    return rate;
  } catch (err) {
    if (cached) {
      console.warn("Failed to fetch rate, returning cached:", err);
      return cached.rate;
    }
    throw err;
  }
}

// Legacy alias
export async function getOfficialRate(): Promise<DollarRate> {
  return getRate('oficial');
}
