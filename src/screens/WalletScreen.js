import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput, Linking } from 'react-native';
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
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { walletAPI, userAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

export default function WalletScreen({ navigation }) {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [points, setPoints] = useState(0);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [cardModalAmount, setCardModalAmount] = useState(null); // Modal için tutar
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // B2B Kredi state'leri
  const [isB2BMode, setIsB2BMode] = useState(false);
  const [creditLimit, setCreditLimit] = useState(0);
  const [usedCredit, setUsedCredit] = useState(0);
  const [availableCredit, setAvailableCredit] = useState(0);
  const [creditApplicationStatus, setCreditApplicationStatus] = useState(null); // null, 'pending', 'approved', 'rejected'
  const [showCreditApplicationModal, setShowCreditApplicationModal] = useState(false);
  const [requestedCreditAmount, setRequestedCreditAmount] = useState('');
  
  // 3D Secure durumları
  const [show3DSModal, setShow3DSModal] = useState(false);
  const [threeDSHtmlContent, setThreeDSHtmlContent] = useState('');
  const [threeDSRequestId, setThreeDSRequestId] = useState('');

  useEffect(() => {
    loadWalletData();
    loadB2BMode();
  }, []);

  const loadB2BMode = async () => {
    try {
      const userId = await secureStorage.getItem('userId');
      const b2bMode = await secureStorage.getItem('isB2BMode');
      
      // Giriş yapılmamışsa B2B modunu devre dışı bırak
      if (!userId) {
        setIsB2BMode(false);
        return;
      }
      
      setIsB2BMode(b2bMode === 'true');
      
      // B2B modundaysa kredi bilgilerini yükle
      if (b2bMode === 'true') {
        await loadCreditInfo();
      }
    } catch (error) {
      console.error('B2B modu yüklenemedi:', error);
      setIsB2BMode(false);
    }
  };

  const loadCreditInfo = async () => {
    try {
      // Burada backend'den kredi bilgileri çekilecek
      // Şimdilik mock data kullanıyoruz
      const storedUserId = await secureStorage.getItem('userId');
      
      // Mock data - gerçek uygulamada API'den gelecek
      setCreditLimit(50000); // 50.000 TL kredi limiti
      setUsedCredit(15000); // 15.000 TL kullanılmış
      setAvailableCredit(35000); // 35.000 TL kullanılabilir
      setCreditApplicationStatus('approved'); // 'pending', 'approved', 'rejected', null
      
    } catch (error) {
      console.error('Kredi bilgileri yüklenemedi:', error);
    }
  };

  const handleCreditApplication = async () => {
    if (!requestedCreditAmount || parseFloat(requestedCreditAmount) <= 0) {
      alert.show('Hata', 'Lütfen geçerli bir kredi tutarı girin');
      return;
    }

    try {
      // Burada backend'e kredi başvurusu gönderilecek
      // Şimdilik mock işlem
      alert.show(
        'Başvuru Alındı',
        `${parseFloat(requestedCreditAmount).toLocaleString('tr-TR')} TL kredi başvurunuz alındı. En kısa sürede değerlendirilecektir.`
      );
      
      setCreditApplicationStatus('pending');
      setShowCreditApplicationModal(false);
      setRequestedCreditAmount('');
    } catch (error) {
      console.error('Kredi başvurusu hatası:', error);
      alert.show('Hata', 'Kredi başvurusu gönderilemedi');
    }
  };

  const handleRecharge = () => {
    setShowRechargeModal(true);
  };

  const processRecharge = async (amount) => {
    if (!amount || amount <= 0 || isNaN(amount)) {
      alert.show('Hata', 'Lütfen geçerli bir tutar seçin');
      return;
    }
    console.log('💰 Para yükleme başlatılıyor, tutar:', amount);
    const amountNum = parseFloat(amount);
    setSelectedAmount(amountNum);
    setCardModalAmount(amountNum); // Modal için tutarı ayrı state'te sakla
    setShowRechargeModal(false);
    // Modal açılmadan önce tutarın set edilmesi için kısa bir gecikme
    setTimeout(() => {
      setShowCardModal(true);
    }, 100);
  };

  // 3D Secure callback işleme
  const handle3DSCallback = async () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔄 3DS CALLBACK İŞLENİYOR (WALLET RECHARGE)');
    console.log('═══════════════════════════════════════════════════════');
    console.log('💳 RequestId:', threeDSRequestId);
    console.log('📅 Zaman:', new Date().toISOString());
    
    try {
      setProcessingPayment(true);
      
      // Kısa bir gecikme - callback'in tamamlanması için
      console.log('⏳ Callback tamamlanması bekleniyor (2 saniye)...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Cüzdan bakiyesini kontrol et ve yenile
      console.log('💰 Cüzdan bakiyesi kontrol ediliyor ve yenileniyor...');
      await loadWalletData();
      
      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ 3DS CÜZDAN YÜKLEME BAŞARILI');
      console.log('═══════════════════════════════════════════════════════');
      console.log('💳 RequestId:', threeDSRequestId);
      
      // Başarı mesajı göster
      alert.show('Başarılı', '3D Secure doğrulaması tamamlandı. Cüzdan bakiyeniz güncellendi.');
      setShow3DSModal(false);
      setThreeDSHtmlContent('');
      
    } catch (error) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('❌ 3DS CALLBACK İŞLEME HATASI (WALLET RECHARGE)');
      console.log('═══════════════════════════════════════════════════════');
      console.error('📋 Hata Detayları:', {
        message: error.message,
        stack: error.stack,
        requestId: threeDSRequestId
      });
      
      alert.show('Hata', '3D Secure işlemi sırasında bir hata oluştu');
      setShow3DSModal(false);
      setThreeDSHtmlContent('');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCardPayment = async () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('💳 CÜZDAN YÜKLEME İŞLEMİ BAŞLATILIYOR');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📅 Zaman:', new Date().toISOString());
    console.log('👤 UserId:', userId);
    
    // Modal'daki tutarı kullan (cardModalAmount)
    const amountToCharge = cardModalAmount || selectedAmount;
    
    console.log('💰 Tutar Bilgileri:', {
      modalTutari: cardModalAmount,
      secilenTutar: selectedAmount,
      kullanilacakTutar: amountToCharge
    });
    
    if (!amountToCharge || amountToCharge <= 0 || isNaN(amountToCharge)) {
      console.error('❌ CÜZDAN YÜKLEME HATASI: Geçersiz tutar:', amountToCharge);
      alert.show('Hata', `Lütfen geçerli bir tutar seçin. Mevcut tutar: ₺${amountToCharge || 0}`);
      return;
    }

    if (!userId) {
      console.error('❌ CÜZDAN YÜKLEME HATASI: Kullanıcı ID bulunamadı');
      alert.show('Hata', 'Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    try {
      setProcessingPayment(true);

      console.log('🔍 Kart bilgileri doğrulanıyor...');
      
      // Kart bilgilerini doğrula
      const cleanCardNumber = cardNumber.replace(/\s/g, '');
      console.log('💳 Kart Bilgileri:', {
        kartNumarasi: cleanCardNumber ? '****' + cleanCardNumber.slice(-4) : 'EKSİK',
        kartUzerindekiIsim: cardName ? cardName.substring(0, 3) + '***' : 'EKSİK',
        sonKullanma: expiryDate || 'EKSİK',
        cvv: cvv ? '***' : 'EKSİK'
      });
      
      if (!cleanCardNumber || cleanCardNumber.length < 16) {
        console.error('❌ CÜZDAN YÜKLEME HATASI: Geçersiz kart numarası');
        alert.show('Hata', 'Lütfen geçerli bir kart numarası girin');
        setProcessingPayment(false);
        return;
      }
      if (!cardName || cardName.trim().length < 3) {
        console.error('❌ CÜZDAN YÜKLEME HATASI: Geçersiz kart üzerindeki isim');
        alert.show('Hata', 'Lütfen kart üzerindeki ismi girin');
        setProcessingPayment(false);
        return;
      }
      if (!expiryDate || expiryDate.length < 5) {
        console.error('❌ CÜZDAN YÜKLEME HATASI: Geçersiz son kullanma tarihi');
        alert.show('Hata', 'Lütfen son kullanma tarihini girin (AA/YY)');
        setProcessingPayment(false);
        return;
      }
      if (!cvv || cvv.length < 3) {
        console.error('❌ CÜZDAN YÜKLEME HATASI: Geçersiz CVV');
        alert.show('Hata', 'Lütfen CVV kodunu girin');
        setProcessingPayment(false);
        return;
      }
      
      console.log('✅ Kart bilgileri doğrulandı');

      // Son kullanma tarihini parse et
      console.log('📅 Son kullanma tarihi parse ediliyor...');
      const [expireMonth, expireYear] = expiryDate.split('/');
      if (!expireMonth || !expireYear || expireMonth.length !== 2 || expireYear.length !== 2) {
        console.error('❌ CÜZDAN YÜKLEME HATASI: Geçersiz son kullanma tarihi formatı');
        alert.show('Hata', 'Son kullanma tarihi formatı geçersiz (AA/YY)');
        setProcessingPayment(false);
        return;
      }
      const fullExpireYear = '20' + expireYear;

      console.log('✅ Son kullanma tarihi parse edildi:', {
        expireMonth,
        expireYear,
        fullExpireYear
      });

      // Kullanıcı bilgilerini al
      let customerInfo = {
        name: '',
        surname: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        zipCode: ''
      };

      // Kullanıcının kayıtlı varsayılan adresini al
      console.log('📍 Kullanıcı adres bilgileri çekiliyor...');
      let defaultAddress = null;
      try {
        const addressResponse = await userAPI.getAddresses(userId);
        if (addressResponse.data?.success) {
          const addresses = addressResponse.data.data || [];
          // Önce varsayılan adresi bul
          defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0] || null;
          if (defaultAddress) {
            console.log('✅ Kullanıcının kayıtlı varsayılan adresi bulundu:', {
              addressId: defaultAddress.id,
              city: defaultAddress.city,
              district: defaultAddress.district,
              hasAddress: !!defaultAddress.address
            });
          } else {
            console.warn('⚠️ Kullanıcının kayıtlı adresi bulunamadı');
          }
        }
      } catch (addressError) {
        console.warn('⚠️ Adres bilgileri alınamadı:', addressError);
      }

      try {
        console.log('👤 Kullanıcı profil bilgileri çekiliyor...');
        const userResponse = await userAPI.getProfile(parseInt(userId));
        console.log('👤 Kullanıcı profil yanıtı:', {
          success: userResponse.data?.success,
          hasData: !!userResponse.data?.data,
          hasUser: !!userResponse.data?.user
        });
        if (userResponse.data?.success) {
          const user = userResponse.data.data || userResponse.data.user || {};
          const fullName = (user.name || '').split(' ');
          customerInfo.name = fullName[0] || 'John';
          customerInfo.surname = fullName.slice(1).join(' ') || 'Doe';
          customerInfo.email = user.email || 'test@test.com';
          customerInfo.phone = user.phone || '+905555555555';
          
          // Adres bilgilerini belirle - önce kayıtlı adresten, sonra user'dan
          if (defaultAddress) {
            customerInfo.address = defaultAddress.address || '';
            customerInfo.city = defaultAddress.city || 'Istanbul';
            customerInfo.zipCode = defaultAddress.postalCode || '34000';
            customerInfo.phone = defaultAddress.phone || customerInfo.phone;
            // İsim bilgisini de adresten al
            if (defaultAddress.fullName) {
              const addressFullName = defaultAddress.fullName.split(' ');
              customerInfo.name = addressFullName[0] || customerInfo.name;
              customerInfo.surname = addressFullName.slice(1).join(' ') || customerInfo.surname;
            }
          } else {
            customerInfo.address = user.address || '';
            customerInfo.city = user.city || 'Istanbul';
            customerInfo.zipCode = user.zipCode || '34000';
          }
        }
      } catch (userError) {
        console.warn('⚠️ Müşteri bilgileri alınamadı:', userError);
        // Adres bilgisi yoksa hata döndür
        if (!defaultAddress && !customerInfo.address) {
          alert.show('Hata', 'Adres bilgisi bulunamadı. Lütfen önce bir adres ekleyin.');
          setProcessingPayment(false);
          return;
        }
      }

      // Adres bilgisi hala yoksa hata döndür
      if (!customerInfo.address || customerInfo.address.trim() === '') {
        alert.show('Hata', 'Adres bilgisi bulunamadı. Lütfen önce bir adres ekleyin.');
        setProcessingPayment(false);
        return;
      }

      console.log('💳 Ödeme isteği hazırlanıyor...');
      console.log('👤 Müşteri bilgileri:', {
        name: customerInfo.name + ' ' + customerInfo.surname,
        email: customerInfo.email,
        phone: customerInfo.phone,
        city: customerInfo.city,
        zipCode: customerInfo.zipCode,
        hasAddress: !!customerInfo.address
      });

      // Wallet recharge request ile ödeme
      const paymentCard = {
        cardHolderName: cardName.trim(),
        cardNumber: cleanCardNumber,
        expireMonth: expireMonth,
        expireYear: fullExpireYear,
        cvc: cvv
      };

      const buyer = {
        name: customerInfo.name,
        surname: customerInfo.surname,
        email: customerInfo.email,
        gsmNumber: customerInfo.phone,
        city: customerInfo.city,
        zipCode: customerInfo.zipCode,
        registrationAddress: customerInfo.address
      };

      console.log('═══════════════════════════════════════════════════════');
      console.log('📤 WALLET RECHARGE API İSTEĞİ GÖNDERİLİYOR');
      console.log('═══════════════════════════════════════════════════════');
      console.log('📋 İstek Parametreleri:', {
        userId: parseInt(userId),
        amount: amountToCharge,
        paymentMethod: 'card',
        paymentCard: { 
          ...paymentCard, 
          cardNumber: '****' + cleanCardNumber.slice(-4), 
          cvc: '***' 
        },
        buyer: {
          ...buyer,
          registrationAddress: buyer.registrationAddress ? buyer.registrationAddress.substring(0, 30) + '...' : 'EKSİK'
        }
      });

      const response = await walletAPI.rechargeRequest(
        parseInt(userId), 
        parseFloat(amountToCharge), 
        'card', 
        null, 
        paymentCard, 
        buyer
      );

      console.log('═══════════════════════════════════════════════════════');
      console.log('📥 WALLET RECHARGE API YANITI ALINDI');
      console.log('═══════════════════════════════════════════════════════');
      console.log('📋 Yanıt Detayları:', {
        success: response.data?.success,
        requires3DS: response.data?.requires3DS,
        hasThreeDSHtmlContent: !!response.data?.threeDSHtmlContent,
        conversationId: response.data?.conversationId,
        requestId: response.data?.data?.requestId,
        status: response.data?.data?.status,
        message: response.data?.message,
        error: response.data?.error
      });
      
      if (response && response.data?.success) {
        // 3D Secure kontrolü
        if (response.data?.requires3DS && response.data?.threeDSHtmlContent) {
          console.log('═══════════════════════════════════════════════════════');
          console.log('🔐 3D SECURE GEREKİYOR (WALLET RECHARGE)');
          console.log('═══════════════════════════════════════════════════════');
          console.log('📋 ConversationId:', response.data.conversationId);
          console.log('💳 RequestId:', response.data.data?.requestId);
          console.log('📄 HTML Content Length:', response.data.threeDSHtmlContent?.length || 0);
          console.log('💰 Tutar:', amountToCharge);
          console.log('🌐 WebView açılıyor...');
          
          setThreeDSHtmlContent(response.data.threeDSHtmlContent);
          setThreeDSRequestId(response.data.data?.requestId || '');
          setShow3DSModal(true);
          setShowCardModal(false);
          setProcessingPayment(false);
          return;
        }

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ CÜZDAN YÜKLEME BAŞARILI (3DS GEREKMEDİ)');
        console.log('═══════════════════════════════════════════════════════');
        console.log('💰 Yüklenen Tutar:', amountToCharge);
        console.log('💳 RequestId:', response.data.data?.requestId);
        console.log('💵 Yeni Bakiye:', response.data.data?.newBalance);
        
        alert.show('Başarılı', `₺${amountToCharge} cüzdanınıza yüklendi!`);
        setShowCardModal(false);
        setCardNumber('');
        setCardName('');
        setExpiryDate('');
        setCvv('');
        setSelectedAmount(null);
        setCardModalAmount(null);
        setCustomAmount('');
        await loadWalletData(); // Verileri yenile
      } else {
        console.log('═══════════════════════════════════════════════════════');
        console.log('❌ CÜZDAN YÜKLEME BAŞARISIZ');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📋 Hata Detayları:', {
          message: response?.data?.message,
          error: response?.data?.error,
          errorCode: response?.data?.errorCode,
          errorGroup: response?.data?.errorGroup,
          status: response?.status,
          statusText: response?.statusText
        });
        
        // Hata mesajını Türkçe'ye çevir
        let errorMessage = response?.data?.message || response?.data?.error || 'Yükleme işlemi başarısız';
        
        console.error('❌ Ödeme hatası:', errorMessage);
        
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
          'Eksik parametreler': 'Eksik bilgiler var. Lütfen tüm alanları doldurun.',
          'Tutar 10-10000 TL arasında olmalıdır': 'Tutar 10-10000 TL arasında olmalıdır'
        };

        Object.keys(errorTranslations).forEach(key => {
          if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
            errorMessage = errorTranslations[key];
          }
        });

        alert.show('Hata', errorMessage);
      }
    } catch (error) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('❌ CÜZDAN YÜKLEME HATASI (EXCEPTION)');
      console.log('═══════════════════════════════════════════════════════');
      console.error('📋 Hata Detayları:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        stack: error.stack
      });
      
      let errorMessage = 'Yükleme işlemi sırasında bir hata oluştu';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
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
        'timeout': 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',
        'Network request failed': 'İnternet bağlantınızı kontrol edin'
      };

      Object.keys(errorTranslations).forEach(key => {
        if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
          errorMessage = errorTranslations[key];
        }
      });

      alert.show('Hata', errorMessage);
    } finally {
      setProcessingPayment(false);
    }
  };

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      const storedUserName = await secureStorage.getItem('userName');
      
      if (!storedUserId) {
        alert.show('Hata', 'Lütfen giriş yapın');
        navigation.navigate('Login');
        return;
      }

      setUserId(storedUserId);
      setUserName(storedUserName || 'Kullanıcı');

      console.log('🔄 Wallet verileri yükleniyor... userId:', storedUserId);

      // 1. Bakiye al
      try {
        const balanceResponse = await walletAPI.getBalance(storedUserId);
        console.log('💰 Bakiye yanıtı:', JSON.stringify(balanceResponse.data, null, 2));
        
        if (balanceResponse.data?.success) {
          // Backend response: { success: true, data: { balance: ... } }
          const balanceValue = balanceResponse.data.data?.balance ?? 0;
          const parsedBalance = parseFloat(balanceValue) || 0;
          setBalance(parsedBalance);
          console.log('✅ Bakiye:', parsedBalance);
        }
      } catch (error) {
        console.error('❌ Bakiye alınamadı:', error.message);
        setBalance(0);
      }

      // 2. İşlem geçmişi al
      try {
        const transactionsResponse = await walletAPI.getTransactions(storedUserId);
        console.log('📜 İşlemler yanıtı:', JSON.stringify(transactionsResponse.data, null, 2));
        
        if (transactionsResponse.data?.success) {
          const transactionsData = transactionsResponse.data.transactions || transactionsResponse.data.data || [];
          setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
          console.log('✅ İşlemler:', transactionsData.length, 'adet');
        }
      } catch (error) {
        console.error('❌ İşlemler alınamadı:', error.message);
        setTransactions([]);
      }

      // 3. Sadakat puanları al (opsiyonel - backend'de yoksa hata vermez)
      try {
        const pointsResponse = await walletAPI.getPoints(storedUserId);
        console.log('⭐ Puanlar yanıtı:', JSON.stringify(pointsResponse.data, null, 2));
        
        if (pointsResponse.data?.success) {
          const pointsValue = pointsResponse.data.points || pointsResponse.data.data?.points || 0;
          setPoints(parseInt(pointsValue));
          console.log('✅ Puanlar:', pointsValue);
        }
      } catch (error) {
        console.log('⚠️ Puanlar endpoint\'i yok veya hata:', error.message);
        setPoints(0);
      }

      // 4. Ödeme yöntemleri al (opsiyonel)
      try {
        const paymentMethodsResponse = await walletAPI.getPaymentMethods(storedUserId);
        console.log('💳 Ödeme yöntemleri yanıtı:', JSON.stringify(paymentMethodsResponse.data, null, 2));
        
        if (paymentMethodsResponse.data?.success) {
          const paymentMethodsData = paymentMethodsResponse.data.paymentMethods || paymentMethodsResponse.data.data || [];
          setPaymentMethods(Array.isArray(paymentMethodsData) ? paymentMethodsData : []);
          console.log('✅ Ödeme yöntemleri:', paymentMethodsData.length, 'adet');
        }
      } catch (error) {
        console.log('⚠️ Ödeme yöntemleri endpoint\'i yok veya hata:', error.message);
        setPaymentMethods([]);
      }

      // 5. Hediye çekleri ve kuponlar al (opsiyonel)
      try {
        console.log('🎁 Hediye çekleri isteniyor... userId:', storedUserId);
        const vouchersResponse = await walletAPI.getVouchers(storedUserId);
        console.log('🎁 Hediye çekleri yanıtı:', JSON.stringify(vouchersResponse.data, null, 2));
        
        if (vouchersResponse.data?.success) {
          const vouchersData =
            vouchersResponse.data.vouchers || vouchersResponse.data.data || [];
          setVouchers(Array.isArray(vouchersData) ? vouchersData : []);
          console.log('✅ Hediye çekleri:', vouchersData.length, 'adet');
        }
      } catch (error) {
        console.log("⚠️ Hediye çekleri endpoint'i yok veya hata:", error.message);
        setVouchers([]);
      }
    } catch (error) {
      console.error('Cüzdan verileri yükleme hatası:', error);
      alert.show('Hata', 'Cüzdan bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cüzdanım</Text>
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
        <Text style={styles.headerTitle}>Cüzdanım</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Loyalty Card */}
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={[COLORS.primary, '#0ea61a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loyaltyCard}
          >
            {/* Decorative circles */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
            
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <View>
                  <View style={styles.cardBrand}>
                    <Ionicons name="leaf-outline" size={16} color={COLORS.white} />
                    <Text style={styles.cardBrandText}>HPAY +</Text>
                  </View>
                  <Text style={styles.pointsAmount}>{points} Puan</Text>
                  <View style={styles.rewardBadge}>
                    <Text style={styles.rewardText}>₺{(points / 100).toFixed(2)} Değer</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.cardName}>{userName}</Text>
                  <Text style={styles.cardId}>ID: {userId.slice(0, 6)}</Text>
                </View>
                <View style={styles.qrCode}>
                  <Ionicons name="qr-code" size={32} color={COLORS.textMain} />
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Wallet Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet-outline" size={24} color={COLORS.primary} />
            <Text style={styles.balanceLabel}>Cüzdan Bakiyesi</Text>
          </View>
          <Text style={styles.balanceAmount}>₺{balance.toFixed(2)}</Text>
          <View style={styles.balanceActions}>
            <TouchableOpacity style={styles.balanceButton} onPress={handleRecharge}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.balanceButtonText}>Para Yükle</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.balanceButton}
              onPress={() => navigation.navigate('WalletTransfer')}
            >
              <Ionicons name="arrow-forward-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.balanceButtonText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* B2B Credit Card - Sadece B2B modunda göster */}
        {isB2BMode && (
          <View style={styles.creditCard}>
            <View style={styles.creditHeader}>
              <View style={styles.creditIconContainer}>
                <Ionicons name="card-outline" size={28} color={COLORS.white} />
              </View>
              <View style={styles.creditBadge}>
                <Text style={styles.creditBadgeText}>B2B KREDİ</Text>
              </View>
            </View>

            {creditApplicationStatus === 'approved' ? (
              <>
                <View style={styles.creditLimitSection}>
                  <Text style={styles.creditLimitLabel}>Kredi Limitiniz</Text>
                  <Text style={styles.creditLimitAmount}>
                    ₺{creditLimit.toLocaleString('tr-TR')}
                  </Text>
                </View>

                <View style={styles.creditProgressContainer}>
                  <View style={styles.creditProgressBar}>
                    <View 
                      style={[
                        styles.creditProgressFill, 
                        { width: `${(usedCredit / creditLimit) * 100}%` }
                      ]} 
                    />
                  </View>
                  <View style={styles.creditProgressLabels}>
                    <Text style={styles.creditProgressLabel}>
                      Kullanılan: ₺{usedCredit.toLocaleString('tr-TR')}
                    </Text>
                    <Text style={styles.creditProgressLabel}>
                      Kalan: ₺{availableCredit.toLocaleString('tr-TR')}
                    </Text>
                  </View>
                </View>

                <View style={styles.creditActions}>
                  <TouchableOpacity 
                    style={styles.creditActionButton}
                    onPress={() => navigation.navigate('CreditHistory')}
                  >
                    <Ionicons name="time-outline" size={18} color={COLORS.white} />
                    <Text style={styles.creditActionText}>Kredi Geçmişi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.creditActionButton}
                    onPress={() => setShowCreditApplicationModal(true)}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={COLORS.white} />
                    <Text style={styles.creditActionText}>Limit Artır</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : creditApplicationStatus === 'pending' ? (
              <View style={styles.creditPendingContainer}>
                <Ionicons name="hourglass-outline" size={48} color={COLORS.white} />
                <Text style={styles.creditPendingTitle}>Başvurunuz Değerlendiriliyor</Text>
                <Text style={styles.creditPendingText}>
                  Kredi başvurunuz inceleniyor. En kısa sürede size dönüş yapılacaktır.
                </Text>
              </View>
            ) : (
              <View style={styles.creditEmptyContainer}>
                <Ionicons name="card-outline" size={48} color={COLORS.white} />
                <Text style={styles.creditEmptyTitle}>B2B Kredi Başvurusu</Text>
                <Text style={styles.creditEmptyText}>
                  Toptan alımlarınız için kredi limiti başvurusunda bulunun
                </Text>
                <TouchableOpacity 
                  style={styles.creditApplyButton}
                  onPress={() => setShowCreditApplicationModal(true)}
                >
                  <Text style={styles.creditApplyButtonText}>Kredi Başvurusu Yap</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Payment Methods Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ödeme Yöntemleri</Text>
          
          {/* EFT/Havale Bilgileri */}
          <View style={styles.bankTransferCard}>
            <View style={styles.bankTransferHeader}>
              <View style={styles.bankIconContainer}>
                <Ionicons name="business" size={24} color="#3B82F6" />
              </View>
              <View style={styles.bankTransferHeaderText}>
                <Text style={styles.bankTransferTitle}>EFT / Havale</Text>
                <Text style={styles.bankTransferSubtitle}>Banka Hesap Bilgileri</Text>
              </View>
            </View>

            <View style={styles.bankInfoContainer}>
              <View style={styles.bankInfoRow}>
                <Text style={styles.bankInfoLabel}>Banka Adı</Text>
                <Text style={styles.bankInfoValue}>İş Bankası</Text>
              </View>
              <View style={styles.bankInfoDivider} />
              
              <View style={styles.bankInfoRow}>
                <Text style={styles.bankInfoLabel}>Hesap Sahibi</Text>
                <Text style={styles.bankInfoValue}>Huğlu Av Tüfekleri Kooperatifi</Text>
              </View>
              <View style={styles.bankInfoDivider} />
              
              <View style={styles.bankInfoRow}>
                <Text style={styles.bankInfoLabel}>IBAN</Text>
                <View style={styles.ibanContainer}>
                  <Text style={styles.ibanText}>TR33 0006 4000 0011 2345 6789 01</Text>
                  <TouchableOpacity 
                    style={styles.copyButton}
                    onPress={() => {
                      // IBAN kopyalama fonksiyonu
                      alert.show('Kopyalandı', 'IBAN numarası panoya kopyalandı');
                    }}
                  >
                    <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.bankTransferNote}>
              <Ionicons name="information-circle-outline" size={16} color="#3B82F6" />
              <Text style={styles.bankTransferNoteText}>
                Havale/EFT açıklamasına kullanıcı ID'nizi ({userId.slice(0, 8)}) yazınız
              </Text>
            </View>
          </View>

          {paymentMethods.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Kayıtlı Kartlar</Text>
              {paymentMethods.map((method) => {
                const cardType = method.cardType || method.type || 'VISA';
                const lastFour = method.lastFour || method.cardNumber?.slice(-4) || '****';
                const expiry = method.expiryDate || method.expiry || '';
                const isDefault = method.isDefault || method.default || false;
                
                return (
                  <TouchableOpacity key={method.id} style={styles.paymentItem}>
                    <View style={styles.paymentLeft}>
                      <View style={[
                        styles.cardLogo,
                        cardType.toUpperCase().includes('MASTER') && styles.mastercardLogo
                      ]}>
                        <Text style={styles.cardLogoText}>
                          {cardType.toUpperCase().includes('MASTER') ? 'MC' : cardType.substring(0, 4).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <View style={styles.paymentNameRow}>
                          <Text style={styles.paymentName}>{cardType} ****{lastFour}</Text>
                          {isDefault && (
                            <View style={styles.defaultBadge}>
                              <Text style={styles.defaultBadgeText}>Varsayılan</Text>
                            </View>
                          )}
                        </View>
                        {expiry && (
                          <Text style={styles.paymentExpiry}>Son kullanma: {expiry}</Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="create-outline" size={20} color={COLORS.gray400} />
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Add Payment Method */}
          <TouchableOpacity style={styles.addPaymentButton}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.addPaymentText}>Kredi Kartı Ekle</Text>
          </TouchableOpacity>
        </View>

        {/* Vouchers & Gift Cards Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hediye Çekleri & Kuponlar</Text>
          
          {vouchers.length > 0 ? (
            <>
              {vouchers.map((voucher) => {
                const voucherType = voucher.type || 'gift';
                const isGiftCard = voucherType === 'gift' || voucherType === 'giftcard';
                const iconName = isGiftCard ? 'gift-outline' : 'pricetag-outline';
                const iconColor = isGiftCard ? '#F97316' : '#3B82F6';
                const iconBgStyle = isGiftCard ? styles.giftIcon : styles.shippingIcon;
                const isActive = voucher.status === 'active' || voucher.isActive;
                
                return (
                  <TouchableOpacity key={voucher.id} style={styles.voucherItem}>
                    <View style={styles.voucherLeft}>
                      <View style={[styles.voucherIcon, iconBgStyle]}>
                        <Ionicons name={iconName} size={20} color={iconColor} />
                      </View>
                      <View>
                        <Text style={styles.voucherName}>{voucher.name || voucher.title}</Text>
                        {voucher.balance !== undefined && (
                          <Text style={styles.voucherBalance}>
                            Bakiye: <Text style={styles.voucherBalanceAmount}>₺{parseFloat(voucher.balance).toFixed(2)}</Text>
                          </Text>
                        )}
                        {voucher.discount && (
                          <Text style={styles.voucherBalance}>
                            İndirim: <Text style={styles.voucherBalanceAmount}>{voucher.discount}</Text>
                          </Text>
                        )}
                        {voucher.expiryDate && (
                          <Text style={styles.voucherExpiry}>
                            {new Date(voucher.expiryDate) > new Date() 
                              ? `${Math.ceil((new Date(voucher.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} gün içinde sona eriyor`
                              : 'Süresi dolmuş'}
                          </Text>
                        )}
                      </View>
                    </View>
                    {isActive ? (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>AKTİF</Text>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={48} color={COLORS.gray300} />
              <Text style={styles.emptyStateText}>Hediye çeki veya kupon yok</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Recharge Modal */}
      <Modal
        visible={showRechargeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRechargeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowRechargeModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="wallet" size={28} color={COLORS.primary} />
                </View>
                <Text style={styles.modalTitle}>Para Yükle</Text>
                <Text style={styles.modalSubtitle}>
                  Cüzdanınıza ne kadar para yüklemek istersiniz?
                </Text>
              </View>

              {/* Amount Options */}
              <View style={styles.amountGrid}>
                {[50, 100, 250, 500].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.amountOption,
                      selectedAmount === amount && !customAmount && styles.amountOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedAmount(amount);
                      setCustomAmount('');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.amountIconContainer}>
                      <Ionicons 
                        name="cash-outline" 
                        size={24} 
                        color={selectedAmount === amount && !customAmount ? COLORS.primary : COLORS.gray400} 
                      />
                    </View>
                    <Text style={[
                      styles.amountText,
                      selectedAmount === amount && !customAmount && styles.amountTextSelected
                    ]}>
                      ₺{amount}
                    </Text>
                    {selectedAmount === amount && !customAmount && (
                      <View style={styles.selectedCheckmark}>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Amount Input */}
              <View style={styles.customAmountContainer}>
                <Text style={styles.customAmountLabel}>Veya Özel Tutar</Text>
                <View style={[
                  styles.customAmountInputWrapper,
                  customAmount && selectedAmount && selectedAmount >= 10 && selectedAmount <= 10000 && styles.customAmountInputWrapperActive
                ]}>
                  <Text style={styles.currencySymbol}>₺</Text>
                  <TextInput
                    style={styles.customAmountInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.gray400}
                    value={customAmount}
                    onChangeText={(text) => {
                      // Sadece rakam ve nokta kabul et
                      const cleaned = text.replace(/[^\d.]/g, '');
                      // Birden fazla nokta engelle
                      const parts = cleaned.split('.');
                      const formatted = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
                      
                      if (formatted === '' || formatted === '.') {
                        setCustomAmount('');
                        setSelectedAmount(null);
                      } else {
                        const numValue = parseFloat(formatted);
                        if (!isNaN(numValue)) {
                          if (numValue >= 10 && numValue <= 10000) {
                            setCustomAmount(formatted);
                            setSelectedAmount(numValue);
                          } else if (formatted.length <= 6) {
                            // Kullanıcı yazmaya devam ediyor, geçici olarak kaydet
                            setCustomAmount(formatted);
                            setSelectedAmount(null);
                          }
                        } else {
                          setCustomAmount('');
                          setSelectedAmount(null);
                        }
                      }
                    }}
                    keyboardType="decimal-pad"
                  />
                </View>
                <Text style={styles.customAmountHint}>
                  Minimum: ₺10 - Maksimum: ₺10,000
                </Text>
                {customAmount && selectedAmount && selectedAmount >= 10 && selectedAmount <= 10000 && (
                  <View style={styles.customAmountCheckmark}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    <Text style={styles.customAmountCheckmarkText}>Geçerli tutar</Text>
                  </View>
                )}
                {customAmount && (!selectedAmount || selectedAmount < 10 || selectedAmount > 10000) && (
                  <View style={styles.customAmountError}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.customAmountErrorText}>
                      {selectedAmount && selectedAmount < 10 ? 'Minimum tutar ₺10' : 
                       selectedAmount && selectedAmount > 10000 ? 'Maksimum tutar ₺10,000' : 
                       'Geçerli bir tutar girin'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowRechargeModal(false);
                    setSelectedAmount(null);
                    setCustomAmount('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    !selectedAmount && styles.confirmButtonDisabled
                  ]}
                  onPress={() => {
                    if (selectedAmount) {
                      processRecharge(selectedAmount);
                      setSelectedAmount(null);
                      setCustomAmount('');
                    }
                  }}
                  disabled={!selectedAmount}
                >
                  <Text style={styles.confirmButtonText}>Yükle</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Credit Card Payment Modal */}
      <Modal
        visible={showCardModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCardModal(false);
          setCardNumber('');
          setCardName('');
          setExpiryDate('');
          setCvv('');
          setCardModalAmount(null);
        }}
        onShow={() => {
          // Modal açıldığında tutarı kontrol et
          console.log('📱 Kredi kartı modal açıldı');
          console.log('💰 Modal tutarı:', cardModalAmount);
          console.log('💰 Seçilen tutar:', selectedAmount);
          const finalAmount = cardModalAmount || selectedAmount;
          if (!finalAmount || finalAmount <= 0) {
            console.warn('⚠️ Modal açıldı ama tutar seçilmemiş!');
            // Eğer tutar yoksa modal'ı kapat ve kullanıcıyı bilgilendir
            setTimeout(() => {
              setShowCardModal(false);
              alert.show('Hata', 'Lütfen önce tutar seçin');
            }, 500);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cardModalContainer}>
            <View style={styles.cardModalContent}>
              {/* Modal Header */}
              <View style={styles.cardModalHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setShowCardModal(false);
                    setCardNumber('');
                    setCardName('');
                    setExpiryDate('');
                    setCvv('');
                    setCardModalAmount(null);
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={COLORS.textMain} />
                </TouchableOpacity>
                <Text style={styles.cardModalTitle}>Kredi Kartı ile Ödeme</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Amount Display */}
                <View style={styles.amountDisplay}>
                  <Text style={styles.amountLabel}>Yüklenecek Tutar</Text>
                  <Text style={styles.amountValue}>
                    {cardModalAmount && cardModalAmount > 0 
                      ? `₺${cardModalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : selectedAmount && selectedAmount > 0
                      ? `₺${selectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '₺0.00'}
                  </Text>
                  {(!cardModalAmount || cardModalAmount <= 0) && (!selectedAmount || selectedAmount <= 0) && (
                    <Text style={styles.amountWarning}>
                      Lütfen para yükleme sayfasından tutar seçin
                    </Text>
                  )}
                </View>

                {/* Card Form */}
                <View style={styles.cardForm}>
                  {/* Kart Numarası */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Kart Numarası</Text>
                    <TextInput
                      style={styles.cardInput}
                      placeholder="1234 5678 9012 3456"
                      placeholderTextColor={COLORS.gray400}
                      value={cardNumber}
                      onChangeText={(text) => {
                        const formatted = text.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                        setCardNumber(formatted.slice(0, 19));
                      }}
                      keyboardType="numeric"
                      maxLength={19}
                    />
                  </View>

                  {/* Kart Üzerindeki İsim */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Kart Üzerindeki İsim</Text>
                    <TextInput
                      style={styles.cardInput}
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
                        style={styles.cardInput}
                        placeholder="AA/YY"
                        placeholderTextColor={COLORS.gray400}
                        value={expiryDate}
                        onChangeText={(text) => {
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
                        style={styles.cardInput}
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

                  {/* Güvenlik Bilgisi */}
                  <View style={styles.securityBanner}>
                    <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                    <Text style={styles.securityText}>
                      Kart bilgileriniz 256-bit SSL ile şifrelenir
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.cardModalActions}>
                  <TouchableOpacity
                    style={styles.cancelCardButton}
                    onPress={() => {
                      setShowCardModal(false);
                      setCardNumber('');
                      setCardName('');
                      setExpiryDate('');
                      setCvv('');
                    }}
                    disabled={processingPayment}
                  >
                    <Text style={styles.cancelCardButtonText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmCardButton,
                      processingPayment && styles.confirmCardButtonDisabled
                    ]}
                    onPress={handleCardPayment}
                    disabled={processingPayment}
                  >
                    {processingPayment ? (
                      <>
                        <ActivityIndicator size="small" color={COLORS.white} />
                        <Text style={styles.confirmCardButtonText}>İşleniyor...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.confirmCardButtonText}>Ödeme Yap</Text>
                        <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
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
                  console.log('🌐 3DS WebView Navigation (Wallet):', {
                    url: navState.url,
                    title: navState.title,
                    loading: navState.loading,
                    canGoBack: navState.canGoBack
                  });
                  
                  // Callback URL'e yönlendirme kontrolü
                  if (navState.url && navState.url.includes('/api/payments/3ds-callback')) {
                    console.log('═══════════════════════════════════════════════════════');
                    console.log('✅ 3DS CALLBACK URL\'YE YÖNLENDİRİLDİ (WALLET)');
                    console.log('═══════════════════════════════════════════════════════');
                    console.log('🔗 Callback URL:', navState.url);
                    console.log('💳 RequestId:', threeDSRequestId);
                    console.log('📅 Zaman:', new Date().toISOString());
                    // Callback'ten sonra ödeme durumunu kontrol et
                    handle3DSCallback();
                  }
                }}
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === 'PAYMENT_SUCCESS') {
                      console.log('✅ 3DS Payment Success (Wallet):', data);
                      handle3DSCallback();
                    } else if (data.type === 'PAYMENT_FAILED') {
                      console.error('❌ 3DS Payment Failed (Wallet):', data);
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

      {/* Credit Application Modal */}
      <Modal
        visible={showCreditApplicationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreditApplicationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.creditApplicationModal}>
            <View style={styles.creditApplicationHeader}>
              <Text style={styles.creditApplicationTitle}>Kredi Başvurusu</Text>
              <TouchableOpacity onPress={() => setShowCreditApplicationModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <View style={styles.creditApplicationContent}>
              <View style={styles.creditApplicationInfo}>
                <Ionicons name="information-circle" size={24} color={COLORS.primary} />
                <Text style={styles.creditApplicationInfoText}>
                  B2B kredi başvurunuz değerlendirildikten sonra onaylanacaktır. 
                  Kredi limiti ile toptan alımlarınızı kolayca yapabilirsiniz.
                </Text>
              </View>

              <View style={styles.creditApplicationInputContainer}>
                <Text style={styles.creditApplicationLabel}>Talep Edilen Kredi Tutarı (₺)</Text>
                <TextInput
                  style={styles.creditApplicationInput}
                  placeholder="Örn: 50000"
                  keyboardType="numeric"
                  value={requestedCreditAmount}
                  onChangeText={setRequestedCreditAmount}
                />
              </View>

              <View style={styles.creditApplicationBenefits}>
                <Text style={styles.creditApplicationBenefitsTitle}>Kredi Avantajları:</Text>
                <View style={styles.creditApplicationBenefit}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.creditApplicationBenefitText}>Vade farksız taksit imkanı</Text>
                </View>
                <View style={styles.creditApplicationBenefit}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.creditApplicationBenefitText}>Toplu alımlarda özel fiyatlar</Text>
                </View>
                <View style={styles.creditApplicationBenefit}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.creditApplicationBenefitText}>Hızlı onay süreci</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.creditApplicationButton}
                onPress={handleCreditApplication}
              >
                <Text style={styles.creditApplicationButtonText}>Başvuru Yap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  cardContainer: {
    padding: 16,
  },
  loyaltyCard: {
    borderRadius: 16,
    padding: 20,
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    left: -30,
    bottom: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTop: {
    gap: 8,
  },
  cardBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardBrandText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  pointsAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
  },
  rewardBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  cardId: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  qrCode: {
    backgroundColor: COLORS.white,
    padding: 8,
    borderRadius: 8,
  },
  balanceCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  balanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  balanceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 12,
  },
  // Bank Transfer Card Styles
  bankTransferCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bankTransferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  bankIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankTransferHeaderText: {
    flex: 1,
  },
  bankTransferTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  bankTransferSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  bankInfoContainer: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  bankInfoRow: {
    paddingVertical: 8,
  },
  bankInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  bankInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  bankInfoDivider: {
    height: 1,
    backgroundColor: COLORS.gray200,
    marginVertical: 4,
  },
  ibanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginTop: 4,
  },
  ibanText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
    fontFamily: 'monospace',
    flex: 1,
  },
  copyButton: {
    padding: 8,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderRadius: 6,
    marginLeft: 8,
  },
  bankTransferNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 8,
  },
  bankTransferNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 18,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardLogo: {
    width: 56,
    height: 40,
    backgroundColor: '#1434CB',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mastercardLogo: {
    backgroundColor: '#EB001B',
  },
  cardLogoText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  paymentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  defaultBadge: {
    backgroundColor: 'rgba(17, 212, 33, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
  },
  paymentExpiry: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.gray300,
  },
  addPaymentText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  voucherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  voucherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  voucherIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  giftIcon: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  shippingIcon: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  voucherName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  voucherBalance: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  voucherBalanceAmount: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  voucherExpiry: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  customAmountContainer: {
    marginBottom: 24,
  },
  customAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  customAmountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  customAmountInputWrapperActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginRight: 8,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    paddingVertical: 16,
  },
  customAmountHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  customAmountCheckmark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  customAmountCheckmarkText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  customAmountError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  customAmountErrorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  amountOption: {
    width: '47%',
    aspectRatio: 1.5,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  amountOptionSelected: {
    backgroundColor: 'rgba(17, 212, 33, 0.08)',
    borderColor: COLORS.primary,
  },
  amountIconContainer: {
    marginBottom: 8,
  },
  amountText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  amountTextSelected: {
    color: COLORS.primary,
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.gray300,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Card Modal Styles
  cardModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  cardModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  amountDisplay: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.backgroundLight,
    margin: 20,
    borderRadius: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
  },
  amountWarning: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
    textAlign: 'center',
  },
  cardForm: {
    padding: 20,
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
  cardInput: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
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
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderRadius: 8,
    marginTop: 8,
  },
  securityText: {
    fontSize: 12,
    color: COLORS.primary,
    flex: 1,
  },
  cardModalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 0,
  },
  cancelCardButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelCardButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  confirmCardButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmCardButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  confirmCardButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
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

// B2B Credit Styles
const creditStyles = StyleSheet.create({
  creditCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  creditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  creditIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  creditBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  creditLimitSection: {
    marginBottom: 16,
  },
  creditLimitLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  creditLimitAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
  },
  creditProgressContainer: {
    marginBottom: 20,
  },
  creditProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  creditProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  creditProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  creditProgressLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  creditActions: {
    flexDirection: 'row',
    gap: 12,
  },
  creditActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  creditActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  creditEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  creditEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 16,
    marginBottom: 8,
  },
  creditEmptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 20,
  },
  creditApplyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  creditApplyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  creditPendingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  creditPendingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 16,
    marginBottom: 8,
  },
  creditPendingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  creditApplicationModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    width: '100%',
  },
  creditApplicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  creditApplicationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  creditApplicationContent: {
    padding: 20,
  },
  creditApplicationInfo: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderRadius: 12,
    marginBottom: 24,
  },
  creditApplicationInfoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  creditApplicationInputContainer: {
    marginBottom: 24,
  },
  creditApplicationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  creditApplicationInput: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.textMain,
  },
  creditApplicationBenefits: {
    marginBottom: 24,
  },
  creditApplicationBenefitsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  creditApplicationBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  creditApplicationBenefitText: {
    fontSize: 14,
    color: COLORS.gray600,
  },
  creditApplicationButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  creditApplicationButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});

// Merge credit styles
Object.assign(styles, creditStyles);
