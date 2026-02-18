/**
 * SSL Certificate Pinning (Temel Kontrol)
 * Backend SSL sertifikası fingerprint kontrolü
 * Not: Tam SSL pinning için native modül gerekir, bu temel bir kontrol sağlar
 */

// Backend API SSL sertifikası fingerprint'leri
// Production SSL sertifikası fingerprint'ini buraya ekleyin
// openssl s_client -connect api.huglutekstil.com:443 -showcerts | openssl x509 -fingerprint -noout
const EXPECTED_CERTIFICATE_FINGERPRINTS = [
  // SHA-256 fingerprint örneği (gerçek fingerprint ile değiştirilmeli)
  // 'AA:BB:CC:DD:EE:FF:...' formatında
];

/**
 * SSL certificate kontrolü (temel seviye)
 * React Native'de tam SSL pinning için native modül gerekir
 * Bu fonksiyon temel bir kontrol sağlar
 */
export function validateSSLConnection(url) {
  try {
    // HTTPS kontrolü
    if (!url.startsWith('https://')) {
      return {
        isValid: false,
        error: 'Only HTTPS connections are allowed'
      };
    }

    // Domain kontrolü
    const allowedDomains = [
      'api.huglutekstil.com',
      'huglutekstil.com'
    ];

    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (!allowedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
      return {
        isValid: false,
        error: `Domain not allowed: ${hostname}`
      };
    }

    // Temel SSL kontrolü başarılı
    // Not: Gerçek certificate fingerprint kontrolü için native modül gerekir
    return {
      isValid: true
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
}

/**
 * Axios interceptor için SSL kontrolü
 */
export function createSSLPinningInterceptor() {
  return (config) => {
    if (config.url && config.baseURL) {
      const fullUrl = config.baseURL + config.url;
      const validation = validateSSLConnection(fullUrl);

      if (!validation.isValid) {
        throw new Error(`SSL Validation Failed: ${validation.error}`);
      }
    }

    return config;
  };
}

export default {
  validateSSLConnection,
  createSSLPinningInterceptor
};
