import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import { COLORS } from '../constants/colors';
import { cartAPI, ordersAPI, userLevelAPI, userAPI, walletAPI } from '../services/api';
import OrderSuccessModal from '../components/OrderSuccessModal';
import ErrorModal from '../components/ErrorModal';
import analytics from '../services/analytics';
import { updateCartBadge } from '../utils/cartBadge';
import { secureStorage } from '../utils/secureStorage';
import { useAlert } from '../hooks/useAlert';

export default function OrderConfirmationScreen({ navigation, route }) {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [total, setTotal] = useState(0);
  const [shippingAddress, setShippingAddress] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [userBalance, setUserBalance] = useState(0); // Kullanıcı cüzdan bakiyesi
  const [deliveryMethod, setDeliveryMethod] = useState('shipping'); // 'shipping' or 'pickup'
  const [selectedStore, setSelectedStore] = useState(null);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [shippingSettings, setShippingSettings] = useState({ freeShippingLimit: 600, shippingCost: 30 });
  const [selectedDeliveryTime, setSelectedDeliveryTime] = useState(null);
  const [showDeliveryTimeModal, setShowDeliveryTimeModal] = useState(false);
  
  // B2B Açık Hesap state'leri
  const [isB2BMode, setIsB2BMode] = useState(false);
  const [showOpenAccountModal, setShowOpenAccountModal] = useState(false);
  const [selectedVadePeriod, setSelectedVadePeriod] = useState(null); // 30, 60, 90 gün
  
  // Vade farkı oranları (%)
  const VADE_FARKI = {
    30: 0,      // 30 gün vade farkı yok
    60: 5,      // 60 gün %5 vade farkı
    90: 10,     // 90 gün %10 vade farkı
  };
  
  // Vade farkı hesaplama fonksiyonu
  const calculateVadeFarki = (amount, days) => {
    const percentage = VADE_FARKI[days] || 0;
    return (amount * percentage) / 100;
  };
  
  // Vade farkı dahil toplam hesaplama
  const calculateTotalWithVade = (days) => {
    if (!days) return total;
    const vadeFarki = calculateVadeFarki(total, days);
    return total + vadeFarki;
  };

  // Mağaza listesi
  const STORES = [
    {
      id: 1,
      name: 'Huğlu Merkez Fabrika',
      address: 'Huğlu, Beyşehir, Konya',
      city: 'Konya',
      phone: '+90 332 XXX XX XX',
      hours: '07:30 - 17:30',
      status: 'open',
      statusText: 'Açık',
    },
    {
      id: 2,
      name: 'Huğlu Outdoor Beyşehir Şubesi',
      address: 'Beyşehir Merkez, Konya',
      city: 'Konya',
      phone: '+90 332 XXX XX XX',
      hours: '09:00 - 18:30',
      status: 'open',
      statusText: 'Açık',
    },
    {
      id: 3,
      name: 'Huğlu Outdoor Konya',
      address: 'Konya Merkez',
      city: 'Konya',
      phone: '+90 332 XXX XX XX',
      hours: '09:00 - 21:00',
      status: 'closed',
      statusText: 'Kapalı',
      pickupAvailable: false,
    },
  ];

  // Route'dan gelen parametreler
  const routeTotal = route?.params?.total;
  const routeSubtotal = route?.params?.subtotal;
  const routeShipping = route?.params?.shipping;
  const paymentMethod = route?.params?.paymentMethod;
  const routeShippingAddress = route?.params?.shippingAddress;
  const paymentCompleted = route?.params?.paymentCompleted; // Ödeme zaten yapılmış mı?
  const orderIdFromRoute = route?.params?.orderId; // PaymentMethodScreen'den gelen orderId
  const paymentIdFromRoute = route?.params?.paymentId; // PaymentMethodScreen'den gelen paymentId
  const routeCartItems = route?.params?.cartItems; // PaymentMethodScreen'den gelen sepet ürünleri

  useEffect(() => {
    // Eğer ödeme zaten yapılmışsa, sipariş bilgilerini yükle ve success modal'ı göster
    if (paymentCompleted && orderIdFromRoute) {
      handlePaymentCompleted();
    } else {
      loadOrderData();
      loadShippingAddress();
      loadCustomerInfo();
      loadB2BMode();
    }
  }, []);

  const loadB2BMode = async () => {
    try {
      const b2bMode = await secureStorage.getItem('isB2BMode');
      
      setIsB2BMode(b2bMode === 'true');
    } catch (error) {
      console.error('B2B modu yüklenemedi:', error);
      setIsB2BMode(false);
    }
  };

  // Ödeme tamamlandığında çağrılacak fonksiyon
  const handlePaymentCompleted = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      
      if (!storedUserId) {
        setErrorMessage('Lütfen giriş yapın');
        setShowErrorModal(true);
        return;
      }

      // Sipariş bilgilerini yükle
      if (orderIdFromRoute) {
        try {
          const orderResponse = await ordersAPI.getById(orderIdFromRoute);
          if (orderResponse.data?.success) {
            const order = orderResponse.data.data || orderResponse.data.order;
            // Sipariş ürünlerini yükle - önce route'dan, sonra order'dan
            if (routeCartItems && Array.isArray(routeCartItems) && routeCartItems.length > 0) {
              setCartItems(routeCartItems);
            } else if (order.items && Array.isArray(order.items) && order.items.length > 0) {
              setCartItems(order.items);
            }
            setTotal(order.totalAmount || routeTotal || 0);
            setSubtotal(routeSubtotal || (order.totalAmount - (routeShipping || 0)));
            setShipping(routeShipping || 0);
          }
        } catch (orderError) {
          console.error('Sipariş bilgileri yüklenemedi:', orderError);
          // Route'dan gelen değerleri kullan
          if (routeCartItems && Array.isArray(routeCartItems) && routeCartItems.length > 0) {
            setCartItems(routeCartItems);
          }
          setTotal(routeTotal || 0);
          setSubtotal(routeSubtotal || 0);
          setShipping(routeShipping || 0);
        }
      } else {
        // OrderId yoksa route'dan gelen cartItems'i kullan
        if (routeCartItems && Array.isArray(routeCartItems) && routeCartItems.length > 0) {
          setCartItems(routeCartItems);
        }
        setTotal(routeTotal || 0);
        setSubtotal(routeSubtotal || 0);
        setShipping(routeShipping || 0);
      }

      // Analytics: Purchase tracking
      if (orderIdFromRoute) {
        try {
          await analytics.trackPurchase(orderIdFromRoute, {
            amount: routeTotal || 0,
            itemCount: cartItems.length,
            paymentMethod: paymentMethod || 'card',
            shipping: routeShipping || 0,
            subtotal: routeSubtotal || 0
          });
        } catch (analyticsError) {
          console.log('Analytics purchase error:', analyticsError);
        }
      }

      // Alışveriş EXP'si ekle (sadece B2C modunda)
      if (orderIdFromRoute) {
        try {
          const b2bMode = await secureStorage.getItem('isB2BMode');
          if (b2bMode !== 'true') {
            await userLevelAPI.addPurchaseExp(storedUserId, routeTotal || 0, orderIdFromRoute);
            console.log('✅ Alışveriş EXP eklendi');
          } else {
            console.log('ℹ️ B2B modunda EXP kazanılmaz');
          }
        } catch (expError) {
          console.log('⚠️ EXP eklenemedi:', expError.message);
        }
      }

      // Success modal'ı göster
      setSuccessModalData({
        orderId: orderIdFromRoute,
        expGained: true,
        paymentMethod: paymentMethod || 'card',
        paymentInfo: null,
        totalAmount: routeTotal || 0,
      });
      setShowSuccessModal(true);

      // Sepeti temizle ve badge'i güncelle
      try {
        console.log('🗑️ Sepet temizleniyor... userId:', storedUserId);
        const clearResponse = await cartAPI.clear(storedUserId);
        console.log('✅ Sepet temizleme yanıtı:', clearResponse.data);
        
        // Local state'i temizle
        setCartItems([]);
        setSubtotal(0);
        setTotal(0);
        
        // Cache'i temizle
        await secureStorage.setItem('cartCount', '0');
        await secureStorage.setItem('cartLastCleared', Date.now().toString());
        
        // Badge'i sıfırla
        await updateCartBadge(storedUserId);
        console.log('✅ Sepet temizlendi, cache temizlendi ve badge güncellendi');
      } catch (clearError) {
        console.error('❌ Sepet temizleme hatası:', clearError);
        try {
          await secureStorage.setItem('cartCount', '0');
          await secureStorage.setItem('cartLastCleared', Date.now().toString());
        } catch (cacheError) {
          console.error('❌ Cache temizleme hatası:', cacheError);
        }
      }
    } catch (error) {
      console.error('Ödeme tamamlandı işlemi hatası:', error);
      setErrorMessage('Sipariş bilgileri yüklenirken bir hata oluştu');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Kargo ayarlarını yükle
  useEffect(() => {
    const loadShippingSettings = async () => {
      try {
        const API_BASE_URL = 'https://api.huglutekstil.com/api';
        const response = await fetch(`${API_BASE_URL}/settings/public/shipping`);
        const data = await response.json();
        if (data.success && data.data) {
          setShippingSettings({
            freeShippingLimit: data.data.freeShippingLimit || 600,
            shippingCost: data.data.shippingCost || 30
          });
        }
      } catch (error) {
        console.error('Kargo ayarları yüklenemedi:', error);
      }
    };
    loadShippingSettings();
  }, []);

  // Delivery method değiştiğinde kargo ücretini güncelle
  useEffect(() => {
    if (deliveryMethod === 'pickup') {
      setShipping(0);
      setTotal(subtotal);
    } else {
      const FREE_SHIPPING_LIMIT = shippingSettings.freeShippingLimit;
      const newShipping = subtotal >= FREE_SHIPPING_LIMIT ? 0 : shippingSettings.shippingCost;
      setShipping(newShipping);
      setTotal(subtotal + newShipping);
    }
  }, [deliveryMethod, subtotal, shippingSettings]);

  // Sayfa her açıldığında adresi ve ödeme yöntemlerini yeniden yükle
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadShippingAddress();
      loadPaymentMethods();
      // AddAddress ekranından dönüldüğünde adresleri yeniden yükle
      loadAddresses();
    });
    return unsubscribe;
  }, [navigation]);

  const handleCreateOrder = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      
      if (!storedUserId) {
        setErrorMessage('Lütfen giriş yapın');
        setShowErrorModal(true);
        return;
      }

      // Sipariş verilerini hazırla
      const address = shippingAddress || {};
      
      // Teslimat yöntemi kontrolü
      if (deliveryMethod === 'pickup' && !selectedStore) {
        setErrorMessage('Lütfen bir mağaza seçin');
        setShowErrorModal(true);
        setLoading(false);
        return;
      }

      // Adres bilgilerini kontrol et (sadece kargo için)
      if (deliveryMethod === 'shipping' && (!address || (!address.fullAddress && !address.address))) {
        setErrorMessage('Lütfen teslimat adresi seçin');
        setShowErrorModal(true);
        setLoading(false);
        return;
      }
      
      // Teslimat adresi veya mağaza bilgisi
      let fullAddressString = '';
      let city = '';
      let district = '';
      let addressLine = '';
      
      if (deliveryMethod === 'pickup' && selectedStore) {
        // Mağazadan teslim al
        fullAddressString = `${selectedStore.name}\n${selectedStore.address}\n${selectedStore.city}`;
        city = selectedStore.city;
        addressLine = selectedStore.address;
      } else if (deliveryMethod === 'shipping' && address) {
        // Kargo ile teslimat
        addressLine = address.fullAddress || address.address || '';
        city = address.city || '';
        district = address.district || '';
        const postalCode = address.postalCode || '';
        
        fullAddressString = [
          addressLine,
          city && district ? `${city}, ${district}` : (city || district),
          postalCode
        ].filter(Boolean).join('\n').trim() || addressLine;
      }
      
      // Seçilen ödeme yöntemini belirle
      let finalPaymentMethod = paymentMethod || 'card';
      if (selectedPaymentMethod) {
        if (selectedPaymentMethod.type === 'bank_transfer') {
          finalPaymentMethod = 'bank_transfer';
        } else if (selectedPaymentMethod.type === 'wallet') {
          finalPaymentMethod = 'wallet';
          // Cüzdan ödemesi için bakiye kontrolü
          if (userBalance < total) {
            alert.show(
              'Yetersiz Bakiye',
              `Cüzdan bakiyeniz (₺${userBalance.toFixed(2)}) sipariş tutarı (₺${total.toFixed(2)}) için yetersiz. Lütfen başka bir ödeme yöntemi seçin.`
            );
            setLoading(false);
            return;
          }
        } else {
          finalPaymentMethod = 'card';
        }
      }

      const orderData = {
        userId: parseInt(storedUserId),
        totalAmount: total,
        status: 'pending',
        shippingAddress: fullAddressString,
        paymentMethod: finalPaymentMethod,
        deliveryMethod: deliveryMethod, // 'shipping' or 'pickup'
        pickupStoreId: deliveryMethod === 'pickup' ? selectedStore?.id : null,
        pickupStoreName: deliveryMethod === 'pickup' ? selectedStore?.name : null,
        preferredDeliveryTime: deliveryMethod === 'shipping' ? selectedDeliveryTime : null,
        city: city,
        district: district,
        fullAddress: addressLine,
        customerName: deliveryMethod === 'pickup' 
          ? (customerInfo.name || selectedStore?.name || '')
          : (customerInfo.name || address?.fullName || address?.customerName || ''),
        customerEmail: customerInfo.email || address?.email || '',
        customerPhone: deliveryMethod === 'pickup'
          ? (customerInfo.phone || selectedStore?.phone || '')
          : (customerInfo.phone || address?.phone || ''),
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          productName: item.name || null,
          productDescription: item.description || null,
          productCategory: item.category || null,
          productBrand: item.brand || null,
          productImage: item.image || null,
          selectedVariations: typeof item.selectedVariations === 'string' 
            ? item.selectedVariations 
            : (item.selectedVariations ? JSON.stringify(item.selectedVariations) : null)
        }))
      };

      console.log('Sipariş oluşturuluyor:', orderData);

      const response = await ordersAPI.create(orderData);
      
      if (response.data?.success) {
        // Sipariş başarılı
        const orderId = response.data.data?.orderId || response.data.orderId;
        
        // Analytics: Purchase tracking
        try {
          await analytics.trackPurchase(orderId, {
            amount: total,
            itemCount: cartItems.length,
            paymentMethod: finalPaymentMethod,
            shipping: shipping,
            subtotal: subtotal
          });
        } catch (analyticsError) {
          console.log('Analytics purchase error:', analyticsError);
        }
        
        // Alışveriş EXP'si ekle (sadece B2C modunda)
        try {
          const b2bMode = await secureStorage.getItem('isB2BMode');
          if (b2bMode !== 'true') {
            await userLevelAPI.addPurchaseExp(storedUserId, total, orderId);
            console.log('✅ Alışveriş EXP eklendi');
          } else {
            console.log('ℹ️ B2B modunda EXP kazanılmaz');
          }
        } catch (expError) {
          console.log('⚠️ EXP eklenemedi:', expError.message);
          // Sipariş başarılı, sadece EXP eklenemedi
        }
        
        // Cüzdan ile ödeme yapıldıysa bakiyeden düş
        if (finalPaymentMethod === 'wallet') {
          try {
            await walletAPI.deductBalance(storedUserId, total, orderId);
            console.log('✅ Cüzdan bakiyesi düşüldü:', total);
            // Bakiyeyi güncelle
            setUserBalance(prevBalance => prevBalance - total);
          } catch (walletError) {
            console.error('⚠️ Cüzdan bakiyesi düşülemedi:', walletError);
            // Sipariş başarılı ama bakiye düşülemedi - manuel kontrol gerekebilir
          }
        }
        
        // Success modal'ı göster
        setSuccessModalData({
          orderId,
          expGained: true, // EXP kazanımı başarılı
          paymentMethod: finalPaymentMethod,
          paymentInfo: finalPaymentMethod === 'bank_transfer' ? {
            recipient: 'Huğlu Av Tüfekleri Kooperatifi',
            bank: 'İş Bankası',
            iban: 'TR33 0006 4000 0011 2345 6789 01',
          } : null,
          totalAmount: total,
        });
        setShowSuccessModal(true);
        
        // Sepeti temizle ve badge'i güncelle
        try {
          console.log('🗑️ Sepet temizleniyor... userId:', storedUserId);
          const clearResponse = await cartAPI.clear(storedUserId);
          console.log('✅ Sepet temizleme yanıtı:', clearResponse.data);
          
          // Local state'i temizle
          setCartItems([]);
          setSubtotal(0);
          setTotal(0);
          
          // Cache'i temizle - cartCount'u sıfırla
          await secureStorage.setItem('cartCount', '0');
          // Cache timestamp'i güncelle (CartScreen'de cache kontrolü için)
          await secureStorage.setItem('cartLastCleared', Date.now().toString());
          
          // Badge'i sıfırla
          await updateCartBadge(storedUserId);
          console.log('✅ Sepet temizlendi, cache temizlendi ve badge güncellendi');
        } catch (clearError) {
          console.error('❌ Sepet temizleme hatası:', clearError);
          console.error('❌ Hata detayı:', clearError.response?.data || clearError.message);
          // Sepet temizlenemese bile sipariş başarılı, yine de cache'i temizle
          try {
            await secureStorage.setItem('cartCount', '0');
            await secureStorage.setItem('cartLastCleared', Date.now().toString());
          } catch (cacheError) {
            console.error('❌ Cache temizleme hatası:', cacheError);
          }
        }
      } else {
        setErrorMessage(response.data?.message || 'Sipariş oluşturulamadı');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Sipariş oluşturma hatası:', error);
      setErrorMessage('Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderData = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      
      if (!storedUserId) {
        setErrorMessage('Lütfen giriş yapın');
        setShowErrorModal(true);
        setTimeout(() => navigation.navigate('Login'), 2000);
        return;
      }

      // Sepet ürünlerini al
      const cartResponse = await cartAPI.get(storedUserId);
      console.log('OrderConfirmation - Sepet API yanıtı:', cartResponse.data);
      
      if (cartResponse.data?.success) {
        const cartData = cartResponse.data.cart || cartResponse.data.data || [];
        
        if (!Array.isArray(cartData)) {
          console.warn('⚠️ Cart data array değil:', cartData);
          setErrorMessage('Sepet verisi geçersiz format');
          setShowErrorModal(true);
          setCartItems([]);
          return;
        }
        
        if (cartData.length === 0) {
          console.warn('⚠️ Sepet boş');
          setErrorMessage('Sepetinizde ürün bulunmuyor');
          setShowErrorModal(true);
          setCartItems([]);
          return;
        }

        // Backend'den gelen veriyi formatla
        const formattedItems = cartData.map(item => {
          // selectedVariations string ise parse et
          let variations = {};
          if (item.selectedVariations) {
            if (typeof item.selectedVariations === 'string') {
              try {
                variations = JSON.parse(item.selectedVariations);
              } catch (e) {
                console.warn('selectedVariations parse hatası:', e);
                variations = {};
              }
            } else {
              variations = item.selectedVariations;
            }
          }

          // Varyant string'ini oluştur
          let variantString = null;
          if (variations && Object.keys(variations).length > 0) {
            // Eğer variations içinde nested object varsa (örn: "145352": {...})
            const variantParts = [];
            Object.entries(variations).forEach(([key, value]) => {
              if (typeof value === 'object' && value !== null) {
                // Nested object durumu (örn: size variation)
                if (value.value) {
                  variantParts.push(value.value);
                }
              } else {
                // Basit key-value durumu (örn: color: "#11d421")
                if (key === 'color') {
                  variantParts.push(`Renk seçildi`);
                } else {
                  variantParts.push(`${key}: ${value}`);
                }
              }
            });
            variantString = variantParts.length > 0 ? variantParts.join(' | ') : null;
          }

          return {
            id: item.id || item.cartItemId,
            productId: item.productId,
            name: item.productName || item.name,
            price: parseFloat(item.price || 0),
            quantity: item.quantity || 1,
            image: item.productImage || item.image,
            variant: variantString,
            selectedVariations: variations,
            // Backend için ek alanlar
            description: item.productDescription || item.description || null,
            category: item.productCategory || item.category || null,
            brand: item.productBrand || item.brand || null,
          };
        });
        
        console.log('OrderConfirmation - Formatlanmış sepet:', formattedItems);
        setCartItems(formattedItems);

        // Route'dan gelen değerleri kullan, yoksa hesapla
        if (routeTotal !== undefined && routeSubtotal !== undefined) {
          console.log('Route\'dan gelen sipariş değerleri:', {
            total: routeTotal,
            subtotal: routeSubtotal,
            shipping: routeShipping
          });
          const calculatedSubtotal = routeSubtotal;
          const calculatedShipping = deliveryMethod === 'pickup' ? 0 : (routeShipping || 0);
          const calculatedTotal = calculatedSubtotal + calculatedShipping;
          
          setSubtotal(calculatedSubtotal);
          setShipping(calculatedShipping);
          setTotal(calculatedTotal);
        } else {
          const FREE_SHIPPING_LIMIT = 600;
          const calculatedSubtotal = formattedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const calculatedShipping = deliveryMethod === 'pickup' ? 0 : (calculatedSubtotal >= FREE_SHIPPING_LIMIT ? 0 : 30);
          const calculatedTotal = calculatedSubtotal + calculatedShipping;
          
          console.log('Hesaplanan değerler:', {
            subtotal: calculatedSubtotal,
            shipping: calculatedShipping,
            total: calculatedTotal,
            deliveryMethod
          });
          
          setSubtotal(calculatedSubtotal);
          setShipping(calculatedShipping);
          setTotal(calculatedTotal);
        }
      } else {
        console.error('❌ Sepet yanıtı başarısız:', cartResponse.data);
        setErrorMessage('Sepet bilgileri alınamadı. Lütfen tekrar deneyin.');
        setShowErrorModal(true);
        setCartItems([]);
      }
    } catch (error) {
      console.error('Sipariş verileri yükleme hatası:', error);
      setErrorMessage('Sipariş bilgileri yüklenirken bir hata oluştu');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const loadShippingAddress = async () => {
    try {
      const userId = await secureStorage.getItem('userId');
      console.log('📍 loadShippingAddress - userId:', userId);
      
      if (!userId) {
        console.log('⚠️ userId bulunamadı');
        return;
      }

      // Route'dan gelen adresi kontrol et
      if (routeShippingAddress) {
        console.log('📍 Route\'dan adres kullanılıyor:', routeShippingAddress);
        setShippingAddress(routeShippingAddress);
        return;
      }

      // API'den varsayılan adresi çek
      try {
        console.log('📍 API\'den adres çekiliyor... userId:', userId);
        const response = await userAPI.getAddresses(userId, 'shipping');
        console.log('📍 API yanıtı:', response.data);
        
        if (response.data?.success) {
          const addresses = response.data.data || response.data.addresses || [];
          console.log('📍 Bulunan adresler:', addresses.length, 'adet');
          
          // Varsayılan adresi bul veya ilk adresi kullan
          const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];
          if (defaultAddress) {
            console.log('📍 Seçilen adres:', defaultAddress);
            setShippingAddress(defaultAddress);
          } else {
            console.log('⚠️ Hiç adres bulunamadı');
          }
        }
      } catch (error) {
        console.log('❌ Adres yüklenemedi:', error.message);
        console.log('❌ Hata detayı:', error.response?.data);
        // Hata durumunda boş bırak, kullanıcı bilgileri gösterilir
      }
    } catch (error) {
      console.error('❌ Adres yükleme hatası:', error);
    }
  };

  const loadCustomerInfo = async () => {
    try {
      const [userName, userEmail, userPhone] = await secureStorage.multiGet([
        'userName',
        'userEmail',
        'userPhone',
      ]);

      setCustomerInfo({
        name: userName[1] || '',
        email: userEmail[1] || '',
        phone: userPhone[1] || '',
      });
    } catch (error) {
      console.error('Kullanıcı bilgileri yükleme hatası:', error);
    }
  };

  const handleChangeAddress = async () => {
    setShowAddressModal(true);
    await loadAddresses();
  };

  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const userId = await secureStorage.getItem('userId');
      console.log('📍 loadAddresses - userId:', userId);
      
      if (!userId) {
        console.log('⚠️ userId bulunamadı');
        return;
      }

      console.log('📍 API\'den adresler çekiliyor... userId:', userId);
      const response = await userAPI.getAddresses(userId, 'shipping');
      console.log('📍 loadAddresses API yanıtı:', response.data);
      
      if (response.data?.success) {
        const addressList = response.data.data || response.data.addresses || [];
        console.log('📍 Yüklenen adresler:', addressList.length, 'adet');
        setAddresses(addressList);
      }
    } catch (error) {
      console.error('❌ Adresler yüklenemedi:', error);
      console.error('❌ Hata detayı:', error.response?.data);
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSelectAddress = (address) => {
    setShippingAddress(address);
    setShowAddressModal(false);
  };

  const handleAddNewAddress = () => {
    setShowAddressModal(false);
    navigation.navigate('AddAddress');
  };

  const handleChangePayment = async () => {
    setShowPaymentModal(true);
    await loadPaymentMethods();
  };

  const loadPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      const userId = await secureStorage.getItem('userId');
      if (!userId) return;

      // Kullanıcı bakiyesini yükle
      try {
        const balanceResponse = await walletAPI.getBalance(userId);
        if (balanceResponse.data?.success) {
          const balance = balanceResponse.data.data?.balance || balanceResponse.data.balance || 0;
          setUserBalance(parseFloat(balance));
        }
      } catch (balanceError) {
        console.log('Bakiye yüklenemedi:', balanceError);
        setUserBalance(0);
      }

      try {
        const response = await walletAPI.getPaymentMethods(userId);
        if (response.data?.success) {
          const methods = response.data.data || response.data.paymentMethods || [];
          setPaymentMethods(methods);
          // Varsayılan ödeme yöntemini bul
          const defaultMethod = methods.find(m => m.isDefault) || methods[0];
          if (defaultMethod && !selectedPaymentMethod) {
            setSelectedPaymentMethod(defaultMethod);
          }
        }
      } catch (error) {
        console.log('Ödeme yöntemleri yüklenemedi, mock data kullanılıyor:', error);
        // Mock data
        const mockMethods = [
          {
            id: 1,
            cardType: 'Visa',
            lastFour: '4242',
            expiryDate: '12/28',
            cardName: 'John Doe',
            isDefault: true,
          },
          {
            id: 2,
            cardType: 'Mastercard',
            lastFour: '8888',
            expiryDate: '06/29',
            cardName: 'John Doe',
            isDefault: false,
          },
        ];
        setPaymentMethods(mockMethods);
        if (!selectedPaymentMethod) {
          setSelectedPaymentMethod(mockMethods[0]);
        }
      }
    } catch (error) {
      console.error('Ödeme yöntemleri yükleme hatası:', error);
      setPaymentMethods([]);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleSelectPaymentMethod = (method) => {
    setSelectedPaymentMethod(method);
    setShowPaymentModal(false);
  };

  const handleAddNewPaymentMethod = () => {
    setShowPaymentModal(false);
    navigation.navigate('PaymentMethod', {
      onPaymentAdded: async () => {
        await loadPaymentMethods();
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sipariş Özeti</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Sipariş hazırlanıyor...</Text>
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
        <Text style={styles.headerTitle}>Sipariş Özeti</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        <View style={styles.stepCompleted}>
          <Ionicons name="checkmark" size={16} color={COLORS.white} />
        </View>
        <View style={styles.progressLine} />
        <View style={styles.stepCompleted}>
          <Ionicons name="checkmark" size={16} color={COLORS.white} />
        </View>
        <View style={styles.progressLine} />
        <View style={styles.stepActive}>
          <Text style={styles.stepNumber}>3</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ürünler ({cartItems.length})</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
              <Text style={styles.editButton}>Sepeti Düzenle</Text>
            </TouchableOpacity>
          </View>

          {cartItems.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartText}>Sepetinizde ürün bulunmuyor</Text>
            </View>
          ) : (
            cartItems.map((item) => (
              <View key={item.id} style={styles.orderItem}>
                <View style={styles.itemImage}>
                  {item.image ? (
                    <Image 
                      source={{ uri: item.image }} 
                      style={styles.itemImageContent}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Ionicons name="image-outline" size={32} color={COLORS.gray400} />
                    </View>
                  )}
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  {item.variant && (
                    <Text style={styles.itemVariant}>{item.variant}</Text>
                  )}
                  <View style={styles.itemFooter}>
                    <Text style={styles.itemQuantity}>Adet: {item.quantity}</Text>
                    <Text style={styles.itemPrice}>₺{(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Delivery & Payment */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoHeaderLeft}>
              <Ionicons name="car-outline" size={20} color={COLORS.gray400} />
              <Text style={styles.infoHeaderTitle}>TESLİMAT</Text>
            </View>
            <TouchableOpacity onPress={() => {
              if (deliveryMethod === 'shipping') {
                handleChangeAddress();
              } else {
                setShowStoreModal(true);
              }
            }}>
              <Text style={styles.changeButton}>Değiştir</Text>
            </TouchableOpacity>
          </View>
          
          {/* Delivery Method Selection */}
          <View style={styles.deliveryMethodContainer}>
            <TouchableOpacity
              style={[
                styles.deliveryMethodOption,
                deliveryMethod === 'shipping' && styles.deliveryMethodOptionSelected
              ]}
              onPress={() => setDeliveryMethod('shipping')}
            >
              <Ionicons 
                name="car-outline" 
                size={20} 
                color={deliveryMethod === 'shipping' ? COLORS.primary : COLORS.gray400} 
              />
              <Text style={[
                styles.deliveryMethodText,
                deliveryMethod === 'shipping' && styles.deliveryMethodTextSelected
              ]}>
                Kargo ile Teslimat
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deliveryMethodOption,
                deliveryMethod === 'pickup' && styles.deliveryMethodOptionSelected
              ]}
              onPress={() => {
                setDeliveryMethod('pickup');
                if (!selectedStore) {
                  setShowStoreModal(true);
                }
              }}
            >
              <Ionicons 
                name="storefront-outline" 
                size={20} 
                color={deliveryMethod === 'pickup' ? COLORS.primary : COLORS.gray400} 
              />
              <Text style={[
                styles.deliveryMethodText,
                deliveryMethod === 'pickup' && styles.deliveryMethodTextSelected
              ]}>
                Mağazadan Teslim Al
              </Text>
            </TouchableOpacity>
          </View>

          {deliveryMethod === 'shipping' ? (
            <View style={styles.infoContent}>
              <View style={styles.infoIcon}>
                <Ionicons name="location-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoDetails}>
                <Text style={styles.infoName}>
                  {shippingAddress?.fullName || shippingAddress?.customerName || customerInfo.name || 'Adres bilgisi yükleniyor...'}
                </Text>
                <Text style={styles.infoAddress}>
                  {shippingAddress?.fullAddress || shippingAddress?.address || 'Adres bilgisi bulunamadı'}
                  {shippingAddress && (
                    <>
                      {'\n'}
                      {shippingAddress.city || ''}
                      {shippingAddress.district ? `, ${shippingAddress.district}` : ''}
                      {shippingAddress.postalCode ? ` ${shippingAddress.postalCode}` : ''}
                    </>
                  )}
                </Text>
                {shippingAddress?.phone && (
                  <View style={styles.infoPhone}>
                    <Ionicons name="call-outline" size={12} color={COLORS.gray500} />
                    <Text style={styles.infoPhoneText}>{shippingAddress.phone}</Text>
                  </View>
                )}
                <View style={styles.shippingBadge}>
                  <Ionicons name="time-outline" size={14} color={COLORS.success} />
                  <Text style={styles.shippingText}>Standart Kargo (3-5 Gün)</Text>
                </View>
                <TouchableOpacity
                  style={styles.deliveryTimeButton}
                  onPress={() => setShowDeliveryTimeModal(true)}
                >
                  <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.deliveryTimeButtonText}>
                    {selectedDeliveryTime 
                      ? `Tercih Edilen Zaman: ${selectedDeliveryTime}` 
                      : 'Teslimat Zamanı Seç (Opsiyonel)'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.gray400} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.infoContent}>
              <View style={styles.infoIcon}>
                <Ionicons name="storefront-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoDetails}>
                {selectedStore ? (
                  <>
                    <Text style={styles.infoName}>{selectedStore.name}</Text>
                    <Text style={styles.infoAddress}>
                      {selectedStore.address}
                      {'\n'}
                      {selectedStore.city}
                    </Text>
                    {selectedStore.phone && (
                      <View style={styles.infoPhone}>
                        <Ionicons name="call-outline" size={12} color={COLORS.gray500} />
                        <Text style={styles.infoPhoneText}>{selectedStore.phone}</Text>
                      </View>
                    )}
                    <View style={styles.shippingBadge}>
                      <Ionicons name="time-outline" size={14} color={COLORS.success} />
                      <Text style={styles.shippingText}>
                        {selectedStore.hours} • {selectedStore.statusText}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.infoName}>Mağaza Seçilmedi</Text>
                    <Text style={styles.infoAddress}>Lütfen bir mağaza seçin</Text>
                    <TouchableOpacity
                      style={styles.selectStoreButton}
                      onPress={() => setShowStoreModal(true)}
                    >
                      <Text style={styles.selectStoreButtonText}>Mağaza Seç</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoHeaderLeft}>
              <Ionicons name="card-outline" size={20} color={COLORS.gray400} />
              <Text style={styles.infoHeaderTitle}>ÖDEME</Text>
            </View>
            <TouchableOpacity onPress={() => handleChangePayment()}>
              <Text style={styles.changeButton}>Değiştir</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoContent}>
            <View style={styles.cardIcon}>
              <Ionicons name="card-outline" size={20} color={COLORS.textMain} />
            </View>
            <View style={styles.infoDetails}>
              <Text style={styles.infoName}>
                {selectedPaymentMethod 
                  ? `${selectedPaymentMethod.cardType || 'Kart'} ****${selectedPaymentMethod.lastFour || '****'}` 
                  : paymentMethod === 'bank_transfer' 
                    ? 'Banka Havalesi'
                    : paymentMethod === 'wallet'
                      ? 'Kullanıcı Kredisi'
                      : 'Visa ****4242'}
              </Text>
              <Text style={styles.infoAddress}>
                {selectedPaymentMethod?.expiryDate 
                  ? `Son kullanma: ${selectedPaymentMethod.expiryDate}` 
                  : paymentMethod === 'bank_transfer'
                    ? 'İş Bankası - TR33 0006 4000 0011 2345 6789 01'
                    : paymentMethod === 'wallet'
                      ? `Mevcut Bakiye: ₺${userBalance.toFixed(2)}`
                      : 'Son kullanma: 12/28'}
              </Text>
            </View>
            <View style={styles.secureBadge}>
              <Ionicons name="lock-closed-outline" size={12} color={COLORS.gray400} />
              <Text style={styles.secureText}>Güvenli</Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Sipariş Özeti</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ara Toplam</Text>
            <Text style={styles.summaryValue}>₺{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {deliveryMethod === 'pickup' ? 'Mağazadan Teslim Al' : 'Kargo'}
            </Text>
            {deliveryMethod === 'pickup' ? (
              <Text style={[styles.summaryValue, { color: COLORS.primary }]}>Ücretsiz</Text>
            ) : shipping === 0 ? (
              <Text style={[styles.summaryValue, { color: COLORS.primary }]}>Ücretsiz</Text>
            ) : (
              <Text style={styles.summaryValue}>₺{shipping.toFixed(2)}</Text>
            )}
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tahmini Vergi</Text>
            <Text style={styles.summaryValue}>₺0.00</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>Toplam</Text>
            <Text style={styles.summaryTotalValue}>₺{total.toFixed(2)}</Text>
          </View>
          {shipping === 0 && subtotal >= 600 && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>🎉 Ücretsiz kargo kazandınız!</Text>
            </View>
          )}
        </View>

        {/* Trust Badge */}
        <View style={styles.trustBadge}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.gray400} />
          <Text style={styles.trustText}>%100 Güvenli Ödeme Garantisi</Text>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : paymentCompleted ? (
          <View style={{ padding: 16 }}>
            <Text style={{ textAlign: 'center', color: COLORS.gray500, fontSize: 14 }}>
              Ödeme başarıyla tamamlandı
            </Text>
          </View>
        ) : (
          <View style={styles.bottomBarContent}>
            {/* B2B Açık Hesap Seçeneği */}
            {isB2BMode && (
              <TouchableOpacity
                style={styles.openAccountButton}
                onPress={() => setShowOpenAccountModal(true)}
              >
                <View style={styles.openAccountIcon}>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.openAccountText}>
                  <Text style={styles.openAccountTitle}>Açık Hesap ile Öde</Text>
                  <Text style={styles.openAccountSubtitle}>30/60/90 gün vade seçenekleri</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
              </TouchableOpacity>
            )}
            
            <Button
              title={`Siparişi Tamamla - ₺${total.toFixed(2)}`}
              onPress={() => {
                // Show success modal or navigate to success screen
                handleCreateOrder();
              }}
            />
          </View>
        )}
      </SafeAreaView>

      {/* Order Success Modal */}
      <OrderSuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigation.navigate('Main');
        }}
        orderId={successModalData?.orderId}
        expGained={successModalData?.expGained}
        paymentMethod={successModalData?.paymentMethod}
        paymentInfo={successModalData?.paymentInfo}
        totalAmount={successModalData?.totalAmount}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorMessage}
      />

      {/* Address Selection Modal */}
      <Modal
        visible={showAddressModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowAddressModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Teslimat Adresi Seç</Text>
              <TouchableOpacity 
                onPress={() => setShowAddressModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              {loadingAddresses ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.modalLoadingText}>Adresler yükleniyor...</Text>
                </View>
              ) : addresses.length === 0 ? (
                <View style={styles.modalEmptyContainer}>
                  <Ionicons name="location-outline" size={64} color={COLORS.gray300} />
                  <Text style={styles.modalEmptyText}>Henüz adres eklenmemiş</Text>
                  <Text style={styles.modalEmptySubtext}>Yeni adres eklemek için aşağıdaki butonu kullanın</Text>
                </View>
              ) : (
                addresses.map((address) => (
                  <TouchableOpacity
                    key={address.id}
                    style={[
                      styles.addressOptionCard,
                      shippingAddress?.id === address.id && styles.addressOptionCardSelected
                    ]}
                    onPress={() => handleSelectAddress(address)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.addressOptionContent}>
                      <View style={styles.addressOptionHeader}>
                        <View style={styles.addressOptionIcon}>
                          <Ionicons 
                            name={address.addressType === 'home' ? 'home' : address.addressType === 'office' ? 'business' : 'location'} 
                            size={20} 
                            color={shippingAddress?.id === address.id ? COLORS.primary : COLORS.gray400} 
                          />
                        </View>
                        <View style={styles.addressOptionInfo}>
                          <View style={styles.addressOptionTitleRow}>
                            <Text style={styles.addressOptionTitle}>
                              {address.label || address.addressType || 'Adres'}
                            </Text>
                            {address.isDefault && (
                              <View style={styles.defaultBadge}>
                                <Text style={styles.defaultBadgeText}>VARSayıLAN</Text>
                              </View>
                            )}
                            {shippingAddress?.id === address.id && (
                              <View style={styles.selectedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                                <Text style={styles.selectedBadgeText}>Seçili</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.addressOptionName}>
                            {address.fullName || address.customerName || ''}
                          </Text>
                          <Text style={styles.addressOptionAddress}>
                            {address.fullAddress || address.address || ''}
                          </Text>
                          <Text style={styles.addressOptionLocation}>
                            {address.city || ''}{address.district ? `, ${address.district}` : ''} {address.postalCode || ''}
                          </Text>
                          {address.phone && (
                            <View style={styles.addressOptionPhone}>
                              <Ionicons name="call-outline" size={12} color={COLORS.gray500} />
                              <Text style={styles.addressOptionPhoneText}>{address.phone}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.addAddressButton}
                onPress={handleAddNewAddress}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color={COLORS.white} />
                <Text style={styles.addAddressButtonText}>Yeni Adres Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Store Selection Modal */}
      <Modal
        visible={showStoreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowStoreModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mağaza Seç</Text>
              <TouchableOpacity 
                onPress={() => setShowStoreModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              {STORES.filter(store => store.status === 'open' && store.pickupAvailable !== false).map((store) => (
                <TouchableOpacity
                  key={store.id}
                  style={[
                    styles.storeOptionCard,
                    selectedStore?.id === store.id && styles.storeOptionCardSelected
                  ]}
                  onPress={() => {
                    setSelectedStore(store);
                    setShowStoreModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.storeOptionContent}>
                    <View style={styles.storeOptionHeader}>
                      <View style={styles.storeOptionIcon}>
                        <Ionicons 
                          name="storefront-outline" 
                          size={20} 
                          color={selectedStore?.id === store.id ? COLORS.primary : COLORS.gray400} 
                        />
                      </View>
                      <View style={styles.storeOptionInfo}>
                        <View style={styles.storeOptionTitleRow}>
                          <Text style={styles.storeOptionTitle}>
                            {store.name}
                          </Text>
                          {selectedStore?.id === store.id && (
                            <View style={styles.selectedBadge}>
                              <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                              <Text style={styles.selectedBadgeText}>Seçili</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.storeOptionAddress}>
                          {store.address}
                        </Text>
                        <Text style={styles.storeOptionLocation}>
                          {store.city}
                        </Text>
                        {store.phone && (
                          <View style={styles.storeOptionPhone}>
                            <Ionicons name="call-outline" size={12} color={COLORS.gray500} />
                            <Text style={styles.storeOptionPhoneText}>{store.phone}</Text>
                          </View>
                        )}
                        <View style={styles.storeOptionHours}>
                          <Ionicons name="time-outline" size={12} color={COLORS.gray500} />
                          <Text style={styles.storeOptionHoursText}>
                            {store.hours} • {store.statusText}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delivery Time Selection Modal */}
      <Modal
        visible={showDeliveryTimeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeliveryTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowDeliveryTimeModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Teslimat Zamanı Seç</Text>
              <TouchableOpacity 
                onPress={() => setShowDeliveryTimeModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.deliveryTimeOptions}>
                <Text style={styles.deliveryTimeSectionTitle}>Hafta İçi (Pazartesi - Cuma)</Text>
                {['09:00 - 12:00', '12:00 - 17:00', '17:00 - 20:00'].map((time) => (
                  <TouchableOpacity
                    key={`weekday_${time}`}
                    style={[
                      styles.deliveryTimeOption,
                      selectedDeliveryTime === `Hafta İçi ${time}` && styles.deliveryTimeOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedDeliveryTime(`Hafta İçi ${time}`);
                      setShowDeliveryTimeModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={selectedDeliveryTime === `Hafta İçi ${time}` ? 'radio-button-on' : 'radio-button-off'} 
                      size={20} 
                      color={selectedDeliveryTime === `Hafta İçi ${time}` ? COLORS.primary : COLORS.gray400} 
                    />
                    <View style={styles.deliveryTimeOptionContent}>
                      <Text style={[
                        styles.deliveryTimeOptionText,
                        selectedDeliveryTime === `Hafta İçi ${time}` && styles.deliveryTimeOptionTextSelected
                      ]}>
                        {time}
                      </Text>
                      <Text style={styles.deliveryTimeOptionDesc}>İş günleri</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                <Text style={styles.deliveryTimeSectionTitle}>Hafta Sonu (Cumartesi - Pazar)</Text>
                {['10:00 - 14:00', '14:00 - 18:00'].map((time) => (
                  <TouchableOpacity
                    key={`weekend_${time}`}
                    style={[
                      styles.deliveryTimeOption,
                      selectedDeliveryTime === `Hafta Sonu ${time}` && styles.deliveryTimeOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedDeliveryTime(`Hafta Sonu ${time}`);
                      setShowDeliveryTimeModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={selectedDeliveryTime === `Hafta Sonu ${time}` ? 'radio-button-on' : 'radio-button-off'} 
                      size={20} 
                      color={selectedDeliveryTime === `Hafta Sonu ${time}` ? COLORS.primary : COLORS.gray400} 
                    />
                    <View style={styles.deliveryTimeOptionContent}>
                      <Text style={[
                        styles.deliveryTimeOptionText,
                        selectedDeliveryTime === `Hafta Sonu ${time}` && styles.deliveryTimeOptionTextSelected
                      ]}>
                        {time}
                      </Text>
                      <Text style={styles.deliveryTimeOptionDesc}>Hafta sonu</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.deliveryTimeRemoveButton}
                  onPress={() => {
                    setSelectedDeliveryTime(null);
                    setShowDeliveryTimeModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
                  <Text style={styles.deliveryTimeRemoveButtonText}>Zaman Tercihi Kaldır</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment Method Selection Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowPaymentModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ödeme Yöntemi Seç</Text>
              <TouchableOpacity 
                onPress={() => setShowPaymentModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              {loadingPaymentMethods ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.modalLoadingText}>Ödeme yöntemleri yükleniyor...</Text>
                </View>
              ) : paymentMethods.length === 0 ? (
                <View style={styles.modalEmptyContainer}>
                  <Ionicons name="card-outline" size={64} color={COLORS.gray300} />
                  <Text style={styles.modalEmptyText}>Henüz ödeme yöntemi eklenmemiş</Text>
                  <Text style={styles.modalEmptySubtext}>Yeni ödeme yöntemi eklemek için aşağıdaki butonu kullanın</Text>
                </View>
              ) : (
                <>
                  {paymentMethods.map((method) => {
                    const cardType = method.cardType || method.type || 'Kart';
                    const lastFour = method.lastFour || method.cardNumber?.slice(-4) || '****';
                    const expiry = method.expiryDate || method.expiry || '';
                    const isSelected = selectedPaymentMethod?.id === method.id;
                    
                    return (
                      <TouchableOpacity
                        key={method.id}
                        style={[
                          styles.paymentOptionCard,
                          isSelected && styles.paymentOptionCardSelected
                        ]}
                        onPress={() => handleSelectPaymentMethod(method)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.paymentOptionContent}>
                          <View style={styles.paymentOptionHeader}>
                            <View style={[
                              styles.paymentOptionIcon,
                              cardType.toUpperCase().includes('MASTER') && styles.mastercardIcon
                            ]}>
                              <Text style={styles.paymentOptionIconText}>
                                {cardType.toUpperCase().includes('MASTER') ? 'MC' : cardType.substring(0, 4).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.paymentOptionInfo}>
                              <View style={styles.paymentOptionTitleRow}>
                                <Text style={styles.paymentOptionTitle}>
                                  {cardType} ****{lastFour}
                                </Text>
                                {method.isDefault && (
                                  <View style={styles.defaultBadge}>
                                    <Text style={styles.defaultBadgeText}>VARSayıLAN</Text>
                                  </View>
                                )}
                                {isSelected && (
                                  <View style={styles.selectedBadge}>
                                    <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                                    <Text style={styles.selectedBadgeText}>Seçili</Text>
                                  </View>
                                )}
                              </View>
                              {expiry && (
                                <Text style={styles.paymentOptionExpiry}>
                                  Son kullanma: {expiry}
                                </Text>
                              )}
                              {method.cardName && (
                                <Text style={styles.paymentOptionName}>
                                  {method.cardName}
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  
                  {/* Bank Transfer Option */}
                  <TouchableOpacity
                    style={[
                      styles.paymentOptionCard,
                      paymentMethod === 'bank_transfer' && styles.paymentOptionCardSelected
                    ]}
                    onPress={() => {
                      setSelectedPaymentMethod({ id: 'bank_transfer', type: 'bank_transfer' });
                      setShowPaymentModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.paymentOptionContent}>
                      <View style={styles.paymentOptionHeader}>
                        <View style={styles.paymentOptionIcon}>
                          <Ionicons name="business-outline" size={20} color={paymentMethod === 'bank_transfer' ? COLORS.primary : COLORS.gray400} />
                        </View>
                        <View style={styles.paymentOptionInfo}>
                          <View style={styles.paymentOptionTitleRow}>
                            <Text style={styles.paymentOptionTitle}>Banka Havalesi</Text>
                            {paymentMethod === 'bank_transfer' && (
                              <View style={styles.selectedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                                <Text style={styles.selectedBadgeText}>Seçili</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.paymentOptionExpiry}>
                            İş Bankası - TR33 0006 4000 0011 2345 6789 01
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Wallet Balance Option */}
                  <TouchableOpacity
                    style={[
                      styles.paymentOptionCard,
                      paymentMethod === 'wallet' && styles.paymentOptionCardSelected,
                      userBalance < total && styles.paymentOptionCardDisabled
                    ]}
                    onPress={() => {
                      if (userBalance < total) {
                        alert.show(
                          'Yetersiz Bakiye',
                          `Cüzdan bakiyeniz (₺${userBalance.toFixed(2)}) sipariş tutarı (₺${total.toFixed(2)}) için yetersiz. Lütfen cüzdanınıza bakiye yükleyin veya başka bir ödeme yöntemi seçin.`
                        );
                        return;
                      }
                      setSelectedPaymentMethod({ id: 'wallet', type: 'wallet' });
                      setShowPaymentModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.paymentOptionContent}>
                      <View style={styles.paymentOptionHeader}>
                        <View style={styles.paymentOptionIcon}>
                          <Ionicons 
                            name="wallet-outline" 
                            size={20} 
                            color={userBalance < total ? COLORS.gray400 : (paymentMethod === 'wallet' ? COLORS.primary : COLORS.gray600)} 
                          />
                        </View>
                        <View style={styles.paymentOptionInfo}>
                          <View style={styles.paymentOptionTitleRow}>
                            <Text style={[
                              styles.paymentOptionTitle,
                              userBalance < total && styles.paymentOptionTitleDisabled
                            ]}>
                              Kullanıcı Kredisi
                            </Text>
                            {paymentMethod === 'wallet' && userBalance >= total && (
                              <View style={styles.selectedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                                <Text style={styles.selectedBadgeText}>Seçili</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[
                            styles.paymentOptionExpiry,
                            userBalance < total && styles.paymentOptionExpiryDisabled
                          ]}>
                            Mevcut Bakiye: ₺{userBalance.toFixed(2)}
                          </Text>
                          {userBalance < total && (
                            <Text style={styles.insufficientBalanceText}>
                              ⚠️ Yetersiz bakiye (₺{(total - userBalance).toFixed(2)} eksik)
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.addAddressButton}
                onPress={handleAddNewPaymentMethod}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color={COLORS.white} />
                <Text style={styles.addAddressButtonText}>Yeni Ödeme Yöntemi Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* B2B Open Account Payment Modal */}
      <Modal
        visible={showOpenAccountModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOpenAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowOpenAccountModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Açık Hesap ile Ödeme</Text>
              <TouchableOpacity 
                onPress={() => setShowOpenAccountModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.openAccountModalContent}>
                <View style={styles.openAccountInfo}>
                  <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.openAccountInfoText}>
                    Açık hesap ile ödeme seçeneği, B2B müşterilerimize özel vade imkanı sunar.
                  </Text>
                </View>

                <View style={styles.vadePeriodContainer}>
                  <Text style={styles.vadePeriodLabel}>Vade Süresi Seçin</Text>
                  
                  {/* 30 Gün */}
                  <TouchableOpacity
                    style={[
                      styles.vadePeriodOption,
                      selectedVadePeriod === 30 && styles.vadePeriodOptionSelected
                    ]}
                    onPress={() => setSelectedVadePeriod(30)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.vadePeriodContent}>
                      <View style={styles.vadePeriodHeader}>
                        <Ionicons 
                          name="calendar-outline" 
                          size={24} 
                          color={selectedVadePeriod === 30 ? COLORS.primary : COLORS.gray400} 
                        />
                        <Text style={[
                          styles.vadePeriodTitle,
                          selectedVadePeriod === 30 && styles.vadePeriodTitleSelected
                        ]}>
                          30 Gün Vade
                        </Text>
                        <View style={styles.vadeFarkiBadge}>
                          <Text style={styles.vadeFarkiBadgeText}>Vade Farkı Yok</Text>
                        </View>
                      </View>
                      <Text style={styles.vadePeriodDescription}>
                        Son ödeme tarihi: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR')}
                      </Text>
                      <Text style={styles.vadePeriodAmount}>
                        Ödenecek Tutar: ₺{calculateTotalWithVade(30).toFixed(2)}
                      </Text>
                    </View>
                    {selectedVadePeriod === 30 && (
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>

                  {/* 60 Gün */}
                  <TouchableOpacity
                    style={[
                      styles.vadePeriodOption,
                      selectedVadePeriod === 60 && styles.vadePeriodOptionSelected
                    ]}
                    onPress={() => setSelectedVadePeriod(60)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.vadePeriodContent}>
                      <View style={styles.vadePeriodHeader}>
                        <Ionicons 
                          name="calendar-outline" 
                          size={24} 
                          color={selectedVadePeriod === 60 ? COLORS.primary : COLORS.gray400} 
                        />
                        <Text style={[
                          styles.vadePeriodTitle,
                          selectedVadePeriod === 60 && styles.vadePeriodTitleSelected
                        ]}>
                          60 Gün Vade
                        </Text>
                        <View style={[styles.vadeFarkiBadge, styles.vadeFarkiBadgeWarning]}>
                          <Text style={styles.vadeFarkiBadgeText}>+%5 Vade Farkı</Text>
                        </View>
                      </View>
                      <Text style={styles.vadePeriodDescription}>
                        Son ödeme tarihi: {new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR')}
                      </Text>
                      <Text style={styles.vadePeriodAmount}>
                        Ödenecek Tutar: ₺{calculateTotalWithVade(60).toFixed(2)}
                      </Text>
                      <Text style={styles.vadeFarkiAmount}>
                        (Vade Farkı: +₺{calculateVadeFarki(total, 60).toFixed(2)})
                      </Text>
                    </View>
                    {selectedVadePeriod === 60 && (
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>

                  {/* 90 Gün */}
                  <TouchableOpacity
                    style={[
                      styles.vadePeriodOption,
                      selectedVadePeriod === 90 && styles.vadePeriodOptionSelected
                    ]}
                    onPress={() => setSelectedVadePeriod(90)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.vadePeriodContent}>
                      <View style={styles.vadePeriodHeader}>
                        <Ionicons 
                          name="calendar-outline" 
                          size={24} 
                          color={selectedVadePeriod === 90 ? COLORS.primary : COLORS.gray400} 
                        />
                        <Text style={[
                          styles.vadePeriodTitle,
                          selectedVadePeriod === 90 && styles.vadePeriodTitleSelected
                        ]}>
                          90 Gün Vade
                        </Text>
                        <View style={[styles.vadeFarkiBadge, styles.vadeFarkiBadgeError]}>
                          <Text style={styles.vadeFarkiBadgeText}>+%10 Vade Farkı</Text>
                        </View>
                      </View>
                      <Text style={styles.vadePeriodDescription}>
                        Son ödeme tarihi: {new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR')}
                      </Text>
                      <Text style={styles.vadePeriodAmount}>
                        Ödenecek Tutar: ₺{calculateTotalWithVade(90).toFixed(2)}
                      </Text>
                      <Text style={styles.vadeFarkiAmount}>
                        (Vade Farkı: +₺{calculateVadeFarki(total, 90).toFixed(2)})
                      </Text>
                    </View>
                    {selectedVadePeriod === 90 && (
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.openAccountBenefits}>
                  <Text style={styles.openAccountBenefitsTitle}>Açık Hesap Avantajları</Text>
                  <View style={styles.openAccountBenefitItem}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                    <Text style={styles.openAccountBenefitText}>Nakit akışınızı rahatlatın</Text>
                  </View>
                  <View style={styles.openAccountBenefitItem}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                    <Text style={styles.openAccountBenefitText}>Toplu alımlarda esneklik</Text>
                  </View>
                  <View style={styles.openAccountBenefitItem}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                    <Text style={styles.openAccountBenefitText}>Faizsiz vade imkanı</Text>
                  </View>
                </View>

                <View style={styles.openAccountSummary}>
                  <View style={styles.openAccountSummaryRow}>
                    <Text style={styles.openAccountSummaryLabel}>Sipariş Tutarı</Text>
                    <Text style={styles.openAccountSummaryValue}>₺{total.toFixed(2)}</Text>
                  </View>
                  {selectedVadePeriod && (
                    <>
                      {calculateVadeFarki(total, selectedVadePeriod) > 0 && (
                        <View style={styles.openAccountSummaryRow}>
                          <Text style={styles.openAccountSummaryLabel}>Vade Farkı (%{VADE_FARKI[selectedVadePeriod]})</Text>
                          <Text style={styles.openAccountSummaryValueWarning}>
                            +₺{calculateVadeFarki(total, selectedVadePeriod).toFixed(2)}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.openAccountSummaryRow, styles.openAccountSummaryTotal]}>
                        <Text style={styles.openAccountSummaryLabelTotal}>Toplam Ödenecek</Text>
                        <Text style={styles.openAccountSummaryValueTotal}>
                          ₺{calculateTotalWithVade(selectedVadePeriod).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.openAccountSummaryRow}>
                        <Text style={styles.openAccountSummaryLabel}>Son Ödeme Tarihi</Text>
                        <Text style={styles.openAccountSummaryValue}>
                          {new Date(Date.now() + selectedVadePeriod * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.openAccountConfirmButton,
                  !selectedVadePeriod && styles.openAccountConfirmButtonDisabled
                ]}
                onPress={async () => {
                  if (!selectedVadePeriod) {
                    return;
                  }
                  setShowOpenAccountModal(false);
                  
                  // Açık hesap ödeme yöntemiyle sipariş oluştur
                  try {
                    setLoading(true);
                    const storedUserId = await secureStorage.getItem('userId');
                    
                    if (!storedUserId) {
                      setErrorMessage('Lütfen giriş yapın');
                      setShowErrorModal(true);
                      return;
                    }

                    const address = shippingAddress || {};
                    
                    if (deliveryMethod === 'pickup' && !selectedStore) {
                      setErrorMessage('Lütfen bir mağaza seçin');
                      setShowErrorModal(true);
                      setLoading(false);
                      return;
                    }

                    if (deliveryMethod === 'shipping' && (!address || (!address.fullAddress && !address.address))) {
                      setErrorMessage('Lütfen teslimat adresi seçin');
                      setShowErrorModal(true);
                      setLoading(false);
                      return;
                    }
                    
                    let fullAddressString = '';
                    let city = '';
                    let district = '';
                    let addressLine = '';
                    
                    if (deliveryMethod === 'pickup' && selectedStore) {
                      fullAddressString = `${selectedStore.name}\n${selectedStore.address}\n${selectedStore.city}`;
                      city = selectedStore.city;
                      addressLine = selectedStore.address;
                    } else if (deliveryMethod === 'shipping' && address) {
                      addressLine = address.fullAddress || address.address || '';
                      city = address.city || '';
                      district = address.district || '';
                      const postalCode = address.postalCode || '';
                      
                      fullAddressString = [
                        addressLine,
                        city && district ? `${city}, ${district}` : (city || district),
                        postalCode
                      ].filter(Boolean).join('\n').trim() || addressLine;
                    }

                    const orderData = {
                      userId: parseInt(storedUserId),
                      totalAmount: calculateTotalWithVade(selectedVadePeriod), // Vade farkı dahil toplam
                      originalAmount: total, // Orijinal tutar
                      vadeFarki: calculateVadeFarki(total, selectedVadePeriod), // Vade farkı tutarı
                      vadeFarkiPercentage: VADE_FARKI[selectedVadePeriod], // Vade farkı yüzdesi
                      status: 'pending',
                      shippingAddress: fullAddressString,
                      paymentMethod: 'open_account',
                      paymentTerms: selectedVadePeriod, // 30, 60, 90 gün
                      dueDate: new Date(Date.now() + selectedVadePeriod * 24 * 60 * 60 * 1000).toISOString(),
                      deliveryMethod: deliveryMethod,
                      pickupStoreId: deliveryMethod === 'pickup' ? selectedStore?.id : null,
                      pickupStoreName: deliveryMethod === 'pickup' ? selectedStore?.name : null,
                      preferredDeliveryTime: deliveryMethod === 'shipping' ? selectedDeliveryTime : null,
                      city: city,
                      district: district,
                      fullAddress: addressLine,
                      customerName: deliveryMethod === 'pickup' 
                        ? (customerInfo.name || selectedStore?.name || '')
                        : (customerInfo.name || address?.fullName || address?.customerName || ''),
                      customerEmail: customerInfo.email || address?.email || '',
                      customerPhone: deliveryMethod === 'pickup'
                        ? (customerInfo.phone || selectedStore?.phone || '')
                        : (customerInfo.phone || address?.phone || ''),
                      items: cartItems.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.price,
                        productName: item.name || null,
                        productDescription: item.description || null,
                        productCategory: item.category || null,
                        productBrand: item.brand || null,
                        productImage: item.image || null,
                        selectedVariations: typeof item.selectedVariations === 'string' 
                          ? item.selectedVariations 
                          : (item.selectedVariations ? JSON.stringify(item.selectedVariations) : null)
                      }))
                    };

                    console.log('Açık hesap siparişi oluşturuluyor:', orderData);

                    const response = await ordersAPI.create(orderData);
                    
                    if (response.data?.success) {
                      const orderId = response.data.data?.orderId || response.data.orderId;
                      
                      try {
                        await analytics.trackPurchase(orderId, {
                          amount: calculateTotalWithVade(selectedVadePeriod),
                          originalAmount: total,
                          vadeFarki: calculateVadeFarki(total, selectedVadePeriod),
                          itemCount: cartItems.length,
                          paymentMethod: 'open_account',
                          paymentTerms: selectedVadePeriod,
                          shipping: shipping,
                          subtotal: subtotal
                        });
                      } catch (analyticsError) {
                        console.log('Analytics purchase error:', analyticsError);
                      }
                      
                      try {
                        const b2bMode = await secureStorage.getItem('isB2BMode');
                        if (b2bMode !== 'true') {
                          await userLevelAPI.addPurchaseExp(storedUserId, calculateTotalWithVade(selectedVadePeriod), orderId);
                          console.log('✅ Alışveriş EXP eklendi');
                        } else {
                          console.log('ℹ️ B2B modunda EXP kazanılmaz');
                        }
                      } catch (expError) {
                        console.log('⚠️ EXP eklenemedi:', expError.message);
                      }
                      
                      setSuccessModalData({
                        orderId,
                        expGained: true,
                        paymentMethod: 'open_account',
                        paymentInfo: {
                          vadePeriod: selectedVadePeriod,
                          dueDate: new Date(Date.now() + selectedVadePeriod * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR'),
                          vadeFarki: calculateVadeFarki(total, selectedVadePeriod),
                          vadeFarkiPercentage: VADE_FARKI[selectedVadePeriod],
                        },
                        totalAmount: calculateTotalWithVade(selectedVadePeriod),
                      });
                      setShowSuccessModal(true);
                      
                      try {
                        console.log('🗑️ Sepet temizleniyor... userId:', storedUserId);
                        const clearResponse = await cartAPI.clear(storedUserId);
                        console.log('✅ Sepet temizleme yanıtı:', clearResponse.data);
                        
                        setCartItems([]);
                        setSubtotal(0);
                        setTotal(0);
                        
                        await secureStorage.setItem('cartCount', '0');
                        await secureStorage.setItem('cartLastCleared', Date.now().toString());
                        
                        await updateCartBadge(storedUserId);
                        console.log('✅ Sepet temizlendi, cache temizlendi ve badge güncellendi');
                      } catch (clearError) {
                        console.error('❌ Sepet temizleme hatası:', clearError);
                        try {
                          await secureStorage.setItem('cartCount', '0');
                          await secureStorage.setItem('cartLastCleared', Date.now().toString());
                        } catch (cacheError) {
                          console.error('❌ Cache temizleme hatası:', cacheError);
                        }
                      }
                    } else {
                      setErrorMessage(response.data?.message || 'Sipariş oluşturulamadı');
                      setShowErrorModal(true);
                    }
                  } catch (error) {
                    console.error('Açık hesap sipariş hatası:', error);
                    setErrorMessage('Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
                    setShowErrorModal(true);
                  } finally {
                    setLoading(false);
                  }
                }}
                activeOpacity={selectedVadePeriod ? 0.8 : 1}
                disabled={!selectedVadePeriod}
              >
                <Text style={styles.openAccountConfirmButtonText}>
                  {selectedVadePeriod ? `${selectedVadePeriod} Gün Vade ile Onayla` : 'Vade Süresi Seçin'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  stepCompleted: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(17, 212, 33, 0.3)',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  progressLine: {
    width: 32,
    height: 2,
    backgroundColor: 'rgba(17, 212, 33, 0.3)',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  orderItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    overflow: 'hidden',
  },
  itemImageContent: {
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
  emptyCart: {
    padding: 32,
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  itemVariant: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray600,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray500,
    letterSpacing: 1,
  },
  changeButton: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoDetails: {
    flex: 1,
  },
  infoName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  infoAddress: {
    fontSize: 14,
    color: COLORS.gray500,
    lineHeight: 20,
    marginBottom: 4,
  },
  infoPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  infoPhoneText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  shippingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  shippingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.gray100,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  secureText: {
    fontSize: 10,
    color: COLORS.gray400,
  },
  summaryCard: {
    margin: 16,
    marginTop: 0,
    padding: 24,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.gray600,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.gray200,
    marginVertical: 12,
    borderStyle: 'dashed',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  summaryTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  savingsBadge: {
    marginTop: 12,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  trustText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  bottomBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Address Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 0,
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  modalLoadingText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  modalEmptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray600,
    marginTop: 16,
  },
  modalEmptySubtext: {
    fontSize: 14,
    color: COLORS.gray500,
    marginTop: 8,
    textAlign: 'center',
  },
  addressOptionCard: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  addressOptionCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  addressOptionContent: {
    flex: 1,
  },
  addressOptionHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  addressOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressOptionInfo: {
    flex: 1,
  },
  addressOptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  addressOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  defaultBadge: {
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  selectedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  addressOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  addressOptionAddress: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
    marginBottom: 2,
  },
  addressOptionLocation: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 4,
  },
  addressOptionPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  addressOptionPhoneText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
  },
  addAddressButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Payment Modal Styles
  paymentOptionCard: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  paymentOptionCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  paymentOptionContent: {
    flex: 1,
  },
  paymentOptionHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mastercardIcon: {
    backgroundColor: '#EB001B',
  },
  paymentOptionIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  paymentOptionInfo: {
    flex: 1,
  },
  paymentOptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  paymentOptionExpiry: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 2,
  },
  paymentOptionName: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },
  paymentOptionCardDisabled: {
    opacity: 0.5,
    backgroundColor: COLORS.gray50,
  },
  paymentOptionTitleDisabled: {
    color: COLORS.gray400,
  },
  paymentOptionExpiryDisabled: {
    color: COLORS.gray400,
  },
  insufficientBalanceText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
    fontWeight: '600',
  },
  // Delivery Method Styles
  deliveryMethodContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  deliveryMethodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  deliveryMethodOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  deliveryMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  deliveryMethodTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  selectStoreButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  selectStoreButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Store Selection Modal Styles
  storeOptionCard: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  storeOptionCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  storeOptionContent: {
    flex: 1,
  },
  storeOptionHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  storeOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeOptionInfo: {
    flex: 1,
  },
  storeOptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  storeOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  storeOptionAddress: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
    marginBottom: 2,
  },
  storeOptionLocation: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 4,
  },
  storeOptionPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  storeOptionPhoneText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  storeOptionHours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  storeOptionHoursText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  // Delivery Time Selection Styles
  deliveryTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  deliveryTimeButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMain,
  },
  deliveryTimeOptions: {
    padding: 16,
  },
  deliveryTimeSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginTop: 16,
    marginBottom: 12,
  },
  deliveryTimeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  deliveryTimeOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  deliveryTimeOptionContent: {
    flex: 1,
  },
  deliveryTimeOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  deliveryTimeOptionTextSelected: {
    color: COLORS.primary,
  },
  deliveryTimeOptionDesc: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  deliveryTimeRemoveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    marginTop: 16,
  },
  deliveryTimeRemoveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  // B2B Open Account Styles
  openAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 12,
  },
  openAccountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  openAccountText: {
    flex: 1,
  },
  openAccountTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  openAccountSubtitle: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  openAccountModalContent: {
    padding: 16,
  },
  openAccountInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
    borderRadius: 12,
    marginBottom: 20,
  },
  openAccountInfoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray700,
    lineHeight: 20,
  },
  vadePeriodContainer: {
    marginBottom: 20,
  },
  vadePeriodLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  vadePeriodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginBottom: 12,
  },
  vadePeriodOptionSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  vadePeriodContent: {
    flex: 1,
  },
  vadePeriodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  vadePeriodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  vadePeriodTitleSelected: {
    color: COLORS.primary,
  },
  vadePeriodDescription: {
    fontSize: 13,
    color: COLORS.gray600,
    marginLeft: 36,
    marginBottom: 4,
  },
  vadePeriodAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    marginLeft: 36,
    marginTop: 4,
  },
  vadeFarkiAmount: {
    fontSize: 12,
    color: COLORS.gray500,
    marginLeft: 36,
    marginTop: 2,
  },
  vadeFarkiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
  },
  vadeFarkiBadgeWarning: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
  },
  vadeFarkiBadgeError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  vadeFarkiBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  openAccountBenefits: {
    padding: 16,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    marginBottom: 20,
  },
  openAccountBenefitsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  openAccountBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  openAccountBenefitText: {
    fontSize: 14,
    color: COLORS.gray700,
  },
  openAccountSummary: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  openAccountSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  openAccountSummaryTotal: {
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  openAccountSummaryLabel: {
    fontSize: 14,
    color: COLORS.gray600,
  },
  openAccountSummaryLabelTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  openAccountSummaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  openAccountSummaryValueWarning: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f59e0b',
  },
  openAccountSummaryValueTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  openAccountConfirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openAccountConfirmButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  openAccountConfirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
