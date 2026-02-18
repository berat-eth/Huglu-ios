import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import secureStorage from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { userAPI, ordersAPI, wishlistAPI, b2bAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import ErrorModal from '../components/ErrorModal';
import LoginRequiredModal from '../components/LoginRequiredModal';
import ModernLoader from '../components/ModernLoader';
import { useAlert } from '../hooks/useAlert';

const MENU_ITEMS = [
  { id: 1, icon: 'person-outline', title: 'Kişisel Bilgiler', screen: 'PersonalInfo' },
  { id: 2, icon: 'trophy-outline', title: 'Seviyem', screen: 'UserLevel', badge: true },
  { id: 3, icon: 'wallet-outline', title: 'Cüzdanım', screen: 'Wallet' },
  { id: 4, icon: 'receipt-outline', title: 'Faturalarım', screen: 'Invoices' },
  { id: 5, icon: 'location-outline', title: 'Teslimat Adresleri', screen: 'MyAddresses' },
  { id: 7, icon: 'return-down-back-outline', title: 'İade Taleplerim', screen: 'ReturnRequests' },
];

const APP_SETTINGS = [
  { id: 1, icon: 'gift-outline', title: 'Arkadaşını Davet Et', screen: 'Referral' },
  { id: 2, icon: 'business-outline', title: 'Toptan Satış', screen: 'Wholesale' },
  { id: 3, icon: 'settings-outline', title: 'Ayarlar', screen: 'Settings' },
  { id: 4, icon: 'storefront-outline', title: 'Mağazalarımız', screen: 'PhysicalStores' },
];

export default function ProfileScreen({ navigation }) {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Misafir');
  const [userEmail, setUserEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userAvatar, setUserAvatar] = useState('');
  
  // B2B bilgileri
  const [accountType, setAccountType] = useState('individual');
  const [isB2BMode, setIsB2BMode] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [authorizedPerson, setAuthorizedPerson] = useState('');
  
  // Dashboard stats
  const [activeOrders, setActiveOrders] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  
  // Modals
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [loginRequiredMessage, setLoginRequiredMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  // Sayfa her açıldığında B2B modunu kontrol et
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
    });

    return unsubscribe;
  }, [navigation]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      // GÜVENLİK: Login bilgilerini secureStorage'dan al (hassas veriler)
      const [name, email, loggedIn, storedUserId, storedAvatar, accountTypeData, companyNameData, taxNumberData, authorizedPersonData, b2bModeData] = await secureStorage.multiGet([
        'userName', 
        'userEmail', 
        'isLoggedIn',
        'userId',
        'userAvatar',
        'accountType',
        'companyName',
        'taxNumber',
        'authorizedPerson',
        'isB2BMode'
      ]);
      
      // B2B bilgilerini yükle
      if (accountTypeData && accountTypeData[1]) {
        setAccountType(accountTypeData[1]);
      }
      
      // Verilerin doğru formatta geldiğini kontrol et
      if (name && email && loggedIn && storedUserId) {
        const isUserLoggedIn = loggedIn[1] === 'true';
        const currentUserId = storedUserId[1];
        
        // B2B modu tüm kullanıcılar için aktif olabilir
        if (b2bModeData && b2bModeData[1]) {
          setIsB2BMode(b2bModeData[1] === 'true');
        } else {
          setIsB2BMode(false);
        }
        
        if (companyNameData && companyNameData[1]) {
          setCompanyName(companyNameData[1]);
        }
        if (taxNumberData && taxNumberData[1]) {
          setTaxNumber(taxNumberData[1]);
        }
        if (authorizedPersonData && authorizedPersonData[1]) {
          setAuthorizedPerson(authorizedPersonData[1]);
        }
        
        setUserName(name[1] || 'Misafir');
        setUserEmail(email[1] || '');
        setIsLoggedIn(isUserLoggedIn);
        setUserId(currentUserId);
        if (storedAvatar && storedAvatar[1]) {
          setUserAvatar(storedAvatar[1]);
        }

        // Eğer kullanıcı giriş yapmışsa backend'den güncel profil bilgilerini ve avatar'ı çek
        if (isUserLoggedIn && currentUserId) {
          try {
            const profileResponse = await userAPI.getProfile(currentUserId);
            if (profileResponse.data?.success && profileResponse.data?.data) {
              const userData = profileResponse.data.data;
              if (userData.avatar || userData.profileImage) {
                const avatarUrl = userData.avatar || userData.profileImage;
                setUserAvatar(avatarUrl);
                await secureStorage.setItem('userAvatar', avatarUrl);
              }
            }
          } catch (profileError) {
            console.warn('Profil bilgileri yüklenemedi (avatar):', profileError?.message || profileError);
          }

          // Eğer kullanıcı giriş yapmışsa istatistikleri yükle - hata olsa bile devam et
          try {
            await loadDashboardStats(currentUserId);
          } catch (statsError) {
            console.warn('Dashboard istatistikleri yüklenemedi:', statsError);
          }
        }
      } else {
        // Veri formatı beklenmedik - varsayılan değerler
        setUserName('Misafir');
        setUserEmail('');
        setIsLoggedIn(false);
        setUserId(null);
        
        // Giriş yapmamış kullanıcılar için de B2B modunu kontrol et
        if (b2bModeData && b2bModeData[1]) {
          setIsB2BMode(b2bModeData[1] === 'true');
        } else {
          setIsB2BMode(false);
        }
      }
    } catch (error) {
      // Hata durumunda detaylı log
      const errorMessage = error?.message || error?.toString() || 'Bilinmeyen hata';
      console.error('Kullanıcı verileri yükleme hatası:', {
        message: errorMessage,
        error: error
      });
      // Hata durumunda varsayılan değerler
      setUserName('Misafir');
      setUserEmail('');
      setIsLoggedIn(false);
      setUserId(null);
      
      // Hata durumunda da B2B modunu kontrol et
      try {
        const b2bModeData = await secureStorage.getItem('isB2BMode');
        setIsB2BMode(b2bModeData === 'true');
      } catch (b2bError) {
        setIsB2BMode(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async (userId) => {
    try {
      // Aktif siparişleri al
      try {
        const ordersResponse = await ordersAPI.getByUser(userId);
        if (ordersResponse.data?.success) {
          const orders = ordersResponse.data.orders || [];
          const active = orders.filter(order => 
            order.status !== 'delivered' && order.status !== 'cancelled'
          ).length;
          setActiveOrders(active);
        }
      } catch (error) {
        console.log('Siparişler yüklenemedi:', error);
      }

      // Favori ürün sayısını al
      try {
        const wishlistResponse = await wishlistAPI.get(userId);
        if (wishlistResponse.data?.success) {
          const wishlist = wishlistResponse.data.wishlist || [];
          setWishlistCount(wishlist.length);
        }
      } catch (error) {
        console.log('Favoriler yüklenemedi:', error);
      }


    } catch (error) {
      console.error('Dashboard istatistikleri yükleme hatası:', error);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      // GÜVENLİK: Login bilgilerini secureStorage'dan sil (hassas veriler)
      await secureStorage.multiRemove(['userId', 'userName', 'userEmail', 'userPhone', 'isLoggedIn']);
      setShowLogoutModal(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      setShowLogoutModal(false);
      setErrorMessage('Çıkış yapılırken bir hata oluştu');
      setShowErrorModal(true);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ModernLoader />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {userAvatar ? (
                <Image
                  source={{ uri: userAvatar }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={48} color={COLORS.primary} />
              )}
            </View>
            <TouchableOpacity 
              style={styles.editAvatarButton}
              onPress={() => {
                if (!isLoggedIn) {
                  setLoginRequiredMessage('Profil fotoğrafınızı düzenlemek için lütfen giriş yapın');
                  setShowLoginRequiredModal(true);
                } else {
                  navigation.navigate('PersonalInfo');
                }
              }}
            >
              <Ionicons name="pencil" size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          {userEmail ? <Text style={styles.userEmail}>{userEmail}</Text> : null}
          <View style={styles.membershipBadge}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
            <Text style={styles.membershipText}>Üye</Text>
          </View>
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => {
              if (!isLoggedIn) {
                setLoginRequiredMessage('Profil bilgilerinizi düzenlemek için lütfen giriş yapın');
                setShowLoginRequiredModal(true);
              } else {
                navigation.navigate('PersonalInfo');
              }
            }}
          >
            <Ionicons name="settings-outline" size={16} color={COLORS.textMain} />
            <Text style={styles.editProfileText}>Profili Düzenle</Text>
          </TouchableOpacity>
        </View>

        {/* B2B/B2C Mode Toggle - Tüm kullanıcılar görebilir */}
        {(
          <View style={styles.modeToggleContainer}>
            <View style={styles.modeToggleCard}>
              <View style={styles.modeToggleHeader}>
                <Ionicons 
                  name={isB2BMode ? "business" : "person"} 
                  size={24} 
                  color={isB2BMode ? COLORS.primary : COLORS.gray600} 
                />
                <View style={styles.modeToggleInfo}>
                  <Text style={styles.modeToggleTitle}>
                    {isB2BMode ? 'B2B Modu Aktif' : 'B2C Modu Aktif'}
                  </Text>
                  <Text style={styles.modeToggleDesc}>
                    {isB2BMode 
                      ? 'Toplu alım ve kurumsal fiyatlandırma' 
                      : 'Bireysel alışveriş modu'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modeToggleButton, isB2BMode && styles.modeToggleButtonActive]}
                onPress={async () => {
                  try {
                    const newMode = !isB2BMode;
                    
                    // Önce local state'i güncelle (optimistic update)
                    setIsB2BMode(newMode);
                    await secureStorage.setItem('isB2BMode', newMode.toString());
                    
                    // Backend'e bildir (eğer endpoint varsa)
                    try {
                      if (userId) {
                        // Backend'e B2B modu değişikliğini bildir
                        await userAPI.updateProfile(userId, {
                          isB2BMode: newMode
                        });
                      }
                    } catch (backendError) {
                      console.warn('Backend B2B modu güncellenemedi:', backendError);
                      // Backend hatası olsa bile devam et (local değişiklik yapıldı)
                    }
                    
                    // Kullanıcıya bilgi ver
                    alert.show(
                      newMode ? 'B2B Modu Aktif' : 'B2C Modu Aktif',
                      newMode 
                        ? 'Toplu alım ve kurumsal fiyatlandırma aktif edildi. Minimum sipariş miktarları geçerlidir.' 
                        : 'Bireysel alışveriş moduna geçildi.'
                    );
                  } catch (error) {
                    console.error('B2B modu değiştirilemedi:', error);
                    // Hata durumunda geri al
                    setIsB2BMode(!isB2BMode);
                    await secureStorage.setItem('isB2BMode', (!isB2BMode).toString());
                    alert.show('Hata', 'Mod değiştirilemedi. Lütfen tekrar deneyin.');
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={isB2BMode ? "business" : "business-outline"} 
                  size={18} 
                  color={isB2BMode ? COLORS.white : COLORS.primary} 
                />
                <Text style={[styles.modeToggleButtonText, isB2BMode && styles.modeToggleButtonTextActive]}>
                  {isB2BMode ? 'B2C Moduna Geç' : 'B2B Moduna Geç'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Dashboard Grid */}
        <View style={styles.dashboardGrid}>
          {/* Siparişlerim - Her zaman göster */}
          <TouchableOpacity 
            style={styles.dashboardCard} 
            onPress={() => {
              if (!isLoggedIn) {
                setLoginRequiredMessage('Siparişlerinizi görmek için lütfen giriş yapın');
                setShowLoginRequiredModal(true);
              } else {
                navigation.navigate('OrderTracking');
              }
            }}
          >
            <View style={styles.dashboardIcon}>
              <Ionicons name="cube-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>Siparişlerim</Text>
            <Text style={styles.dashboardSubtitle}>
              {isLoggedIn ? (activeOrders > 0 ? `${activeOrders} Aktif` : 'Sipariş Yok') : 'Giriş Yapın'}
            </Text>
          </TouchableOpacity>

          {/* Mağazadan Teslim Al - Her zaman göster */}
          <TouchableOpacity 
            style={styles.dashboardCard} 
            onPress={() => {
              if (!isLoggedIn) {
                setLoginRequiredMessage('Mağazadan teslim al siparişlerinizi görmek için lütfen giriş yapın');
                setShowLoginRequiredModal(true);
              } else {
                navigation.navigate('PickupOrders');
              }
            }}
          >
            <View style={styles.dashboardIcon}>
              <Ionicons name="storefront-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>Mağazadan Teslim Al</Text>
            <Text style={styles.dashboardSubtitle}>
              {isLoggedIn ? 'Siparişlerim' : 'Giriş Yapın'}
            </Text>
          </TouchableOpacity>

          {/* Favoriler - Her zaman göster */}
          <TouchableOpacity 
            style={styles.dashboardCard} 
            onPress={() => {
              if (!isLoggedIn) {
                setLoginRequiredMessage('Favorilerinizi görmek için lütfen giriş yapın');
                setShowLoginRequiredModal(true);
              } else {
                navigation.navigate('Wishlist');
              }
            }}
          >
            <View style={styles.dashboardIcon}>
              <Ionicons name="heart-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>Favoriler</Text>
            <Text style={styles.dashboardSubtitle}>
              {isLoggedIn ? (wishlistCount > 0 ? `${wishlistCount} Ürün` : 'Ürün Yok') : 'Giriş Yapın'}
            </Text>
          </TouchableOpacity>

          {/* Kampanyalar - Her zaman göster */}
          <TouchableOpacity style={styles.dashboardCard} onPress={() => navigation.navigate('Campaigns')}>
            <View style={styles.dashboardIcon}>
              <Ionicons name="pricetag-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>Kampanyalar</Text>
            <Text style={styles.dashboardSubtitle}>Fırsatlar</Text>
          </TouchableOpacity>

          {/* Destek - Her zaman göster */}
          <TouchableOpacity style={styles.dashboardCard} onPress={() => navigation.navigate('LiveChatEntry')}>
            <View style={styles.dashboardIcon}>
              <Ionicons name="headset-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>Destek</Text>
            <Text style={styles.dashboardSubtitle}>7/24 Yardım</Text>
          </TouchableOpacity>

          {/* Rozetler - Sadece B2C modunda göster */}
          {!isB2BMode && (
            <TouchableOpacity 
              style={styles.dashboardCard} 
              onPress={() => {
                if (!isLoggedIn) {
                  setLoginRequiredMessage('Rozetlerinizi görmek için lütfen giriş yapın');
                  setShowLoginRequiredModal(true);
                } else {
                  navigation.navigate('Badges');
                }
              }}
            >
              <View style={styles.dashboardIcon}>
                <Ionicons name="trophy-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.dashboardTitle}>Rozetler</Text>
              <Text style={styles.dashboardSubtitle}>Başarılar</Text>
            </TouchableOpacity>
          )}

          {/* Günlük Ödül - Sadece B2C modunda göster */}
          {!isB2BMode && (
            <TouchableOpacity 
              style={styles.dashboardCard} 
              onPress={() => {
                if (!isLoggedIn) {
                  setLoginRequiredMessage('Günlük ödüller için lütfen giriş yapın');
                  setShowLoginRequiredModal(true);
                } else {
                  navigation.navigate('DailyReward');
                }
              }}
            >
              <View style={styles.dashboardIcon}>
                <Ionicons name="gift-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.dashboardTitle}>Günlük Ödül</Text>
              <Text style={styles.dashboardSubtitle}>Her Gün Kazan</Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>YENİ</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Görevler - Sadece B2C modunda göster */}
          {!isB2BMode && (
            <TouchableOpacity 
              style={styles.dashboardCard} 
              onPress={() => {
                if (!isLoggedIn) {
                  setLoginRequiredMessage('Görevler için lütfen giriş yapın');
                  setShowLoginRequiredModal(true);
                } else {
                  navigation.navigate('Quest');
                }
              }}
            >
              <View style={styles.dashboardIcon}>
                <Ionicons name="trophy-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.dashboardTitle}>Görevler</Text>
              <Text style={styles.dashboardSubtitle}>Puan Kazan</Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>YENİ</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* AI Route Planner - Her zaman göster */}
          <TouchableOpacity 
            style={styles.dashboardCard} 
            onPress={() => navigation.navigate('AiRoutePlanner')}
          >
            <View style={styles.dashboardIcon}>
              <Ionicons name="compass-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>AI Rota Planlayıcı</Text>
            <Text style={styles.dashboardSubtitle}>Kamp rotanı oluştur</Text>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>YENİ</Text>
            </View>
          </TouchableOpacity>

          {/* Fiyat Alarmları - Sadece B2C modunda göster */}
          {!isB2BMode && (
            <TouchableOpacity 
              style={styles.dashboardCard} 
              onPress={() => {
                if (!isLoggedIn) {
                  setLoginRequiredMessage('Fiyat alarmları için lütfen giriş yapın');
                  setShowLoginRequiredModal(true);
                } else {
                  navigation.navigate('PriceAlerts');
                }
              }}
            >
              <View style={styles.dashboardIcon}>
                <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.dashboardTitle}>Fiyat Alarmları</Text>
              <Text style={styles.dashboardSubtitle}>Fiyat Takibi</Text>
            </TouchableOpacity>
          )}

        </View>

        {/* B2B Müşteri Bilgileri - Sadece kurumsal hesaplar VE B2B modunda olanlar görebilir */}
        {accountType === 'corporate' && isB2BMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>B2B Müşteri Bilgileri</Text>
            <View style={styles.menuCard}>
              <View style={styles.b2bInfoCard}>
                <View style={styles.b2bHeader}>
                  <Ionicons name="business" size={32} color={COLORS.primary} />
                  <View style={styles.b2bBadge}>
                    <Text style={styles.b2bBadgeText}>KURUMSAL</Text>
                  </View>
                </View>
                
                <View style={styles.b2bInfoRow}>
                  <Text style={styles.b2bLabel}>Şirket Adı</Text>
                  <Text style={styles.b2bValue}>{companyName || 'Belirtilmemiş'}</Text>
                </View>
                
                <View style={styles.b2bDivider} />
                
                <View style={styles.b2bInfoRow}>
                  <Text style={styles.b2bLabel}>Vergi Numarası</Text>
                  <Text style={styles.b2bValue}>{taxNumber || 'Belirtilmemiş'}</Text>
                </View>
                
                <View style={styles.b2bDivider} />
                
                <View style={styles.b2bInfoRow}>
                  <Text style={styles.b2bLabel}>Yetkili Kişi</Text>
                  <Text style={styles.b2bValue}>{authorizedPerson || 'Belirtilmemiş'}</Text>
                </View>
                
                <View style={styles.b2bDivider} />
                
                <View style={styles.b2bInfoRow}>
                  <Text style={styles.b2bLabel}>E-posta</Text>
                  <Text style={styles.b2bValue}>{userEmail || 'Belirtilmemiş'}</Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.b2bEditButton}
                  onPress={() => navigation.navigate('PersonalInfo')}
                >
                  <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.b2bEditText}>Bilgileri Düzenle</Text>
                </TouchableOpacity>
              </View>
              
              {/* B2B Özel Menü Öğeleri */}
              <View style={styles.b2bMenuSection}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => navigation.navigate('Invoices')}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons name="document-text-outline" size={22} color={COLORS.gray600} />
                  </View>
                  <Text style={styles.menuTitle}>Toplu Faturalar</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
                </TouchableOpacity>
                
                <View style={styles.menuDivider} />
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => navigation.navigate('Wholesale')}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons name="cart-outline" size={22} color={COLORS.gray600} />
                  </View>
                  <Text style={styles.menuTitle}>Toptan Sipariş Geçmişi</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
                </TouchableOpacity>
                
                <View style={styles.menuDivider} />
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => navigation.navigate('Settings')}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons name="pricetag-outline" size={22} color={COLORS.gray600} />
                  </View>
                  <Text style={styles.menuTitle}>Özel Fiyatlandırma</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>B2B</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Ayarları</Text>
          <View style={styles.menuCard}>
            {MENU_ITEMS
              .filter(item => {
                // B2B modunda Seviyem ve İade Taleplerim'i gizle
                if (isB2BMode && (item.id === 2 || item.id === 7)) {
                  return false;
                }
                return true;
              })
              .map((item, index, filteredArray) => (
                <View key={item.id}>
                  <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={() => item.screen && navigation.navigate(item.screen)}
                  >
                    <View style={styles.menuIcon}>
                      <Ionicons name={item.icon} size={22} color={COLORS.gray600} />
                    </View>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
                  </TouchableOpacity>
                  {index < filteredArray.length - 1 && <View style={styles.menuDivider} />}
                </View>
              ))}
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uygulama Ayarları</Text>
          <View style={styles.menuCard}>
            {APP_SETTINGS
              .filter(item => {
                // B2B modundayken Toptan Satış programını gizle (zaten B2B müşterisi)
                if (isB2BMode && item.screen === 'Wholesale') {
                  return false;
                }
                return true;
              })
              .map((item, index, filteredArray) => (
              <View key={item.id}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => item.screen && navigation.navigate(item.screen)}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons name={item.icon} size={22} color={COLORS.gray600} />
                  </View>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  {item.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
                </TouchableOpacity>
                {index < filteredArray.length - 1 && <View style={styles.menuDivider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          {isLoggedIn ? (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
              <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.logoutButton, { borderColor: COLORS.primary, backgroundColor: 'rgba(17, 212, 33, 0.05)' }]}
              onPress={() => navigation.navigate('Login')}
            >
              <Ionicons name="log-in-outline" size={20} color={COLORS.primary} />
              <Text style={[styles.logoutText, { color: COLORS.primary }]}>Giriş Yap</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.version}>Huglu Tekstil App v1.0.0 (Beta)</Text>
        </View>
      </ScrollView>

      {/* Logout Confirm Modal */}
      <ConfirmModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title="Çıkış Yap"
        message="Çıkış yapmak istediğinize emin misiniz?"
        confirmText="Çıkış Yap"
        cancelText="İptal"
        confirmColor={COLORS.error}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorMessage}
      />

      {/* Login Required Modal */}
      <LoginRequiredModal
        visible={showLoginRequiredModal}
        onClose={() => setShowLoginRequiredModal(false)}
        onLogin={() => {
          setShowLoginRequiredModal(false);
          navigation.navigate('Login');
        }}
        message={loginRequiredMessage}
      />
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
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },

  editAvatarButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.gray500,
    marginBottom: 8,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  membershipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  memberSince: {
    fontSize: 14,
    color: COLORS.gray500,
    marginBottom: 16,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  // Mode Toggle Styles
  modeToggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modeToggleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modeToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modeToggleInfo: {
    flex: 1,
  },
  modeToggleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  modeToggleDesc: {
    fontSize: 13,
    color: COLORS.gray600,
    lineHeight: 18,
  },
  modeToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  modeToggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  modeToggleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modeToggleButtonTextActive: {
    color: COLORS.white,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  dashboardCard: {
    width: '48%',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    alignItems: 'flex-start',
    position: 'relative',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },
  dashboardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  dashboardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  menuValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuValueText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginLeft: 72,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.error,
  },
  version: {
    fontSize: 12,
    color: COLORS.gray400,
    textAlign: 'center',
    marginTop: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    marginLeft: 'auto',
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  // B2B Styles
  b2bInfoCard: {
    padding: 16,
  },
  b2bHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  b2bBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  b2bBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  b2bInfoRow: {
    paddingVertical: 12,
  },
  b2bLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray500,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  b2bValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  b2bDivider: {
    height: 1,
    backgroundColor: COLORS.gray100,
  },
  b2bEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  b2bEditText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  b2bMenuSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
});
