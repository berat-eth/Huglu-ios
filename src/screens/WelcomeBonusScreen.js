import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { welcomeBonusAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

export default function WelcomeBonusScreen({ navigation }) {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [eligible, setEligible] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [bonusAmount, setBonusAmount] = useState(50);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    loadWelcomeBonusData();
  }, []);

  const loadWelcomeBonusData = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      if (!storedUserId) {
        navigation.replace('Login');
        return;
      }

      setUserId(storedUserId);

      try {
        const [eligibilityResponse, packagesResponse] = await Promise.all([
          welcomeBonusAPI.checkEligibility(storedUserId),
          welcomeBonusAPI.getWelcomePackages(),
        ]);

        if (eligibilityResponse.data?.success) {
          const data = eligibilityResponse.data.data;
          setEligible(data.eligible || false);
          setClaimed(data.claimed || false);
          setBonusAmount(data.bonusAmount || 50);
        }

        if (packagesResponse.data?.success) {
          setPackages(packagesResponse.data.data?.packages || packagesResponse.data.data || []);
        } else {
          // Fallback packages
          setPackages([
            { id: 1, name: 'Hoş Geldin Paketi', discount: 20, freeShipping: true, coupon: 'WELCOME20' },
            { id: 2, name: 'İlk Sipariş Bonusu', discount: 30, freeShipping: true, coupon: 'FIRST30' },
          ]);
        }
      } catch (error) {
        console.error('Hoş geldin bonusu yüklenemedi:', error);
        setEligible(true);
        setPackages([
          { id: 1, name: 'Hoş Geldin Paketi', discount: 20, freeShipping: true, coupon: 'WELCOME20' },
        ]);
      }
    } catch (error) {
      console.error('Hoş geldin bonusu verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimWelcomeBonus = async () => {
    if (!userId || !eligible || claimed) return;

    try {
      const response = await welcomeBonusAPI.claimWelcomeBonus(userId);
      if (response.data?.success) {
        setClaimed(true);
        alert.show(
          'Tebrikler! 🎉',
          `Hoş geldin bonusunuz hesabınıza eklendi!\n${bonusAmount} TL hediye çeki kazandınız.`,
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
      } else {
        alert.show('Hata', response.data?.message || 'Bonus alınamadı');
      }
    } catch (error) {
      console.error('Bonus alma hatası:', error);
      alert.show('Hata', 'Bonus alınırken bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hoş Geldin Bonusu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroImageContainer}>
            <Ionicons name="gift" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>Hoş Geldin! 🎁</Text>
          <Text style={styles.heroSubtitle}>
            Yeni üyemize özel {bonusAmount} TL hediye çeki
          </Text>
        </View>

        {/* Bonus Card */}
        {eligible && !claimed && (
          <View style={styles.bonusCard}>
            <View style={styles.bonusCardHeader}>
              <Ionicons name="wallet" size={24} color={COLORS.primary} />
              <Text style={styles.bonusCardTitle}>Hediye Çeki</Text>
            </View>
            <Text style={styles.bonusAmount}>{bonusAmount} TL</Text>
            <Text style={styles.bonusDescription}>
              Bu hediye çeki ile ilk alışverişinde kullanabilirsin!
            </Text>
            <TouchableOpacity style={styles.claimButton} onPress={claimWelcomeBonus}>
              <Text style={styles.claimButtonText}>Hediye Çekini Al</Text>
            </TouchableOpacity>
          </View>
        )}

        {claimed && (
          <View style={styles.claimedCard}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            <Text style={styles.claimedTitle}>Bonus Alındı! ✓</Text>
            <Text style={styles.claimedText}>
              {bonusAmount} TL hediye çeki hesabına eklendi. İlk alışverişinde kullanabilirsin.
            </Text>
          </View>
        )}

        {/* Welcome Packages */}
        {packages.length > 0 && (
          <View style={styles.packagesSection}>
            <Text style={styles.sectionTitle}>Hoş Geldin Paketleri</Text>
            {packages.map((pkg) => (
              <View key={pkg.id} style={styles.packageCard}>
                <View style={styles.packageHeader}>
                  <View style={styles.packageIcon}>
                    <Ionicons name="cube" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.packageInfo}>
                    <Text style={styles.packageName}>{pkg.name}</Text>
                    <Text style={styles.packageDescription}>
                      %{pkg.discount} İndirim {pkg.freeShipping && '• Ücretsiz Kargo'}
                    </Text>
                  </View>
                </View>
                {pkg.coupon && (
                  <View style={styles.couponContainer}>
                    <Text style={styles.couponCode}>{pkg.coupon}</Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => {
                        // Clipboard.setString(pkg.coupon);
                        alert.show('Kopyalandı', `Kupon kodu: ${pkg.coupon}`);
                      }}
                    >
                      <Ionicons name="copy" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Yeni Üye Avantajları</Text>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.benefitText}>İlk siparişte %20-30 indirim</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.benefitText}>İlk siparişte ücretsiz kargo</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.benefitText}>Özel kupon paketi</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.benefitText}>Hızlı teslimat garantisi</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  heroImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.gray600,
    textAlign: 'center',
  },
  bonusCard: {
    margin: 16,
    marginTop: 0,
    padding: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    alignItems: 'center',
  },
  bonusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bonusCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 8,
  },
  bonusAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  bonusDescription: {
    fontSize: 14,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.9,
  },
  claimButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  claimButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  claimedCard: {
    margin: 16,
    marginTop: 0,
    padding: 32,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  claimedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginTop: 16,
    marginBottom: 8,
  },
  claimedText: {
    fontSize: 14,
    color: COLORS.gray600,
    textAlign: 'center',
  },
  packagesSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  packageCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 14,
    color: COLORS.gray600,
  },
  couponContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'space-between',
  },
  couponCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMain,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 4,
  },
  benefitsSection: {
    padding: 16,
    paddingTop: 0,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: COLORS.textMain,
    marginLeft: 12,
  },
});




















