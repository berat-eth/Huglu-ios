import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import B2BInvoiceCard from '../components/B2BInvoiceCard';

// Mock B2B fatura listesi
const MOCK_B2B_INVOICES = [
  {
    id: 1,
    invoiceNumber: 'B2B-2024-001',
    totalAmount: 15000,
    currency: 'TRY',
    status: 'paid',
    dueDate: '2024-01-15',
    issuedAt: '2024-01-01T10:00:00Z',
    paidAt: '2024-01-10T14:30:00Z',
    orderId: 101,
  },
  {
    id: 2,
    invoiceNumber: 'B2B-2024-002',
    totalAmount: 8500,
    currency: 'TRY',
    status: 'pending',
    dueDate: '2024-02-01',
    issuedAt: '2024-01-20T10:00:00Z',
    paidAt: null,
    orderId: 102,
  },
  {
    id: 3,
    invoiceNumber: 'B2B-2024-003',
    totalAmount: 22000,
    currency: 'TRY',
    status: 'paid',
    dueDate: '2024-01-10',
    issuedAt: '2023-12-25T10:00:00Z',
    paidAt: '2024-01-05T09:15:00Z',
    orderId: 103,
  },
  {
    id: 4,
    invoiceNumber: 'B2B-2024-004',
    totalAmount: 12000,
    currency: 'TRY',
    status: 'overdue',
    dueDate: '2023-12-20',
    issuedAt: '2023-12-01T10:00:00Z',
    paidAt: null,
    orderId: 104,
  },
  {
    id: 5,
    invoiceNumber: 'B2B-2024-005',
    totalAmount: 18500,
    currency: 'TRY',
    status: 'pending',
    dueDate: '2024-02-15',
    issuedAt: '2024-01-25T10:00:00Z',
    paidAt: null,
    orderId: 105,
  },
  {
    id: 6,
    invoiceNumber: 'B2B-2023-120',
    totalAmount: 9500,
    currency: 'TRY',
    status: 'paid',
    dueDate: '2023-12-10',
    issuedAt: '2023-11-25T10:00:00Z',
    paidAt: '2023-12-05T11:20:00Z',
    orderId: 106,
  },
  {
    id: 7,
    invoiceNumber: 'B2B-2023-119',
    totalAmount: 13500,
    currency: 'TRY',
    status: 'paid',
    dueDate: '2023-12-05',
    issuedAt: '2023-11-20T10:00:00Z',
    paidAt: '2023-11-30T15:45:00Z',
    orderId: 107,
  },
  {
    id: 8,
    invoiceNumber: 'B2B-2023-118',
    totalAmount: 16800,
    currency: 'TRY',
    status: 'paid',
    dueDate: '2023-11-25',
    issuedAt: '2023-11-10T10:00:00Z',
    paidAt: '2023-11-20T10:30:00Z',
    orderId: 108,
  },
  {
    id: 9,
    invoiceNumber: 'B2B-2023-117',
    totalAmount: 11200,
    currency: 'TRY',
    status: 'paid',
    dueDate: '2023-11-15',
    issuedAt: '2023-11-01T10:00:00Z',
    paidAt: '2023-11-12T09:00:00Z',
    orderId: 109,
  },
  {
    id: 10,
    invoiceNumber: 'B2B-2023-116',
    totalAmount: 19800,
    currency: 'TRY',
    status: 'paid',
    dueDate: '2023-11-05',
    issuedAt: '2023-10-20T10:00:00Z',
    paidAt: '2023-11-01T14:15:00Z',
    orderId: 110,
  },
];

export default function B2BInvoiceScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Mock veri yükleme simülasyonu
      await new Promise((resolve) => setTimeout(resolve, 600));

      setInvoices(MOCK_B2B_INVOICES);
    } catch (e) {
      console.error('B2B faturaları yüklenemedi:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>B2B Faturalar</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      {loading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <B2BInvoiceCard invoice={item} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Henüz fatura bulunmuyor.</Text>
          }
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
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.gray600,
    textAlign: 'center',
    marginTop: 20,
  },
});

