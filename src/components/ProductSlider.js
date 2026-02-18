import React, { memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from './ProductCard';
import { COLORS } from '../constants/colors';

const ProductSlider = memo(function ProductSlider({ title, products, onSeeAll, onProductPress, onFavorite }) {
  const handleProductPress = (product) => {
    if (onProductPress) {
      onProductPress(product);
    }
  };
  if (!products || products.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>Tümünü Gör</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {products.map((product) => (
          <View key={product.id} style={styles.productWrapper}>
            <ProductCard
              product={product}
              onPress={() => handleProductPress(product)}
              onFavorite={() => onFavorite(product)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}, (prevProps, nextProps) => {
  // Sadece products değiştiğinde re-render
  if (prevProps.products?.length !== nextProps.products?.length) {
    return false;
  }
  // Products array içeriği değişmiş mi kontrol et
  const prevIds = prevProps.products?.map(p => p.id || p._id).join(',') || '';
  const nextIds = nextProps.products?.map(p => p.id || p._id).join(',') || '';
  return prevIds === nextIds && prevProps.title === nextProps.title;
});

export default ProductSlider;

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  productWrapper: {
    width: 160,
  },
});
