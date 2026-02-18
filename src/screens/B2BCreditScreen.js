import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import B2BCreditCard from '../components/B2BCreditCard';

// Mock kredi özeti
const MOCK_CREDIT_SUMMARY = {
  accountId: 1,
  companyName: 'Örnek Ticaret A.Ş.',
  creditLimit: 50000,
  creditUsed: 12500,
  creditRemaining: 37500,
  paymentTerms: 'cash',
  status: 'active',
};

// Mock kredi işlem geçmişi
const MOCK_CREDIT_TRANSACTIONS = [
  { id: 1, type: 'debit', amount: 15000, description: 'Sipariş #B2B-2024-001', relatedOrderId: 101, createdAt: '2024-01-15T10:30:00Z' },
  { id: 2, type: 'credit', amount: 5000, description: 'Ödeme - Havale', relatedOrderId: null, createdAt: '2024-01-10T14:20:00Z' },
  { id: 3, type: 'debit', amount: 8500, description: 'Sipariş #B2B-2024-002', relatedOrderId: 102, createdAt: '2024-01-08T09:15:00Z' },
  { id: 4, type: 'credit', amount: 15000, description: 'Ödeme - EFT', relatedOrderId: 101, createdAt: '2024-01-05T16:45:00Z' },
  { id: 5, type: 'debit', amount: 22000, description: 'Sipariş #B2B-2024-003', relatedOrderId: 103, createdAt: '2024-01-01T11:00:00Z' },
  { id: 6, type: 'credit', amount: 10000, description: 'Ödeme - Kredi Kartı', relatedOrderId: null, createdAt: '2023-12-28T13:30:00Z' },
  { id: 7, type: 'debit', amount: 12000, description: 'Sipariş #B2B-2024-004', relatedOrderId: 104, createdAt: '2023-12-25T10:00:00Z' },
  { id: 8, type: 'credit', amount: 8000, description: 'Ödeme - Havale', relatedOrderId: 102, createdAt: '2023-12-20T15:20:00Z' },
  { id: 9, type: 'debit', amount: 18500, description: 'Sipariş #B2B-2024-005', relatedOrderId: 105, createdAt: '2023-12-15T09:45:00Z' },
  { id: 10, type: 'credit', amount: 12000, description: 'Ödeme - EFT', relatedOrderId: 104, createdAt: '2023-12-10T12:00:00Z' },
  { id: 11, type: 'debit', amount: 9500, description: 'Sipariş #B2B-2023-120', relatedOrderId: 106, createdAt: '2023-12-05T14:30:00Z' },
  { id: 12, type: 'credit', amount: 18500, description: 'Ödeme - Kredi Kartı', relatedOrderId: 105, createdAt: '2023-12-01T10:15:00Z' },
];

export default function B2BCreditScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Mock veri yükleme simülasyonu
      await new Promise((resolve) => setTimeout(resolve, 600));

      setSummary(MOCK_CREDIT_SUMMARY);
      setTransactions(MOCK_CREDIT_TRANSACTIONS);
    } catch (e) {
      console.error('B2B kredi bilgisi yüklenemedi:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Kredi Yönetimi</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.txRow}>
      <View>
        <Text style={styles.txType}>{item.type === 'debit' ? 'Borç' : 'Alacak'}</Text>
        {item.description && <Text style={styles.txDesc}>{item.description}</Text>}
        <Text style={styles.txDate}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
      <Text style={[styles.txAmount, item.type === 'debit' ? styles.txDebit : styles.txCredit]}>
        {item.type === 'debit' ? '-' : '+'}
        {Number(item.amount || 0).toFixed(2)}₺
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      {loading && !summary ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <>
          {summary && (
            <View style={styles.summaryWrapper}>
              <B2BCreditCard creditLimit={summary.creditLimit} creditUsed={summary.creditUsed} />
            </View>
          )}
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>İşlem Geçmişi</Text>
          </View>
          <FlatList
            data={transactions}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Henüz kredi işlemi bulunmuyor.</Text>
            }
          />
        </>
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
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryWrapper: {
    padding: 16,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  txType: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  txDesc: {
    fontSize: 12,
    color: COLORS.gray600,
  },
  txDate: {
    fontSize: 11,
    color: COLORS.gray500,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  txDebit: {
    color: COLORS.error,
  },
  txCredit: {
    color: COLORS.success,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.gray600,
    textAlign: 'center',
    marginTop: 20,
  },
});

