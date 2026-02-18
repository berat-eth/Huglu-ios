import { healthAPI } from '../services/api';

/**
 * Bakım modu kontrolü yapar
 * @param {string} platform - Platform tipi (mobile, web, admin)
 * @returns {Promise<{isMaintenanceMode: boolean, message: string, estimatedEndTime: string}>}
 */
export const checkMaintenanceMode = async (platform = 'mobile') => {
  try {
    const response = await healthAPI.maintenance(platform);
    
    if (response.data?.success !== undefined) {
      // API yanıtı var
      const data = response.data.data || response.data;
      // Backend 'enabled' döndürüyor, ayrıca isMaintenanceMode ve isMaintenance de kontrol et
      const isMaintenanceMode = data.enabled || data.isMaintenanceMode || data.isMaintenance || false;
      const message = data.message || '';
      const estimatedEndTime = data.estimatedEndTime || null;
      
      return {
        isMaintenanceMode,
        message,
        estimatedEndTime,
      };
    }
    
    // Başarısız yanıt - bakım modu yok kabul et
    return {
      isMaintenanceMode: false,
      message: '',
      estimatedEndTime: null,
    };
  } catch (error) {
    // Hata durumunda bakım modu yok kabul et (uygulama çalışmaya devam etsin)
    return {
      isMaintenanceMode: false,
      message: '',
      estimatedEndTime: null,
    };
  }
};

/**
 * Bakım modu mesajını formatlar
 * @param {string} message - Bakım modu mesajı
 * @param {string} estimatedEndTime - Tahmini bitiş zamanı
 * @returns {string} Formatlanmış mesaj
 */
export const formatMaintenanceMessage = (message, estimatedEndTime) => {
  if (!message) {
    return 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.';
  }
  
  if (estimatedEndTime) {
    const endDate = new Date(estimatedEndTime);
    const formattedDate = endDate.toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    return `${message}\n\nTahmini bitiş: ${formattedDate}`;
  }
  
  return message;
};
