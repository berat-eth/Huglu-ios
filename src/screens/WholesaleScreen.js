import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Input from '../components/Input';
import { COLORS } from '../constants/colors';
import { wholesaleAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

export default function WholesaleScreen({ navigation }) {
  const alert = useAlert();
  
  // Multi-step wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  // Form data
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBusinessTypeDropdown, setShowBusinessTypeDropdown] = useState(false);

  const businessTypes = [
    { value: 'retail', label: 'Perakende Mağaza' },
    { value: 'ecommerce', label: 'E-Ticaret' },
    { value: 'distributor', label: 'Distribütör' },
    { value: 'other', label: 'Diğer' },
  ];

  // Step navigation functions
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step validation
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 2: // Company info step
        if (!companyName || !businessType) {
          alert.show('Hata', 'Lütfen şirket bilgilerini doldurun');
          return false;
        }
        break;
      case 3: // Contact info step
        if (!contactPerson || !email || !phone) {
          alert.show('Hata', 'Lütfen iletişim bilgilerini doldurun');
          return false;
        }
        if (!email.includes('@')) {
          alert.show('Hata', 'Geçerli bir e-posta adresi girin');
          return false;
        }
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(phone) || phone.length < 10) {
          alert.show('Hata', 'Geçerli bir telefon numarası girin');
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      nextStep();
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const formData = {
        companyName,
        contactPerson,
        email,
        phone,
        businessType,
      };

      // API isteği gönder
      const response = await wholesaleAPI.apply(formData);

      if (response.data?.success) {
        // Başvuru verilerini durum sayfasına gönder
        const applicationData = {
          companyName,
          businessType,
          email,
          applicationId: response.data?.data?.applicationId || `WS-${Date.now().toString().slice(-6)}`,
        };
        
        // Durum sayfasına yönlendir
        navigation.replace('WholesaleStatus', { applicationData });
      } else {
        alert.show('Hata', response.data?.message || 'Başvuru gönderilemedi');
      }
    } catch (error) {
      console.error('Wholesale application error:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Başvuru gönderilemedi. Lütfen tekrar deneyin.';
      alert.show('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:toptan@hugluoutdoor.com');
  };

  // Step content renderer
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderWelcomeStep();
      case 2:
        return renderCompanyInfoStep();
      case 3:
        return renderContactInfoStep();
      case 4:
        return renderReviewStep();
      default:
        return renderWelcomeStep();
    }
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.welcomeSection}>
        <View style={styles.iconContainer}>
          <Ionicons name="storefront-outline" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.welcomeTitle}>Toptan Satış Programına Hoş Geldiniz</Text>
        <Text style={styles.welcomeSubtitle}>
          Premium perakende ağımıza katılın ve işletmenizi büyütün
        </Text>
      </View>

      <View style={styles.highlightSection}>
        <View style={styles.highlightCard}>
          <View style={styles.highlightIcon}>
            <Ionicons name="trending-up" size={28} color={COLORS.white} />
          </View>
          <View style={styles.highlightContent}>
            <Text style={styles.highlightTitle}>%60'a Varan Kar Oranı</Text>
            <Text style={styles.highlightDescription}>
              Yüksek kar marjları ile işletmenizi büyütün
            </Text>
          </View>
        </View>
        
        <View style={styles.highlightCard}>
          <View style={styles.highlightIcon}>
            <Ionicons name="calendar-outline" size={28} color={COLORS.white} />
          </View>
          <View style={styles.highlightContent}>
            <Text style={styles.highlightTitle}>60 Güne Varan Vade</Text>
            <Text style={styles.highlightDescription}>
              Esnek ödeme koşulları ile nakit akışınızı yönetin
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.benefitsGrid}>
        <View style={styles.benefitCard}>
          <Ionicons name="pricetag-outline" size={24} color={COLORS.primary} />
          <Text style={styles.benefitTitle}>Toplu İndirimler</Text>
          <Text style={styles.benefitDescription}>
            Büyük siparişler için kademeli fiyatlandırma
          </Text>
        </View>

        <View style={styles.benefitCard}>
          <Ionicons name="cube-outline" size={24} color={COLORS.primary} />
          <Text style={styles.benefitTitle}>Öncelikli Kargo</Text>
          <Text style={styles.benefitDescription}>
            Ortaklarımız için hızlı işleme
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCompanyInfoStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Şirket Bilgileri</Text>
        <Text style={styles.stepSubtitle}>
          İşletmeniz hakkında temel bilgileri paylaşın
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Şirket Adı"
          placeholder="Ticaret Şirketi"
          value={companyName}
          onChangeText={setCompanyName}
          icon="business-outline"
        />

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>İş Tipi</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowBusinessTypeDropdown(!showBusinessTypeDropdown)}
          >
            <Ionicons name="storefront-outline" size={20} color={COLORS.gray600} />
            <Text style={[styles.dropdownText, !businessType && styles.placeholderText]}>
              {businessType ? businessTypes.find(t => t.value === businessType)?.label : 'İş tipinizi seçin'}
            </Text>
            <Ionicons 
              name={showBusinessTypeDropdown ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={COLORS.gray600} 
            />
          </TouchableOpacity>
          
          {showBusinessTypeDropdown && (
            <View style={styles.dropdown}>
              {businessTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setBusinessType(type.value);
                    setShowBusinessTypeDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderContactInfoStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>İletişim Bilgileri</Text>
        <Text style={styles.stepSubtitle}>
          Sizinle nasıl iletişime geçebileceğimizi belirtin
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="İletişim Kişisi"
          placeholder="Ad Soyad"
          value={contactPerson}
          onChangeText={setContactPerson}
          icon="person-outline"
        />

        <Input
          label="E-posta"
          placeholder="isim@sirket.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          icon="mail-outline"
        />

        <Input
          label="Telefon"
          placeholder="+90 555 123 45 67"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          icon="call-outline"
        />
      </View>
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Bilgileri Kontrol Edin</Text>
        <Text style={styles.stepSubtitle}>
          Başvurunuzu göndermeden önce bilgilerinizi kontrol edin
        </Text>
      </View>

      <View style={styles.reviewSection}>
        <View style={styles.reviewCard}>
          <Text style={styles.reviewCardTitle}>Şirket Bilgileri</Text>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Şirket Adı:</Text>
            <Text style={styles.reviewValue}>{companyName}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>İş Tipi:</Text>
            <Text style={styles.reviewValue}>
              {businessTypes.find(t => t.value === businessType)?.label}
            </Text>
          </View>
        </View>

        <View style={styles.reviewCard}>
          <Text style={styles.reviewCardTitle}>İletişim Bilgileri</Text>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>İletişim Kişisi:</Text>
            <Text style={styles.reviewValue}>{contactPerson}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>E-posta:</Text>
            <Text style={styles.reviewValue}>{email}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Telefon:</Text>
            <Text style={styles.reviewValue}>{phone}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => currentStep === 1 ? navigation.goBack() : prevStep()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentStep === 1 ? 'Toptan Satış' : `Adım ${currentStep}/${totalSteps}`}
        </Text>
        <TouchableOpacity style={styles.infoButton} onPress={handleEmailPress}>
          <Ionicons name="help-circle-outline" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(currentStep / totalSteps) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {currentStep}/{totalSteps}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderStepContent()}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNavigation}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={prevStep}
            >
              <Text style={styles.secondaryButtonText}>Geri</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.primaryButton, currentStep === 1 && styles.primaryButtonFull]}
            onPress={currentStep === totalSteps ? handleSubmit : handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {currentStep === totalSteps ? 'Başvuruyu Gönder' : 'Devam Et'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    borderBottomColor: COLORS.gray200,
    backgroundColor: COLORS.backgroundLight,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    flex: 1,
    textAlign: 'center',
  },
  infoButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.gray200,
    borderRadius: 2,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  stepContent: {
    padding: 24,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 22,
  },
  highlightSection: {
    marginBottom: 24,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  highlightIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  highlightContent: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  highlightDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  benefitsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  benefitCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginTop: 8,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 12,
    color: COLORS.gray600,
    lineHeight: 16,
  },
  stepHeader: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    gap: 12,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textMain,
  },
  placeholderText: {
    color: COLORS.gray400,
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  dropdownItemText: {
    fontSize: 16,
    color: COLORS.textMain,
  },
  reviewSection: {
    gap: 16,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  reviewCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  reviewLabel: {
    fontSize: 14,
    color: COLORS.gray600,
    flex: 1,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    flex: 2,
    textAlign: 'right',
  },
  bottomNavigation: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  primaryButton: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonFull: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});