import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import Input from '../components/Input';
import Button from '../components/Button';
import { COLORS } from '../constants/colors';
import { userAPI } from '../services/api';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';

const ADDRESS_TYPES = [
  { id: 'home', label: 'Ev', icon: 'home' },
  { id: 'office', label: 'Ofis', icon: 'business' },
  { id: 'cabin', label: 'Kulübe', icon: 'location' },
  { id: 'other', label: 'Diğer', icon: 'location-outline' },
];

export default function AddAddressScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [addressType, setAddressType] = useState('home');
  const [fullAddress, setFullAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Düzenleme modu için route parametrelerini kontrol et
  const editAddress = route?.params?.address;
  const isEditMode = !!editAddress;

  React.useEffect(() => {
    if (editAddress) {
      setFullName(editAddress.fullName || editAddress.customerName || '');
      setAddressType(editAddress.addressType || editAddress.label?.toLowerCase() || 'home');
      setFullAddress(editAddress.fullAddress || editAddress.address || '');
      setCity(editAddress.city || '');
      setDistrict(editAddress.district || '');
      setPostalCode(editAddress.postalCode || '');
      setPhone(editAddress.phone || '');
      setIsDefault(editAddress.isDefault || false);
    }
  }, [editAddress]);

  const handleSave = async () => {
    // Validasyon
    if (!fullName.trim()) {
      setErrorMessage('Lütfen ad soyad girin');
      setShowErrorModal(true);
      return;
    }

    if (!fullAddress.trim()) {
      setErrorMessage('Lütfen adres girin');
      setShowErrorModal(true);
      return;
    }

    if (!city.trim()) {
      setErrorMessage('Lütfen şehir girin');
      setShowErrorModal(true);
      return;
    }

    if (!district.trim()) {
      setErrorMessage('Lütfen ilçe girin');
      setShowErrorModal(true);
      return;
    }

    if (!phone.trim()) {
      setErrorMessage('Lütfen telefon numarası girin');
      setShowErrorModal(true);
      return;
    }

    try {
      setLoading(true);
      const userId = await secureStorage.getItem('userId');
      
      if (!userId) {
        setErrorMessage('Lütfen giriş yapın');
        setShowErrorModal(true);
        setTimeout(() => navigation.goBack(), 2000);
        return;
      }

      const addressData = {
        userId: parseInt(userId),
        addressType: addressType,
        label: ADDRESS_TYPES.find(t => t.id === addressType)?.label || 'Adres',
        fullName: fullName.trim(),
        fullAddress: fullAddress.trim(),
        city: city.trim(),
        district: district.trim(),
        postalCode: postalCode.trim(),
        phone: phone.trim(),
        isDefault: isDefault,
      };

      if (isEditMode && editAddress.id) {
        // Güncelleme
        await userAPI.updateAddress(editAddress.id, addressData);
        setShowSuccessModal(true);
      } else {
        // Yeni adres ekleme
        await userAPI.addAddress(addressData);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Adres kaydetme hatası:', error);
      setErrorMessage(error.response?.data?.message || 'Adres kaydedilirken bir hata oluştu');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Adres Tipi Seçimi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adres Tipi</Text>
          <View style={styles.addressTypeContainer}>
            {ADDRESS_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.addressTypeButton,
                  addressType === type.id && styles.addressTypeButtonSelected,
                ]}
                onPress={() => setAddressType(type.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.addressTypeIcon,
                  addressType === type.id && styles.addressTypeIconSelected,
                ]}>
                  <Ionicons 
                    name={type.icon} 
                    size={24} 
                    color={addressType === type.id ? COLORS.primary : COLORS.gray400} 
                  />
                </View>
                <Text style={[
                  styles.addressTypeLabel,
                  addressType === type.id && styles.addressTypeLabelSelected,
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Form Alanları */}
        <View style={styles.section}>
          <Input
            label="Ad Soyad *"
            placeholder="Adınızı ve soyadınızı girin"
            value={fullName}
            onChangeText={setFullName}
            icon="person-outline"
          />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tam Adres *</Text>
            <View style={styles.textAreaContainer}>
              <Ionicons name="location-outline" size={20} color={COLORS.gray400} style={styles.textAreaIcon} />
              <TextInput
                style={styles.textArea}
                placeholder="Mahalle, sokak, bina no, daire no"
                placeholderTextColor={COLORS.gray400}
                value={fullAddress}
                onChangeText={setFullAddress}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="Şehir *"
                placeholder="Şehir"
                value={city}
                onChangeText={setCity}
                icon="business-outline"
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="İlçe *"
                placeholder="İlçe"
                value={district}
                onChangeText={setDistrict}
                icon="map-outline"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="Posta Kodu"
                placeholder="34000"
                value={postalCode}
                onChangeText={setPostalCode}
                keyboardType="numeric"
                icon="mail-outline"
                maxLength={5}
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="Telefon *"
                placeholder="0555 123 45 67"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                icon="call-outline"
                maxLength={15}
              />
            </View>
          </View>

          {/* Varsayılan Adres Checkbox */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setIsDefault(!isDefault)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.checkbox,
              isDefault && styles.checkboxChecked,
            ]}>
              {isDefault && (
                <Ionicons name="checkmark" size={16} color={COLORS.white} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              Varsayılan adres olarak kaydet
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Save Button */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Button
          title={isEditMode ? 'Adresi Güncelle' : 'Adresi Kaydet'}
          onPress={handleSave}
          loading={loading}
        />
      </SafeAreaView>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
        title="Başarılı"
        message={isEditMode ? 'Adres güncellendi' : 'Adres eklendi'}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorMessage}
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
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  addressTypeButton: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  addressTypeButtonSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  addressTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressTypeIconSelected: {
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
  },
  addressTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  addressTypeLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    flex: 1,
  },
  bottomBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  textAreaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  textAreaIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  textArea: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textMain,
    minHeight: 80,
    paddingVertical: 0,
  },
});

