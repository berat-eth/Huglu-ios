// API Configuration
// GÜVENLİK: API key artık hardcoded değil, expo-constants ile environment variable'dan alınır

import Constants from 'expo-constants';

// Yerel ağ için (aynı WiFi'de)
// Windows: ipconfig -> IPv4 Address
// Mac/Linux: ifconfig -> inet
export const API_CONFIG = {
  // Development - Production URL kullan (local backend yoksa)
  LOCAL: 'https://api.huglutekstil.com/api',
  
  // Production
  PRODUCTION: 'https://api.huglutekstil.com/api',
  
  // GÜVENLİK: API Key artık environment variable'dan alınır
  // Build zamanında EXPO_PUBLIC_API_KEY set edilmeli
  // Fallback olarak app.config.js'deki extra.apiKey kullanılır
  API_KEY: Constants.expoConfig?.extra?.apiKey || 
           process.env.EXPO_PUBLIC_API_KEY || 
           process.env.API_KEY || 
           null, // API key yoksa null döner, uygulama hata verecek
  
  // Timeout
  TIMEOUT: 30000,
};

// Aktif ortam seçimi
export const getApiUrl = () => {
  // Environment variable'dan API URL al, yoksa production kullan
  return Constants.expoConfig?.extra?.apiUrl || API_CONFIG.PRODUCTION;
};

// API key kontrolü
export const validateApiKey = () => {
  if (!API_CONFIG.API_KEY) {
    console.error('❌ API_KEY bulunamadı! EXPO_PUBLIC_API_KEY environment variable\'ı set edilmeli.');
    throw new Error('API_KEY configuration missing. Please set EXPO_PUBLIC_API_KEY environment variable.');
  }
  return true;
};

export default API_CONFIG;