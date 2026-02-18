import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { gamificationAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

export default function DailyRewardScreen({ navigation }) {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [streak, setStreak] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [todayReward, setTodayReward] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    loadDailyRewardData();
  }, []);

  const loadDailyRewardData = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      if (!storedUserId) {
        navigation.replace('Login');
        return;
      }

      setUserId(storedUserId);

      try {
        const [rewardResponse, streakResponse] = await Promise.all([
          gamificationAPI.getDailyReward(storedUserId),
          gamificationAPI.getStreak(storedUserId),
        ]);

        if (rewardResponse.data?.success) {
          const data = rewardResponse.data.data;
          setCanClaim(data.canClaim || false);
          // Ensure todayReward has valid values
          const reward = data.todayReward || { type: 'exp', amount: 50 };
          setTodayReward({
            type: reward.type || 'exp',
            amount: reward.amount || (reward.type === 'coupon' ? 10 : 50)
          });
          setRewards(data.weekRewards || generateWeekRewards());
          setClaimed(data.claimed || false);
        }

        if (streakResponse.data?.success) {
          setStreak(streakResponse.data.data?.streak || 0);
        }
      } catch (error) {
        console.error('Daily reward yükleme hatası:', error);
        // Fallback data
        setStreak(0);
        setCanClaim(true);
        setTodayReward({ type: 'exp', amount: 50 });
        setRewards(generateWeekRewards());
        setClaimed(false);
      }
    } catch (error) {
      console.error('Daily reward verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateWeekRewards = () => {
    const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const rewards = [
      { type: 'exp', amount: 50 },
      { type: 'exp', amount: 75 },
      { type: 'exp', amount: 100 },
      { type: 'exp', amount: 150 },
      { type: 'exp', amount: 200 },
      { type: 'coupon', amount: 10 },
      { type: 'exp', amount: 500 },
    ];
    return weekDays.map((day, index) => ({
      day,
      dayNumber: index + 1,
      reward: {
        type: rewards[index]?.type || 'exp',
        amount: rewards[index]?.amount || 50
      },
      claimed: index < streak,
    }));
  };

  const claimReward = async () => {
    if (!userId || !canClaim || claimed) return;

    try {
      const response = await gamificationAPI.claimDailyReward(userId);
      if (response.data?.success) {
        setClaimed(true);
        setCanClaim(false);
        setStreak(prev => prev + 1);
        const reward = todayReward || { type: 'exp', amount: 50 };
        alert.show(
          'Tebrikler! 🎉',
          `Günlük ödülünüzü kazandınız!\n${reward.type === 'coupon' ? `%${reward.amount || 10} İndirim Kuponu` : `+${reward.amount || 50} EXP`}`,
          [{ text: 'Tamam', onPress: () => loadDailyRewardData() }]
        );
      } else {
        alert.show('Hata', response.data?.message || 'Ödül alınamadı');
      }
    } catch (error) {
      console.error('Ödül alma hatası:', error);
      alert.show('Hata', 'Ödül alınırken bir hata oluştu');
    }
  };

  const getRewardIcon = (type) => {
    switch (type) {
      case 'exp':
        return 'star';
      case 'coupon':
        return 'ticket';
      case 'points':
        return 'diamond';
      default:
        return 'gift';
    }
  };

  const getRewardColor = (type) => {
    switch (type) {
      case 'exp':
        return COLORS.primary;
      case 'coupon':
        return '#f59e0b';
      case 'points':
        return '#8b5cf6';
      default:
        return COLORS.primary;
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
        <Text style={styles.headerTitle}>Günlük Ödüller</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Streak Banner */}
        <View style={styles.streakBanner}>
          <View style={styles.streakContent}>
            <Ionicons name="flame" size={32} color="#ff6b35" />
            <View style={styles.streakTextContainer}>
              <Text style={styles.streakLabel}>Günlük Seri</Text>
              <Text style={styles.streakValue}>{streak} Gün</Text>
            </View>
          </View>
          <View style={styles.streakProgress}>
            <View style={[styles.streakProgressBar, { width: `${(streak % 7) * 14.28}%` }]} />
          </View>
        </View>

        {/* Today's Reward Card */}
        <View style={styles.todayCard}>
          <View style={styles.todayCardHeader}>
            <Text style={styles.todayCardTitle}>Bugünün Ödülü</Text>
            <View style={[styles.rewardBadge, { backgroundColor: COLORS.primary }]}>
              <Ionicons name="gift" size={20} color="#fff" />
            </View>
          </View>
          <View style={styles.todayCardContent}>
            <Text style={styles.rewardAmount}>
              {todayReward?.type === 'coupon' 
                ? `%${todayReward?.amount || 10} İndirim` 
                : `+${todayReward?.amount || 50} EXP`}
            </Text>
            <Text style={styles.rewardDescription}>
              {todayReward?.type === 'coupon' ? 'İndirim kuponu kazan' : 'Deneyim puanı kazan'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.claimButton, 
              (claimed || !canClaim) ? styles.claimButtonDisabled : styles.claimButtonActive
            ]}
            onPress={claimReward}
            disabled={!canClaim || claimed}
          >
            <Text style={[
              styles.claimButtonText, 
              (claimed || !canClaim) && styles.claimButtonTextDisabled
            ]}>
              {claimed ? 'Ödül Alındı ✓' : 'Ödülü Al'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Week Rewards */}
        <View style={styles.weekSection}>
          <Text style={styles.sectionTitle}>Haftalık Ödüller</Text>
          <View style={styles.weekRewardsGrid}>
            {rewards.map((item, index) => (
              <View key={index} style={styles.weekRewardCard}>
                <View style={[styles.weekRewardIcon, item.claimed && styles.weekRewardIconClaimed]}>
                  <Ionicons
                    name={getRewardIcon(item.reward.type)}
                    size={24}
                    color={item.claimed ? '#fff' : getRewardColor(item.reward.type)}
                  />
                </View>
                <Text style={styles.weekRewardDay}>{item.day}</Text>
                <Text style={styles.weekRewardAmount}>
                  {item.reward?.type === 'coupon' 
                    ? `%${item.reward?.amount || 10}` 
                    : `+${item.reward?.amount || 50}`}
                </Text>
                {item.claimed && (
                  <View style={styles.claimedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Her gün giriş yaparak ödül kazan! 7 günlük seri tamamlayınca özel bonus kazanırsın.
          </Text>
        </View>
      </ScrollView>
      {alert.AlertComponent()}
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
  streakBanner: {
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  streakTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  streakLabel: {
    fontSize: 12,
    color: COLORS.gray600,
    marginBottom: 2,
  },
  streakValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textMain,
  },
  streakProgress: {
    height: 4,
    backgroundColor: COLORS.gray200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  streakProgressBar: {
    height: '100%',
    backgroundColor: '#ff6b35',
    borderRadius: 2,
  },
  todayCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  todayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  todayCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
  },
  rewardBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayCardContent: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  rewardAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  rewardDescription: {
    fontSize: 14,
    color: COLORS.gray600,
    textAlign: 'center',
  },
  claimButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimButtonActive: {
    backgroundColor: '#ff6b35', // Turuncu - ödül alınmamışsa
  },
  claimButtonDisabled: {
    backgroundColor: COLORS.gray400, // Gri - ödül alınmışsa
  },
  claimButtonText: {
    color: '#fff', // Turuncu buton için beyaz text
    fontSize: 16,
    fontWeight: '600',
  },
  claimButtonTextDisabled: {
    color: COLORS.gray600, // Gri buton için gri text
  },
  weekSection: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  weekRewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  weekRewardCard: {
    width: '14%',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  weekRewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  weekRewardIconClaimed: {
    backgroundColor: COLORS.primary,
  },
  weekRewardDay: {
    fontSize: 12,
    color: COLORS.gray600,
    marginBottom: 4,
  },
  weekRewardAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  claimedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  infoCard: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 8,
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
});

