import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Clipboard, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { referralAPI, userLevelAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

export default function ReferralScreen({ navigation }) {
  const alert = useAlert();
  const [referralCode, setReferralCode] = useState('HUGLU2024');
  const [totalCredits, setTotalCredits] = useState(0);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const storedUserId = await secureStorage.getItem('userId');
      if (!storedUserId) {
        navigation.replace('Login');
        return;
      }

      setUserId(storedUserId);

      try {
        const response = await referralAPI.getReferralInfo(storedUserId);
        if (response.data?.success) {
          const data = response.data.data;
          setReferralCode(data.referralCode || `HUGLU${storedUserId}`);
          setTotalCredits(data.totalCredits || 0);
          setTotalReferrals(data.totalReferrals || 0);
        }
      } catch (apiError) {
        console.log('Referral API hatası, varsayılan değerler kullanılıyor:', apiError.message);
        setReferralCode(`HUGLU${storedUserId}`);
      }
    } catch (error) {
      console.error('Referral verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await Clipboard.setString(referralCode);
    alert.show('Başarılı', 'Referans kodunuz kopyalandı!');
  };

  const shareReferralCode = async () => {
    try {
      const result = await Share.share({
        message: `Huğlu Outdoor'a katıl ve ${referralCode} kodunu kullanarak indirim kazan! 🎁\n\nBen de Huğlu Outdoor'dan alışveriş yapıyorum, sen de katıl! 🏔️`,
        title: 'Huğlu Outdoor Referans Kodu',
      });

      if (result.action === Share.sharedAction) {
        // Paylaşım başarılı - Sosyal paylaşım EXP'si ekle
        try {
          await userLevelAPI.addSocialShareExp(userId, 'general', 'referral', referralCode);
          alert.show('Tebrikler! 🎉', 'Referans kodunuzu paylaştığınız için +50 EXP kazandınız!');
        } catch (expError) {
          console.log('EXP eklenemedi:', expError.message);
        }
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const shareViaMethod = (method) => {
    alert.show('Paylaş', `${method} ile paylaşım özelliği yakında eklenecek!`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Arkadaşını Davet Et</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <View style={styles.heroImageWrapper}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDdcH82uNG1A2MXg_AXYMdykyGBQwLt_1HGc2fHllEhltiZmNVTruj2-DjzQdfEaCiXGpyQ8UA99uWHjadAJ0VyLN97LPLkxVr85EdwkoxjSYkiiJxwgPcKGNcgqwXMNRiFh1Ew5RrIDdBd9gX0qX34-MTH7s0LZUcwdRVTIdEQxVs6JiYJzpReleUb3Cus8neaMQ3fiUSskpAyTtP_OSBKM3-CqKIMexJ_nxsmoowkTVzjO1MKI8aeGfJgau0M19MhTwRwe8kLeVs' }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroOverlay} />
            <View style={styles.heroBadge}>
              <Ionicons name="gift" size={16} color={COLORS.white} />
              <Text style={styles.heroBadgeText}>Sınırlı Süreli Teklif</Text>
            </View>
          </View>
        </View>

        {/* Headline & Description */}
        <View style={styles.contentSection}>
          <Text style={styles.mainTitle}>
            Macera{'\n'}
            <Text style={styles.mainTitleHighlight}>birlikte daha güzel.</Text>
          </Text>
          <Text style={styles.description}>
            Bir arkadaşını Huğlu Outdoor'a davet et ve ikiniz de bir sonraki alışverişinizde{' '}
            <Text style={styles.descriptionBold}>₺100 indirim</Text> kazanın.
          </Text>
        </View>

        {/* Referral Code Section */}
        <View style={styles.codeSection}>
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>SİZİN ÖZEL KODUNUZ</Text>
            <View style={styles.codeInputWrapper}>
              <View style={styles.codeIconContainer}>
                <MaterialCommunityIcons name="ticket-confirmation" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.codeText}>{referralCode}</Text>
              <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
                <Ionicons name="copy" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Share Options */}
        <View style={styles.shareSection}>
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>PAYLAŞ</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.shareGrid}>
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={() => shareViaMethod('Mesaj')}
            >
              <View style={styles.shareIconContainer}>
                <Ionicons name="chatbubble" size={24} color={COLORS.gray700} />
              </View>
              <Text style={styles.shareLabel}>Mesaj</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.shareButton}
              onPress={() => shareViaMethod('WhatsApp')}
            >
              <View style={styles.shareIconContainer}>
                <MaterialCommunityIcons name="whatsapp" size={24} color={COLORS.gray700} />
              </View>
              <Text style={styles.shareLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.shareButton}
              onPress={shareReferralCode}
            >
              <View style={styles.shareIconContainer}>
                <Ionicons name="share-social" size={24} color={COLORS.gray700} />
              </View>
              <Text style={styles.shareLabel}>Daha Fazla</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.shareButton}
              onPress={() => shareViaMethod('E-posta')}
            >
              <View style={styles.shareIconContainer}>
                <Ionicons name="mail" size={24} color={COLORS.gray700} />
              </View>
              <Text style={styles.shareLabel}>E-posta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Stats Footer */}
      <View style={styles.footer}>
        <View style={styles.statsContainer}>
          <View style={styles.statsLeft}>
            <Text style={styles.statsLabel}>Toplam Kazanılan Kredi</Text>
            <View style={styles.statsAmount}>
              <Text style={styles.statsValue}>₺{totalCredits}</Text>
              <Text style={styles.statsDecimal}>.00</Text>
            </View>
          </View>
          <View style={styles.statsIcon}>
            <Ionicons name="wallet" size={24} color={COLORS.primary} />
          </View>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '5%' }]} />
        </View>

        <TouchableOpacity style={styles.termsButton}>
          <Text style={styles.termsText}>Şartlar ve Koşullar</Text>
          <Ionicons name="open-outline" size={14} color={COLORS.gray400} />
        </TouchableOpacity>
      </View>
      <alert.AlertComponent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f6f8f6',
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
    letterSpacing: -0.5,
  },
  heroContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  heroImageWrapper: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  heroBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(17, 212, 33, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  contentSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textMain,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 12,
    letterSpacing: -1,
  },
  mainTitleHighlight: {
    color: COLORS.primary,
  },
  description: {
    fontSize: 16,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  descriptionBold: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  codeSection: {
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  codeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray500,
    letterSpacing: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  codeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    margin: 12,
    marginTop: 4,
  },
  codeIconContainer: {
    marginRight: 12,
  },
  codeText: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    letterSpacing: 2,
    textAlign: 'center',
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  shareSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray400,
    letterSpacing: 1.5,
    marginHorizontal: 16,
  },
  shareGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  shareButton: {
    alignItems: 'center',
    gap: 8,
  },
  shareIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f6f8f6',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.gray500,
  },
  footer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsLeft: {
    flex: 1,
  },
  statsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray500,
    marginBottom: 4,
  },
  statsAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statsValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textMain,
    letterSpacing: -1,
  },
  statsDecimal: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray400,
    marginLeft: 2,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  termsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  termsText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.gray400,
  },
});
