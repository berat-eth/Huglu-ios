import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import SuccessModal from '../components/SuccessModal';
import { useTranslation } from 'react-i18next';
import { changeAppLanguage, getCurrentLanguage } from '../i18n';

const LANGUAGES = [
  { id: 'tr', name: 'Türkçe', nativeName: 'Türkçe', flag: '🇹🇷' },
  { id: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { id: 'de', name: 'Deutsch', nativeName: 'Deutsch', flag: '🇩🇪' },
  { id: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { id: 'ar', name: 'العربية', nativeName: 'العربية', flag: '🇸🇦' },
];

export default function LanguageScreen({ navigation }) {
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState('tr');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const stored = await secureStorage.getItem('appLanguage');
      if (stored) {
        setSelectedLanguage(stored);
      } else {
        setSelectedLanguage(getCurrentLanguage() || 'tr');
      }
    } catch (error) {
      console.error('Dil yükleme hatası:', error);
    }
  };

  const handleSelectLanguage = async (languageId) => {
    try {
      setSelectedLanguage(languageId);
      await changeAppLanguage(languageId);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Dil kaydetme hatası:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('language.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="language-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.infoTitle}>{t('language.infoTitle')}</Text>
          <Text style={styles.infoText}>
            {t('language.infoText')}
          </Text>
        </View>

        {/* Language List */}
        <View style={styles.section}>
          <View style={styles.settingsCard}>
            {LANGUAGES.map((language, index) => (
              <View key={language.id}>
                <TouchableOpacity
                  style={styles.languageItem}
                  onPress={() => handleSelectLanguage(language.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.languageLeft}>
                    <Text style={styles.languageFlag}>{language.flag}</Text>
                    <View style={styles.languageInfo}>
                      <Text style={styles.languageName}>{language.name}</Text>
                      <Text style={styles.languageNative}>{language.nativeName}</Text>
                    </View>
                  </View>
                  {selectedLanguage === language.id && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
                {index < LANGUAGES.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Note */}
        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.gray500} />
          <Text style={styles.noteText}>
            {t('language.note')}
          </Text>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
        title={t('language.changedTitle')}
        message={t('language.changedMessage')}
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
  settingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    overflow: 'hidden',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  languageFlag: {
    fontSize: 32,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  languageNative: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginLeft: 68,
  },
  noteCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    flexDirection: 'row',
    gap: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray600,
    lineHeight: 18,
  },
});
















