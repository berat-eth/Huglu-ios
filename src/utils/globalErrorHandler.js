import { isServerError } from './errorHandler';

/**
 * Global sunucu hatası callback'i
 * Bu callback, tüm ekranlardan çağrılabilir
 */
let globalServerErrorCallback = null;

/**
 * Global sunucu hatası callback'ini ayarla
 * @param {Function} callback - Sunucu hatası olduğunda çağrılacak fonksiyon
 */
export const setGlobalServerErrorCallback = (callback) => {
  globalServerErrorCallback = callback;
};

/**
 * Global sunucu hatası callback'ini temizle
 */
export const clearGlobalServerErrorCallback = () => {
  globalServerErrorCallback = null;
};

/**
 * Sunucu hatası olduğunda global callback'i çağır
 * @param {Error} error - Hata nesnesi
 */
export const triggerGlobalServerError = (error) => {
  if (isServerError(error) && globalServerErrorCallback) {
    globalServerErrorCallback(error);
  }
};

export default {
  setGlobalServerErrorCallback,
  clearGlobalServerErrorCallback,
  triggerGlobalServerError,
};
