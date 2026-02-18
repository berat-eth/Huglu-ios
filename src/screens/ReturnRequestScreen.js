import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Modal, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { returnRequestsAPI, ordersAPI } from '../services/api';
import ErrorModal from '../components/ErrorModal';
import SuccessModal from '../components/SuccessModal';
import { useAlert } from '../hooks/useAlert';

const RETURN_REASONS = [
  'Ürün hasarlı/kusurlu geldi',
  'Yanlış ürün gönderildi',
  'Beden/renk uygun değil',
  'Beklentimi karşılamadı',
  'Artık ihtiyacım yok',
  'Diğer',
];

const RETURN_METHODS = [
  {
    id: 'mail',
    icon: 'car-outline',
    title: 'Kargo ile İade',
    subtitle: 'Evden kargo ile gönderin',
    badge: 'Ücretsiz',
  },
  {
    id: 'store',
    icon: 'storefront',
    title: 'Mağazadan İade',
    subtitle: 'QR kod ile mağazada iade',
    badge: 'Anında İade',
  },
];

export default function ReturnRequestScreen({ navigation, route }) {
  const alert = useAlert();
  const { orderId } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState('');
  const [order, setOrder] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedReason, setSelectedReason] = useState('');
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const [additionalComments, setAdditionalComments] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('mail');
  const [step, setStep] = useState(1); // 1: Select items, 2: Reason, 3: Method
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadOrderDetails();
  }, []);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      
      if (!storedUserId) {
        alert.show('Hata', 'Lütfen giriş yapın');
        navigation.goBack();
        return;
      }

      setUserId(storedUserId);

      // Sipariş detaylarını yükle
      const response = await ordersAPI.getById(orderId);
      
      if (response.data?.success) {
        const orderData = response.data.order || response.data.data;
        
        // İade sadece teslim edilmiş siparişlerde kullanılabilir
        const orderStatus = orderData.status || orderData.deliveryStatus || '';
        const isDelivered = orderStatus === 'delivered' || 
                           orderStatus === 'completed' ||
                           orderData.delivered === true ||
                           (orderData.timeline && orderData.timeline.some(item => 
                             item.status === 'delivered' || item.status === 'completed'
                           ));
        
        if (!isDelivered) {
          alert.show(
            'İade Talebi Oluşturulamaz',
            'İade talebi sadece teslim edilmiş siparişler için oluşturulabilir.',
            [{ text: 'Tamam', onPress: () => navigation.goBack() }]
          );
          return;
        }
        
        setOrder(orderData);
      }
    } catch (error) {
      console.error('Sipariş detayları yüklenemedi:', error);
      alert.show('Hata', 'Sipariş bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (itemId) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const calculateRefundAmount = () => {
    if (!order || !order.items) return 0;
    
    return order.items
      .filter(item => {
        const itemId = item.id || item._id || item.orderItemId;
        return selectedItems.includes(itemId);
      })
      .reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 1)), 0);
  };

  const handleSubmit = async () => {
    // Validasyon
    if (selectedItems.length === 0) {
      alert.show('Uyarı', 'Lütfen iade edilecek ürünleri seçin');
      return;
    }

    if (!selectedReason) {
      alert.show('Uyarı', 'Lütfen iade sebebini seçin');
      return;
    }

    // Siparişin teslim edilmiş olduğunu kontrol et
    const orderStatus = order?.status || order?.deliveryStatus || '';
    const isDelivered = orderStatus === 'delivered' || 
                       orderStatus === 'completed' ||
                       order?.delivered === true ||
                       (order?.timeline && order.timeline.some(item => 
                         item.status === 'delivered' || item.status === 'completed'
                       ));
    
    if (!isDelivered) {
      setErrorMessage('İade talebi sadece teslim edilmiş siparişler için oluşturulabilir');
      setShowErrorModal(true);
      return;
    }

    try {
      setSubmitting(true);

      // Order items'dan orderItemId'leri al (backend order_items tablosundaki id'leri bekliyor)
      const orderItemIds = order.items
        .filter(item => {
          const itemId = item.id || item._id || item.orderItemId;
          return selectedItems.includes(itemId);
        })
        .map(item => item.id || item._id || item.orderItemId);

      if (orderItemIds.length === 0) {
        setErrorMessage('Seçilen ürünler bulunamadı. Lütfen tekrar deneyin.');
        setShowErrorModal(true);
        setSubmitting(false);
        return;
      }

      const returnData = {
        userId,
        orderId,
        items: orderItemIds, // Backend'e order_items tablosundaki id'leri gönder
        reason: selectedReason,
        comments: additionalComments,
        description: additionalComments,
        returnMethod: selectedMethod,
        refundAmount: calculateRefundAmount(),
      };

      console.log('📤 İade talebi gönderiliyor:', returnData);

      const response = await returnRequestsAPI.create(returnData);

      if (response.data?.success) {
        setSuccessMessage(response.data?.message || 'İade talebiniz alındı. En kısa sürede işleme alınacaktır.');
        setShowSuccessModal(true);
      } else {
        const errorMsg = response.data?.message || 'İade talebi oluşturulamadı';
        console.error('❌ İade talebi hatası:', errorMsg);
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('❌ İade talebi hatası:', error);
      const errorMsg = error.response?.data?.message || error.message || 'İade talebi oluşturulurken bir hata oluştu';
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İade Talebi</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const refundAmount = calculateRefundAmount();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İade Talebi Oluştur</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressStep, styles.progressStepActive]} />
          <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]} />
          <View style={[styles.progressStep, step >= 3 && styles.progressStepActive]} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Select Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İade Edilecek Ürünleri Seçin</Text>
          
          {/* Kargo İade Kodu */}
          <View style={styles.returnCodeCard}>
            <View style={styles.returnCodeHeader}>
              <Ionicons name="cube-outline" size={20} color={COLORS.primary} />
              <Text style={styles.returnCodeTitle}>Kargo İade Kodu</Text>
            </View>
            <View style={styles.returnCodeContent}>
              <View style={styles.carrierBadge}>
                <Ionicons name="car-outline" size={16} color={COLORS.primary} />
                <Text style={styles.carrierText}>DHL Kargo</Text>
              </View>
              <Text style={styles.returnCodeDescription}>
                İade edeceğiniz ürünleri DHL Kargo ile gönderirken bu kodu kullanın
              </Text>
              <TouchableOpacity 
                style={styles.returnCodeButton} 
                onPress={() => {
                  Clipboard.setString('3470654462');
                  setShowSuccessModal(true);
                  setSuccessMessage('Kargo iade kodu panoya kopyalandı');
                }}
              >
                <Text style={styles.returnCodeValue}>3470654462</Text>
                <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          {order?.items?.map((item) => {
            const itemId = item.id || item._id || item.orderItemId;
            const isSelected = selectedItems.includes(itemId);
            
            return (
              <TouchableOpacity
                key={itemId}
                style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                onPress={() => toggleItemSelection(itemId)}
              >
                <Image
                  source={{ uri: item.image || item.productImage || 'https://via.placeholder.com/80' }}
                  style={styles.itemImage}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name || item.productName}</Text>
                  <Text style={styles.itemDetails}>
                    {item.size && `Beden: ${item.size} • `}
                    {item.color && `Renk: ${item.color}`}
                  </Text>
                  <Text style={styles.itemOrder}>
                    Sipariş #{orderId} • Teslim Edildi
                  </Text>
                </View>
                <View style={styles.itemCheckbox}>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={28} color={COLORS.primary} />
                  ) : (
                    <View style={styles.checkboxEmpty} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reason Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İade Sebebi</Text>
          
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowReasonDropdown(!showReasonDropdown)}
          >
            <Text style={[styles.dropdownText, !selectedReason && styles.dropdownPlaceholder]}>
              {selectedReason || 'Sebep seçin...'}
            </Text>
            <Ionicons 
              name={showReasonDropdown ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={COLORS.textSecondary} 
            />
          </TouchableOpacity>

          {showReasonDropdown && (
            <View style={styles.dropdownMenu}>
              {RETURN_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedReason(reason);
                    setShowReasonDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{reason}</Text>
                  {selectedReason === reason && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TextInput
            style={styles.commentsInput}
            placeholder="Ek açıklama (opsiyonel)..."
            placeholderTextColor={COLORS.gray400}
            value={additionalComments}
            onChangeText={setAdditionalComments}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Return Method Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İade Yöntemi</Text>
          
          <View style={styles.methodsContainer}>
            {RETURN_METHODS.map((method) => {
              const isSelected = selectedMethod === method.id;
              
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.methodCard, isSelected && styles.methodCardSelected]}
                  onPress={() => setSelectedMethod(method.id)}
                >
                  <View style={[styles.methodIcon, isSelected && styles.methodIconSelected]}>
                    <Ionicons 
                      name={method.icon} 
                      size={28} 
                      color={isSelected ? COLORS.white : COLORS.textMain} 
                    />
                  </View>
                  <Text style={[styles.methodTitle, isSelected && styles.methodTitleSelected]}>
                    {method.title}
                  </Text>
                  <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
                  <View style={[styles.methodBadge, isSelected && styles.methodBadgeSelected]}>
                    <Text style={[styles.methodBadgeText, isSelected && styles.methodBadgeTextSelected]}>
                      {method.badge}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Policy Info */}
        <View style={styles.policyCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.policyText}>
            <Text style={styles.policyBold}>İade Politikası:</Text> Ürünler orijinal ambalajında ve 14 gün içinde iade edilmelidir. İadeler orijinal ödeme yöntemine yapılır.{' '}
            <Text style={styles.policyLink}>Detaylı politika</Text>
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Hata"
        message={errorMessage}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
        title="Başarılı"
        message={successMessage}
        icon="checkmark-circle"
      />

      {/* Fixed Bottom */}
      <View style={styles.bottomContainer}>
        <View style={styles.refundRow}>
          <Text style={styles.refundLabel}>İade Tutarı</Text>
          <Text style={styles.refundAmount}>₺{refundAmount.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.submitButton, (selectedItems.length === 0 || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={selectedItems.length === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.submitButtonText}>İade Talebini Gönder</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
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
  progressContainer: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: COLORS.white,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.gray200,
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  returnCodeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 33, 0.1)',
  },
  returnCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  returnCodeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  returnCodeContent: {
    gap: 12,
  },
  carrierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  carrierText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  returnCodeDescription: {
    fontSize: 14,
    color: COLORS.gray500,
    lineHeight: 20,
  },
  returnCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  returnCodeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    letterSpacing: 1,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.gray100,
  },
  itemCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  itemOrder: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  itemCheckbox: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkboxEmpty: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.gray300,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginBottom: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: COLORS.textMain,
  },
  dropdownPlaceholder: {
    color: COLORS.gray400,
  },
  dropdownMenu: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  dropdownItemText: {
    fontSize: 15,
    color: COLORS.textMain,
  },
  commentsInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: 16,
    fontSize: 15,
    color: COLORS.textMain,
    minHeight: 100,
  },
  methodsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  methodCard: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    alignItems: 'center',
  },
  methodCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  methodIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodIconSelected: {
    backgroundColor: COLORS.primary,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    textAlign: 'center',
    marginBottom: 4,
  },
  methodTitleSelected: {
    color: COLORS.textMain,
  },
  methodSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  methodBadge: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  methodBadgeSelected: {
    backgroundColor: COLORS.primary,
  },
  methodBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  methodBadgeTextSelected: {
    color: COLORS.white,
  },
  policyCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderRadius: 12,
    gap: 12,
  },
  policyText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMain,
    lineHeight: 20,
  },
  policyBold: {
    fontWeight: '700',
  },
  policyLink: {
    color: COLORS.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  bottomContainer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    padding: 16,
    paddingBottom: 32,
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refundLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  refundAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
