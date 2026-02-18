import axios from 'axios';
import { getApiUrl, API_CONFIG, validateApiKey } from '../config/api.config';
import safeLog from '../utils/safeLogger';
import secureStorage from '../utils/secureStorage';
import { createSSLPinningInterceptor } from '../utils/sslPinning';

// 401 hata sayacı - çok fazla 401 hatası alınırsa logout yap
let unauthorizedErrorCount = 0;
let lastUnauthorizedTime = 0;
const MAX_UNAUTHORIZED_ERRORS = 3; // 3 hata sonra logout
const UNAUTHORIZED_ERROR_RESET_TIME = 60000; // 1 dakika içinde reset

// GÜVENLİK: API key kontrolü
try {
  validateApiKey();
} catch (error) {
  console.error('❌ API Configuration Error:', error.message);
  // Development'ta uyarı ver, production'da hata fırlat
  if (__DEV__) {
    console.warn('⚠️ API_KEY bulunamadı. EXPO_PUBLIC_API_KEY environment variable\'ı set edin.');
  }
}

// Backend API URL
const API_BASE_URL = getApiUrl();

// API Key
const API_KEY = API_CONFIG.API_KEY;

// Axios instance oluştur - React Native için optimize edilmiş
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'Accept': 'application/json',
    'User-Agent': 'HugluMobileApp/1.0',
  },
  validateStatus: (status) => status < 500,
  // React Native otomatik olarak sistem SSL sertifikalarını kullanır
  // httpsAgent sadece Node.js için geçerlidir, React Native'de kullanılmaz
});

// GÜVENLİK: SSL Pinning interceptor (ilk interceptor)
api.interceptors.request.use(
  createSSLPinningInterceptor(),
  (error) => {
    safeLog.error('SSL Pinning interceptor error:', error);
    return Promise.reject(error);
  }
);

