import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import B2BPriceDisplay from '../components/B2BPriceDisplay';

// Mock B2B ürün listesi
const MOCK_B2B_PRODUCTS = [
  { id: 1, name: 'Outdoor Su Geçirmez Mont', description: 'Premium outdoor mont', retailPrice: 899.99, b2bPrice: 650.00, minQuantity: 10, maxQuantity: null, stock: 150 },
  { id: 2, name: 'Kamp Çadırı 4 Kişilik', description: 'Dayanıklı kamp çadırı', retailPrice: 1299.99, b2bPrice: 950.00, minQuantity: 5, maxQuantity: null, stock: 80 },
  { id: 3, name: 'Trekking Botu', description: 'Rahat trekking botu', retailPrice: 599.99, b2bPrice: 420.00, minQuantity: 15, maxQuantity: null, stock: 200 },
  { id: 4, name: 'Polar Bere', description: 'Sıcak tutan polar bere', retailPrice: 89.99, b2bPrice: 60.00, minQuantity: 20, maxQuantity: null, stock: 300 },
  { id: 5, name: 'Uyku Tulumu -5°C', description: 'Soğuk hava uyku tulumu', retailPrice: 449.99, b2bPrice: 320.00, minQuantity: 10, maxQuantity: null, stock: 120 },
  { id: 6, name: 'Kamp Ocağı', description: 'Portatif kamp ocağı', retailPrice: 199.99, b2bPrice: 140.00, minQuantity: 25, maxQuantity: null, stock: 180 },
  { id: 7, name: 'Sırt Çantası 50L', description: 'Büyük kapasiteli sırt çantası', retailPrice: 349.99, b2bPrice: 250.00, minQuantity: 12, maxQuantity: null, stock: 90 },
  { id: 8, name: 'Matara 1L', description: 'Paslanmaz çelik matara', retailPrice: 79.99, b2bPrice: 55.00, minQuantity: 30, maxQuantity: null, stock: 250 },
  { id: 9, name: 'Fener LED', description: 'Güçlü LED fener', retailPrice: 129.99, b2bPrice: 90.00, minQuantity: 20, maxQuantity: null, stock: 150 },
  { id: 10, name: 'Yağmurluk', description: 'Su geçirmez yağmurluk', retailPrice: 249.99, b2bPrice: 180.00, minQuantity: 15, maxQuantity: null, stock: 110 },
  { id: 11, name: 'Kamp Sandalyesi', description: 'Katlanabilir kamp sandalyesi', retailPrice: 179.99, b2bPrice: 130.00, minQuantity: 10, maxQuantity: null, stock: 95 },
  { id: 12, name: 'Termos 750ml', description: 'Vakumlu termos', retailPrice: 159.99, b2bPrice: 115.00, minQuantity: 18, maxQuantity: null, stock: 140 },
  { id: 13, name: 'Çakı Multi Tool', description: 'Çok amaçlı çakı', retailPrice: 89.99, b2bPrice: 65.00, minQuantity: 25, maxQuantity: null, stock: 200 },
  { id: 14, name: 'GPS Saati', description: 'Outdoor GPS saati', retailPrice: 799.99, b2bPrice: 580.00, minQuantity: 8, maxQuantity: null, stock: 45 },
  { id: 15, name: 'Kamp Masası', description: 'Portatif kamp masası', retailPrice: 299.99, b2bPrice: 220.00, minQuantity: 10, maxQuantity: null, stock: 70 },
  { id: 16, name: 'Isıtıcı Yelek', description: 'USB şarjlı ısıtıcı yelek', retailPrice: 399.99, b2bPrice: 290.00, minQuantity: 12, maxQuantity: null, stock: 85 },
  { id: 17, name: 'Kamp Feneri', description: 'Güneş enerjili kamp feneri', retailPrice: 149.99, b2bPrice: 105.00, minQuantity: 15, maxQuantity: null, stock: 100 },
  { id: 18, name: 'Su Filtresi', description: 'Portatif su filtresi', retailPrice: 219.99, b2bPrice: 160.00, minQuantity: 10, maxQuantity: null, stock: 60 },
  { id: 19, name: 'Kamp Tüpü', description: 'Gaz tüpü kamp ocağı için', retailPrice: 39.99, b2bPrice: 28.00, minQuantity: 50, maxQuantity: null, stock: 400 },
  { id: 20, name: 'Trekking Çubukları', description: 'Alüminyum trekking çubukları', retailPrice: 179.99, b2bPrice: 130.00, minQuantity: 12, maxQuantity: null, stock: 130 },
  { id: 21, name: 'Kamp Lambası', description: 'LED kamp lambası', retailPrice: 119.99, b2bPrice: 85.00, minQuantity: 20, maxQuantity: null, stock: 160 },
  { id: 22, name: 'Su Geçirmez Çanta', description: 'Dry bag su geçirmez çanta', retailPrice: 89.99, b2bPrice: 65.00, minQuantity: 25, maxQuantity: null, stock: 220 },
  { id: 23, name: 'Kamp Bıçağı', description: 'Dayanıklı kamp bıçağı', retailPrice: 199.99, b2bPrice: 145.00, minQuantity: 15, maxQuantity: null, stock: 75 },
  { id: 24, name: 'GPS Cihazı', description: 'Handheld GPS cihazı', retailPrice: 1299.99, b2bPrice: 950.00, minQuantity: 5, maxQuantity: null, stock: 30 },
  { id: 25, name: 'Kamp Mutfak Seti', description: 'Komple kamp mutfak seti', retailPrice: 249.99, b2bPrice: 180.00, minQuantity: 10, maxQuantity: null, stock: 55 },
];

const ITEMS_PER_PAGE = 20;

export default function B2BProductCatalogScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadProducts(1, true);
  }, []);

  const loadProducts = async (pageToLoad = 1, replace = false) => {
    if (loadingMore && !replace) return;
    if (!hasMore && !replace) return;

    try {
      if (replace) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Mock veri yükleme simülasyonu
      await new Promise((resolve) => setTimeout(resolve, 500));

      const startIndex = (pageToLoad - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const items = MOCK_B2B_PRODUCTS.slice(startIndex, endIndex);

      setProducts((prev) => (replace ? items : [...prev, ...items]));
      setHasMore(endIndex < MOCK_B2B_PRODUCTS.length);
      setPage(pageToLoad);
    } catch (error) {
      console.error('B2B ürünleri yüklenemedi:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>B2B Ürün Kataloğu</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <View style={styles.cardContent}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <B2BPriceDisplay
          retailPrice={item.retailPrice}
          b2bPrice={item.b2bPrice}
          minQuantity={item.minQuantity}
          maxQuantity={item.maxQuantity}
        />
        {typeof item.stock === 'number' && (
          <Text style={styles.stockText}>
            Stok: {item.stock}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      {loading && products.length === 0 ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          onEndReached={() => loadProducts(page + 1)}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
        />
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    backgroundColor: COLORS.backgroundLight,
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
  headerSpacer: {
    width: 40,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    marginBottom: 10,
  },
  cardContent: {
    flex: 1,
    paddingRight: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  stockText: {
    fontSize: 11,
    color: COLORS.gray600,
    marginTop: 2,
  },
  footerLoader: {
    paddingVertical: 12,
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

