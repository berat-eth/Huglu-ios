import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export default function B2BCreditCard({ creditLimit = 0, creditUsed = 0 }) {
  const limit = Number(creditLimit) || 0;
  const used = Number(creditUsed) || 0;
  const remaining = Math.max(limit - used, 0);
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Kredi Durumu</Text>
      <View style={styles.row}>
        <View style={styles.valueColumn}>
          <Text style={styles.label}>Limit</Text>
          <Text style={styles.value}>{limit.toFixed(2)}₺</Text>
        </View>
        <View style={styles.valueColumn}>
          <Text style={styles.label}>Kullanılan</Text>
          <Text style={styles.value}>{used.toFixed(2)}₺</Text>
        </View>
        <View style={styles.valueColumn}>
          <Text style={styles.label}>Kalan</Text>
          <Text style={styles.value}>{remaining.toFixed(2)}₺</Text>
        </View>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.helperText}>
        {limit > 0 ? `%${percentage.toFixed(0)} limit kullanıldı` : 'Henüz kredi limiti tanımlanmadı'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  valueColumn: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: COLORS.gray600,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.gray100,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 6,
  },
});

