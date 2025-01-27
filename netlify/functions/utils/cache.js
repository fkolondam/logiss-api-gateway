const NodeCache = require('node-cache');

// Cache dengan TTL 1 jam dan check period 10 menit
const cache = new NodeCache({
  stdTTL: 3600, // 1 hour in seconds
  checkperiod: 600 // 10 minutes in seconds
});

// Key generator untuk invoice cache
const getInvoiceCacheKey = (branch, date) => `invoice_${branch}_${date}`;

// Cache service
const cacheService = {
  get: (key) => {
    return cache.get(key);
  },

  set: (key, data) => {
    return cache.set(key, data);
  },

  del: (key) => {
    return cache.del(key);
  },

  // Fungsi untuk mendapatkan invoice dari cache atau fetch baru
  getOrFetchInvoices: async (fetchGas, branch, date) => {
    const cacheKey = getInvoiceCacheKey(branch, date);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      console.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }

    console.log(`Cache miss for ${cacheKey}, fetching from GAS`);
    const response = await fetchGas('getRangedInvoiceList', { branch, date });

    if (response.success) {
      console.log(`Caching response for ${cacheKey}`);
      cache.set(cacheKey, response);
    }

    return response;
  },

  // Fungsi untuk invalidate cache berdasarkan pattern
  invalidateByPattern: (pattern) => {
    const keys = cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    matchingKeys.forEach(key => cache.del(key));
    return matchingKeys.length;
  },

  // Fungsi untuk mendapatkan statistik cache
  getStats: () => {
    return {
      keys: cache.keys().length,
      hits: cache.getStats().hits,
      misses: cache.getStats().misses,
      ksize: cache.getStats().ksize,
      vsize: cache.getStats().vsize
    };
  }
};

module.exports = cacheService;
