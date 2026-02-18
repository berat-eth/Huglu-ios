import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { productsAPI, recommendationsAPI } from '../services/api';
import { getCategoryRecommendations } from '../config/categoryRecommendations';
import { secureStorage } from '../utils/secureStorage';

export default function ProductRecommendations({ currentProduct, maxItems = 6, onProductPress }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchReason, setMatchReason] = useState('');
  const [userId, setUserId] = useState(null);
  const [useSmartRecommendations, setUseSmartRecommendations] = useState(true);

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    // Ürün değiştiğinde önerileri sıfırla ve yeniden yükle
    setRecommendations([]);
    setLoading(true);
    fetchRecommendations();
  }, [currentProduct?.id, currentProduct?._id, userId]); // ID değişince yeniden çek

  const loadUserId = async () => {
    try {
      const storedUserId = await secureStorage.getItem('userId');
      setUserId(storedUserId);
    } catch (error) {
      console.log('User ID yüklenemedi:', error);
    }
  };

  const fetchRecommendations = async () => {
    if (!currentProduct?.category) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Try smart recommendations first if user is logged in
      if (userId && useSmartRecommendations) {
        try {
          // Track product view event
          await recommendationsAPI.trackEvent(userId, 'view', currentProduct.id || currentProduct._id);
          
          // Get personalized recommendations
          const response = await recommendationsAPI.getForUser(userId);
          
          if (response.data?.success && response.data.data?.recommendations?.length > 0) {
            const smartRecs = response.data.data.recommendations
              .filter(p => (p.productId || p.id) !== (currentProduct.id || currentProduct._id))
              .slice(0, maxItems);
            
            if (smartRecs.length > 0) {
              // Fetch full product details
              const fullProducts = await Promise.all(
                smartRecs.map(async (rec) => {
                  try {
                    const productId = rec.productId || rec.id;
                    const productResponse = await productsAPI.getById(productId);
                    if (productResponse.data?.success) {
                      return productResponse.data.data;
                    }
                  } catch (error) {
                    console.log('Product detail fetch error:', error);
                  }
                  return null;
                })
              );
              
              const validProducts = fullProducts.filter(p => p !== null);
              
              if (validProducts.length > 0) {
                setRecommendations(validProducts);
                setMatchReason('Size özel AI önerileri');
                setLoading(false);
                return;
              }
            }
          }
        } catch (error) {
          console.log('Smart recommendations failed, falling back to category-based:', error);
          // Fall through to category-based recommendations
        }
      }
      
      // Kategori eşleştirmelerini al
      const { recommendations: categoryList, reason } = getCategoryRecommendations(currentProduct.category);
      setMatchReason(reason);

      if (categoryList.length === 0) {
        // Fallback: Aynı kategoriden ürünler
        await fetchSameCategoryProducts();
        return;
      }

      // Her kategoriden ürün çek - Varyasyon için farklı sayıda
      const allProducts = [];
      const seenIds = new Set(); // Duplicate kontrolü için
      
      // Mevcut ürün ID'sine göre rastgele sayı üreteci oluştur (tutarlı sonuçlar için)
      const currentId = currentProduct.id || currentProduct._id;
      const seed = typeof currentId === 'string' 
        ? currentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        : currentId;
      
      // Her kategoriden farklı sayıda ürün çek (1-3 arası)
      for (let i = 0; i < categoryList.length; i++) {
        const category = categoryList[i];
        // Her kategori için farklı limit (1-3 arası)
        const limit = ((seed + i) % 3) + 1;
        // Her kategori için farklı sayfa (1-3 arası)
        const page = ((seed + i * 2) % 3) + 1;
        
        try {
          const response = await productsAPI.getByCategory(category, { 
            limit,
            page
          });
          
          if (response.data?.success) {
            const products = response.data.data?.products || response.data.products || [];
            // Mevcut ürünü hariç tut ve duplicate kontrolü yap
            const filtered = products.filter(p => {
              const productId = p.id || p._id;
              const currentProductId = currentProduct.id || currentProduct._id;
              
              // Mevcut ürün mü?
              if (productId === currentProductId) return false;
              
              // Daha önce eklendi mi?
              if (seenIds.has(productId)) return false;
              
              // Ekle ve işaretle
              seenIds.add(productId);
              return true;
            });
            
            allProducts.push(...filtered);
          }
        } catch (error) {
          console.log(`Kategori ${category} için ürün çekilemedi:`, error.message);
        }
      }

      // Karıştır ve sınırla - Fisher-Yates shuffle algoritması
      const shuffled = [...allProducts];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      const final = shuffled.slice(0, maxItems);
      
      console.log('🎯 Önerilen ürünler:', final.map(p => ({
        id: p.id || p._id,
        name: p.name,
        category: p.category
      })));
      
      setRecommendations(final);

      // Eğer yeterli ürün bulunamadıysa fallback
      if (final.length < 3) {
        await fetchSameCategoryProducts();
      }
    } catch (error) {
      console.error('Ürün önerileri yüklenemedi:', error);
      await fetchSameCategoryProducts();
    } finally {
      setLoading(false);
    }
  };

  const fetchSameCategoryProducts = async () => {
    try {
      const response = await productsAPI.getByCategory(currentProduct.category, { 
        limit: maxItems,
        page: 1 
      });
      
      if (response.data?.success) {
        const products = response.data.data?.products || response.data.products || [];
        const filtered = products.filter(p => 
          (p.id || p._id) !== (currentProduct.id || currentProduct._id)
        );
        setRecommendations(filtered.slice(0, maxItems));
        setMatchReason('Benzer ürünler');
      }
    } catch (error) {
      console.error('Aynı kategoriden ürünler yüklenemedi:', error);
      setRecommendations([]);
    }
  };

  const handleProductPress = (product) => {
    if (onProductPress) {
      onProductPress(product);
    }
  };

  const getProductImage = (product) => {
    // Ürün görselini al
    if (product.image) return product.image;
    if (product.image1) return product.image1;
    if (product.imageUrl) return product.imageUrl;
    if (product.thumbnail) return product.thumbnail;
    
    // images array
    if (product.images) {
      try {
        const images = typeof product.images === 'string' 
          ? JSON.parse(product.images) 
          : product.images;
        if (Array.isArray(images) && images.length > 0) {
          return typeof images[0] === 'string' ? images[0] : images[0]?.url;
        }
      } catch (e) {
        if (typeof product.images === 'string' && product.images.startsWith('http')) {
          return product.images;
        }
      }
    }
    
    return 'https://via.placeholder.com/200?text=Ürün';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="sparkles" size={20} color={COLORS.primary} />
          <Text style={styles.title}>Size Özel Ürünler</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Öneriler yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={20} color={COLORS.primary} />
          <Text style={styles.title}>Size Özel Ürünler</Text>
        </View>
        {matchReason && (
          <Text style={styles.subtitle}>{matchReason}</Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recommendations.map((product, index) => {
          const productId = product.id || product._id;
          const originalPrice = parseFloat(product.price || 0);
          const discountedPrice = parseFloat(product.discountPrice || product.price || 0);
          const hasDiscount = product.discount && product.discount > 0 && discountedPrice < originalPrice;
          const imageUrl = getProductImage(product);

          return (
            <TouchableOpacity
              key={`recommendation-${productId}-${index}`}
              style={styles.productCard}
              onPress={() => handleProductPress(product)}
              activeOpacity={0.85}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.productImage}
                  resizeMode="cover"
                  defaultSource={require('../../assets/icon.png')}
                />
                {hasDiscount && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>%{product.discount}</Text>
                  </View>
                )}
              </View>

              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>{discountedPrice.toFixed(0)}₺</Text>
                  {hasDiscount && (
                    <Text style={styles.originalPrice}>{originalPrice.toFixed(0)}₺</Text>
                  )}
                </View>

                <View style={styles.bottomRow}>
                  {product.category && (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText} numberOfLines={1}>
                        {product.category}
                      </Text>
                    </View>
                  )}
                  {product.rating && product.rating > 0 && (
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={10} color="#FFA500" />
                      <Text style={styles.rating}>{parseFloat(product.rating).toFixed(1)}</Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity 
                style={styles.addButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleProductPress(product);
                }}
              >
                <Ionicons name="add" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray500,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingRight: 8,
  },
  productCard: {
    width: 150,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.gray100,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  productInfo: {
    padding: 12,
    paddingBottom: 40,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 8,
    lineHeight: 17,
    minHeight: 34,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: '70%',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.gray600 || COLORS.gray500,
    textTransform: 'uppercase',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rating: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  addButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
});
