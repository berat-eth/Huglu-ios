import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { launchImageLibrary } from 'react-native-image-picker';
import Button from '../components/Button';
import { COLORS } from '../constants/colors';
import { userAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';
import { secureStorage } from '../utils/secureStorage';
import CustomModal from '../components/CustomModal';

// Adres tipi ikonları
const getAddressIcon = (addressType) => {
  switch (addressType?.toLowerCase()) {
    case 'home':
    case 'ev':
      return 'home';
    case 'office':
    case 'iş':
    case 'work':
      return 'briefcase';
    case 'cabin':
    case 'other':
    default:
      return 'location';
  }
};

// Adres tipi renkleri
const getAddressIconColor = (addressType, isDefault) => {
  if (isDefault) return COLORS.primary;
  return COLORS.gray500;
};

// Adres tipi arka plan renkleri
const getAddressIconBg = (addressType, isDefault) => {
  if (isDefault) return '#fff';
  return '#fff';
};

export default function PersonalInfoScreen({ navigation }) {
  const alert = useAlert();
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [userAvatar, setUserAvatar] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);

  useEffect(() => {
    loadUserInfo();
    loadAddresses();
  }, []);

  // Sayfa her açıldığında adresleri ve kullanıcı bilgilerini yeniden yükle
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadAddresses();
      loadUserInfo(); // Kullanıcı bilgilerini de yeniden yükle
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserInfo = async () => {
    try {
      setLoading(true);
      const userId = await secureStorage.getItem('userId');
      
      if (!userId) {
        // Kullanıcı giriş yapmamış, sadece secureStorage'dan yükle
        const [userName, userEmail, userPhone, userDOB, userHeight, userWeight, userHomeAddr, userWorkAddr, storedAvatar] = await secureStorage.multiGet([
          'userName',
          'userEmail',
          'userPhone',
          'userDateOfBirth',
          'userHeight',
          'userWeight',
          'userHomeAddress',
          'userWorkAddress',
          'userAvatar',
        ]);

        setName(userName[1] || '');
        setEmail(userEmail[1] || '');
        setPhone(userPhone[1] || '');
        setDateOfBirth(userDOB[1] || '');
        setHeight(userHeight[1] || '');
        setWeight(userWeight[1] || '');
        setHomeAddress(userHomeAddr[1] || '');
        setWorkAddress(userWorkAddr[1] || '');
        setUserAvatar(storedAvatar && storedAvatar[1] ? storedAvatar[1] : '');
        return;
      }

      // Önce secureStorage'dan yükle (hızlı görünüm için)
      const [userName, userEmail, userPhone, userDOB, userHeight, userWeight, userHomeAddr, userWorkAddr, storedAvatar] = await secureStorage.multiGet([
        'userName',
        'userEmail',
        'userPhone',
        'userDateOfBirth',
        'userHeight',
        'userWeight',
        'userHomeAddress',
        'userWorkAddress',
        'userAvatar',
      ]);

      setName(userName[1] || '');
      setEmail(userEmail[1] || '');
      setPhone(userPhone[1] || '');
      setDateOfBirth(userDOB[1] || '');
      setHeight(userHeight[1] || '');
      setWeight(userWeight[1] || '');
      setHomeAddress(userHomeAddr[1] || '');
      setWorkAddress(userWorkAddr[1] || '');
      setUserAvatar(storedAvatar && storedAvatar[1] ? storedAvatar[1] : '');

      // API'den güncel bilgileri çek
      try {
        const response = await userAPI.getProfile(userId);
        
        console.log('🔍 API Response (TAM):', JSON.stringify(response.data, null, 2));
        
        if (response.data?.success && response.data?.data) {
          const userData = response.data.data;
          
          console.log('🔍 API UserData (TAM):', JSON.stringify(userData, null, 2));
          
          // API'den gelen verileri formatla
          const apiName = userData.name || '';
          const apiEmail = userData.email || '';
          const apiPhone = userData.phone || '';
          const apiAvatar = userData.avatar || userData.profileImage || '';
          
          // Doğum tarihi: dateOfBirth öncelikli (zaten DD/MM/YYYY formatında), yoksa birthDate'i formatla
          let apiDateOfBirth = userData.dateOfBirth || '';
          if (!apiDateOfBirth && userData.birthDate) {
            // birthDate YYYY-MM-DD formatındaysa DD/MM/YYYY'ye çevir
            const dateStr = userData.birthDate.toString();
            const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (dateMatch) {
              apiDateOfBirth = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
            } else {
              apiDateOfBirth = dateStr;
            }
          }
          
          // Boy ve kilo - null/undefined kontrolü yap, 0 değeri de geçerli
          let apiHeight = '';
          let apiWeight = '';
          
          if (userData.height !== null && userData.height !== undefined) {
            apiHeight = String(userData.height);
          }
          
          if (userData.weight !== null && userData.weight !== undefined) {
            apiWeight = String(userData.weight);
          }
          
          console.log('📊 API\'den gelen veriler (HAM):', {
            rawHeight: userData.height,
            rawWeight: userData.weight,
            heightType: typeof userData.height,
            weightType: typeof userData.weight,
            heightIsNull: userData.height === null,
            heightIsUndefined: userData.height === undefined,
            weightIsNull: userData.weight === null,
            weightIsUndefined: userData.weight === undefined,
          });
          
          console.log('📊 API\'den gelen veriler (FORMATLANMIŞ):', {
            dateOfBirth: userData.dateOfBirth,
            birthDate: userData.birthDate,
            formattedDateOfBirth: apiDateOfBirth,
            height: userData.height,
            weight: userData.weight,
            apiHeight,
            apiWeight,
            heightLength: apiHeight.length,
            weightLength: apiWeight.length,
          });
          
          // State'i güncelle
          setName(apiName);
          setEmail(apiEmail);
          setPhone(apiPhone);
          setDateOfBirth(apiDateOfBirth);
          setHeight(apiHeight);
          setWeight(apiWeight);
          setUserAvatar(apiAvatar);
          
          // secureStorage'ı da güncelle
          await secureStorage.multiSet([
            ['userName', apiName],
            ['userEmail', apiEmail],
            ['userPhone', apiPhone],
            ['userDateOfBirth', apiDateOfBirth],
            ['userHeight', apiHeight],
            ['userWeight', apiWeight],
            ['userAvatar', apiAvatar],
          ]);
          
          console.log('✅ Kullanıcı bilgileri API\'den yüklendi:', { apiName, apiEmail, apiPhone, apiDateOfBirth, apiHeight, apiWeight });
        }
      } catch (apiError) {
        console.warn('⚠️ API\'den kullanıcı bilgileri yüklenemedi, local veriler kullanılıyor:', apiError.message);
        // API hatası durumunda local veriler kullanılacak
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenemedi:', error);
      alert.show('Hata', 'Bilgiler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const userId = await secureStorage.getItem('userId');
      
      if (!userId) {
        return;
      }

      const response = await userAPI.getAddresses(userId);
      if (response.data?.success) {
        setAddresses(response.data.data || response.data.addresses || []);
      }
    } catch (error) {
      console.error('Adresler yüklenemedi:', error);
      // Hata durumunda boş array bırak, mock data kullanma
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSave = async () => {
    // Validasyon
    if (!name.trim()) {
      alert.show('Hata', 'Lütfen adınızı girin');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      alert.show('Hata', 'Lütfen geçerli bir e-posta adresi girin');
      return;
    }

    try {
      setSaving(true);

      // Bilgileri local storage'a kaydet
      await secureStorage.multiSet([
        ['userName', name.trim()],
        ['userEmail', email.trim()],
        ['userPhone', phone.trim()],
        ['userDateOfBirth', dateOfBirth.trim()],
        ['userHeight', height.trim()],
        ['userWeight', weight.trim()],
        ['userHomeAddress', homeAddress.trim()],
        ['userWorkAddress', workAddress.trim()],
      ]);

      // API'ye gönder
      try {
        const userId = await secureStorage.getItem('userId');
        if (userId) {
          const userData = {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            dateOfBirth: dateOfBirth.trim(),
            height: height.trim() ? parseInt(height.trim()) : null,
            weight: weight.trim() ? parseInt(weight.trim()) : null,
          };

          await userAPI.updateProfile(userId, userData);
          console.log('✅ Profil API\'ye güncellendi');
        }
      } catch (apiError) {
        console.log('⚠️ API güncellemesi başarısız:', apiError.message);
        // Local storage'a kaydedildi, API hatası kullanıcıya gösterilmez
      }

      alert.show('Başarılı', 'Bilgileriniz güncellendi', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Bilgiler kaydedilemedi:', error);
      alert.show('Hata', 'Bilgiler kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };


  const handleDeleteAccount = () => {
    alert.show(
      'Hesabı Sil',
      'Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await secureStorage.clear();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              alert.show('Hata', 'Hesap silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const handleAvatarPress = () => {
    setShowAvatarOptions(true);
  };

  const handleSelectImage = () => {
    setShowAvatarOptions(false);
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
      },
      async (response) => {
        if (response.didCancel || response.errorCode) {
          return;
        }

        if (response.assets && response.assets[0]) {
          const imageUri = response.assets[0].uri;
          await handleUploadAvatar(imageUri);
        }
      }
    );
  };

  const handleUploadAvatar = async (imageUri) => {
    try {
      setUploadingAvatar(true);
      const userId = await secureStorage.getItem('userId');
      
      if (!userId) {
        alert.show('Hata', 'Profil fotoğrafı yüklemek için lütfen giriş yapın');
        return;
      }

      const response = await userAPI.uploadAvatar(userId, imageUri);
      
      if (response.data?.success) {
        const avatarUrl = response.data.data?.avatar || response.data.data?.profileImage || response.data.avatar;
        setUserAvatar(avatarUrl);
        await secureStorage.setItem('userAvatar', avatarUrl);
        alert.show('Başarılı', 'Profil fotoğrafınız güncellendi');
      } else {
        alert.show('Hata', 'Profil fotoğrafı yüklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Avatar yükleme hatası:', error);
      alert.show('Hata', 'Profil fotoğrafı yüklenirken bir hata oluştu');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setShowAvatarOptions(false);
    
    Alert.alert(
      'Profil Fotoğrafını Sil',
      'Profil fotoğrafınızı silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = await secureStorage.getItem('userId');
              
              if (!userId) {
                alert.show('Hata', 'Profil fotoğrafı silmek için lütfen giriş yapın');
                return;
              }

              await userAPI.deleteAvatar(userId);
              setUserAvatar('');
              await secureStorage.removeItem('userAvatar');
              alert.show('Başarılı', 'Profil fotoğrafınız silindi');
            } catch (error) {
              console.error('Avatar silme hatası:', error);
              alert.show('Hata', 'Profil fotoğrafı silinirken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kişisel Bilgiler</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
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
          <Ionicons name="chevron-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kişisel Bilgilerim</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity 
              style={styles.avatar}
              onPress={handleAvatarPress}
              disabled={uploadingAvatar}
            >
              {userAvatar ? (
                <Image
                  source={{ uri: userAvatar }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={50} color="#fff" />
              )}
              {uploadingAvatar && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.editAvatarButton}
              onPress={handleAvatarPress}
              disabled={uploadingAvatar}
            >
              <Ionicons name="pencil" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{name || 'Kullanıcı Adı'}</Text>
        </View>

        {/* Identity Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Kimlik Bilgileri</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>AD SOYAD</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Adınız Soyadınız"
                placeholderTextColor={COLORS.gray400}
              />
              <Ionicons name="person-outline" size={20} color={COLORS.gray400} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>DOĞUM TARİHİ</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="15/08/1994"
                placeholderTextColor={COLORS.gray400}
              />
              <Ionicons name="calendar-outline" size={20} color={COLORS.gray400} />
            </View>
          </View>

          <View style={styles.twoColumnRow}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>BOY (cm)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="175"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.gray400}
                  maxLength={3}
                />
                <Ionicons name="resize-outline" size={20} color={COLORS.gray400} />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>KİLO (kg)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="70"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.gray400}
                  maxLength={3}
                />
                <Ionicons name="fitness-outline" size={20} color={COLORS.gray400} />
              </View>
            </View>
          </View>
        </View>

        {/* Contact Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mail" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>E-POSTA ADRESİ</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                keyboardType="email-address"
                placeholderTextColor={COLORS.gray400}
              />
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                <Text style={styles.verifiedText}>DOĞRULANDI</Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>TELEFON NUMARASI</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="0555 123 45 67"
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.gray400}
              />
              <Ionicons name="call-outline" size={20} color={COLORS.gray400} />
            </View>
          </View>
        </View>

        {/* Addresses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithAction}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Adresler</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('AddAddress')}>
              <Text style={styles.addNewText}>Yeni Ekle</Text>
            </TouchableOpacity>
          </View>

          {loadingAddresses ? (
            <View style={styles.loadingAddressesContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingAddressesText}>Adresler yükleniyor...</Text>
            </View>
          ) : addresses.length === 0 ? (
            <View style={styles.emptyAddressesContainer}>
              <Ionicons name="location-outline" size={48} color={COLORS.gray400} />
              <Text style={styles.emptyAddressesText}>Henüz adres eklenmemiş</Text>
              <TouchableOpacity 
                style={styles.addFirstAddressButton}
                onPress={() => navigation.navigate('AddAddress')}
              >
                <Text style={styles.addFirstAddressText}>İlk Adresinizi Ekleyin</Text>
              </TouchableOpacity>
            </View>
          ) : (
            addresses.map((address) => (
              <TouchableOpacity 
                key={address.id} 
                style={styles.addressCard}
                onPress={() => navigation.navigate('MyAddresses')}
              >
                <View style={styles.addressIconContainer}>
                  <Ionicons 
                    name={getAddressIcon(address.addressType || address.label)} 
                    size={24} 
                    color={getAddressIconColor(address.addressType || address.label, address.isDefault)} 
                  />
                </View>
                <View style={styles.addressInfo}>
                  <View style={styles.addressHeader}>
                    <Text style={styles.addressType}>
                      {address.label || address.addressType === 'home' ? 'Ev' : address.addressType === 'office' ? 'İş' : 'Adres'}
                    </Text>
                    {address.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>VARSAYILAN</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addressText}>
                    {address.fullAddress || address.address || ''}
                  </Text>
                  <Text style={styles.addressText}>
                    {address.city || ''}{address.district ? `, ${address.district}` : ''} {address.postalCode || ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Ionicons name="lock-closed" size={16} color={COLORS.gray500} />
          <Text style={styles.securityText}>Verileriniz güvenli şekilde şifrelenmektedir</Text>
        </View>

        {/* Save Button */}
        <Button
          title={saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          onPress={handleSave}
          disabled={saving}
          style={styles.saveButton}
        />

        {/* Delete Account */}
        <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>Hesabı Sil</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Avatar Options Modal */}
      <CustomModal
        visible={showAvatarOptions}
        onClose={() => setShowAvatarOptions(false)}
        title="Profil Fotoğrafı"
      >
        <View style={styles.avatarOptionsContainer}>
          <TouchableOpacity 
            style={styles.avatarOption}
            onPress={handleSelectImage}
          >
            <Ionicons name="image-outline" size={24} color={COLORS.primary} />
            <Text style={styles.avatarOptionText}>Fotoğraf Seç</Text>
          </TouchableOpacity>
          
          {userAvatar && (
            <TouchableOpacity 
              style={[styles.avatarOption, styles.avatarOptionDelete]}
              onPress={handleDeleteAvatar}
            >
              <Ionicons name="trash-outline" size={24} color={COLORS.error} />
              <Text style={[styles.avatarOptionText, { color: COLORS.error }]}>Fotoğrafı Sil</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.avatarOption, styles.avatarOptionCancel]}
            onPress={() => setShowAvatarOptions(false)}
          >
            <Text style={[styles.avatarOptionText, { color: COLORS.gray500 }]}>İptal</Text>
          </TouchableOpacity>
        </View>
      </CustomModal>

      <alert.AlertComponent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
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
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.gray500,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#5DADE2',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarOptionsContainer: {
    padding: 16,
  },
  avatarOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    marginBottom: 12,
  },
  avatarOptionDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  avatarOptionCancel: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  avatarOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginLeft: 12,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  profileMemberSince: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    marginTop: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginLeft: 8,
  },
  addNewText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  twoColumnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#000',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 4,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  addressIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressInfo: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
  },
  addressText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginHorizontal: 16,
  },
  securityText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 6,
  },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  deleteButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
  loadingAddressesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingAddressesText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.gray500,
  },
  emptyAddressesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyAddressesText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.gray500,
    marginBottom: 16,
  },
  addFirstAddressButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstAddressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
