import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { returnRequestsAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

const STATUS_CONFIG = {
  pending: {
    label: 'Beklemede',
    color: '#F59E0B',
    icon: 'time-outline',
  },
  approved: {
    label: 'Onaylandı',
    color: COLORS.primary,
    icon: 'checkmark-circle-outline',
  },
  processing: {
    label: 'İşleniyor',
    color: '#3B82F6',
    icon: 'sync-outline',
  },
  completed: {
    label: 'Tamamlandı',
    color: '#10b981',
    icon: 'checkmark-done-outline',
  },
  rejected: {
    label: 'Reddedildi',
    color: '#EF4444',
    icon: 'close-circle-outline',
  },
};

export default function ReturnRequestsListScreen({ navigation }) {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [returnRequests, setReturnRequests] = useState([]);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    loadReturnRequests();
  }, []);

  const loadReturnRequests = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      
      if (!storedUserId) {
        alert.show('Hata', 'Lütfen giriş yapın');
        navigation.goBack();
        return;
      }

      setUserId(storedUserId);

      console.log('🔄 İade talepleri yükleniyor... userId:', storedUserId);
      const response = await returnRequestsAPI.get(storedUserId);
      
      console.log('📦 İade talepleri yanıtı:', JSON.stringify(response.data, null, 2));

      if (response.data?.success) {
        const requests = response.data.data || response.data.returnRequests || [];
        console.log('📋 İade talepleri örneği:', requests[0]);
        setReturnRequests(Array.isArray(requests) ? requests : []);
        console.log('✅ İade talepleri yüklendi:', requests.length, 'adet');
      } else {
        console.warn('⚠️ İade talepleri API başarısız yanıt döndü');
        setReturnRequests([]);
      }
    } catch (error) {
      console.error('❌ İade talepleri yükleme hatası:', {
        message: error.message,
        response: error.response?.data,
      });
      setReturnRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReturnRequests();
    setRefreshing(false);
  };

  const handleCancelRequest = (requestId) => {
    alert.show(
      'İade Talebini İptal Et',
      'Bu iade talebini iptal etmek istediğinizden emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await returnRequestsAPI.cancel(requestId, userId);
              if (response.data?.success) {
                alert.show('Başarılı', 'İade talebi iptal edildi');
                loadReturnRequests();
              } else {
                alert.show('Hata', response.data?.message || 'İade talebi iptal edilemedi');
              }
            } catch (error) {
              console.error('İade talebi iptal hatası:', error);
              alert.show('Hata', error.response?.data?.message || 'İade talebi iptal edilemedi');
            }
          },
        },
      ]
    );
  };

  const renderReturnRequest = ({ item }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const canCancel = item.status === 'pending';

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => navigation.navigate('ReturnRequestDetail', { requestId: item.id })}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestInfo}>
            <Text style={styles.requestId}>İade #{item.id || item._id}</Text>
            <Text style={styles.requestDate}>
              {new Date(item.createdAt || item.date).toLocaleDateString('tr-TR')}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
            <Ionicons name={status.icon} size={16} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.requestBody}>
          <View style={styles.requestDetail}>
            <Ionicons name="cube-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.requestDetailText}>
              {item.itemCount || item.items?.length || 0} Ürün
            </Text>
          </View>
          <View style={styles.requestDetail}>
            <Ionicons name="cash-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.requestDetailText}>
              ₺{parseFloat(item.refundAmount || 0).toFixed(2)}
            </Text>
          </View>
          {item.reason && (
            <View style={styles.requestDetail}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.requestDetailText} numberOfLines={1}>
                {item.reason}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.requestFooter}>
          <TouchableOpacity style={styles.detailButton}>
            <Text style={styles.detailButtonText}>Detayları Gör</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelRequest(item.id || item._id)}
            >
              <Text style={styles.cancelButtonText}>İptal Et</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="return-down-back-outline" size={64} color={COLORS.gray300} />
      </View>
      <Text style={styles.emptyTitle}>İade Talebiniz Yok</Text>
      <Text style={styles.emptySubtitle}>
        Siparişlerinizden iade talebi oluşturabilirsiniz.
      </Text>
      <TouchableOpacity
        style={styles.ordersButton}
        onPress={() => navigation.navigate('OrderTracking')}
      >
        <Text style={styles.ordersButtonText}>Siparişlerime Git</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İade Taleplerim</Text>
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
        <Text style={styles.headerTitle}>İade Taleplerim</Text>
        <View style={{ width: 40 }} />
      </View>

      {returnRequests.length > 0 ? (
        <FlatList
          data={returnRequests}
          keyExtractor={(item) => (item.id || item._id).toString()}
          renderItem={renderReturnRequest}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        />
      ) : (
        <EmptyState />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
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
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  listContent: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestId: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  requestBody: {
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  requestDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestDetailText: {
    fontSize: 14,
    color: COLORS.textMain,
    flex: 1,
  },
  requestFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  detailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderRadius: 8,
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  ordersButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ordersButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
