import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, ActivityIndicator, RefreshControl, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import ProductCard from '../components/ProductCard';
import { COLORS } from '../constants/colors';
import { productsAPI, wishlistAPI, flashDealsAPI } from '../services/api';
import voiceRecognitionService from '../services/voiceRecognition';
import LoginRequiredModal from '../components/LoginRequiredModal';
import safeLog from '../utils/safeLogger';
import { useAlert } from '../hooks/useAlert';

const SORT_OPTIONS = [
  { id: 'default', label: 'Varsayılan', icon: 'list-outline' },
  { id: 'price-asc', label: 'Fiyat: Düşükten Yükseğe', icon: 'arrow-up-outline' },
  { id: 'price-desc', label: 'Fiyat: Yüksekten Düşüğe', icon: 'arrow-down-outline' },
  { id: 'name-asc', label: 'İsim: A-Z', icon: 'text-outline' },
  { id: 'name-desc', label: 'İsim: Z-A', icon: 'text-outline' },
  { id: 'newest', label: 'En Yeni', icon: 'time-outline' },
];

export default function ProductListScreen({ navigation, route }) {
  const alert = useAlert();
  const [selectedCategory, setSelectedCategory] = useState(route?.params?.category || 'Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [categories, setCategories] = useState(['Tümü']);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState('default');
  const [isListening, setIsListening] = useState(false);
  const [userId, setUserId] = useState('');
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    brands: [],
    colors: [],
    inStock: false,
  });
  const [availableBrands, setAvailableBrands] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  const [savedFilters, setSavedFilters] = useState([]);
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
  const [filterName, setFilterName] = useState('');

  useEffect(() => {
    loadInitialData();
    loadUserId();
    loadSavedFilters();
    // Route parametresinden kategori varsa seç
    if (route?.params?.category) {
      setSelectedCategory(route.params.category);
    }
  }, [route?.params?.category]);

  useEffect(() => {
    // Ürünler yüklendiğinde marka ve renk listelerini oluştur
    if (products.length > 0) {
      const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
      const colors = [...new Set(products.map(p => p.color).filter(Boolean))].sort();
      setAvailableBrands(brands);
      setAvailableColors(colors);
    }
  }, [products]);

  const loadSavedFilters = async () => {
    try {
      const saved = await secureStorage.getItem('savedFilters');
      if (saved) {
        setSavedFilters(JSON.parse(saved));
      }
    } catch (error) {
      console.log('Saved filters load error:', error);
    }
  };

  const saveFilter = async () => {
    if (!filterName.trim()) {
      alert.show('Hata', 'Lütfen filtre için bir isim girin');
      return;
    }

    try {
      const newSavedFilter = {
        id: Date.now().toString(),
        name: filterName.trim(),
        filters: { ...filters },
        createdAt: new Date().toISOString(),
      };

      const updated = [...savedFilters, newSavedFilter];
      setSavedFilters(updated);
      await secureStorage.setItem('savedFilters', JSON.stringify(updated));
      setShowSaveFilterModal(false);
      setFilterName('');
      alert.show('Başarılı', 'Filtre kaydedildi');
    } catch (error) {
      console.error('Save filter error:', error);
      alert.show('Hata', 'Filtre kaydedilemedi');
    }
  };

  const loadSavedFilter = (savedFilter) => {
    setFilters(savedFilter.filters);
    setShowFilterModal(true);
  };

  const deleteSavedFilter = async (filterId) => {
    try {
      const updated = savedFilters.filter(f => f.id !== filterId);
      setSavedFilters(updated);
      await secureStorage.setItem('savedFilters', JSON.stringify(updated));
      alert.show('Başarılı', 'Filtre silindi');
    } catch (error) {
      console.error('Delete filter error:', error);
      alert.show('Hata', 'Filtre silinemedi');
    }
  };

  const clearFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      brands: [],
      colors: [],
      inStock: false,
    });
  };

  const hasActiveFilters = () => {
    return filters.minPrice || filters.maxPrice || filters.brands.length > 0 || 
           filters.colors.length > 0 || filters.inStock;
  };

  const loadUserId = async () => {
    const storedUserId = await secureStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  };

  const loadInitialData = async () => {
    await Promise.all([loadCategories(), loadProducts()]);
  };

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await productsAPI.getCategories();
      if (response.data && response.data.success) {
        // Backend direkt string array döndürüyor: { success: true, data: ['Kategori1', 'Kategori2', ...] }
        const categoriesData = response.data.data || [];
        const names = categoriesData
          .filter(cat => cat && typeof cat === 'string' && cat.trim() !== '')
          .map(cat => cat.trim());
        const uniq = Array.from(new Set(names));
        setCategories(['Tümü', ...uniq]);
        
        // Route parametresinden kategori varsa onu kullan, yoksa mevcut seçili kategoriyi kontrol et
        const categoryToSet = route?.params?.category || selectedCategory;
        if (['Tümü', ...uniq].includes(categoryToSet)) {
          setSelectedCategory(categoryToSet);
        } else {
          setSelectedCategory('Tümü');
        }
      } else {
        safeLog.warn('Categories response not successful:', response.data);
        setCategories(['Tümü']);
        setSelectedCategory(route?.params?.category || 'Tümü');
      }
    } catch (error) {
      safeLog.error('Kategoriler yüklenemedi:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      setCategories(['Tümü']);
      setSelectedCategory(route?.params?.category || 'Tümü');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);

      const pageSize = 100;
      let page = 1;
      let all = [];
      let hasMore = true;
      let safety = 0;

      while (hasMore && safety < 10) {
        const response = await productsAPI.getAll({ page, limit: pageSize });

        if (!response.data?.success) {
          break;
        }

        const payload = response.data.data ?? response.data ?? {};
        let productsData = [];

        if (Array.isArray(payload)) {
          productsData = payload;
        } else if (Array.isArray(payload.products)) {
          productsData = payload.products;
        } else if (Array.isArray(payload.items)) {
          productsData = payload.items;
        } else if (Array.isArray(payload.rows)) {
          productsData = payload.rows;
        } else if (Array.isArray(payload.data)) {
          productsData = payload.data;
        }

        // concat unique by id/_id
        const existingIds = new Set(all.map((p) => p.id || p._id));
        const merged = [
          ...all,
          ...productsData.filter((p) => {
            const pid = p.id || p._id;
            if (!pid) return true;
            if (existingIds.has(pid)) return false;
            existingIds.add(pid);
            return true;
          }),
        ];
        all = merged;

        // hasMore / total kontrolü
        const total = Number(payload.total || payload.count || payload.totalCount || 0);
        const backendHasMore = payload.hasMore ?? payload.has_next ?? payload.hasNext;
        if (backendHasMore === false) {
          hasMore = false;
        } else if (total && all.length >= total) {
          hasMore = false;
        } else if (productsData.length < pageSize) {
          hasMore = false;
        } else {
          hasMore = true;
        }

        page += 1;
        safety += 1;
      }

      // Flash deal bilgisini ekle
      try {
        const flashDealsResponse = await flashDealsAPI.getActive();
        if (flashDealsResponse.data?.success) {
          const flashDealsData = flashDealsResponse.data.data || [];
          
          // Tüm flash deal ürünlerinin ID'lerini topla
          const flashDealProductIds = new Set();
          const flashDealMap = new Map(); // productId -> flashDeal info
          
          flashDealsData.forEach(deal => {
            const products = deal.products || [];
            products.forEach(product => {
              const productId = product.id || product._id;
              if (productId) {
                flashDealProductIds.add(productId);
                if (!flashDealMap.has(productId)) {
                  const basePrice = parseFloat(product.price || 0);
                  const discountValue = parseFloat(deal.discount_value || 0);
                  let discountedPrice = basePrice;
                  
                  if (deal.discount_type === 'percentage') {
                    discountedPrice = basePrice * (1 - discountValue / 100);
                  } else {
                    discountedPrice = basePrice - discountValue;
                  }
                  
                  flashDealMap.set(productId, {
                    oldPrice: basePrice,
                    price: Math.max(0, discountedPrice),
                    isFlashDeal: true,
                    dealName: deal.name,
                  });
                }
              }
            });
          });
          
          // Ürünlere flash deal bilgisini ekle
          all = all.map(product => {
            const productId = product.id || product._id;
            if (flashDealMap.has(productId)) {
              const flashDealInfo = flashDealMap.get(productId);
              return {
                ...product,
                ...flashDealInfo,
              };
            }
            return product;
          });
        }
      } catch (flashDealError) {
        safeLog.warn('Flash deals yüklenemedi:', flashDealError.message);
        // Flash deal hatası olsa bile ürünleri göster
      }

      setProducts(all);
      safeLog.debug('Tüm ürünler yüklendi:', all.length, 'ürün');
    } catch (error) {
      safeLog.error('Ürünler yüklenemedi:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCategories(), loadProducts()]);
    setRefreshing(false);
  };

  // Gelişmiş filtreleme
  const filteredProducts = Array.isArray(products) ? products.filter((product) => {
    // Kategori filtresi
    const matchesCategory = selectedCategory === 'Tümü' || product.category === selectedCategory;
    if (!matchesCategory) return false;

    // Arama filtresi
    const matchesSearch = searchQuery === '' || 
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Fiyat filtreleri
    const price = parseFloat(product.price || 0);
    if (filters.minPrice && price < parseFloat(filters.minPrice)) return false;
    if (filters.maxPrice && price > parseFloat(filters.maxPrice)) return false;

    // Marka filtresi
    if (filters.brands.length > 0 && !filters.brands.includes(product.brand)) return false;

    // Renk filtresi
    if (filters.colors.length > 0 && !filters.colors.includes(product.color)) return false;

    // Stok filtresi
    if (filters.inStock && (!product.stock || product.stock <= 0)) return false;

    return true;
  }) : [];

  // Sıralama uygula
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (selectedSort) {
      case 'price-asc':
        return parseFloat(a.price || 0) - parseFloat(b.price || 0);
      case 'price-desc':
        return parseFloat(b.price || 0) - parseFloat(a.price || 0);
      case 'name-asc':
        return (a.name || '').localeCompare(b.name || '', 'tr');
      case 'name-desc':
        return (b.name || '').localeCompare(a.name || '', 'tr');
      case 'newest':
        return (b.id || 0) - (a.id || 0);
      default:
        return 0;
    }
  });

  const handleSortSelect = (sortId) => {
    setSelectedSort(sortId);
    setSortModalVisible(false);
  };

  const toggleFavorite = async (product) => {
    if (!userId) {
      alert.show('Giriş Gerekli', 'Favorilere eklemek için lütfen giriş yapın');
      return;
    }

    try {
      await wishlistAPI.toggle(userId, product.id || product._id);
      
      // Local state'i güncelle
      setProducts(products.map(p => 
        (p.id || p._id) === (product.id || product._id)
          ? { ...p, isFavorite: !p.isFavorite }
          : p
      ));
    } catch (error) {
      safeLog.error('Favori toggle hatası:', error);
    }
  };

  const toggleBrand = (brand) => {
    setFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter(b => b !== brand)
        : [...prev.brands, brand]
    }));
  };

  const toggleColor = (color) => {
    setFilters(prev => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color]
    }));
  };

  const handleVoiceSearch = async () => {
    if (isListening) {
      // Dinleme aktifse durdur
      await voiceRecognitionService.stopListening();
      setIsListening(false);
      return;
    }

    setIsListening(true);

    const success = await voiceRecognitionService.startListening(
      {
        lang: 'tr-TR',
        interimResults: true,
        onPartialResult: (transcript) => {
          safeLog.debug('Kısmi sonuç:', transcript);
        }
      },
      (transcript) => {
        // Final sonuç
        safeLog.debug('Ses tanıma tamamlandı:', transcript);
        setIsListening(false);
        
        if (transcript && transcript.trim().length > 0) {
          setSearchQuery(transcript.trim());
        } else {
          alert.show('Uyarı', 'Ses tanınamadı. Lütfen tekrar deneyin.');
        }
      },
      (error) => {
        // Hata
        safeLog.error('Ses tanıma hatası:', error);
        setIsListening(false);
        
        if (error !== 'İzin verilmedi' && error !== 'Desteklenmiyor') {
          alert.show(
            'Ses Tanıma Hatası',
            'Ses tanıma sırasında bir hata oluştu. Lütfen tekrar deneyin.',
            [{ text: 'Tamam' }]
          );
        }
      }
    );

    if (!success) {
      setIsListening(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tüm Ürünler</Text>
        <TouchableOpacity style={styles.cartButton} onPress={() => navigation.navigate('Cart')}>
          <Ionicons name="cart-outline" size={24} color={COLORS.textMain} />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ürün ara..."
            placeholderTextColor={COLORS.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray400} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={handleVoiceSearch}
            style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
            activeOpacity={0.7}
          >
            {isListening ? (
              <View style={styles.listeningIndicator}>
                <Ionicons name="mic" size={20} color={COLORS.white} />
              </View>
            ) : (
              <Ionicons name="mic-outline" size={20} color={COLORS.gray400} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {isListening && (
        <View style={styles.listeningBanner}>
          <View style={styles.listeningDot} />
          <Text style={styles.listeningText}>Dinleniyor...</Text>
        </View>
      )}

      {/* Categories */}
      <View style={styles.categoriesContainer}>
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
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category)}
              disabled={categoriesLoading}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {sortedProducts.length} Ürün
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]} 
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons 
              name={hasActiveFilters() ? "filter" : "filter-outline"} 
              size={20} 
              color={hasActiveFilters() ? COLORS.white : COLORS.primary} 
            />
            <Text style={[styles.filterText, hasActiveFilters() && styles.filterTextActive]}>
              Filtrele
            </Text>
            {hasActiveFilters() && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {[filters.minPrice || filters.maxPrice, filters.brands.length, filters.colors.length, filters.inStock].filter(Boolean).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortButton} onPress={() => setSortModalVisible(true)}>
            <Text style={styles.sortText}>Sırala</Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Products Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Ürünler yükleniyor...</Text>
        </View>
      ) : sortedProducts.length > 0 ? (
        <FlatList
          data={sortedProducts}
          keyExtractor={(item) => (item.id ?? item._id ?? Math.random()).toString()}
          numColumns={2}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          // Performans optimizasyonları
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          renderItem={({ item }) => (
            <View style={styles.productWrapper}>
              <ProductCard
                product={item}
                onPress={() => navigation.navigate('ProductDetail', { product: item })}
                onFavorite={() => toggleFavorite(item)}
              />
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={COLORS.gray400} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'Arama sonucu bulunamadı' : 'Bu kategoride ürün bulunamadı'}
          </Text>
        </View>
      )}

      {/* Sort Modal */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sıralama</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>
            <View style={styles.sortOptions}>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.sortOption,
                    selectedSort === option.id && styles.sortOptionActive,
                  ]}
                  onPress={() => handleSortSelect(option.id)}
                >
                  <View style={styles.sortOptionLeft}>
                    <Ionicons 
                      name={option.icon} 
                      size={20} 
                      color={selectedSort === option.id ? COLORS.primary : COLORS.gray500} 
                    />
                    <Text
                      style={[
                        styles.sortOptionText,
                        selectedSort === option.id && styles.sortOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {selectedSort === option.id && (
                    <Ionicons name="checkmark" size={24} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Advanced Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gelişmiş Filtreleme</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.filterScrollView}>
              {/* Price Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Fiyat Aralığı (₺)</Text>
                <View style={styles.priceRangeContainer}>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.priceLabel}>Min</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0"
                      keyboardType="numeric"
                      value={filters.minPrice}
                      onChangeText={(text) => setFilters(prev => ({ ...prev, minPrice: text }))}
                    />
                  </View>
                  <Text style={styles.priceSeparator}>-</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.priceLabel}>Max</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="10000"
                      keyboardType="numeric"
                      value={filters.maxPrice}
                      onChangeText={(text) => setFilters(prev => ({ ...prev, maxPrice: text }))}
                    />
                  </View>
                </View>
              </View>

              {/* Brands */}
              {availableBrands.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Marka</Text>
                  <View style={styles.filterChipsContainer}>
                    {availableBrands.map((brand) => (
                      <TouchableOpacity
                        key={brand}
                        style={[
                          styles.filterChip,
                          filters.brands.includes(brand) && styles.filterChipActive
                        ]}
                        onPress={() => toggleBrand(brand)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            filters.brands.includes(brand) && styles.filterChipTextActive
                          ]}
                        >
                          {brand}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Colors */}
              {availableColors.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Renk</Text>
                  <View style={styles.filterChipsContainer}>
                    {availableColors.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.filterChip,
                          filters.colors.includes(color) && styles.filterChipActive
                        ]}
                        onPress={() => toggleColor(color)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            filters.colors.includes(color) && styles.filterChipTextActive
                          ]}
                        >
                          {color}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Stock Filter */}
              <View style={styles.filterSection}>
                <View style={styles.filterSwitchRow}>
                  <View>
                    <Text style={styles.filterSectionTitle}>Sadece Stokta Olanlar</Text>
                    <Text style={styles.filterSwitchDesc}>Yalnızca stokta bulunan ürünleri göster</Text>
                  </View>
                  <Switch
                    value={filters.inStock}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, inStock: value }))}
                    trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                    thumbColor={COLORS.white}
                  />
                </View>
              </View>

              {/* Saved Filters */}
              {savedFilters.length > 0 && (
                <View style={styles.filterSection}>
                  <View style={styles.filterSectionHeader}>
                    <Text style={styles.filterSectionTitle}>Kayıtlı Filtreler</Text>
                  </View>
                  {savedFilters.map((savedFilter) => (
                    <View key={savedFilter.id} style={styles.savedFilterRow}>
                      <TouchableOpacity
                        style={styles.savedFilterButton}
                        onPress={() => loadSavedFilter(savedFilter)}
                      >
                        <Ionicons name="bookmark" size={16} color={COLORS.primary} />
                        <Text style={styles.savedFilterName}>{savedFilter.name}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteSavedFilter(savedFilter.id)}
                        style={styles.deleteSavedFilterButton}
                      >
                        <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Save Filter Button */}
              {hasActiveFilters() && (
                <TouchableOpacity
                  style={styles.saveFilterButton}
                  onPress={() => setShowSaveFilterModal(true)}
                >
                  <Ionicons name="bookmark-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.saveFilterText}>Filtreyi Kaydet</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Filter Actions */}
            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={clearFilters}
                disabled={!hasActiveFilters()}
              >
                <Text style={[styles.clearFilterText, !hasActiveFilters() && styles.clearFilterTextDisabled]}>
                  Temizle
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFilterButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyFilterText}>Uygula</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Save Filter Name Modal */}
      <Modal
        visible={showSaveFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSaveFilterModal(false);
          setFilterName('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.saveFilterModalContent}>
            <Text style={styles.saveFilterModalTitle}>Filtre İsmi</Text>
            <TextInput
              style={styles.saveFilterNameInput}
              placeholder="Örn: Kamp Ürünleri"
              value={filterName}
              onChangeText={setFilterName}
              autoFocus
            />
            <View style={styles.saveFilterModalActions}>
              <TouchableOpacity
                style={styles.saveFilterModalCancel}
                onPress={() => {
                  setShowSaveFilterModal(false);
                  setFilterName('');
                }}
              >
                <Text style={styles.saveFilterModalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveFilterModalSave}
                onPress={saveFilter}
              >
                <Text style={styles.saveFilterModalSaveText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Login Required Modal */}
      <LoginRequiredModal
        visible={showLoginRequiredModal}
        onClose={() => setShowLoginRequiredModal(false)}
        onLogin={() => {
          setShowLoginRequiredModal(false);
          navigation.navigate('Login');
        }}
        message="Favorilere eklemek için lütfen giriş yapın"
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
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    textAlign: 'center',
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  cartBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textMain,
  },
  voiceButton: {
    padding: 4,
  },
  voiceButtonActive: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 6,
  },
  listeningIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listeningBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  listeningText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  categoriesContainer: {
    paddingVertical: 12,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryChip: {
    height: 36,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray500,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    position: 'relative',
    minHeight: 36,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  filterBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 36,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray400,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray400,
    textAlign: 'center',
  },
  productsList: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  productWrapper: {
    width: '50%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  sortOptions: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  sortOptionActive: {
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMain,
  },
  sortOptionTextActive: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  filterModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  filterScrollView: {
    maxHeight: 500,
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray600,
    marginBottom: 6,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textMain,
    backgroundColor: COLORS.white,
  },
  priceSeparator: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray500,
    marginTop: 20,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.white,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMain,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  filterSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterSwitchDesc: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 4,
  },
  savedFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    marginBottom: 8,
  },
  savedFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedFilterName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  deleteSavedFilterButton: {
    padding: 8,
  },
  saveFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
  },
  saveFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filterActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    gap: 12,
  },
  clearFilterButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFilterText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  clearFilterTextDisabled: {
    color: COLORS.gray400,
  },
  applyFilterButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFilterText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  saveFilterModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
  },
  saveFilterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  saveFilterNameInput: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textMain,
    backgroundColor: COLORS.white,
    marginBottom: 20,
  },
  saveFilterModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  saveFilterModalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveFilterModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  saveFilterModalSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveFilterModalSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
