import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function B2BInvoiceCard({ invoice }) {
  if (!invoice) return null;

  const {
    invoiceNumber,
    totalAmount,
    currency = 'TRY',
    status,
    issuedAt,
    dueDate,
  } = invoice;

  const statusConfig = {
    paid: { label: 'Ödendi', color: COLORS.success, icon: 'checkmark-circle' },
    overdue: { label: 'Gecikmiş', color: COLORS.error, icon: 'alert-circle' },
    cancelled: { label: 'İptal', color: COLORS.gray500, icon: 'close-circle' },
    pending: { label: 'Beklemede', color: COLORS.warning, icon: 'time' },
  };

  const cfg = statusConfig[status] || statusConfig.pending;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.invoiceNumber}>#{invoiceNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${cfg.color}20` }]}>
          <Ionicons name={cfg.icon} size={14} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <Text style={styles.amount}>
        {Number(totalAmount || 0).toFixed(2)} {currency}
      </Text>
      <View style={styles.metaRow}>
        {issuedAt && <Text style={styles.metaText}>Düzenlenme: {new Date(issuedAt).toLocaleDateString()}</Text>}
        {dueDate && <Text style={styles.metaText}>Vade: {new Date(dueDate).toLocaleDateString()}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 11,
    color: COLORS.gray600,
  },
});

