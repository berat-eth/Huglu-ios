import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export default function B2BPriceDisplay({ retailPrice, b2bPrice, minQuantity, maxQuantity }) {
  if (!b2bPrice) {
    return (
      <View style={styles.container}>
        <Text style={styles.retailLabel}>Perakende</Text>
        <Text style={styles.retailPrice}>{retailPrice?.toFixed ? `${retailPrice.toFixed(2)}₺` : `${retailPrice}₺`}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>B2B</Text>
        </View>
        <Text style={styles.b2bPrice}>{b2bPrice?.toFixed ? `${b2bPrice.toFixed(2)}₺` : `${b2bPrice}₺`}</Text>
      </View>
      <Text style={styles.quantityRange}>
        {minQuantity || 1}+ adet{maxQuantity ? ` • max ${maxQuantity}` : ''}
      </Text>
      {retailPrice && (
        <Text style={styles.retailInfo}>
          Perakende: {retailPrice?.toFixed ? `${retailPrice.toFixed(2)}₺` : `${retailPrice}₺`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: `${COLORS.primary}20`,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  b2bPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  quantityRange: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 2,
  },
  retailInfo: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 2,
  },
  retailLabel: {
    fontSize: 12,
    color: COLORS.gray600,
  },
  retailPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
});

