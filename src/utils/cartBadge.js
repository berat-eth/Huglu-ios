import { cartAPI } from '../services/api';
import { secureStorage } from './secureStorage';

/**
 * Sepet badge sayısını günceller
 * @param {string} userId - Kullanıcı ID'si
 * @returns {Promise<number>} Güncellenmiş sepet sayısı
 */
export const updateCartBadge = async (userId) => {
  try {
    if (!userId) {
      await secureStorage.setItem('cartCount', '0');
      return 0;
    }

    const response = await cartAPI.get(userId);
    
    if (response.data?.success) {
      const cartItems = response.data.cart?.items || response.data.data?.items || [];
      const totalCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
      await secureStorage.setItem('cartCount', totalCount.toString());
      console.log('🛒 Badge güncellendi:', totalCount);
      return totalCount;
    }
    
    await secureStorage.setItem('cartCount', '0');
    return 0;
  } catch (error) {
    console.error('❌ Badge güncelleme hatası:', error.message);
    await secureStorage.setItem('cartCount', '0');
    return 0;
  }
};

/**
 * Sepet badge sayısını alır
 * @returns {Promise<number>} Sepet sayısı
 */
export const getCartBadgeCount = async () => {
  try {
    const count = await secureStorage.getItem('cartCount');
    return parseInt(count || '0', 10);
  } catch (error) {
    console.error('❌ Badge okuma hatası:', error.message);
    return 0;
  }
};

/**
 * Sepet badge sayısını sıfırlar
 */
export const clearCartBadge = async () => {
  try {
    await secureStorage.setItem('cartCount', '0');
    console.log('🛒 Badge temizlendi');
  } catch (error) {
    console.error('❌ Badge temizleme hatası:', error.message);
  }
};
