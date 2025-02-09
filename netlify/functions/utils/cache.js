const NodeCache = require('node-cache');

// Initialize cache with default settings
const cache = new NodeCache({
  stdTTL: 3600,     // Default TTL 1 hour
  checkperiod: 600  // Check period 10 minutes
});

// Clear cache on server restart
console.log('Server restarting - Clearing cache...');
cache.flushAll();
console.log('Cache cleared successfully');

// TTL configurations (in seconds)
const TTL_CONFIG = {
  branch: 3600,     // 1 hour
  vehicle: 1800,    // 30 minutes
  invoice: 900,     // 15 minutes
  delivery: 600,    // 10 minutes
  expenses: 600     // 10 minutes
};

// Key generators untuk berbagai tipe data
const getCacheKey = (type, params) => {
  switch (type) {
    case 'invoice':
      return `invoice_${params.branch}_${params.date}${params.ranged ? '_ranged' : ''}`;
    case 'vehicle':
      return `vehicle_${params.branch}`;
    case 'branch':
      return 'branch_config';
    case 'expenses':
      if (params.context) {
        return `expenses_context_${params.context}_${params.range || 'today'}`;
      }
      return `expenses_${params.branch}_${params.category || 'all'}_${params.range || 'today'}`;
    default:
      return `${type}_${JSON.stringify(params)}`;
  }
};

// Cache service
const cacheService = {
  get: (key) => {
    return cache.get(key);
  },

  set: (key, data, type) => {
    const ttl = TTL_CONFIG[type] || 3600; // Use type-specific TTL or default to 1 hour
    return cache.set(key, data, ttl);
  },

  del: (key) => {
    return cache.del(key);
  },

  // Clear all cache
  clearAll: () => {
    console.log('Clearing all cache...');
    return cache.flushAll();
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
      console.log(`Caching response for ${cacheKey} with TTL: ${TTL_CONFIG[type] || 3600}s`);
      cache.set(cacheKey, response, TTL_CONFIG[type]);
    }

    return response;
  },

  // Fungsi spesifik untuk tiap tipe data
  getOrFetchInvoices: async (fetchGas, branch, date, ranged = false) => {
    const type = 'invoice';
    const params = { branch, date, ranged };
    const cacheKey = getCacheKey(type, params);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      console.log(`Cache hit for invoices: ${cacheKey}`);
      return cachedData;
    }

    console.log(`Cache miss for invoices: ${cacheKey}, fetching from GAS`);
    const response = await fetchGas(
      ranged ? 'getRangedInvoiceList' : 'getInvoiceList',
      params
    );

    if (response.success) {
      console.log(`Caching invoice response for ${cacheKey} with TTL: ${TTL_CONFIG[type] || 3600}s`);
      cache.set(cacheKey, response, TTL_CONFIG[type]);
    }

    return response;
  },

  getOrFetchVehicles: async (fetchGas, branch) => {
    const type = 'vehicle';
    const cacheKey = getCacheKey(type, { branch });
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      console.log(`Cache hit for vehicles: ${cacheKey}`);
      return cachedData;
    }

    console.log(`Cache miss for vehicles: ${cacheKey}, fetching from GAS`);
    const response = await fetchGas('getVehicleData', branch);

    if (response.success) {
      console.log(`Caching vehicles response for ${cacheKey}`);
      cache.set(cacheKey, response, TTL_CONFIG[type]);
    }

    return response;
  },

  getOrFetchBranches: async (fetchGas) => {
    return cacheService.getOrFetchData(
      'branch',
      {},
      fetchGas,
      'getBranchConfig'
    );
  },

  // Fungsi baru untuk expenses
  getOrFetchExpenses: async (fetchGas, params) => {
    const type = 'expenses';
    const cacheKey = getCacheKey(type, params);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      console.log(`Cache hit for expenses: ${cacheKey}`);
      return cachedData;
    }

    console.log(`Cache miss for expenses: ${cacheKey}, fetching from GAS`);
    const response = await fetchGas(
      params.context ? 'getFilteredExpenses' : 'getExpenses',
      params
    );

    if (response.success) {
      console.log(`Caching expenses response for ${cacheKey} with TTL: ${TTL_CONFIG[type] || 3600}s`);
      cache.set(cacheKey, response, TTL_CONFIG[type]);
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
