import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ScrollView, Modal, Image, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import ProductCard from '../components/ProductCard';
import ErrorModal from '../components/ErrorModal';
import { COLORS } from '../constants/colors';
import { productsAPI, flashDealsAPI } from '../services/api';
import { getCategoryIcon, getIoniconName } from '../utils/categoryIcons';
import voiceRecognitionService from '../services/voiceRecognition';
import analytics from '../services/analytics';
import safeLog from '../utils/safeLogger';
import { useAlert } from '../hooks/useAlert';

const RECENT_SEARCHES = ['Çadır', 'Kamp Ekipmanı', 'Trekking Bot', 'Sırt Çantası'];

const POPULAR_SEARCHES = [
  'Kamp Çadırı',
  'Uyku Tulumu',
  'Outdoor Ayakkabı',
  'Trekking Botu',
  'Sırt Çantası',
  'Kamp Sobası',
];


export default function SearchScreen({ navigation }) {
  const alert = useAlert();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isImageSearching, setIsImageSearching] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingImageUri, setPendingImageUri] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');
  const [pendingPermissionType, setPendingPermissionType] = useState(null); // 'camera' or 'storage'
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const searchDebounceRef = useRef(null);
  const lastSearchQueryRef = useRef('');

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    loadCategories();
    loadAllCategories();
  }, []);

  const loadAllCategories = async () => {
    try {
      const response = await productsAPI.getCategories();
      if (response.data?.success) {
        const categoriesData = response.data.data || [];
        const categoryList = categoriesData
          .filter(cat => cat && typeof cat === 'string' && cat.trim() !== '')
          .map(cat => cat.trim());
        setAllCategories(categoryList);
      }
    } catch (error) {
      safeLog.error('Tüm kategoriler yüklenemedi:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await productsAPI.getCategories();
      if (response.data?.success) {
        const categoriesData = response.data.data?.categories || response.data.data || [];
        const categoryList = categoriesData.map(cat => {
          if (typeof cat === 'string') return cat;
          return cat.name || cat.categoryName || cat.category || '';
        }).filter(Boolean);
        setCategories(categoryList.slice(0, 4)); // İlk 4 kategoriyi al
      }
    } catch (error) {
      console.error('Kategoriler yüklenemedi:', error);
      setCategories(['Çadırlar', 'Botlar', 'Çantalar', 'Kıyafetler']); // Fallback
    }
  };

  const performSearch = async (query) => {
    const trimmedQuery = String(query || '').trim();
    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    lastSearchQueryRef.current = trimmedQuery;
    setIsSearching(true);
    try {
      safeLog.debug('Arama yapılıyor:', trimmedQuery);
      try {
        await analytics.trackSearch(trimmedQuery);
      } catch (analyticsError) {
        safeLog.debug('Analytics search error:', analyticsError);
      }
      const response = await productsAPI.search(trimmedQuery);
      if (lastSearchQueryRef.current !== trimmedQuery) return;
      if (response.data?.success) {
        let products = Array.isArray(response.data.data)
          ? response.data.data
          : response.data.data?.products || response.data.products || response.data.data || [];
          
          // Array değilse array'e çevir
          if (!Array.isArray(products)) {
            products = products ? [products] : [];
          }
          
          if (products.length === 0) {
            safeLog.debug('Search boş döndü, fallback filtreleme deneniyor...');
            try {
              const allProductsResponse = await productsAPI.getAll({ limit: 100 });
              if (lastSearchQueryRef.current !== trimmedQuery) return;
              if (allProductsResponse.data?.success) {
                const allProductsRaw = allProductsResponse.data.data?.products || 
                                  allProductsResponse.data.products || 
                                  allProductsResponse.data.data || 
                                  [];
                const allProducts = Array.isArray(allProductsRaw) ? allProductsRaw : [];
                const searchLower = trimmedQuery.toLowerCase();
                products = allProducts.filter(p => {
                  const name = (p.name || '').toLowerCase();
                  const category = (p.category || '').toLowerCase();
                  const description = (p.description || '').toLowerCase();
                  const sku = (p.sku || p.stockCode || p.barkod || '').toLowerCase();
                  
                  return name.includes(searchLower) || 
                         category.includes(searchLower) || 
                         description.includes(searchLower) ||
                         sku.includes(searchLower);
                });
              }
            } catch (fallbackError) {
              console.log('❌ Fallback arama da başarısız:', fallbackError.message);
            }
          }
          
          if (products.length === 0 && /^[a-zA-Z0-9-_]+$/.test(trimmedQuery)) {
            try {
              const barcodeResponse = await productsAPI.searchByBarcode(trimmedQuery);
              if (barcodeResponse.data?.success && barcodeResponse.data.data) {
                // Tek ürün döndüyse array'e çevir
                const barcodeProduct = barcodeResponse.data.data;
                products = Array.isArray(barcodeProduct) ? barcodeProduct : [barcodeProduct];
              }
            } catch (barcodeError) {
              safeLog.debug('Stok kodu araması sonuç vermedi:', barcodeError.message);
            }
          }
          
          // Flash deal bilgisini ekle
          try {
            const flashDealsResponse = await flashDealsAPI.getActive();
            if (flashDealsResponse.data?.success) {
              const flashDealsData = flashDealsResponse.data.data || [];
              
              // Tüm flash deal ürünlerinin ID'lerini topla
              const flashDealMap = new Map(); // productId -> flashDeal info
              
              flashDealsData.forEach(deal => {
                const dealProducts = deal.products || [];
                dealProducts.forEach(product => {
                  const productId = product.id || product._id;
                  if (productId) {
                    if (!flashDealMap.has(productId)) {
                      const basePrice = parseFloat(product.price || 0);
                      const discountValue = parseFloat(deal.discount_value || 0);
                      let discountedPrice = basePrice;
                      
                      if (deal.discount_type === 'percentage') {
                        discountedPrice = basePrice * (1 - discountValue / 100);
                      } else {
                        discountedPrice = basePrice - discountValue;
                      }
                      
                      flashDealMap.set(productId, {
                        oldPrice: basePrice,
                        price: Math.max(0, discountedPrice),
                        isFlashDeal: true,
                        dealName: deal.name,
                      });
                    }
                  }
                });
              });
              
              // Ürünlere flash deal bilgisini ekle
              products = products.map(product => {
                const productId = product.id || product._id;
                if (flashDealMap.has(productId)) {
                  const flashDealInfo = flashDealMap.get(productId);
                  return {
                    ...product,
                    ...flashDealInfo,
                  };
                }
                return product;
              });
            }
          } catch (flashDealError) {
            safeLog.debug('Flash deals yüklenemedi:', flashDealError.message);
          }
          if (lastSearchQueryRef.current === trimmedQuery) {
            setSearchResults(products);
          }
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        if (lastSearchQueryRef.current === trimmedQuery) {
          safeLog.error('Arama hatası:', { message: error.message });
          setSearchResults([]);
        }
      } finally {
        if (lastSearchQueryRef.current === trimmedQuery) {
          setIsSearching(false);
        }
      }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (text.trim().length === 0) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(() => performSearch(text), 400);
  };

  useEffect(() => {
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, []);

  const clearSearch = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    setSearchQuery('');
    setIsSearching(false);
    setSearchResults([]);
  };



  const handleVoiceSearch = async () => {
    if (isListening) {
      // Dinleme aktifse durdur
      await voiceRecognitionService.stopListening();
      setIsListening(false);
      return;
    }

    setIsListening(true);

    const success = await voiceRecognitionService.startListening(
      {
        lang: 'tr-TR',
        interimResults: true,
        onPartialResult: (transcript) => {
          // Kısmi sonuçları göster (opsiyonel)
          console.log('Kısmi sonuç:', transcript);
        }
      },
      (transcript) => {
        // Final sonuç
        console.log('✅ Ses tanıma tamamlandı:', transcript);
        setIsListening(false);
        
        if (transcript && transcript.trim().length > 0) {
          setSearchQuery(transcript.trim());
                performSearch(transcript.trim());
        } else {
          alert.show('Uyarı', 'Ses tanınamadı. Lütfen tekrar deneyin.');
        }
      },
      (error) => {
        // Hata
        console.log('ℹ️ Ses tanıma hatası:', error);
        setIsListening(false);
        
        // Sadece kullanıcı hataları için alert göster
        if (error === 'İzin verilmedi') {
          alert.show(
            'Mikrofon İzni',
            'Sesli arama kullanmak için mikrofon iznine ihtiyacımız var.',
            [{ text: 'Tamam' }]
          );
        } else if (error === 'Desteklenmiyor') {
          // Sessizce logla, kullanıcıya gösterme
          console.log('ℹ️ Ses tanıma bu cihazda desteklenmiyor');
        }
      }
    );

    if (!success) {
      setIsListening(false);
    }
  };

  const openBarcodeScanner = () => {
    if (hasPermission === null) {
      alert.show('İzin Bekleniyor', 'Kamera izni kontrol ediliyor...');
      return;
    }
    if (hasPermission === false) {
      alert.show('İzin Gerekli', 'Barkod okutmak için kamera izni gereklidir.', [
        { text: 'Tamam' }
      ]);
      return;
    }
    setScanned(false);
    setShowScanner(true);
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    
    setScanned(true);
    setShowScanner(false);
    
    console.log(`Barkod okundu: ${data} (Tip: ${type})`);
    
    // Barkod ile ürün ara
    try {
      const response = await productsAPI.searchByBarcode(data);
      if (response.data?.success && response.data.data) {
        const product = response.data.data;
        // Ürün bulundu, detay sayfasına git
        navigation.navigate('ProductDetail', { product });
      } else {
        alert.show('Ürün Bulunamadı', `Barkod: ${data}\n\nBu barkoda ait ürün bulunamadı.`, [
          { text: 'Tekrar Dene', onPress: () => openBarcodeScanner() },
          { text: 'Tamam' }
        ]);
      }
    } catch (error) {
      console.error('Barkod arama hatası:', error);
      alert.show('Hata', 'Barkod aranırken bir hata oluştu.', [
        { text: 'Tekrar Dene', onPress: () => openBarcodeScanner() },
        { text: 'Tamam' }
      ]);
    }
  };

  const handleImageSearch = () => {
    setShowImagePickerModal(true);
  };

  const checkStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        let permission;
        if (Platform.Version >= 33) {
          permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
        } else {
          permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        }
        const result = await PermissionsAndroid.check(permission);
        return result;
      } catch (err) {
        console.warn('İzin kontrolü hatası:', err);
        return false;
      }
    }
    return true; // iOS için varsayılan olarak true
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        let permission;
        if (Platform.Version >= 33) {
          permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
        } else {
          permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        }
        const granted = await PermissionsAndroid.request(permission);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('İzin hatası:', err);
        return false;
      }
    }
    return true; // iOS için varsayılan olarak true
  };

  const selectImageFromGallery = async () => {
    try {
      setShowImagePickerModal(false);
      
      // Önce izin kontrolü yap (native dialog göstermeden)
      const hasPermission = await checkStoragePermission();
      if (!hasPermission) {
        setPermissionMessage('Galeriye erişmek için depolama iznine ihtiyacımız var.');
        setPendingPermissionType('storage');
        setShowPermissionModal(true);
        return;
      }

      launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.8,
          selectionLimit: 1,
        },
        (response) => {
          if (response.didCancel) {
            return;
          }
          if (response.errorMessage) {
            alert.show('Hata', response.errorMessage || 'Görsel seçilirken bir hata oluştu.');
            return;
          }
          if (response.assets && response.assets.length > 0) {
            const imageUri = response.assets[0].uri;
            setPendingImageUri(imageUri);
            setShowCategoryModal(true);
          }
        }
      );
    } catch (error) {
      console.error('❌ Galeri seçme hatası:', error);
      alert.show('Hata', 'Görsel seçilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const checkCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const result = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        return result;
      } catch (err) {
        console.warn('İzin kontrolü hatası:', err);
        return false;
      }
    }
    return true; // iOS için varsayılan olarak true
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('İzin hatası:', err);
        return false;
      }
    }
    return true; // iOS için varsayılan olarak true
  };

  const takePhoto = async () => {
    try {
      setShowImagePickerModal(false);
      
      // Önce izin kontrolü yap (native dialog göstermeden)
      const hasPermission = await checkCameraPermission();
      if (!hasPermission) {
        setPermissionMessage('Fotoğraf çekmek için kamera iznine ihtiyacımız var.');
        setPendingPermissionType('camera');
        setShowPermissionModal(true);
        return;
      }

      launchCamera(
        {
          mediaType: 'photo',
          quality: 0.8,
        },
        (response) => {
          if (response.didCancel) {
            return;
          }
          if (response.errorMessage) {
            alert.show('Hata', response.errorMessage || 'Fotoğraf çekilirken bir hata oluştu.');
            return;
          }
          if (response.assets && response.assets.length > 0) {
            const imageUri = response.assets[0].uri;
            setPendingImageUri(imageUri);
            setShowCategoryModal(true);
          }
        }
      );
    } catch (error) {
      console.error('❌ Kamera hatası:', error);
      alert.show('Hata', 'Fotoğraf çekilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const performImageSearch = async (imageUri, category = null) => {
    if (!imageUri) {
      alert.show('Hata', 'Görsel URI bulunamadı.');
      return;
    }

    try {
      setIsImageSearching(true);
      setSelectedImage(imageUri);
      setSearchQuery('');
      setIsSearching(true);
      setShowCategoryModal(false);
      
      console.log('🖼️ Görselden arama yapılıyor...', imageUri, category ? `Kategori: ${category}` : '');
      
      // Analytics: Image search tracking
      try {
        await analytics.trackEvent('image_search', { source: 'search_screen', category });
      } catch (analyticsError) {
        console.log('Analytics image search error:', analyticsError);
      }
      
      const response = await productsAPI.searchByImage(imageUri, category);
      
      console.log('📦 Görsel arama yanıtı:', response.data);
      
      if (response && response.data?.success) {
        let products = response.data.data?.products || 
                      response.data.products || 
                      response.data.data || 
                      [];
        
        if (!Array.isArray(products)) {
          products = products ? [products] : [];
        }
        
        setSearchResults(products);
        
        if (products.length === 0) {
          alert.show(
            'Sonuç Bulunamadı',
            'Görsele benzer ürün bulunamadı. Farklı bir görsel deneyin veya metin araması yapın.',
            [{ text: 'Tamam' }]
          );
        }
      } else {
        alert.show('Hata', response?.data?.message || 'Görsel araması başarısız oldu.');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('❌ Görsel arama hatası:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
      });
      alert.show(
        'Hata',
        error.message || 'Görsel araması yapılırken bir hata oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
      setSearchResults([]);
    } finally {
      setIsImageSearching(false);
      setPendingImageUri(null);
    }
  };

  const handleCategorySelect = (category) => {
    if (pendingImageUri) {
      performImageSearch(pendingImageUri, category);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ürün, kategori, marka veya stok kodu ara..."
            placeholderTextColor={COLORS.gray400}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray400} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={handleVoiceSearch}
            style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
            activeOpacity={0.7}
          >
            {isListening ? (
              <View style={styles.listeningIndicator}>
                <Ionicons name="mic" size={20} color={COLORS.white} />
              </View>
            ) : (
              <Ionicons name="mic-outline" size={20} color={COLORS.gray400} />
            )}
          </TouchableOpacity>
        </View>
        {isListening && (
          <View style={styles.listeningBanner}>
            <View style={styles.listeningDot} />
            <Text style={styles.listeningText}>Dinleniyor...</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.overflowMenuButton}
          onPress={() => setShowOverflowMenu(true)}
        >
          <Ionicons name="ellipsis-vertical" size={22} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      {/* Overflow Menu - Barkod & Görsel Arama */}
      <Modal
        visible={showOverflowMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOverflowMenu(false)}
      >
        <TouchableOpacity
          style={styles.overflowMenuBackdrop}
          activeOpacity={1}
          onPress={() => setShowOverflowMenu(false)}
        >
          <TouchableOpacity
            style={styles.overflowMenuContent}
            activeOpacity={1}
            onPress={() => {}}
          >
            <TouchableOpacity
              style={styles.overflowMenuItem}
              onPress={() => {
                setShowOverflowMenu(false);
                openBarcodeScanner();
              }}
            >
              <Ionicons name="barcode-outline" size={22} color={COLORS.primary} />
              <Text style={styles.overflowMenuText}>Barkod Arama</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.overflowMenuItem, styles.overflowMenuItemLast]}
              onPress={() => {
                setShowOverflowMenu(false);
                handleImageSearch();
              }}
              disabled={isImageSearching}
            >
              {isImageSearching ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="image-outline" size={22} color={COLORS.primary} />
              )}
              <Text style={[styles.overflowMenuText, isImageSearching && styles.overflowMenuTextDisabled]}>
                Görsel Arama
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      
      {/* Selected Image Preview */}
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => {
              setSelectedImage(null);
              setSearchResults([]);
              setIsSearching(false);
            }}
          >
            <Ionicons name="close-circle" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.imagePreviewText}>Görselden arama yapılıyor...</Text>
        </View>
      )}

      {/* Permission Modal */}
      <ErrorModal
        visible={showPermissionModal}
        onClose={() => {
          setShowPermissionModal(false);
          setPendingPermissionType(null);
        }}
        title="İzin Gerekli"
        message={permissionMessage}
        actionButtonText="İZİN VER"
        onActionPress={async () => {
          setShowPermissionModal(false);
          let hasPermission = false;
          
          if (pendingPermissionType === 'storage') {
            hasPermission = await requestStoragePermission();
            if (hasPermission) {
              // İzin verildi, galeriyi aç
              launchImageLibrary(
                {
                  mediaType: 'photo',
                  quality: 0.8,
                  selectionLimit: 1,
                },
                (response) => {
                  if (response.didCancel) {
                    return;
                  }
                  if (response.errorMessage) {
                    alert.show('Hata', response.errorMessage || 'Görsel seçilirken bir hata oluştu.');
                    return;
                  }
                  if (response.assets && response.assets.length > 0) {
                    const imageUri = response.assets[0].uri;
                    setPendingImageUri(imageUri);
                    setShowCategoryModal(true);
                  }
                }
              );
            }
          } else if (pendingPermissionType === 'camera') {
            hasPermission = await requestCameraPermission();
            if (hasPermission) {
              // İzin verildi, kamerayı aç
              launchCamera(
                {
                  mediaType: 'photo',
                  quality: 0.8,
                },
                (response) => {
                  if (response.didCancel) {
                    return;
                  }
                  if (response.errorMessage) {
                    alert.show('Hata', response.errorMessage || 'Fotoğraf çekilirken bir hata oluştu.');
                    return;
                  }
                  if (response.assets && response.assets.length > 0) {
                    const imageUri = response.assets[0].uri;
                    setPendingImageUri(imageUri);
                    setShowCategoryModal(true);
                  }
                }
              );
            }
          }
          
          setPendingPermissionType(null);
        }}
      />

      {/* Minimalist Image Picker Modal */}
      <Modal
        visible={showImagePickerModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <TouchableOpacity
          style={styles.imagePickerModalOverlay}
          activeOpacity={1}
          onPress={() => setShowImagePickerModal(false)}
        >
          <View style={styles.imagePickerModal} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              onPress={() => setShowImagePickerModal(false)}
              style={styles.imagePickerCloseButton}
            >
              <Ionicons name="close" size={20} color={COLORS.gray500} />
            </TouchableOpacity>

            <View style={styles.imagePickerOptions}>
              <TouchableOpacity
                style={styles.imagePickerOption}
                onPress={selectImageFromGallery}
                activeOpacity={0.7}
              >
                <View style={styles.imagePickerIconContainer}>
                  <Ionicons name="images-outline" size={28} color={COLORS.primary} />
                </View>
                <Text style={styles.imagePickerOptionTitle}>Galeri</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.imagePickerOption}
                onPress={takePhoto}
                activeOpacity={0.7}
              >
                <View style={styles.imagePickerIconContainer}>
                  <Ionicons name="camera-outline" size={28} color={COLORS.primary} />
                </View>
                <Text style={styles.imagePickerOptionTitle}>Kamera</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowCategoryModal(false);
          setPendingImageUri(null);
        }}
      >
        <TouchableOpacity
          style={styles.categoryModalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowCategoryModal(false);
            setPendingImageUri(null);
          }}
        >
          <View style={styles.categoryModal} onStartShouldSetResponder={() => true}>
            <View style={styles.categoryModalHeader}>
              <Text style={styles.categoryModalTitle}>Kategori Seçin</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCategoryModal(false);
                  setPendingImageUri(null);
                }}
                style={styles.categoryModalCloseButton}
              >
                <Ionicons name="close" size={20} color={COLORS.gray500} />
              </TouchableOpacity>
            </View>
            
            {pendingImageUri && (
              <View style={styles.categoryModalImagePreview}>
                <Image source={{ uri: pendingImageUri }} style={styles.categoryModalImage} />
              </View>
            )}

            <Text style={styles.categoryModalSubtitle}>
              Hangi kategoride arama yapmak istersiniz?
            </Text>

            <ScrollView 
              style={styles.categoryModalScroll}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={styles.categoryOption}
                onPress={() => handleCategorySelect(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="grid-outline" size={20} color={COLORS.primary} />
                <Text style={styles.categoryOptionText}>Tüm Kategoriler</Text>
              </TouchableOpacity>
              
              {allCategories.map((category, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.categoryOption}
                  onPress={() => handleCategorySelect(category)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={getIoniconName(category)} size={20} color={COLORS.primary} />
                  <Text style={styles.categoryOptionText}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Barcode Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <SafeAreaView style={styles.scannerSafeArea} edges={['top']}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowScanner(false)}
              >
                <Ionicons name="close" size={28} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Barkod Okut</Text>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>
          
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
          
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            <Text style={styles.scannerInstruction}>
              Barkodu çerçeve içine yerleştirin
            </Text>
          </View>
        </View>
      </Modal>

      {searchQuery.trim().length === 0 ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          {RECENT_SEARCHES.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Son Aramalar</Text>
                <TouchableOpacity>
                  <Text style={styles.clearButton}>Temizle</Text>
                </TouchableOpacity>
              </View>
              {RECENT_SEARCHES.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.searchItem}
                  onPress={() => { setSearchQuery(search); performSearch(search); }}
                >
                  <Ionicons name="time-outline" size={20} color={COLORS.gray400} />
                  <Text style={styles.searchItemText}>{search}</Text>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.gray300} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Popular Searches */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popüler Aramalar</Text>
            <View style={styles.tagsContainer}>
              {POPULAR_SEARCHES.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.tag}
                  onPress={() => { setSearchQuery(search); performSearch(search); }}
                >
                  <Text style={styles.tagText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Categories Quick Access */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kategoriler</Text>
              <View style={styles.categoriesGrid}>
                {categories.map((category, index) => {
                  const categoryIconSource = getCategoryIcon(category);
                  return (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.categoryCard}
                      onPress={() => {
                        navigation.navigate('Shop');
                        // Kategori filtrelemesi için navigation params eklenebilir
                      }}
                    >
                      <View style={styles.categoryIcon}>
                        {categoryIconSource ? (
                          <Image 
                            source={categoryIconSource} 
                            style={styles.categoryIconImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <Ionicons 
                            name={getIoniconName(category)} 
                            size={24} 
                            color={COLORS.primary} 
                          />
                        )}
                      </View>
                      <Text style={styles.categoryName}>{category}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

        </ScrollView>
      ) : (
        <View style={styles.resultsContainer}>
          {searchResults.length > 0 ? (
            <>
              <Text style={styles.resultsCount}>
                {searchResults.length} sonuç bulundu
              </Text>
              <FlatList
                data={searchResults}
                keyExtractor={(item, index) => `${item.id || item._id || index}`}
                numColumns={2}
                contentContainerStyle={styles.productsList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.productWrapper}>
                    <ProductCard
                      product={item}
                      onPress={() => navigation.navigate('ProductDetail', { product: item })}
                      onFavorite={() => {}}
                    />
                  </View>
                )}
              />
            </>
          ) : !isSearching ? (
            <View style={styles.noResults}>
              <View style={styles.noResultsIcon}>
                <Ionicons name="search-outline" size={64} color={COLORS.gray300} />
              </View>
              <Text style={styles.noResultsTitle}>Sonuç Bulunamadı</Text>
              <Text style={styles.noResultsMessage}>
                "{searchQuery}" için sonuç bulunamadı.{'\n'}Farklı bir arama terimi deneyin.
              </Text>
            </View>
          ) : (
            <View style={styles.noResults}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Aranıyor...</Text>
            </View>
          )}
        </View>
      )}
      <alert.AlertComponent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
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
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textMain,
  },
  voiceButton: {
    padding: 4,
  },
  voiceButtonActive: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 6,
  },
  listeningIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listeningBanner: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  listeningText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  overflowMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 16,
  },
  overflowMenuContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  overflowMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray200,
  },
  overflowMenuText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textMain,
  },
  overflowMenuTextDisabled: {
    color: COLORS.gray400,
  },
  overflowMenuItemLast: {
    borderBottomWidth: 0,
  },
  barcodeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  imageSearchButton: {
    marginLeft: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.gray50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    alignSelf: 'center',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  imagePreviewText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray600,
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: COLORS.textMain,
  },
  scannerSafeArea: {
    zIndex: 10,
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORS.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scannerInstruction: {
    marginTop: 40,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  searchItemText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textMain,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    alignItems: 'center',
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  categoryIconImage: {
    width: 24,
    height: 24,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  productsList: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  productWrapper: {
    width: '50%',
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noResultsIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  noResultsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  noResultsMessage: {
    fontSize: 16,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray600,
    marginTop: 16,
  },
  imagePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  imagePickerModal: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  imagePickerCloseButton: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  imagePickerOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginTop: 8,
  },
  imagePickerOption: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 32,
    minWidth: 120,
  },
  imagePickerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(17, 212, 33, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  categoryModal: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  categoryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  categoryModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryModalImagePreview: {
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryModalImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
  },
  categoryModalSubtitle: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 16,
    textAlign: 'center',
  },
  categoryModalScroll: {
    maxHeight: 400,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.gray50,
    marginBottom: 8,
    gap: 12,
  },
  categoryOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
});
