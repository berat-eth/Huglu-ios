import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import secureStorage from '../utils/secureStorage';
import Input from '../components/Input';
import Button from '../components/Button';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';
import { COLORS } from '../constants/colors';
import { authAPI } from '../services/api';
import { 
  getBiometricLoginEnabled, 
  setBiometricLoginEnabled,
  getStoredCredentials, 
  saveCredentialsForBiometric,
  getBiometricSupport,
  authenticateWithBiometrics,
  isBiometricLoginReady
} from '../utils/biometricLock';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Biometric login states
  const [showBiometricButton, setShowBiometricButton] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showEnableBiometricModal, setShowEnableBiometricModal] = useState(false);
  const [pendingUserData, setPendingUserData] = useState(null);
  const [biometricType, setBiometricType] = useState('finger-print');

  // Check biometric login availability on mount
  useEffect(() => {
    checkBiometricLogin();
  }, []);

  const checkBiometricLogin = async () => {
    try {
      const isReady = await isBiometricLoginReady();
      const support = await getBiometricSupport();
      
      if (isReady) {
        setShowBiometricButton(true);
        // Check biometric type for icon
        if (support.supportedTypes.includes(2)) {
          setBiometricType('scan-outline'); // Face ID
        } else {
          setBiometricType('finger-print'); // Fingerprint
        }
      }
    } catch (error) {
      console.log('Error checking biometric login:', error);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setBiometricLoading(true);
      
      const result = await authenticateWithBiometrics({
        promptMessage: 'Parmak izi veya yüz tanıma ile giriş yapın',
        cancelLabel: 'İptal',
      });
      
      if (result.success) {
        // Check if token is still valid
        const token = await secureStorage.getItem('token');
        const isLoggedIn = await secureStorage.getItem('isLoggedIn');
        
        if (token && isLoggedIn === 'true') {
          // Token exists, navigate to main
          navigation.replace('Main');
        } else {
          // Token expired, need to login again
          setErrorMessage('Oturum süreniz dolmuş. Lütfen şifrenizle giriş yapın.');
          setShowErrorModal(true);
          setShowBiometricButton(false);
        }
      } else {
        if (result.error !== 'user_cancel' && result.error !== 'system_cancel') {
          setErrorMessage('Biyometrik doğrulama başarısız');
          setShowErrorModal(true);
        }
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      setErrorMessage('Biyometrik giriş sırasında bir hata oluştu');
      setShowErrorModal(true);
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleLogin = async () => {
    // Validasyon
    if (!email || !password) {
      setErrorMessage('Lütfen tüm alanları doldurun');
      setShowErrorModal(true);
      return;
    }

    if (!email.includes('@')) {
      setErrorMessage('Geçerli bir e-posta adresi girin');
      setShowErrorModal(true);
      return;
    }

    try {
      setLoading(true);
      console.log('🔐 Logging in...', { email });

      const response = await authAPI.login(email, password);
      console.log('✅ Login response:', response.data);

      if (response.data.success) {
        const userData = response.data.data;
        const tokens = userData?.tokens || response.data?.tokens;
        
        // GÜVENLİK: Kullanıcı bilgilerini SecureStorage'da kaydet (hassas veriler)
        const pairs = [
          ['userId', userData.id?.toString() || ''],
          ['userName', userData.name || email.split('@')[0]],
          ['userEmail', userData.email || email],
          ['userPhone', userData.phone || ''],
          ['tenantId', userData.tenantId?.toString() || '1'],
          ['isLoggedIn', 'true'],
        ];
        
        // JWT token'ları (backend sağlıyorsa) kaydet
        if (tokens?.accessToken) pairs.push(['token', tokens.accessToken]);
        if (tokens?.refreshToken) pairs.push(['refreshToken', tokens.refreshToken]);
        
        await secureStorage.multiSet(pairs);

        // İlk giriş için B2C modunu varsayılan olarak ayarla
        try {
          const existingB2BMode = await secureStorage.getItem('isB2BMode');
          if (existingB2BMode === null) {
            await secureStorage.setItem('isB2BMode', 'false');
            console.log('✅ B2C mode set as default for new login');
          }
        } catch (b2bError) {
          console.warn('B2B mode initialization error:', b2bError);
        }

        console.log('✅ Login successful, user data saved');
        
        // Check if biometric is available and not already enabled
        const biometricEnabled = await getBiometricLoginEnabled();
        const support = await getBiometricSupport();
        
        if (!biometricEnabled && support.isEnrolled) {
          // Store user data for later and show biometric enable prompt
          setPendingUserData({ email, userId: userData.id });
          setShowEnableBiometricModal(true);
        } else {
          setShowSuccessModal(true);
        }
      } else {
        setErrorMessage(response.data.message || 'Giriş başarısız');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Giriş yapılamadı');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    try {
      if (pendingUserData) {
        await saveCredentialsForBiometric(pendingUserData.email, pendingUserData.userId);
        await setBiometricLoginEnabled(true);
        console.log('✅ Biometric login enabled');
      }
    } catch (error) {
      console.error('Error enabling biometric:', error);
    } finally {
      setShowEnableBiometricModal(false);
      setPendingUserData(null);
      setShowSuccessModal(true);
    }
  };

  const handleSkipBiometric = () => {
    setShowEnableBiometricModal(false);
    setPendingUserData(null);
    setShowSuccessModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image 
            source={require('../../assets/logo.jpg')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Hoş Geldiniz</Text>
          <Text style={styles.subtitle}>Macera için hazırlanın.</Text>

          <View style={styles.form}>
            <Input
              label="E-posta Adresi"
              placeholder="ornek@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              icon="mail-outline"
            />

            <Input
              label="Şifre"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon="lock-closed-outline"
            />

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>Şifremi Unuttum?</Text>
            </TouchableOpacity>

            <Button 
              title={loading ? 'Giriş yapılıyor...' : 'Giriş Yap'} 
              onPress={handleLogin} 
              style={styles.loginButton}
              disabled={loading}
            />
            {loading && (
              <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
            )}
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>veya devam et</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialButtons}>
            {/* Biometric Login Button */}
            {showBiometricButton && (
              <TouchableOpacity 
                style={[styles.socialButton, styles.biometricButton]}
                onPress={handleBiometricLogin}
                disabled={biometricLoading}
              >
                {biometricLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <>
                    <Ionicons name={biometricType} size={22} color={COLORS.primary} />
                    <Text style={[styles.socialButtonText, styles.biometricButtonText]}>Biyometrik</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-google" size={20} color={COLORS.textMain} />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
            {!showBiometricButton && (
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-apple" size={20} color={COLORS.textMain} />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Hesabınız yok mu? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.footerLink}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigation.replace('Main');
        }}
        title="Başarılı"
        message="Giriş yapıldı!"
        onActionPress={() => {
          setShowSuccessModal(false);
          navigation.replace('Main');
        }}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorMessage}
      />

      {/* Enable Biometric Modal */}
      <Modal
        visible={showEnableBiometricModal}
        transparent
        animationType="fade"
        onRequestClose={handleSkipBiometric}
      >
        <View style={styles.biometricModalOverlay}>
          <View style={styles.biometricModalContainer}>
            <View style={styles.biometricModalIconContainer}>
              <Ionicons name="finger-print" size={56} color={COLORS.primary} />
            </View>
            <Text style={styles.biometricModalTitle}>Hızlı Giriş</Text>
            <Text style={styles.biometricModalDescription}>
              Bir sonraki girişinizde parmak izi veya yüz tanıma ile hızlıca giriş yapmak ister misiniz?
            </Text>
            <TouchableOpacity 
              style={styles.biometricModalButton}
              onPress={handleEnableBiometric}
              activeOpacity={0.8}
            >
              <Ionicons name="finger-print" size={20} color={COLORS.white} />
              <Text style={styles.biometricModalButtonText}>Biyometrik Girişi Etkinleştir</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.biometricModalSkipButton}
              onPress={handleSkipBiometric}
              activeOpacity={0.7}
            >
              <Text style={styles.biometricModalSkipText}>Şimdilik Geç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 180,
    height: 180,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray500,
    marginBottom: 32,
  },
  form: {
    marginBottom: 24,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loginButton: {
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray200,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: COLORS.gray400,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
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
  loader: {
    marginTop: 12,
  },
  // Biometric button styles
  biometricButton: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    backgroundColor: COLORS.primary + '10',
  },
  biometricButtonText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  // Biometric enable modal styles
  biometricModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  biometricModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  biometricModalIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  biometricModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
    textAlign: 'center',
  },
  biometricModalDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  biometricModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  biometricModalButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  biometricModalSkipButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  biometricModalSkipText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
