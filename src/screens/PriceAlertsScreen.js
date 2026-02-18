import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { priceAlertsAPI } from '../services/api';
import { secureStorage } from '../utils/secureStorage';
import { useAlert } from '../hooks/useAlert';

export default function PriceAlertsScreen({ navigation }) {
  const alert = useAlert();
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      loadPriceAlerts();
    }
  }, [userId]);

  const loadUserId = async () => {
    try {
      const id = await secureStorage.getItem('userId');
      setUserId(id);
    } catch (error) {
      console.error('Error loading userId:', error);
      alert.show('Hata', 'Kullanıcı bilgisi yüklenemedi');
    }
  };

  const loadPriceAlerts = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await priceAlertsAPI.getUserAlerts(userId, true);

      if (response.data?.success) {
        setPriceAlerts(response.data.data || []);
      } else {
        setPriceAlerts([]);
      }
    } catch (error) {
      console.error('Error loading price alerts:', error);
      alert.show('Hata', 'Fiyat alarmları yüklenirken bir hata oluştu');
      setPriceAlerts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPriceAlerts();
  };

  const handleToggleAlert = async (alertItem) => {
    if (!userId) return;

    try {
      const newActiveState = !alertItem.isActive;
      const response = await priceAlertsAPI.update(alertItem.id, userId, newActiveState);

      if (response.data?.success) {
        setPriceAlerts(prev =>
          prev.map(alert =>
            alert.id === alertItem.id ? { ...alert, isActive: newActiveState } : alert
          )
        );
        alert.show(
          'Başarılı',
          newActiveState ? 'Fiyat alarmı etkinleştirildi' : 'Fiyat alarmı devre dışı bırakıldı'
        );
      }
    } catch (error) {
      console.error('Error toggling alert:', error);
      alert.show('Hata', 'Fiyat alarmı güncellenirken bir hata oluştu');
    }
  };

  const handleDeleteAlert = (alertItem) => {
    Alert.alert(
      'Fiyat Alarmını Sil',
      'Bu fiyat alarmını silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return;

            try {
              const response = await priceAlertsAPI.delete(alertItem.id, userId);

              if (response.data?.success) {
                setPriceAlerts(prev => prev.filter(alert => alert.id !== alertItem.id));
                alert.show('Başarılı', 'Fiyat alarmı silindi');
              }
            } catch (error) {
              console.error('Error deleting alert:', error);
              alert.show('Hata', 'Fiyat alarmı silinirken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const formatPrice = (price) => {
    const numericPrice = parseFloat(price) || 0;
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(numericPrice);
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Bilinmeyen tarih';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Geçersiz tarih';
      return date.toLocaleDateString('tr-TR');
    } catch (error) {
      return 'Bilinmeyen tarih';
    }
  };

  const getAlertStatusText = (alertItem) => {
    if (!alertItem) return 'Bilinmiyor';
    
    if (!alertItem.isActive) {
      return 'Devre dışı';
    }
    
    if (alertItem.shouldTrigger) {
      return 'Tetiklenmiş ✓';
    }

    const targetPrice = parseFloat(alertItem.targetPrice || 0);
    const percentageDiscount = alertItem.percentageDiscount || 0;

    if (alertItem.alertType === 'below') {
      return `₺${targetPrice.toFixed(2)}'ye düşerse bildir`;
    } else if (alertItem.alertType === 'above') {
      return `₺${targetPrice.toFixed(2)}'ye çıkarsa bildir`;
    } else if (alertItem.alertType === 'percentage') {
      return `%${percentageDiscount} indirim olursa bildir`;
    }

    return 'Aktif';
  };

  const getCurrentPrice = (alertItem) => {
    return parseFloat(alertItem.currentProductPrice || alertItem.currentPrice || 0);
  };

  // Filter out any invalid alert items and separate by status
  const validAlerts = priceAlerts.filter(alert => alert && alert.id);
  const activeAlerts = validAlerts.filter(alert => alert.isActive);
  const inactiveAlerts = validAlerts.filter(alert => !alert.isActive);

  if (loading && priceAlerts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fiyat Alarmları</Text>
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
        <Text style={styles.headerTitle}>Fiyat Alarmları</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeAlerts.length === 0 && inactiveAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={80} color={COLORS.gray300} />
            <Text style={styles.emptyTitle}>Henüz Fiyat Alarmı Yok</Text>
            <Text style={styles.emptySubtitle}>
              İlgilendiğiniz ürünler için fiyat alarmı oluşturun ve fiyat düştüğünde haberdar olun!
            </Text>
          </View>
        ) : (
          <>
            {/* Active Alerts */}
            {activeAlerts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Aktif Alarmlar ({activeAlerts.length})</Text>
                {activeAlerts.map((alertItem) => (
                  <View key={alertItem.id} style={styles.alertCard}>
                    <View style={styles.alertHeader}>
                      {alertItem.productImage ? (
                        <Image
                          source={{ uri: alertItem.productImage }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.productImage, styles.productImagePlaceholder]}>
                          <Ionicons name="image-outline" size={24} color={COLORS.gray400} />
                        </View>
                      )}
                      <View style={styles.alertInfo}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {alertItem.productName || 'İsimsiz Ürün'}
                        </Text>
                        <Text style={styles.alertStatus}>{getAlertStatusText(alertItem)}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteAlert(alertItem)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.priceInfo}>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Mevcut Fiyat:</Text>
                        <Text style={styles.currentPrice}>
                          {formatPrice(getCurrentPrice(alertItem))}
                        </Text>
                      </View>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Hedef Fiyat:</Text>
                        <Text style={styles.targetPrice}>
                          {formatPrice(alertItem.targetPrice)}
                        </Text>
                      </View>
                      {alertItem.shouldTrigger ? (
                        <View style={styles.triggeredBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                          <Text style={styles.triggeredText}>Fiyat düştü! Bildirim gönderildi.</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.alertFooter}>
                      <Text style={styles.createdDate}>
                        {formatDate(alertItem.createdAt)} tarihinde oluşturuldu
                      </Text>
                      <Switch
                        value={alertItem.isActive}
                        onValueChange={() => handleToggleAlert(alertItem)}
                        trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                        thumbColor={COLORS.white}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Inactive Alerts */}
            {inactiveAlerts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Devre Dışı Alarmlar ({inactiveAlerts.length})</Text>
                {inactiveAlerts.map((alertItem) => (
                  <View key={alertItem.id} style={[styles.alertCard, styles.inactiveCard]}>
                    <View style={styles.alertHeader}>
                      {alertItem.productImage ? (
                        <Image
                          source={{ uri: alertItem.productImage }}
                          style={[styles.productImage, styles.inactiveImage]}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.productImage, styles.productImagePlaceholder]}>
                          <Ionicons name="image-outline" size={24} color={COLORS.gray400} />
                        </View>
                      )}
                      <View style={styles.alertInfo}>
                        <Text style={[styles.productName, styles.inactiveText]} numberOfLines={2}>
                          {alertItem.productName || 'İsimsiz Ürün'}
                        </Text>
                        <Text style={styles.alertStatus}>Devre dışı</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteAlert(alertItem)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.alertFooter}>
                      <Text style={styles.createdDate}>
                        {formatDate(alertItem.createdAt)} tarihinde oluşturuldu
                      </Text>
                      <Switch
                        value={alertItem.isActive}
                        onValueChange={() => handleToggleAlert(alertItem)}
                        trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                        thumbColor={COLORS.white}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
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
  emptyState: {
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  alertCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    marginRight: 12,
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray200,
  },
  inactiveImage: {
    opacity: 0.5,
  },
  alertInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  inactiveText: {
    color: COLORS.gray500,
  },
  alertStatus: {
    fontSize: 13,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  priceInfo: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.gray100,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  targetPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  triggeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  triggeredText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
    marginLeft: 6,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createdDate: {
    fontSize: 12,
    color: COLORS.gray500,
  },
});
