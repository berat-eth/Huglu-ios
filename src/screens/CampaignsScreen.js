import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Clipboard, ActivityIndicator, RefreshControl, TextInput, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { campaignsAPI, flashDealsAPI, spinWheelAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';
import SpinWheel from '../components/SpinWheel';
import secureStorage from '../utils/secureStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_WIDTH = SCREEN_WIDTH * 0.88;

export default function CampaignsScreen({ navigation }) {
  const alert = useAlert();
  const [selectedTab, setSelectedTab] = useState('all'); // 'all' or 'available'
  const [campaigns, setCampaigns] = useState([]);
  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [totalSavings, setTotalSavings] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [flashDeals, setFlashDeals] = useState([]);
  const [flashDealsEndTime, setFlashDealsEndTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [canSpinWheel, setCanSpinWheel] = useState(true);
  const [spinWheelCooldown, setSpinWheelCooldown] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      await loadCampaigns();
      await loadFlashDeals();
      // userId yüklendikten sonra çark kontrolü yap
      if (userId) {
        await checkSpinWheelCooldown();
      } else {
        await checkLocalSpinWheelCooldown();
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    if (userId) {
      checkSpinWheelCooldown();
    }
  }, [userId]);

  // Çark çevrilme kontrolü (7 günlük cooldown)
  const checkSpinWheelCooldown = async () => {
    if (!userId) {
      setCanSpinWheel(true);
      return;
    }

    try {
      const response = await spinWheelAPI.check(userId);
      if (response.data?.success) {
        setCanSpinWheel(response.data.canSpin);
        if (!response.data.canSpin && response.data.remainingDays) {
          setSpinWheelCooldown(response.data.remainingDays);
        }
      }
    } catch (error) {
      console.error('Çark kontrolü hatası:', error);
      // Hata durumunda çarkı açık bırak (local storage kontrolü yapılacak)
      checkLocalSpinWheelCooldown();
    }
  };

  // Local storage'dan çark kontrolü
  const checkLocalSpinWheelCooldown = async () => {
    try {
      const lastSpinDate = await secureStorage.getItem('spinWheelDiscountDate');
      if (lastSpinDate) {
        const lastDate = new Date(lastSpinDate);
        const now = new Date();
        const daysSinceLastSpin = (now - lastDate) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastSpin < 7) {
          setCanSpinWheel(false);
          setSpinWheelCooldown(Math.ceil(7 - daysSinceLastSpin));
        } else {
          setCanSpinWheel(true);
        }
      }
    } catch (error) {
      console.error('Local çark kontrolü hatası:', error);
    }
  };

  // Flash deals countdown timer
  useEffect(() => {
    if (!flashDealsEndTime) {
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const endTime = new Date(flashDealsEndTime).getTime();
      const distance = endTime - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [flashDealsEndTime]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      
      // Kullanıcı ID'sini al
      const storedUserId = await secureStorage.getItem('userId');
      setUserId(storedUserId);

      console.log('🎁 Kampanyalar yükleniyor...');

      // Tüm kampanyaları yükle
      const allResponse = await campaignsAPI.getAll();
      console.log('📦 Tüm kampanyalar yanıtı:', JSON.stringify(allResponse.data, null, 2));
      
      if (allResponse.data?.success) {
        const allCampaignsData = allResponse.data.campaigns || allResponse.data.data || [];
        setCampaigns(allCampaignsData);
        console.log('✅ Tüm kampanyalar yüklendi:', allCampaignsData.length, 'adet');
      } else {
        console.warn('⚠️ Kampanyalar API başarısız yanıt döndü');
        setCampaigns([]);
      }

      // Kullanıcıya özel kampanyaları yükle (eğer giriş yapmışsa)
      if (storedUserId) {
        try {
          const availableResponse = await campaignsAPI.getAvailable(storedUserId);
          console.log('📦 Kullanıcıya özel kampanyalar yanıtı:', JSON.stringify(availableResponse.data, null, 2));
          
          if (availableResponse.data?.success) {
            const availableData = availableResponse.data.campaigns || availableResponse.data.data || [];
            setAvailableCampaigns(availableData);
            console.log('✅ Kullanıcıya özel kampanyalar yüklendi:', availableData.length, 'adet');
          }
        } catch (error) {
          console.error('❌ Kullanıcıya özel kampanyalar yüklenemedi:', error);
          setAvailableCampaigns([]);
        }
      }
    } catch (error) {
      console.error('❌ Kampanyalar yükleme hatası:', {
        message: error.message,
        response: error.response?.data,
      });
      setCampaigns([]);
      setAvailableCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFlashDeals = async () => {
    try {
      const response = await flashDealsAPI.getActive();
      
      if (response.data?.success) {
        const deals = response.data.data || [];
        setFlashDeals(deals);
        
        if (deals.length > 0) {
          const endDates = deals
            .map(deal => deal.end_date)
            .filter(date => date != null)
            .map(date => new Date(date));
          
          if (endDates.length > 0) {
            const nearestEndDate = new Date(Math.min(...endDates.map(d => d.getTime())));
            setFlashDealsEndTime(nearestEndDate);
          } else {
            const defaultEndTime = new Date();
            defaultEndTime.setHours(defaultEndTime.getHours() + 6);
            setFlashDealsEndTime(defaultEndTime);
          }
        }
      }
    } catch (error) {
      console.error('Flash Deals yükleme hatası:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
    await loadFlashDeals();
    setRefreshing(false);
  };

  const copyCode = (code) => {
    Clipboard.setString(code);
    alert.show('Kopyalandı', `${code} kodu panoya kopyalandı`);
  };

  const handleApplyCampaign = async (campaignId) => {
    if (!userId) {
      alert.show('Giriş Gerekli', 'Bu kampanyayı kullanmak için lütfen giriş yapın', [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Giriş Yap', 
          onPress: () => navigation.navigate('Login')
        }
      ]);
      return;
    }

    try {
      const response = await campaignsAPI.apply(userId, campaignId);
      if (response.data?.success) {
        alert.show('Başarılı', 'Kampanya başarıyla uygulandı');
        loadCampaigns(); // Kampanyaları yeniden yükle
      } else {
        alert.show('Hata', response.data?.message || 'Kampanya uygulanamadı');
      }
    } catch (error) {
      console.error('Kampanya uygulama hatası:', error);
      alert.show('Hata', 'Kampanya uygulanırken bir hata oluştu');
    }
  };

  // Gösterilecek kampanyaları belirle
  let displayCampaigns = selectedTab === 'all' ? campaigns : availableCampaigns;

  // Arama filtresi uygula
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    displayCampaigns = displayCampaigns.filter(c => {
      const title = (c.title || c.name || '').toLowerCase();
      const desc = (c.description || c.shortDescription || '').toLowerCase();
      const code = (c.code || c.couponCode || c.promoCode || '').toLowerCase();
      return title.includes(query) || desc.includes(query) || code.includes(query);
    });
  }

  // Kampanyaları kategorilere ayır
  const featuredCampaigns = displayCampaigns.filter(c => 
    c.type === 'featured' || c.isFeatured || c.featured
  );
  const activeCampaigns = displayCampaigns.filter(c => 
    (c.status === 'active' || c.isActive || !c.status) && 
    c.type !== 'featured' && 
    !c.isFeatured && 
    !c.featured &&
    !c.isUsed &&
    !c.used
  );
  const redeemedCampaigns = displayCampaigns.filter(c => 
    c.status === 'redeemed' || c.isUsed || c.used
  );

  // Tarih formatı
  const formatExpiryDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Süresi Doldu';
    if (diffDays === 0) return 'Bugün Sona Eriyor';
    if (diffDays === 1) return 'Yarın Sona Eriyor';
    if (diffDays <= 7) return `${diffDays} Gün Kaldı`;
    return `${diffDays} Gün Kaldı`;
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.98],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Modern Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Kampanyalar</Text>
          <Text style={styles.headerSubtitle}>
            {displayCampaigns.length} kampanya bulundu
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => setShowSearch(!showSearch)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={showSearch ? "close" : "search-outline"} 
              size={22} 
              color={COLORS.textMain} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.notificationButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.textMain} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Tabs - Header Altında */}
      <View style={styles.tabsSectionHeader}>
        <View style={styles.tabsContainerHeader}>
          <TouchableOpacity
            style={[styles.tabHeader, selectedTab === 'all' && styles.tabHeaderActive]}
            onPress={() => setSelectedTab('all')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="grid-outline" 
              size={20} 
              color={selectedTab === 'all' ? COLORS.primary : COLORS.gray400} 
            />
            <Text style={[styles.tabTextHeader, selectedTab === 'all' && styles.tabTextHeaderActive]}>
              Tümü
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabHeader, selectedTab === 'available' && styles.tabHeaderActive]}
            onPress={() => {
              if (!userId) {
                alert.show('Giriş Gerekli', 'Bana özel kampanyaları görmek için lütfen giriş yapın', [
                  { text: 'İptal', style: 'cancel' },
                  { text: 'Giriş Yap', onPress: () => navigation.navigate('Login') },
                ]);
                return;
              }
              setSelectedTab('available');
            }}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="wallet-outline" 
              size={20} 
              color={selectedTab === 'available' ? COLORS.primary : (!userId ? COLORS.gray300 : COLORS.gray400)} 
            />
            <Text style={[styles.tabTextHeader, selectedTab === 'available' && styles.tabTextHeaderActive, !userId && styles.tabTextHeaderDisabled]}>
              Bana Özel
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={COLORS.gray500} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Kampanya ara..."
              placeholderTextColor={COLORS.gray400}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={COLORS.gray400} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Kampanyalar yükleniyor...</Text>
        </View>
      ) : (
        <Animated.ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
          }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
        {/* Spin Wheel Button - Bana Özel alanı */}
        {selectedTab === 'available' && (
          <View style={styles.spinWheelSection}>
            <TouchableOpacity
              style={[styles.spinWheelButton, !canSpinWheel && styles.spinWheelButtonDisabled]}
              onPress={() => {
                if (canSpinWheel) {
                  setShowSpinWheel(true);
                } else {
                  alert.show(
                    'Çark Çevrilemez',
                    spinWheelCooldown
                      ? `Çarkı tekrar çevirmek için ${spinWheelCooldown} gün beklemelisiniz`
                      : 'Çarkı tekrar çevirmek için 7 gün beklemelisiniz'
                  );
                }
              }}
              activeOpacity={canSpinWheel ? 0.8 : 1}
              disabled={!canSpinWheel}
            >
              <LinearGradient
                colors={canSpinWheel ? [COLORS.primary, COLORS.primaryDark] : [COLORS.gray400, COLORS.gray500]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.spinWheelGradient}
              >
                <Ionicons name="gift" size={28} color={COLORS.white} />
                <View style={styles.spinWheelTextContainer}>
                  <Text style={styles.spinWheelTitle}>
                    {canSpinWheel ? 'Şanslı Çark' : 'Çark Çevrilemez'}
                  </Text>
                  <Text style={styles.spinWheelSubtitle}>
                    {canSpinWheel
                      ? 'İndirim Kazan!'
                      : spinWheelCooldown
                        ? `${spinWheelCooldown} gün sonra tekrar çevrilebilir`
                        : '7 gün sonra tekrar çevrilebilir'}
                  </Text>
                </View>
                {canSpinWheel ? (
                  <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                ) : (
                  <Ionicons name="lock-closed" size={20} color={COLORS.white} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Flash Deals Section */}
        {flashDeals.length > 0 && (
          <View style={styles.flashDealsSection}>
            <View style={styles.flashDealsHeader}>
              <View style={styles.flashDealsHeaderLeft}>
                <Ionicons name="flash" size={20} color="#ef4444" />
                <Text style={styles.flashDealsTitle}>Flash İndirimler</Text>
                {flashDealsEndTime && (
                  <View style={styles.countdownBadge}>
                    <Ionicons name="time-outline" size={12} color="#ef4444" />
                    <Text style={styles.countdownBadgeText}>
                      {timeLeft.hours.toString().padStart(2, '0')}:
                      {timeLeft.minutes.toString().padStart(2, '0')}:
                      {timeLeft.seconds.toString().padStart(2, '0')}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('FlashDeals')}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.flashDealsContainer}
            >
              {flashDeals.flatMap((deal) => {
                const products = deal.products || [];
                return products.slice(0, 5).map((product, index) => {
                  const basePrice = parseFloat(product.price || 0);
                  const discountValue = parseFloat(deal.discount_value || 0);
                  
                  let discountedPrice = basePrice;
                  let discountPercent = 0;
                  if (deal.discount_type === 'percentage') {
                    discountedPrice = basePrice * (1 - discountValue / 100);
                    discountPercent = discountValue;
                  } else {
                    discountedPrice = Math.max(0, basePrice - discountValue);
                    discountPercent = basePrice > 0 ? Math.round((discountValue / basePrice) * 100) : 0;
                  }
                  
                  const productImage = product.image || product.imageUrl || 'https://via.placeholder.com/200?text=Ürün';
                  
                  return (
                    <TouchableOpacity
                      key={`${deal.id}-${product.id || product._id || index}`}
                      style={styles.flashDealCard}
                      onPress={() => navigation.navigate('ProductDetail', { productId: product.id || product._id })}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={{ uri: productImage }}
                        style={styles.flashDealImage}
                        resizeMode="cover"
                      />
                      <View style={styles.flashDealBadge}>
                        <Text style={styles.flashDealBadgeText}>
                          %{discountPercent}
                        </Text>
                      </View>
                      <View style={styles.flashDealInfo}>
                        <Text style={styles.flashDealPrice} numberOfLines={1}>
                          ₺{discountedPrice.toFixed(2)}
                        </Text>
                        {basePrice > discountedPrice && (
                          <Text style={styles.flashDealOldPrice} numberOfLines={1}>
                            ₺{basePrice.toFixed(2)}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                });
              })}
            </ScrollView>
          </View>
        )}

        {/* Hero Carousel */}
        {featuredCampaigns.length > 0 && (
          <View style={styles.carouselSection}>
            <View style={styles.sectionLabelContainer}>
              <Ionicons name="star" size={16} color={COLORS.primary} />
              <Text style={styles.sectionLabel}>Öne Çıkanlar</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CAROUSEL_WIDTH + 20}
              decelerationRate="fast"
              contentContainerStyle={styles.carouselContainer}
              pagingEnabled={false}
            >
              {featuredCampaigns.map((campaign, index) => {
                const campaignImage = campaign.image || campaign.imageUrl || campaign.bannerImage || 'https://via.placeholder.com/800x400?text=Kampanya';
                const campaignBadge = campaign.badge || campaign.label || 'Öne Çıkan';
                const campaignTitle = campaign.title || campaign.name || 'Kampanya';
                const campaignDesc = campaign.description || campaign.shortDescription || '';
                const expiryText = formatExpiryDate(campaign.endDate || campaign.expiresAt);
                
                return (
                  <TouchableOpacity
                    key={campaign.id || campaign._id || index}
                    style={[styles.heroCard, { width: CAROUSEL_WIDTH }]}
                    activeOpacity={0.9}
                    onPress={() => {
                      if (campaign.code || campaign.couponCode) {
                        copyCode(campaign.code || campaign.couponCode);
                      }
                    }}
                  >
                    <Image
                      source={{ uri: campaignImage }}
                      style={styles.heroImage}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.85)']}
                      style={styles.heroOverlay}
                    />
                    <View style={styles.heroContent}>
                      <View style={styles.heroBadge}>
                        <Ionicons name="flash" size={12} color={COLORS.white} />
                        <Text style={styles.heroBadgeText}>{campaignBadge}</Text>
                      </View>
                      <Text style={styles.heroTitle} numberOfLines={2}>{campaignTitle}</Text>
                      <Text style={styles.heroDescription} numberOfLines={2}>{campaignDesc}</Text>
                      {expiryText && (
                        <View style={styles.heroExpiry}>
                          <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.9)" />
                          <Text style={styles.heroExpiryText}>{expiryText}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Section Header */}
        {activeCampaigns.length > 0 && (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="flash-outline" size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Aktif Promosyonlar</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{activeCampaigns.length}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Campaign Cards */}
        <View style={styles.cardsContainer}>
          {activeCampaigns.map((campaign) => {
            // Backend'den gelen veriyi normalize et
            const campaignType = campaign.type || campaign.campaignType || 'discount';
            const campaignId = campaign.id || campaign._id;
            const campaignTitle = campaign.title || campaign.name || 'Kampanya';
            const campaignDesc = campaign.description || campaign.shortDescription || '';
            const campaignCode = campaign.code || campaign.couponCode || campaign.promoCode;
            const campaignDiscount = campaign.discount || campaign.discountText || campaign.discountAmount;
            const campaignBadge = campaign.badge || campaign.label;
            const campaignImage = campaign.image || campaign.imageUrl || campaign.productImage;
            
            if (campaignType === 'discount' || campaignType === 'coupon') {
              const expiryText = formatExpiryDate(campaign.endDate || campaign.expiresAt);
              const isExpiringSoon = expiryText && (expiryText.includes('Bugün') || expiryText.includes('Yarın') || expiryText.includes('1 Gün'));
              
              return (
                <View key={campaignId} style={styles.discountCard}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.discountCardBar}
                  />
                  <View style={styles.discountCardContent}>
                    <View style={styles.discountCardTop}>
                      <View style={styles.discountCardHeader}>
                        {campaignBadge && (
                          <View style={[styles.statusBadge, isExpiringSoon && styles.statusBadgeUrgent]}>
                            <Ionicons name="time" size={10} color={isExpiringSoon ? '#fff' : '#f97316'} />
                            <Text style={[styles.statusBadgeText, isExpiringSoon && styles.statusBadgeTextUrgent]}>
                              {isExpiringSoon ? 'Yakında Bitiyor' : campaignBadge}
                            </Text>
                          </View>
                        )}
                        {expiryText && !isExpiringSoon && (
                          <Text style={styles.expiryText}>{expiryText}</Text>
                        )}
                      </View>
                      <Text style={styles.discountAmount}>{campaignDiscount}</Text>
                      <Text style={styles.discountTitle}>{campaignTitle}</Text>
                      {campaignDesc && (
                        <Text style={styles.discountDescription} numberOfLines={2}>{campaignDesc}</Text>
                      )}
                    </View>
                    
                    {campaignCode && (
                      <View style={styles.discountCardBottom}>
                        <View style={styles.codeBox}>
                          <Ionicons name="ticket-outline" size={16} color={COLORS.primary} />
                          <Text style={styles.codeBoxText}>{campaignCode}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => copyCode(campaignCode)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="copy-outline" size={16} color={COLORS.white} />
                          <Text style={styles.copyButtonText}>Kopyala</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            }

            if (campaignType === 'shipping' || campaignType === 'free_shipping') {
              return (
                <View key={campaignId} style={styles.shippingCard}>
                  <LinearGradient
                    colors={['#3b82f6', '#2563eb']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.shippingCardBar}
                  />
                  <View style={styles.shippingCardContent}>
                    <View style={styles.shippingIcon}>
                      <LinearGradient
                        colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)']}
                        style={styles.shippingIconGradient}
                      >
                        <Ionicons name={campaign.icon || 'car-outline'} size={32} color="#3b82f6" />
                      </LinearGradient>
                    </View>
                    <View style={styles.shippingInfo}>
                      <Text style={styles.shippingTitle}>{campaignTitle}</Text>
                      <Text style={styles.shippingDescription}>{campaignDesc}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.applyButton}
                      onPress={() => handleApplyCampaign(campaignId)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.applyButtonText}>Uygula</Text>
                      <Ionicons name="arrow-forward" size={14} color="#3b82f6" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            if (campaignType === 'product' || campaignType === 'bundle') {
              const expiryText = formatExpiryDate(campaign.endDate || campaign.expiresAt || campaign.validUntil);
              
              return (
                <View key={campaignId} style={styles.productCard}>
                  {campaignImage && (
                    <View style={styles.productImageContainer}>
                      <Image
                        source={{ uri: campaignImage }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                      <View style={styles.productImageOverlay} />
                    </View>
                  )}
                  <View style={styles.productCardContent}>
                    <View style={styles.productCardTop}>
                      {campaignBadge && (
                        <View style={styles.productBadgeContainer}>
                          <Text style={styles.productBadge}>{campaignBadge}</Text>
                        </View>
                      )}
                      <Text style={styles.productTitle} numberOfLines={2}>{campaignTitle}</Text>
                      {campaignDesc && (
                        <Text style={styles.productDescription} numberOfLines={2}>{campaignDesc}</Text>
                      )}
                    </View>
                    <View style={styles.productCardBottom}>
                      {expiryText && (
                        <View style={styles.productExpiresContainer}>
                          <Ionicons name="time-outline" size={12} color={COLORS.gray400} />
                          <Text style={styles.productExpires}>{expiryText}</Text>
                        </View>
                      )}
                      <TouchableOpacity 
                        style={styles.viewDetailsButton}
                        onPress={() => handleApplyCampaign(campaignId)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.viewDetailsText}>Detaylar</Text>
                        <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }

            return null;
          })}

          {/* Redeemed Campaigns */}
          {redeemedCampaigns.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.gray400} />
                  <Text style={[styles.sectionTitle, styles.sectionTitleMuted]}>Kullanılan Kampanyalar</Text>
                  <View style={[styles.sectionBadge, styles.sectionBadgeMuted]}>
                    <Text style={[styles.sectionBadgeText, styles.sectionBadgeTextMuted]}>{redeemedCampaigns.length}</Text>
                  </View>
                </View>
              </View>
              {redeemedCampaigns.map((campaign) => {
                const campaignId = campaign.id || campaign._id;
                const campaignTitle = campaign.title || campaign.name || 'Kampanya';
                const campaignDiscount = campaign.discount || campaign.discountText || campaign.discountAmount;
                const campaignDesc = campaign.description || campaign.shortDescription || 'Kullanıldı';
                
                return (
                  <View key={campaignId} style={styles.redeemedCard}>
                    <View style={styles.redeemedCardBar} />
                    <View style={styles.redeemedCardContent}>
                      <View style={styles.redeemedInfo}>
                        <View style={styles.redeemedBadge}>
                          <Ionicons name="checkmark-circle" size={12} color={COLORS.gray400} />
                          <Text style={styles.redeemedBadgeText}>Kullanıldı</Text>
                        </View>
                        <Text style={styles.redeemedTitle}>{campaignDiscount}</Text>
                        <Text style={styles.redeemedDescription}>{campaignDesc}</Text>
                      </View>
                      <View style={styles.redeemedCheck}>
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.gray300} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>

        <View style={{ height: 120 }} />
        </Animated.ScrollView>
      )}

      {/* Floating Bottom Bar */}
      {totalSavings > 0 && (
        <View style={styles.floatingBar}>
          <LinearGradient
            colors={[COLORS.textMain, COLORS.gray800]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.floatingBarGradient}
          >
            <View style={styles.floatingBarContent}>
              <View>
                <Text style={styles.floatingBarLabel}>Toplam Tasarruf</Text>
                <Text style={styles.floatingBarAmount}>₺{totalSavings.toFixed(2)}</Text>
              </View>
              <TouchableOpacity 
                style={styles.checkoutButton}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Cart')}
              >
                <Text style={styles.checkoutButtonText}>Ödemeye Git</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}
      {/* Spin Wheel Modal */}
      <SpinWheel
        visible={showSpinWheel}
        onClose={() => setShowSpinWheel(false)}
        onWin={async (discount) => {
          if (discount) {
            // İndirim kodunu oluştur
            const discountCode = `SPIN${discount.toString().padStart(2, '0')}`;
            
            try {
              // Backend'e kaydet (eğer kullanıcı giriş yapmışsa)
              if (userId) {
                try {
                  await spinWheelAPI.saveCode(userId, discount, discountCode);
                  console.log('✅ Spin wheel code saved to backend');
                } catch (backendError) {
                  console.error('Backend kayıt hatası:', backendError);
                  // Backend hatası olsa bile local storage'a kaydet
                }
              }
              
              // Local storage'a kaydet (her durumda)
              await secureStorage.setItem('spinWheelDiscountCode', discountCode);
              await secureStorage.setItem('spinWheelDiscountPercent', discount.toString());
              await secureStorage.setItem('spinWheelDiscountDate', new Date().toISOString());
              
              // Cooldown'u güncelle
              setCanSpinWheel(false);
              setSpinWheelCooldown(7);
              
              alert.show('Tebrikler!', `%${discount} indirim kazandınız! Kod: ${discountCode}`);
            } catch (error) {
              console.error('İndirim kodu kaydedilemedi:', error);
              alert.show('Tebrikler!', `%${discount} indirim kazandınız!`);
            }
          }
        }}
      />
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
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textMain,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 2,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: COLORS.gray50,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textMain,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  carouselSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  sectionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    letterSpacing: 0.3,
  },
  carouselContainer: {
    paddingHorizontal: 16,
    gap: 20,
    paddingRight: 4,
  },
  heroCard: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 40,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    marginBottom: 12,
    gap: 4,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 6,
    lineHeight: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 20,
  },
  heroExpiry: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  heroExpiryText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  // Header Altı Tabs (Görseldeki Tasarım - Küçültülmüş)
  tabsSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  tabsContainerHeader: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    gap: 4,
  },
  tabHeader: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabHeaderActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  tabTextHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray500,
    letterSpacing: 0.1,
  },
  tabTextHeaderActive: {
    color: COLORS.textMain,
    fontWeight: '800',
  },
  tabTextHeaderDisabled: {
    opacity: 0.4,
  },
  tabsSection: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.backgroundLight,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 5,
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabIcon: {
    marginRight: -2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  tabTextActive: {
    fontWeight: '700',
    color: COLORS.textMain,
  },
  tabTextDisabled: {
    opacity: 0.4,
  },
  tabBadge: {
    marginLeft: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  clearSearchButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 20,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
    letterSpacing: -0.3,
  },
  sectionTitleMuted: {
    color: COLORS.gray500,
    fontWeight: '700',
  },
  sectionBadge: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  sectionBadgeMuted: {
    backgroundColor: COLORS.gray200,
  },
  sectionBadgeTextMuted: {
    color: COLORS.gray500,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  // Discount Card
  discountCard: {
    position: 'relative',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    marginBottom: 16,
  },
  discountCardBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  discountCardContent: {
    padding: 18,
    paddingLeft: 24,
  },
  discountCardTop: {
    marginBottom: 16,
  },
  discountCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderRadius: 6,
    gap: 4,
  },
  statusBadgeUrgent: {
    backgroundColor: '#ef4444',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f97316',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadgeTextUrgent: {
    color: '#fff',
  },
  expiryText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  discountAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textMain,
    marginBottom: 6,
    letterSpacing: -1,
  },
  discountTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 6,
    lineHeight: 22,
  },
  discountDescription: {
    fontSize: 13,
    color: COLORS.gray500,
    lineHeight: 18,
  },
  discountCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  codeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.gray50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderStyle: 'dashed',
    gap: 8,
  },
  codeBoxText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  // Shipping Card
  shippingCard: {
    position: 'relative',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    marginBottom: 16,
  },
  shippingCardBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  shippingCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    paddingLeft: 24,
    gap: 16,
  },
  shippingIcon: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shippingIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shippingInfo: {
    flex: 1,
  },
  shippingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 6,
    lineHeight: 22,
  },
  shippingDescription: {
    fontSize: 13,
    color: COLORS.gray500,
    lineHeight: 18,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 10,
    gap: 6,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3b82f6',
    letterSpacing: 0.3,
  },
  // Product Card
  productCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    marginBottom: 16,
  },
  productImageContainer: {
    width: 140,
    height: 140,
    backgroundColor: COLORS.gray200,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  productCardContent: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  productCardTop: {
    marginBottom: 12,
  },
  productBadgeContainer: {
    marginBottom: 8,
  },
  productBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
    lineHeight: 24,
    marginBottom: 6,
  },
  productDescription: {
    fontSize: 13,
    color: COLORS.gray500,
    lineHeight: 18,
  },
  productCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  productExpiresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productExpires: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  // Redeemed Card
  redeemedCard: {
    position: 'relative',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    opacity: 0.65,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginBottom: 16,
  },
  redeemedCardBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: COLORS.gray300,
  },
  redeemedCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    paddingLeft: 24,
    gap: 16,
  },
  redeemedInfo: {
    flex: 1,
  },
  redeemedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.gray100,
    borderRadius: 6,
    marginBottom: 10,
    gap: 4,
  },
  redeemedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  redeemedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textMain,
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    textDecorationColor: COLORS.gray400,
    marginBottom: 6,
    opacity: 0.7,
  },
  redeemedDescription: {
    fontSize: 13,
    color: COLORS.gray500,
    lineHeight: 18,
  },
  redeemedCheck: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Floating Bar
  floatingBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 50,
  },
  floatingBarGradient: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  floatingBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  floatingBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  floatingBarAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  checkoutButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
    letterSpacing: 0.3,
  },
  // Spin Wheel Section
  spinWheelSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  spinWheelButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  spinWheelGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 16,
  },
  spinWheelButtonDisabled: {
    opacity: 0.7,
  },
  spinWheelTextContainer: {
    flex: 1,
  },
  spinWheelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  spinWheelSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  // Flash Deals Section
  flashDealsSection: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  flashDealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  flashDealsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flashDealsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
    letterSpacing: -0.3,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef444415',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    marginLeft: 8,
  },
  countdownBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ef4444',
    fontFamily: 'monospace',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  flashDealsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  flashDealCard: {
    width: 140,
    height: 180,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    position: 'relative',
  },
  flashDealImage: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.gray200,
  },
  flashDealBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  flashDealBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
  },
  flashDealInfo: {
    padding: 10,
    justifyContent: 'center',
  },
  flashDealPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  flashDealOldPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
  },
});
