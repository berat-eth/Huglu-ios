import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { flashDealsAPI, cartAPI } from '../services/api';
import { updateCartBadge } from '../utils/cartBadge';
import { useAlert } from '../hooks/useAlert';

const { width } = Dimensions.get('window');

export default function FlashDealsScreen({ navigation }) {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flashDeals, setFlashDeals] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [flashDealsEndTime, setFlashDealsEndTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    loadFlashDeals();
  }, []);

  // Countdown timer
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

      // Günleri hesapla
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      // Kalan saatleri hesapla (günler çıkarıldıktan sonra)
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      // Kalan dakikaları hesapla
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      // Kalan saniyeleri hesapla
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [flashDealsEndTime]);

  const loadFlashDeals = async () => {
    try {
      setLoading(true);
      const response = await flashDealsAPI.getActive();
      
      if (response.data?.success) {
        const deals = response.data.data || [];
        setFlashDeals(deals);
        console.log('Flash Deals yüklendi:', deals.length);
        
        // Flash deals'den en yakın bitiş tarihini al ve timer'ı ayarla
        if (deals.length > 0) {
          // Tüm aktif flash deals'lerin end_date'lerini al
          const endDates = deals
            .map(deal => deal.end_date)
            .filter(date => date != null)
            .map(date => new Date(date));
          
          if (endDates.length > 0) {
            // En yakın bitiş tarihini bul (en küçük tarih)
            const nearestEndDate = new Date(Math.min(...endDates.map(d => d.getTime())));
            setFlashDealsEndTime(nearestEndDate);
            console.log('⏰ Flash Deals bitiş tarihi ayarlandı:', nearestEndDate);
          } else {
            // Eğer end_date yoksa varsayılan olarak 6 saat sonra bitecek şekilde ayarla
            const defaultEndTime = new Date();
            defaultEndTime.setHours(defaultEndTime.getHours() + 6);
            setFlashDealsEndTime(defaultEndTime);
            console.log('⏰ Flash Deals bitiş tarihi bulunamadı, varsayılan ayarlandı:', defaultEndTime);
          }
        }
      }
    } catch (error) {
      console.error('Flash Deals yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFlashDeals();
    setRefreshing(false);
  };

  // Flash deal ürününü sepete ekle (indirimli fiyat ile)
  const handleAddToCart = async (product) => {
    try {
      const userId = await secureStorage.getItem('userId');
      
      if (!userId) {
        alert.show('Giriş Gerekli', 'Sepete ürün eklemek için lütfen giriş yapın');
        return;
      }

      const productId = product.id || product._id;
      if (!productId) {
        alert.show('Hata', 'Ürün bilgisi bulunamadı');
        return;
      }

      // Flash deal indirimli fiyatını kullan
      const finalPrice = product.discountedPrice || product.price || 0;
      
      console.log('🛒 Flash deal sepete ekleme - Ürün ID:', productId, 'İndirimli Fiyat:', finalPrice);

      const response = await cartAPI.add(userId, productId, 1, {}, finalPrice);

      if (response.data?.success) {
        // Sepet değişti - cache'i bypass etmek için timestamp güncelle
        await secureStorage.setItem('cartLastModified', Date.now().toString());
        
        // Badge'i güncelle
        await updateCartBadge(userId);
        alert.show('Başarılı', 'Ürün sepete eklendi!');
      } else {
        alert.show('Hata', response.data?.message || 'Sepete eklenemedi');
      }
    } catch (error) {
      console.error('Sepete ekleme hatası:', error);
      alert.show('Hata', 'Ürün sepete eklenirken bir hata oluştu');
    }
  };

  // Tüm ürünleri düzleştir
  const allProducts = flashDeals.flatMap(deal => 
    (deal.products || []).map(product => {
      const basePrice = parseFloat(product.price || 0);
      const discountValue = parseFloat(deal.discount_value || 0);
      
      let discountedPrice = basePrice;
      let savePercentage = 0;
      
      if (deal.discount_type === 'percentage') {
        discountedPrice = basePrice * (1 - discountValue / 100);
        savePercentage = discountValue;
      } else {
        discountedPrice = basePrice - discountValue;
        savePercentage = basePrice > 0 ? Math.round((discountValue / basePrice) * 100) : 0;
      }
      
      const stock = parseInt(product.stock || 0);
      const claimed = Math.min(100, Math.max(0, 100 - (stock / 20) * 100));
      
      return {
        ...product,
        dealName: deal.name,
        discountType: deal.discount_type,
        discountValue: discountValue,
        originalPrice: basePrice,
        oldPrice: basePrice, // Eski fiyat (ProductCard için)
        price: Math.max(0, discountedPrice), // İndirimli fiyat (ProductCard için)
        discountedPrice: Math.max(0, discountedPrice),
        savePercentage: Math.round(savePercentage),
        stock: stock,
        claimed: claimed,
        isFlashDeal: true, // Flash indirim flag'i
      };
    })
  );

  const categories = ['all', ...new Set(allProducts.map(p => p.category).filter(Boolean))];
  const filteredProducts = selectedCategory === 'all' 
    ? allProducts 
    : allProducts.filter(p => p.category === selectedCategory);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>FLASH SALES</Text>
          <TouchableOpacity style={styles.cartButton} onPress={() => navigation.navigate('Cart')}>
            <Ionicons name="cart-outline" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FIRSATLAR</Text>
        <TouchableOpacity style={styles.cartButton} onPress={() => navigation.navigate('Cart')}>
          <Ionicons name="cart-outline" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Countdown Timer */}
        <View style={styles.countdownSection}>
          <Text style={styles.countdownTitle}>KAMPANYA BİTİŞ SÜRESİ</Text>
          <View style={styles.timerContainer}>
            {timeLeft.days > 0 && (
              <>
                <View style={styles.timerBlock}>
                  <View style={styles.timerBox}>
                    <Text style={styles.timerNumber}>{String(timeLeft.days).padStart(2, '0')}</Text>
                  </View>
                  <Text style={styles.timerLabel}>Gün</Text>
                </View>
                <Text style={styles.timerSeparator}>:</Text>
              </>
            )}
            <View style={styles.timerBlock}>
              <View style={[styles.timerBox, styles.timerBoxActive]}>
                <Text style={[styles.timerNumber, styles.timerNumberActive]}>
                  {String(timeLeft.hours).padStart(2, '0')}
                </Text>
              </View>
              <Text style={styles.timerLabel}>Saat</Text>
            </View>
            <Text style={styles.timerSeparator}>:</Text>
            <View style={styles.timerBlock}>
              <View style={[styles.timerBox, styles.timerBoxActive]}>
                <Text style={[styles.timerNumber, styles.timerNumberActive]}>
                  {String(timeLeft.minutes).padStart(2, '0')}
                </Text>
              </View>
              <Text style={styles.timerLabel}>Dakika</Text>
            </View>
            <Text style={styles.timerSeparator}>:</Text>
            <View style={styles.timerBlock}>
              <View style={[styles.timerBox, styles.timerBoxActive]}>
                <Text style={[styles.timerNumber, styles.timerNumberActive]}>
                  {String(timeLeft.seconds).padStart(2, '0')}
                </Text>
              </View>
              <Text style={styles.timerLabel}>Saniye</Text>
            </View>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.categoryChipActive
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Ionicons 
                  name={category === 'all' ? 'pricetag' : 'shirt'} 
                  size={16} 
                  color={selectedCategory === category ? COLORS.white : COLORS.gray500}
                />
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive
                ]}>
                  {category === 'all' ? 'Tüm Fırsatlar' : category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products */}
        <View style={styles.productsSection}>
          {filteredProducts.map((product, index) => {
            const isFeatured = index === 0;
            const isSoldOut = product.stock <= 0;
            
            if (isFeatured) {
              return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.featuredCard}
                  onPress={() => navigation.navigate('ProductDetail', { product })}
                  activeOpacity={0.9}
                >
                  <View style={styles.featuredImageContainer}>
                    <View style={styles.badgeContainer}>
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountBadgeText}>
                          %{product.savePercentage} İNDİRİM
                        </Text>
                      </View>
                      <View style={styles.popularBadge}>
                        <Ionicons name="flame" size={12} color={COLORS.error} />
                        <Text style={styles.popularBadgeText}>Popüler</Text>
                      </View>
                    </View>
                    <Image 
                      source={{ uri: product.image }} 
                      style={styles.featuredImage}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.featuredContent}>
                    <View style={styles.featuredHeader}>
                      <View style={styles.featuredInfo}>
                        <Text style={styles.brandText}>{product.brand || product.category}</Text>
                        <Text style={styles.featuredTitle} numberOfLines={2}>
                          {product.name}
                        </Text>
                      </View>
                      <View style={styles.priceContainer}>
                        <Text style={styles.featuredPrice}>
                          ₺{(product.discountedPrice || 0).toFixed(0)}
                        </Text>
                        <Text style={styles.originalPrice}>
                          ₺{(product.originalPrice || 0).toFixed(0)}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Stock Progress */}
                    <View style={styles.stockSection}>
                      <View style={styles.stockHeader}>
                        <View style={styles.stockAlert}>
                          <View style={styles.pulseContainer}>
                            <View style={styles.pulse} />
                            <View style={styles.pulseDot} />
                          </View>
                          <Text style={styles.stockAlertText}>
                            {product.stock <= 3 ? `Son ${product.stock} adet!` : `${product.stock} stokta`}
                          </Text>
                        </View>
                        <Text style={styles.claimedText}>%{Math.round(product.claimed)} tükendi</Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${product.claimed}%` }]} />
                      </View>
                    </View>

                    <TouchableOpacity style={styles.shopNowButton}>
                      <Text style={styles.shopNowText}>Hemen Al</Text>
                      <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }

            // Standard horizontal card
            return (
              <TouchableOpacity
                key={product.id}
                style={[styles.standardCard, isSoldOut && styles.soldOutCard]}
                onPress={() => !isSoldOut && navigation.navigate('ProductDetail', { product })}
                activeOpacity={0.9}
                disabled={isSoldOut}
              >
                {isSoldOut && (
                  <View style={styles.soldOutOverlay}>
                    <View style={styles.soldOutBadge}>
                      <Text style={styles.soldOutText}>TÜKENDİ</Text>
                    </View>
                  </View>
                )}
                <View style={[styles.standardImage, isSoldOut && styles.soldOutImage]}>
                  <Image 
                    source={{ uri: product.image }} 
                    style={styles.standardImageContent}
                    resizeMode="cover"
                  />
                  <View style={styles.smallDiscountBadge}>
                    <Text style={styles.smallDiscountText}>-{product.savePercentage}%</Text>
                  </View>
                </View>
                <View style={styles.standardContent}>
                  <Text style={styles.smallBrand}>{product.brand || product.category}</Text>
                  <Text style={styles.standardTitle} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <View style={styles.standardPriceRow}>
                    <Text style={styles.standardPrice}>₺{(product.discountedPrice || 0).toFixed(0)}</Text>
                    <Text style={styles.standardOriginalPrice}>₺{(product.originalPrice || 0).toFixed(0)}</Text>
                  </View>
                  <View style={styles.standardFooter}>
                    <Text style={styles.smallClaimedText}>%{Math.round(product.claimed)} Tükendi</Text>
                    {!isSoldOut && (
                      <TouchableOpacity 
                        style={styles.addButton}
                        onPress={() => handleAddToCart(product)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="cart-outline" size={18} color={COLORS.textMain} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.smallProgressBar}>
                    <View style={[styles.smallProgressFill, { width: `${product.claimed}%` }]} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
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
    backgroundColor: COLORS.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    letterSpacing: 1.5,
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownSection: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  countdownTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    letterSpacing: 1,
    marginBottom: 24,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerBlock: {
    alignItems: 'center',
    gap: 8,
  },
  timerBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timerBoxActive: {
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 33, 0.2)',
  },
  timerNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    fontVariant: ['tabular-nums'],
  },
  timerNumberActive: {
    color: COLORS.primary,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.gray300,
    marginTop: -20,
  },
  categoriesSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  categoryChipActive: {
    backgroundColor: COLORS.textMain,
    borderColor: COLORS.textMain,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  productsSection: {
    padding: 16,
    gap: 24,
  },
  featuredCard: {
    borderRadius: 16,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  featuredImageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: COLORS.gray100,
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    flexDirection: 'row',
    gap: 8,
  },
  discountBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMain,
    textTransform: 'uppercase',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredContent: {
    padding: 16,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  featuredInfo: {
    flex: 1,
    marginRight: 12,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    lineHeight: 24,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  featuredPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 12,
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
  },
  stockSection: {
    marginBottom: 16,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseContainer: {
    width: 8,
    height: 8,
    position: 'relative',
  },
  pulse: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    opacity: 0.75,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  stockAlertText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
  },
  claimedText: {
    fontSize: 11,
    color: COLORS.gray500,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.gray100,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  shopNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.textMain,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shopNowText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  standardCard: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  soldOutCard: {
    opacity: 0.6,
  },
  soldOutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  soldOutBadge: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.error,
    transform: [{ rotate: '-10deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  soldOutText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.error,
    letterSpacing: 1,
  },
  standardImage: {
    width: 128,
    height: 128,
    backgroundColor: COLORS.gray100,
  },
  soldOutImage: {
    opacity: 0.5,
  },
  standardImageContent: {
    width: '100%',
    height: '100%',
  },
  smallDiscountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  smallDiscountText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  standardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  smallBrand: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  standardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  standardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  standardPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  standardOriginalPrice: {
    fontSize: 12,
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
  },
  standardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  smallClaimedText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallProgressBar: {
    height: 4,
    backgroundColor: COLORS.gray100,
    borderRadius: 2,
    overflow: 'hidden',
  },
  smallProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
});
