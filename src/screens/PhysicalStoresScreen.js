import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Dimensions, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { COLORS } from '../constants/colors';
import { useAlert } from '../hooks/useAlert';

const { width, height } = Dimensions.get('window');

// Google Maps logosunu gizlemek için custom style
const hideGoogleLogoStyle = [
  {
    featureType: 'all',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }]
  }
];

const STORES = [
  {
    id: 1,
    name: 'Huğlu Merkez Fabrika',
    address: 'Huğlu, Beyşehir, Konya',
    city: 'Konya',
    phone: '0530 312 58 13',
    hours: '07:30 - 17:30',
    distance: '2.5 km',
    status: 'open',
    statusText: 'Açık',
    closingTime: '17:30\'da Kapanıyor',
    pickupAvailable: true,
    pickupReadyTime: '2 saat içinde',
    latitude: 37.475114447064136,
    longitude: 31.583744408154548,
    image: 'https://lh3.googleusercontent.com/gps-cs-s/AG0ilSwt5Uk-RzPQu55o7N8Mzzr2IfIEOIWdFx9dk47Vjv4mhmkB4Mav-_U30bQMzMeYFB1zEliKl6JJ-KdAMgBDhMn50-3IngAkCGk8gEf7Cbflv_dW0hC-vyJbvaz2wheftmjQP-5HyfkBFaM=w203-h152-k-no',
  },
  {
    id: 2,
    name: 'Huğlu Outdoor Beyşehir Şubesi',
    address: 'Beyşehir Merkez, Konya',
    city: 'Konya',
    phone: '0530 312 58 13',
    hours: '09:00 - 18:30',
    distance: '8.3 km',
    status: 'open',
    statusText: 'Açık',
    closingTime: '18:30\'da Kapanıyor',
    pickupAvailable: true,
    pickupReadyTime: '1 saat içinde',
    latitude: 37.684817091999946,
    longitude: 31.723626534914292,
    image: 'https://lh3.googleusercontent.com/gps-cs-s/AG0ilSxtxugS0yNiZ645FJ2p-GG_CImWzRU_L_UVFbvzfs9nD_TE7vU0_gAX4V8HBL_TdLXPoZVycM4SAZOmr_nPFEc2oVw0_WhEZgn3GiwH7f1KaqLzgPiplxvgOeLAcPmpe0fanPnJ2tkxXC8z=w203-h270-k-no',
  },
  {
    id: 3,
    name: 'Huğlu Outdoor Konya',
    address: 'Konya Merkez',
    city: 'Konya',
    phone: '0530 312 58 13',
    hours: '09:00 - 21:00',
    distance: '45 km',
    status: 'closed',
    statusText: 'Kapalı',
    closingTime: '09:00\'da Açılıyor',
    pickupAvailable: false,
    pickupReadyTime: null,
    latitude: 37.8667,
    longitude: 32.4833,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0IVKEnTTF7sC2tCeu7_kSnC5lf5eiyStDBPgfYtQ4ekSCDulBDOnuYteXf3GLR71nVTQbVY-kkfegtYq5iSMs_GgdPEQSxTqVOfvDxUPO0NQQ6eExP-rsXSsZNeb-JT42gcOG3T-xeBbl9bjq5r1rVBMnt2h0ByO66k579fdHnqG6o0eIptyhFUa2KzwihCIwrWMcROlDtu3CaT9ULBgMN9Ry8LiPxgDb4137Mnv0MZLV412m0rV-PV1fyydkI_3ULgAPCHZvf_8',
  },
];

