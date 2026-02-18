import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { userAPI } from '../services/api';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';
import ConfirmModal from '../components/ConfirmModal';

// Adres tipi ikonları
const getAddressIcon = (addressType) => {
  switch (addressType?.toLowerCase()) {
    case 'home':
      return 'home';
    case 'office':
      return 'business';
    case 'cabin':
    case 'other':
    default:
      return 'location';
  }
};

// Adres tipi renkleri
const getAddressIconColor = (addressType, isDefault) => {
  if (isDefault) return COLORS.primary;
  return COLORS.gray400;
};

// Adres tipi arka plan renkleri
const getAddressIconBg = (addressType, isDefault) => {
  if (isDefault) return 'rgba(17, 212, 33, 0.1)';
  return COLORS.gray100;
};

export default function MyAddressesScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [userId, setUserId] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [addressToDelete, setAddressToDelete] = useState(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  // AddAddress ekranından dönüldüğünde adresleri yeniden yükle
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadAddresses();
    });
    return unsubscribe;
  }, [navigation]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      
      if (!storedUserId) {
        setErrorMessage('Lütfen giriş yapın');
        setShowErrorModal(true);
        setTimeout(() => navigation.goBack(), 2000);
        return;
      }

      setUserId(storedUserId);

      // API'den adresleri çek
      try {
        const response = await userAPI.getAddresses(storedUserId, 'shipping');
        if (response.data?.success) {
          setAddresses(response.data.data || response.data.addresses || []);
        } else {
          // Mock data (API yoksa)
          setAddresses([
            {
              id: 1,
              addressType: 'home',
              label: 'Ev',
              fullName: 'John Doe',
              fullAddress: '123 Forest Trail',
              city: 'Denver',
              district: 'CO',
              postalCode: '80203',
              phone: '(555)123-4567',
              isDefault: true,
            },
            {
              id: 2,
              addressType: 'office',
              label: 'Ofis',
              fullName: 'Jane Doe',
              fullAddress: '456 Mountain View Rd',
              city: 'Boulder',
              district: 'CO',
              postalCode: '80302',
              phone: '(555)987-6543',
              isDefault: false,
            },
            {
              id: 3,
              addressType: 'cabin',
              label: 'Kulübe',
              fullName: 'John Doe',
              fullAddress: '88 Lake View Dr',
              city: 'Aspen',
              district: 'CO',
              postalCode: '81611',
              phone: '(555)444-1122',
              isDefault: false,
            },
          ]);
        }
      } catch (error) {
        console.log('Adresler yüklenemedi, mock data kullanılıyor:', error);
        // Mock data
        setAddresses([
          {
            id: 1,
            addressType: 'home',
            label: 'Home',
            fullName: 'John Doe',
            fullAddress: '123 Forest Trail',
            city: 'Denver',
            district: 'CO',
            postalCode: '80203',
            phone: '(555)123-4567',
            isDefault: true,
          },
          {
            id: 2,
            addressType: 'office',
            label: 'Office',
            fullName: 'Jane Doe',
            fullAddress: '456 Mountain View Rd',
            city: 'Boulder',
            district: 'CO',
            postalCode: '80302',
            phone: '(555)987-6543',
            isDefault: false,
          },
          {
            id: 3,
            addressType: 'cabin',
            label: 'Cabin',
            fullName: 'John Doe',
            fullAddress: '88 Lake View Dr',
            city: 'Aspen',
            district: 'CO',
            postalCode: '81611',
            phone: '(555)444-1122',
            isDefault: false,
          },
        ]);
      }
    } catch (error) {
      console.error('Adres yükleme hatası:', error);
      setErrorMessage('Adresler yüklenirken bir hata oluştu');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = (addressId) => {
    setAddressToDelete(addressId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!addressToDelete) return;
    
    try {
      await userAPI.deleteAddress(addressToDelete);
      await loadAddresses();
      setShowDeleteModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Adres silme hatası:', error);
      setShowDeleteModal(false);
      setErrorMessage('Adres silinirken bir hata oluştu');
      setShowErrorModal(true);
    }
    setAddressToDelete(null);
  };

  const handleEditAddress = (address) => {
    navigation.navigate('AddAddress', { address });
  };

  const handleSetDefault = async (addressId) => {
    try {
      await userAPI.setDefaultAddress(addressId);
      await loadAddresses();
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Varsayılan adres ayarlama hatası:', error);
      setErrorMessage('Varsayılan adres ayarlanırken bir hata oluştu');
      setShowErrorModal(true);
    }
  };

  const handleAddNewAddress = () => {
    navigation.navigate('AddAddress');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Adreslerim</Text>
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
        <Text style={styles.headerTitle}>My Addresses</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Saved Locations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kayıtlı Konumlar</Text>

          {/* Address Cards */}
          {addresses.map((address) => (
            <View key={address.id} style={styles.addressCard}>
              {/* Icon */}
              <View style={[
                styles.addressIconContainer,
                { backgroundColor: getAddressIconBg(address.addressType || address.label, address.isDefault) }
              ]}>
                <Ionicons 
                  name={getAddressIcon(address.addressType || address.label)} 
                  size={24} 
                  color={getAddressIconColor(address.addressType || address.label, address.isDefault)} 
                />
              </View>

              {/* Address Content */}
              <View style={styles.addressContent}>
                <View style={styles.addressHeader}>
                  <Text style={styles.addressLabel}>
                    {address.label || address.addressType || 'Adres'}
                  </Text>
                  {address.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>VARSayıLAN</Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.addressName}>{address.fullName || address.customerName || ''}</Text>
                <Text style={styles.addressText}>
                  {address.fullAddress || address.address || ''}
                </Text>
                <Text style={styles.addressText}>
                  {address.city || ''}{address.district ? `, ${address.district}` : ''} {address.postalCode || ''}
                </Text>
                
                {address.phone && (
                  <View style={styles.phoneRow}>
                    <Ionicons name="call-outline" size={14} color={COLORS.gray500} />
                    <Text style={styles.phoneText}>{address.phone}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.addressActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleDeleteAddress(address.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.gray500} />
                    <Text style={styles.actionButtonText}>Sil</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEditAddress(address)}
                  >
                    <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                    <Text style={[styles.actionButtonText, styles.editButtonText]}>Adresi Düzenle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {/* Empty State */}
          {addresses.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={64} color={COLORS.gray300} />
              <Text style={styles.emptyStateText}>Henüz adres eklenmemiş</Text>
              <Text style={styles.emptyStateSubtext}>Yeni adres eklemek için aşağıdaki butonu kullanın</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add New Address Button */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddNewAddress}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
          <Text style={styles.addButtonText}>Yeni Adres Ekle</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Başarılı"
        message={addressToDelete ? 'Adres silindi' : 'Varsayılan adres güncellendi'}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorMessage}
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        visible={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setAddressToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Adresi Sil"
        message="Bu adresi silmek istediğinize emin misiniz?"
        confirmText="Sil"
        cancelText="İptal"
        icon="trash-outline"
      />
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.gray500,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray600,
    marginBottom: 16,
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    gap: 16,
  },
  addressIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressContent: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  defaultBadge: {
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
    marginBottom: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  phoneText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  editButton: {
    marginLeft: 'auto',
  },
  editButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray600,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.gray500,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});

