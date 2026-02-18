/**
 * Güvenli Logger Utility
 * Hassas verileri otomatik olarak filtreler ve production'da loglamayı engeller
 */

// Logları production'da da açmak için:
// Expo: EXPO_PUBLIC_ENABLE_LOGS=true
// Not: Hassas veriler yine sanitize edilir.
const ENABLE_LOGS =
  __DEV__ ||
  String(process.env.EXPO_PUBLIC_ENABLE_LOGS || '').toLowerCase() === 'true';

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'authToken',
  'apiKey',
  'apiSecret',
  'secret',
  'authorization',
  'accessToken',
  'refreshToken',
  'bearer',
  'jwt',
  'creditCard',
  'cvv',
  'cvc',
  'ssn',
  'socialSecurityNumber',
  'email',
  'phone',
  'telephone',
  'mobile',
  'address',
  'cardNumber',
  'expiryDate',
  'pin',
  'otp',
  'verificationCode',
  'sessionId',
  'sessionToken',
  'csrfToken',
  'x-api-key',
  'x-admin-key',
  'adminKey',
  'adminToken',
];

const SENSITIVE_PATTERNS = [
  /token/i,
  /auth/i,
  /key/i,
  /secret/i,
  /password/i,
  /bearer/i,
  /jwt/i,
  /credential/i,
  /session/i,
  /cookie/i,
];

/**
 * Hassas verileri objeden temizle (recursive)
 * @param {any} data - Temizlenecek veri
 * @param {number} depth - Recursion derinliği (max 5)
 * @returns {any} Temizlenmiş veri
 */
function sanitizeData(data, depth = 0) {
  // Max depth kontrolü (sonsuz recursion'ı önle)
  if (depth > 5) {
    return '[Max depth reached]';
  }

  // Null, undefined, primitive değerler
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }

  // String kontrolü - token pattern'leri içeriyor mu?
  if (typeof data === 'string') {
    // Eğer string çok uzunsa ve token gibi görünüyorsa
    if (data.length > 20 && SENSITIVE_PATTERNS.some(pattern => pattern.test(data))) {
      return '***REDACTED***';
    }
    return data;
  }

  // Date objesi
  if (data instanceof Date) {
    return data;
  }

  // Array kontrolü
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1));
  }

  // Object kontrolü
  const sanitized = {};
  for (const key in data) {
    if (!data.hasOwnProperty(key)) continue;

    const lowerKey = key.toLowerCase();

    // Hassas field kontrolü
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
      continue;
    }

    // Pattern kontrolü
    if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
      sanitized[key] = '***REDACTED***';
      continue;
    }

    // Value kontrolü - eğer value bir token gibi görünüyorsa
    const value = data[key];
    if (typeof value === 'string' && value.length > 20) {
      // JWT token pattern kontrolü (xxx.xxx.xxx formatı)
      if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) {
        sanitized[key] = '***REDACTED***';
        continue;
      }
      // UUID pattern kontrolü
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        // UUID'ler genelde güvenli ama bazı durumlarda hassas olabilir
        if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
          sanitized[key] = '***REDACTED***';
          continue;
        }
      }
    }

    // Nested object/array için recursive
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * URL'deki hassas bilgileri temizle
 * @param {string} url - Temizlenecek URL
 * @returns {string} Temizlenmiş URL
 */
function sanitizeUrl(url) {
  if (typeof url !== 'string') return url;
  
  // URL'deki credentials'ı gizle (http://user:pass@example.com)
  return url.replace(/\/\/[^\/]+@/, '//***@');
}

/**
 * Güvenli Logger
 * Development'ta loglar, production'da hiçbir şey loglanmaz
 */
export const safeLog = {
  /**
   * Debug log (sadece development'ta)
   */
  debug: (...args) => {
    if (ENABLE_LOGS) {
      const sanitized = args.map(arg => {
        if (typeof arg === 'string' && arg.startsWith('http')) {
          return sanitizeUrl(arg);
        }
        return typeof arg === 'object' ? sanitizeData(arg) : arg;
      });
      console.log('[DEBUG]', ...sanitized);
    }
  },

  /**
   * Info log (sadece development'ta)
   */
  info: (...args) => {
    if (ENABLE_LOGS) {
      const sanitized = args.map(arg => {
        if (typeof arg === 'string' && arg.startsWith('http')) {
          return sanitizeUrl(arg);
        }
        return typeof arg === 'object' ? sanitizeData(arg) : arg;
      });
      console.info('[INFO]', ...sanitized);
    }
  },

  /**
   * Warning log (her zaman, ama temizlenmiş)
   */
  warn: (...args) => {
    const sanitized = args.map(arg => {
      if (typeof arg === 'string' && arg.startsWith('http')) {
        return sanitizeUrl(arg);
      }
      return typeof arg === 'object' ? sanitizeData(arg) : arg;
    });
    console.warn('[WARN]', ...sanitized);
  },

  /**
   * Error log (her zaman, ama temizlenmiş)
   */
  error: (...args) => {
    const sanitized = args.map(arg => {
      if (typeof arg === 'string' && arg.startsWith('http')) {
        return sanitizeUrl(arg);
      }
      return typeof arg === 'object' ? sanitizeData(arg) : arg;
    });
    console.error('[ERROR]', ...sanitized);
  },

  /**
   * API request log (sadece development'ta)
   */
  api: (method, url, data = null, response = null) => {
    if (ENABLE_LOGS) {
      console.log(`[API] ${method} ${sanitizeUrl(url)}`);
      if (data) {
        console.log('[API Request]', sanitizeData(data));
      }
      if (response) {
        console.log('[API Response]', sanitizeData(response));
      }
    }
  },
};

/**
 * Hassas veri temizleme fonksiyonunu export et
 */
export { sanitizeData, sanitizeUrl };

/**
 * Production'da hiçbir şey loglamayan logger
 */
export const productionLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  api: () => {},
};

// Varsayılan export
export default ENABLE_LOGS ? safeLog : productionLogger;

