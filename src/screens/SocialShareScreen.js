import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { socialSharingAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

export default function SocialShareScreen({ navigation, route }) {
  const alert = useAlert();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [shareRewards, setShareRewards] = useState([]);
  const shareType = route?.params?.type || 'product'; // 'product', 'wishlist', 'experience'
  const shareData = route?.params?.data || null;

  useEffect(() => {
    loadShareRewards();
  }, []);

  const loadShareRewards = async () => {
    try {
      const storedUserId = await secureStorage.getItem('userId');
      if (!storedUserId) {
        navigation.replace('Login');
        return;
      }

      setUserId(storedUserId);

      try {
        const response = await socialSharingAPI.getShareRewards(storedUserId);
        if (response.data?.success) {
          setShareRewards(response.data.data?.rewards || response.data.data || []);
        }
      } catch (error) {
        console.error('Paylaşım ödülleri yüklenemedi:', error);
      }
    } catch (error) {
      console.error('Paylaşım verileri yüklenemedi:', error);
    }
  };

  const shareContent = async (platform) => {
    if (!userId) {
      alert.show('Hata', 'Giriş yapmanız gerekiyor');
      return;
    }

    try {
      setLoading(true);

      let shareMessage = '';
      let shareUrl = '';

      switch (shareType) {
        case 'product':
          shareMessage = `Bu ürünü beğendim: ${shareData?.name || 'Ürün'}\n\nHuğlu Outdoor'dan alışveriş yap!`;
          shareUrl = `https://huglu.com/products/${shareData?.id || ''}`;
          await socialSharingAPI.shareProduct(userId, shareData?.id, platform);
          break;
        case 'wishlist':
          shareMessage = 'İstek listeme göz at! 🎁\n\nHuğlu Outdoor\'dan alışveriş yap!';
          shareUrl = 'https://huglu.com/wishlist';
          await socialSharingAPI.shareWishlist(userId, platform);
          break;
        case 'experience':
          shareMessage = shareData?.content || 'Huğlu Outdoor\'dan harika bir alışveriş deneyimi yaşadım!';
          await socialSharingAPI.shareExperience(userId, shareData?.content, platform);
          break;
      }

      const result = await Share.share({
        message: `${shareMessage}\n\n${shareUrl}`,
        title: 'Huğlu Outdoor',
      });

      if (result.action === Share.sharedAction) {
        alert.show('Tebrikler! 🎉', 'Paylaşım için +50 EXP kazandınız!');
        loadShareRewards();
      }
    } catch (error) {
      console.error('Paylaşım hatası:', error);
      alert.show('Hata', 'Paylaşım yapılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const platforms = [
    { id: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
    { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
    { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
    { id: 'twitter', name: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
    { id: 'telegram', name: 'Telegram', icon: 'paper-plane', color: '#0088cc' },
    { id: 'sms', name: 'SMS', icon: 'chatbubble', color: COLORS.primary },
    { id: 'email', name: 'E-posta', icon: 'mail', color: COLORS.gray600 },
    { id: 'more', name: 'Daha Fazla', icon: 'share-social', color: COLORS.primary },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paylaş</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Share Content Preview */}
        {shareData && shareType === 'product' && (
          <View style={styles.previewCard}>
            <View style={styles.previewImage}>
              <Ionicons name="cube" size={32} color={COLORS.primary} />
            </View>
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle}>{shareData.name}</Text>
              <Text style={styles.previewPrice}>{shareData.price} TL</Text>
            </View>
          </View>
        )}

        {/* Share Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paylaşım Platformları</Text>
          <View style={styles.platformsGrid}>
            {platforms.map((platform) => (
              <TouchableOpacity
                key={platform.id}
                style={styles.platformCard}
                onPress={() => shareContent(platform.id)}
                disabled={loading}
              >
                <View style={[styles.platformIcon, { backgroundColor: platform.color + '20' }]}>
                  <Ionicons name={platform.icon} size={32} color={platform.color} />
                </View>
                <Text style={styles.platformName}>{platform.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Rewards Info */}
        {shareRewards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paylaşım Ödülleri</Text>
            <View style={styles.rewardsCard}>
              <Ionicons name="gift" size={24} color={COLORS.primary} />
              <View style={styles.rewardsInfo}>
                <Text style={styles.rewardsTitle}>Toplam Kazanç</Text>
                <Text style={styles.rewardsAmount}>
                  {shareRewards.reduce((sum, r) => sum + (r.amount || 0), 0)} EXP
                </Text>
              </View>
            </View>
            <Text style={styles.rewardsDescription}>
              Her paylaşımda 50 EXP kazanırsın! Daha fazla paylaş, daha fazla kazan! 🎁
            </Text>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Ürünleri, istek listeni veya alışveriş deneyimini paylaşarak EXP kazanabilirsin!
          </Text>
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
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
  previewCard: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  previewPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  platformCard: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 16,
  },
  platformIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  platformName: {
    fontSize: 12,
    color: COLORS.textMain,
    textAlign: 'center',
  },
  rewardsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rewardsInfo: {
    marginLeft: 12,
    flex: 1,
  },
  rewardsTitle: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 4,
  },
  rewardsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  rewardsDescription: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});




















