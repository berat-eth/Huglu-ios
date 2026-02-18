import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { secureStorage } from '../utils/secureStorage';

const SUPPORTED_LANGUAGES = ['tr', 'en', 'de', 'fr', 'ar'];
const DEFAULT_LANGUAGE = 'tr';

function normalizeLanguageTag(tag) {
  if (!tag) return DEFAULT_LANGUAGE;
  // "en-US" -> "en"
  const base = String(tag).split('-')[0].toLowerCase();
  return SUPPORTED_LANGUAGES.includes(base) ? base : DEFAULT_LANGUAGE;
}

export const resources = {
  tr: {
    translation: {
      common: {
        back: 'Geri',
        save: 'Kaydet',
        cancel: 'İptal',
        ok: 'Tamam',
      },
      language: {
        title: 'Dil Seçimi',
        infoTitle: 'Uygulama Dilini Seçin',
        infoText:
          'Uygulamanın görüntüleneceği dili seçin. Değişiklik anında uygulanacaktır.',
        note:
          'Bazı diller henüz tam olarak desteklenmemektedir. Uygulama çoğunlukla Türkçe görüntülenecektir.',
        changedTitle: 'Dil Değiştirildi',
        changedMessage:
          'Dil tercihiniz kaydedildi. Bazı ekranlarda tam uygulanması için uygulamayı yeniden başlatmanız gerekebilir.',
      },
      settings: {
        title: 'Ayarlar',
        notifications: 'Bildirimler',
        appearance: 'Görünüm',
        privacySecurity: 'Gizlilik & Güvenlik',
        about: 'Hakkında',
        pushTitle: 'Push Bildirimleri',
        pushDesc: 'Anlık bildirimler al',
        emailTitle: 'E-posta Bildirimleri',
        emailDesc: 'Kampanya ve fırsatlar',
        smsTitle: 'SMS Bildirimleri',
        smsDesc: 'Sipariş güncellemeleri',
        darkModeTitle: 'Karanlık Mod',
        darkModeDesc: 'Gece teması kullan',
        languageTitle: 'Dil',
        accountTypeTitle: 'Hesap Tipi',
        accountTypeDesc: 'Bireysel veya kurumsal',
        individual: 'Bireysel',
        corporate: 'Kurumsal',
        changePassword: 'Şifre Değiştir',
        twoFactor: 'İki Faktörlü Doğrulama',
        privacySettings: 'Gizlilik Ayarları',
        terms: 'Kullanım Koşulları',
        privacyPolicy: 'Gizlilik Politikası',
        appVersion: 'Uygulama Sürümü',
        biometricLock: 'Biyometrik Kilit',
        biometricUnsupported: 'Cihaz desteklemiyor',
        biometricNotEnrolled: 'Biyometri kayıtlı değil',
        enabled: 'Açık',
        disabled: 'Kapalı',
        biometric: {
          title: 'Biyometri',
          notSupported: 'Bu cihaz Face ID / Parmak İzi desteklemiyor.',
          notEnrolled: 'Cihazınızda biyometrik veri kayıtlı değil. (Ayarlar > Güvenlik)',
          authFailed: 'Doğrulama başarısız / iptal edildi.',
          lockEnabled:
            'Biyometrik kilit açıldı. Uygulama arka plandan döndüğünde doğrulama isteyecek.',
          lockDisabled: 'Biyometrik kilit kapatıldı.',
          error: 'İşlem sırasında hata oluştu.',
          enablePrompt: 'Biyometrik kilidi etkinleştir',
          disablePrompt: 'Biyometrik kilidi kapat',
        },
      },
      lock: {
        title: 'Uygulama Kilitli',
        subtitle: 'Devam etmek için Face ID / Parmak İzi doğrulaması yapın.',
        verify: 'Doğrula',
        canceled: 'Doğrulama iptal edildi.',
        failed: 'Doğrulama başarısız. Tekrar deneyin.',
        error: 'Doğrulama sırasında hata oluştu.',
        prompt: 'Uygulamaya erişim için doğrulayın',
      },
      tabs: {
        home: 'Ana Sayfa',
        shop: 'Mağaza',
        wishlist: 'Favoriler',
        profile: 'Profil',
      },
    },
  },
  en: {
    translation: {
      common: { back: 'Back', save: 'Save', cancel: 'Cancel', ok: 'OK' },
      language: {
        title: 'Language',
        infoTitle: 'Choose App Language',
        infoText: 'Select the language. Changes will apply immediately.',
        note: 'Some languages are not fully supported yet. Most of the app may remain in Turkish.',
        changedTitle: 'Language Updated',
        changedMessage: 'Your preference is saved. You may need to restart the app for some screens.',
      },
      settings: {
        title: 'Settings',
        notifications: 'Notifications',
        appearance: 'Appearance',
        privacySecurity: 'Privacy & Security',
        about: 'About',
        pushTitle: 'Push Notifications',
        pushDesc: 'Receive instant notifications',
        emailTitle: 'Email Notifications',
        emailDesc: 'Campaigns and deals',
        smsTitle: 'SMS Notifications',
        smsDesc: 'Order updates',
        darkModeTitle: 'Dark Mode',
        darkModeDesc: 'Use night theme',
        languageTitle: 'Language',
        accountTypeTitle: 'Account Type',
        accountTypeDesc: 'Individual or corporate',
        individual: 'Individual',
        corporate: 'Corporate',
        changePassword: 'Change Password',
        twoFactor: 'Two-Factor Authentication',
        privacySettings: 'Privacy Settings',
        terms: 'Terms of Service',
        privacyPolicy: 'Privacy Policy',
        appVersion: 'App Version',
        biometricLock: 'Biometric Lock',
        biometricUnsupported: 'Not supported',
        biometricNotEnrolled: 'No biometrics enrolled',
        enabled: 'On',
        disabled: 'Off',
        biometric: {
          title: 'Biometrics',
          notSupported: 'This device does not support Face ID / Fingerprint.',
          notEnrolled: 'No biometrics enrolled on this device. (Settings > Security)',
          authFailed: 'Authentication failed / cancelled.',
          lockEnabled: 'Biometric lock enabled. You will be asked when returning from background.',
          lockDisabled: 'Biometric lock disabled.',
          error: 'An error occurred.',
          enablePrompt: 'Enable biometric lock',
          disablePrompt: 'Disable biometric lock',
        },
      },
      lock: {
        title: 'App Locked',
        subtitle: 'Verify with Face ID / Fingerprint to continue.',
        verify: 'Verify',
        canceled: 'Authentication cancelled.',
        failed: 'Authentication failed. Try again.',
        error: 'An error occurred during authentication.',
        prompt: 'Authenticate to access the app',
      },
      tabs: { home: 'Home', shop: 'Shop', wishlist: 'Wishlist', profile: 'Profile' },
    },
  },
  de: { translation: { common: { back: 'Zurück', save: 'Speichern', cancel: 'Abbrechen', ok: 'OK' } } },
  fr: { translation: { common: { back: 'Retour', save: 'Enregistrer', cancel: 'Annuler', ok: 'OK' } } },
  ar: { translation: { common: { back: 'رجوع', save: 'حفظ', cancel: 'إلغاء', ok: 'حسناً' } } },
};

let initialized = false;

export async function initI18n() {
  if (initialized) return i18n;

  let stored = null;
  try {
    stored = await secureStorage.getItem('appLanguage');
  } catch {
    stored = null;
  }

  const deviceLocale = Localization.getLocales?.()?.[0]?.languageTag;
  const startLanguage = normalizeLanguageTag(stored || deviceLocale || DEFAULT_LANGUAGE);

  i18n.use(initReactI18next).init({
    resources,
    lng: startLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v3',
    returnNull: false,
  });

  initialized = true;
  return i18n;
}

export async function changeAppLanguage(nextLanguage) {
  const lang = normalizeLanguageTag(nextLanguage);
  await secureStorage.setItem('appLanguage', lang);
  await i18n.changeLanguage(lang);
  return lang;
}

export function getCurrentLanguage() {
  return i18n.language || DEFAULT_LANGUAGE;
}

export default i18n;