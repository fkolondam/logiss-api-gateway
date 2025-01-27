const NodeCache = require('node-cache');

// Cache dengan TTL 1 jam dan check period 10 menit
const cache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 600
});

// Key generators untuk berbagai tipe data
const getCacheKey = (type, params) => {
  switch (type) {
    case 'invoice':
      return `invoice_${params.branch}_${params.date}${params.ranged ? '_ranged' : ''}`;
    case 'vehicle':
      return `vehicle_${params.branch}`;
    case 'branch':
      return 'branch_config';
    default:
      return `${type}_${JSON.stringify(params)}`;
  }
};

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

  // Fungsi generik untuk get atau fetch data
  getOrFetchData: async (type, params, fetchGas, action) => {
    const cacheKey = getCacheKey(type, params);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      console.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }

    console.log(`Cache miss for ${cacheKey}, fetching from GAS`);
    const response = await fetchGas(action, params);

    if (response.success) {
      console.log(`Caching response for ${cacheKey}`);
      cache.set(cacheKey, response);
    }

    return response;
  },

  // Fungsi spesifik untuk tiap tipe data
  getOrFetchInvoices: async (fetchGas, branch, date, ranged = false) => {
    return cacheService.getOrFetchData(
      'invoice',
      { branch, date, ranged },
      fetchGas,
      ranged ? 'getRangedInvoiceList' : 'getInvoiceList'
    );
  },

  getOrFetchVehicles: async (fetchGas, branch) => {
    return cacheService.getOrFetchData(
      'vehicle',
      { branch },
      fetchGas,
      'getVehicleData'
    );
  },

  getOrFetchBranches: async (fetchGas) => {
    return cacheService.getOrFetchData(
      'branch',
      {},
      fetchGas,
      'getBranchConfig'
    );
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
