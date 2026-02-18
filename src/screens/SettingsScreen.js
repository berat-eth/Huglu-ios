import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useTranslation } from 'react-i18next';
import InfoModal from '../components/InfoModal';
import {
  authenticateWithBiometrics,
  getBiometricLockEnabled,
  getBiometricSupport,
  setBiometricLockEnabled,
  getBiometricLoginEnabled,
  setBiometricLoginEnabled,
  getBiometricTransferEnabled,
  setBiometricTransferEnabled,
  clearBiometricCredentials,
} from '../utils/biometricLock';

export default function SettingsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricLoginEnabled, setBiometricLoginEnabledState] = useState(false);
  const [biometricTransferEnabled, setBiometricTransferEnabledState] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  const biometricStatusText = useMemo(() => {
    if (!biometricAvailable) return t('settings.biometricUnsupported');
    if (!biometricEnrolled) return t('settings.biometricNotEnrolled');
    return biometricEnabled ? t('settings.enabled') : t('settings.disabled');
  }, [biometricAvailable, biometricEnrolled, biometricEnabled, t]);

  const currentLanguageLabel = useMemo(() => {
    const lang = (i18n?.language || 'tr').split('-')[0];
    if (lang === 'en') return 'English';
    if (lang === 'de') return 'Deutsch';
    if (lang === 'fr') return 'Français';
    if (lang === 'ar') return 'العربية';
    return 'Türkçe';
  }, [i18n?.language]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const [enabled, loginEnabled, transferEnabled, support] = await Promise.all([
          getBiometricLockEnabled(),
          getBiometricLoginEnabled(),
          getBiometricTransferEnabled(),
          getBiometricSupport(),
        ]);
        if (!isMounted) return;
        setBiometricEnabledState(enabled);
        setBiometricLoginEnabledState(loginEnabled);
        setBiometricTransferEnabledState(transferEnabled);
        setBiometricAvailable(!!support?.hasHardware);
        setBiometricEnrolled(!!support?.isEnrolled);
      } catch {
        // sessiz geç
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  async function toggleBiometric(nextValue) {
    if (biometricBusy) return;

    if (!biometricAvailable) {
      Alert.alert(t('settings.biometric.title'), t('settings.biometric.notSupported'));
      return;
    }
    if (!biometricEnrolled) {
      Alert.alert(t('settings.biometric.title'), t('settings.biometric.notEnrolled'));
      return;
    }

    try {
      setBiometricBusy(true);
      const result = await authenticateWithBiometrics({
        promptMessage: nextValue ? t('settings.biometric.enablePrompt') : t('settings.biometric.disablePrompt'),
        cancelLabel: t('common.cancel'),
        disableDeviceFallback: false,
      });

      if (!result?.success) {
        Alert.alert(t('settings.biometric.title'), t('settings.biometric.authFailed'));
        return;
      }

      await setBiometricLockEnabled(nextValue);
      setBiometricEnabledState(nextValue);

      Alert.alert(t('settings.biometricLock'), nextValue ? t('settings.biometric.lockEnabled') : t('settings.biometric.lockDisabled'));
    } catch (e) {
      Alert.alert(t('settings.biometric.title'), t('settings.biometric.error'));
    } finally {
      setBiometricBusy(false);
    }
  }

  async function toggleBiometricLogin(nextValue) {
    if (biometricBusy) return;

    if (!biometricAvailable) {
      Alert.alert('Biyometrik Giriş', 'Cihazınız biyometrik doğrulamayı desteklemiyor.');
      return;
    }
    if (!biometricEnrolled) {
      Alert.alert('Biyometrik Giriş', 'Lütfen önce cihaz ayarlarından parmak izi veya yüz tanıma ekleyin.');
      return;
    }

    try {
      setBiometricBusy(true);
      const result = await authenticateWithBiometrics({
        promptMessage: nextValue ? 'Biyometrik girişi etkinleştirmek için doğrulayın' : 'Biyometrik girişi devre dışı bırakmak için doğrulayın',
        cancelLabel: t('common.cancel'),
        disableDeviceFallback: false,
      });

      if (!result?.success) {
        Alert.alert('Biyometrik Giriş', 'Doğrulama başarısız oldu.');
        return;
      }

      await setBiometricLoginEnabled(nextValue);
      setBiometricLoginEnabledState(nextValue);

      if (!nextValue) {
        // If disabling, clear stored credentials
        await clearBiometricCredentials();
      }

      Alert.alert('Biyometrik Giriş', nextValue ? 'Biyometrik giriş etkinleştirildi.' : 'Biyometrik giriş devre dışı bırakıldı.');
    } catch (e) {
      Alert.alert('Biyometrik Giriş', 'Bir hata oluştu.');
    } finally {
      setBiometricBusy(false);
    }
  }

  async function toggleBiometricTransfer(nextValue) {
    if (biometricBusy) return;

    if (!biometricAvailable) {
      Alert.alert('Transfer Güvenliği', 'Cihazınız biyometrik doğrulamayı desteklemiyor.');
      return;
    }
    if (!biometricEnrolled) {
      Alert.alert('Transfer Güvenliği', 'Lütfen önce cihaz ayarlarından parmak izi veya yüz tanıma ekleyin.');
      return;
    }

    try {
      setBiometricBusy(true);
      const result = await authenticateWithBiometrics({
        promptMessage: nextValue ? 'Transfer güvenliğini etkinleştirmek için doğrulayın' : 'Transfer güvenliğini devre dışı bırakmak için doğrulayın',
        cancelLabel: t('common.cancel'),
        disableDeviceFallback: false,
      });

      if (!result?.success) {
        Alert.alert('Transfer Güvenliği', 'Doğrulama başarısız oldu.');
        return;
      }

      await setBiometricTransferEnabled(nextValue);
      setBiometricTransferEnabledState(nextValue);

      Alert.alert('Transfer Güvenliği', nextValue ? 'Transfer güvenliği etkinleştirildi.' : 'Transfer güvenliği devre dışı bırakıldı.');
    } catch (e) {
      Alert.alert('Transfer Güvenliği', 'Bir hata oluştu.');
    } finally {
      setBiometricBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="notifications-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t('settings.pushTitle')}</Text>
                  <Text style={styles.settingDescription}>{t('settings.pushDesc')}</Text>
                </View>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="mail-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t('settings.emailTitle')}</Text>
                  <Text style={styles.settingDescription}>{t('settings.emailDesc')}</Text>
                </View>
              </View>
              <Switch
                value={emailNotifications}
                onValueChange={setEmailNotifications}
                trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="chatbubble-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t('settings.smsTitle')}</Text>
                  <Text style={styles.settingDescription}>{t('settings.smsDesc')}</Text>
                </View>
              </View>
              <Switch
                value={smsNotifications}
                onValueChange={setSmsNotifications}
                trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="moon-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t('settings.darkModeTitle')}</Text>
                  <Text style={styles.settingDescription}>{t('settings.darkModeDesc')}</Text>
                </View>
              </View>
              <Switch
                value={darkMode}
                onValueChange={(value) => {
                  if (value) {
                    setShowDevModal(true);
                  }
                }}
                trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('Language')}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="language-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t('settings.languageTitle')}</Text>
                  <Text style={styles.settingDescription}>{currentLanguageLabel}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.privacySecurity')}</Text>
          <View style={styles.settingsCard}>
            {/* Biometric App Lock */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="lock-closed-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t('settings.biometricLock')}</Text>
                  <Text style={styles.settingDescription}>Uygulamaya dönüşte biyometrik doğrulama</Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={toggleBiometric}
                trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                thumbColor={COLORS.white}
                disabled={!biometricAvailable || !biometricEnrolled || biometricBusy}
              />
            </View>

            <View style={styles.divider} />

            {/* Biometric Login */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="finger-print-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Biyometrik Giriş</Text>
                  <Text style={styles.settingDescription}>Parmak izi veya yüz tanıma ile hızlı giriş</Text>
                </View>
              </View>
              <Switch
                value={biometricLoginEnabled}
                onValueChange={toggleBiometricLogin}
                trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                thumbColor={COLORS.white}
                disabled={!biometricAvailable || !biometricEnrolled || biometricBusy}
              />
            </View>

            <View style={styles.divider} />

            {/* Biometric Transfer Verification */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Transfer Güvenliği</Text>
                  <Text style={styles.settingDescription}>Para transferlerinde biyometrik onay</Text>
                </View>
              </View>
              <Switch
                value={biometricTransferEnabled}
                onValueChange={toggleBiometricTransfer}
                trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                thumbColor={COLORS.white}
                disabled={!biometricAvailable || !biometricEnrolled || biometricBusy}
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="key-outline" size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.settingTitle}>{t('settings.changePassword')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('TwoFactorAuth')}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="keypad-outline" size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.settingTitle}>{t('settings.twoFactor')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
            </TouchableOpacity>

          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('TermsOfService')}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="document-text-outline" size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.settingTitle}>{t('settings.terms')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('PrivacyPolicy')}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="shield-outline" size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.settingTitle}>{t('settings.privacyPolicy')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t('settings.appVersion')}</Text>
                  <Text style={styles.settingDescription}>v1.0.0</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.dangerButton}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            <Text style={styles.dangerButtonText}>Hesabı Sil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Development Modal */}
      <InfoModal
        visible={showDevModal}
        onClose={() => setShowDevModal(false)}
        title="Geliştirme Aşamasında"
        message="Bu özellik şu anda geliştirme aşamasındadır. Yakında kullanıma sunulacaktır. Anlayışınız için teşekkür ederiz."
        actionButtonText="ANLADIM"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray500,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginLeft: 68,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.error,
  },
});
