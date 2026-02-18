import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import Input from '../components/Input';
import Button from '../components/Button';
import { COLORS } from '../constants/colors';
import { authAPI, userLevelAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

export default function SignUpScreen({ navigation, route }) {
  const alert = useAlert();
  const [accountType, setAccountType] = useState('individual'); // 'individual' veya 'corporate'
  
  // Bireysel hesap alanları
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [referralCode, setReferralCode] = useState(route?.params?.referralCode || '');
  
  // Kurumsal hesap alanları
  const [companyName, setCompanyName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [authorizedPerson, setAuthorizedPerson] = useState('');
  
  // Ortak alanlar
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatDateInput = (text) => {
    // Sadece rakamları al
    const numbers = text.replace(/[^\d]/g, '');
    
    // Otomatik format: GG/AA/YYYY
    if (numbers.length <= 2) {
      setDateOfBirth(numbers);
    } else if (numbers.length <= 4) {
      setDateOfBirth(`${numbers.slice(0, 2)}/${numbers.slice(2)}`);
    } else {
      setDateOfBirth(`${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`);
    }
  };

  const handleSignUp = async () => {
    // Bireysel hesap validasyonu
    if (accountType === 'individual') {
      if (!fullName || !email || !dateOfBirth || !password || !confirmPassword) {
        alert.show('Hata', 'Lütfen tüm alanları doldurun');
        return;
      }

      if (!email.includes('@')) {
        alert.show('Hata', 'Geçerli bir e-posta adresi girin');
        return;
      }

      // Doğum tarihi formatı kontrolü
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (!dateRegex.test(dateOfBirth)) {
        alert.show('Hata', 'Doğum tarihi formatı GG/AA/YYYY olmalıdır (örn: 15/08/1994)');
        return;
      }
    }
    
    // Kurumsal hesap validasyonu
    if (accountType === 'corporate') {
      if (!companyName || !taxNumber || !companyEmail || !companyAddress || !authorizedPerson || !password || !confirmPassword) {
        alert.show('Hata', 'Lütfen tüm alanları doldurun');
        return;
      }

      if (!companyEmail.includes('@')) {
        alert.show('Hata', 'Geçerli bir e-posta adresi girin');
        return;
      }

      // Vergi numarası kontrolü (10 veya 11 haneli olmalı)
      if (taxNumber.length < 10 || taxNumber.length > 11) {
        alert.show('Hata', 'Vergi numarası 10 veya 11 haneli olmalıdır');
        return;
      }
    }

    // GÜVENLİK: Password policy kontrolü - Backend ile uyumlu
    if (password.length < 8) {
      alert.show('Hata', 'Şifre en az 8 karakter olmalıdır');
      return;
    }

    // Karmaşıklık gereksinimleri: büyük harf, küçük harf, rakam, özel karakter
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      alert.show(
        'Hata',
        'Şifre en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter (@$!%*?&) içermelidir'
      );
      return;
    }

    if (password !== confirmPassword) {
      alert.show('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    if (!agreeTerms) {
      alert.show('Hata', 'Kullanım koşullarını kabul etmelisiniz');
      return;
    }

    try {
      setLoading(true);
      console.log('📝 Signing up...', { accountType, fullName, email, dateOfBirth, companyName, taxNumber });

      const userData = accountType === 'individual' 
        ? {
            name: fullName,
            email: email,
            password: password,
            dateOfBirth: dateOfBirth,
            referralCode: referralCode || undefined,
            accountType: 'individual',
          }
        : {
            name: authorizedPerson, // Yetkili kişi adı name alanına
            companyName: companyName,
            taxNumber: taxNumber,
            email: companyEmail,
            address: companyAddress,
            authorizedPerson: authorizedPerson,
            password: password,
            accountType: 'corporate',
          };

      const response = await authAPI.register(userData);
      console.log('✅ Register response:', response.data);

      if (response.data.success) {
        const user = response.data.data;
        const newUserId = user.id?.toString() || '';
        
        // Kullanıcı bilgilerini kaydet
        if (accountType === 'individual') {
          await secureStorage.multiSet([
            ['userId', newUserId],
            ['userName', user.name || fullName],
            ['userEmail', user.email || email],
            ['userPhone', user.phone || ''],
            ['userDateOfBirth', dateOfBirth],
            ['accountType', 'individual'],
            ['tenantId', '1'],
            ['isLoggedIn', 'true'],
          ]);
        } else {
          await secureStorage.multiSet([
            ['userId', newUserId],
            ['userName', user.name || authorizedPerson], // Yetkili kişi adı userName olarak
            ['companyName', user.companyName || companyName],
            ['taxNumber', user.taxNumber || taxNumber],
            ['userEmail', user.email || companyEmail],
            ['companyAddress', companyAddress],
            ['authorizedPerson', authorizedPerson],
            ['accountType', 'corporate'],
            ['tenantId', '1'],
            ['isLoggedIn', 'true'],
          ]);
        }

        // Referral kodu sadece bireysel hesaplar için
        if (accountType === 'individual' && referralCode) {
          try {
            // Referral kodundan userId'yi çıkar (örn: HUGLU123 -> 123)
            const referrerIdMatch = referralCode.match(/\d+$/);
            if (referrerIdMatch) {
              const referrerId = referrerIdMatch[0];
              await userLevelAPI.addInvitationExp(referrerId, newUserId);
              console.log('✅ Davet EXP eklendi, referrer:', referrerId);
            }
          } catch (expError) {
            console.log('⚠️ Davet EXP eklenemedi:', expError.message);
          }
        }

        console.log('✅ Registration successful, user data saved');
        
        // Yeni kayıt için B2C modunu varsayılan olarak ayarla
        try {
          await secureStorage.setItem('isB2BMode', 'false');
          console.log('✅ B2C mode set as default for new registration');
        } catch (b2bError) {
          console.warn('B2B mode initialization error:', b2bError);
        }
        
        const welcomeMessage = (accountType === 'individual' && referralCode)
          ? 'Hesabınız oluşturuldu! Sizi davet eden arkadaşınız bonus EXP kazandı! 🎉'
          : accountType === 'corporate'
          ? 'Kurumsal hesabınız oluşturuldu! 🏢'
          : 'Hesabınız oluşturuldu!';
        
        alert.show('Başarılı', welcomeMessage, [
          { text: 'Tamam', onPress: () => navigation.replace('Main') }
        ]);
      } else {
        alert.show('Hata', response.data.message || 'Kayıt başarısız');
      }
    } catch (error) {
      console.error('❌ Register error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Kayıt yapılamadı';
      alert.show('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hesap Oluştur</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Maceraya Katıl</Text>
          <Text style={styles.subtitle}>Bugün outdoor yolculuğunuza başlayın.</Text>

          {/* Hesap Tipi Toggle */}
          <View style={styles.accountTypeContainer}>
            <TouchableOpacity
              style={[
                styles.accountTypeButton,
                accountType === 'individual' && styles.accountTypeButtonActive
              ]}
              onPress={() => setAccountType('individual')}
            >
              <Ionicons 
                name="person-outline" 
                size={20} 
                color={accountType === 'individual' ? COLORS.white : COLORS.gray500} 
              />
              <Text style={[
                styles.accountTypeText,
                accountType === 'individual' && styles.accountTypeTextActive
              ]}>
                Bireysel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.accountTypeButton,
                accountType === 'corporate' && styles.accountTypeButtonActive
              ]}
              onPress={() => setAccountType('corporate')}
            >
              <Ionicons 
                name="business-outline" 
                size={20} 
                color={accountType === 'corporate' ? COLORS.white : COLORS.gray500} 
              />
              <Text style={[
                styles.accountTypeText,
                accountType === 'corporate' && styles.accountTypeTextActive
              ]}>
                Kurumsal
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {accountType === 'individual' ? (
              <>
                {/* Bireysel Hesap Alanları */}
                <Input
                  label="Ad Soyad"
                  placeholder="Adınızı girin"
                  value={fullName}
                  onChangeText={setFullName}
                  icon="person-outline"
                />

                <Input
                  label="E-posta Adresi"
                  placeholder="ornek@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  icon="mail-outline"
                />

                <Input
                  label="Doğum Tarihi"
                  placeholder="GG/AA/YYYY (örn: 15/08/1994)"
                  value={dateOfBirth}
                  onChangeText={formatDateInput}
                  keyboardType="numeric"
                  icon="calendar-outline"
                  maxLength={10}
                />

                <Input
                  label="Referans Kodu (Opsiyonel)"
                  placeholder="Arkadaşınızın kodunu girin"
                  value={referralCode}
                  onChangeText={setReferralCode}
                  icon="gift-outline"
                  autoCapitalize="characters"
                />
              </>
            ) : (
              <>
                {/* Kurumsal Hesap Alanları */}
                <Input
                  label="Şirket Adı"
                  placeholder="Şirket adını girin"
                  value={companyName}
                  onChangeText={setCompanyName}
                  icon="business-outline"
                />

                <Input
                  label="Vergi Numarası"
                  placeholder="10 veya 11 haneli vergi numarası"
                  value={taxNumber}
                  onChangeText={setTaxNumber}
                  keyboardType="numeric"
                  icon="document-text-outline"
                  maxLength={11}
                />

                <Input
                  label="Yetkili Kişi"
                  placeholder="Yetkili kişinin adı soyadı"
                  value={authorizedPerson}
                  onChangeText={setAuthorizedPerson}
                  icon="person-outline"
                />

                <Input
                  label="E-posta Adresi"
                  placeholder="sirket@email.com"
                  value={companyEmail}
                  onChangeText={setCompanyEmail}
                  keyboardType="email-address"
                  icon="mail-outline"
                />

                <Input
                  label="Adres"
                  placeholder="Şirket adresi"
                  value={companyAddress}
                  onChangeText={setCompanyAddress}
                  icon="location-outline"
                  multiline
                  numberOfLines={3}
                />
              </>
            )}

            {/* Ortak Alanlar */}
            <Input
              label="Şifre"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon="lock-closed-outline"
            />

            <Input
              label="Şifre Tekrar"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              icon="lock-closed-outline"
            />

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreeTerms(!agreeTerms)}
            >
              <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                {agreeTerms && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
              </View>
              <Text style={styles.checkboxText}>
                <Pressable onPress={() => navigation.navigate('TermsOfService')}>
                  <Text style={styles.termsLink}>Kullanım Koşulları</Text>
                </Pressable>
                {' '}ve{' '}
                <Pressable onPress={() => navigation.navigate('PrivacyPolicy')}>
                  <Text style={styles.termsLink}>Gizlilik Politikası</Text>
                </Pressable>
                'nı kabul ediyorum
              </Text>
            </TouchableOpacity>

            <Button 
              title={loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'} 
              onPress={handleSignUp} 
              style={styles.signUpButton}
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
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-google" size={20} color={COLORS.textMain} />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-apple" size={20} color={COLORS.textMain} />
              <Text style={styles.socialButtonText}>Apple</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Zaten hesabınız var mı? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.footerLink}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    textAlign: 'center',
    marginRight: 40,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMain,
    lineHeight: 20,
  },
  termsLink: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  signUpButton: {
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
  accountTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    padding: 4,
  },
  accountTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    backgroundColor: 'transparent',
  },
  accountTypeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  accountTypeText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  accountTypeTextActive: {
    color: COLORS.white,
  },
});