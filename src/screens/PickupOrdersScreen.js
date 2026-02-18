import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { ordersAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

export default function PickupOrdersScreen({ navigation }) {
  const alert = useAlert();
  const [selectedTab, setSelectedTab] = useState('active'); // 'active' or 'past'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [userId, setUserId] = useState(null);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      
      if (!storedUserId) {
        setShowLoginRequiredModal(true);
        setLoading(false);
        return;
      }

      setUserId(storedUserId);
      const response = await ordersAPI.getByUser(storedUserId);
      
      if (response.data?.success) {
        const orders = response.data.orders || response.data.data || [];
        
        // Sadece mağazadan teslim alınan siparişleri filtrele
        const pickupOrders = orders.filter(order => {
          // deliveryMethod kontrolü
          if (order.deliveryMethod === 'pickup') {
            return true;
          }
          // pickupStoreId veya pickupStoreName kontrolü
          if (order.pickupStoreId || order.pickupStoreName) {
            return true;
          }
          // shippingAddress içinde mağaza adı kontrolü (fallback)
          if (order.shippingAddress && (
            order.shippingAddress.includes('Huğlu') || 
            order.shippingAddress.includes('Mağaza') ||
            order.shippingAddress.includes('Şube')
          )) {
            return true;
          }
          return false;
        });
        
        console.log('🏪 Mağazadan teslim al siparişleri:', pickupOrders.length, 'adet');
        
        // Siparişleri durumlarına göre ayır
        const active = pickupOrders.filter(order => {
          let actualStatus = order.status;
          
          if (actualStatus === 'completed') {
            actualStatus = 'delivered';
          }
          
          if (order.timeline && Array.isArray(order.timeline) && order.timeline.length > 0) {
            const lastTimelineItem = order.timeline[order.timeline.length - 1];
            if (lastTimelineItem.status === 'completed' && lastTimelineItem.title?.toLowerCase().includes('teslim')) {
              actualStatus = 'delivered';
            }
          }
          
          return actualStatus !== 'delivered' && actualStatus !== 'cancelled';
        });
        
        const past = pickupOrders.filter(order => {
          let actualStatus = order.status;
          
          if (actualStatus === 'completed') {
            actualStatus = 'delivered';
          }
          
          if (order.timeline && Array.isArray(order.timeline) && order.timeline.length > 0) {
            const lastTimelineItem = order.timeline[order.timeline.length - 1];
            if (lastTimelineItem.status === 'completed' && lastTimelineItem.title?.toLowerCase().includes('teslim')) {
              actualStatus = 'delivered';
            }
          }
          
          return actualStatus === 'delivered' || actualStatus === 'cancelled';
        });
        
        setActiveOrders(active);
        setPastOrders(past);
      }
    } catch (error) {
      console.error('Mağazadan teslim al siparişleri yükleme hatası:', error);
      setActiveOrders([]);
      setPastOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusConfig = (order) => {
    let actualStatus = order.status;
    
    if (typeof actualStatus === 'string') {
      actualStatus = actualStatus.toLowerCase().trim();
    }
    
    if (order.timeline && Array.isArray(order.timeline) && order.timeline.length > 0) {
      const lastTimelineItem = order.timeline[order.timeline.length - 1];
      if (lastTimelineItem.status === 'completed' && lastTimelineItem.title?.toLowerCase().includes('teslim')) {
        actualStatus = 'delivered';
      }
    }
    
    if (actualStatus === 'completed') {
      actualStatus = 'delivered';
    }
    
    switch (actualStatus) {
      case 'processing':
      case 'hazırlanıyor':
        return {
          icon: 'cube-outline',
          label: 'Hazırlanıyor',
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.1)',
        };
      case 'ready':
      case 'hazır':
        return {
          icon: 'checkmark-circle-outline',
          label: 'Hazır',
          color: COLORS.primary,
          bgColor: 'rgba(17, 212, 33, 0.1)',
        };
      case 'delivered':
      case 'teslim edildi':
        return {
          icon: 'checkmark-circle',
          label: 'Teslim Alındı',
          color: COLORS.primary,
          bgColor: 'rgba(17, 212, 33, 0.1)',
        };
      case 'cancelled':
      case 'canceled':
      case 'iptal edildi':
        return {
          icon: 'close-circle',
          label: 'İptal Edildi',
          color: '#ef4444',
          bgColor: 'rgba(239, 68, 68, 0.1)',
        };
      case 'pending':
      case 'bekleniyor':
        return {
          icon: 'time-outline',
          label: 'Bekleniyor',
          color: COLORS.gray500,
          bgColor: COLORS.gray100,
        };
      default:
        const altStatus = (order.statusText || order.deliveryStatus || '').toLowerCase();
        if (altStatus.includes('hazır')) {
          return {
            icon: 'checkmark-circle-outline',
            label: 'Hazır',
            color: COLORS.primary,
            bgColor: 'rgba(17, 212, 33, 0.1)',
          };
        }
        return {
          icon: 'time-outline',
          label: 'Bekleniyor',
          color: COLORS.gray500,
          bgColor: COLORS.gray100,
        };
    }
  };

  const handleOrderPress = (order) => {
    const orderId = order.id || order.orderId || order._id;
    
    let actualStatus = order.status;
    if (actualStatus === 'completed') {
      actualStatus = 'delivered';
    }
    
    if (order.timeline && Array.isArray(order.timeline) && order.timeline.length > 0) {
      const lastTimelineItem = order.timeline[order.timeline.length - 1];
      if (lastTimelineItem.status === 'completed' && lastTimelineItem.title?.toLowerCase().includes('teslim')) {
        actualStatus = 'delivered';
      }
    }
    
    if (actualStatus !== 'cancelled') {
      navigation.navigate('OrderDetail', { orderId });
    } else {
      alert.show(
        'Bilgi',
        'İptal edilmiş siparişlerin detayları görüntülenemez.',
        [{ text: 'Tamam' }]
      );
    }
  };

  const getStoreName = (order) => {
    if (order.pickupStoreName) {
      return order.pickupStoreName;
    }
    if (order.shippingAddress) {
      // Shipping address'ten mağaza adını çıkar
      const lines = order.shippingAddress.split('\n');
      if (lines.length > 0 && (lines[0].includes('Huğlu') || lines[0].includes('Mağaza'))) {
        return lines[0];
      }
    }
    return 'Mağaza';
  };

  const renderOrderCard = (order, isPast = false) => {
    const statusConfig = getStatusConfig(order);
    const orderTotal = parseFloat(order.total || order.totalAmount || 0);
    const itemCount = order.itemCount || order.items?.length || 0;
    const orderId = order.id || order.orderId || order._id || 'N/A';
    const storeName = getStoreName(order);
    const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) : '';

    // İlk ürünün resmini al
    const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
    const orderImage = firstItem?.productImage || firstItem?.image || null;

    return (
      <TouchableOpacity
        key={orderId}
        style={[styles.orderCard, order.status === 'cancelled' && styles.orderCardCancelled]}
        onPress={() => handleOrderPress(order)}
        activeOpacity={0.7}
      >
        {/* Order Image */}
        {orderImage && (
          <View style={styles.orderImageContainer}>
            <Image source={{ uri: orderImage }} style={styles.orderImage} />
          </View>
        )}

        <View style={styles.orderCardContent}>
          {/* Status Badge */}
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          {/* Order Number */}
          <Text style={styles.orderNumber}>Sipariş #{orderId}</Text>

          {/* Store Info */}
          <View style={styles.storeInfo}>
            <Ionicons name="storefront-outline" size={16} color={COLORS.gray500} />
            <Text style={styles.storeName}>{storeName}</Text>
          </View>

          {/* Item Count */}
          <Text style={styles.orderPrice}>
            {itemCount} {itemCount === 1 ? 'ürün' : 'ürün'} • ₺{orderTotal.toFixed(2)}
          </Text>

          {/* Order Date */}
          {orderDate && (
            <Text style={styles.orderDate}>{orderDate}</Text>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => handleOrderPress(order)}
            >
              <Text style={styles.trackButtonText}>Detayları Gör</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mağazadan Teslim Al</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentOrders = selectedTab === 'active' ? activeOrders : pastOrders;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mağazadan Teslim Al</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'active' && styles.tabActive]}
          onPress={() => setSelectedTab('active')}
        >
          <Text style={[styles.tabText, selectedTab === 'active' && styles.tabTextActive]}>
            Aktif ({activeOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'past' && styles.tabActive]}
          onPress={() => setSelectedTab('past')}
        >
          <Text style={[styles.tabText, selectedTab === 'past' && styles.tabTextActive]}>
            Geçmiş ({pastOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {currentOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={80} color={COLORS.gray300} />
            <Text style={styles.emptyTitle}>
              {selectedTab === 'active' ? 'Aktif Sipariş Yok' : 'Geçmiş Sipariş Yok'}
            </Text>
            <Text style={styles.emptyText}>
              {selectedTab === 'active'
                ? 'Mağazadan teslim almak için bekleyen siparişiniz bulunmuyor.'
                : 'Mağazadan teslim aldığınız sipariş bulunmuyor.'}
            </Text>
          </View>
        ) : (
          <View style={styles.ordersContainer}>
            {currentOrders.map((order) => renderOrderCard(order, selectedTab === 'past'))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
  ordersContainer: {
    paddingHorizontal: 16,
    gap: 16,
    paddingTop: 16,
  },
  orderCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  orderCardCancelled: {
    opacity: 0.8,
  },
  orderImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    overflow: 'hidden',
  },
  orderImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  orderCardContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    lineHeight: 20,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  orderPrice: {
    fontSize: 14,
    color: COLORS.gray500,
    marginTop: 4,
  },
  orderDate: {
    fontSize: 12,
    color: COLORS.gray400,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  trackButton: {
    height: 36,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
});














