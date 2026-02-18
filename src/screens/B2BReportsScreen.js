import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

// Mock satış raporu verisi (son 30 gün)
const generateMockSalesReport = () => {
  const sales = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Rastgele sipariş sayısı (1-5 arası)
    const orderCount = Math.floor(Math.random() * 5) + 1;
    // Rastgele toplam tutar (5000-30000 arası)
    const totalAmount = Math.floor(Math.random() * 25000) + 5000;
    
    sales.push({
      date: date.toISOString().split('T')[0],
      orderCount,
      totalAmount,
    });
  }
  
  return sales;
};

const MOCK_SALES_REPORT = generateMockSalesReport();

export default function B2BReportsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Mock veri yükleme simülasyonu
      await new Promise((resolve) => setTimeout(resolve, 700));

      setSales(MOCK_SALES_REPORT);
    } catch (e) {
      console.error('B2B satış raporu yüklenemedi:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>B2B Raporlar</Text>
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
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Günlük Satış Özeti</Text>
          {sales.length === 0 ? (
            <Text style={styles.emptyText}>Henüz satış verisi bulunmuyor.</Text>
          ) : (
            sales.map((row) => (
              <View key={row.date} style={styles.row}>
                <View>
                  <Text style={styles.dateText}>{new Date(row.date).toLocaleDateString()}</Text>
                  <Text style={styles.metaText}>Sipariş: {row.orderCount}</Text>
                </View>
                <Text style={styles.amountText}>
                  {Number(row.totalAmount || 0).toFixed(2)}₺
                </Text>
              </View>
            ))
          )}
        </ScrollView>
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
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.gray600,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.gray600,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
});

