import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { styleAdvisorAPI } from '../services/api';
import { secureStorage } from '../utils/secureStorage';
import { useAlert } from '../hooks/useAlert';

const OCCASIONS = [
  'Kamp & Trekking',
  'Dağcılık',
  'Avcılık',
  'Balıkçılık',
  'Spor Aktiviteleri',
  'Günlük Kullanım',
  'Outdoor Maceralar',
];

const STYLE_PREFERENCES = [
  'Klasik',
  'Modern',
  'Sporcu',
  'Minimalist',
  'Renkli',
  'Doğal Tonlar',
];

export default function StyleAdvisorScreen({ navigation, route }) {
  const alert = useAlert();
  const { product } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [advice, setAdvice] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [selectedOccasion, setSelectedOccasion] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [budget, setBudget] = useState('');
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  useEffect(() => {
    loadUserId();
    if (product) {
      getStyleAdvice();
    }
  }, [product]);

  const loadUserId = async () => {
    try {
      const storedUserId = await secureStorage.getItem('userId');
      setUserId(storedUserId);
    } catch (error) {
      console.log('User ID yüklenemedi:', error);
    }
  };

  const getStyleAdvice = async () => {
    if (!product || (!product.id && !product._id)) {
      alert.show('Hata', 'Ürün bilgisi bulunamadı');
      return;
    }

    try {
      setLoading(true);
      const productId = product.id || product._id;
      if (!productId) {
        alert.show('Hata', 'Ürün ID bulunamadı');
        setLoading(false);
        return;
      }
      
      const response = await styleAdvisorAPI.getRecommendations(
        userId,
        productId,
        selectedStyle,
        selectedOccasion,
        budget || undefined
      );

      if (response.data?.success) {
        setAdvice(response.data.data.advice);
        setSimilarProducts(response.data.data.similarProducts || []);
      } else {
        alert.show('Hata', response.data?.message || 'Stil önerisi alınamadı');
      }
    } catch (error) {
      console.error('Style advisor error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Stil danışmanı şu anda kullanılamıyor';
      alert.show('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleProductPress = async (productId) => {
    if (!productId) return;
    
    try {
      // Fetch product details first
      const { productsAPI } = require('../services/api');
      const response = await productsAPI.getById(productId);
      
      if (response.data?.success && response.data.data) {
        navigation.replace('StyleAdvisor', { product: response.data.data });
      } else {
        navigation.replace('StyleAdvisor', { product: { id: productId } });
      }
    } catch (error) {
      console.log('Product fetch error:', error);
      navigation.replace('StyleAdvisor', { product: { id: productId } });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ürün Bilgisi ve Stil Önerileri</Text>
        <TouchableOpacity 
          onPress={() => setShowFiltersModal(true)}
          style={styles.filterButton}
        >
          <Ionicons name="options-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Info */}
        {product && (product.id || product._id) && (
          <View style={styles.productCard}>
            <Image
              source={{ uri: product.image || product.imageUrl || 'https://via.placeholder.com/300' }}
              style={styles.productImage}
              resizeMode="cover"
            />
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name || 'Ürün'}</Text>
              <Text style={styles.productPrice}>
                ₺{product.price ? (typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0).toFixed(2) : '0.00'}
              </Text>
            </View>
          </View>
        )}

        {/* Filters */}
        {(selectedOccasion || selectedStyle || budget) && (
          <View style={styles.filtersContainer}>
            <Text style={styles.filtersTitle}>Aktif Filtreler:</Text>
            <View style={styles.activeFilters}>
              {selectedOccasion && (
                <View style={styles.activeFilterTag}>
                  <Text style={styles.activeFilterText}>{selectedOccasion}</Text>
                  <TouchableOpacity onPress={() => setSelectedOccasion(null)}>
                    <Ionicons name="close-circle" size={16} color={COLORS.gray600} />
                  </TouchableOpacity>
                </View>
              )}
              {selectedStyle && (
                <View style={styles.activeFilterTag}>
                  <Text style={styles.activeFilterText}>{selectedStyle}</Text>
                  <TouchableOpacity onPress={() => setSelectedStyle(null)}>
                    <Ionicons name="close-circle" size={16} color={COLORS.gray600} />
                  </TouchableOpacity>
                </View>
              )}
              {budget && (
                <View style={styles.activeFilterTag}>
                  <Text style={styles.activeFilterText}>Bütçe: ₺{budget}</Text>
                  <TouchableOpacity onPress={() => setBudget('')}>
                    <Ionicons name="close-circle" size={16} color={COLORS.gray600} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* AI Advice */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Stil önerileriniz hazırlanıyor...</Text>
          </View>
        ) : advice ? (
          <View style={styles.adviceCard}>
            <View style={styles.adviceHeader}>
              <Ionicons name="sparkles" size={24} color={COLORS.primary} />
              <Text style={styles.adviceTitle}>AI Ürün Bilgisi ve Stil Önerileri</Text>
            </View>
            <Text style={styles.adviceText}>{advice}</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={getStyleAdvice}
            >
              <Ionicons name="refresh" size={16} color={COLORS.primary} />
              <Text style={styles.refreshButtonText}>Yeniden Oluştur</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="color-palette-outline" size={64} color={COLORS.gray300} />
            <Text style={styles.emptyTitle}>Ürün Bilgisi ve Stil Önerileri</Text>
            <Text style={styles.emptySubtitle}>
              Bir ürün seçerek AI destekli stil önerileri alabilirsiniz
            </Text>
          </View>
        )}

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <View style={styles.similarSection}>
            <Text style={styles.similarTitle}>Benzer Ürünler</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {similarProducts.map((item) => {
                const itemId = item.id || item.productId || item._id;
                return (
                  <TouchableOpacity
                    key={itemId}
                    style={styles.similarProductCard}
                    onPress={() => handleProductPress(itemId)}
                  >
                    <Image
                      source={{ uri: item.image || 'https://via.placeholder.com/200' }}
                      style={styles.similarProductImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.similarProductName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.similarProductPrice}>
                      ₺{item.price ? (typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0).toFixed(2) : '0.00'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Filters Modal */}
      <Modal
        visible={showFiltersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowFiltersModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtreler</Text>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Kullanım Amacı</Text>
                <View style={styles.filterOptions}>
                  {OCCASIONS.map((occasion) => (
                    <TouchableOpacity
                      key={occasion}
                      style={[
                        styles.filterOption,
                        selectedOccasion === occasion && styles.filterOptionSelected,
                      ]}
                      onPress={() => setSelectedOccasion(occasion === selectedOccasion ? null : occasion)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedOccasion === occasion && styles.filterOptionTextSelected,
                        ]}
                      >
                        {occasion}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Stil Tercihi</Text>
                <View style={styles.filterOptions}>
                  {STYLE_PREFERENCES.map((style) => (
                    <TouchableOpacity
                      key={style}
                      style={[
                        styles.filterOption,
                        selectedStyle === style && styles.filterOptionSelected,
                      ]}
                      onPress={() => setSelectedStyle(style === selectedStyle ? null : style)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedStyle === style && styles.filterOptionTextSelected,
                        ]}
                      >
                        {style}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Bütçe (₺)</Text>
                <TextInput
                  style={styles.budgetInput}
                  placeholder="Maksimum bütçe"
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.gray400}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  setShowFiltersModal(false);
                  if (product) {
                    getStyleAdvice();
                  }
                }}
              >
                <Text style={styles.applyButtonText}>Uygula</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 200,
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  filtersContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
    marginBottom: 12,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.gray50,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  activeFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMain,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.gray500,
  },
  adviceCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  adviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  adviceText: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.textMain,
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: 20,
  },
  similarSection: {
    marginTop: 16,
    marginBottom: 32,
  },
  similarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  similarProductCard: {
    width: 160,
    marginLeft: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  similarProductImage: {
    width: '100%',
    height: 120,
  },
  similarProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
    padding: 12,
    paddingBottom: 4,
  },
  similarProductPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  modalContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  filterOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMain,
  },
  filterOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  budgetInput: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.textMain,
    backgroundColor: COLORS.white,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
