import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Clipboard, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { COLORS } from '../constants/colors';
import { ordersAPI, invoicesAPI, returnRequestsAPI } from '../services/api';
import { getApiUrl } from '../config/api.config';
import ErrorModal from '../components/ErrorModal';
import SuccessModal from '../components/SuccessModal';
import { Linking } from 'react-native';
import { useAlert } from '../hooks/useAlert';

// Google Maps logosunu gizlemek için custom style
const hideGoogleLogoStyle = [
  {
    featureType: 'all',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }]
  }
];

export default function OrderDetailScreen({ navigation, route }) {
  const alert = useAlert();
  const { orderId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('Hata');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

  const loadOrderDetail = async () => {
    try {
      setLoading(true);
      
      if (!orderId) {
        setErrorTitle('Hata');
        setErrorMessage('Sipariş bulunamadı');
        setShowErrorModal(true);
        setLoading(false);
        return;
      }

      // Kullanıcı ID'sini yükle
      const storedUserId = await secureStorage.getItem('userId');
      if (storedUserId) {
        setUserId(storedUserId);
      }

      const response = await ordersAPI.getById(orderId);
      
      if (response.data?.success) {
        const orderData = response.data.order || response.data.data;
        console.log('📦 Sipariş detayı yüklendi:', JSON.stringify(orderData, null, 2));
        setOrder(orderData);
      } else {
        const errorMsg = response.data?.message || 'Sipariş bulunamadı';
        console.warn('⚠️ Sipariş detayı API başarısız yanıt döndü:', {
          status: response.status,
          message: errorMsg,
          orderId,
        });
        setErrorTitle('Sipariş Bulunamadı');
        setErrorMessage(`Sipariş #${orderId} bulunamadı. Lütfen siparişlerim sayfasından geçerli bir sipariş seçin.`);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('❌ Sipariş detayı yükleme hatası:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        orderId,
      });
      
      const errorMsg = error.response?.status === 404 
        ? `Sipariş #${orderId} bulunamadı. Bu sipariş silinmiş veya mevcut olmayabilir.`
        : 'Sipariş detayları yüklenirken bir hata oluştu. Lütfen tekrar deneyin.';
      
      setErrorTitle(error.response?.status === 404 ? 'Sipariş Bulunamadı' : 'Hata');
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const copyTrackingNumber = () => {
    const trackingCode = order?.trackingNumber || order?.trackingCode || order?.cargoTrackingCode;
    if (trackingCode) {
      Clipboard.setString(trackingCode);
      setShowSuccessModal(true);
    }
  };

  const handleViewInvoice = async () => {
    try {
      if (!orderId) {
        setErrorTitle('Hata');
        setErrorMessage('Sipariş bulunamadı');
        setShowErrorModal(true);
        return;
      }

      // Önce sipariş bazlı fatura endpoint'ini dene
      try {
        const response = await invoicesAPI.getByOrderId(orderId);
        if (response.data?.success && response.data?.data) {
          const invoice = response.data.data;
          
          // Eğer PDF URL'i varsa tarayıcıda aç
          if (invoice.filePath || invoice.shareUrl) {
            const invoiceUrl = invoice.shareUrl || `${getApiUrl()}/invoices/download/${invoice.id}`;
            const canOpen = await Linking.canOpenURL(invoiceUrl);
            if (canOpen) {
              await Linking.openURL(invoiceUrl);
            } else {
              setErrorTitle('Hata');
              setErrorMessage('Fatura açılamadı. Lütfen daha sonra tekrar deneyin.');
              setShowErrorModal(true);
            }
          } else {
            // Fatura bulundu ama URL yok
            setErrorTitle('Bilgi');
            setErrorMessage('Fatura henüz hazırlanmamış.');
            setShowErrorModal(true);
          }
          return;
        }
      } catch (orderInvoiceError) {
        console.log('Sipariş bazlı fatura bulunamadı, kullanıcı bazlı arama yapılıyor...');
      }

      // Kullanıcı bazlı fatura endpoint'lerini dene
      const userId = await secureStorage.getItem('userId');
      if (!userId) {
        setErrorTitle('Hata');
        setErrorMessage('Kullanıcı bilgisi bulunamadı');
        setShowErrorModal(true);
        return;
      }

      // /orders/:userId/invoices endpoint'ini dene
      try {
        const response = await invoicesAPI.getOrderInvoices(userId);
        if (response.data?.success && response.data?.data) {
          const invoices = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
          const orderInvoice = invoices.find(inv => inv.orderId === parseInt(orderId) || inv.orderId === orderId);
          
          if (orderInvoice) {
            const invoiceUrl = orderInvoice.shareUrl || orderInvoice.filePath || `${getApiUrl()}/invoices/download/${orderInvoice.id}`;
            const canOpen = await Linking.canOpenURL(invoiceUrl);
            if (canOpen) {
              await Linking.openURL(invoiceUrl);
            } else {
              setErrorTitle('Hata');
              setErrorMessage('Fatura açılamadı. Lütfen daha sonra tekrar deneyin.');
              setShowErrorModal(true);
            }
            return;
          }
        }
      } catch (error) {
        console.log('Kullanıcı bazlı fatura bulunamadı:', error);
      }

      // Fatura bulunamadı
      setErrorTitle('Bilgi');
      setErrorMessage('Bu sipariş için fatura bulunamadı.');
      setShowErrorModal(true);
    } catch (error) {
      console.error('❌ Fatura görüntüleme hatası:', error);
      setErrorTitle('Hata');
      setErrorMessage('Fatura yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      setShowErrorModal(true);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'active':
        return 'ellipse';
      case 'pending':
        return 'ellipse-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const isOrderDelivered = () => {
    if (!order) return false;
    const orderStatus = order?.status || order?.deliveryStatus || '';
    return orderStatus === 'delivered' || 
           orderStatus === 'completed' ||
           order?.delivered === true ||
           (order?.timeline && order.timeline.some(item => 
             item.status === 'delivered' || item.status === 'completed'
           ));
  };

  const handleCreateReturnRequest = () => {
    if (!isOrderDelivered()) {
      alert.show('Bilgi', 'İade talebi sadece teslim edilmiş siparişler için oluşturulabilir');
      return;
    }

    navigation.navigate('ReturnRequest', { orderId });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sipariş Takibi</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sipariş Takibi</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>Sipariş Bulunamadı</Text>
          <TouchableOpacity style={styles.backHomeButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backHomeText}>Geri Dön</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Sipariş Takibi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* OpenStreetMap */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: order.shippingAddress?.latitude || order.deliveryAddress?.latitude || 39.9334,
              longitude: order.shippingAddress?.longitude || order.deliveryAddress?.longitude || 32.8597,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
            mapType="none"
            provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
            customMapStyle={Platform.OS === 'android' ? hideGoogleLogoStyle : []}
            mapPadding={{ bottom: -50, left: -50, right: -50, top: -50 }}
          >
            <UrlTile
              urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
              minimumZ={0}
              flipY={false}
              shouldReplaceMapContent={true}
              zIndex={1}
              tileSize={256}
            />
            {(order.shippingAddress?.latitude || order.deliveryAddress?.latitude) && (
              <Marker
                coordinate={{
                  latitude: order.shippingAddress?.latitude || order.deliveryAddress?.latitude,
                  longitude: order.shippingAddress?.longitude || order.deliveryAddress?.longitude,
                }}
                title="Teslimat Adresi"
              />
            )}
          </MapView>
        </View>

        {/* Delivery Status */}
        <View style={styles.deliveryStatusContainer}>
          <Text style={styles.deliveryTitle}>
            {(() => {
              const status = order.deliveryStatus || order.statusText || order.status || 'Kargoda';
              const statusLower = status.toLowerCase();
              
              // Durum belirteçlerini Türkçeye çevir
              if (statusLower === 'pending') {
                return 'Bekleniyor';
              } else if (statusLower === 'processing') {
                return 'Hazırlanıyor';
              } else if (statusLower === 'shipped') {
                return 'Kargoda';
              } else if (statusLower === 'delivered' || statusLower === 'completed') {
                return 'Teslim Edildi';
              } else if (statusLower === 'cancelled' || statusLower === 'canceled') {
                return 'İptal Edildi';
              }
              
              return status;
            })()}{'\n'}
            {(() => {
              const orderStatus = order.deliveryStatus || order.statusText || order.status || '';
              const statusLower = orderStatus.toLowerCase();
              const isDelivered = statusLower === 'delivered' || statusLower === 'completed' || order?.delivered === true;
              
              if (isDelivered && order.deliveredDate) {
                return (
                  <Text style={styles.deliveryTime}>
                    Teslim Edildi: {new Date(order.deliveredDate).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                );
              } else if (isDelivered && order.timeline) {
                const deliveredStep = order.timeline.find(step => 
                  step.status === 'delivered' || step.status === 'completed' || 
                  step.title?.toLowerCase().includes('teslim')
                );
                if (deliveredStep?.date) {
                  return (
                    <Text style={styles.deliveryTime}>
                      Teslim Edildi: {new Date(deliveredStep.date).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </Text>
                  );
                }
              }
              
              // Teslim edilmediyse tahmini teslimat tarihi göster
              return (
                <Text style={styles.deliveryTime}>
                  Tahmini Teslimat Tarihi: {(() => {
                    // Sipariş tarihinden 3 gün sonrasını hesapla
                    const orderDate = order.createdAt || order.orderDate || order.date || new Date();
                    const estimatedDate = new Date(orderDate);
                    estimatedDate.setDate(estimatedDate.getDate() + 3);
                    return estimatedDate.toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    });
                  })()}
                </Text>
              );
            })()}
          </Text>
        </View>

        {/* Product Card */}
        <View style={styles.productSection}>
          {order.items?.map((item) => {
            const itemId = item.id || item._id || item.productId;
            const itemName = item.name || item.productName || 'Ürün';
            const itemImage = item.image || item.productImage || item.imageUrl;
            const itemVariant = item.variant || item.selectedVariations || item.size || item.color;
            const itemQuantity = item.quantity || 1;
            
            // Varyant string'ini oluştur
            let variantText = '';
            if (typeof itemVariant === 'string') {
              // JSON formatındaki renk kodlarını temizle
              variantText = itemVariant.replace(/\{"color":"#[^"]+"\}/g, '').trim();
            } else if (typeof itemVariant === 'object' && itemVariant !== null) {
              const parts = [];
              if (itemVariant.size) parts.push(`Beden: ${itemVariant.size}`);
              if (itemVariant.color) parts.push(`Renk: ${itemVariant.color}`);
              variantText = parts.join(' • ');
            }
            
            return (
              <View key={itemId} style={styles.productCard}>
                <View style={styles.productImageContainer}>
                  {itemImage ? (
                    <Image
                      source={{ uri: itemImage }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Ionicons name="cube-outline" size={32} color={COLORS.gray400} />
                    </View>
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{itemName}</Text>
                  {variantText && <Text style={styles.productVariant}>{variantText}</Text>}
                  <Text style={styles.productQuantity}>{itemQuantity} Adet</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Timeline */}
        {order.timeline && order.timeline.length > 0 && (
          <View style={styles.timelineSection}>
            <Text style={styles.timelineHeader}>ZAMAN ÇİZELGESİ</Text>
            <View style={styles.timelineContainer}>
              {order.timeline.map((step, index) => {
                const stepId = step.id || step._id || index;
                let stepTitle = step.title || step.status || step.statusText || 'Durum';
                const stepDate = step.date || step.timestamp || step.createdAt;
                const stepStatus = step.status || 'pending';
                
                // Timeline başlıklarını Türkçeye çevir
                const stepTitleLower = stepTitle.toLowerCase();
                if (stepTitleLower === 'order received' || stepTitleLower === 'sipariş alındı') {
                  stepTitle = 'Sipariş Alındı';
                } else if (stepTitleLower === 'processing' || stepTitleLower === 'hazırlanıyor') {
                  stepTitle = 'Hazırlanıyor';
                } else if (stepTitleLower === 'shipped' || stepTitleLower === 'kargoda' || stepTitleLower === 'in cargo') {
                  stepTitle = 'Kargoda';
                } else if (stepTitleLower === 'delivered' || stepTitleLower === 'teslim edildi' || stepTitleLower === 'completed') {
                  stepTitle = 'Teslim Edildi';
                } else if (stepTitleLower === 'cancelled' || stepTitleLower === 'iptal edildi' || stepTitleLower === 'canceled') {
                  stepTitle = 'İptal Edildi';
                } else if (stepTitleLower === 'pending' || stepTitleLower === 'bekleniyor') {
                  stepTitle = 'Bekleniyor';
                }
                
                return (
                  <View key={stepId} style={styles.timelineRow}>
                    {/* Icon Column */}
                    <View style={styles.timelineIconColumn}>
                      <View
                        style={[
                          styles.timelineIconWrapper,
                          stepStatus === 'completed' && styles.timelineIconCompleted,
                          stepStatus === 'active' && styles.timelineIconActive,
                          stepStatus === 'pending' && styles.timelineIconPending,
                        ]}
                      >
                        <Ionicons
                          name={getStatusIcon(stepStatus)}
                          size={18}
                          color={
                            stepStatus === 'completed' || stepStatus === 'active'
                              ? COLORS.white
                              : COLORS.gray400
                          }
                        />
                      </View>
                      {index < order.timeline.length - 1 && (
                        <View
                          style={[
                            styles.timelineLine,
                            stepStatus === 'completed' && styles.timelineLineCompleted,
                          ]}
                        />
                      )}
                    </View>

                    {/* Content Column */}
                    <View style={styles.timelineContent}>
                      <Text
                        style={[
                          styles.timelineTitle,
                          stepStatus === 'active' && styles.timelineTitleActive,
                          stepStatus === 'pending' && styles.timelineTitlePending,
                        ]}
                      >
                        {stepTitle}
                      </Text>
                      <Text style={styles.timelineDate}>
                        {stepDate ? new Date(stepDate).toLocaleString('tr-TR') : ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Shipping Details */}
        <View style={styles.shippingSection}>
          <Text style={styles.shippingHeader}>KARGO BİLGİLERİ</Text>
          <View style={styles.shippingCard}>
            <View style={styles.shippingRow}>
              <Text style={styles.shippingLabel}>Sipariş No</Text>
              <Text style={styles.shippingValue}>
                {order.orderNumber || order.id || order._id || 'N/A'}
              </Text>
            </View>
            <View style={styles.shippingDivider} />
            <View style={styles.shippingRow}>
              <Text style={styles.shippingLabel}>Kargo Firması</Text>
              <View style={styles.carrierInfo}>
                <Ionicons name="cube-outline" size={18} color={COLORS.primary} />
                <Text style={styles.shippingValue}>
                  {order.carrier || order.shippingCarrier || 'DHL Kargo'}
                </Text>
              </View>
            </View>
            <View style={styles.shippingDivider} />
            <View style={styles.shippingRow}>
              <Text style={styles.shippingLabel}>Kargo Takip Kodu</Text>
              {order.trackingNumber || order.trackingCode || order.cargoTrackingCode ? (
                <TouchableOpacity style={styles.trackingButton} onPress={copyTrackingNumber}>
                  <Text style={styles.trackingNumber}>
                    {order.trackingNumber || order.trackingCode || order.cargoTrackingCode}
                  </Text>
                  <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              ) : (
                <Text style={styles.shippingValue}>Henüz atanmadı</Text>
              )}
            </View>
          </View>
          
          {/* Refund Info - Sadece teslim edilmiş siparişler için */}
          {isOrderDelivered() && (
            <View style={styles.refundInfoCard}>
              <View style={styles.refundInfoHeader}>
                <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
                <Text style={styles.refundInfoTitle}>İade Tutarı</Text>
              </View>
              <View style={styles.refundInfoContent}>
                <View style={styles.refundInfoRow}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.refundInfoText}>
                    İade süresi: <Text style={styles.refundInfoBold}>14 gün</Text>
                  </Text>
                </View>
                <View style={styles.refundInfoRow}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={styles.refundInfoText}>
                    İade tutarı cüzdanınıza <Text style={styles.refundInfoBold}>anında</Text> yüklenir
                  </Text>
                </View>
                <View style={styles.refundInfoRow}>
                  <Ionicons name="time-outline" size={16} color={COLORS.warning} />
                  <Text style={styles.refundInfoText}>
                    Ücret iadesi ise <Text style={styles.refundInfoBold}>1 ila 14 gün</Text> içerisinde
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleViewInvoice}>
            <Ionicons name="document-text-outline" size={20} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Faturayı Görüntüle</Text>
          </TouchableOpacity>
          
          {isOrderDelivered() && (
            <TouchableOpacity 
              style={styles.returnButton} 
              onPress={handleCreateReturnRequest}
            >
              <Ionicons name="return-down-back-outline" size={20} color={COLORS.white} />
              <Text style={styles.returnButtonText}>İade Talebi Oluştur</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Sipariş ile ilgili sorun mu var?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          navigation.goBack();
        }}
        title={errorTitle}
        message={errorMessage}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Kopyalandı"
        message="Takip numarası panoya kopyalandı"
      />
      {alert.AlertComponent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17, 212, 33, 0.1)',
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
    flex: 1,
    textAlign: 'center',
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
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  backHomeButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  backHomeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  mapContainer: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.primary,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  deliveryStatusContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 33, 0.1)',
  },
  deliveryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    lineHeight: 32,
    marginBottom: 8,
  },
  deliveryTime: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 4,
  },
  productSection: {
    marginTop: 24,
    paddingHorizontal: 20,
    gap: 12,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 33, 0.1)',
  },
  productImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  productVariant: {
    fontSize: 12,
    color: COLORS.gray500,
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
  },
  timelineSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  timelineHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(17, 212, 33, 0.6)',
    letterSpacing: 1,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  timelineContainer: {
    position: 'relative',
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineIconColumn: {
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  timelineIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    zIndex: 10,
  },
  timelineIconCompleted: {
    backgroundColor: COLORS.primary,
  },
  timelineIconActive: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  timelineIconPending: {
    backgroundColor: COLORS.gray100,
    opacity: 0.5,
  },
  timelineLine: {
    position: 'absolute',
    top: 32,
    width: 2,
    height: 40,
    backgroundColor: 'rgba(17, 212, 33, 0.2)',
  },
  timelineLineCompleted: {
    backgroundColor: COLORS.primary,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 32,
    paddingTop: 4,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  timelineTitleActive: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  timelineTitlePending: {
    fontWeight: '500',
    color: COLORS.gray400,
  },
  timelineDate: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  shippingSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  shippingHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(17, 212, 33, 0.6)',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  shippingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 33, 0.1)',
  },
  shippingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  shippingDivider: {
    height: 1,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  shippingLabel: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  shippingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  carrierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackingNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: 'monospace',
  },
  refundInfoCard: {
    marginTop: 16,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 33, 0.1)',
  },
  refundInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  refundInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  refundInfoContent: {
    gap: 10,
  },
  refundInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  refundInfoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMain,
    lineHeight: 20,
  },
  refundInfoBold: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 12,
    backgroundColor: COLORS.white,
    marginTop: 16,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  returnButton: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  returnButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 33, 0.1)',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(17, 212, 33, 0.8)',
  },
});
