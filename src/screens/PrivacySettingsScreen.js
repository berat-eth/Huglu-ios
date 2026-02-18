import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import Button from '../components/Button';
import { COLORS } from '../constants/colors';
import { userAPI } from '../services/api';
import SuccessModal from '../components/SuccessModal';
import { useAlert } from '../hooks/useAlert';

export default function PrivacySettingsScreen({ navigation }) {
  const alert = useAlert();
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [showEmail, setShowEmail] = useState(true);
  const [showPhone, setShowPhone] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [allowSearch, setAllowSearch] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const userId = await secureStorage.getItem('userId');
      if (!userId) return;

      try {
        const response = await userAPI.getPrivacySettings(userId);
        if (response.data?.success) {
          const settings = response.data.settings || {};
          setProfileVisibility(settings.profileVisibility || 'public');
          setShowEmail(settings.showEmail !== false);
          setShowPhone(settings.showPhone || false);
          setShowActivity(settings.showActivity !== false);
          setAllowSearch(settings.allowSearch !== false);
          setAllowMessages(settings.allowMessages !== false);
        }
      } catch (error) {
        console.log('Gizlilik ayarları yüklenemedi, varsayılanlar kullanılıyor:', error);
        // Local storage'dan yükle
        const stored = await secureStorage.getItem('privacySettings');
        if (stored) {
          const settings = JSON.parse(stored);
          setProfileVisibility(settings.profileVisibility || 'public');
          setShowEmail(settings.showEmail !== false);
          setShowPhone(settings.showPhone || false);
          setShowActivity(settings.showActivity !== false);
          setAllowSearch(settings.allowSearch !== false);
          setAllowMessages(settings.allowMessages !== false);
        }
      }
    } catch (error) {
      console.error('Gizlilik ayarları yükleme hatası:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const userId = await secureStorage.getItem('userId');
      
      if (!userId) {
        alert.show('Hata', 'Lütfen giriş yapın');
        return;
      }

      const settings = {
        profileVisibility,
        showEmail,
        showPhone,
        showActivity,
        allowSearch,
        allowMessages,
      };

      // Local storage'a kaydet
      await secureStorage.setItem('privacySettings', JSON.stringify(settings));

      // API'ye gönder
      try {
        await userAPI.updatePrivacySettings(userId, settings);
      } catch (error) {
        console.log('Gizlilik ayarları API\'ye kaydedilemedi:', error);
      }

      setShowSuccessModal(true);
    } catch (error) {
      console.error('Gizlilik ayarları kaydetme hatası:', error);
      alert.show('Hata', 'Ayarlar kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gizlilik Ayarları</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="eye-off-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.infoTitle}>Gizliliğinizi Kontrol Edin</Text>
          <Text style={styles.infoText}>
            Hangi bilgilerinizin görünür olacağını ve kimlerin sizinle iletişim kurabileceğini belirleyin.
          </Text>
        </View>

        {/* Profile Visibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil Görünürlüğü</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setProfileVisibility('public')}
            >
              <View style={styles.optionLeft}>
                <View style={styles.optionIcon}>
                  <Ionicons name="globe-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Herkese Açık</Text>
                  <Text style={styles.optionDescription}>Profiliniz herkes tarafından görülebilir</Text>
                </View>
              </View>
              {profileVisibility === 'public' && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setProfileVisibility('friends')}
            >
              <View style={styles.optionLeft}>
                <View style={styles.optionIcon}>
                  <Ionicons name="people-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Sadece Arkadaşlar</Text>
                  <Text style={styles.optionDescription}>Sadece arkadaşlarınız profilinizi görebilir</Text>
                </View>
              </View>
              {profileVisibility === 'friends' && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setProfileVisibility('private')}
            >
              <View style={styles.optionLeft}>
                <View style={styles.optionIcon}>
                  <Ionicons name="lock-closed-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Gizli</Text>
                  <Text style={styles.optionDescription}>Profiliniz sadece siz tarafından görülebilir</Text>
                </View>
              </View>
              {profileVisibility === 'private' && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="mail-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>E-posta Adresini Göster</Text>
                  <Text style={styles.settingDescription}>Diğer kullanıcılar e-posta adresinizi görebilir</Text>
                </View>
              </View>
              <Switch
                value={showEmail}
                onValueChange={setShowEmail}
                trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="call-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Telefon Numarasını Göster</Text>
                  <Text style={styles.settingDescription}>Diğer kullanıcılar telefon numaranızı görebilir</Text>
                </View>
              </View>
              <Switch
                value={showPhone}
                onValueChange={setShowPhone}
                trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>
          </View>
        </View>

        {/* Activity & Search */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aktivite ve Arama</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="time-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Aktivite Geçmişini Göster</Text>
                  <Text style={styles.settingDescription}>Son aktiviteleriniz görüntülenebilir</Text>
                </View>
              </View>
              <Switch
                value={showActivity}
                onValueChange={setShowActivity}
                trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="search-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Aramalarda Görün</Text>
                  <Text style={styles.settingDescription}>Diğer kullanıcılar sizi arayabilir</Text>
                </View>
              </View>
              <Switch
                value={allowSearch}
                onValueChange={setAllowSearch}
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
                  <Text style={styles.settingTitle}>Mesaj Al</Text>
                  <Text style={styles.settingDescription}>Diğer kullanıcılar size mesaj gönderebilir</Text>
                </View>
              </View>
              <Switch
                value={allowMessages}
                onValueChange={setAllowMessages}
                trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Button
          title="Ayarları Kaydet"
          onPress={handleSave}
          loading={loading}
        />
      </SafeAreaView>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
        title="Başarılı"
        message="Gizlilik ayarlarınız kaydedildi"
      />
      <alert.AlertComponent />
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
  scrollContent: {
    paddingBottom: 24,
  },
  infoCard: {
    margin: 16,
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    alignItems: 'center',
  },
  infoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    padding: 16,
    paddingTop: 0,
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
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  bottomBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
});





















