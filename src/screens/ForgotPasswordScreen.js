import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Input from '../components/Input';
import Button from '../components/Button';
import { COLORS } from '../constants/colors';
import { useAlert } from '../hooks/useAlert';

export default function ForgotPasswordScreen({ navigation }) {
  const alert = useAlert();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    // Validasyon
    if (!email.trim()) {
      alert.show('Hata', 'Lütfen e-posta adresinizi girin');
      return;
    }

    if (!email.includes('@')) {
      alert.show('Hata', 'Geçerli bir e-posta adresi girin');
      return;
    }

    try {
      setLoading(true);
      
      // API çağrısı simülasyonu
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setEmailSent(true);
      alert.show(
        'E-posta Gönderildi',
        'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.',
        [{ text: 'Tamam' }]
      );
    } catch (error) {
      console.error('Şifre sıfırlama hatası:', error);
      alert.show('Hata', 'Şifre sıfırlama bağlantısı gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
        </View>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={48} color={COLORS.primary} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Şifremi Unuttum</Text>
          <Text style={styles.subtitle}>
            {emailSent 
              ? 'E-posta adresinize şifre sıfırlama bağlantısı gönderdik. Lütfen gelen kutunuzu kontrol edin.'
              : 'E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.'
            }
          </Text>

          {!emailSent && (
            <View style={styles.form}>
              <Input
                label="E-posta Adresi"
                placeholder="ornek@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                icon="mail-outline"
              />

              <Button 
                title={loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'} 
                onPress={handleResetPassword} 
                style={styles.resetButton}
                disabled={loading}
              />
            </View>
          )}

          {emailSent && (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color={COLORS.primary} />
              </View>
              
              <Button 
                title="E-postayı Tekrar Gönder" 
                onPress={handleResetPassword} 
                style={styles.resendButton}
                disabled={loading}
              />

              <TouchableOpacity 
                onPress={() => navigation.goBack()} 
                style={styles.backToLoginButton}
              >
                <Text style={styles.backToLoginText}>Giriş Sayfasına Dön</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info Box */}
        {!emailSent && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              E-posta gelmedi mi? Spam klasörünü kontrol etmeyi unutmayın.
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Şifrenizi hatırladınız mı? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.footerLink}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <alert.AlertComponent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.gray500,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  form: {
    marginBottom: 24,
  },
  resetButton: {
    marginTop: 16,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIcon: {
    marginBottom: 32,
  },
  resendButton: {
    marginBottom: 16,
    width: '100%',
  },
  backToLoginButton: {
    paddingVertical: 12,
  },
  backToLoginText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMain,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
