import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { ordersAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

function OrderTrackingScreen({ navigation }) {
  const alert = useAlert();
  const [selectedTab, setSelectedTab] = useState('active'); // 'active' or 'past'
  const [loading, setLoading] = useState(true);
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
        
        console.log('📦 Siparişler yüklendi:', orders.length, 'adet');
        if (orders.length > 0) {
          console.log('📦 İlk sipariş örneği:', JSON.stringify(orders[0], null, 2));
          console.log('📦 Status değerleri:', orders.map(o => ({ id: o.id, status: o.status, statusText: o.statusText, deliveryStatus: o.deliveryStatus })));
        }
        
        // Siparişleri durumlarına göre ayır
        const active = orders.filter(order => {
          // Timeline'daki son duruma bakarak gerçek durumu belirle
          let actualStatus = order.status;
          
          // completed durumu da delivered olarak kabul et
          if (actualStatus === 'completed') {
            actualStatus = 'delivered';
          }
          
          // Eğer timeline varsa ve son durum completed ise, sipariş teslim edilmiş sayılır
          if (order.timeline && Array.isArray(order.timeline) && order.timeline.length > 0) {
            const lastTimelineItem = order.timeline[order.timeline.length - 1];
            if (lastTimelineItem.status === 'completed' && lastTimelineItem.title?.toLowerCase().includes('teslim')) {
              actualStatus = 'delivered';
            }
          }
          
          return actualStatus !== 'delivered' && actualStatus !== 'cancelled';
        });
        
        const past = orders.filter(order => {
          // Timeline'daki son duruma bakarak gerçek durumu belirle
          let actualStatus = order.status;
          
          // completed durumu da delivered olarak kabul et
          if (actualStatus === 'completed') {
            actualStatus = 'delivered';
          }
          
          // Eğer timeline varsa ve son durum completed ise, sipariş teslim edilmiş sayılır
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
      console.error('Siparişler yükleme hatası:', error);
      // Hata durumunda demo veriler göster
      setActiveOrders([
        {
          id: 'ORD-8821',
          total: 145.00,
          itemCount: 2,
          status: 'processing',
          estimatedDelivery: 'Haziran 15',
          image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
        }
      ]);
      setPastOrders([
        {
          id: 'ORD-7740',
          total: 299.00,
          itemCount: 1,
          status: 'delivered',
          deliveredDate: 'Mayıs 20',
          image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400',
        },
        {
          id: 'ORD-6623',
          total: 89.50,
          itemCount: 3,
          status: 'delivered',
          deliveredDate: 'Nisan 12',
          image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
        },
        {
          id: 'ORD-5501',
          total: 45.00,
          itemCount: 1,
          status: 'cancelled',
          cancelledDate: 'Mart 05',
          image: 'https://images.unsplash.com/photo-1478827536114-da961b7f86d0?w=400',
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (order) => {
    // Timeline'daki son duruma bakarak gerçek durumu belirle
    let actualStatus = order.status;
    
    // Status değerini küçük harfe çevir ve normalize et
    if (typeof actualStatus === 'string') {
      actualStatus = actualStatus.toLowerCase().trim();
    }
    
    // Eğer timeline varsa ve son durum completed ise, sipariş teslim edilmiş sayılır
    if (order.timeline && Array.isArray(order.timeline) && order.timeline.length > 0) {
      const lastTimelineItem = order.timeline[order.timeline.length - 1];
      if (lastTimelineItem.status === 'completed' && lastTimelineItem.title?.toLowerCase().includes('teslim')) {
        actualStatus = 'delivered';
      }
    }
    
    // completed durumu da delivered olarak kabul et
    if (actualStatus === 'completed') {
      actualStatus = 'delivered';
    }
    
    // Status değerine göre Türkçe etiket döndür
    switch (actualStatus) {
      case 'processing':
      case 'hazırlanıyor':
        return {
          icon: 'cube-outline',
          label: 'Hazırlanıyor',
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.1)',
        };
      case 'shipped':
      case 'kargoda':
      case 'in cargo':
        return {
          icon: 'car-outline',
          label: 'Kargoda',
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.1)',
        };
      case 'delivered':
      case 'completed':
      case 'teslim edildi':
        return {
          icon: 'checkmark-circle',
          label: 'Teslim Edildi',
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
      case 'beklemede':
        return {
          icon: 'time-outline',
          label: 'Bekleniyor',
          color: COLORS.gray500,
          bgColor: COLORS.gray100,
        };
      default:
        // Eğer status değeri tanınmıyorsa, order.statusText veya order.deliveryStatus'a bak
        const altStatus = (order.statusText || order.deliveryStatus || '').toLowerCase();
        if (altStatus.includes('hazırlan')) {
          return {
            icon: 'cube-outline',
            label: 'Hazırlanıyor',
            color: '#f59e0b',
            bgColor: 'rgba(245, 158, 11, 0.1)',
          };
        } else if (altStatus.includes('kargo')) {
          return {
            icon: 'car-outline',
            label: 'Kargoda',
            color: '#3b82f6',
            bgColor: 'rgba(59, 130, 246, 0.1)',
          };
        } else if (altStatus.includes('teslim')) {
          return {
            icon: 'checkmark-circle',
            label: 'Teslim Edildi',
            color: COLORS.primary,
            bgColor: 'rgba(17, 212, 33, 0.1)',
          };
        } else if (altStatus.includes('iptal')) {
          return {
            icon: 'close-circle',
            label: 'İptal Edildi',
            color: '#ef4444',
            bgColor: 'rgba(239, 68, 68, 0.1)',
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
    
    // Timeline'daki son duruma bakarak gerçek durumu belirle
    let actualStatus = order.status;
    
    // completed durumu da delivered olarak kabul et
    if (actualStatus === 'completed') {
      actualStatus = 'delivered';
    }
    
    // Eğer timeline varsa ve son durum completed ise, sipariş teslim edilmiş sayılır
    if (order.timeline && Array.isArray(order.timeline) && order.timeline.length > 0) {
      const lastTimelineItem = order.timeline[order.timeline.length - 1];
      if (lastTimelineItem.status === 'completed' && lastTimelineItem.title?.toLowerCase().includes('teslim')) {
        actualStatus = 'delivered';
      }
    }
    
    console.log('🔍 Sipariş detayına gidiliyor:', { orderId, status: order.status, actualStatus });
    
    // Tüm siparişler için detay ekranına git (iade talebi oluşturmak için teslim edilmiş siparişler de görüntülenebilir)
    if (actualStatus !== 'cancelled') {
      navigation.navigate('OrderDetail', { orderId });
    } else {
      // Sadece iptal edilmiş siparişler için bilgi göster
      alert.show(
        'Bilgi',
        'İptal edilmiş siparişlerin detayları görüntülenemez.',
        [{ text: 'Tamam' }]
      );
    }
  };

  const renderOrderCard = (order, isPast = false) => {
    const statusConfig = getStatusConfig(order);
    
    // Güvenli değer çıkarma
    const orderTotal = parseFloat(order.total || order.totalAmount || 0);
    const itemCount = order.itemCount || order.items?.length || 0;
    const orderId = order.id || order.orderId || order._id || 'N/A';
    
    return (
      <TouchableOpacity
        key={orderId}
        style={[styles.orderCard, order.status === 'cancelled' && styles.orderCardCancelled]}
        onPress={() => handleOrderPress(order)}
        activeOpacity={0.7}
      >
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

          {/* Order Info */}
          <Text style={styles.orderNumber}>Sipariş #{orderId}</Text>
          <Text style={styles.orderPrice}>
            ₺{orderTotal.toFixed(2)} • {itemCount} Ürün
          </Text>
          
          {/* Date Info */}
          {(() => {
            // Timeline'daki son duruma bakarak gerçek durumu belirle
            let actualStatus = order.status;
            
            // completed durumu da delivered olarak kabul et
            if (actualStatus === 'completed') {
              actualStatus = 'delivered';
            }
            
            // Eğer timeline varsa ve son durum completed ise, sipariş teslim edilmiş sayılır
            if (order.timeline && Array.isArray(order.timeline) && order.timeline.length > 0) {
              const lastTimelineItem = order.timeline[order.timeline.length - 1];
              if (lastTimelineItem.status === 'completed' && lastTimelineItem.title?.toLowerCase().includes('teslim')) {
                actualStatus = 'delivered';
              }
            }
            
            if (actualStatus === 'processing' || actualStatus === 'shipped') {
              return (
                <Text style={styles.orderDate}>
                  Tahmini Teslimat: {order.estimatedDelivery || order.estimatedDeliveryDate || 'Hesaplanıyor...'}
                </Text>
              );
            } else if (actualStatus === 'delivered') {
              return (
                <Text style={styles.orderDate}>
                  Teslim Edildi: {order.deliveredDate || order.deliveryDate || new Date(order.updatedAt || order.createdAt).toLocaleDateString('tr-TR')}
                </Text>
              );
            } else if (actualStatus === 'cancelled') {
              return (
                <Text style={styles.orderDate}>
                  İptal Tarihi: {order.cancelledDate || order.cancelDate || new Date(order.updatedAt || order.createdAt).toLocaleDateString('tr-TR')}
                </Text>
              );
            } else {
              // Beklemede veya diğer durumlar için tarih gösterme
              return null;
            }
          })()}

          {/* Action Button */}
          {isPast ? (
            <TouchableOpacity 
              style={styles.viewDetailsButton}
              onPress={() => {
                const orderId = order.id || order.orderId || order._id;
                if (order.status !== 'cancelled') {
                  navigation.navigate('OrderDetail', { orderId });
                }
              }}
            >
              <Text style={styles.viewDetailsText}>Detayları Gör</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.trackButton}
              onPress={() => {
                const orderId = order.id || order.orderId || order._id;
                navigation.navigate('OrderDetail', { orderId });
              }}
            >
              <Text style={styles.trackButtonText}>Siparişi Takip Et</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Product Image */}
        <View style={[styles.orderImage, order.status === 'cancelled' && styles.orderImageCancelled]}>
          {order.image || order.items?.[0]?.image || order.items?.[0]?.productImage ? (
            <Image
              source={{ uri: order.image || order.items?.[0]?.image || order.items?.[0]?.productImage }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="cube-outline" size={32} color={COLORS.gray400} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Siparişlerim</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter-outline" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      {/* Segmented Control (Tabs) */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsWrapper}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'active' && styles.tabActive]}
            onPress={() => setSelectedTab('active')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, selectedTab === 'active' && styles.tabTextActive]}>
              Aktif
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'past' && styles.tabActive]}
            onPress={() => setSelectedTab('past')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, selectedTab === 'past' && styles.tabTextActive]}>
              Geçmiş
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Siparişler yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {selectedTab === 'active' ? (
            <>
              {/* Active Orders Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Aktif Siparişler</Text>
                <View style={styles.ordersContainer}>
                  {activeOrders.length > 0 ? (
                    activeOrders.map(order => renderOrderCard(order, false))
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons name="cube-outline" size={64} color={COLORS.gray300} />
                      <Text style={styles.emptyTitle}>Aktif Sipariş Yok</Text>
                      <Text style={styles.emptyText}>
                        Henüz aktif siparişiniz bulunmuyor
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          ) : (
            <>
              {/* Past Orders Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Geçmiş Siparişler</Text>
                <View style={styles.ordersContainer}>
                  {pastOrders.length > 0 ? (
                    pastOrders.map(order => renderOrderCard(order, true))
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons name="time-outline" size={64} color={COLORS.gray300} />
                      <Text style={styles.emptyTitle}>Geçmiş Sipariş Yok</Text>
                      <Text style={styles.emptyText}>
                        Henüz tamamlanmış siparişiniz bulunmuyor
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}

          {/* End Indicator */}
          {((selectedTab === 'active' && activeOrders.length > 0) || 
            (selectedTab === 'past' && pastOrders.length > 0)) && (
            <View style={styles.endIndicator}>
              <Text style={styles.endText}>Siparişlerinizin sonuna ulaştınız</Text>
            </View>
          )}
        </ScrollView>
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
    backgroundColor: 'rgba(246, 248, 247, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    flex: 1,
    textAlign: 'center',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tabsWrapper: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: COLORS.gray200,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  tabTextActive: {
    color: COLORS.textMain,
    fontWeight: '700',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  ordersContainer: {
    paddingHorizontal: 16,
    gap: 16,
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
    marginBottom: 16,
  },
  orderCardCancelled: {
    opacity: 0.8,
  },
  orderCardContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 12,
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
  trackButton: {
    height: 36,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  viewDetailsButton: {
    height: 36,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  orderImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  orderImageCancelled: {
    opacity: 0.5,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: 'center',
  },
  endIndicator: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  endText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.gray400,
  },
});

export default OrderTrackingScreen;