export default function PhysicalStoresScreen({ navigation }) {
  const alert = useAlert();
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert.show('İzin Gerekli', 'Konumunuzu görmek için konum izni gerekiyor.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Konum alınamadı:', error);
    }
  };

  const focusOnStore = (store) => {
    setSelectedStore(store);
    if (mapRef.current && viewMode === 'map') {
      mapRef.current.animateToRegion({
        latitude: store.latitude,
        longitude: store.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  };

  const filteredStores = STORES.filter(store => 
    store.id !== 3 && (
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.phone.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return COLORS.primary;
      case 'closing': return '#FF9500';
      case 'closed': return '#FF3B30';
      default: return COLORS.gray500;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mağaza Bul</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Şehir, posta kodu, mağaza adı veya telefon..."
            placeholderTextColor={COLORS.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.locationButton}>
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={COLORS.gray400} />
          </TouchableOpacity>
        </View>
      </View>

      {/* View Toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleWrapper}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons 
              name="list" 
              size={18} 
              color={viewMode === 'list' ? COLORS.textMain : COLORS.gray500} 
            />
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
              Liste Görünümü
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
            onPress={() => setViewMode('map')}
          >
            <Ionicons 
              name="map" 
              size={18} 
              color={viewMode === 'map' ? COLORS.textMain : COLORS.gray500} 
            />
            <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>
              Harita Görünümü
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Preview */}
      {viewMode === 'list' && (
        <View style={styles.mapPreviewContainer}>
          <View style={styles.mapPreview}>
            <MapView
              ref={mapRef}
              style={styles.mapPreviewMap}
              initialRegion={{
                latitude: userLocation?.latitude || 37.475114447064136,
                longitude: userLocation?.longitude || 31.583744408154548,
                latitudeDelta: 0.5,
                longitudeDelta: 0.5,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              mapType="none"
              provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
              customMapStyle={Platform.OS === 'android' ? hideGoogleLogoStyle : []}
              mapPadding={{ bottom: -50, left: -50, right: -50, top: -50 }}
            >
              <UrlTile
                urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maximumZ={19}
                minimumZ={0}
                flipY={false}
                shouldReplaceMapContent={true}
                zIndex={-1}
                tileSize={256}
              />
              {STORES.filter(store => store.id !== 3).map((store) => (
                <Marker
                  key={store.id}
                  coordinate={{
                    latitude: store.latitude,
                    longitude: store.longitude,
                  }}
                  title={store.name}
                  description={store.address}
                >
                  <View style={styles.markerContainer}>
                    <Ionicons name="location" size={32} color={COLORS.primary} />
                  </View>
                </Marker>
              ))}
              {userLocation && (
                <Marker
                  coordinate={userLocation}
                  title="Konumunuz"
                >
                  <View style={styles.userMarker}>
                    <View style={styles.userMarkerDot} />
                  </View>
                </Marker>
              )}
            </MapView>
            <TouchableOpacity 
              style={styles.expandMapButton}
              onPress={() => setViewMode('map')}
            >
              <MaterialCommunityIcons name="arrow-expand" size={14} color={COLORS.primary} />
              <Text style={styles.expandMapText}>Haritayı Genişlet</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Full Map View */}
      {viewMode === 'map' ? (
        <View style={styles.fullMapContainer}>
          <MapView
            ref={mapRef}
            style={styles.fullMap}
            initialRegion={{
              latitude: userLocation?.latitude || 37.475114447064136,
              longitude: userLocation?.longitude || 31.583744408154548,
              latitudeDelta: 0.5,
              longitudeDelta: 0.5,
            }}
            showsUserLocation
            showsMyLocationButton
            mapType="none"
            provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
            customMapStyle={Platform.OS === 'android' ? hideGoogleLogoStyle : []}
            mapPadding={{ bottom: -50, left: -50, right: -50, top: -50 }}
          >
            <UrlTile
              urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
              minimumZ={0}
              flipY={false}
              shouldReplaceMapContent={true}
              zIndex={1}
              tileSize={256}
            />
            {STORES.filter(store => store.id !== 3).map((store) => (
              <Marker
                key={store.id}
                coordinate={{
                  latitude: store.latitude,
                  longitude: store.longitude,
                }}
                title={store.name}
                description={store.address}
                onPress={() => setSelectedStore(store)}
              >
                <View style={[
                  styles.markerContainer,
                  selectedStore?.id === store.id && styles.markerContainerSelected
                ]}>
                  <Ionicons 
                    name="location" 
                    size={40} 
                    color={selectedStore?.id === store.id ? COLORS.primary : COLORS.gray600} 
                  />
                </View>
              </Marker>
            ))}
          </MapView>

          {/* Selected Store Card */}
          {selectedStore && (
            <View style={styles.mapStoreCard}>
              <View style={styles.mapStoreContent}>
                <Image 
                  source={{ uri: selectedStore.image }}
                  style={styles.mapStoreImage}
                />
                <View style={styles.mapStoreInfo}>
                  <Text style={styles.mapStoreName} numberOfLines={1}>
                    {selectedStore.name}
                  </Text>
                  <Text style={styles.mapStoreAddress} numberOfLines={1}>
                    {selectedStore.address}
                  </Text>
                  <View style={styles.mapStoreStatus}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedStore.status) }]}>
                      {selectedStore.statusText}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.mapStoreButton}
                  onPress={() => {
                    navigation.navigate('Cart', { 
                      pickupStore: selectedStore,
                      deliveryMethod: 'pickup'
                    });
                  }}
                >
                  <Ionicons name="bag-check-outline" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ) : (
        /* Main Content */
        <View style={styles.contentWrapper}>
        <View style={styles.contentHeader}>
          <Text style={styles.contentTitle}>Yakındaki Mağazalar</Text>
          <TouchableOpacity>
            <Text style={styles.filterButton}>FİLTRELE</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {filteredStores.map((store) => (
            <View 
              key={store.id} 
              style={[
                styles.storeCard,
                store.status === 'closed' && styles.storeCardClosed
              ]}
            >
              <View style={styles.storeContent}>
                {/* Store Image */}
                <View style={[
                  styles.storeImageContainer,
                  store.status === 'closed' && styles.storeImageClosed
                ]}>
                  <Image 
                    source={{ uri: store.image }}
                    style={styles.storeImage}
                    resizeMode="cover"
                  />
                </View>

                {/* Store Info */}
                <View style={styles.storeInfo}>
                  <View style={styles.storeTopRow}>
                    <View style={styles.storeNameContainer}>
                      <Text style={[
                        styles.storeName,
                        store.status === 'closed' && styles.storeNameClosed
                      ]}>
                        {store.name}
                      </Text>
                      <View style={styles.statusRow}>
                        <Text style={[styles.statusText, { color: getStatusColor(store.status) }]}>
                          {store.statusText}
                        </Text>
                        <Text style={styles.statusDot}>•</Text>
                        <Text style={styles.closingText}>{store.closingTime}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={16} color={COLORS.gray500} />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {store.address}
                    </Text>
                  </View>
                  
                  {store.pickupAvailable && store.status === 'open' && (
                    <View style={styles.pickupInfoRow}>
                      <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                      <Text style={styles.pickupInfoText}>
                        Hazırlık süresi: {store.pickupReadyTime}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity 
                  style={[
                    styles.pickupAction,
                    store.status === 'closed' && styles.pickupActionDisabled
                  ]}
                  disabled={store.status === 'closed'}
                  onPress={() => {
                    if (store.status !== 'closed') {
                      navigation.navigate('Cart', { 
                        pickupStore: store,
                        deliveryMethod: 'pickup'
                      });
                    }
                  }}
                >
                  <Ionicons 
                    name="bag-check-outline" 
                    size={18} 
                    color={store.status === 'closed' ? COLORS.gray400 : COLORS.white} 
                  />
                  <Text style={[
                    styles.pickupActionText,
                    store.status === 'closed' && styles.pickupActionTextDisabled
                  ]}>
                    Mağazadan Teslim Al
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.secondaryActionsContainer}>
                <TouchableOpacity 
                  style={[
                    styles.secondaryActionButton,
                    store.status === 'closed' && styles.secondaryActionDisabled
                  ]}
                  disabled={store.status === 'closed'}
                  onPress={async () => {
                    try {
                      // Google Maps yol tarifi
                      let directionsUrl;
                      if (userLocation) {
                        // Kullanıcı konumu varsa, başlangıç noktası olarak kullan
                        directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${store.latitude},${store.longitude}`;
                      } else {
                        // Kullanıcı konumu yoksa, sadece hedefi göster
                        directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
                      }
                      
                      const canOpen = await Linking.canOpenURL(directionsUrl);
                      if (canOpen) {
                        await Linking.openURL(directionsUrl);
                      } else {
                        // Google Maps uygulaması yoksa, web tarayıcısında aç
                        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
                        await Linking.openURL(webUrl);
                      }
                    } catch (error) {
                      console.error('Yol tarifi açma hatası:', error);
                      alert.show('Hata', 'Yol tarifi açılırken bir hata oluştu.');
                    }
                  }}
                >
                  <Ionicons 
                    name="navigate" 
                    size={18} 
                    color={store.status === 'closed' ? COLORS.gray400 : COLORS.primary} 
                  />
                  <Text style={[
                    styles.secondaryActionButtonText,
                    store.status === 'closed' && styles.secondaryActionTextDisabled
                  ]}>
                    Yol Tarifi
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.secondaryActionButton,
                    store.status === 'closed' && styles.secondaryActionDisabled
                  ]}
                  disabled={store.status === 'closed'}
                  onPress={async () => {
                    try {
                      // Telefon numarasını düzenle
                      let phoneNumber = store.phone.trim();
                      
                      // Boşlukları ve tireleri kaldır
                      phoneNumber = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
                      
                      // Eğer +90 ile başlıyorsa, +90'ı koru
                      // Eğer 0 ile başlıyorsa, 0'ı koru
                      // Eğer sadece rakamlar varsa ve 10 haneli ise, başına 0 ekle
                      if (phoneNumber.startsWith('+90')) {
                        // +90 ile başlıyorsa, olduğu gibi kullan
                        phoneNumber = phoneNumber;
                      } else if (phoneNumber.startsWith('0')) {
                        // 0 ile başlıyorsa, olduğu gibi kullan
                        phoneNumber = phoneNumber;
                      } else if (/^\d{10}$/.test(phoneNumber)) {
                        // 10 haneli numara ise, başına 0 ekle
                        phoneNumber = '0' + phoneNumber;
                      } else if (/^\d{11}$/.test(phoneNumber) && phoneNumber.startsWith('90')) {
                        // 90 ile başlayan 11 haneli numara ise, + ekle
                        phoneNumber = '+' + phoneNumber;
                      }
                      
                      // XXX gibi placeholder'lar varsa uyarı ver
                      if (phoneNumber.includes('X') || phoneNumber.includes('x')) {
                        alert.show('Bilgi', 'Bu mağaza için telefon numarası henüz tanımlanmamış.');
                        return;
                      }
                      
                      const telUrl = `tel:${phoneNumber}`;
                      
                      const canOpen = await Linking.canOpenURL(telUrl);
                      if (canOpen) {
                        await Linking.openURL(telUrl);
                      } else {
                        alert.show('Hata', 'Telefon araması başlatılamadı.');
                      }
                    } catch (error) {
                      console.error('Telefon arama hatası:', error);
                      alert.show('Hata', 'Telefon araması başlatılırken bir hata oluştu.');
                    }
                  }}
                >
                  <Ionicons 
                    name="call-outline" 
                    size={18} 
                    color={store.status === 'closed' ? COLORS.gray400 : COLORS.primary} 
                  />
                  <Text style={[
                    styles.secondaryActionButtonText,
                    store.status === 'closed' && styles.secondaryActionTextDisabled
                  ]}>
                    Ara
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <View style={{ height: 20 }} />
        </ScrollView>
      </View>

      )}

      <alert.AlertComponent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f6f8f6',
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
    letterSpacing: -0.5,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f6f8f6',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textMain,
  },
  locationButton: {
    padding: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
    marginLeft: 8,
  },
  toggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f6f8f6',
  },
  toggleWrapper: {
    flexDirection: 'row',
    height: 40,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  toggleTextActive: {
    color: COLORS.textMain,
  },
  mapPreviewContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    backgroundColor: '#f6f8f6',
  },
  mapPreview: {
    height: 128,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  mapPreviewMap: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerContainerSelected: {
    transform: [{ scale: 1.2 }],
  },
  userMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(17, 212, 33, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  fullMapContainer: {
    flex: 1,
  },
  fullMap: {
    width: '100%',
    height: '100%',
  },
  mapStoreCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  mapStoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mapStoreImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  mapStoreInfo: {
    flex: 1,
  },
  mapStoreName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  mapStoreAddress: {
    fontSize: 12,
    color: COLORS.gray500,
    marginBottom: 4,
  },
  mapStoreStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapStoreButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  expandMapButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -60 }, { translateY: -16 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  expandMapText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 5,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    letterSpacing: -0.5,
  },
  filterButton: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  storeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  storeCardClosed: {
    opacity: 0.6,
  },
  storeContent: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  storeImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  storeImageClosed: {
    opacity: 0.5,
  },
  storeImage: {
    width: '100%',
    height: '100%',
  },
  storeInfo: {
    flex: 1,
  },
  storeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  storeNameContainer: {
    flex: 1,
    marginRight: 8,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  storeNameClosed: {
    color: COLORS.gray600,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusDot: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  closingText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.gray500,
    lineHeight: 18,
  },
  pickupInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(17, 212, 33, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  pickupInfoText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionsContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  pickupAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pickupActionDisabled: {
    backgroundColor: '#f1f5f9',
    shadowOpacity: 0,
    elevation: 0,
  },
  pickupActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  pickupActionTextDisabled: {
    color: COLORS.gray400,
  },
  secondaryActionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    backgroundColor: 'rgba(17, 212, 33, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 33, 0.2)',
  },
  secondaryActionDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  secondaryActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  secondaryActionTextDisabled: {
    color: COLORS.gray400,
  },
});
