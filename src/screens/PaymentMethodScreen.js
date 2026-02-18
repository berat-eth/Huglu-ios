import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, TextInput, Modal, Animated, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// WebView conditional import - Expo Go'da çalışmaz, development build gerekiyor
let WebView = null;
try {
  const WebViewModule = require('react-native-webview');
  WebView = WebViewModule.WebView;
} catch (error) {
  console.warn('⚠️ WebView modülü yüklenemedi. Development build gerekiyor:', error.message);
}
import { secureStorage } from '../utils/secureStorage';
import Button from '../components/Button';
import Input from '../components/Input';
import { COLORS } from '../constants/colors';
import { cartAPI, walletAPI, ordersAPI, paymentAPI, userAPI } from '../services/api';
import { isNFCAvailable, readContactlessCard, processContactlessPayment } from '../services/nfcPayment';
import { useAlert } from '../hooks/useAlert';

export default function PaymentMethodScreen({ navigation, route }) {
  const alert = useAlert();
  const [selectedPayment, setSelectedPayment] = useState('new_card');
  const [loading, setLoading] = useState(true);
  const [cartTotal, setCartTotal] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [userId, setUserId] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  
  // Kart bilgileri
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  
  // Temassız ödeme durumları
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [isReadingCard, setIsReadingCard] = useState(false);
  const [nfcModalVisible, setNfcModalVisible] = useState(false);
  const [nfcAnimation] = useState(new Animated.Value(0));
  
  // 3D Secure durumları
  const [show3DSModal, setShow3DSModal] = useState(false);
  const [threeDSHtmlContent, setThreeDSHtmlContent] = useState('');
  const [threeDSConversationId, setThreeDSConversationId] = useState('');
  const [threeDSOrderId, setThreeDSOrderId] = useState('');

  // Route'dan gelen parametreleri al
  const routeTotal = route?.params?.cartTotal;
  const routeSubtotal = route?.params?.subtotal;
  const routeShipping = route?.params?.shipping;
  const routeHasFreeShipping = route?.params?.hasFreeShipping;

  useEffect(() => {
    loadPaymentData();
    checkNFCAvailability();
    loadCartItems();
  }, []);

  // Sepet ürünlerini yükle
  const loadCartItems = async () => {
    try {
      const storedUserId = await secureStorage.getItem('userId');
      if (!storedUserId) return;

      const cartResponse = await cartAPI.get(storedUserId);
      if (cartResponse.data?.success) {
        const cartData = cartResponse.data.cart || cartResponse.data.data || [];
        setCartItems(Array.isArray(cartData) ? cartData : []);
      }
    } catch (error) {
      console.error('Sepet yükleme hatası:', error);
      setCartItems([]);
    }
  };

  // NFC animasyonu
  useEffect(() => {
    if (isReadingCard) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(nfcAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(nfcAnimation, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      nfcAnimation.setValue(0);
    }
  }, [isReadingCard]);

  // NFC desteğini kontrol et
  const checkNFCAvailability = async () => {
    try {
      const available = await isNFCAvailable();
      setNfcAvailable(available);
    } catch (error) {
      console.log('NFC kontrolü:', error.message);
      setNfcAvailable(false);
    }
  };

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      
      if (!storedUserId) {
        alert.show('Hata', 'Lütfen giriş yapın');
        navigation.navigate('Login');
        return;
      }

      setUserId(storedUserId);

      // Önce route'dan gelen değerleri kullan
      if (routeTotal !== undefined && routeSubtotal !== undefined) {
        console.log('Route\'dan gelen değerler kullanılıyor:', {
          total: routeTotal,
          subtotal: routeSubtotal,
          shipping: routeShipping
        });
        setCartTotal(routeTotal);
        setSubtotal(routeSubtotal);
        setShipping(routeShipping || 0);
      } else {
        // Route'dan değer yoksa API'den çek
        console.log('API\'den sepet verisi çekiliyor...');
        const cartResponse = await cartAPI.get(storedUserId);
        if (cartResponse.data?.success) {
          const cartData = cartResponse.data.cart || cartResponse.data.data || [];
          if (Array.isArray(cartData) && cartData.length > 0) {
            // Kargo ayarlarını yükle
            let freeShippingLimit = 600;
            let shippingCost = 30;
            try {
              const API_BASE_URL = 'https://api.huglutekstil.com/api';
              const shippingResponse = await fetch(`${API_BASE_URL}/settings/public/shipping`);
              const shippingData = await shippingResponse.json();
              if (shippingData.success && shippingData.data) {
                freeShippingLimit = shippingData.data.freeShippingLimit || 600;
                shippingCost = shippingData.data.shippingCost || 30;
              }
            } catch (error) {
              console.error('Kargo ayarları yüklenemedi:', error);
            }
            
            const FREE_SHIPPING_LIMIT = freeShippingLimit;
            const calculatedSubtotal = cartData.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 1)), 0);
            const calculatedShipping = calculatedSubtotal >= FREE_SHIPPING_LIMIT ? 0 : shippingCost;
            const calculatedTotal = calculatedSubtotal + calculatedShipping;
            
            setSubtotal(calculatedSubtotal);
            setShipping(calculatedShipping);
            setCartTotal(calculatedTotal);
            
            console.log('API\'den hesaplanan değerler:', {
              subtotal: calculatedSubtotal,
              shipping: calculatedShipping,
              total: calculatedTotal,
              itemCount: cartData.length
            });
          } else {
            console.warn('⚠️ Sepet boş veya geçersiz format');
            alert.show('Hata', 'Sepetinizde ürün bulunmuyor');
            navigation.goBack();
          }
        }
      }

      // Cüzdan bakiyesini al
      try {
        const walletResponse = await walletAPI.getBalance(storedUserId);
        console.log('💳 Cüzdan bakiyesi yanıtı:', JSON.stringify(walletResponse.data, null, 2));
        
        if (walletResponse.data?.success) {
          // Backend response: { success: true, data: { balance: ... } }
          const balanceValue = walletResponse.data.data?.balance ?? 0;
          const parsedBalance = parseFloat(balanceValue) || 0;
          setWalletBalance(parsedBalance);
          console.log('✅ Cüzdan bakiyesi yüklendi:', parsedBalance);
        } else {
          console.log('⚠️ Cüzdan bakiyesi success false:', walletResponse.data);
          setWalletBalance(0);
        }
      } catch (walletError) {
        console.error('❌ Cüzdan bakiyesi alınamadı:', walletError);
        console.error('❌ Error details:', walletError.response?.data || walletError.message);
        setWalletBalance(0);
      }
    } catch (error) {
      console.error('Ödeme verileri yükleme hatası:', error);
      alert.show('Hata', 'Ödeme bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Kredi kartı ile ödeme işlemi
  const handleCardPayment = async () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('💳 ÖDEME İŞLEMİ BAŞLATILIYOR');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📅 Zaman:', new Date().toISOString());
    console.log('👤 UserId:', userId);
    console.log('💰 Toplam Tutar:', cartTotal);
    console.log('💰 Ara Toplam:', subtotal);
    console.log('🚚 Kargo:', shipping);
    
    try {
      setProcessingPayment(true);

      if (!userId) {
        console.error('❌ ÖDEME HATASI: Kullanıcı ID bulunamadı');
        alert.show('Hata', 'Lütfen giriş yapın');
        navigation.navigate('Login');
        return;
      }

      console.log('🔍 Kart bilgileri doğrulanıyor...');
      
      // Kart bilgilerini doğrula
      const cleanCardNumber = cardNumber.replace(/\s/g, '');
      console.log('💳 Kart Numarası:', cleanCardNumber ? '****' + cleanCardNumber.slice(-4) : 'EKSİK');
      console.log('👤 Kart Üzerindeki İsim:', cardName ? cardName.substring(0, 3) + '***' : 'EKSİK');
      console.log('📅 Son Kullanma:', expiryDate || 'EKSİK');
      console.log('🔐 CVV:', cvv ? '***' : 'EKSİK');
      
      if (!cleanCardNumber || cleanCardNumber.length < 16) {
        console.error('❌ ÖDEME HATASI: Geçersiz kart numarası');
        alert.show('Hata', 'Lütfen geçerli bir kart numarası girin');
        setProcessingPayment(false);
        return;
      }
      if (!cardName || cardName.trim().length < 3) {
        console.error('❌ ÖDEME HATASI: Geçersiz kart üzerindeki isim');
        alert.show('Hata', 'Lütfen kart üzerindeki ismi girin');
        setProcessingPayment(false);
        return;
      }
      if (!expiryDate || expiryDate.length < 5) {
        console.error('❌ ÖDEME HATASI: Geçersiz son kullanma tarihi');
        alert.show('Hata', 'Lütfen son kullanma tarihini girin (AA/YY)');
        setProcessingPayment(false);
        return;
      }
      if (!cvv || cvv.length < 3) {
        console.error('❌ ÖDEME HATASI: Geçersiz CVV');
        alert.show('Hata', 'Lütfen CVV kodunu girin');
        setProcessingPayment(false);
        return;
      }
      
      console.log('✅ Kart bilgileri doğrulandı');

      // GÜVENLİK: Kart bilgilerini cihazda saklama, direkt backend'e gönderilecek
      // PCI-DSS uyumluluğu için kart bilgileri hiçbir şekilde cihazda saklanmamalı

      // Sepet verilerini çek
      console.log('🛒 Sepet verileri çekiliyor...');
      const cartResponse = await cartAPI.get(userId);
      const cartData = cartResponse.data?.cart || cartResponse.data?.data || [];
      
      console.log('🛒 Sepet yanıtı:', {
        success: cartResponse.data?.success,
        itemCount: Array.isArray(cartData) ? cartData.length : 0
      });
      
      if (!cartResponse.data?.success || !Array.isArray(cartData) || cartData.length === 0) {
        console.error('❌ ÖDEME HATASI: Sepet boş veya geçersiz:', {
          success: cartResponse.data?.success,
          cart: cartResponse.data?.cart,
          data: cartResponse.data?.data,
          cartLength: Array.isArray(cartData) ? cartData.length : 'not array'
        });
        alert.show('Hata', 'Sepetinizde ürün bulunmuyor');
        setProcessingPayment(false);
        return;
      }
      
      console.log('✅ Sepet doğrulandı:', cartData.length, 'ürün');
      
      // Müşteri bilgilerini çek
      console.log('👤 Müşteri bilgileri çekiliyor...');
      let customerInfo = {
        name: '',
        surname: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        zipCode: ''
      };

      try {
        const userResponse = await userAPI.getProfile(parseInt(userId));
        if (userResponse.data?.success) {
          const user = userResponse.data.data || userResponse.data.user || {};
          const fullName = (user.name || '').split(' ');
          customerInfo.name = fullName[0] || 'John';
          customerInfo.surname = fullName.slice(1).join(' ') || 'Doe';
          customerInfo.email = user.email || 'test@test.com';
          customerInfo.phone = user.phone || '+905555555555';
          customerInfo.address = user.address || '';
          customerInfo.city = user.city || 'Istanbul';
          customerInfo.zipCode = user.zipCode || '34000';
          
          console.log('✅ Müşteri bilgileri alındı:', {
            name: customerInfo.name + ' ' + customerInfo.surname,
            email: customerInfo.email,
            city: customerInfo.city,
            hasAddress: !!customerInfo.address
          });
        }
      } catch (userError) {
        console.warn('⚠️ Müşteri bilgileri alınamadı:', userError);
      }

      // Sipariş oluştur (pending durumunda)
      console.log('📦 Sipariş oluşturuluyor...');
      const orderData = {
        userId: parseInt(userId),
        totalAmount: cartTotal,
        status: 'pending',
        shippingAddress: customerInfo.address || 'Adres bilgisi eksik',
        paymentMethod: 'card',
        deliveryMethod: 'shipping',
        city: customerInfo.city,
        district: '',
        fullAddress: customerInfo.address,
        customerName: `${customerInfo.name} ${customerInfo.surname}`,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        items: cartData.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          productName: item.productName || item.name || null,
          productDescription: item.productDescription || item.description || null,
          productCategory: item.productCategory || item.category || null,
          productBrand: item.productBrand || item.brand || null,
          productImage: item.productImage || item.image || null,
          selectedVariations: typeof item.selectedVariations === 'string' 
            ? item.selectedVariations 
            : (item.selectedVariations ? JSON.stringify(item.selectedVariations) : null)
        }))
      };

      console.log('📦 Sipariş verisi:', {
        userId: orderData.userId,
        totalAmount: orderData.totalAmount,
        itemCount: orderData.items.length,
        customerName: orderData.customerName
      });
      
      const orderResponse = await ordersAPI.create(orderData);
      
      console.log('📦 Sipariş oluşturma yanıtı:', {
        success: orderResponse.data?.success,
        orderId: orderResponse.data?.data?.orderId || orderResponse.data?.orderId
      });
      
      if (!orderResponse.data?.success) {
        console.error('❌ ÖDEME HATASI: Sipariş oluşturulamadı:', orderResponse.data?.message);
        // GÜVENLİK: Kart bilgileri cihazda saklanmadı, temizleme gerekmez
        alert.show('Hata', orderResponse.data?.message || 'Sipariş oluşturulamadı');
        setProcessingPayment(false);
        return;
      }

      const orderId = orderResponse.data.data?.orderId || orderResponse.data.orderId;
      console.log('✅ Sipariş oluşturuldu - OrderId:', orderId);

      // Son kullanma tarihini parse et (MM/YY formatından)
      const [expireMonth, expireYear] = expiryDate.split('/');
      const fullExpireYear = '20' + expireYear; // YY -> YYYY

      console.log('📅 Kart son kullanma tarihi parse edildi:', {
        expireMonth,
        expireYear,
        fullExpireYear
      });

      // İyzico ödeme isteği hazırla
      console.log('💳 İyzico ödeme isteği hazırlanıyor...');
      const paymentRequest = {
        orderId: orderId,
        paymentCard: {
          cardHolderName: cardName.trim(),
          cardNumber: cleanCardNumber,
          expireMonth: expireMonth,
          expireYear: fullExpireYear,
          cvc: cvv
        },
        buyer: {
          id: parseInt(userId),
          name: customerInfo.name,
          surname: customerInfo.surname,
          gsmNumber: customerInfo.phone,
          email: customerInfo.email,
          identityNumber: '11111111111', // Varsayılan TCKN
          registrationAddress: customerInfo.address,
          ip: '127.0.0.1', // Mobile app için varsayılan IP
          city: customerInfo.city,
          country: 'Turkey',
          zipCode: customerInfo.zipCode
        },
        shippingAddress: {
          contactName: `${customerInfo.name} ${customerInfo.surname}`,
          city: customerInfo.city,
          country: 'Turkey',
          address: customerInfo.address,
          zipCode: customerInfo.zipCode
        },
        billingAddress: {
          contactName: `${customerInfo.name} ${customerInfo.surname}`,
          city: customerInfo.city,
          country: 'Turkey',
          address: customerInfo.address,
          zipCode: customerInfo.zipCode
        }
      };

      console.log('📤 İyzico ödeme isteği gönderiliyor...');
      console.log('📋 Ödeme isteği detayları:', {
        orderId: paymentRequest.orderId,
        buyerId: paymentRequest.buyer.id,
        buyerName: paymentRequest.buyer.name + ' ' + paymentRequest.buyer.surname,
        buyerEmail: paymentRequest.buyer.email,
        cardLast4: '****' + cleanCardNumber.slice(-4),
        expireMonth: paymentRequest.paymentCard.expireMonth,
        expireYear: paymentRequest.paymentCard.expireYear,
        shippingCity: paymentRequest.shippingAddress.city,
        billingCity: paymentRequest.billingAddress.city
      });
      
      const paymentResponse = await paymentAPI.process(paymentRequest);
      
      console.log('📥 İyzico ödeme yanıtı alındı:', {
        success: paymentResponse.data?.success,
        requires3DS: paymentResponse.data?.requires3DS,
        hasThreeDSHtmlContent: !!paymentResponse.data?.threeDSHtmlContent,
        conversationId: paymentResponse.data?.conversationId,
        paymentId: paymentResponse.data?.data?.paymentId
      });

      // GÜVENLİK: Kart bilgileri zaten cihazda saklanmadı, temizleme gerekmez
      console.log('✅ Ödeme işlemi tamamlandı');

      if (paymentResponse.data?.success) {
        // 3D Secure kontrolü
        if (paymentResponse.data?.requires3DS && paymentResponse.data?.threeDSHtmlContent) {
          console.log('═══════════════════════════════════════════════════════');
          console.log('🔐 3D SECURE GEREKİYOR');
          console.log('═══════════════════════════════════════════════════════');
          console.log('📋 ConversationId:', paymentResponse.data.conversationId);
          console.log('💳 PaymentId:', paymentResponse.data.paymentId);
          console.log('📄 HTML Content Length:', paymentResponse.data.threeDSHtmlContent?.length || 0);
          console.log('🌐 WebView açılıyor...');
          
          setThreeDSHtmlContent(paymentResponse.data.threeDSHtmlContent);
          setThreeDSConversationId(paymentResponse.data.conversationId || '');
          setThreeDSOrderId(orderId);
          setShow3DSModal(true);
          setProcessingPayment(false);
          return;
        }

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ ÖDEME BAŞARILI (3DS GEREKMEDİ)');
        console.log('═══════════════════════════════════════════════════════');
        console.log('💳 PaymentId:', paymentResponse.data.data?.paymentId);
        console.log('📦 OrderId:', orderId);
        console.log('💰 Tutar:', cartTotal);
        
        // OrderConfirmationScreen'e yönlendir
        navigation.navigate('OrderConfirmation', {
          paymentMethod: 'card',
          total: cartTotal,
          subtotal: subtotal,
          shipping: shipping,
          orderId: orderId,
          paymentId: paymentResponse.data.data?.paymentId,
          cartItems: cartData, // Sepet ürünlerini gönder
          cardInfo: {
            last4: paymentResponse.data.data?.cardInfo?.lastFourDigits || cleanCardNumber.slice(-4),
            cardType: paymentResponse.data.data?.cardInfo?.cardType || 'Unknown'
          },
          paymentCompleted: true // Ödeme zaten yapıldığını belirt
        });
      } else {
        // Ödeme başarısız - hata mesajını kullanıcı dostu hale getir
        console.log('═══════════════════════════════════════════════════════');
        console.log('❌ ÖDEME BAŞARISIZ');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📋 Hata Detayları:', {
          message: paymentResponse.data?.message,
          error: paymentResponse.data?.error,
          errorCode: paymentResponse.data?.errorCode,
          errorGroup: paymentResponse.data?.errorGroup,
          status: paymentResponse.status,
          statusText: paymentResponse.statusText
        });
        
        let errorMessage = paymentResponse.data?.message || 'Ödeme işlemi başarısız oldu';
        
        // İyzico hata mesajlarını Türkçe'ye çevir
        const errorTranslations = {
          'Card number is invalid': 'Kart numarası geçersiz',
          'Expiry date is invalid': 'Son kullanma tarihi geçersiz',
          'CVC is invalid': 'Güvenlik kodu (CVV) geçersiz',
          'Insufficient funds': 'Kartınızda yeterli bakiye bulunmamaktadır',
          'Card is blocked': 'Kartınız bloke edilmiş',
          'Transaction not permitted': 'İşlem izni verilmedi',
          'Invalid request': 'Geçersiz istek',
          'General error': 'Genel hata',
          'Payment failed': 'Ödeme başarısız',
          'PAYMENT_ERROR': 'Ödeme işlemi sırasında bir hata oluştu',
          'PAYMENT_FAILED': 'Ödeme reddedildi'
        };

        // Hata mesajını çevir
        Object.keys(errorTranslations).forEach(key => {
          if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
            errorMessage = errorTranslations[key];
          }
        });

        console.log('📢 Kullanıcıya gösterilecek hata mesajı:', errorMessage);
        alert.show('Ödeme Hatası', errorMessage);
        setProcessingPayment(false);
      }

    } catch (error) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('❌ ÖDEME İŞLEMİ HATASI (EXCEPTION)');
      console.log('═══════════════════════════════════════════════════════');
      console.error('📋 Hata Detayları:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        stack: error.stack
      });
      
      // GÜVENLİK: Kart bilgileri cihazda saklanmadı, temizleme gerekmez

      // Hata mesajını göster ve kullanıcı dostu hale getir
      let errorMessage = 'Ödeme işlemi sırasında bir hata oluştu';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // İyzico hata mesajlarını Türkçe'ye çevir
      const errorTranslations = {
        'Card number is invalid': 'Kart numarası geçersiz',
        'Expiry date is invalid': 'Son kullanma tarihi geçersiz',
        'CVC is invalid': 'Güvenlik kodu (CVV) geçersiz',
        'Insufficient funds': 'Kartınızda yeterli bakiye bulunmamaktadır',
        'Card is blocked': 'Kartınız bloke edilmiş',
        'Transaction not permitted': 'İşlem izni verilmedi',
        'Invalid request': 'Geçersiz istek',
        'General error': 'Genel hata',
        'Payment failed': 'Ödeme başarısız',
        'Network Error': 'İnternet bağlantınızı kontrol edin',
        'timeout': 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin',
        'ECONNABORTED': 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin'
      };

      // Hata mesajını çevir
      Object.keys(errorTranslations).forEach(key => {
        if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
          errorMessage = errorTranslations[key];
        }
      });

      // Network hataları için özel mesaj
      if (!error.response && error.message) {
        if (error.message.includes('Network') || error.message.includes('timeout')) {
          errorMessage = 'İnternet bağlantınızı kontrol edin ve tekrar deneyin';
        }
      }
      
      alert.show('Hata', errorMessage);
      setProcessingPayment(false);
    }
  };

  // 3D Secure callback işleme
  const handle3DSCallback = async () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔄 3DS CALLBACK İŞLENİYOR');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 ConversationId:', threeDSConversationId);
    console.log('📦 OrderId:', threeDSOrderId);
    console.log('📅 Zaman:', new Date().toISOString());
    
    try {
      setProcessingPayment(true);
      
      // Kısa bir gecikme - callback'in tamamlanması için
      console.log('⏳ Callback tamamlanması bekleniyor (2 saniye)...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Ödeme durumunu kontrol et
      if (threeDSOrderId) {
        console.log('🔍 Sipariş durumu kontrol ediliyor...');
        try {
          const orderResponse = await ordersAPI.getById(threeDSOrderId);
          console.log('📦 Sipariş durumu yanıtı:', {
            success: orderResponse.data?.success,
            status: orderResponse.data?.data?.status || orderResponse.data?.order?.status,
            paymentStatus: orderResponse.data?.data?.paymentStatus || orderResponse.data?.order?.paymentStatus
          });
          
          if (orderResponse.data?.success) {
            const order = orderResponse.data.data || orderResponse.data.order;
            
            if (order.status === 'paid' || order.paymentStatus === 'completed') {
              console.log('═══════════════════════════════════════════════════════');
              console.log('✅ 3DS ÖDEME BAŞARILI');
              console.log('═══════════════════════════════════════════════════════');
              console.log('📦 OrderId:', threeDSOrderId);
              console.log('💰 Tutar:', cartTotal);
              console.log('💳 PaymentId:', order.paymentId);
              
              setShow3DSModal(false);
              setThreeDSHtmlContent('');
              
              // OrderConfirmationScreen'e yönlendir
              navigation.navigate('OrderConfirmation', {
                paymentMethod: 'card',
                total: cartTotal,
                subtotal: subtotal,
                shipping: shipping,
                orderId: threeDSOrderId,
                cartItems: cartItems,
                paymentCompleted: true
              });
              return;
            } else {
              console.warn('⚠️ Sipariş durumu henüz güncellenmemiş:', {
                status: order.status,
                paymentStatus: order.paymentStatus
              });
            }
          }
        } catch (orderError) {
          console.error('❌ Sipariş kontrolü hatası:', orderError);
        }
      }
      
      // Eğer ödeme durumu belirlenemezse, kullanıcıya bilgi ver
      console.log('ℹ️ Ödeme durumu kontrol edilemedi, kullanıcıya bilgi veriliyor...');
      alert.show('Bilgi', '3D Secure doğrulaması tamamlandı. Ödeme durumunuz kontrol ediliyor...');
      setShow3DSModal(false);
      setThreeDSHtmlContent('');
      
    } catch (error) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('❌ 3DS CALLBACK İŞLEME HATASI');
      console.log('═══════════════════════════════════════════════════════');
      console.error('📋 Hata Detayları:', {
        message: error.message,
        stack: error.stack,
        orderId: threeDSOrderId
      });
      
      alert.show('Hata', '3D Secure işlemi sırasında bir hata oluştu');
      setShow3DSModal(false);
      setThreeDSHtmlContent('');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Temassız ödeme işlemi
  const handleContactlessPayment = async () => {
    try {
      if (!nfcAvailable) {
        alert.show(
          'NFC Desteklenmiyor',
          'Bu cihaz NFC özelliğini desteklemiyor. Lütfen kart bilgilerinizi manuel olarak girin.'
        );
        return;
      }

      setIsReadingCard(true);
      setNfcModalVisible(true);

      // Kartı oku
      const cardData = await readContactlessCard();

      // Kart bilgilerini form alanlarına doldur
      setCardNumber(cardData.cardNumber);
      setCardName(cardData.cardName || 'TEMASSIZ KART');
      setExpiryDate(cardData.expiryDate);

      // Modal'ı kapat
      setNfcModalVisible(false);
      setIsReadingCard(false);

      alert.show(
        'Kart Okundu',
        'Kart bilgileriniz başarıyla okundu. CVV kodunu girmeniz gerekmektedir.',
        [{ text: 'Tamam' }]
      );
    } catch (error) {
      console.error('Temassız ödeme hatası:', error);
      setNfcModalVisible(false);
      setIsReadingCard(false);
      
      alert.show(
        'Hata',
        error.message || 'Kart okunamadı. Lütfen tekrar deneyin veya kart bilgilerinizi manuel olarak girin.'
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ödeme Yöntemi</Text>
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
        <Text style={styles.headerTitle}>Ödeme Yöntemi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Credit/Debit Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kredi/Banka Kartı</Text>

          <TouchableOpacity
            style={[
              styles.paymentCard,
              selectedPayment === 'new_card' && styles.paymentCardSelected,
            ]}
            onPress={() => setSelectedPayment('new_card')}
          >
            <View style={[
              styles.radioButton,
              selectedPayment === 'new_card' && styles.radioButtonSelected
            ]}>
              {selectedPayment === 'new_card' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.cardIcon}>
              <Ionicons name="card-outline" size={24} color={COLORS.textMain} />
            </View>
            <View style={styles.cardDetails}>
              <Text style={styles.cardType}>Kredi/Banka Kartı ile Öde</Text>
              <Text style={styles.cardExpiry}>Güvenli ödeme</Text>
            </View>
          </TouchableOpacity>

          {selectedPayment === 'new_card' && (
            <View style={styles.cardForm}>
              <View style={styles.cardFormHeader}>
                <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
                <Text style={styles.cardFormTitle}>Kart Bilgileriniz</Text>
              </View>

              {/* Kart Numarası */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kart Numarası</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={COLORS.gray400}
                  value={cardNumber}
                  onChangeText={(text) => {
                    // Sadece rakam ve boşluk
                    const formatted = text.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                    setCardNumber(formatted.slice(0, 19)); // Max 16 digit + 3 space
                  }}
                  keyboardType="numeric"
                  maxLength={19}
                />
              </View>

              {/* Kart Üzerindeki İsim */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kart Üzerindeki İsim</Text>
                <TextInput
                  style={styles.input}
                  placeholder="AD SOYAD"
                  placeholderTextColor={COLORS.gray400}
                  value={cardName}
                  onChangeText={setCardName}
                  autoCapitalize="characters"
                />
              </View>

              {/* Son Kullanma ve CVV */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Son Kullanma</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="AA/YY"
                    placeholderTextColor={COLORS.gray400}
                    value={expiryDate}
                    onChangeText={(text) => {
                      // Format: MM/YY
                      const cleaned = text.replace(/\D/g, '');
                      if (cleaned.length >= 2) {
                        setExpiryDate(cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4));
                      } else {
                        setExpiryDate(cleaned);
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    placeholderTextColor={COLORS.gray400}
                    value={cvv}
                    onChangeText={(text) => setCvv(text.replace(/\D/g, '').slice(0, 3))}
                    keyboardType="numeric"
                    maxLength={3}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Temassız Ödeme Butonu */}
              {nfcAvailable && (
                <TouchableOpacity
                  style={styles.contactlessButton}
                  onPress={handleContactlessPayment}
                  disabled={isReadingCard}
                >
                  <View style={styles.contactlessButtonContent}>
                    <Ionicons 
                      name="radio-outline" 
                      size={24} 
                      color={COLORS.primary} 
                      style={styles.contactlessIcon}
                    />
                    <View style={styles.contactlessTextContainer}>
                      <Text style={styles.contactlessButtonText}>
                        {isReadingCard ? 'Kart Okunuyor...' : 'Temassız Ödeme'}
                      </Text>
                      <Text style={styles.contactlessButtonSubtext}>
                        Kartınızı telefonun arkasına yaklaştırın
                      </Text>
                    </View>
                    {isReadingCard && (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {/* Güvenlik Bilgisi */}
              <View style={styles.securityBanner}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                <Text style={styles.securityText}>
                  Kart bilgileriniz 256-bit SSL ile şifrelenir
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Bank Transfer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Banka Havalesi / EFT</Text>

          <TouchableOpacity
            style={[
              styles.walletOption,
              selectedPayment === 'bank_transfer' && styles.paymentCardSelected,
            ]}
            onPress={() => setSelectedPayment('bank_transfer')}
          >
            <View style={styles.walletContent}>
              <View style={[styles.walletIcon, styles.bankIcon]}>
                <Ionicons name="business-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletText}>Banka Havalesi / EFT</Text>
                <Text style={styles.walletSubtext}>Huğlu Av Tüfekleri Kooperatifi</Text>
              </View>
            </View>
            <View style={styles.radioButton}>
              {selectedPayment === 'bank_transfer' && <View style={styles.radioButtonInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Digital Wallets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dijital Cüzdanlar</Text>

          <TouchableOpacity
            style={[
              styles.walletOption,
              selectedPayment === 'hpay' && styles.paymentCardSelected,
            ]}
            onPress={() => setSelectedPayment('hpay')}
          >
            <View style={styles.walletContent}>
              <View style={[styles.walletIcon, styles.hpayIcon]}>
                <Text style={styles.hpayText}>H</Text>
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletText}>Hpay</Text>
                <Text style={styles.walletSubtext}>Hızlı ve güvenli ödeme</Text>
              </View>
            </View>
            <View style={[
              styles.radioButton,
              selectedPayment === 'hpay' && styles.radioButtonSelected
            ]}>
              {selectedPayment === 'hpay' && <View style={styles.radioButtonInner} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.walletOption,
              selectedPayment === 'wallet' && styles.paymentCardSelected,
              walletBalance < cartTotal && styles.walletOptionDisabled,
            ]}
            onPress={() => {
              if (walletBalance >= cartTotal) {
                setSelectedPayment('wallet');
              } else {
                alert.show('Yetersiz Bakiye', 'Cüzdan bakiyeniz bu ödeme için yeterli değil');
              }
            }}
            disabled={walletBalance < cartTotal}
          >
            <View style={styles.walletContent}>
              <View style={[styles.walletIcon, styles.walletIconBg]}>
                <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletText}>Cüzdan</Text>
                <Text style={[
                  styles.walletBalance,
                  walletBalance < cartTotal && styles.walletBalanceInsufficient
                ]}>
                  Bakiye: ₺{walletBalance.toFixed(2)}
                </Text>
              </View>
            </View>
            <View style={[
              styles.radioButton,
              selectedPayment === 'wallet' && styles.radioButtonSelected
            ]}>
              {selectedPayment === 'wallet' && <View style={styles.radioButtonInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Trust Badge */}
        <View style={styles.trustBadge}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.gray400} />
          <Text style={styles.trustText}>Ödemeler güvenli ve şifrelidir</Text>
        </View>
      </ScrollView>

      {/* NFC Okuma Modal */}
      <Modal
        visible={nfcModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setNfcModalVisible(false);
          setIsReadingCard(false);
        }}
      >
        <View style={styles.nfcModalContainer}>
          <View style={styles.nfcModalContent}>
            <Animated.View
              style={[
                styles.nfcIconContainer,
                {
                  transform: [
                    {
                      scale: nfcAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.2],
                      }),
                    },
                  ],
                  opacity: nfcAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 0.5, 1],
                  }),
                },
              ]}
            >
              <Ionicons name="radio" size={80} color={COLORS.primary} />
            </Animated.View>
            <Text style={styles.nfcModalTitle}>Kartınızı Okutun</Text>
            <Text style={styles.nfcModalText}>
              Kartınızı telefonun arkasına yaklaştırın ve bekleyin
            </Text>
            <TouchableOpacity
              style={styles.nfcCancelButton}
              onPress={() => {
                setNfcModalVisible(false);
                setIsReadingCard(false);
              }}
            >
              <Text style={styles.nfcCancelButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3D Secure Modal */}
      <Modal
        visible={show3DSModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          setShow3DSModal(false);
          setThreeDSHtmlContent('');
        }}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.threeDSHeader}>
            <TouchableOpacity
              onPress={() => {
                setShow3DSModal(false);
                setThreeDSHtmlContent('');
                setProcessingPayment(false);
              }}
              style={styles.threeDSCloseButton}
            >
              <Ionicons name="close" size={24} color={COLORS.textMain} />
            </TouchableOpacity>
            <Text style={styles.threeDSTitle}>3D Secure Doğrulama</Text>
            <View style={{ width: 40 }} />
          </View>
          
          {threeDSHtmlContent ? (
            WebView ? (
              <WebView
                source={{ html: threeDSHtmlContent }}
                style={styles.webView}
                originWhitelist={['*']}
                mixedContentMode="always"
                thirdPartyCookiesEnabled={true}
                sharedCookiesEnabled={true}
                onNavigationStateChange={(navState) => {
                  console.log('🌐 3DS WebView Navigation:', {
                    url: navState.url,
                    title: navState.title,
                    loading: navState.loading,
                    canGoBack: navState.canGoBack
                  });
                  
                  // Callback URL'e yönlendirme kontrolü
                  if (navState.url && navState.url.includes('/api/payments/3ds-callback')) {
                    console.log('═══════════════════════════════════════════════════════');
                    console.log('✅ 3DS CALLBACK URL\'YE YÖNLENDİRİLDİ');
                    console.log('═══════════════════════════════════════════════════════');
                    console.log('🔗 Callback URL:', navState.url);
                    console.log('📅 Zaman:', new Date().toISOString());
                    // Callback'ten sonra ödeme durumunu kontrol et
                    handle3DSCallback();
                  }
                }}
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === 'PAYMENT_SUCCESS') {
                      console.log('✅ 3DS Payment Success:', data);
                      handle3DSCallback();
                    } else if (data.type === 'PAYMENT_FAILED') {
                      console.error('❌ 3DS Payment Failed:', data);
                      alert.show('Hata', data.message || '3D Secure doğrulaması başarısız');
                      setShow3DSModal(false);
                      setThreeDSHtmlContent('');
                      setProcessingPayment(false);
                    }
                  } catch (e) {
                    console.log('📨 WebView message (non-JSON):', event.nativeEvent.data);
                  }
                }}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('❌ WebView hatası:', nativeEvent);
                  alert.show('Hata', '3D Secure sayfası yüklenirken bir hata oluştu');
                }}
                onHttpError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('❌ WebView HTTP hatası:', nativeEvent);
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.webViewLoading}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.webViewLoadingText}>3D Secure sayfası yükleniyor...</Text>
                  </View>
                )}
              />
            ) : (
              <View style={styles.webViewLoading}>
                <Ionicons name="warning-outline" size={48} color={COLORS.warning || '#FFA500'} />
                <Text style={[styles.webViewLoadingText, { marginTop: 16, textAlign: 'center' }]}>
                  WebView modülü yüklenemedi
                </Text>
                <Text style={[styles.webViewLoadingText, { marginTop: 8, fontSize: 14, textAlign: 'center', color: COLORS.textSecondary }]}>
                  Development build gerekiyor. Expo Go'da WebView çalışmaz.
                </Text>
                <TouchableOpacity
                  style={{ marginTop: 20, padding: 12, backgroundColor: COLORS.primary, borderRadius: 8 }}
                  onPress={() => {
                    setShow3DSModal(false);
                    setThreeDSHtmlContent('');
                    setProcessingPayment(false);
                  }}
                >
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>Kapat</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.webViewLoadingText}>Yükleniyor...</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Bottom Bar */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Ödenecek Tutar</Text>
              <Text style={styles.totalAmount}>₺{cartTotal.toFixed(2)}</Text>
            </View>
            <Button
              title={processingPayment ? 'İşleniyor...' : `₺${cartTotal.toFixed(2)} Öde`}
              onPress={async () => {
                // Kart ile ödeme seçiliyse iyzico ödeme işlemini başlat
                if (selectedPayment === 'new_card') {
                  await handleCardPayment();
                  return;
                }

                // Diğer ödeme yöntemleri için eski akışı kullan
                console.log('OrderConfirmation\'a gönderilen veriler:', {
                  paymentMethod: selectedPayment,
                  total: cartTotal,
                  subtotal: subtotal,
                  shipping: shipping,
                });
                
                navigation.navigate('OrderConfirmation', { 
                  paymentMethod: selectedPayment,
                  total: cartTotal,
                  subtotal: subtotal,
                  shipping: shipping,
                });
              }}
              disabled={processingPayment}
            />
          </>
        )}
      </SafeAreaView>
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    gap: 16,
  },
  paymentCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDetails: {
    flex: 1,
  },
  cardType: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  cardExpiry: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  cardForm: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  cardFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardFormTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.textMain,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(17, 212, 33, 0.08)',
    borderRadius: 8,
    marginTop: 8,
  },
  securityText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  walletContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  walletIcon: {
    width: 48,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hpayIcon: {
    backgroundColor: COLORS.primary,
  },
  hpayText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  walletIconBg: {
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
  },
  bankIcon: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  walletInfo: {
    flex: 1,
  },
  walletText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  walletSubtext: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },
  walletBalance: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
  },
  walletBalanceInsufficient: {
    color: COLORS.error || '#EF4444',
  },
  walletOptionDisabled: {
    opacity: 0.5,
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
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  // Temassız Ödeme Stilleri
  contactlessButton: {
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  contactlessButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactlessIcon: {
    transform: [{ rotate: '45deg' }],
  },
  contactlessTextContainer: {
    flex: 1,
  },
  contactlessButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  contactlessButtonSubtext: {
    fontSize: 12,
    color: COLORS.gray600,
  },
  // NFC Modal Stilleri
  nfcModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  nfcModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
  },
  nfcIconContainer: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 100,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
  },
  nfcModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
    textAlign: 'center',
  },
  nfcModalText: {
    fontSize: 16,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  nfcCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
  },
  nfcCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  // 3D Secure Modal Styles
  threeDSHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    backgroundColor: COLORS.white,
  },
  threeDSCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  threeDSTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  webView: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  webViewLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  webViewLoadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
