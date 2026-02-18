import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { ordersAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

const MOCK_INVOICES = [
  {
    id: 'OUT-8834',
    orderNumber: 'OUT-8834',
    date: '24 Eki, 2023',
    amount: 124.50,
    status: 'paid',
    icon: 'receipt-outline',
    iconBg: 'rgba(17, 212, 33, 0.1)',
    iconColor: COLORS.primary,
    items: 3,
    paymentMethod: 'Kredi Kartı',
  },
  {
    id: 'OUT-8830',
    orderNumber: 'OUT-8830',
    date: '12 Eki, 2023',
    amount: 45.00,
    status: 'pending',
    icon: 'time-outline',
    iconBg: 'rgba(249, 115, 22, 0.1)',
    iconColor: '#f97316',
    items: 1,
    paymentMethod: 'Havale',
  },
  {
    id: 'OUT-8812',
    orderNumber: 'OUT-8812',
    date: '28 Eyl, 2023',
    amount: 329.99,
    status: 'paid',
    icon: 'bag-outline',
    iconBg: 'rgba(17, 212, 33, 0.1)',
    iconColor: COLORS.primary,
    items: 5,
    paymentMethod: 'Kredi Kartı',
  },
  {
    id: 'OUT-8756',
    orderNumber: 'OUT-8756',
    date: '15 Eyl, 2023',
    amount: 12.50,
    status: 'paid',
    icon: 'receipt-outline',
    iconBg: 'rgba(17, 212, 33, 0.1)',
    iconColor: COLORS.primary,
    items: 1,
    paymentMethod: 'Cüzdan',
  },
];

export default function InvoicesScreen({ navigation }) {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [userId, setUserId] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paidCount, setPaidCount] = useState(0);

  const filters = [
    { id: 'all', label: 'Tümü' },
    { id: 'last30', label: 'Son 30 Gün' },
    { id: 'paid', label: 'Ödendi' },
    { id: 'pending', label: 'Beklemede' },
  ];

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      
      if (!storedUserId) {
        alert.show('Hata', 'Lütfen giriş yapın');
        navigation.navigate('Login');
        return;
      }

      setUserId(storedUserId);

      // Siparişlerden fatura verilerini al
      const response = await ordersAPI.getByUser(storedUserId);
      
      if (response.data?.success) {
        const orders = response.data.orders || [];
        
        // Siparişleri fatura formatına dönüştür
        const invoiceData = orders.map(order => ({
          id: order._id || order.id,
          orderNumber: order.orderNumber || order.id,
          date: new Date(order.createdAt).toLocaleDateString('tr-TR', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          }),
          amount: order.totalAmount || order.total || 0,
          status: order.paymentStatus === 'paid' ? 'paid' : 'pending',
          icon: order.paymentStatus === 'paid' ? 'receipt-outline' : 'time-outline',
          iconBg: order.paymentStatus === 'paid' ? 'rgba(17, 212, 33, 0.1)' : 'rgba(249, 115, 22, 0.1)',
          iconColor: order.paymentStatus === 'paid' ? COLORS.primary : '#f97316',
          items: order.items?.length || 0,
          paymentMethod: order.paymentMethod || 'Kredi Kartı',
        }));

        setInvoices(invoiceData);
        
        // İstatistikleri hesapla
        const total = invoiceData.reduce((sum, inv) => sum + inv.amount, 0);
        const paid = invoiceData.filter(inv => inv.status === 'paid').length;
        setTotalAmount(total);
        setPaidCount(paid);
      } else {
        // API'den veri gelmezse mock data kullan
        setInvoices(MOCK_INVOICES);
        const total = MOCK_INVOICES.reduce((sum, inv) => sum + inv.amount, 0);
        const paid = MOCK_INVOICES.filter(inv => inv.status === 'paid').length;
        setTotalAmount(total);
        setPaidCount(paid);
      }
    } catch (error) {
      console.error('Faturalar yükleme hatası:', error);
      // Hata durumunda mock data kullan
      setInvoices(MOCK_INVOICES);
      const total = MOCK_INVOICES.reduce((sum, inv) => sum + inv.amount, 0);
      const paid = MOCK_INVOICES.filter(inv => inv.status === 'paid').length;
      setTotalAmount(total);
      setPaidCount(paid);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredInvoices = () => {
    let filtered = invoices;

    // Tarih filtreleme
    if (selectedFilter === 'last30') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate >= thirtyDaysAgo;
      });
    }

    // Durum filtreleme
    if (selectedFilter === 'paid') {
      filtered = filtered.filter(inv => inv.status === 'paid');
    } else if (selectedFilter === 'pending') {
      filtered = filtered.filter(inv => inv.status === 'pending');
    }

    // Arama filtreleme
    if (searchQuery) {
      filtered = filtered.filter(inv => 
        inv.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const handleDownloadPDF = (invoice) => {
    alert.show(
      'PDF İndir', 
      `${invoice.orderNumber} numaralı fatura PDF olarak indiriliyor...`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'İndir', onPress: () => console.log('PDF indiriliyor...') }
      ]
    );
  };

  const handleViewInvoice = (invoice) => {
    navigation.navigate('OrderDetail', { orderId: invoice.id });
  };

  const handleShareInvoice = async (invoice) => {
    try {
      await Share.share({
        message: `Fatura #${invoice.orderNumber}\nTutar: ₺${invoice.amount.toFixed(2)}\nTarih: ${invoice.date}`,
        title: 'Fatura Paylaş',
      });
    } catch (error) {
      console.error('Paylaşım hatası:', error);
    }
  };

  const filteredInvoices = getFilteredInvoices();

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Faturalarım</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Faturalarım</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="download-outline" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary Card with Gradient */}
        <View style={styles.summaryContainer}>
          <LinearGradient
            colors={[COLORS.primary, '#0ea61a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
            
            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Ionicons name="receipt-outline" size={24} color={COLORS.white} />
                  <Text style={styles.summaryLabel}>Toplam Fatura</Text>
                  <Text style={styles.summaryValue}>{invoices.length}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.white} />
                  <Text style={styles.summaryLabel}>Ödenen</Text>
                  <Text style={styles.summaryValue}>{paidCount}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Ionicons name="wallet-outline" size={24} color={COLORS.white} />
                  <Text style={styles.summaryLabel}>Toplam Tutar</Text>
                  <Text style={styles.summaryValue}>₺{totalAmount.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={COLORS.gray400} />
            <TextInput
              style={styles.searchInput}
              placeholder="Fatura numarası ile ara..."
              placeholderTextColor={COLORS.gray400}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.gray400} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filtersSection}>
          <Text style={styles.filtersSectionTitle}>FİLTRELE</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterChip,
                  selectedFilter === filter.id && styles.filterChipActive,
                ]}
                onPress={() => setSelectedFilter(filter.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === filter.id && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Invoices List */}
        <View style={styles.invoicesSection}>
          <Text style={styles.invoicesSectionTitle}>FATURALAR</Text>
          {filteredInvoices.length > 0 ? (
            filteredInvoices.map((invoice) => (
              <TouchableOpacity 
                key={invoice.id} 
                style={styles.invoiceCard}
                onPress={() => handleViewInvoice(invoice)}
                activeOpacity={0.7}
              >
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceLeft}>
                    <View style={[styles.invoiceIcon, { backgroundColor: invoice.iconBg }]}>
                      <Ionicons name={invoice.icon} size={28} color={invoice.iconColor} />
                    </View>
                    <View style={styles.invoiceInfo}>
                      <Text style={styles.invoiceId}>#{invoice.orderNumber}</Text>
                      <View style={styles.invoiceMetaRow}>
                        <Ionicons name="calendar-outline" size={14} color={COLORS.gray500} />
                        <Text style={styles.invoiceDate}>{invoice.date}</Text>
                      </View>
                      <View style={styles.invoiceMetaRow}>
                        <Ionicons name="cube-outline" size={14} color={COLORS.gray500} />
                        <Text style={styles.invoiceItems}>{invoice.items} Ürün</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.invoiceRight}>
                    <Text style={styles.invoiceAmount}>₺{invoice.amount.toFixed(2)}</Text>
                    <View style={[
                      styles.statusBadge,
                      invoice.status === 'paid' ? styles.statusBadgePaid : styles.statusBadgePending,
                    ]}>
                      <View style={[
                        styles.statusDot,
                        invoice.status === 'paid' ? styles.statusDotPaid : styles.statusDotPending,
                      ]} />
                      <Text style={[
                        styles.statusText,
                        invoice.status === 'paid' ? styles.statusTextPaid : styles.statusTextPending,
                      ]}>
                        {invoice.status === 'paid' ? 'ÖDENDİ' : 'BEKLEMEDE'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                <View style={styles.invoiceFooter}>
                  <View style={styles.paymentMethodInfo}>
                    <Ionicons name="card-outline" size={16} color={COLORS.gray500} />
                    <Text style={styles.paymentMethodText}>{invoice.paymentMethod}</Text>
                  </View>

                  <View style={styles.invoiceActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleShareInvoice(invoice);
                      }}
                    >
                      <Ionicons name="share-outline" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDownloadPDF(invoice);
                      }}
                    >
                      <Ionicons name="download-outline" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.viewButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleViewInvoice(invoice);
                      }}
                    >
                      <Text style={styles.viewButtonText}>Detay</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={64} color={COLORS.gray300} />
              </View>
              <Text style={styles.emptyTitle}>Fatura Bulunamadı</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery 
                  ? 'Arama kriterlerinize uygun fatura bulunamadı.'
                  : 'Henüz faturanız bulunmuyor.'}
              </Text>
            </View>
          )}

          {/* Help Section */}
          <TouchableOpacity 
            style={styles.helpSection}
            onPress={() => navigation.navigate('LiveChatEntry')}
          >
            <View style={styles.helpIcon}>
              <Ionicons name="help-circle-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Yardıma mı ihtiyacınız var?</Text>
              <Text style={styles.helpText}>
                Fatura ile ilgili sorularınız için destek ekibimizle iletişime geçin
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
      <alert.AlertComponent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17, 212, 33, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    padding: 16,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    left: -30,
    bottom: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  summaryContent: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  summaryDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 33, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textMain,
  },
  filtersSection: {
    paddingTop: 8,
  },
  filtersSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(17, 212, 33, 0.6)',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 33, 0.2)',
    marginRight: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  invoicesSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  invoicesSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(17, 212, 33, 0.6)',
    letterSpacing: 1,
    marginBottom: 12,
  },
  invoiceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 33, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  invoiceLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  invoiceIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceInfo: {
    flex: 1,
    gap: 6,
  },
  invoiceId: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  invoiceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invoiceDate: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  invoiceItems: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgePaid: {
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
  },
  statusBadgePending: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotPaid: {
    backgroundColor: COLORS.primary,
  },
  statusDotPending: {
    backgroundColor: '#f97316',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTextPaid: {
    color: COLORS.primary,
  },
  statusTextPending: {
    color: '#f97316',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
    marginVertical: 12,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentMethodText: {
    fontSize: 13,
    color: COLORS.gray500,
    fontWeight: '500',
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    height: 36,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 33, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  helpIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpContent: {
    flex: 1,
    gap: 4,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  helpText: {
    fontSize: 12,
    color: COLORS.gray500,
    lineHeight: 18,
  },
});
