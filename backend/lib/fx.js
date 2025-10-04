const axios = require('axios');

let cache = { ts: 0, base: 'USD', rates: {} }; // 10-min memory cache

async function getRate(from, to) {
  const now = Date.now();
  if (!cache.rates || (now - cache.ts) > 10 * 60 * 1000) {
    const r = await axios.get('https://api.exchangerate.host/latest?base=USD');
    cache = { ts: now, base: 'USD', rates: r.data.rates || {} };
  }
  if (from === to) return 1;
  // USD → X: rates[X]; X → USD: 1/rates[X]
  const toUSD = v => v / (cache.rates[from] || 1);
  const fromUSD = v => v * (cache.rates[to] || 1);
  return fromUSD(toUSD(1));
}

module.exports = { getRate };
