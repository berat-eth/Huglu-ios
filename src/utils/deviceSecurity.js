/**
 * Cihaz Güvenlik Kontrolü
 * Root/jailbreak detection ve güvenlik kontrolleri
 */

import * as Device from 'expo-device';

/**
 * Cihazın root/jailbreak yapılmış olup olmadığını kontrol et
 * Not: Expo Go'da tam root detection çalışmayabilir, development build gerekir
 */
export async function checkDeviceSecurity() {
  const securityIssues = [];

  try {
    // Cihaz tipi kontrolü
    const deviceType = Device.deviceType;
    
    // Emulator/Simulator kontrolü (production'da risk oluşturabilir)
    if (deviceType === Device.DeviceType.UNKNOWN) {
      securityIssues.push({
        level: 'warning',
        issue: 'Cihaz tipi belirlenemedi',
        message: 'Cihaz tipi bilinmiyor, emulator/simulator olabilir'
      });
    }

    // iOS için jailbreak kontrolü (temel seviye)
    if (Device.osName === 'iOS') {
      // iOS'ta jailbreak detection için native modül gerekir
      // Burada sadece temel kontrol yapıyoruz
      securityIssues.push({
        level: 'info',
        issue: 'iOS Jailbreak Detection',
        message: 'Tam jailbreak detection için native modül gerekir (react-native-device-info)'
      });
    }

    // Android için root kontrolü (temel seviye)
    if (Device.osName === 'Android') {
      // Android'de root detection için native modül gerekir
      // Burada sadece temel kontrol yapıyoruz
      securityIssues.push({
        level: 'info',
        issue: 'Android Root Detection',
        message: 'Tam root detection için native modül gerekir (react-native-device-info)'
      });
    }

    return {
      isSecure: securityIssues.filter(issue => issue.level === 'error').length === 0,
      issues: securityIssues,
      deviceInfo: {
        osName: Device.osName,
        osVersion: Device.osVersion,
        deviceType: deviceType,
        modelName: Device.modelName,
        brand: Device.brand
      }
    };
  } catch (error) {
    console.error('❌ Device security check error:', error);
    return {
      isSecure: false,
      issues: [{
        level: 'error',
        issue: 'Security Check Failed',
        message: error.message
      }],
      deviceInfo: null
    };
  }
}

/**
 * Güvenli olmayan cihazlarda uygulamayı kısıtla
 */
export async function enforceDeviceSecurity() {
  const securityCheck = await checkDeviceSecurity();
  
  if (!securityCheck.isSecure) {
    const criticalIssues = securityCheck.issues.filter(issue => issue.level === 'error');
    
    if (criticalIssues.length > 0) {
      // Kritik güvenlik sorunları varsa uyarı ver
      console.warn('⚠️ Güvenlik uyarısı:', criticalIssues);
      
      // Production'da uygulamayı kısıtlayabilir veya kapatabilirsiniz
      // Şimdilik sadece uyarı veriyoruz
      return {
        shouldRestrict: true,
        message: 'Cihazınız güvenlik açısından riskli görünüyor. Uygulama bazı özellikleri kısıtlayabilir.',
        issues: criticalIssues
      };
    }
  }
  
  return {
    shouldRestrict: false,
    message: null,
    issues: []
  };
}

/**
 * Cihaz bilgilerini güvenli şekilde al
 */
export function getDeviceInfo() {
  try {
    return {
      osName: Device.osName,
      osVersion: Device.osVersion,
      deviceType: Device.deviceType,
      modelName: Device.modelName,
      brand: Device.brand,
      isDevice: Device.isDevice
    };
  } catch (error) {
    console.error('❌ Get device info error:', error);
    return null;
  }
}

export default {
  checkDeviceSecurity,
  enforceDeviceSecurity,
  getDeviceInfo
};
