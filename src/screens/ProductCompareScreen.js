import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { productsAPI, cartAPI } from '../services/api';
import AddToCartSuccessModal from '../components/AddToCartSuccessModal';
import ErrorModal from '../components/ErrorModal';
import SuccessModal from '../components/SuccessModal';

const { width } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - 48) / 2;

export default function ProductCompareScreen({ navigation, route }) {
  const { initialProducts = [] } = route.params || {};
  const [products, setProducts] = useState(initialProducts);
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAddToCartSuccessModal, setShowAddToCartSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadCompareProducts();
  }, []);

  const loadCompareProducts = async () => {
    try {
      const compareList = await secureStorage.getItem('compareProducts');
      if (compareList) {
        const productIds = JSON.parse(compareList);
        if (productIds.length > 0) {
          setLoading(true);
          const loadedProducts = await Promise.all(
            productIds.map(async (id) => {
              try {
                const response = await productsAPI.getById(id);
                return response.data?.data || response.data;
              } catch (error) {
                console.error('Ürün yüklenemedi:', id, error);
                return null;
              }
            })
          );
          setProducts(loadedProducts.filter((p) => p !== null));
        }
      }
    } catch (error) {
      console.error('Karşılaştırma listesi yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeProduct = async (productId) => {
    try {
      const updatedProducts = products.filter((p) => p.id !== productId && p._id !== productId);
      setProducts(updatedProducts);

      const productIds = updatedProducts.map((p) => p.id || p._id);
      await secureStorage.setItem('compareProducts', JSON.stringify(productIds));

      if (updatedProducts.length === 0) {
        setShowInfoModal(true);
      }
    } catch (error) {
      console.error('Ürün kaldırılamadı:', error);
    }
  };

  const addToCart = async (product) => {
    try {
      const userId = await secureStorage.getItem('userId');
      if (!userId) {
        setErrorMessage('Lütfen giriş yapın');
        setShowErrorModal(true);
        return;
      }

      const productId = product.id || product._id;
      
      // İndirimli fiyatı belirle
      let finalPrice = product.price || 0;
      
      // Flash deal kontrolü
      if (product.isFlashDeal) {
        // Flash deal durumunda product.price zaten indirimli fiyat
        finalPrice = product.discountedPrice || product.price || 0;
      } else {
        // Normal indirimli ürün kontrolü
        if (product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.price)) {
          // İndirimli fiyatı kullan
          finalPrice = parseFloat(product.price || 0);
        } else if (product.discountPrice) {
          finalPrice = parseFloat(product.discountPrice || 0);
        } else {
          finalPrice = parseFloat(product.price || 0);
        }
      }
      
      console.log('🛒 Karşılaştırma sayfası sepete ekleme - Ürün ID:', productId, 'İndirimli Fiyat:', finalPrice);
      
      await cartAPI.add(userId, productId, 1, {}, finalPrice);
      
      // Sepet değişti - cache'i bypass etmek için timestamp güncelle
      await secureStorage.setItem('cartLastModified', Date.now().toString());
      
      setShowAddToCartSuccessModal(true);
    } catch (error) {
      console.error('Sepete eklenemedi:', error);
      setErrorMessage('Ürün sepete eklenirken bir hata oluştu');
      setShowErrorModal(true);
    }
  };

  const addAnotherProduct = () => {
    navigation.navigate('ProductList', { selectForCompare: true });
  };

  const getComparisonData = () => {
    if (products.length === 0) return [];

    const specs = [
      { key: 'weight', label: 'Ağırlık', unit: '' },
      { key: 'material', label: 'Malzeme', unit: '' },
      { key: 'waterproof', label: 'Su Geçirmezlik', unit: '' },
      { key: 'soleType', label: 'Taban Tipi', unit: '' },
      { key: 'warranty', label: 'Garanti', unit: '' },
    ];

    return specs.map((spec) => {
      const values = products.map((p) => {
        const value = p[spec.key] || p.specs?.[spec.key] || '-';
        return value;
      });

      const allSame = values.every((v) => v === values[0]);

      return {
        ...spec,
        values,
        isDifferent: !allSame,
      };
    });
  };

  const comparisonData = getComparisonData();
  const filteredData = showDifferencesOnly
    ? comparisonData.filter((item) => item.isDifferent)
    : comparisonData;

  if (products.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Karşılaştır</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="git-compare-outline" size={80} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>Karşılaştırılacak Ürün Yok</Text>
          <Text style={styles.emptySubtitle}>Özelliklerini karşılaştırmak için ürün ekleyin</Text>
          <TouchableOpacity style={styles.addButton} onPress={addAnotherProduct}>
            <Text style={styles.addButtonText}>Ürünlere Göz At</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Karşılaştır</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Toggle Differences */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleLeft}>
            <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
            <Text style={styles.toggleLabel}>Sadece Farklılıkları Göster</Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, showDifferencesOnly && styles.toggleActive]}
            onPress={() => setShowDifferencesOnly(!showDifferencesOnly)}
          >
            <View style={[styles.toggleThumb, showDifferencesOnly && styles.toggleThumbActive]} />
          </TouchableOpacity>
        </View>

        {/* Product Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productsRow}>
          {products.map((product, index) => (
            <View key={product.id || product._id || index} style={styles.productCard}>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeProduct(product.id || product._id)}
              >
                <Ionicons name="close" size={20} color={COLORS.gray600} />
              </TouchableOpacity>
              <Image
                source={{
                  uri:
                    product.image ||
                    product.images?.[0] ||
                    'https://via.placeholder.com/200',
                }}
                style={styles.productImage}
                resizeMode="cover"
              />
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#FFA500" />
                <Text style={styles.ratingText}>{product.rating || '4.5'}</Text>
              </View>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name || product.title || 'Ürün'}
              </Text>
              <Text style={styles.productPrice}>{product.price || '0.00'} ₺</Text>
            </View>
          ))}

          {products.length < 4 && (
            <TouchableOpacity style={styles.addProductCard} onPress={addAnotherProduct}>
              <View style={styles.addProductIcon}>
                <Ionicons name="add" size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.addProductText}>Başka ürün ekle</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Physical Specs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FİZİKSEL ÖZELLİKLER</Text>
          {filteredData.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.comparisonRow,
                item.isDifferent && styles.comparisonRowDifferent,
              ]}
            >
              <View style={styles.specLabelContainer}>
                <Text style={styles.specLabel}>{item.label}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {item.values.map((value, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.specValue,
                      item.isDifferent && idx === 0 && styles.specValueHighlight,
                    ]}
                  >
                    <Text
                      style={[
                        styles.specValueText,
                        item.isDifferent && idx === 0 && styles.specValueTextHighlight,
                      ]}
                    >
                      {value} {item.unit}
                    </Text>
                    {item.isDifferent && idx === 0 && (
                      <View style={styles.checkIcon}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          ))}
        </View>

        {/* Add to Cart Buttons */}
        <View style={styles.cartButtonsContainer}>
          {products.map((product, index) => (
            <TouchableOpacity
              key={product.id || product._id || index}
              style={[
                styles.cartButton,
                index === 0 ? styles.cartButtonPrimary : styles.cartButtonSecondary,
              ]}
              onPress={() => addToCart(product)}
            >
              <Ionicons
                name="cart"
                size={18}
                color={index === 0 ? COLORS.white : COLORS.primary}
              />
              <Text
                style={[
                  styles.cartButtonText,
                  index === 0 ? styles.cartButtonTextPrimary : styles.cartButtonTextSecondary,
                ]}
              >
                Ekle
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
        </ScrollView>

      {/* Add to Cart Success Modal */}
      <AddToCartSuccessModal
        visible={showAddToCartSuccessModal}
        onClose={() => setShowAddToCartSuccessModal(false)}
        onContinueShopping={() => {
          setShowAddToCartSuccessModal(false);
        }}
        onGoToCart={() => {
          setShowAddToCartSuccessModal(false);
          navigation.navigate('Cart');
        }}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorMessage}
      />

      {/* Info Modal */}
      <SuccessModal
        visible={showInfoModal}
        onClose={() => {
          setShowInfoModal(false);
          navigation.goBack();
        }}
        title="Bilgi"
        message="Karşılaştırma listesi boş"
        onActionPress={() => {
          setShowInfoModal(false);
          navigation.goBack();
        }}
      />
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray200,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  productsRow: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  productCard: {
    width: PRODUCT_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    marginBottom: 8,
  },
  ratingBadge: {
    position: 'absolute',
    top: 120,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
    height: 36,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  addProductCard: {
    width: PRODUCT_WIDTH,
    height: 240,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addProductIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  addProductText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  comparisonRow: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  comparisonRowDifferent: {
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  specLabelContainer: {
    marginBottom: 8,
  },
  specLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  specValue: {
    backgroundColor: COLORS.gray50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    minWidth: PRODUCT_WIDTH - 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  specValueHighlight: {
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
  },
  specValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  specValueTextHighlight: {
    color: COLORS.primary,
  },
  checkIcon: {
    marginLeft: 8,
  },
  cartButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  cartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  cartButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  cartButtonSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  cartButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  cartButtonTextPrimary: {
    color: COLORS.white,
  },
  cartButtonTextSecondary: {
    color: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
});
