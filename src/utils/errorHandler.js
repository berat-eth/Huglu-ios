/**
 * API hatalarını kontrol eder ve sunucu hatası olup olmadığını belirler
 * @param {Error} error - Axios veya diğer hata nesnesi
 * @returns {boolean} - Sunucu hatası ise true
 */
export const isServerError = (error) => {
  // Network hatası (sunucuya ulaşılamıyor)
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return true;
  }
  
  // İstek gönderildi ama yanıt alınamadı
  if (error.request && !error.response) {
    return true;
  }
  
  // 5xx sunucu hataları
  if (error.response && error.response.status >= 500) {
    return true;
  }
  
  // Network error mesajları
  if (error.message) {
    const networkErrors = [
      'Network Error',
      'Network request failed',
      'timeout',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ENETUNREACH',
    ];
    
    return networkErrors.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }
  
  return false;
};

/**
 * Hata mesajını kullanıcı dostu formata çevirir
 * @param {Error} error - Hata nesnesi
 * @returns {string} - Kullanıcı dostu hata mesajı
 */
export const getErrorMessage = (error) => {
  // Sunucu hatası
  if (isServerError(error)) {
    return 'Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.';
  }
  
  // API yanıt hatası
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return data?.message || 'Geçersiz istek. Lütfen bilgilerinizi kontrol edin.';
      case 401:
        return 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
      case 403:
        return 'Bu işlem için yetkiniz yok.';
      case 404:
        return 'İstenen kaynak bulunamadı.';
      case 409:
        return data?.message || 'Bu işlem çakışma yarattı.';
      case 422:
        return data?.message || 'Girdiğiniz bilgiler geçersiz.';
      case 429:
        return 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.';
      default:
        return data?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.';
    }
  }
  
  // Genel hata
  return error.message || 'Beklenmeyen bir hata oluştu.';
};

/**
 * Hata durumunda alert göstermek için kullanılacak yardımcı fonksiyon
 * Component'lerde useAlert hook'u ile birlikte kullanılmalıdır
 * 
 * Kullanım örneği:
 * const alert = useAlert();
 * const message = getErrorMessage(error);
 * alert.show('Hata', message);
 * 
 * @deprecated showErrorAlert kaldırıldı, her component kendi useAlert hook'unu kullanmalı
 */

/**
 * API çağrısını try-catch ile sarmalayıp hata yönetimi yapar
 * @param {Function} apiCall - API çağrısı fonksiyonu
 * @param {Function} onServerError - Sunucu hatası callback'i (opsiyonel)
 * @returns {Promise} - API yanıtı veya hata
 */
export const handleApiCall = async (apiCall, onServerError = null) => {
  try {
    const response = await apiCall();
    return { success: true, data: response.data };
  } catch (error) {
    console.error('API Error:', error);
    
    // Sunucu hatası varsa ve callback verilmişse çağır
    if (isServerError(error) && onServerError) {
      onServerError(error);
    }
    
    return { 
      success: false, 
      error, 
      message: getErrorMessage(error),
      isServerError: isServerError(error)
    };
  }
};

export default {
  isServerError,
  getErrorMessage,
  handleApiCall,
};
