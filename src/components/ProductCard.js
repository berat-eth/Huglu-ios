import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const ProductCard = memo(function ProductCard({ product, onPress, onFavorite }) {
  // Stok durumunu kontrol et
  const isOutOfStock = product.stock === 0 || 
                       product.stock === '0' || 
                       product.inStock === false || 
                       product.inStock === 0 ||
                       product.stockStatus === 'out_of_stock' ||
                       product.stockStatus === 'outofstock';
  
  // Stok sayısını kontrol et (10'dan az ise sınırlı stok)
  const stockQuantity = parseInt(product.stock) || 0;
  const isLimitedStock = !isOutOfStock && stockQuantity > 0 && stockQuantity < 10;
  
  // Flash indirim kontrolü
  const isFlashDeal = product.isFlashDeal || (product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.price));

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.95}>
      <View style={styles.imageContainer}>
        <Image 
          source={{ 
            uri: product.image || product.imageUrl || product.thumbnail || 'https://via.placeholder.com/300?text=Ürün',
            cache: 'force-cache' // Agresif cache stratejisi
          }} 
          style={styles.image}
          resizeMode="cover"
          defaultSource={require('../../assets/icon.png')}
        />
        {/* Stokta Yok Badge */}
        {isOutOfStock && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>STOKTA YOK</Text>
          </View>
        )}
        {/* Flash İndirim Badge - Alt kısımda göster */}
        {!isOutOfStock && isFlashDeal && (
          <View style={styles.flashDealBadge}>
            <Ionicons name="flash" size={12} color={COLORS.white} style={styles.flashIcon} />
            <Text style={styles.flashDealText}>FLASH</Text>
          </View>
        )}
        {/* Diğer Badge'ler (sadece stokta varsa ve flash deal değilse göster) */}
        {!isOutOfStock && !isFlashDeal && product.badge && (
          <View style={[styles.badge, product.badge === 'NEW' && styles.badgeNew]}>
            <Text style={styles.badgeText}>{product.badge}</Text>
          </View>
        )}
        {/* Sınırlı Stok Badge - Sol üst köşe (çapraz) */}
        {isLimitedStock && (
          <View style={styles.limitedStockBadge}>
            <Ionicons name="alarm-outline" size={12} color={COLORS.white} style={styles.limitedStockIcon} />
            <Text style={styles.limitedStockText}>SINIRLI STOK</Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.favoriteButton} 
          onPress={onFavorite} 
          activeOpacity={0.8}
        >
          <Ionicons
            name={product.isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={product.isFavorite ? COLORS.error : COLORS.textMain}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <View style={styles.priceContainer}>
          {isFlashDeal && product.oldPrice ? (
            <>
              <Text style={styles.flashPrice}>
                {parseFloat(product.price || 0).toFixed(0)}<Text style={styles.priceSymbol}>₺</Text>
              </Text>
              <Text style={styles.oldPrice}>
                {parseFloat(product.oldPrice).toFixed(0)}₺
              </Text>
            </>
          ) : (
            <Text style={styles.price}>
              {parseFloat(product.price || 0).toFixed(0)}<Text style={styles.priceSymbol}>₺</Text>
            </Text>
          )}
          {!isFlashDeal && product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.price) && (
            <Text style={styles.oldPrice}>
              {parseFloat(product.oldPrice).toFixed(0)}₺
            </Text>
          )}
        </View>
        {isFlashDeal && product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.price) && (
          <View style={styles.flashDiscountBadge}>
            <Text style={styles.flashDiscountText}>
              %{Math.round(((parseFloat(product.oldPrice) - parseFloat(product.price)) / parseFloat(product.oldPrice)) * 100)} İndirim
            </Text>
          </View>
        )}
        {!isFlashDeal && product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.price) && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              %{Math.round(((parseFloat(product.oldPrice) - parseFloat(product.price)) / parseFloat(product.oldPrice)) * 100)} İndirim
            </Text>
          </View>
        )}
        <Text style={styles.category}>{product.category || product.brand || 'Ürün'}</Text>
        {product.rating && product.rating > 0 && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFC107" />
            <Text style={styles.ratingText}>{parseFloat(product.rating).toFixed(1)}</Text>
            {product.reviewCount && (
              <Text style={styles.reviewCount}>({product.reviewCount})</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Sadece product veya callback'ler değiştiğinde re-render
  return (
    prevProps.product?.id === nextProps.product?.id &&
    prevProps.product?.isFavorite === nextProps.product?.isFavorite &&
    prevProps.product?.price === nextProps.product?.price &&
    prevProps.product?.stock === nextProps.product?.stock &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.onFavorite === nextProps.onFavorite
  );
});

export default ProductCard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 8,
    backgroundColor: 'transparent',
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 4 / 5,
    backgroundColor: COLORS.gray100,
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(17, 212, 33, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeNew: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  flashDealBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(255, 87, 34, 0.95)', // Turuncu/kırmızı flash renk
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  flashIcon: {
    marginRight: 2,
  },
  flashDealText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  outOfStockText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  limitedStockBadge: {
    position: 'absolute',
    top: 16, // Biraz daha aşağıya indirildi
    left: 8,
    backgroundColor: 'rgba(245, 105, 11, 0.95)', // Turuncu/sarı renk
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 2,
    // Düz rozet görünümü (çapraz/rotate kaldırıldı)
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  limitedStockIcon: {
    marginRight: 2,
  },
  limitedStockText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 3, // Favori butonu en üstte olmalı
  },
  content: {
    paddingTop: 12,
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    lineHeight: 22,
  },
  flashPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ef4444', // Kırmızı renk flash indirim için
    lineHeight: 22,
  },
  priceSymbol: {
    fontSize: 14,
    fontWeight: '700',
  },
  oldPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  flashDiscountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ff5722', // Daha parlak turuncu/kırmızı flash için
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ff8a65',
  },
  flashDiscountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  category: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.gray500,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  reviewCount: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.gray400,
  },
});
