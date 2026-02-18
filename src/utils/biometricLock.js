import * as LocalAuthentication from 'expo-local-authentication';
import { secureStorage } from './secureStorage';

// Storage keys
const BIOMETRIC_LOCK_ENABLED_KEY = 'biometric_lock_enabled';
const BIOMETRIC_LOGIN_ENABLED_KEY = 'biometric_login_enabled';
const BIOMETRIC_TRANSFER_ENABLED_KEY = 'biometric_transfer_enabled';
const ENCRYPTED_CREDENTIALS_KEY = 'encrypted_user_credentials';

// ==================== App Lock (Existing) ====================

export async function getBiometricLockEnabled() {
  const raw = await secureStorage.getItem(BIOMETRIC_LOCK_ENABLED_KEY);
  return raw === '1' || raw === 'true';
}

export async function setBiometricLockEnabled(enabled) {
  await secureStorage.setItem(BIOMETRIC_LOCK_ENABLED_KEY, enabled ? '1' : '0');
}

// ==================== Biometric Login ====================

export async function getBiometricLoginEnabled() {
  const raw = await secureStorage.getItem(BIOMETRIC_LOGIN_ENABLED_KEY);
  return raw === '1' || raw === 'true';
}

export async function setBiometricLoginEnabled(enabled) {
  await secureStorage.setItem(BIOMETRIC_LOGIN_ENABLED_KEY, enabled ? '1' : '0');
}

export async function saveCredentialsForBiometric(email, userId) {
  // Store email and userId (not password) for biometric login
  // After biometric success, we use stored token for auto-login
  await secureStorage.setItem(ENCRYPTED_CREDENTIALS_KEY, JSON.stringify({ email, userId }));
}

export async function getStoredCredentials() {
  try {
    const raw = await secureStorage.getItem(ENCRYPTED_CREDENTIALS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Error getting stored credentials:', error);
    return null;
  }
}

export async function clearBiometricCredentials() {
  await secureStorage.removeItem(ENCRYPTED_CREDENTIALS_KEY);
  await secureStorage.removeItem(BIOMETRIC_LOGIN_ENABLED_KEY);
}

// ==================== Biometric Transfer Verification ====================

export async function getBiometricTransferEnabled() {
  const raw = await secureStorage.getItem(BIOMETRIC_TRANSFER_ENABLED_KEY);
  return raw === '1' || raw === 'true';
}

export async function setBiometricTransferEnabled(enabled) {
  await secureStorage.setItem(BIOMETRIC_TRANSFER_ENABLED_KEY, enabled ? '1' : '0');
}

// ==================== Core Biometric Functions ====================

export async function getBiometricSupport() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
  const supportedTypes = hasHardware ? await LocalAuthentication.supportedAuthenticationTypesAsync() : [];
  return { hasHardware, isEnrolled, supportedTypes };
}

export async function authenticateWithBiometrics(options = {}) {
  const {
    promptMessage = 'Kimliğinizi doğrulayın',
    cancelLabel = 'İptal',
    disableDeviceFallback = false,
    fallbackLabel,
  } = options;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel,
    disableDeviceFallback,
    fallbackLabel,
  });

  return result;
}

// ==================== Utility Functions ====================

// Check if biometric login is available and ready
export async function isBiometricLoginReady() {
  const biometricEnabled = await getBiometricLoginEnabled();
  const credentials = await getStoredCredentials();
  const support = await getBiometricSupport();
  
  return biometricEnabled && credentials && support.isEnrolled;
}

// Check if biometric transfer verification is available
export async function isBiometricTransferReady() {
  const transferEnabled = await getBiometricTransferEnabled();
  const support = await getBiometricSupport();
  
  return transferEnabled && support.isEnrolled;
}

// Clear all biometric data (for logout)
export async function clearAllBiometricData() {
  await secureStorage.removeItem(ENCRYPTED_CREDENTIALS_KEY);
  await secureStorage.removeItem(BIOMETRIC_LOGIN_ENABLED_KEY);
  // Note: We don't clear BIOMETRIC_LOCK_ENABLED_KEY or BIOMETRIC_TRANSFER_ENABLED_KEY
  // as these are device preferences, not user-specific data
}

