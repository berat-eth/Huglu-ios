import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import ProductCard from '../components/ProductCard';
import { COLORS } from '../constants/colors';
import { wishlistAPI, userLevelAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

const CATEGORIES = ['Tümü', 'Çadırlar', 'Botlar', 'Çantalar', 'Kıyafetler'];

export default function WishlistScreen({ navigation }) {
  const alert = useAlert();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Tümü');

  useEffect(() => {
    loadWishlist();
  }, []);

  // Sayfa her açıldığında favorileri yeniden yükle
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadWishlist();
    });
    return unsubscribe;
  }, [navigation]);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      
      if (!storedUserId) {
        alert.show('Hata', 'Lütfen giriş yapın');
        navigation.navigate('Login');
        return;
      }

      setUserId(storedUserId);
      
      console.log('🔄 Favoriler yükleniyor... userId:', storedUserId);
      const response = await wishlistAPI.get(storedUserId);
      
      console.log('📦 Favoriler yanıtı:', JSON.stringify(response.data, null, 2));
      
      if (response.data?.success) {
        const favorites = response.data.favorites || response.data.data || [];
        console.log('✅ Favoriler yüklendi:', favorites.length, 'ürün');
        console.log('📋 İlk favori örneği:', favorites[0]);
        
        // Backend'den gelen veri yapısını normalize et
        // Backend: { id: favoriteId, productId: X, name: Y, price: Z, ... }
        const normalizedFavorites = Array.isArray(favorites) ? favorites.map(fav => ({
          id: fav.id, // favoriteId
          favoriteId: fav.id,
          productId: fav.productId,
          createdAt: fav.createdAt,
          // Ürün bilgileri direkt favori objesinde
          name: fav.name,
          price: fav.price,
          image: fav.image,
          stock: fav.stock,
          description: fav.description,
          brand: fav.brand,
          category: fav.category,
          rating: fav.rating,
          reviewCount: fav.reviewCount,
          hasVariations: fav.hasVariations,
        })) : [];
        
        setWishlistItems(normalizedFavorites);
      } else {
        console.warn('⚠️ Favoriler API başarısız yanıt döndü');
        setWishlistItems([]);
      }
    } catch (error) {
      console.error('❌ Favoriler yükleme hatası:', {
        message: error.message,
        response: error.response?.data,
      });
      setWishlistItems([]);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (item) => {
    try {
      console.log('🗑️ Favorilerden çıkarılıyor:', item);
      
      // favoriteId varsa onu kullan (endpoint.md'ye göre DELETE /favorites/:favoriteId)
      const favoriteId = item.id || item.favoriteId || item._id;
      if (favoriteId) {
        await wishlistAPI.remove(favoriteId, userId);
        
        // Local state'den kaldır
        setWishlistItems(items => items.filter(i => 
          (i.id || i.favoriteId || i._id) !== favoriteId
        ));
        
        console.log('✅ Favorilerden çıkarıldı');
      } else {
        throw new Error('Favorite ID bulunamadı');
      }
    } catch (error) {
      console.error('❌ Favorilerden çıkarma hatası:', error.message);
      alert.show('Hata', 'Ürün favorilerden çıkarılırken bir hata oluştu');
    }
  };

  const handleShareWishlist = async () => {
    try {
      const totalValue = wishlistItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0).toFixed(2);
      const itemCount = wishlistItems.length;
      
      const message = `🎁 Huğlu Outdoor İstek Listem\n\n${itemCount} ürün - Toplam: ${totalValue} ₺\n\nBen de Huğlu Outdoor'dan alışveriş yapıyorum! Sen de katıl! 🏔️`;
      
      const result = await Share.share({
        message: message,
        title: 'İstek Listemi Paylaş',
      });

      if (result.action === Share.sharedAction) {
        // Paylaşım başarılı - EXP kazandır
        try {
          await userLevelAPI.addSocialShareExp(userId, 'general', 'wishlist', 'wishlist');
          alert.show('Tebrikler! 🎉', 'İstek listenizi paylaştığınız için +50 EXP kazandınız!');
        } catch (expError) {
          console.log('EXP eklenemedi:', expError.message);
          // Paylaşım başarılı oldu, sadece EXP eklenemedi
        }
      }
    } catch (error) {
      console.error('Paylaşım hatası:', error);
      alert.show('Hata', 'Paylaşım sırasında bir hata oluştu');
    }
  };

  const clearAllWishlist = () => {
    alert.show(
      'Tümünü Temizle',
      'Tüm favori ürünleri silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Evet, Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Tüm favorileri tek tek sil (endpoint.md'ye göre DELETE /favorites/:favoriteId)
              for (const item of wishlistItems) {
                const favoriteId = item.id || item.favoriteId || item._id;
                if (favoriteId) {
                  await wishlistAPI.remove(favoriteId, userId);
                }
              }
              setWishlistItems([]);
            } catch (error) {
              console.error('Favoriler temizleme hatası:', error);
              alert.show('Hata', 'Favoriler temizlenirken bir hata oluştu');
            }
          }
        },
      ]
    );
  };

  const EmptyWishlist = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="heart-outline" size={64} color={COLORS.gray300} />
      </View>
      <Text style={styles.emptyTitle}>Favorileriniz Boş</Text>
      <Text style={styles.emptySubtitle}>
        Beğendiğiniz ürünleri favorilere ekleyerek daha sonra kolayca bulabilirsiniz.
      </Text>
      <TouchableOpacity
        style={styles.shopButton}
        onPress={() => navigation.navigate('Shop')}
      >
        <Text style={styles.shopButtonText}>Alışverişe Başla</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Favorilerim</Text>
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
        <Text style={styles.headerTitle}>Favorilerim</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      {wishlistItems.length > 0 ? (
        <>
          {/* Category Filters */}
          <View style={styles.categoriesContainer}>
            <FlatList
              horizontal
              data={CATEGORIES}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    selectedCategory === item && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(item)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === item && styles.categoryChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          <View style={styles.countContainer}>
            <Text style={styles.countText}>{wishlistItems.length} Ürün</Text>
            <TouchableOpacity onPress={clearAllWishlist}>
              <Text style={styles.clearAllText}>Tümünü Temizle</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={wishlistItems}
            keyExtractor={(item) => (item.id || item._id || item.productId).toString()}
            numColumns={2}
            contentContainerStyle={styles.productsList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              // Backend'den gelen veri yapısı: { id: favoriteId, productId: X, name: Y, price: Z, ... }
              const productId = item.productId || item.id;
              
              return (
                <View style={styles.productWrapper}>
                  <ProductCard
                    product={{
                      id: productId,
                      name: item.name,
                      price: item.price,
                      image: item.image || item.imageUrl,
                      rating: item.rating,
                      category: item.category,
                      isFavorite: true,
                    }}
                    onPress={() => navigation.navigate('ProductDetail', { 
                      product: { id: productId } 
                    })}
                    onFavorite={() => removeFromWishlist(item)}
                  />
                </View>
              );
            }}
          />

          {/* Total Value Footer */}
          <View style={styles.totalValueContainer}>
            <View style={styles.totalValueRow}>
              <Text style={styles.totalValueLabel}>Toplam Değer</Text>
              <Text style={styles.totalValueAmount}>
                {wishlistItems.reduce((sum, item) => sum + (parseFloat(item.price || 0) || 0), 0).toFixed(2)} ₺
              </Text>
            </View>
            <TouchableOpacity style={styles.shareWishlistButton} onPress={handleShareWishlist}>
              <Ionicons name="share-social-outline" size={20} color={COLORS.white} />
              <Text style={styles.shareWishlistText}>İstek Listesini Paylaş</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <EmptyWishlist />
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  countContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  productsList: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  productWrapper: {
    width: '50%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  shopButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  categoriesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  categoryChipTextActive: {
    color: COLORS.white,
  },
  totalValueContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    gap: 12,
  },
  totalValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalValueLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  totalValueAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  shareWishlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareWishlistText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
