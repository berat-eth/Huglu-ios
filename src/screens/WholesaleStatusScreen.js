import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function WholesaleStatusScreen({ navigation, route }) {
  const { applicationData } = route.params || {};
  
  // Başvuru numarası oluştur (gerçek uygulamada backend'den gelecek)
  const applicationId = applicationData?.applicationId || `WS-${Date.now().toString().slice(-6)}`;
  const companyName = applicationData?.companyName || 'Şirket Adı';
  const businessType = applicationData?.businessType || 'İş Tipi';
  const email = applicationData?.email || 'E-posta';
  
  // İş tipi Türkçe çevirisi
  const getBusinessTypeLabel = (type) => {
    const types = {
      retail: 'Perakende Mağaza',
      ecommerce: 'E-Ticaret',
      distributor: 'Distribütör',
      other: 'Diğer',
    };
    return types[type] || type;
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:toptan@hugluoutdoor.com?subject=Toptan Satış Başvuru Desteği');
  };

  // Tarih formatı
  const formatDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} • ${hours}:${minutes}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Başvuru Durumu</Text>
        <TouchableOpacity style={styles.infoButton}>
          <View style={styles.infoButtonCircle}>
            <Ionicons name="help-circle" size={20} color={COLORS.white} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Status Section */}
        <View style={styles.statusSection}>
          <View style={styles.statusIconContainer}>
            <View style={styles.statusIconOuter}>
              <View style={styles.statusIconInner}>
                <Ionicons name="hourglass-outline" size={48} color={COLORS.primary} />
              </View>
            </View>
          </View>
          <Text style={styles.statusTitle}>İnceleme Bekliyor</Text>
          <Text style={styles.statusDescription}>
            Başvurunuz için teşekkürler! Şu anda işletme bilgilerinizi doğruluyoruz.
          </Text>
        </View>

        {/* Timeline Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SÜREÇ</Text>
          <View style={styles.timeline}>
            {/* Step 1: Application Submitted */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineStepIcon}>
                <View style={[styles.timelineIcon, styles.timelineIconCompleted]}>
                  <Ionicons name="checkmark" size={20} color={COLORS.white} />
                </View>
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStepTitle}>Başvuru Gönderildi</Text>
                <Text style={styles.timelineStepDate}>{formatDate()}</Text>
              </View>
            </View>

            {/* Timeline Line */}
            <View style={styles.timelineLineContainer}>
              <View style={styles.timelineLine}>
                <View style={styles.timelineLineActive} />
              </View>
            </View>

            {/* Step 2: Team Review */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineStepIcon}>
                <View style={[styles.timelineIcon, styles.timelineIconActive]}>
                  <Ionicons name="refresh" size={20} color={COLORS.primary} />
                </View>
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStepTitle}>Ekip İncelemesi</Text>
                <Text style={styles.timelineStepDate}>Tahmini 1-2 iş günü</Text>
              </View>
            </View>

            {/* Timeline Line */}
            <View style={styles.timelineLineContainer}>
              <View style={styles.timelineLine}>
                <View style={styles.timelineLineInactive} />
              </View>
            </View>

            {/* Step 3: Final Decision */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineStepIcon}>
                <View style={[styles.timelineIcon, styles.timelineIconPending]}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.gray400} />
                </View>
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStepTitle}>Nihai Karar</Text>
                <Text style={styles.timelineStepDate}>Sonuç e-posta ile gönderilecek</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Application Details Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>BAŞVURU DETAYLARI</Text>
            <View style={styles.applicationIdBadge}>
              <Text style={styles.applicationIdText}>#{applicationId}</Text>
            </View>
          </View>
          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Şirket:</Text>
              <Text style={styles.detailValue}>{companyName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>İş Tipi:</Text>
              <Text style={styles.detailValue}>{getBusinessTypeLabel(businessType)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>İletişim E-postası:</Text>
              <Text style={styles.detailValue}>{email}</Text>
            </View>
          </View>
        </View>

        {/* Program Benefits Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PROGRAM AVANTAJLARI</Text>
          
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="trending-up" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>%60'a Varan Kar Oranı</Text>
                <Text style={styles.benefitDescription}>
                  Başlangıç %25-35, Premium seviye %50-60 kar marjı
                </Text>
              </View>
            </View>
            
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>60 Güne Varan Vade</Text>
                <Text style={styles.benefitDescription}>
                  Peşin %5 indirim, 30-45-60 gün vade seçenekleri
                </Text>
              </View>
            </View>
            
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="pricetag-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Toplu Sipariş İndirimleri</Text>
                <Text style={styles.benefitDescription}>
                  Büyük siparişlerde kademeli fiyat avantajları
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* What Happens Next Section */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle" size={24} color={COLORS.white} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Sırada ne var?</Text>
            <Text style={styles.infoText}>
              Onaylandıktan sonra, toptan satış giriş bilgileriniz ve ilk toplu siparişinizi oluşturmak için bir bağlantı içeren bir hoş geldin e-postası alacaksınız.
            </Text>
          </View>
        </View>

        {/* Contact Support Button */}
        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleContactSupport}
        >
          <Ionicons name="headset-outline" size={20} color={COLORS.textMain} />
          <Text style={styles.contactButtonText}>Destek ile İletişime Geç</Text>
        </TouchableOpacity>
      </ScrollView>
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
  infoButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  statusSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  statusIconContainer: {
    marginBottom: 24,
  },
  statusIconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  statusDescription: {
    fontSize: 14,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  applicationIdBadge: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  applicationIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  timeline: {
    marginTop: 8,
  },
  timelineStep: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineStepIcon: {
    width: 40,
    alignItems: 'center',
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconCompleted: {
    backgroundColor: COLORS.primary,
  },
  timelineIconActive: {
    backgroundColor: `${COLORS.primary}20`,
  },
  timelineIconPending: {
    backgroundColor: COLORS.gray100,
  },
  timelineLineContainer: {
    marginLeft: 19,
    marginVertical: 4,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: COLORS.gray100,
  },
  timelineLineActive: {
    width: 2,
    height: 24,
    backgroundColor: COLORS.primary,
  },
  timelineLineInactive: {
    width: 2,
    height: 24,
    backgroundColor: COLORS.gray100,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  timelineStepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  timelineStepDate: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  detailsList: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.gray600,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.gray600,
    lineHeight: 18,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  benefitsList: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 13,
    color: COLORS.gray600,
    lineHeight: 18,
  },
});

