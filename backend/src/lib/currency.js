const fetch = require('node-fetch');

const CACHE = new Map();
const TTL_MS = 30 * 60 * 1000;

async function toCompanyCurrency(baseAmount, baseCurrency, companyCurrency) {
  if (!baseAmount) return 0;
  if (baseCurrency === companyCurrency) return baseAmount;

  const now = Date.now();
  let cached = CACHE.get(baseCurrency);
  if (!cached || now - cached.ts > TTL_MS) {
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    if (!res.ok) throw new Error('FX API failed');
    const data = await res.json();
    cached = { ts: now, rates: data.rates || {} };
    CACHE.set(baseCurrency, cached);
  }
  const rate = cached.rates[companyCurrency];
  if (!rate) throw new Error(`No FX ${baseCurrency}->${companyCurrency}`);
  return Number(baseAmount) * rate;
}

module.exports = { toCompanyCurrency };
