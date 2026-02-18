import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { gamificationAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

export default function QuestScreen({ navigation }) {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [quests, setQuests] = useState([]);
  const [activeQuests, setActiveQuests] = useState([]);
  const [completedQuests, setCompletedQuests] = useState([]);

  useEffect(() => {
    loadQuests();
  }, []);

  const loadQuests = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      if (!storedUserId) {
        navigation.replace('Login');
        return;
      }

      setUserId(storedUserId);

      try {
        // Her zaman fallback görevleri kullan
        let allQuests = generateSampleQuests();
        
        // API'den veri gelirse, progress bilgilerini güncelle
        try {
          const response = await gamificationAPI.getQuests(storedUserId);
          if (response.data?.success) {
            const apiQuests = response.data.data?.quests || response.data.data || [];
            
            // API'den gelen gerçek quest verilerini kullan
            if (apiQuests.length > 0) {
              allQuests = apiQuests;
            }
          }
        } catch (apiError) {
          console.log('API\'den görev verisi alınamadı, fallback görevler kullanılıyor:', apiError.message);
          // API hatası durumunda fallback görevleri kullan
        }
        
        setQuests(allQuests);
        setActiveQuests(allQuests.filter(q => !q.completed && q.progress < q.target));
        setCompletedQuests(allQuests.filter(q => q.completed));
      } catch (error) {
        console.error('Görevler yüklenemedi:', error);
        // Hata durumunda fallback görevleri kullan
        const sampleQuests = generateSampleQuests();
        setQuests(sampleQuests);
        setActiveQuests(sampleQuests.filter(q => !q.completed));
        setCompletedQuests([]);
      }
    } catch (error) {
      console.error('Görev verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateSampleQuests = () => {
    return [
      {
        id: 1,
        title: '3 Ürün Görüntüle',
        description: '3 farklı ürün detay sayfasını ziyaret et',
        type: 'view_products',
        progress: 0,
        target: 3,
        reward: { type: 'exp', amount: 50 },
        completed: false,
        icon: 'eye-outline',
      },
      {
        id: 2,
        title: 'İlk Yorumunu Yap',
        description: 'Bir ürüne ilk yorumunu yaz',
        type: 'write_review',
        progress: 0,
        target: 1,
        reward: { type: 'exp', amount: 100 },
        completed: false,
        icon: 'chatbubble-outline',
      },
      {
        id: 3,
        title: '5 Arkadaş Davet Et',
        description: '5 arkadaşını uygulamaya davet et',
        type: 'invite_friends',
        progress: 0,
        target: 5,
        reward: { type: 'exp', amount: 500 },
        completed: false,
        icon: 'people-outline',
      },
      {
        id: 4,
        title: 'Sepete Ürün Ekle',
        description: 'Sepetine en az 1 ürün ekle',
        type: 'add_to_cart',
        progress: 0,
        target: 1,
        reward: { type: 'exp', amount: 25 },
        completed: false,
        icon: 'cart-outline',
      },
      {
        id: 5,
        title: 'Favorilere Ekle',
        description: '3 ürünü favorilerine ekle',
        type: 'add_favorite',
        progress: 0,
        target: 3,
        reward: { type: 'exp', amount: 75 },
        completed: false,
        icon: 'heart-outline',
      },
      {
        id: 6,
        title: 'İlk Siparişini Ver',
        description: 'İlk siparişini tamamla',
        type: 'first_order',
        progress: 0,
        target: 1,
        reward: { type: 'exp', amount: 200 },
        completed: false,
        icon: 'bag-outline',
      },
      {
        id: 7,
        title: '10 Ürün Görüntüle',
        description: '10 farklı ürün detay sayfasını ziyaret et',
        type: 'view_products_10',
        progress: 0,
        target: 10,
        reward: { type: 'exp', amount: 150 },
        completed: false,
        icon: 'eye-outline',
      },
      {
        id: 8,
        title: 'Günlük Ödül Al',
        description: '7 gün üst üste günlük ödülünü al',
        type: 'daily_reward_streak',
        progress: 0,
        target: 7,
        reward: { type: 'exp', amount: 300 },
        completed: false,
        icon: 'gift-outline',
      },
      {
        id: 9,
        title: 'Profilini Tamamla',
        description: 'Profil bilgilerini tamamla',
        type: 'complete_profile',
        progress: 0,
        target: 1,
        reward: { type: 'exp', amount: 100 },
        completed: false,
        icon: 'person-outline',
      },
      {
        id: 10,
        title: '5 Yıldız Ver',
        description: 'Bir ürüne 5 yıldız puan ver',
        type: 'rate_5_stars',
        progress: 0,
        target: 1,
        reward: { type: 'exp', amount: 75 },
        completed: false,
        icon: 'star-outline',
      },
      {
        id: 11,
        title: 'Kampanyaları Keşfet',
        description: '5 kampanya sayfasını ziyaret et',
        type: 'view_campaigns',
        progress: 0,
        target: 5,
        reward: { type: 'exp', amount: 80 },
        completed: false,
        icon: 'pricetag-outline',
      },
      {
        id: 13,
        title: 'Flash İndirimleri Keşfet',
        description: '5 flash indirim ürününü görüntüle',
        type: 'view_flash_deals',
        progress: 0,
        target: 5,
        reward: { type: 'exp', amount: 100 },
        completed: false,
        icon: 'flash-outline',
      },
      {
        id: 14,
        title: 'Arama Yap',
        description: '10 farklı arama yap',
        type: 'search_products',
        progress: 0,
        target: 10,
        reward: { type: 'exp', amount: 60 },
        completed: false,
        icon: 'search-outline',
      },
    ];
  };

  const claimQuestReward = async (questId) => {
    if (!userId) return;

    try {
      const response = await gamificationAPI.claimQuestReward(questId, userId);
      if (response.data?.success) {
        alert.show(
          'Tebrikler! 🎉',
          `Görev tamamlandı! Ödülünüzü kazandınız.`,
          [{ text: 'Tamam', onPress: () => loadQuests() }]
        );
      } else {
        alert.show('Hata', response.data?.message || 'Ödül alınamadı');
      }
    } catch (error) {
      console.error('Ödül alma hatası:', error);
      alert.show('Hata', 'Ödül alınırken bir hata oluştu');
    }
  };

  const getProgressPercentage = (progress, target) => {
    return Math.min((progress / target) * 100, 100);
  };

  const renderQuestCard = (quest) => {
    const progressPercentage = getProgressPercentage(quest.progress, quest.target);
    const canClaim = quest.progress >= quest.target && !quest.completed;

    return (
      <View key={quest.id} style={styles.questCard}>
        <View style={styles.questHeader}>
          <View style={styles.questIconContainer}>
            <Ionicons name={quest.icon || 'trophy-outline'} size={24} color={COLORS.primary} />
          </View>
          <View style={styles.questInfo}>
            <Text style={styles.questTitle}>{quest.title}</Text>
            <Text style={styles.questDescription}>{quest.description}</Text>
          </View>
          {quest.completed && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            </View>
          )}
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {quest.progress} / {quest.target}
          </Text>
        </View>

        <View style={styles.questFooter}>
          <View style={styles.rewardContainer}>
            <Ionicons
              name={quest.reward.type === 'exp' ? 'star' : 'ticket'}
              size={16}
              color={quest.reward.type === 'exp' ? COLORS.primary : '#f59e0b'}
            />
            <Text style={styles.rewardText}>
              {quest.reward.type === 'exp' ? `+${quest.reward.amount} EXP` : `%${quest.reward.amount} İndirim`}
            </Text>
          </View>
          {canClaim && (
            <TouchableOpacity
              style={styles.claimButton}
              onPress={() => claimQuestReward(quest.id)}
            >
              <Text style={styles.claimButtonText}>Ödülü Al</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
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
        <Text style={styles.headerTitle}>Görevler</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadQuests} />}
      >
        {/* Active Quests */}
        {activeQuests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aktif Görevler</Text>
            {activeQuests.map(quest => renderQuestCard(quest))}
          </View>
        )}

        {/* Completed Quests */}
        {completedQuests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tamamlanan Görevler</Text>
            {completedQuests.map(quest => renderQuestCard(quest))}
          </View>
        )}

        {/* Empty State */}
        {activeQuests.length === 0 && completedQuests.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={COLORS.gray400} />
            <Text style={styles.emptyStateText}>Henüz görev yok</Text>
            <Text style={styles.emptyStateSubtext}>Yeni görevler yakında eklenecek!</Text>
          </View>
        )}
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  questCard: {
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
  questHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  questIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  questDescription: {
    fontSize: 14,
    color: COLORS.gray600,
  },
  completedBadge: {
    marginLeft: 'auto',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.gray200,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.gray600,
    textAlign: 'right',
  },
  questFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginLeft: 6,
  },
  claimButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  claimButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.gray600,
  },
});