// Request interceptor - TenantId ekle
api.interceptors.request.use(
  async (config) => {
    try {
      // Request timing metadata (for duration logs)
      config.metadata = config.metadata || {};
      config.metadata.startTime = Date.now();

      // GÜVENLİK: SecureStorage'dan tenantId al (hassas veri)
      const tenantId = await secureStorage.getItem('tenantId');
      // GÜVENLİK: SecureStorage'dan access token al (varsa)
      const token = (await secureStorage.getItem('token')) || (await secureStorage.getItem('authToken'));
      
      config.headers['X-Tenant-Id'] = tenantId || '1';
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Güvenli loglama - hassas veriler otomatik temizlenir
      safeLog.api(
        config.method.toUpperCase(),
        `${config.baseURL}${config.url}`,
        config.data ? { keys: Object.keys(config.data) } : null,
        {
          event: 'request',
          // Note: duration is available on response/error
        }
      );
    } catch (error) {
      safeLog.error('Request interceptor error:', error);
      // Hata olsa bile request'i gönder
      config.headers['X-Tenant-Id'] = '1';
    }
    return config;
  },
  (error) => {
    safeLog.error('Request interceptor setup error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Hata yönetimi
api.interceptors.response.use(
  (response) => {
    // Başarılı response - 401 hata sayacını sıfırla
    if (response.status < 400) {
      unauthorizedErrorCount = 0;
    }

    // Duration (ms)
    const startTime = response.config?.metadata?.startTime;
    const durationMs = typeof startTime === 'number' ? Date.now() - startTime : null;
    const outcome =
      response.status < 400 ? 'success' : response.status < 500 ? 'client_error' : 'server_error';
    
    // Güvenli loglama - response data otomatik temizlenir
    safeLog.api(
      response.config.method.toUpperCase(),
      `${response.config.baseURL}${response.config.url}`,
      null,
      {
        outcome,
        status: response.status,
        durationMs,
        dataSize: JSON.stringify(response.data).length,
        success: response.data?.success,
        message: response.data?.message
      }
    );
    return response;
  },
  async (error) => {
    // Detaylı hata loglama
    const errorDetails = {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      fullURL: error.config?.baseURL + error.config?.url,
      headers: error.config?.headers,
      message: error.message,
      code: error.code,
    };
    
    if (error.response) {
      // Sunucu yanıt verdi ama hata kodu döndü
      safeLog.error('API Error Response:', {
        ...errorDetails,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
      
      // Also log via safeLog.api for consistent API outcome visibility
      const startTime = error.config?.metadata?.startTime;
      const durationMs = typeof startTime === 'number' ? Date.now() - startTime : null;
      const status = error.response.status;
      const outcome = status >= 500 ? 'server_error' : status >= 400 ? 'client_error' : 'http_error';
      safeLog.api(
        (error.config?.method || 'GET').toUpperCase(),
        `${error.config?.baseURL || ''}${error.config?.url || ''}`,
        null,
        {
          outcome,
          status,
          durationMs,
          code: error.code,
          message: error.response?.data?.message || error.message,
        }
      );
    } else if (error.request) {
      // İstek gönderildi ama yanıt alınamadı
      safeLog.error('API Error Request (No Response):', errorDetails);
      safeLog.debug('Possible causes: Network timeout, Server not responding, SSL certificate problem');

      const startTime = error.config?.metadata?.startTime;
      const durationMs = typeof startTime === 'number' ? Date.now() - startTime : null;
      safeLog.api(
        (error.config?.method || 'GET').toUpperCase(),
        `${error.config?.baseURL || ''}${error.config?.url || ''}`,
        null,
        {
          outcome: 'network_error',
          status: null,
          durationMs,
          code: error.code,
          message: error.message,
        }
      );
    } else {
      // İstek oluşturulurken hata
      safeLog.error('API Error Setup:', errorDetails);

      safeLog.api(
        (error.config?.method || 'GET').toUpperCase(),
        `${error.config?.baseURL || ''}${error.config?.url || ''}`,
        null,
        {
          outcome: 'setup_error',
          status: null,
          durationMs: null,
          code: error.code,
          message: error.message,
        }
      );
    }
    
    // Unauthorized - logout (401) - Sadece kritik endpoint'ler için
    // Bazı endpoint'ler authentication gerektirmeyebilir veya geçici hatalar olabilir
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const method = error.config?.method || '';
      
      // Kritik endpoint'ler - bunlar için logout yap
      const criticalEndpoints = [
        '/users/', // User profile endpoints
        '/orders/', // Order endpoints
        '/cart/', // Cart endpoints
        '/favorites/', // Favorites endpoints
        '/wallet/', // Wallet endpoints
        '/user-level/', // User level endpoints
        '/notifications/', // Notifications endpoints
        '/lists/', // Lists endpoints
        '/custom-production-requests/', // Custom production requests
        '/support-tickets/', // Support tickets
        '/user-addresses/', // User addresses
      ];
      
      // Kritik olmayan endpoint'ler - bunlar için logout yapma
      const nonCriticalEndpoints = [
        '/products/', // Product listing doesn't require auth
        '/categories', // Categories don't require auth
        '/sliders', // Sliders don't require auth
        '/stories', // Stories don't require auth
        '/flash-deals', // Flash deals don't require auth
        '/campaigns', // Campaigns don't require auth
        '/popups', // Popups don't require auth
        '/health', // Health check
        '/maintenance', // Maintenance check
      ];
      
      // Endpoint'in kritik olup olmadığını kontrol et
      const isCriticalEndpoint = criticalEndpoints.some(endpoint => url.includes(endpoint));
      const isNonCriticalEndpoint = nonCriticalEndpoints.some(endpoint => url.includes(endpoint));
      
      // Public endpoint'ler için logout yapma
      if (isNonCriticalEndpoint) {
        // Kritik olmayan endpoint - logout yapma, sadece log
        safeLog.debug('401 error on non-critical/public endpoint, skipping logout:', url);
        return Promise.reject(error);
      }
      
      // Kritik endpoint'ler için - sadece gerçekten login olan kullanıcılar için logout yap
      if (isCriticalEndpoint) {
        try {
          const isLoggedIn = await secureStorage.getItem('isLoggedIn');
          
          if (isLoggedIn === 'true') {
            // 401 hata sayacını artır
            const now = Date.now();
            if (now - lastUnauthorizedTime > UNAUTHORIZED_ERROR_RESET_TIME) {
              // 1 dakika geçti, sayacı sıfırla
              unauthorizedErrorCount = 0;
            }
            unauthorizedErrorCount++;
            lastUnauthorizedTime = now;
            
            // Sadece belirli sayıda 401 hatası alındıysa logout yap
            // Bu, geçici hataları filtreler
            if (unauthorizedErrorCount >= MAX_UNAUTHORIZED_ERRORS) {
              // GÜVENLİK: SecureStorage'dan hassas kullanıcı verilerini sil
              await secureStorage.multiRemove(['userId', 'userName', 'userEmail', 'userPhone', 'isLoggedIn', 'tenantId']);
              unauthorizedErrorCount = 0; // Sayacı sıfırla
              safeLog.debug(`User logged out due to ${MAX_UNAUTHORIZED_ERRORS} consecutive 401 errors on critical endpoint:`, url);
            } else {
              safeLog.debug(`401 error on critical endpoint (${unauthorizedErrorCount}/${MAX_UNAUTHORIZED_ERRORS}), not logging out yet:`, url);
            }
          }
        } catch (logoutError) {
          safeLog.error('Logout error:', logoutError);
        }
      } else {
        // Bilinmeyen endpoint - güvenlik için logout yapma, sadece log
        safeLog.debug('401 error on unknown endpoint, skipping logout for safety:', url);
      }
    }
    
    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================
export const authAPI = {
  login: (email, password) => api.post('/users/login', { email, password }),
  register: (userData) => api.post('/users', userData), // Backend endpoint: POST /api/users
  googleLogin: (idToken) => api.post('/auth/google/verify', { idToken }),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

// ==================== PRODUCTS API ====================
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getVariations: (productId) => api.get(`/products/${productId}/variations`),
  getCategories: () => api.get('/categories'),
  search: (query, filters) => api.get('/products/search', { params: { q: query, ...filters } }),
  searchByBarcode: (barcode) => api.get('/products/barcode', { params: { barcode } }),
  searchByImage: (imageUri, category = null) => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'search-image.jpg',
    });
    if (category) {
      formData.append('category', category);
    }
    return api.post('/products/search/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getByCategory: (category, params) => api.get('/products', { params: { category, ...params } }),
  getFeatured: (limit = 10) => api.get('/products/featured', { params: { limit } }),
  getRecommendations: (productId, limit = 6) => api.get(`/products/${productId}/recommendations`, { params: { limit } }),
};

// ==================== CART API ====================
export const cartAPI = {
  // Sepeti getir
  get: (userId) => api.get(`/cart/${userId}`),
  
  // Sepete ürün ekle
  add: (userId, productId, quantity, selectedVariations, price) => 
    api.post('/cart', { userId, productId, quantity, selectedVariations, price }),
  
  // Sepetteki ürün miktarını güncelle
  update: (cartItemId, quantity) => 
    api.put(`/cart/${cartItemId}`, { quantity }),
  
  // Sepetten ürün çıkar
  remove: (cartItemId) => 
    api.delete(`/cart/${cartItemId}`),
  
  // Sepeti temizle
  clear: (userId) => api.delete(`/cart/user/${userId}`),
  
  // Sepet toplamını getir
  getTotal: (userId) => api.get(`/cart/${userId}/total`),
  
  // Çıkış öncesi sepet kontrolü
  checkBeforeLogout: (userId) => api.post('/cart/check-before-logout', { userId }),
};

// ==================== ORDERS API ====================
export const ordersAPI = {
  create: (orderData) => api.post('/orders', orderData),
  getByUser: (userId) => api.get(`/orders/user/${userId}`),
  getById: (orderId) => api.get(`/orders/${orderId}`),
  track: (orderId) => api.get(`/orders/${orderId}/track`),
  getReturnable: (userId) => api.get('/orders/returnable', { params: { userId } }),
  cancel: (orderId) => api.put(`/orders/${orderId}/cancel`),
  getInvoice: (orderId) => api.get(`/orders/${orderId}/invoice`),
};

// ==================== INVOICES API ====================
export const invoicesAPI = {
  getByUser: (userId) => api.get(`/invoices/${userId}`),
  getBillingInvoices: (userId) => api.get(`/billing/invoices/${userId}`),
  getOrderInvoices: (userId) => api.get(`/orders/${userId}/invoices`),
  getByOrderId: (orderId) => api.get(`/orders/${orderId}/invoice`),
  getSharedInvoice: (token) => api.get(`/invoices/share/${token}`),
};

// ==================== B2B API ====================
export const b2bAPI = {
  // B2B hesap ve durum bilgileri
  getAccount: () => api.get('/b2b/account'),
  getStatus: () => api.get('/b2b/status'),

  // B2B ürünleri
  getProducts: (params) => api.get('/b2b/products', { params }),
  getProductById: (id) => api.get(`/b2b/products/${id}`),

  // Kredi ve faturalar
  getCreditSummary: () => api.get('/b2b/credit'),
  getCreditTransactions: (params) => api.get('/b2b/credit/transactions', { params }),
  getInvoices: (params) => api.get('/b2b/invoices', { params }),
  getInvoiceById: (id) => api.get(`/b2b/invoices/${id}`),

  // Raporlar
  getSalesReport: (params) => api.get('/b2b/reports/sales', { params }),
};

// ==================== USER API ====================
export const userAPI = {
  getProfile: (userId) => api.get(`/users/${userId}`),
  updateProfile: (userId, userData) => api.put(`/users/${userId}`, userData),
  changePassword: (userId, currentPassword, newPassword) => 
    api.put(`/users/${userId}/password`, { currentPassword, newPassword }),
  search: (query, excludeUserId) => api.get('/users/search', { params: { query, excludeUserId } }),
  
  // Two Factor Authentication
  getTwoFactorStatus: (userId) => api.get(`/users/${userId}/two-factor`),
  sendTwoFactorCode: (userId, phoneNumber) => api.post(`/users/${userId}/two-factor/send-code`, { phoneNumber }),
  verifyTwoFactorCode: (userId, code) => api.post(`/users/${userId}/two-factor/verify`, { code }),
  disableTwoFactor: (userId) => api.put(`/users/${userId}/two-factor/disable`),
  
  // Privacy Settings
  getPrivacySettings: (userId) => api.get(`/users/${userId}/privacy-settings`),
  updatePrivacySettings: (userId, settings) => api.put(`/users/${userId}/privacy-settings`, settings),
  
  // Addresses
  getAddresses: (userId, addressType) => api.get('/user-addresses', { params: { userId, addressType } }),
  addAddress: (addressData) => api.post('/user-addresses', addressData),
  updateAddress: (id, addressData) => api.put(`/user-addresses/${id}`, addressData),
  deleteAddress: (id) => api.delete(`/user-addresses/${id}`),
  setDefaultAddress: (id) => api.put(`/user-addresses/${id}/set-default`),
  
  // Profile Avatar
  uploadAvatar: (userId, imageUri) => {
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    });
    return api.post(`/users/${userId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteAvatar: (userId) => api.delete(`/users/${userId}/avatar`),
};

// ==================== USER LEVEL API ====================
export const userLevelAPI = {
  getLevel: (userId) => api.get(`/user-level/${userId}`),
  getHistory: (userId) => api.get(`/user-level/${userId}/history`),
  getStats: (userId) => api.get(`/user-level/${userId}/stats`),
  addExp: (userId, amount, source) => api.post(`/user-level/${userId}/add-exp`, { amount, source }),
  addPurchaseExp: (userId, orderAmount, orderId) => api.post(`/user-level/${userId}/purchase-exp`, { orderAmount, orderId }),
  addInvitationExp: (userId, invitedUserId) => api.post(`/user-level/${userId}/invitation-exp`, { invitedUserId }),
  addSocialShareExp: (userId, platform, contentType, contentId) => api.post(`/user-level/${userId}/social-share-exp`, { platform, contentType, contentId }),
  claimRewards: (userId, levelId) => api.post(`/user-level/${userId}/claim-rewards`, { levelId }),
  // Enhanced EXP System
  addProductViewExp: (userId, productId) => api.post(`/user-level/${userId}/product-view-exp`, { productId }),
  addToCartExp: (userId, productId) => api.post(`/user-level/${userId}/add-to-cart-exp`, { productId }),
  addToFavoriteExp: (userId, productId) => api.post(`/user-level/${userId}/add-to-favorite-exp`, { productId }),
  addDailyLoginExp: (userId) => api.post(`/user-level/${userId}/daily-login-exp`),
  getStreak: (userId) => api.get(`/user-level/${userId}/streak`),
  checkLevelUp: (userId) => api.post(`/user-level/${userId}/check-level-up`),
};

// ==================== WALLET API ====================
export const walletAPI = {
  // Bakiye ve İşlemler (Gerçek Backend Endpoint'leri)
  getBalance: (userId) => api.get(`/wallet/balance/${userId}`),
  getTransactions: (userId) => api.get(`/wallet/transactions/${userId}`),
  getTransfers: () => api.get('/wallet/transfers'),
  
  // Transfer
  transfer: (fromUserId, toUserId, amount, description) => 
    // Not: validateUserIdMatch('body') hem JWT'deki userId'yi hem de body.userId alanını bekliyor.
    // Bu yüzden userId alanını da fromUserId ile birlikte gönderiyoruz.
    api.post('/wallet/transfer', { userId: fromUserId, fromUserId, toUserId, amount, description }),
  
  // Bakiye Yükleme
  rechargeRequest: (userId, amount, paymentMethod, bankInfo, paymentCard, buyer) => 
    api.post('/wallet/recharge-request', { userId, amount, paymentMethod, bankInfo, paymentCard, buyer }),
  
  // Çekim Talebi (Banka Hesabına Transfer)
  createWithdrawRequest: (userId, amount, iban, accountHolderName) =>
    api.post('/wallet/withdraw-request', { userId, amount, iban, accountHolderName }),
  
  // Hediye Kartı
  useGiftCard: (userId, code) => 
    api.post('/wallet/gift-card', { userId, code }),
  
  // Ek endpoint'ler (backend'de yoksa çalışmaz)
  getPoints: (userId) => api.get(`/wallet/points/${userId}`),
  getPaymentMethods: (userId) => api.get(`/wallet/payment-methods/${userId}`),
  getVouchers: (userId) => api.get(`/wallet/gift-cards/${userId}`),
};

// ==================== USERS API ====================
export const usersAPI = {
  search: (query) => api.get('/users/search', { params: { query } }),
  getProfile: (userId) => api.get(`/users/${userId}`),
};

// ==================== NOTIFICATIONS API ====================
export const notificationsAPI = {
  // Bildirimleri getir
  getAll: (userId) => api.get('/notifications', { params: { userId } }),
  
  // Sistem bildirimi oluştur
  createSystem: (userId, title, message, type) => 
    api.post('/notifications/system', { userId, title, message, type }),
  
  // Bildirimi okundu işaretle
  markAsRead: (notificationId) => 
    api.put(`/notifications/${notificationId}/read`),
  
  // Tüm bildirimleri okundu işaretle
  markAllAsRead: (userId) => 
    api.put('/notifications/read-all', { userId }),
  
  // Bildirimi sil
  delete: (notificationId) => 
    api.delete(`/notifications/${notificationId}`),
};

// ==================== PAYMENT API ====================
export const paymentAPI = {
  process: (paymentData) => api.post('/payments/process', paymentData),
  getStatus: (paymentId) => api.get(`/payments/${paymentId}/status`),
  getTestCards: () => api.get('/payments/test-cards'),
};

// ==================== REVIEWS API ====================
export const reviewsAPI = {
  getByProduct: (productId) => api.get('/reviews', { params: { productId } }),
  create: (reviewData, images) => {
    const formData = new FormData();
    Object.keys(reviewData).forEach(key => {
      formData.append(key, reviewData[key]);
    });
    if (images && images.length > 0) {
      images.forEach((image, index) => {
        formData.append('images', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.name || `review_${index}.jpg`,
        });
      });
    }
    return api.post('/reviews', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id, reviewData) => api.put(`/reviews/${id}`, reviewData),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// ==================== PRODUCT QUESTIONS API ====================
export const productQuestionsAPI = {
  getByProduct: (productId) => api.get(`/product-questions`, { params: { productId } }),
  create: (questionData) => api.post('/product-questions', questionData),
  answer: (questionId, answerData) => api.post(`/product-questions/${questionId}/answer`, answerData),
  delete: (questionId) => api.delete(`/product-questions/${questionId}`),
  helpful: (questionId, userId) => api.post(`/product-questions/${questionId}/helpful`, { userId }),
};

// ==================== FAVORITES/WISHLIST API ====================
export const wishlistAPI = {
  // Gerçek Backend Endpoint'leri
  get: (userId) => api.get(`/favorites/user/${userId}`),
  add: (userId, productId) => api.post('/favorites', { userId, productId }),
  remove: (favoriteId, userId) => api.delete(`/favorites/${favoriteId}`, { params: { userId } }),
  
  // Alternatif: productId ile silme (backend'de favoriteId bulunamazsa)
  removeByProduct: (userId, productId) => api.delete(`/favorites/product/${productId}`, { params: { userId } }),
  
  // Toggle (varsa sil, yoksa ekle)
  toggle: (userId, productId) => api.post('/favorites/toggle', { userId, productId }),
};

// ==================== RETURN REQUESTS API ====================
export const returnRequestsAPI = {
  get: (userId) => api.get(`/returns/user/${userId}`),
  getReturnableOrders: (userId) => api.get(`/returns/returnable-orders/${userId}`),
  create: (requestData) => api.post('/returns', requestData),
  cancel: (returnRequestId, userId) => api.put(`/returns/${returnRequestId}/cancel`, { userId }),
};

// ==================== STORIES API ====================
export const storiesAPI = {
  getAll: () => api.get('/stories'),
  getActive: () => api.get('/stories'),
  view: (id) => api.post(`/stories/${id}/view`),
};

// ==================== SLIDERS API ====================
export const slidersAPI = {
  getAll: () => api.get('/sliders'),
  getActive: () => api.get('/sliders'),
  click: (id) => api.post(`/sliders/${id}/click`),
  view: (id) => api.post(`/sliders/${id}/view`),
};

// ==================== FLASH DEALS API ====================
export const flashDealsAPI = {
  getActive: () => api.get('/flash-deals'), // Backend'de /active yok, direkt /flash-deals aktif olanları döndürüyor
  getAll: () => api.get('/flash-deals'),
};

// ==================== PRICE ALERTS API ====================
export const priceAlertsAPI = {
  create: (userId, productId, targetPrice, alertType = 'below', percentageDiscount = null) => 
    api.post('/price-alerts', { userId, productId, targetPrice, alertType, percentageDiscount }),
  getUserAlerts: (userId, includeInactive = false) => 
    api.get(`/price-alerts/${userId}`, { params: { includeInactive } }),
  delete: (alertId, userId) => 
    api.delete(`/price-alerts/${alertId}`, { data: { userId } }),
  update: (alertId, userId, isActive) => 
    api.put(`/price-alerts/${alertId}`, { userId, isActive }),
};

// ==================== SPIN WHEEL API ====================
export const spinWheelAPI = {
  check: (userId) => api.get(`/spin-wheel/check/${userId}`),
  saveCode: (userId, discountPercent, discountCode) => 
    api.post('/spin-wheel/save-code', { userId, discountPercent, discountCode }),
  getCodes: (userId) => api.get(`/spin-wheel/codes/${userId}`),
};

// ==================== CAMPAIGNS API ====================
export const campaignsAPI = {
  getAll: () => api.get('/campaigns'),
  getAvailable: (userId) => api.get(`/campaigns/available/${userId}`),
  apply: (userId, campaignId) => api.post('/campaigns/apply', { userId, campaignId }),
};

// ==================== POPUPS API ====================
export const popupsAPI = {
  getActive: () => api.get('/popups'),
  view: (id) => api.post(`/popups/${id}/view`),
  click: (id) => api.post(`/popups/${id}/click`),
};

// ==================== RECOMMENDATIONS API ====================
export const recommendationsAPI = {
  getForUser: (userId) => api.get(`/recommendations/user/${userId}`),
  trackEvent: (userId, eventType, productId, eventValue, searchQuery, filterDetails) => 
    api.post('/recommendations/event', { userId, eventType, productId, eventValue, searchQuery, filterDetails }),
  getUserProfile: (userId) => api.get(`/recommendations/user/${userId}/profile`),
  rebuildProfile: (userId) => api.post(`/recommendations/user/${userId}/rebuild-profile`),
};

// ==================== CHATBOT API ====================
export const chatbotAPI = {
  sendMessage: (userId, message, sessionId, productId = null, actionType = 'text', messageHistory = null) => 
    api.post('/chatbot/message', { userId, message, sessionId, productId, actionType, messageHistory }),
  getHistory: (userId, sessionId) => 
    api.get('/chatbot/history', { params: { userId, sessionId } }),
  createSession: (userId) => api.post('/chatbot/session', { userId }),
};

// ==================== AI USAGE TIPS API ====================
export const aiTipsAPI = {
  getProductTips: (productId, productName, productCategory, productDescription) =>
    api.post('/ai/product-tips', { productId, productName, productCategory, productDescription }),
};

// ==================== AI ROUTE PLANNER API (Backend Gemini) ====================
export const aiRoutePlannerAPI = {
  /**
   * Kamp odaklı AI rota planı oluşturur.
   * Backend /api/ai/route-planner kullanır (gemini_config'den API key, kısa prompt).
   * Input too long hatasını önlemek için sadece gerekli alanlar gönderilir.
   */
  generateCampingRoute: (payload) => {
    const { latitude, longitude, city, country, terrain, durationDays, difficulty, gear } = payload || {};
    return api.post('/ai/route-planner', {
      latitude,
      longitude,
      city: city || null,
      country: country || null,
      terrain: terrain || 'mountain',
      durationDays: durationDays || 3,
      difficulty: difficulty || 'moderate',
      gear: Array.isArray(gear) ? gear.slice(0, 6) : [],
    });
  },
};

// ==================== CANLI DESTEK API ====================
export const liveSupportAPI = {
  sendMessage: async (userId, message) => {
    // Misafir kullanıcı için deviceId'yi de gönder
    let deviceId = null;
    if (userId < 0) {
      // Negatif userId = misafir kullanıcı
      try {
        // GÜVENLİK: SecureStorage'dan deviceId al
        deviceId = await secureStorage.getItem('guestDeviceId');
      } catch (error) {
        safeLog.error('DeviceId alınamadı:', error);
      }
    }
    return api.post('/chatbot/live-support/message', { userId, message, deviceId });
  },
  getHistory: (userId, deviceId = null) => {
    const url = `/chatbot/live-support/history/${userId}`;
    const params = deviceId ? { deviceId } : {};
    return api.get(url, { params });
  },
  getAdminMessages: (userId) => 
    api.get(`/chatbot/admin-messages/${userId}`),
  getConversations: (userId) => 
    api.get(`/chatbot/live-support/conversations/${userId}`),
};

// Events API removed

// Analytics API removed

// ==================== REFERRAL API ====================
export const referralAPI = {
  getReferralInfo: (userId) => api.get(`/referral/${userId}`),
  trackReferral: (referrerId, referredUserId, referralCode) => 
    api.post('/referral/track', { referrerId, referredUserId, referralCode }),
};

// ==================== GAMIFICATION API ====================
export const gamificationAPI = {
  // Daily Rewards
  getDailyReward: (userId) => api.get(`/gamification/daily-reward/${userId}`),
  claimDailyReward: (userId) => api.post(`/gamification/daily-reward/${userId}/claim`),
  getStreak: (userId) => api.get(`/gamification/daily-reward/${userId}/streak`),
  
  // Quests
  getQuests: (userId) => api.get(`/gamification/quests/${userId}`),
  getQuestById: (questId, userId) => api.get(`/gamification/quests/${questId}`, { params: { userId } }),
  claimQuestReward: (questId, userId) => api.post(`/gamification/quests/${questId}/claim`, { userId }),
  trackQuestProgress: (questId, userId, progress) => api.post(`/gamification/quests/${questId}/progress`, { userId, progress }),
  
  // Badges
  getBadges: (userId) => api.get(`/gamification/badges/${userId}`),
  getBadgeById: (badgeId, userId) => api.get(`/gamification/badges/${badgeId}`, { params: { userId } }),
  checkBadges: (userId) => api.post(`/gamification/badges/${userId}/check`),
  awardBadge: (userId, badgeId, badgeName, description, rarity) => 
    api.post(`/gamification/badges/${userId}/award`, { badgeId, badgeName, description, rarity }),
  
  // Lucky Draw
  getLuckyDrawInfo: (userId) => api.get(`/gamification/lucky-draw/${userId}`),
  spinLuckyDraw: (userId, points) => api.post(`/gamification/lucky-draw/${userId}/spin`, { points }),
};

// ==================== WELCOME BONUS API ====================
export const welcomeBonusAPI = {
  checkEligibility: (userId) => api.get(`/welcome-bonus/${userId}/eligibility`),
  claimWelcomeBonus: (userId) => api.post(`/welcome-bonus/${userId}/claim`),
  getWelcomePackages: () => api.get('/welcome-bonus/packages'),
};

// ==================== VIP PROGRAM API ====================
export const vipAPI = {
  getVIPStatus: (userId) => api.get(`/vip/${userId}/status`),
  getVIPBenefits: (userId) => api.get(`/vip/${userId}/benefits`),
  getExclusiveProducts: (userId) => api.get(`/vip/${userId}/exclusive-products`),
  getPersonalConsultant: (userId) => api.get(`/vip/${userId}/consultant`),
  getUpcomingEvents: (userId) => api.get(`/vip/${userId}/events`),
  convertExpToCoupon: (userId, expAmount) => api.post(`/vip/${userId}/convert-exp`, { expAmount }),
};

// ==================== SUBSCRIPTION API ====================
export const subscriptionAPI = {
  getSubscriptions: (userId) => api.get(`/subscriptions/${userId}`),
  createSubscription: (subscriptionData) => api.post('/subscriptions', subscriptionData),
  updateSubscription: (subscriptionId, subscriptionData) => api.put(`/subscriptions/${subscriptionId}`, subscriptionData),
  cancelSubscription: (subscriptionId) => api.delete(`/subscriptions/${subscriptionId}`),
  pauseSubscription: (subscriptionId) => api.post(`/subscriptions/${subscriptionId}/pause`),
  resumeSubscription: (subscriptionId) => api.post(`/subscriptions/${subscriptionId}/resume`),
  getFrequentOrders: (userId) => api.get(`/subscriptions/${userId}/frequent-orders`),
};

// ==================== SOCIAL SHARING API ====================
export const socialSharingAPI = {
  shareProduct: (userId, productId, platform) => api.post('/social-sharing/product', { userId, productId, platform }),
  shareWishlist: (userId, platform) => api.post('/social-sharing/wishlist', { userId, platform }),
  shareExperience: (userId, content, platform) => api.post('/social-sharing/experience', { userId, content, platform }),
  getShareRewards: (userId) => api.get(`/social-sharing/${userId}/rewards`),
  submitUGC: (userId, productId, imageUri, caption) => {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('productId', productId);
    formData.append('caption', caption);
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'ugc.jpg',
    });
    return api.post('/social-sharing/ugc', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ==================== FREE SAMPLES API ====================
export const freeSamplesAPI = {
  getAvailableSamples: () => api.get('/free-samples/available'),
  requestSample: (userId, productId) => api.post('/free-samples/request', { userId, productId }),
  getMySamples: (userId) => api.get(`/free-samples/${userId}`),
};

// ==================== CART ABANDONMENT API ====================
export const cartAbandonmentAPI = {
  getAbandonedCart: (userId) => api.get(`/cart-abandonment/${userId}`),
  sendReminder: (userId, cartId) => api.post(`/cart-abandonment/${userId}/reminder`, { cartId }),
  applyAbandonedCartOffer: (userId, cartId, offerCode) => api.post(`/cart-abandonment/${userId}/apply-offer`, { cartId, offerCode }),
};

// ==================== WIN-BACK CAMPAIGNS API ====================
export const winBackAPI = {
  getWinBackOffers: (userId) => api.get(`/win-back/${userId}/offers`),
  claimWinBackOffer: (userId, offerId) => api.post(`/win-back/${userId}/claim`, { offerId }),
};

// ==================== WHOLESALE API ====================
export const wholesaleAPI = {
  apply: (formData) => api.post('/wholesale/apply', formData),
  getApplicationStatus: (email) => api.get('/wholesale/status', { params: { email } }),
};

// ==================== STYLE ADVISOR API ====================
export const styleAdvisorAPI = {
  getRecommendations: (userId, productId, stylePreferences, occasion, budget) =>
    api.post('/style-advisor/recommend', {
      userId,
      productId,
      stylePreferences,
      occasion,
      budget,
    }),
};

// ==================== HEALTH CHECK & MAINTENANCE ====================
export const healthAPI = {
  check: () => api.get('/health'),
  maintenance: (platform = 'mobile') => api.get('/maintenance/status', { params: { platform } }),
};

export default api;
