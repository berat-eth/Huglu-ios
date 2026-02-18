import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonBox, SkeletonCircle, SkeletonLine } from './SkeletonLoader';
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

export default function HomeScreenSkeleton() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Skeleton */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <SkeletonCircle size={48} />
            <View style={styles.userTextContainer}>
              <SkeletonLine width={80} height={12} style={styles.mb4} />
              <SkeletonLine width={120} height={18} />
            </View>
          </View>
          <View style={styles.headerActions}>
            <SkeletonCircle size={40} style={styles.mr8} />
            <SkeletonCircle size={40} />
          </View>
        </View>

        {/* Search Bar Skeleton */}
        <View style={styles.searchContainer}>
          <SkeletonBox width="100%" height={48} borderRadius={12} />
        </View>

        {/* Hero Carousel Skeleton */}
        <View style={styles.carouselContainer}>
          <SkeletonBox width={320} height={200} borderRadius={16} />
        </View>

        {/* Categories Skeleton */}
        <View style={styles.section}>
          <SkeletonLine width={120} height={20} style={styles.sectionTitle} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {[1, 2, 3, 4, 5].map((item) => (
              <SkeletonBox
                key={item}
                width={100}
                height={40}
                borderRadius={20}
                style={styles.categoryChip}
              />
            ))}
          </ScrollView>
        </View>

        {/* Products Section Skeleton */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SkeletonLine width={100} height={20} />
            <SkeletonLine width={80} height={14} />
          </View>
          <View style={styles.productsGrid}>
            {[1, 2, 3, 4].map((item) => (
              <View key={item} style={styles.productWrapper}>
                <ProductCardSkeleton />
              </View>
            ))}
          </View>
        </View>

        {/* Promo Banner Skeleton */}
        <View style={styles.promoBanner}>
          <SkeletonBox width="100%" height={180} borderRadius={16} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ProductCardSkeleton = () => {
  return (
    <View style={styles.productCard}>
      <SkeletonBox width="100%" height={160} borderRadius={12} style={styles.mb8} />
      <SkeletonLine width="90%" height={16} style={styles.mb4} />
      <SkeletonLine width="60%" height={14} style={styles.mb8} />
      <View style={styles.productFooter}>
        <SkeletonLine width={60} height={18} />
        <SkeletonCircle size={32} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userTextContainer: {
    gap: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  carouselContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    paddingVertical: 16,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryChip: {
    marginRight: 8,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  productWrapper: {
    width: '50%',
    padding: 8,
  },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoBanner: {
    marginHorizontal: 16,
    marginVertical: 16,
  },
  mb4: {
    marginBottom: 4,
  },
  mb8: {
    marginBottom: 8,
  },
  mr8: {
    marginRight: 8,
  },
});
