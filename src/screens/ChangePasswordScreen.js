import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import Input from '../components/Input';
import Button from '../components/Button';
import { COLORS } from '../constants/colors';
import { userAPI } from '../services/api';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChangePassword = async () => {
    // Validasyon
    if (!currentPassword.trim()) {
      setErrorMessage('Lütfen mevcut şifrenizi girin');
      setShowErrorModal(true);
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage('Lütfen yeni şifrenizi girin');
      setShowErrorModal(true);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Yeni şifre en az 6 karakter olmalıdır');
      setShowErrorModal(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Yeni şifreler eşleşmiyor');
      setShowErrorModal(true);
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage('Yeni şifre mevcut şifre ile aynı olamaz');
      setShowErrorModal(true);
      return;
    }

    try {
      setLoading(true);
      const userId = await secureStorage.getItem('userId');
      
      if (!userId) {
        setErrorMessage('Lütfen giriş yapın');
        setShowErrorModal(true);
        return;
      }

      // API'ye şifre değiştirme isteği gönder
      try {
        await userAPI.changePassword(
          userId,
          currentPassword.trim(),
          newPassword.trim()
        );

        setShowSuccessModal(true);
        // Başarılı olduktan sonra formu temizle
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (error) {
        console.error('Şifre değiştirme hatası:', error);
        setErrorMessage(error.response?.data?.message || 'Şifre değiştirilirken bir hata oluştu');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Şifre değiştirme hatası:', error);
      setErrorMessage('Şifre değiştirilirken bir hata oluştu');
      setShowErrorModal(true);
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
        <Text style={styles.headerTitle}>Şifre Değiştir</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="lock-closed-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.infoTitle}>Güvenli Şifre Oluşturun</Text>
          <Text style={styles.infoText}>
            Şifreniz en az 6 karakter olmalı ve güçlü bir kombinasyon içermelidir.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Mevcut Şifre *"
            placeholder="Mevcut şifrenizi girin"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            icon="lock-closed-outline"
          />

          <Input
            label="Yeni Şifre *"
            placeholder="Yeni şifrenizi girin"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            icon="lock-closed-outline"
          />

          <Input
            label="Yeni Şifre Tekrar *"
            placeholder="Yeni şifrenizi tekrar girin"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            icon="lock-closed-outline"
          />

          {/* Password Requirements */}
          <View style={styles.requirementsCard}>
            <Text style={styles.requirementsTitle}>Şifre Gereksinimleri:</Text>
            <View style={styles.requirementItem}>
              <Ionicons 
                name={newPassword.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'} 
                size={16} 
                color={newPassword.length >= 6 ? COLORS.primary : COLORS.gray400} 
              />
              <Text style={[
                styles.requirementText,
                newPassword.length >= 6 && styles.requirementTextMet
              ]}>
                En az 6 karakter
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons 
                name={newPassword === confirmPassword && confirmPassword.length > 0 ? 'checkmark-circle' : 'ellipse-outline'} 
                size={16} 
                color={newPassword === confirmPassword && confirmPassword.length > 0 ? COLORS.primary : COLORS.gray400} 
              />
              <Text style={[
                styles.requirementText,
                newPassword === confirmPassword && confirmPassword.length > 0 && styles.requirementTextMet
              ]}>
                Şifreler eşleşiyor
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Button
          title="Şifreyi Değiştir"
          onPress={handleChangePassword}
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
        message="Şifreniz başarıyla değiştirildi"
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorMessage}
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
  form: {
    padding: 16,
  },
  requirementsCard: {
    marginTop: 8,
    padding: 16,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: COLORS.gray600,
  },
  requirementTextMet: {
    color: COLORS.primary,
    fontWeight: '600',
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

