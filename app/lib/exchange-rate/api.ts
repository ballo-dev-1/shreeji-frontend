/**
 * Exchange Rate API Service
 * Fetches USD to ZMW exchange rates from ExchangeRate-API
 */

const API_KEY = '64a1de592908ad63a7b939a7';
const API_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;
const FALLBACK_RATE = 18.89; // Static fallback rate

export interface ExchangeRateResponse {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  rates: {
    ZMW: number;
    [key: string]: number;
  };
}

export interface ExchangeRateResult {
  rate: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

/**
 * Fetches the current USD to ZMW exchange rate from ExchangeRate-API
 * @returns Promise with exchange rate result
 */
export async function fetchExchangeRate(): Promise<ExchangeRateResult> {
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Don't cache - we handle caching in the context
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data: ExchangeRateResponse = await response.json();

    if (data.result !== 'success' || !data.rates?.ZMW) {
      throw new Error('Invalid API response format');
    }

    return {
      rate: data.rates.ZMW,
      timestamp: Date.now(),
      success: true,
    };
  } catch (error) {
    console.error('Failed to fetch exchange rate from API:', error);
    return {
      rate: FALLBACK_RATE,
      timestamp: Date.now(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Gets the fallback exchange rate (used when API fails)
 */
export function getFallbackRate(): number {
  return FALLBACK_RATE;
}
