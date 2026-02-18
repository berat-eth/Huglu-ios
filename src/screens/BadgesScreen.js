import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { gamificationAPI } from '../services/api';
import { secureStorage } from '../utils/secureStorage';
import { useAlert } from '../hooks/useAlert';

const RARITY_COLORS = {
  common: { bg: '#E5E7EB', text: '#6B7280', border: '#D1D5DB' },
  rare: { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
  epic: { bg: '#EDE9FE', text: '#5B21B6', border: '#A78BFA' },
  legendary: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
};

const RARITY_LABELS = {
  common: 'Yaygın',
  rare: 'Nadir',
  epic: 'Efsanevi',
  legendary: 'Efsane',
};

export default function BadgesScreen({ navigation }) {
  const alert = useAlert();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [filter, setFilter] = useState('all'); // all, earned, unearned, by_category

  useEffect(() => {
    loadBadges();
  }, []);

  // Ensure badges is always an array
  const safeBadges = Array.isArray(badges) ? badges : [];

  const loadBadges = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      if (!storedUserId) {
        navigation.replace('Login');
        return;
      }

      setUserId(storedUserId);

      // Check for new badges first
      try {
        await gamificationAPI.checkBadges(storedUserId);
      } catch (error) {
        console.log('Badge check error:', error);
      }

      // Load badges
      const response = await gamificationAPI.getBadges(storedUserId);

      if (response.data?.success) {
        const badgesData = response.data.data;
        // Ensure it's an array
        if (Array.isArray(badgesData)) {
          setBadges(badgesData);
        } else if (badgesData && Array.isArray(badgesData.badges)) {
          // Handle nested structure
          setBadges(badgesData.badges);
        } else {
          setBadges([]);
        }
      } else {
        setBadges([]);
      }
    } catch (error) {
      console.error('Error loading badges:', error);
      alert.show('Hata', 'Rozetler yüklenirken bir hata oluştu');
      setBadges([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBadges();
  };

  const filteredBadges = safeBadges.filter(badge => {
    if (filter === 'earned') return badge.earned;
    if (filter === 'unearned') return !badge.earned;
    return true;
  });

  const earnedCount = safeBadges.filter(b => b.earned).length;
  const totalCount = safeBadges.length;
  const categories = [...new Set(safeBadges.map(b => b.category))];

  const getRarityStyle = (rarity) => {
    return RARITY_COLORS[rarity] || RARITY_COLORS.common;
  };

  const getRarityIcon = (rarity) => {
    switch (rarity) {
      case 'legendary':
        return 'star';
      case 'epic':
        return 'diamond';
      case 'rare':
        return 'star-outline';
      default:
        return 'ellipse';
    }
  };

  if (loading && safeBadges.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rozetler</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
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
        <Text style={styles.headerTitle}>Rozetler</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => {
            setRefreshing(true);
            loadBadges();
          }}
        >
          <Ionicons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{earnedCount}</Text>
          <Text style={styles.statLabel}>Kazanılan</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalCount}</Text>
          <Text style={styles.statLabel}>Toplam</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0}%
          </Text>
          <Text style={styles.statLabel}>Tamamlanma</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            Tümü
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'earned' && styles.filterTabActive]}
          onPress={() => setFilter('earned')}
        >
          <Text style={[styles.filterTabText, filter === 'earned' && styles.filterTabTextActive]}>
            Kazanılan ({earnedCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unearned' && styles.filterTabActive]}
          onPress={() => setFilter('unearned')}
        >
          <Text style={[styles.filterTabText, filter === 'unearned' && styles.filterTabTextActive]}>
            Kazanılacak ({totalCount - earnedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Badges Grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.badgesGrid}
      >
        {filteredBadges.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={80} color={COLORS.gray300} />
            <Text style={styles.emptyTitle}>
              {filter === 'earned' ? 'Henüz Rozet Kazanmadınız' : 'Rozet Bulunamadı'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'earned' 
                ? 'Aktivitelerinizi tamamlayarak rozetler kazanabilirsiniz!'
                : 'Tüm rozetleri görmek için filtreyi değiştirin.'}
            </Text>
          </View>
        ) : (
          filteredBadges.map((badge) => {
            const rarityStyle = getRarityStyle(badge.rarity);
            const isEarned = badge.earned;

            return (
              <TouchableOpacity
                key={badge.badgeId}
                style={[
                  styles.badgeCard,
                  !isEarned && styles.badgeCardLocked,
                  { borderColor: rarityStyle.border }
                ]}
                onPress={() => setSelectedBadge(badge)}
                activeOpacity={0.8}
              >
                <View style={[styles.badgeIconContainer, { backgroundColor: rarityStyle.bg }]}>
                  <Ionicons
                    name={isEarned ? badge.icon : 'lock-closed'}
                    size={48}
                    color={isEarned ? rarityStyle.text : COLORS.gray400}
                  />
                  {isEarned && (
                    <View style={styles.earnedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    </View>
                  )}
                </View>
                <Text style={[styles.badgeName, !isEarned && styles.badgeNameLocked]} numberOfLines={2}>
                  {badge.name}
                </Text>
                <View style={styles.badgeRarity}>
                  <Ionicons 
                    name={getRarityIcon(badge.rarity)} 
                    size={12} 
                    color={rarityStyle.text} 
                  />
                  <Text style={[styles.badgeRarityText, { color: rarityStyle.text }]}>
                    {RARITY_LABELS[badge.rarity] || badge.rarity}
                  </Text>
                </View>
                {isEarned && badge.earnedAt && (
                  <Text style={styles.badgeDate}>
                    {new Date(badge.earnedAt).toLocaleDateString('tr-TR')}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Badge Detail Modal */}
      <Modal
        visible={!!selectedBadge}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedBadge(null)}
        >
          <View style={styles.modalContent}>
            {selectedBadge && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Rozet Detayı</Text>
                  <TouchableOpacity onPress={() => setSelectedBadge(null)}>
                    <Ionicons name="close" size={24} color={COLORS.textMain} />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  <View style={[
                    styles.modalBadgeIcon,
                    { backgroundColor: getRarityStyle(selectedBadge.rarity).bg }
                  ]}>
                    <Ionicons
                      name={selectedBadge.earned ? selectedBadge.icon : 'lock-closed'}
                      size={80}
                      color={selectedBadge.earned ? getRarityStyle(selectedBadge.rarity).text : COLORS.gray400}
                    />
                  </View>
                  <Text style={styles.modalBadgeName}>{selectedBadge.name}</Text>
                  <Text style={styles.modalBadgeDescription}>{selectedBadge.description}</Text>
                  <View style={styles.modalRarityInfo}>
                    <Ionicons 
                      name={getRarityIcon(selectedBadge.rarity)} 
                      size={20} 
                      color={getRarityStyle(selectedBadge.rarity).text} 
                    />
                    <Text style={[
                      styles.modalRarityText,
                      { color: getRarityStyle(selectedBadge.rarity).text }
                    ]}>
                      {RARITY_LABELS[selectedBadge.rarity] || selectedBadge.rarity} Rozet
                    </Text>
                  </View>
                  {selectedBadge.earned && selectedBadge.earnedAt && (
                    <View style={styles.modalEarnedInfo}>
                      <Ionicons name="calendar-outline" size={16} color={COLORS.gray500} />
                      <Text style={styles.modalEarnedDate}>
                        {new Date(selectedBadge.earnedAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })} tarihinde kazanıldı
                      </Text>
                    </View>
                  )}
                  {!selectedBadge.earned && (
                    <View style={styles.modalLockedInfo}>
                      <Ionicons name="lock-closed" size={20} color={COLORS.gray400} />
                      <Text style={styles.modalLockedText}>
                        Bu rozeti kazanmak için görevi tamamlamanız gerekiyor
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {alert.AlertComponent()}
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
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
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray500,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.gray200,
    marginHorizontal: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  badgeCard: {
    width: '47%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeCardLocked: {
    opacity: 0.6,
  },
  badgeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  earnedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    textAlign: 'center',
    marginBottom: 6,
    minHeight: 40,
  },
  badgeNameLocked: {
    color: COLORS.gray500,
  },
  badgeRarity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  badgeRarityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeDate: {
    fontSize: 10,
    color: COLORS.gray500,
    marginTop: 4,
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  modalBody: {
    padding: 24,
    alignItems: 'center',
  },
  modalBadgeIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalBadgeName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalBadgeDescription: {
    fontSize: 15,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  modalRarityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  modalRarityText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalEarnedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
  },
  modalEarnedDate: {
    fontSize: 13,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  modalLockedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  modalLockedText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning || '#F59E0B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
