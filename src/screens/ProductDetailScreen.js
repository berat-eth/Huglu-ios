import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Share, Modal, TextInput, Animated, ActivityIndicator } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import CustomModal from '../components/CustomModal';
import ModalOption from '../components/ModalOption';
import ProductRecommendations from '../components/ProductRecommendations';
import ProductCard from '../components/ProductCard';
import AddToCartSuccessModal from '../components/AddToCartSuccessModal';
import LoginRequiredModal from '../components/LoginRequiredModal';
import { COLORS } from '../constants/colors';
import { productsAPI, cartAPI, productQuestionsAPI, wishlistAPI, chatbotAPI, userLevelAPI, flashDealsAPI, priceAlertsAPI, aiTipsAPI } from '../services/api';
import { getApiUrl } from '../config/api.config';
import { secureStorage } from '../utils/secureStorage';
import { generateWeightedRandomViewers } from '../utils/liveViewersGenerator';
import { useAlert } from '../hooks/useAlert';
import analytics from '../services/analytics';

const { width } = Dimensions.get('window');

// İsim maskeleme fonksiyonu: "Berat Şimşek" -> "Be****** Şi*******"
// Her kelime için: ilk 2 harf + geri kalanı yıldız (minimum 6 yıldız)
const maskUserName = (name) => {
  // Null, undefined veya boş string kontrolü
  if (!name) return 'Kullanıcı';

  // String'e çevir ve trim yap
  const nameStr = String(name).trim();
  if (!nameStr || nameStr === '') return 'Kullanıcı';

  // Kelimelere ayır
  const parts = nameStr.split(/\s+/).filter(part => part.length > 0);
  if (parts.length === 0) return 'Kullanıcı';

  // Her kelimeyi maskele
  return parts.map(part => {
    if (part.length <= 2) {
      return part + '******';
    }
    // İlk 2 karakteri al (Türkçe karakterler dahil)
    const firstTwo = part.substring(0, 2);
    // Orijinal kelime uzunluğuna göre yıldız sayısı, minimum 6
    const remainingLength = Math.max(part.length - 2, 6);
    const stars = '*'.repeat(remainingLength);
    return firstTwo + stars;
  }).join(' ');
};

export default function ProductDetailScreen({ navigation, route }) {
  const alert = useAlert();
  const { product: initialProduct, productId: routeProductId } = route.params || {};
  
  // Deep link'ten sadece productId gelebilir, bu durumda ürünü API'den yükle
  const isFromDeepLink = !initialProduct && routeProductId;
  
  const [product, setProduct] = useState(initialProduct);
  const [selectedSize, setSelectedSize] = useState(0);
  const [selectedSizes, setSelectedSizes] = useState([]); // B2B için çoklu beden seçimi
  const [sizeQuantities, setSizeQuantities] = useState({}); // Her beden için miktar
  const [showSizeDistributionModal, setShowSizeDistributionModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(initialProduct?.isFavorite || false);
  const [loadingDetail, setLoadingDetail] = useState(isFromDeepLink);
  const [deepLinkError, setDeepLinkError] = useState(null);
  const [addingCart, setAddingCart] = useState(false);
  const [showAddToCartSuccessModal, setShowAddToCartSuccessModal] = useState(false);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [loginRequiredMessage, setLoginRequiredMessage] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [aiTips, setAiTips] = useState([]);
  const [aiTipsLoading, setAiTipsLoading] = useState(false);
  const [aiTipsError, setAiTipsError] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [botTyping, setBotTyping] = useState(false);
  const typingAnim1 = useRef(new Animated.Value(0)).current;
  const typingAnim2 = useRef(new Animated.Value(0)).current;
  const typingAnim3 = useRef(new Animated.Value(0)).current;
  const [showReviewImageViewer, setShowReviewImageViewer] = useState(false);
  const [reviewImageViewerIndex, setReviewImageViewerIndex] = useState(0);
  const [reviewImageViewerImages, setReviewImageViewerImages] = useState([]);
  const [liveViewers, setLiveViewers] = useState(0);
  const [isFlashDeal, setIsFlashDeal] = useState(false);
  const [flashDealOldPrice, setFlashDealOldPrice] = useState(null);
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
  const [priceAlertTargetPrice, setPriceAlertTargetPrice] = useState('');
  const [hasPriceAlert, setHasPriceAlert] = useState(false);
  const [isB2BMode, setIsB2BMode] = useState(false);
  const B2B_MINIMUM_QUANTITY = 10;
  const [quantity, setQuantity] = useState(1);

  // 24 saatte satılan adet (ürün ID'sine göre tutarlı rastgele değer: 1-12 arası)
  const getSalesCount24h = useMemo(() => {
    const productId = product?.id || product?._id || routeProductId || 0;
    // Ürün ID'sine göre deterministik rastgele değer (1-12 arası)
    const hash = productId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const salesCount = (hash % 12) + 1; // 1-12 arası
    return salesCount;
  }, [product?.id, product?._id, routeProductId]);

  // Canlı izleyici sayısını başlat ve periyodik güncelle
  useEffect(() => {
    // İlk değeri ayarla
    setLiveViewers(generateWeightedRandomViewers());

    // Her 15-30 saniyede bir güncelle (daha gerçekçi)
    const interval = setInterval(() => {
      setLiveViewers(generateWeightedRandomViewers());
    }, (15 + Math.random() * 15) * 1000); // 15-30 saniye arası rastgele

    return () => clearInterval(interval);
  }, []);

  // B2B modunu yükle ve başlangıç miktarını ayarla
  useEffect(() => {
    const loadB2BMode = async () => {
      try {
        const b2bMode = await secureStorage.getItem('isB2BMode');
        
        const isB2B = b2bMode === 'true';
        setIsB2BMode(isB2B);
        
        // B2B modundaysa başlangıç miktarını minimum değere ayarla
        if (isB2B) {
          setQuantity(B2B_MINIMUM_QUANTITY);
          // B2B modunda başlangıçta hiçbir beden seçili olmasın
          setSelectedSizes([]);
        }
      } catch (error) {
        console.error('B2B modu yüklenemedi:', error);
        setIsB2BMode(false);
      }
    };
    loadB2BMode();
  }, []);

  useEffect(() => {
    const fetchDetail = async () => {
      // Get productId from either product object or route params
      const productId = routeProductId || initialProduct?.id || initialProduct?._id;
      if (!productId) {
        // If we have initialProduct but no id, use it directly
        if (initialProduct) {
          setProduct(initialProduct);
          setLoadingDetail(false);
        } else {
          // Deep link'ten gelip productId yoksa hata göster
          setDeepLinkError('Ürün bilgisi bulunamadı');
          setLoadingDetail(false);
        }
        return;
      }

      try {
        setLoadingDetail(true);
        setDeepLinkError(null);

        // 1. Ürün detayını al - Her zaman API'den güncel veriyi çek
        const response = await productsAPI.getById(productId);

        if (response.data?.success) {
          let data = response.data.data?.product || response.data.data || response.data;

          // initialProduct varsa ve bazı alanlar eksikse, onları birleştir
          if (initialProduct) {
            data = {
              ...initialProduct,
              ...data,
              // Önemli: API'den gelen variations ve images alanlarını koru
              variations: data.variations || initialProduct.variations,
              images: data.images || initialProduct.images,
              gallery: data.gallery || initialProduct.gallery,
              variationDetails: data.variationDetails || initialProduct.variationDetails,
              xmlOptions: data.xmlOptions || initialProduct.xmlOptions,
            };
          }

          // Debug: API'den gelen görsel verilerini logla
          console.log('🔍 API\'den gelen TÜM ürün verisi:', JSON.stringify(data, null, 2));
          console.log('🔍 API\'den gelen görsel alanları:', {
            hasImage: !!data?.image,
            hasImages: !!data?.images,
            hasGallery: !!data?.gallery,
            image: data?.image,
            images: data?.images,
            imagesType: typeof data?.images,
            gallery: data?.gallery,
            galleryType: typeof data?.gallery,
            image1: data?.image1,
            image2: data?.image2,
            image3: data?.image3,
            image4: data?.image4,
            image5: data?.image5,
            // Tüm görsel alanlarını kontrol et
            allKeys: Object.keys(data || {}).filter(key => key.toLowerCase().includes('image') || key.toLowerCase().includes('gallery') || key.toLowerCase().includes('photo') || key.toLowerCase().includes('picture')),
          });

          // 2. Varyasyonları ayrı endpoint'ten al
          try {
            const variationsResponse = await productsAPI.getVariations(productId);

            if (variationsResponse.data?.success) {
              // Backend'den gelen variations yapısını kontrol et
              const responseData = variationsResponse.data.data || variationsResponse.data;
              const variations = responseData.variations || responseData || [];

              console.log('📦 Backend\'den gelen variations:', JSON.stringify(variations, null, 2));

              // Varyasyonları ürün datasına ekle (öncelik API'den gelen veriye)
              if (Array.isArray(variations) && variations.length > 0) {
                data.variations = variations;
              } else if (!data.variations) {
                // Eğer API'den variations gelmediyse ve data'da da yoksa, initialProduct'tan al
                data.variations = initialProduct?.variations;
              }
            }
          } catch (variationError) {
            console.error('❌ Variations endpoint hatası:', variationError);
            // Varyasyon endpoint'i yoksa, initialProduct'tan variations'ı koru
            if (!data.variations && initialProduct?.variations) {
              data.variations = initialProduct.variations;
            }
          }

          if (data) {
            // Flash deal kontrolü - önce initialProduct'tan kontrol et
            if (initialProduct?.isFlashDeal && initialProduct?.oldPrice) {
              setIsFlashDeal(true);
              setFlashDealOldPrice(parseFloat(initialProduct.oldPrice));
              // initialProduct'tan gelen fiyatı kullan
              if (initialProduct.price) {
                data.price = parseFloat(initialProduct.price);
              }
              if (initialProduct.oldPrice) {
                data.oldPrice = parseFloat(initialProduct.oldPrice);
              }
            } else {
              // Flash deal kontrolü - API'den kontrol et
              try {
                const flashDealsResponse = await flashDealsAPI.getActive();
                if (flashDealsResponse.data?.success) {
                  const flashDealsData = flashDealsResponse.data.data || [];
                  const productId = data.id || data._id || initialProduct?.id || initialProduct?._id;

                  // Tüm flash deal'lerde bu ürünü ara
                  let foundFlashDeal = null;
                  for (const deal of flashDealsData) {
                    const dealProducts = deal.products || [];
                    const productInDeal = dealProducts.find(p => (p.id || p._id) === productId);
                    if (productInDeal) {
                      foundFlashDeal = deal;
                      break;
                    }
                  }

                  if (foundFlashDeal) {
                    const basePrice = parseFloat(data.price || 0);
                    const discountValue = parseFloat(foundFlashDeal.discount_value || 0);
                    let discountedPrice = basePrice;

                    if (foundFlashDeal.discount_type === 'percentage') {
                      discountedPrice = basePrice * (1 - discountValue / 100);
                    } else {
                      discountedPrice = basePrice - discountValue;
                    }

                    setIsFlashDeal(true);
                    setFlashDealOldPrice(basePrice);
                    // Ürün fiyatını güncelle
                    data.price = Math.max(0, discountedPrice);
                    data.oldPrice = basePrice;
                  } else {
                    setIsFlashDeal(false);
                    setFlashDealOldPrice(null);
                  }
                }
              } catch (flashDealError) {
                console.warn('⚠️ Flash deals kontrol edilemedi:', flashDealError.message);
                setIsFlashDeal(false);
                setFlashDealOldPrice(null);
              }
            }

            setProduct(data);

            // Kullanıcının favorilerini kontrol et
            try {
              const userId = await secureStorage.getItem('userId');
              if (userId) {
                // Award EXP for viewing product (sadece B2C modunda)
                try {
                  const productId = data.id || data._id || initialProduct?.id || initialProduct?._id;
                  const b2bMode = await secureStorage.getItem('isB2BMode');
                  if (b2bMode !== 'true') {
                    await userLevelAPI.addProductViewExp(userId, productId);
                  }

                  // Analytics: Product view tracking
                  try {
                    await analytics.trackProductView(productId, {
                      productName: data.name,
                      categoryId: data.categoryId,
                      price: data.price,
                      originalPrice: data.originalPrice
                    });
                  } catch (analyticsError) {
                    console.log('Analytics product view error:', analyticsError);
                  }
                } catch (expError) {
                  console.log('Product view EXP error:', expError);
                  // Don't fail if EXP addition fails
                }
                const favoritesResponse = await wishlistAPI.get(userId);
                if (favoritesResponse.data?.success) {
                  const favorites = favoritesResponse.data.data || favoritesResponse.data.favorites || [];
                  const productId = data.id || data._id || initialProduct?.id || initialProduct?._id;
                  const isInFavorites = favorites.some((fav) =>
                    (fav.productId || fav.id) === productId
                  );
                  setIsFavorite(isInFavorites);
                } else {
                  setIsFavorite(!!data?.isFavorite);
                }

              } else {
                setIsFavorite(!!data?.isFavorite);
              }
            } catch (favError) {
              console.log('Favoriler kontrol edilemedi:', favError);
              setIsFavorite(!!data?.isFavorite);
            }
          }
        }
      } catch (error) {
        console.error('Ürün detayı yüklenemedi:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status,
        });
        // Deep link'ten geldiyse ve hata oluştuysa kullanıcıya göster
        if (isFromDeepLink) {
          setDeepLinkError('Ürün yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [initialProduct, routeProductId, isFromDeepLink]);

  // Soruları yükle
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!product?.id && !product?._id) return;

      try {
        setLoadingQuestions(true);
        const productId = product.id || product._id;
        const response = await productQuestionsAPI.getByProduct(productId);

        if (response.data?.success) {
          const questionsData = response.data.data || response.data.questions || [];
          // Kullanıcı isimlerini maskele
          // Local storage'dan mevcut kullanıcı adını ve ID'sini al (fallback için)
          const [currentUserName, storedUserId] = await Promise.all([
            secureStorage.getItem('userName'),
            secureStorage.getItem('userId')
          ]);
          
          const maskedQuestions = questionsData.map(q => {
            // Tüm olası isim alanlarını kontrol et
            let originalName = q.userName || 
                              q.user?.name || 
                              q.user?.userName ||
                              q.createdBy?.name ||
                              q.createdBy?.userName ||
                              q.name || 
                              '';
            
            // Eğer hala ad bulunamadıysa ve bu kullanıcının kendi sorusuysa, local storage'dan al
            if (!originalName && q.userId && storedUserId && q.userId === storedUserId && currentUserName) {
              originalName = currentUserName;
            }
            
            // Debug: İlk soru için detaylı log
            if (questionsData.indexOf(q) === 0) {
              console.log('🔍 API\'den gelen soru verisi:', {
                hasUserName: !!q.userName,
                hasUser: !!q.user,
                hasUser_name: !!q.user?.name,
                hasUser_userName: !!q.user?.userName,
                hasCreatedBy: !!q.createdBy,
                hasCreatedBy_name: !!q.createdBy?.name,
                hasName: !!q.name,
                hasUserId: !!q.userId,
                originalName: originalName,
                allKeys: Object.keys(q)
              });
            }
            
            const maskedName = maskUserName(originalName);

            return {
              ...q,
              userName: maskedName,
              // user objesi varsa onu da güncelle
              user: q.user ? { ...q.user, name: maskedName } : q.user,
              // createdBy objesi varsa onu da güncelle
              createdBy: q.createdBy ? { ...q.createdBy, name: maskedName } : q.createdBy
            };
          });
          setQuestions(maskedQuestions);
        }
      } catch (error) {
        console.error('Sorular yüklenemedi:', error);
        // Hata durumunda boş array kullan
        setQuestions([]);
      } finally {
        setLoadingQuestions(false);
      }
    };

    fetchQuestions();
  }, [product]);

  // API'den gelen beden/variant bilgilerini normalize et
  const sizeOptions = useMemo(() => {
    if (!product) {
      return [];
    }

    const sizes = [];

    // 1. Önce variationDetails'i kontrol et (JSON field)
    if (product.variationDetails) {
      console.log('1️⃣ variationDetails bulundu, parse ediliyor...');
      try {
        const details = typeof product.variationDetails === 'string'
          ? JSON.parse(product.variationDetails)
          : product.variationDetails;

        console.log('📋 variationDetails parse edildi:', JSON.stringify(details, null, 2));

        if (Array.isArray(details)) {
          details.forEach(variation => {
            console.log('   Variation işleniyor:', variation);
            if (Array.isArray(variation.options)) {
              variation.options.forEach(option => {
                console.log('      Option işleniyor:', option);
                if (option.value && (option.stock === undefined || option.stock > 0)) {
                  sizes.push({
                    id: option.id,
                    variationId: variation.id,
                    value: option.value,
                    stock: option.stock || 999,
                    price: option.satisFiyati || option.priceModifier || product.price,
                    sku: option.sku || option.barkod,
                  });
                }
              });
            }
          });
        }
        console.log('✅ variationDetails\'den', sizes.length, 'beden bulundu');
      } catch (e) {
        console.error('❌ variationDetails parse hatası:', e);
      }
    } else {
      console.log('1️⃣ variationDetails YOK');
    }

    // 2. Variations array'i kontrol et (API'den gelen yeni format)
    // ÖNEMLİ: Bu kontrolü her zaman yap, çünkü backend'den variations geliyor olabilir
    if (Array.isArray(product.variations) && product.variations.length > 0) {
      console.log('2️⃣ variations array bulundu, işleniyor...');
      product.variations.forEach(variation => {
        console.log('   Variation:', variation);

        // Variation'ın name'i "Beden" veya "Size" ise, options'ları işle
        const variationName = (variation.name || '').toLowerCase();
        const isSizeVariation = variationName.includes('beden') || variationName.includes('size') || variationName.includes('boyut');

        // Eğer variation'ın name'i beden/size değilse ve options varsa, options'ları kontrol et
        // VEYA eğer variation'ın name'i yoksa ama options varsa, onları da işle
        if (isSizeVariation || (!variation.name && Array.isArray(variation.options)) || Array.isArray(variation.options)) {
          // Variation içinde options array'i var
          if (Array.isArray(variation.options) && variation.options.length > 0) {
            variation.options.forEach(option => {
              console.log('      Option:', option);
              const optionValue = option.value || option.name;
              if (optionValue) {
                // Stok kontrolü: stok 0'dan büyükse veya stok bilgisi yoksa ekle
                const stockValue = option.stock !== undefined ? option.stock : 999;
                sizes.push({
                  id: option.id || `${variation.id}_${option.value}`,
                  variationId: variation.id,
                  value: optionValue,
                  stock: stockValue,
                  price: option.priceModifier || option.satisFiyati || option.price || product.price,
                  sku: option.sku || option.barkod,
                });
              }
            });
          }
        }
        // Yeni format: variation direkt olarak option bilgilerini içerebilir (tek beden)
        else if (variation.name || variation.value) {
          const variationValue = variation.value || variation.name || variation.size;
          if (variationValue && (variationName.includes('beden') || variationName.includes('size') || variationName.includes('boyut') || !variation.name)) {
            sizes.push({
              id: variation.id || variation._id,
              variationId: variation.variationId || variation.id,
              value: variationValue,
              stock: variation.stock !== undefined ? variation.stock : 999,
              price: variation.price || variation.satisFiyati || product.price,
              sku: variation.sku || variation.barkod,
            });
          }
        }
      });
      console.log('✅ variations\'dan', sizes.length, 'beden bulundu');
    } else {
      console.log('2️⃣ variations array YOK veya BOŞ');
    }

    // 3. xmlOptions'ı kontrol et
    if (sizes.length === 0 && product.xmlOptions) {
      console.log('3️⃣ xmlOptions bulundu, parse ediliyor...');
      try {
        const xmlOpts = typeof product.xmlOptions === 'string'
          ? JSON.parse(product.xmlOptions)
          : product.xmlOptions;

        console.log('📋 xmlOptions parse edildi:', xmlOpts);

        // xmlOptions formatı: { options: [...] } veya direkt array
        const optionsArray = xmlOpts?.options || (Array.isArray(xmlOpts) ? xmlOpts : []);

        if (Array.isArray(optionsArray) && optionsArray.length > 0) {
          optionsArray.forEach(opt => {
            console.log('   Option:', opt);

            // Beden bilgisini attributes objesinden al
            let bedenValue = null;
            if (opt.attributes && typeof opt.attributes === 'object') {
              // Beden veya Size anahtarını bul
              const bedenKeys = Object.keys(opt.attributes).filter(key => {
                const normalizedKey = key.toLowerCase().trim();
                return normalizedKey === 'beden' || normalizedKey === 'size' ||
                  normalizedKey.includes('beden') || normalizedKey.includes('size');
              });

              if (bedenKeys.length > 0) {
                bedenValue = opt.attributes[bedenKeys[0]];
                console.log(`   ✅ Beden bulundu: "${bedenValue}" (key: ${bedenKeys[0]})`);
              }
            }

            // Eğer attributes'ten beden bulunamadıysa, direkt value/name kontrolü yap
            if (!bedenValue) {
              bedenValue = opt.value || opt.name || opt.size;
            }

            if (bedenValue) {
              sizes.push({
                value: bedenValue,
                stock: opt.stok !== undefined ? opt.stok : (opt.stock !== undefined ? opt.stock : 999),
                price: opt.fiyat || opt.price || product.price,
                sku: opt.sku || opt.barkod || opt.stokKodu,
                variationId: opt.varyasyonId || opt.variationId,
              });
              console.log(`   ✅ Beden eklendi: ${bedenValue} (stok: ${opt.stok || opt.stock || 999})`);
            } else {
              console.log('   ⚠️ Option\'da beden bilgisi bulunamadı:', opt);
            }
          });
        }
        console.log('✅ xmlOptions\'dan', sizes.length, 'beden bulundu');
      } catch (e) {
        console.error('❌ xmlOptions parse hatası:', e);
      }
    } else {
      console.log('3️⃣ xmlOptions YOK');
    }

    // 4. Eski format desteği (sizes, sizeOptions, variants)
    if (sizes.length === 0) {
      console.log('4️⃣ Eski format kontrol ediliyor...');
      const candidates =
        product?.sizes ||
        product?.sizeOptions ||
        product?.variants ||
        [];

      console.log('   Candidates:', candidates);

      if (Array.isArray(candidates) && candidates.length > 0) {
        candidates.forEach((s) => {
          console.log('   Candidate:', s);
          if (typeof s === 'string') {
            sizes.push({ value: s, stock: 999 });
          } else if (s?.name || s?.label || s?.size || s?.value) {
            sizes.push({
              value: s.name || s.label || s.size || s.value,
              stock: s.stock || 999,
            });
          }
        });
        console.log('✅ Eski format\'tan', sizes.length, 'beden bulundu');
      } else {
        console.log('⚠️ Eski format\'ta da beden bulunamadı');
      }
    }

    console.log('✅ SONUÇ: İşlenmiş beden seçenekleri:', sizes);
    console.log('🔍 Ürün variations analizi - BİTİŞ\n');
    return sizes;
  }, [product]);

  // Check if user has price alert for this product
  useEffect(() => {
    const checkPriceAlert = async () => {
      try {
        const userId = await secureStorage.getItem('userId');
        if (!userId || !product?.id && !product?._id) return;

        const productId = product?.id || product?._id;
        const response = await priceAlertsAPI.getUserAlerts(userId, false);
        
        if (response.data?.success) {
          const alerts = response.data.data || [];
          const hasAlert = alerts.some(alert => alert.productId === productId && alert.isActive);
          setHasPriceAlert(hasAlert);
        }
      } catch (error) {
        console.log('Price alert check error:', error);
      }
    };

    if (product?.id || product?._id) {
      checkPriceAlert();
    }
  }, [product?.id, product?._id]);

  const handleCreatePriceAlert = async () => {
    try {
      const userId = await secureStorage.getItem('userId');
      if (!userId) {
        setShowLoginRequiredModal(true);
        setLoginRequiredMessage('Fiyat alarmı oluşturmak için lütfen giriş yapın');
        return;
      }

      const productId = product?.id || product?._id;
      if (!productId) {
        alert.show('Hata', 'Ürün bilgisi bulunamadı');
        return;
      }

      const currentPrice = parseFloat(product?.price || 0);
      const targetPrice = parseFloat(priceAlertTargetPrice);

      if (!targetPrice || targetPrice <= 0) {
        alert.show('Hata', 'Lütfen geçerli bir fiyat girin');
        return;
      }

      if (targetPrice >= currentPrice) {
        alert.show('Hata', 'Hedef fiyat mevcut fiyattan düşük olmalıdır');
        return;
      }

      const response = await priceAlertsAPI.create(userId, productId, targetPrice, 'below');

      if (response.data?.success) {
        alert.show('Başarılı', 'Fiyat alarmı oluşturuldu! Fiyat düştüğünde bildirim alacaksınız.');
        setShowPriceAlertModal(false);
        setPriceAlertTargetPrice('');
        setHasPriceAlert(true);
      } else {
        alert.show('Hata', response.data?.message || 'Fiyat alarmı oluşturulamadı');
      }
    } catch (error) {
      console.error('Price alert creation error:', error);
      alert.show('Hata', 'Fiyat alarmı oluşturulurken bir hata oluştu');
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const userId = await secureStorage.getItem('userId');
      if (!userId) {
        setShowLoginRequiredModal(true);
        setLoginRequiredMessage('Favorilere eklemek için lütfen giriş yapın');
        return;
      }

      const productId = product?.id || product?._id || initialProduct?.id || initialProduct?._id;
      if (!productId) {
        alert.show('Hata', 'Ürün bilgisi bulunamadı');
        return;
      }

      // Optimistic update
      const previousFavoriteState = isFavorite;
      setIsFavorite(!isFavorite);

      try {
        if (previousFavoriteState) {
          // Favorilerden çıkar
          // Önce favoriteId'yi bul
          const favoritesResponse = await wishlistAPI.get(userId);
          if (favoritesResponse.data?.success) {
            const favorites = favoritesResponse.data.data || favoritesResponse.data.favorites || [];
            const favorite = favorites.find((fav) => (fav.productId || fav.id) === productId);

            if (favorite && (favorite.id || favorite._id)) {
              // DELETE /favorites/:favoriteId endpoint'ini kullan (endpoint.md'ye göre)
              await wishlistAPI.remove(favorite.id || favorite._id, userId);
            } else {
              throw new Error('Favorite ID bulunamadı');
            }
          }
        } else {
          // Favorilere ekle
          await wishlistAPI.add(userId, productId);
        }

        console.log(`✅ Ürün ${previousFavoriteState ? 'favorilerden çıkarıldı' : 'favorilere eklendi'}`);
      } catch (error) {
        // Hata durumunda geri al
        setIsFavorite(previousFavoriteState);
        console.error('❌ Favori işlemi hatası:', error);
        alert.show('Hata', error.response?.data?.message || 'Favori işlemi başarısız oldu');
      }
    } catch (error) {
      console.error('❌ Favori toggle hatası:', error);
      alert.show('Hata', 'Bir hata oluştu');
    }
  };

  const handleShare = async () => {
    try {
      const productId = product?.id || product?._id;
      const productName = product?.name || 'Ürün';
      const productPrice = parseFloat(product?.price || 0).toFixed(0);
      
      // Deep link URL oluştur (huglutekstil.com formatında)
      const shareUrl = productId 
        ? `https://huglutekstil.com/urunler/${productId}`
        : '';
      
      // Paylaşım mesajını hazırla
      const shareMessage = `${productName}

Fiyat: ${productPrice}₺

${shareUrl ? `Bu ürünü görüntüle:\n${shareUrl}` : ''}

Mobil uygulamamızı indirin:
https://app.beratsimsek.com.tr/1.apk`;

      const result = await Share.share({
        message: shareMessage.trim(),
        title: productName,
        url: shareUrl, // iOS için
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Paylaşıldı:', result.activityType);
        } else {
          console.log('Paylaşıldı');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Paylaşım iptal edildi');
      }
    } catch (error) {
      console.error('Paylaşım hatası:', error);
      alert.show('Hata', 'Ürün paylaşılırken bir hata oluştu.');
    }
  };

  const startTypingAnimation = () => {
    const createAnimation = (animValue, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    createAnimation(typingAnim1, 0).start();
    createAnimation(typingAnim2, 200).start();
    createAnimation(typingAnim3, 400).start();
  };

  const stopTypingAnimation = () => {
    typingAnim1.stopAnimation();
    typingAnim2.stopAnimation();
    typingAnim3.stopAnimation();
    typingAnim1.setValue(0);
    typingAnim2.setValue(0);
    typingAnim3.setValue(0);
  };

  const handleAIAssistant = () => {
    setShowAIModal(true);
  };

  const handleChatbotOpen = () => {
    setShowChatbot(true);
    // İlk mesajı ekle
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          id: 1,
          type: 'bot',
          text: `Merhaba! ${product?.name || 'Bu ürün'} hakkında size nasıl yardımcı olabilirim? 🛍️`,
          timestamp: new Date(),
        }
      ]);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      id: chatMessages.length + 1,
      type: 'user',
      text: chatInput,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    const messageText = chatInput;
    setChatInput('');

    // Typing indicator
    setBotTyping(true);
    startTypingAnimation();

    try {
      // Kullanıcı ID'sini al
      const userId = await secureStorage.getItem('userId');
      const productId = product?.id || product?._id || routeProductId;

      // Backend'e mesaj gönder (Gemini API backend'de kullanılacak)
      const response = await chatbotAPI.sendMessage(
        userId || null,
        messageText,
        null, // sessionId - backend otomatik yönetir
        productId || null,
        'text'
      );

      setBotTyping(false);
      stopTypingAnimation();

      if (response.data?.success && response.data?.data) {
        const botData = response.data.data;
        const botResponse = {
          id: botData.id || `bot-${Date.now()}`,
          type: 'bot',
          text: botData.text || botData.message || 'Yanıt alınamadı',
          messageType: botData.type || 'text',
          action: botData.action,
          quickReplies: botData.quickReplies || [],
          timestamp: botData.timestamp ? new Date(botData.timestamp) : new Date(),
        };
        setChatMessages(prev => [...prev, botResponse]);
      } else {
        // Fallback: Eski yöntem
        const response = getBotResponse(messageText);
        const botResponse = {
          id: chatMessages.length + 2,
          type: 'bot',
          text: response.text || response,
          messageType: response.type || 'text',
          action: response.action,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      console.error('Chatbot mesaj hatası:', error);
      setBotTyping(false);
      stopTypingAnimation();
      
      // Hata durumunda fallback yanıt
      const response = getBotResponse(messageText);
      const botResponse = {
        id: chatMessages.length + 2,
        type: 'bot',
        text: response.text || response || 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        messageType: response.type || 'text',
        action: response.action,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, botResponse]);
    }
  };

  const getBotResponse = (message) => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('sipariş') || lowerMessage.includes('satın al') || lowerMessage.includes('al')) {
      return {
        text: '🛒 Hızlı sipariş vermek ister misiniz?\n\nÜrünü sepete ekleyip ödeme sayfasına yönlendirebilirim.',
        type: 'quick-order',
        action: 'add-to-cart'
      };
    } else if (lowerMessage.includes('beden') || lowerMessage.includes('size')) {
      const sizes = sizeOptions.map(s => s.value || s.label || s).join(', ');
      return {
        text: `${product?.name} için mevcut bedenler:\n\n${sizes || 'Tek beden'}\n\nHangi bedeni tercih edersiniz? 👕`,
        type: 'text'
      };
    } else if (lowerMessage.includes('renk') || lowerMessage.includes('color')) {
      return {
        text: 'Ürün renk seçenekleri için lütfen ürün görsellerine bakabilirsiniz. 🎨',
        type: 'text'
      };
    } else if (lowerMessage.includes('fiyat') || lowerMessage.includes('price') || lowerMessage.includes('kaç')) {
      return {
        text: `💰 Ürün fiyatı: ${product?.discountPrice || product?.price} ₺\n${product?.discountPrice ? '\n🎉 İndirimli fiyat!' : ''}`,
        type: 'text'
      };
    } else if (lowerMessage.includes('kargo') || lowerMessage.includes('teslimat') || lowerMessage.includes('takip')) {
      return {
        text: '📦 Kargo ücretsiz!\n⏱️ Teslimat: 2-3 iş günü\n📍 Sipariş verdikten sonra kargo takip numaranızı alacaksınız.',
        type: 'text'
      };
    } else if (lowerMessage.includes('iade') || lowerMessage.includes('değişim')) {
      return {
        text: '✅ 14 gün içinde ücretsiz iade\n🔄 Kolay değişim süreci\n💰 Hızlı para iadesi',
        type: 'text'
      };
    } else if (lowerMessage.includes('stok')) {
      return {
        text: product?.stock > 0
          ? `✅ Ürün stoktadır!\n📦 ${product.stock} adet mevcut\n🚀 Hemen sipariş verebilirsiniz.`
          : '❌ Üzgünüm, ürün şu anda stokta yok.\n🔔 Stok geldiğinde bildirim almak ister misiniz?',
        type: 'text'
      };
    } else if (lowerMessage.includes('mağaza') || lowerMessage.includes('saat')) {
      return {
        text: '🏪 Mağaza Çalışma Saatleri:\n\n📅 Pazartesi-Cumartesi: 09:00-21:00\n📅 Pazar: 10:00-20:00\n\n📍 En yakın mağazayı bulmak için "Mağazalar" menüsünü kullanabilirsiniz.',
        type: 'text'
      };
    } else if (lowerMessage.includes('indirim') || lowerMessage.includes('kampanya')) {
      return {
        text: '🎁 Aktif kampanyalarımızı görmek için "Kampanyalar" sayfasını ziyaret edebilirsiniz!\n\n💳 İlk alışverişinizde %10 indirim\n🎉 3 al 2 öde fırsatları',
        type: 'text'
      };
    } else if (lowerMessage.includes('ödeme') || lowerMessage.includes('taksit')) {
      return {
        text: '💳 Ödeme Seçenekleri:\n\n✅ Kredi Kartı (9 taksit)\n✅ Banka Kartı\n✅ Kapıda Ödeme\n✅ Havale/EFT',
        type: 'text'
      };
    } else if (lowerMessage.includes('yardım') || lowerMessage.includes('help')) {
      return {
        text: '🤝 Size nasıl yardımcı olabilirim?\n\n• Hızlı sipariş\n• Beden bilgisi\n• Fiyat ve kampanyalar\n• Kargo ve teslimat\n• İade ve değişim\n• Stok durumu\n• Ödeme seçenekleri\n• Mağaza saatleri\n\n💬 Daha fazla yardım için müşteri hizmetlerimize bağlanabilirsiniz!',
        type: 'text',
        showSupportButton: true
      };
    } else if (lowerMessage.includes('müşteri hizmetleri') || lowerMessage.includes('canlı destek') || lowerMessage.includes('destek') || lowerMessage.includes('support') || lowerMessage.includes('temsilci')) {
      return {
        text: '💬 Müşteri hizmetlerimize bağlanmak ister misiniz?\n\nSize daha detaylı yardımcı olabiliriz!',
        type: 'text',
        showSupportButton: true
      };
    } else {
      return {
        text: 'Size nasıl yardımcı olabilirim? 😊\n\n"Sipariş ver" diyerek hızlı sipariş verebilir veya beden, fiyat, kargo, iade hakkında sorabilirsiniz.\n\n💬 Daha fazla yardım için müşteri hizmetlerimize bağlanabilirsiniz!',
        type: 'text',
        showSupportButton: true
      };
    }
  };

  const handleQuickAction = async (question) => {
    const userMessage = {
      id: chatMessages.length + 1,
      type: 'user',
      text: question,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);

    // Typing indicator
    setBotTyping(true);
    startTypingAnimation();

    try {
      // Kullanıcı ID'sini al
      const userId = await secureStorage.getItem('userId');
      const productId = product?.id || product?._id || routeProductId;

      // Özel alanlar için detaylı mesaj hazırla
      let detailedMessage = question;
      const questionLower = question.toLowerCase();
      
      if (questionLower.includes('sipariş') || questionLower.includes('hızlı sipariş')) {
        // Hızlı sipariş için detaylı context
        detailedMessage = `Hızlı sipariş vermek istiyorum. Ürün: ${product?.name || 'Bu ürün'}, Fiyat: ${product?.discountPrice || product?.price || 'Belirtilmemiş'} ₺, Stok: ${product?.stock || 0} adet. ${selectedSize > 0 && sizeOptions[selectedSize] ? `Seçilen beden: ${sizeOptions[selectedSize].value || sizeOptions[selectedSize].label || sizeOptions[selectedSize]}` : ''} Hızlı sipariş sürecini başlatabilir misin?`;
      } else if (questionLower.includes('beden') || questionLower.includes('size')) {
        // Beden bilgisi için detaylı context
        const sizes = sizeOptions.map(s => s.value || s.label || s).join(', ');
        detailedMessage = `Bu ürün için beden bilgisi istiyorum. Ürün: ${product?.name || 'Bu ürün'}, Mevcut bedenler: ${sizes || 'Tek beden'}. Bana uygun bedeni önerebilir misin?`;
      } else if (questionLower.includes('fiyat') || questionLower.includes('price')) {
        // Fiyat için detaylı context
        detailedMessage = `Bu ürünün fiyat bilgisini öğrenmek istiyorum. Ürün: ${product?.name || 'Bu ürün'}, Normal Fiyat: ${product?.price || 'Belirtilmemiş'} ₺, ${product?.discountPrice ? `İndirimli Fiyat: ${product.discountPrice} ₺, İndirim Oranı: ${product.discountPercent || Math.round(((product.price - product.discountPrice) / product.price) * 100)}%` : 'İndirim yok'}. Fiyat hakkında detaylı bilgi verebilir misin?`;
      } else if (questionLower.includes('müşteri hizmetleri') || questionLower.includes('destek') || questionLower.includes('support')) {
        // Müşteri hizmetleri için detaylı context
        detailedMessage = `Müşteri hizmetleri ile iletişime geçmek istiyorum. Ürün: ${product?.name || 'Bu ürün'}, Ürün ID: ${productId || 'Belirtilmemiş'}. Müşteri hizmetleri hakkında bilgi verebilir misin?`;
      }

      // Backend'e mesaj gönder
      const response = await chatbotAPI.sendMessage(
        userId || null,
        detailedMessage,
        null,
        productId || null,
        'text'
      );

      setBotTyping(false);
      stopTypingAnimation();

      if (response.data?.success && response.data?.data) {
        const botData = response.data.data;
        const botResponse = {
          id: botData.id || `bot-${Date.now()}`,
          type: 'bot',
          text: botData.text || botData.message || 'Yanıt alınamadı',
          messageType: botData.type || 'text',
          action: botData.action,
          quickReplies: botData.quickReplies || [],
          timestamp: botData.timestamp ? new Date(botData.timestamp) : new Date(),
        };
        setChatMessages(prev => [...prev, botResponse]);
      } else {
        // Fallback
        setBotTyping(false);
        stopTypingAnimation();
        const response = getBotResponse(question);
        const botResponse = {
          id: chatMessages.length + 2,
          type: 'bot',
          text: response.text || response,
          messageType: response.type || 'text',
          action: response.action,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      console.error('Chatbot quick action hatası:', error);
      setBotTyping(false);
      stopTypingAnimation();
      
      // Hata durumunda fallback
      const response = getBotResponse(question);
      const botResponse = {
        id: chatMessages.length + 2,
        type: 'bot',
        text: response.text || response || 'Üzgünüm, bir hata oluştu.',
        messageType: response.type || 'text',
        action: response.action,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, botResponse]);
    }
  };

  const handleAddToCartFromChatbot = async (productId, quantity = 1) => {
    try {
      const userId = await secureStorage.getItem('userId');
      if (!userId) {
        setShowLoginRequiredModal(true);
        setLoginRequiredMessage('Sepete eklemek için lütfen giriş yapın');
        return;
      }

      // Ürün bilgilerini al
      const productResponse = await productsAPI.getById(productId);
      if (!productResponse.data?.success || !productResponse.data.data) {
        alert.show('Hata', 'Ürün bilgisi alınamadı');
        return;
      }

      const targetProduct = productResponse.data.data;
      const finalPrice = parseFloat(targetProduct.discountPrice || targetProduct.price || 0);

      await cartAPI.add(userId, productId, quantity, {}, finalPrice);
      
      // Sepet badge'ini güncelle
      const { updateCartBadge } = require('../utils/cartBadge');
      await updateCartBadge(userId);
      
      alert.show('Başarılı', `${targetProduct.name} sepete eklendi!`);
    } catch (error) {
      console.error('Sepete ekleme hatası:', error);
      alert.show('Hata', 'Ürün sepete eklenirken bir hata oluştu');
    }
  };

  const handleQuickOrder = async () => {
    try {
      setShowChatbot(false);
      await handleAddToCart();
    } catch (error) {
      console.error('Hızlı sipariş hatası:', error);
    }
  };

  const handleAIOption = async (option) => {
    setShowAIModal(false);

    setTimeout(async () => {
      switch (option) {
        case 'styleadvisor':
          if (product) {
            navigation.navigate('StyleAdvisor', { product });
          }
          break;
        case 'similar':
          setShowSimilarModal(true);
          break;
        case 'tips':
          setShowTipsModal(true);
          // Gemini'den kullanım önerileri al
          await fetchAITips();
          break;
      }
    }, 300);
  };

  const fetchAITips = async () => {
    if (!product) return;
    
    setAiTipsLoading(true);
    setAiTipsError(null);
    setAiTips([]);
    
    try {
      const response = await aiTipsAPI.getProductTips(
        product.id || product._id,
        product.name || 'Ürün',
        product.category || 'Genel',
        product.description || ''
      );
      
      if (response.data?.success && response.data.tips) {
        setAiTips(response.data.tips);
      } else if (response.data?.tips) {
        setAiTips(response.data.tips);
      } else {
        // Fallback tips
        setAiTips([
          'Ürünü kullanmadan önce etiketini okuyun',
          'Bakım talimatlarına uyun',
          'Orijinal ambalajında saklayın'
        ]);
      }
    } catch (error) {
      console.error('AI Tips fetch error:', error);
      setAiTipsError('Kullanım önerileri yüklenemedi');
      // Fallback tips
      setAiTips([
        'Ürünü kullanmadan önce etiketini okuyun',
        'Bakım talimatlarına uyun',
        'Orijinal ambalajında saklayın'
      ]);
    } finally {
      setAiTipsLoading(false);
    }
  };

  const pickImage = () => {
    if (reviewImages.length >= 5) {
      alert.show('Limit', 'En fazla 5 görsel ekleyebilirsiniz');
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
          alert.show('Hata', response.errorMessage || 'Fotoğraf seçilirken bir hata oluştu');
          return;
        }
        if (response.assets && response.assets.length > 0) {
          setReviewImages([...reviewImages, response.assets[0].uri]);
        }
      }
    );
  };

  const removeImage = (index) => {
    setReviewImages(reviewImages.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async () => {
    if (!newReviewComment.trim()) {
      alert.show('Hata', 'Lütfen yorum yazın');
      return;
    }

    const newReview = {
      id: reviews.length + 1,
      userName: 'Siz',
      rating: newReviewRating,
      comment: newReviewComment,
      date: 'Şimdi',
      images: [...reviewImages]
    };

    setReviews([newReview, ...reviews]);
    setShowReviewModal(false);
    setNewReviewComment('');
    setNewReviewRating(5);
    setReviewImages([]);
    alert.show('Başarılı', 'Yorumunuz eklendi!');
  };

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim()) {
      alert.show('Hata', 'Lütfen sorunuzu yazın');
      return;
    }

    try {
      setSubmittingQuestion(true);
      const userId = await secureStorage.getItem('userId');

      if (!userId) {
        setLoginRequiredMessage('Soru sormak için lütfen giriş yapın');
        setShowLoginRequiredModal(true);
        setSubmittingQuestion(false);
        return;
      }

      const productId = product?.id || product?._id;
      // Kullanıcı adını local storage'dan al
      const userName = await secureStorage.getItem('userName');
      const response = await productQuestionsAPI.create({
        productId,
        userId,
        question: newQuestion.trim(),
        userName: userName || undefined // Backend'e kullanıcı adını da gönder
      });

      if (response.data?.success) {
        const newQuestionData = response.data.data || response.data.question;
        // Yeni sorunun kullanıcı ismini maskele
        const newQuestionUserName = newQuestionData.userName || 
                                   newQuestionData.user?.name || 
                                   newQuestionData.user?.userName ||
                                   newQuestionData.createdBy?.name ||
                                   newQuestionData.createdBy?.userName ||
                                   newQuestionData.name ||
                                   userName || // Gönderdiğimiz kullanıcı adı
                                   '';
        const maskedNewQuestion = {
          ...newQuestionData,
          userName: maskUserName(newQuestionUserName),
          user: newQuestionData.user ? { ...newQuestionData.user, name: maskUserName(newQuestionUserName) } : newQuestionData.user
        };
        setQuestions([maskedNewQuestion, ...questions]);
        setShowQuestionModal(false);
        setNewQuestion('');

        // Soruları yeniden yükle (güncel liste için)
        try {
          const questionsResponse = await productQuestionsAPI.getByProduct(productId);
          if (questionsResponse.data?.success) {
            const questionsData = questionsResponse.data.data || questionsResponse.data.questions || [];
            // Local storage'dan mevcut kullanıcı adını ve ID'sini al (fallback için)
            const [refreshUserName, refreshUserId] = await Promise.all([
              secureStorage.getItem('userName'),
              secureStorage.getItem('userId')
            ]);
            // Kullanıcı isimlerini maskele
            const maskedQuestions = questionsData.map(q => {
              let originalName = q.userName || 
                                q.user?.name || 
                                q.user?.userName ||
                                q.createdBy?.name ||
                                q.createdBy?.userName ||
                                q.name || 
                                '';
              
              // Eğer hala ad bulunamadıysa ve bu kullanıcının kendi sorusuysa, local storage'dan al
              if (!originalName && q.userId && refreshUserId && q.userId === refreshUserId && refreshUserName) {
                originalName = refreshUserName;
              }
              
              const maskedName = maskUserName(originalName);
              return {
                ...q,
                userName: maskedName,
                user: q.user ? { ...q.user, name: maskedName } : q.user,
                createdBy: q.createdBy ? { ...q.createdBy, name: maskedName } : q.createdBy
              };
            });
            setQuestions(maskedQuestions);
          }
        } catch (refreshError) {
          console.log('Sorular yeniden yüklenemedi:', refreshError);
        }

        alert.show('Başarılı', 'Sorunuz gönderildi! Satıcı en kısa sürede yanıtlayacaktır.');
      } else {
        alert.show('Hata', response.data?.message || 'Soru gönderilemedi');
      }
    } catch (error) {
      console.error('Soru gönderme hatası:', error);
      alert.show('Hata', 'Soru gönderilirken bir hata oluştu');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleImagePress = (index) => {
    setImageViewerIndex(index);
    setShowImageViewer(true);
  };

  // B2B beden dağılımı modalından sepete ekleme
  const handleConfirmSizeDistribution = async () => {
    try {
      setAddingCart(true);
      const userId = await secureStorage.getItem('userId');
      const pid = product.id || product._id;

      // Her seçili beden için ayrı sepet öğesi ekle
      let successCount = 0;
      for (const sizeIndex of selectedSizes) {
        const sizeQuantity = sizeQuantities[sizeIndex] || B2B_MINIMUM_QUANTITY;
        
        // Minimum miktar kontrolü
        if (sizeQuantity < B2B_MINIMUM_QUANTITY) {
          alert.show('Minimum Miktar', `Her beden için minimum ${B2B_MINIMUM_QUANTITY} adet sipariş vermelisiniz.`);
          setAddingCart(false);
          return;
        }

        const selectedSizeOption = sizeOptions[sizeIndex];
        const selectedVariations = {};

        // Beden bilgisini ekle
        if (selectedSizeOption.id && selectedSizeOption.variationId) {
          selectedVariations[selectedSizeOption.variationId] = {
            id: selectedSizeOption.id,
            variationId: selectedSizeOption.variationId,
            value: selectedSizeOption.value,
            priceModifier: selectedSizeOption.price,
            stock: selectedSizeOption.stock,
            sku: selectedSizeOption.sku
          };
        } else {
          selectedVariations.size = selectedSizeOption.value || selectedSizeOption;
        }

        // İndirimli fiyatı belirle
        let finalPrice = product.price || 0;
        if (isFlashDeal) {
          finalPrice = priceValue || product.price || 0;
        } else {
          if (product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.price)) {
            finalPrice = parseFloat(product.price || 0);
          } else if (product.discountPrice) {
            finalPrice = parseFloat(product.discountPrice || 0);
          } else {
            finalPrice = parseFloat(product.price || 0);
          }
        }

        try {
          const response = await cartAPI.add(userId, pid, sizeQuantity, selectedVariations, finalPrice);
          if (response.data?.success) {
            successCount++;
          }
        } catch (error) {
          console.error('Beden sepete eklenemedi:', selectedSizeOption.value, error);
        }
      }

      if (successCount > 0) {
        // Sepet değişti - cache'i bypass etmek için timestamp güncelle
        await secureStorage.setItem('cartLastModified', Date.now().toString());
        
        // Badge'i güncelle
        const { updateCartBadge } = require('../utils/cartBadge');
        await updateCartBadge(userId);

        // Modalı kapat
        setShowSizeDistributionModal(false);
        setShowAddToCartSuccessModal(true);
        
        // Seçili bedenleri ve miktarları temizle
        setSelectedSizes([]);
        setSizeQuantities({});
      } else {
        alert.show('Hata', 'Ürünler sepete eklenemedi');
      }
    } catch (error) {
      console.error('Sepete ekleme hatası:', error);
      alert.show('Hata', 'Sepete eklenirken bir hata oluştu');
    } finally {
      setAddingCart(false);
    }
  };


  const handleAddToCart = async () => {
    if (!product?.id && !product?._id) {
      alert.show('Hata', 'Ürün bilgisi bulunamadı');
      return;
    }

    try {
      setAddingCart(true);
      const userId = await secureStorage.getItem('userId');

      if (!userId) {
        setLoginRequiredMessage('Sepete ürün eklemek için lütfen giriş yapın');
        setShowLoginRequiredModal(true);
        setAddingCart(false);
        return;
      }

      // B2B modu kontrolü - Minimum sipariş miktarı (sadece B2B modunda aktif)
      const isB2BModeActive = await secureStorage.getItem('isB2BMode');
      
      if (isB2BModeActive === 'true' && quantity < B2B_MINIMUM_QUANTITY) {
        alert.show(
          'B2B Minimum Sipariş',
          `B2B modunda minimum ${B2B_MINIMUM_QUANTITY} adet sipariş vermelisiniz. Lütfen miktarı artırın veya ana sayfadan B2C moduna geçin.`
        );
        setAddingCart(false);
        return;
      }

      const pid = product.id || product._id;
      
      // B2B modunda çoklu beden seçimi kontrolü
      if (isB2BMode && sizeOptions.length > 0) {
        // Tek seçenek varsa direkt sepete ekle
        if (sizeOptions.length === 1) {
          // Tek beden var, direkt sepete ekle
          const singleSize = sizeOptions[0];
          const selectedVariations = {};
          
          if (singleSize.id && singleSize.variationId) {
            selectedVariations[singleSize.variationId] = {
              id: singleSize.id,
              variationId: singleSize.variationId,
              value: singleSize.value,
              priceModifier: singleSize.price,
              stock: singleSize.stock,
              sku: singleSize.sku
            };
          } else {
            selectedVariations.size = singleSize.value || singleSize;
          }
          
          // İndirimli fiyatı belirle
          let finalPrice = product.price || 0;
          if (isFlashDeal) {
            finalPrice = priceValue || product.price || 0;
          } else if (product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.price)) {
            finalPrice = parseFloat(product.price || 0);
          } else if (product.discountPrice) {
            finalPrice = parseFloat(product.discountPrice || 0);
          } else {
            finalPrice = parseFloat(product.price || 0);
          }
          
          const response = await cartAPI.add(userId, pid, quantity, selectedVariations, finalPrice);
          
          if (response.data?.success) {
            await secureStorage.setItem('cartLastModified', Date.now().toString());
            const { updateCartBadge } = require('../utils/cartBadge');
            await updateCartBadge(userId);
            
            try {
              await analytics.trackAddToCart(pid, {
                productName: product.name,
                quantity: quantity,
                price: product.price,
                categoryId: product.categoryId,
                selectedVariations: selectedVariations
              });
            } catch (analyticsError) {
              console.log('Analytics add to cart error:', analyticsError);
            }
            
            setShowAddToCartSuccessModal(true);
          } else {
            alert.show('Hata', response.data?.message || 'Sepete eklenemedi');
          }
          setAddingCart(false);
          return;
        }
        
        // Çoklu beden var
        if (selectedSizes.length === 0) {
          alert.show('Beden Seçimi', 'Lütfen en az bir beden seçin.');
          setAddingCart(false);
          return;
        }
        
        // Beden dağılımı modalını aç
        // Her seçili beden için varsayılan miktar ayarla
        const defaultQuantities = {};
        selectedSizes.forEach(sizeIndex => {
          defaultQuantities[sizeIndex] = sizeQuantities[sizeIndex] || B2B_MINIMUM_QUANTITY;
        });
        setSizeQuantities(defaultQuantities);
        setShowSizeDistributionModal(true);
        setAddingCart(false);
        return;
      }
      
      // B2C modu veya bedensiz ürünler için normal akış
      const selectedVariations = {};

      // Seçili beden bilgisini ekle
      if (sizeOptions.length > 0 && sizeOptions[selectedSize]) {
        const selectedSizeOption = sizeOptions[selectedSize];

        // Yeni format (API'den gelen detaylı bilgi)
        if (selectedSizeOption.id && selectedSizeOption.variationId) {
          selectedVariations[selectedSizeOption.variationId] = {
            id: selectedSizeOption.id,
            variationId: selectedSizeOption.variationId,
            value: selectedSizeOption.value,
            priceModifier: selectedSizeOption.price,
            stock: selectedSizeOption.stock,
            sku: selectedSizeOption.sku
          };
        } else {
          // Eski format (basit string)
          selectedVariations.size = selectedSizeOption.value || selectedSizeOption;
        }
      }

      // Renk seçimi kaldırıldı

      // İndirimli fiyatı belirle (flash deal veya normal indirim)
      let finalPrice = product.price || 0;
      
      // Flash deal durumunda indirimli fiyatı kullan
      if (isFlashDeal) {
        // Flash deal durumunda product.price zaten indirimli fiyat olarak güncellenmiş
        // priceValue da indirimli fiyatı içeriyor
        finalPrice = priceValue || product.price || 0;
      } else {
        // Normal indirimli ürün kontrolü
        // Eğer oldPrice varsa ve price'dan büyükse, price indirimli fiyattır
        if (product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.price)) {
          // İndirimli fiyatı kullan (product.price zaten indirimli)
          finalPrice = parseFloat(product.price || 0);
        } else if (product.discountPrice) {
          // discountPrice varsa onu kullan
          finalPrice = parseFloat(product.discountPrice || 0);
        } else {
          // Normal fiyat
          finalPrice = parseFloat(product.price || 0);
        }
      }

      console.log('🛒 Sepete ekleme - Flash Deal:', isFlashDeal, 'İndirimli Fiyat:', finalPrice, 'priceValue:', priceValue, 'product.price:', product.price, 'product.oldPrice:', product.oldPrice);

      const response = await cartAPI.add(userId, pid, quantity, selectedVariations, finalPrice);

      if (response.data?.success) {
        // Sepet değişti - cache'i bypass etmek için timestamp güncelle
        await secureStorage.setItem('cartLastModified', Date.now().toString());
        
        // Badge'i güncelle
        const { updateCartBadge } = require('../utils/cartBadge');
        await updateCartBadge(userId);

        // Analytics: Add to cart tracking
        try {
          await analytics.trackAddToCart(pid, {
            productName: product.name,
            quantity: quantity,
            price: product.price,
            categoryId: product.categoryId,
            selectedVariations: selectedVariations
          });
        } catch (analyticsError) {
          console.log('Analytics add to cart error:', analyticsError);
        }

        setShowAddToCartSuccessModal(true);
      } else {
        alert.show('Hata', response.data?.message || 'Sepete eklenemedi');
      }
    } catch (error) {
      console.error('Sepete ekleme hatası:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
      });

      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        'Sepete eklenirken bir hata oluştu';

      alert.show('Hata', errorMessage);
    } finally {
      setAddingCart(false);
    }
  };

  // Ürün yoksa geri dön
  if (!product) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.errorContainer}>
          <Text style={styles.errorText}>Ürün bulunamadı</Text>
          <Button title="Geri Dön" onPress={() => navigation.goBack()} />
        </SafeAreaView>
      </View>
    );
  }

  // Ürün resimlerini hazırla (API'deki tüm alanları destekle)
  const productImages = useMemo(() => {
    const list = [];
    const API_BASE_URL = getApiUrl().replace('/api', ''); // Base URL'i al (API path'ini kaldır)

    const add = (url) => {
      if (url && typeof url === 'string' && url.trim() !== '' && !list.includes(url)) {
        // URL'yi temizle ve normalize et
        let cleanUrl = url.trim();

        // Relative URL kontrolü - /uploads/ veya / ile başlıyorsa base URL ekle
        if (cleanUrl.startsWith('/uploads/') || (cleanUrl.startsWith('/') && !cleanUrl.startsWith('//') && !cleanUrl.startsWith('http'))) {
          cleanUrl = `${API_BASE_URL}${cleanUrl}`;
          console.log('🔗 Relative URL düzeltildi:', url, '->', cleanUrl);
        }

        // Eğer URL http veya https ile başlıyorsa ekle
        if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
          list.push(cleanUrl);
        } else if (cleanUrl && cleanUrl.length > 0) {
          console.warn('⚠️ Geçersiz görsel URL (http/https yok):', cleanUrl);
        }
      }
    };

    console.log('🖼️ Ürün görselleri işleniyor:', {
      images: product?.images,
      imagesType: typeof product?.images,
      imagesIsArray: Array.isArray(product?.images),
      gallery: product?.gallery,
      galleryType: typeof product?.gallery,
      image: product?.image,
      image1: product?.image1,
      image2: product?.image2,
      image3: product?.image3,
      image4: product?.image4,
      image5: product?.image5,
      // Tüm görsel alanlarını kontrol et
      allImageKeys: Object.keys(product || {}).filter(key =>
        key.toLowerCase().includes('image') ||
        key.toLowerCase().includes('gallery') ||
        key.toLowerCase().includes('photo') ||
        key.toLowerCase().includes('picture') ||
        key.toLowerCase().includes('img')
      ),
    });

    // Önce ana görseli ekle (eğer varsa) - ama sadece geçerli bir URL ise
    if (product?.image && typeof product.image === 'string' && product.image.trim() !== '') {
      add(product.image);
    }

    // images alanı - string veya array olabilir
    if (product?.images) {
      try {
        let imagesArray = product.images;

        // Eğer string ise JSON parse et
        if (typeof product.images === 'string') {
          // Boş string veya null kontrolü
          if (product.images.trim() !== '' && product.images.trim() !== 'null' && product.images.trim() !== 'undefined') {
            try {
              imagesArray = JSON.parse(product.images);
              console.log('📦 images JSON parse edildi:', imagesArray);
            } catch (parseError) {
              // JSON parse başarısız olursa, virgülle ayrılmış string olabilir
              if (product.images.includes(',')) {
                imagesArray = product.images.split(',').map(url => url.trim()).filter(url => url);
                console.log('📦 images virgülle ayrılmış string olarak parse edildi:', imagesArray);
              } else {
                // Tek bir URL string'i olabilir
                imagesArray = [product.images];
              }
            }
          }
        }

        // Array ise işle
        if (Array.isArray(imagesArray)) {
          imagesArray.forEach((img) => {
            if (img) {
              const url = typeof img === 'string' ? img : (img?.url || img?.image || img?.src || img?.path);
              if (url) {
                add(url);
              }
            }
          });
        } else if (typeof imagesArray === 'string' && imagesArray.startsWith('http')) {
          // Tek bir URL string'i
          add(imagesArray);
        }
      } catch (error) {
        console.error('❌ images parse hatası:', error);
        // Parse edilemezse string olarak ekle
        if (typeof product.images === 'string' && product.images.startsWith('http')) {
          add(product.images);
        }
      }
    }

    // gallery alanı - string veya array olabilir
    if (product?.gallery) {
      try {
        let galleryArray = product.gallery;

        // Eğer string ise JSON parse et
        if (typeof product.gallery === 'string') {
          // Boş string veya null kontrolü
          if (product.gallery.trim() !== '' && product.gallery.trim() !== 'null' && product.gallery.trim() !== 'undefined') {
            try {
              galleryArray = JSON.parse(product.gallery);
              console.log('📦 gallery JSON parse edildi:', galleryArray);
            } catch (parseError) {
              // JSON parse başarısız olursa, virgülle ayrılmış string olabilir
              if (product.gallery.includes(',')) {
                galleryArray = product.gallery.split(',').map(url => url.trim()).filter(url => url);
                console.log('📦 gallery virgülle ayrılmış string olarak parse edildi:', galleryArray);
              } else {
                // Tek bir URL string'i olabilir
                galleryArray = [product.gallery];
              }
            }
          }
        }

        // Array ise işle
        if (Array.isArray(galleryArray)) {
          galleryArray.forEach((img) => {
            if (img) {
              const url = typeof img === 'string' ? img : (img?.url || img?.image || img?.src || img?.path);
              if (url) {
                add(url);
              }
            }
          });
        } else if (typeof galleryArray === 'string' && galleryArray.startsWith('http')) {
          // Tek bir URL string'i
          add(galleryArray);
        }
      } catch (error) {
        console.error('❌ gallery parse hatası:', error);
        // Parse edilemezse string olarak ekle
        if (typeof product.gallery === 'string' && product.gallery.startsWith('http')) {
          add(product.gallery);
        }
      }
    }

    // Tekil alanlar (image zaten eklendi, diğerlerini ekle)
    add(product?.image1);
    add(product?.image2);
    add(product?.image3);
    add(product?.image4);
    add(product?.image5);
    add(product?.imageUrl);
    add(product?.thumbnail);

    // Ek görsel alanları kontrol et
    if (product?.additionalImages) {
      try {
        let additionalArray = product.additionalImages;
        if (typeof additionalArray === 'string') {
          try {
            additionalArray = JSON.parse(additionalArray);
          } catch {
            if (additionalArray.includes(',')) {
              additionalArray = additionalArray.split(',').map(url => url.trim()).filter(url => url);
            } else {
              additionalArray = [additionalArray];
            }
          }
        }
        if (Array.isArray(additionalArray)) {
          additionalArray.forEach((img) => {
            if (img) {
              const url = typeof img === 'string' ? img : (img?.url || img?.image || img?.src || img?.path);
              if (url) {
                add(url);
              }
            }
          });
        }
      } catch (error) {
        console.error('❌ additionalImages parse hatası:', error);
      }
    }

    console.log('✅ İşlenmiş görsel listesi:', list);
    console.log('📊 Toplam görsel sayısı:', list.length);

    if (list.length === 0) {
      console.warn('⚠️ Ürün görseli bulunamadı, placeholder kullanılıyor');
      add('https://via.placeholder.com/400?text=Ürün+Görseli');
    }

    return list;
  }, [product]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Product değiştiğinde image index ve selected size'ı sıfırla
  useEffect(() => {
    setCurrentImageIndex(0);
    setSelectedSize(0);
  }, [product?.id, product?._id]);


  // productImages değiştiğinde currentImageIndex'i geçerli tut
  useEffect(() => {
    if (productImages.length > 0 && currentImageIndex >= productImages.length) {
      setCurrentImageIndex(0);
    }
  }, [productImages.length]);

  // sizeOptions değiştiğinde selectedSize'ı geçerli tut
  useEffect(() => {
    if (sizeOptions.length > 0 && selectedSize >= sizeOptions.length) {
      setSelectedSize(0);
    }
  }, [sizeOptions.length]);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState([]);
  const [reviews, setReviews] = useState([
    { id: 1, userName: 'Ayşe D.', rating: 5, comment: 'Bu sırt çantasına bayıldım! Karadeniz\'de 3 günlük yürüyüşte kullandım ve mükemmel dayanıklılık gösterdi. Su geçirmezlik gerçekten işe yarıyor.', date: '2 gün önce', images: ['https://picsum.photos/200/200?random=1'] },
    { id: 2, userName: 'Mehmet K.', rating: 4, comment: 'Kaliteli bir ürün. Fiyat/performans açısından çok iyi. Tek eksi yanı biraz ağır olması.', date: '1 hafta önce', images: [] },
    { id: 3, userName: 'Zeynep A.', rating: 5, comment: 'Harika bir çanta! Tüm outdoor ihtiyaçlarım için mükemmel. Kesinlikle tavsiye ederim.', date: '2 hafta önce', images: ['https://picsum.photos/200/200?random=2', 'https://picsum.photos/200/200?random=3'] }
  ]);

  // Soru-Cevap state'leri
  const [questions, setQuestions] = useState([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  const displayImage = productImages[currentImageIndex] || 'https://via.placeholder.com/400';

  const hasStock = product?.stock === undefined ? true : product.stock > 0;
  const maxQty = product?.stock && product.stock > 0 ? product.stock : 99;
  // İndirimli fiyatı hesapla
  // Flash deal durumunda product.price zaten indirimli fiyat
  // Normal indirimli ürünler için oldPrice > price kontrolü yap
  let priceValue = parseFloat(product?.price || 0);
  if (isFlashDeal) {
    // Flash deal durumunda product.price zaten indirimli
    priceValue = parseFloat(product?.price || 0);
  } else if (product?.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.price)) {
    // Normal indirimli ürün - price indirimli fiyat
    priceValue = parseFloat(product?.price || 0);
  } else if (product?.discountPrice) {
    // discountPrice varsa onu kullan
    priceValue = parseFloat(product?.discountPrice || 0);
  }
  
  const oldPriceValue = flashDealOldPrice || product?.oldPrice;

  // Deep link'ten gelip yükleniyorsa loading göster
  if (loadingDetail && !product) {
    return (
      <View style={styles.deepLinkLoadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.deepLinkLoadingText}>Ürün yükleniyor...</Text>
      </View>
    );
  }

  // Deep link hatası varsa error göster
  if (deepLinkError && !product) {
    return (
      <View style={styles.deepLinkErrorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.deepLinkErrorText}>{deepLinkError}</Text>
        <TouchableOpacity 
          style={styles.deepLinkRetryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.deepLinkRetryText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header - Scrollable */}
        <View style={styles.headerScrollable}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.headerButton, styles.aiButton]} onPress={handleAIAssistant}>
              <Ionicons name="sparkles" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleToggleFavorite}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={COLORS.white}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowPriceAlertModal(true)}
            >
              <Ionicons
                name={hasPriceAlert ? 'notifications' : 'notifications-outline'}
                size={24}
                color={hasPriceAlert ? COLORS.primary : COLORS.white}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Product Image */}
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={() => handleImagePress(currentImageIndex)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: displayImage }}
            style={styles.productImage}
            resizeMode="cover"
            defaultSource={require('../../assets/icon.png')}
            onError={(error) => {
              console.log('Görsel yükleme hatası:', displayImage, error.nativeEvent.error);
            }}
          />
          <View style={styles.zoomIndicator}>
            <Ionicons name="expand-outline" size={20} color={COLORS.white} />
          </View>
          {/* 24 Saatte Satılan Adet Banner */}
          {hasStock && (
            <View style={styles.salesBanner}>
              <Ionicons name="flash" size={14} color={COLORS.white} style={styles.salesIcon} />
              <Text style={styles.salesText}>
                24 saatte {getSalesCount24h} adet satıldı
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Pagination */}
        {productImages.length > 1 && (
          <View style={styles.paginationContainer}>
            <View style={styles.pagination}>
              {productImages.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCurrentImageIndex(index)}
                >
                  <View
                    style={[
                      styles.paginationDot,
                      currentImageIndex === index && styles.paginationDotActive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Image Gallery Thumbnails */}
        {productImages && productImages.length > 1 && (
          <View style={styles.galleryContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryContent}
            >
              {productImages.map((image, index) => {
                if (!image) return null;
                return (
                  <TouchableOpacity
                    key={`thumb-${index}-${image}`}
                    onPress={() => setCurrentImageIndex(index)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.thumbnailContainer,
                        currentImageIndex === index && styles.thumbnailContainerActive,
                      ]}
                    >
                      <Image
                        source={{ uri: image }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                        defaultSource={require('../../assets/icon.png')}
                        onError={(error) => {
                          console.log('❌ Thumbnail yükleme hatası:', image, error.nativeEvent.error);
                        }}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Title & Price */}
          <View style={styles.titleSection}>
            <Text style={styles.category}>{product.category || 'Ürün'}</Text>
            <Text style={styles.productName}>{product.name}</Text>

            {/* Live Viewers Badge */}
            <View style={styles.liveViewersContainer}>
              <View style={styles.liveViewersBadge}>
                <View style={styles.liveIndicator} />
                <Ionicons name="eye-outline" size={16} color={COLORS.error} />
                <Text style={styles.liveViewersText}>
                  Şu anda <Text style={styles.liveViewersCount}>{liveViewers} kişi</Text> bu ürünü inceliyor
                </Text>
              </View>
            </View>

            {/* Stok Kodu */}
            {(product.sku || product.stockCode || product.barkod) && (
              <View style={styles.skuContainer}>
                <Ionicons name="barcode-outline" size={16} color={COLORS.gray500} />
                <Text style={styles.skuText}>
                  Stok Kodu: {product.sku || product.stockCode || product.barkod}
                </Text>
              </View>
            )}

            <View style={styles.priceRow}>
              <View style={styles.priceContainer}>
                {isFlashDeal && oldPriceValue && parseFloat(oldPriceValue) > priceValue ? (
                  <>
                    <Text style={styles.flashPrice}>
                      {priceValue.toFixed(2)} ₺
                    </Text>
                    <Text style={styles.oldPriceDetail}>
                      {parseFloat(oldPriceValue).toFixed(2)} ₺
                    </Text>
                    <View style={styles.flashDiscountBadgeDetail}>
                      <Ionicons name="flash" size={12} color={COLORS.white} />
                      <Text style={styles.flashDiscountTextDetail}>
                        %{Math.round(((parseFloat(oldPriceValue) - priceValue) / parseFloat(oldPriceValue)) * 100)} İndirim
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.price}>
                    {priceValue.toFixed(2)} ₺
                  </Text>
                )}
              </View>
              {product.rating && product.rating > 0 && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={18} color="#FFA500" />
                  <Text style={styles.rating}>{parseFloat(product.rating).toFixed(1)}</Text>
                  <Text style={styles.reviews}>
                    ({product.reviewCount || 0} Değerlendirme)
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Size Selection */}
          {sizeOptions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Beden</Text>
                <TouchableOpacity>
                  <View style={styles.sizeGuideContainer}>
                    <Text style={styles.sizeGuide}>Beden Rehberi</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <View style={styles.sizesContainer}>
                {sizeOptions.map((size, index) => {
                  const sizeValue = size.value || size;
                  const isOutOfStock = size.stock !== undefined && size.stock <= 0;
                  
                  // B2B modunda çoklu seçim kontrolü
                  const isSelected = isB2BMode 
                    ? selectedSizes.includes(index)
                    : selectedSize === index;

                  return (
                    <TouchableOpacity
                      key={size.id || index}
                      style={[
                        styles.sizeOption,
                        isSelected && styles.sizeOptionSelected,
                        isOutOfStock && styles.sizeOptionDisabled,
                      ]}
                      onPress={() => {
                        if (isOutOfStock) return;
                        
                        if (isB2BMode) {
                          // B2B modunda çoklu seçim
                          setSelectedSizes(prev => {
                            if (prev.includes(index)) {
                              // Zaten seçiliyse kaldır
                              return prev.filter(i => i !== index);
                            } else {
                              // Seçili değilse ekle
                              return [...prev, index];
                            }
                          });
                        } else {
                          // B2C modunda tekli seçim
                          setSelectedSize(index);
                        }
                      }}
                      activeOpacity={0.85}
                      disabled={isOutOfStock}
                    >
                      <Text
                        style={[
                          styles.sizeText,
                          isSelected && styles.sizeTextSelected,
                          isOutOfStock && styles.sizeTextDisabled,
                        ]}
                      >
                        {sizeValue}
                      </Text>
                      {/* B2B modunda seçili bedenlerde checkmark göster */}
                      {isB2BMode && isSelected && (
                        <View style={styles.sizeCheckmark}>
                          <Ionicons name="checkmark" size={14} color={COLORS.white} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              {/* B2B modunda seçili bedenler bilgisi */}
              {isB2BMode && selectedSizes.length > 0 && (
                <View style={styles.selectedSizesInfo}>
                  <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.selectedSizesText}>
                    {selectedSizes.length} beden seçildi
                  </Text>
                </View>
              )}
            </View>
          )}



          {/* Description */}
          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Açıklama</Text>
              <Text style={styles.description}>
                {product.description}
              </Text>
            </View>
          )}

          {/* Product Questions Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Soru & Cevap ({questions.length})</Text>
            </View>

            {/* Ask Question Button */}
            <TouchableOpacity
              style={styles.askQuestionButton}
              onPress={() => setShowQuestionModal(true)}
            >
              <Ionicons name="help-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.askQuestionText}>Ürün Hakkında Soru Sor</Text>
            </TouchableOpacity>

            {/* Questions List */}
            {loadingQuestions ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Sorular yükleniyor...</Text>
              </View>
            ) : questions.length > 0 ? (
              questions.slice(0, 3).map((question) => (
                <View key={question.id || question._id} style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <View style={styles.questionUser}>
                      <Ionicons name="person-circle-outline" size={32} color={COLORS.gray400} />
                      <View style={styles.questionUserInfo}>
                        <Text style={styles.questionUserName}>
                          {(() => {
                            // Tüm olası isim kaynaklarını kontrol et
                            const name = question.userName || 
                                        question.user?.name || 
                                        question.user?.userName ||
                                        question.createdBy?.name ||
                                        question.createdBy?.userName ||
                                        question.name || 
                                        '';
                            
                            // Debug: API'den gelen veriyi kontrol et
                            if (!name) {
                              console.log('⚠️ Soru için kullanıcı adı bulunamadı:', {
                                questionId: question.id || question._id,
                                hasUserName: !!question.userName,
                                hasUser: !!question.user,
                                hasUser_name: !!question.user?.name,
                                hasCreatedBy: !!question.createdBy,
                                questionKeys: Object.keys(question)
                              });
                            }
                            
                            const masked = maskUserName(name);
                            // Eğer maskeleme "Kullanıcı" döndürdüyse, yine de göster
                            return masked || 'Kullanıcı';
                          })()}
                        </Text>
                        <Text style={styles.questionDate}>
                          {question.createdAt ? new Date(question.createdAt).toLocaleDateString('tr-TR') : 'Yakın zamanda'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.questionContent}>
                    <View style={styles.questionBadge}>
                      <Ionicons name="help-circle" size={16} color={COLORS.primary} />
                      <Text style={styles.questionBadgeText}>SORU</Text>
                    </View>
                    <Text style={styles.questionText}>{question.question}</Text>
                  </View>

                  {question.answer && (
                    <View style={styles.answerContent}>
                      <View style={styles.answerBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                        <Text style={styles.answerBadgeText}>CEVAP</Text>
                      </View>
                      <Text style={styles.answerText}>{question.answer}</Text>
                      {question.answeredBy && (
                        <Text style={styles.answeredBy}>
                          - {(() => {
                            const answeredBy = question.answeredBy?.toLowerCase() || '';
                            if (answeredBy === 'seller' ||
                              answeredBy === 'admin' ||
                              answeredBy === 'huglu outdoor' ||
                              answeredBy === 'hugluoutdoor' ||
                              answeredBy === 'huglu outdoor') {
                              return 'Huglu Outdoor';
                            }
                            return question.answeredBy;
                          })()}
                        </Text>
                      )}
                    </View>
                  )}

                  {!question.answer && (
                    <View style={styles.waitingAnswer}>
                      <Ionicons name="time-outline" size={16} color={COLORS.gray400} />
                      <Text style={styles.waitingAnswerText}>Cevap bekleniyor...</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyQuestionsContainer}>
                <Ionicons name="chatbubble-outline" size={48} color={COLORS.gray300} />
                <Text style={styles.emptyQuestionsText}>Henüz soru sorulmamış</Text>
                <Text style={styles.emptyQuestionsSubtext}>İlk soruyu siz sorun!</Text>
              </View>
            )}

            {questions.length > 3 && (
              <TouchableOpacity style={styles.seeAllQuestionsButton}>
                <Text style={styles.seeAllQuestionsText}>Tüm Soruları Gör ({questions.length})</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Reviews Preview */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Değerlendirmeler ({reviews.length})</Text>
            </View>

            {/* Add Review Button */}
            <TouchableOpacity
              style={styles.addReviewButton}
              onPress={() => setShowReviewModal(true)}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              <Text style={styles.addReviewText}>Yorum Yap</Text>
            </TouchableOpacity>

            {/* Reviews List */}
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewUser}>
                    <View style={styles.reviewAvatar}>
                      <Ionicons name="person" size={20} color={COLORS.gray400} />
                    </View>
                    <View>
                      <Text style={styles.reviewName}>{review.userName}</Text>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= review.rating ? "star" : "star-outline"}
                            size={12}
                            color="#FFA500"
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
                <Text style={styles.reviewText}>{review.comment}</Text>
                {review.images && review.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagesContainer}>
                    {review.images.map((img, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          setReviewImageViewerImages(review.images);
                          setReviewImageViewerIndex(idx);
                          setShowReviewImageViewer(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: img }} style={styles.reviewImage} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            ))}
          </View>

          {/* Product Recommendations */}
          <ProductRecommendations
            currentProduct={product}
            maxItems={6}
            onProductPress={(recommendedProduct) => {
              // Yeni ürün detayına git
              navigation.push('ProductDetail', { product: recommendedProduct });
            }}
          />
        </View>
      </ScrollView>

      {/* Chatbot Floating Button */}
      {!showChatbot && (
        <TouchableOpacity
          style={styles.chatbotButton}
          onPress={handleChatbotOpen}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}

      {/* Chatbot Modal */}
      <Modal
        visible={showChatbot}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowChatbot(false)}
      >
        <SafeAreaView style={styles.chatbotContainer} edges={['top', 'bottom']}>
          {/* Chatbot Header */}
          <View style={styles.chatbotHeader}>
            <TouchableOpacity
              onPress={() => setShowChatbot(false)}
              style={styles.chatbotBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
            </TouchableOpacity>
            <View style={styles.chatbotHeaderInfo}>
              <View style={styles.chatbotHeaderTitleRow}>
                <View style={styles.chatbotHeaderIcon}>
                  <Ionicons name="sparkles" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.chatbotHeaderTitle}>Huğlu AI</Text>
              </View>
              <View style={styles.chatbotOnlineStatus}>
                <View style={styles.chatbotOnlineDot} />
                <Text style={styles.chatbotOnlineText}>Online</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.chatbotMenuButton}>
              <Ionicons name="ellipsis-vertical" size={24} color={COLORS.textMain} />
            </TouchableOpacity>
          </View>

          {/* Chat Messages */}
          <ScrollView
            style={styles.chatbotMessages}
            contentContainerStyle={styles.chatbotMessagesContent}
          >
            {chatMessages.map((message) => (
              <View key={message.id} style={styles.chatbotMessageWrapper}>
                {message.type === 'bot' && (
                  <View style={styles.chatbotBotHeader}>
                    <View style={styles.chatbotAvatar}>
                      <Ionicons name="chatbubbles" size={16} color={COLORS.primary} />
                    </View>
                    <Text style={styles.chatbotMessageLabel}>Huğlu AI</Text>
                  </View>
                )}
                <View style={[
                  styles.chatbotMessage,
                  message.type === 'user' ? styles.chatbotMessageUser : styles.chatbotMessageBot
                ]}>
                  <Text style={[
                    styles.chatbotMessageText,
                    message.type === 'user' && styles.chatbotMessageTextUser
                  ]}>
                    {message.text}
                  </Text>

                  {/* Quick Order Button */}
                  {(message.messageType === 'quick-order' || message.action === 'add-to-cart') && message.action === 'add-to-cart' && (
                    <TouchableOpacity
                      style={styles.quickOrderButton}
                      onPress={async () => {
                        const targetProductId = message.productId || product?.id || product?._id;
                        if (targetProductId) {
                          await handleAddToCartFromChatbot(targetProductId, message.quantity || 1);
                        } else {
                          handleQuickOrder();
                        }
                      }}
                    >
                      <Ionicons name="cart" size={18} color={COLORS.white} />
                      <Text style={styles.quickOrderButtonText}>Sepete Ekle ve Devam Et</Text>
                    </TouchableOpacity>
                  )}

                  {/* Müşteri Hizmetlerine Bağlan Button */}
                  {message.showSupportButton && (
                    <TouchableOpacity
                      style={styles.supportButton}
                      onPress={() => {
                        setShowChatbot(false);
                        navigation.navigate('LiveChat', {
                          initialMessage: 'Merhaba, yardıma ihtiyacım var.'
                        });
                      }}
                    >
                      <Ionicons name="headset" size={18} color={COLORS.white} />
                      <Text style={styles.supportButtonText}>Müşteri Hizmetlerine Bağlan</Text>
                    </TouchableOpacity>
                  )}

                  {/* Ürün Kartları - Gemini önerileri için */}
                  {message.data && message.data.products && message.data.products.length > 0 && (
                    <View style={styles.chatbotProductsContainer}>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.chatbotProductsScroll}
                      >
                        {message.data.products.map((product) => (
                          <View key={product.id} style={styles.chatbotProductCard}>
                            <ProductCard
                              product={product}
                              onPress={() => {
                                setShowChatbot(false);
                                navigation.navigate('ProductDetail', { productId: product.id });
                              }}
                              onFavorite={async () => {
                                // Favorilere ekleme işlemi
                                try {
                                  const userId = await secureStorage.getItem('userId');
                                  if (!userId) {
                                    setShowLoginRequiredModal(true);
                                    setLoginRequiredMessage('Favorilere eklemek için lütfen giriş yapın');
                                    return;
                                  }
                                  const isProductFavorite = favorites.includes(product.id);
                                  if (isProductFavorite) {
                                    const favoritesResponse = await wishlistAPI.get(userId);
                                    if (favoritesResponse.data?.success) {
                                      const favs = favoritesResponse.data.data || favoritesResponse.data.favorites || [];
                                      const favorite = favs.find((fav) => (fav.productId || fav.id) === product.id);
                                      if (favorite && (favorite.id || favorite._id)) {
                                        await wishlistAPI.remove(favorite.id || favorite._id, userId);
                                      }
                                    }
                                    setFavorites(favorites.filter(id => id !== product.id));
                                  } else {
                                    await wishlistAPI.add(userId, product.id);
                                    setFavorites([...favorites, product.id]);
                                  }
                                } catch (error) {
                                  console.error('Favori ekleme hatası:', error);
                                  alert.show('Hata', 'Favori işlemi başarısız oldu');
                                }
                              }}
                            />
                            {/* Sepete Ekle Butonu - Gemini önerileri için */}
                            <TouchableOpacity
                              style={styles.chatbotAddToCartButton}
                              onPress={async () => {
                                await handleAddToCartFromChatbot(product.id, 1);
                              }}
                            >
                              <Ionicons name="cart-outline" size={16} color={COLORS.white} />
                              <Text style={styles.chatbotAddToCartText}>Sepete Ekle</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Quick Replies */}
                  {message.quickReplies && message.quickReplies.length > 0 && (
                    <View style={styles.quickRepliesContainer}>
                      {message.quickReplies.map((reply) => (
                        <TouchableOpacity
                          key={reply.id}
                          style={styles.quickReplyButton}
                          onPress={() => {
                            if (reply.action === 'live_support') {
                              setShowChatbot(false);
                              navigation.navigate('LiveChat', {
                                initialMessage: reply.text || 'Merhaba, yardıma ihtiyacım var.'
                              });
                            } else if (reply.action === 'product_search') {
                              // Ürün arama için chatbot'a yönlendir
                              handleQuickAction('Ürün ara');
                            } else if (reply.action === 'navigate_orders') {
                              setShowChatbot(false);
                              navigation.navigate('OrderTracking');
                            } else if (reply.action === 'view_faq') {
                              setShowChatbot(false);
                              navigation.navigate('FAQ');
                            } else {
                              handleQuickAction(reply.text);
                            }
                          }}
                        >
                          <Text style={styles.quickReplyText}>{reply.text}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                {message.type === 'user' && (
                  <Text style={styles.chatbotMessageTime}>
                    {message.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
            ))}

            {/* Typing Indicator */}
            {botTyping && (
              <View style={styles.chatbotMessageWrapper}>
                <View style={styles.chatbotBotHeader}>
                  <View style={styles.chatbotAvatar}>
                    <Ionicons name="chatbubbles" size={16} color={COLORS.primary} />
                  </View>
                  <Text style={styles.chatbotMessageLabel}>Huğlu AI</Text>
                </View>
                <View style={[styles.chatbotMessage, styles.chatbotMessageBot]}>
                  <View style={styles.typingIndicator}>
                    <Animated.View style={[
                      styles.typingDot,
                      {
                        opacity: typingAnim1.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 1],
                        }),
                        transform: [{
                          scale: typingAnim1.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        }],
                      },
                    ]} />
                    <Animated.View style={[
                      styles.typingDot,
                      {
                        opacity: typingAnim2.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 1],
                        }),
                        transform: [{
                          scale: typingAnim2.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        }],
                      },
                    ]} />
                    <Animated.View style={[
                      styles.typingDot,
                      {
                        opacity: typingAnim3.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 1],
                        }),
                        transform: [{
                          scale: typingAnim3.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        }],
                      },
                    ]} />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick Actions */}
          <View style={styles.chatbotQuickActions}>
            <TouchableOpacity
              style={[styles.chatbotQuickAction, styles.chatbotQuickActionPrimary]}
              onPress={() => handleQuickAction('Sipariş ver')}
            >
              <Ionicons name="cart" size={14} color={COLORS.primary} />
              <Text style={[styles.chatbotQuickActionText, styles.chatbotQuickActionTextPrimary]}>Hızlı Sipariş</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chatbotQuickAction}
              onPress={() => handleQuickAction('Beden bilgisi')}
            >
              <Text style={styles.chatbotQuickActionText}>Beden bilgisi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chatbotQuickAction}
              onPress={() => handleQuickAction('Fiyat')}
            >
              <Text style={styles.chatbotQuickActionText}>Fiyat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chatbotQuickAction, styles.chatbotQuickActionSupport]}
              onPress={() => handleQuickAction('Müşteri Hizmetleri')}
            >
              <Ionicons name="headset" size={14} color={COLORS.success} />
              <Text style={[styles.chatbotQuickActionText, styles.chatbotQuickActionTextSupport]}>Müşteri Hizmetleri</Text>
            </TouchableOpacity>
          </View>

          {/* Chat Input */}
          <View style={styles.chatbotInputContainer}>
            <TouchableOpacity style={styles.chatbotAttachButton}>
              <Ionicons name="add-circle-outline" size={28} color={COLORS.gray400} />
            </TouchableOpacity>
            <TextInput
              style={styles.chatbotInput}
              placeholder="Mesaj yazın..."
              placeholderTextColor={COLORS.gray400}
              value={chatInput}
              onChangeText={setChatInput}
              multiline
            />
            <TouchableOpacity style={styles.chatbotVoiceButton}>
              <Ionicons name="mic-outline" size={24} color={COLORS.gray400} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chatbotSendButton}
              onPress={handleSendMessage}
            >
              <Ionicons name="send" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Bottom Bar */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        {/* B2B Minimum Sipariş Uyarısı */}
        {isB2BMode && (
          <View style={styles.b2bWarning}>
            <Ionicons name="business" size={16} color={COLORS.primary} />
            <Text style={styles.b2bWarningText}>
              B2B Modu: Minimum {B2B_MINIMUM_QUANTITY} adet sipariş gereklidir
            </Text>
          </View>
        )}
        
        <View style={styles.bottomContent}>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(isB2BMode ? B2B_MINIMUM_QUANTITY : 1, quantity - 1))}
              disabled={!hasStock}
            >
              <Ionicons name="remove" size={20} color={COLORS.textMain} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.min(maxQty, quantity + 1))}
              disabled={!hasStock}
            >
              <Ionicons name="add" size={20} color={COLORS.textMain} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              (!hasStock) && styles.addToCartButtonDisabled
            ]}
            onPress={handleAddToCart}
            disabled={!hasStock || addingCart}
          >
            <Ionicons name="cart-outline" size={20} color={COLORS.white} />
            <Text style={styles.addToCartText}>
              {hasStock ? (addingCart ? 'Ekleniyor...' : 'Sepete Ekle') : 'Stokta Yok'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Question Modal */}
      <Modal
        visible={showQuestionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuestionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.questionModalContent}>
            <View style={styles.questionModalHeader}>
              <Text style={styles.questionModalTitle}>Ürün Hakkında Soru Sor</Text>
              <TouchableOpacity onPress={() => setShowQuestionModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <View style={styles.questionModalInfo}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.questionModalInfoText}>
                Ürün hakkında merak ettiklerinizi sorun. Satıcı en kısa sürede yanıtlayacaktır.
              </Text>
            </View>

            {/* Question Input */}
            <View style={styles.questionInputContainer}>
              <Text style={styles.questionInputLabel}>Sorunuz</Text>
              <TextInput
                style={styles.questionInput}
                placeholder="Örn: Bu ürünün boyutları nedir?"
                placeholderTextColor={COLORS.gray400}
                multiline
                numberOfLines={6}
                value={newQuestion}
                onChangeText={setNewQuestion}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.characterCount}>{newQuestion.length}/500</Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitQuestionButton, submittingQuestion && styles.submitQuestionButtonDisabled]}
              onPress={handleSubmitQuestion}
              disabled={submittingQuestion || !newQuestion.trim()}
            >
              <Ionicons name="send" size={20} color={COLORS.white} />
              <Text style={styles.submitQuestionText}>
                {submittingQuestion ? 'Gönderiliyor...' : 'Soruyu Gönder'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reviewModalContent}>
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewModalTitle}>Ürünü Değerlendir</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            {/* Rating Stars */}
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Puanınız</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setNewReviewRating(star)}
                  >
                    <Ionicons
                      name={star <= newReviewRating ? "star" : "star-outline"}
                      size={32}
                      color="#FFA500"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Comment Input */}
            <View style={styles.commentContainer}>
              <Text style={styles.commentLabel}>Yorumunuz</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Ürün hakkındaki düşüncelerinizi paylaşın..."
                placeholderTextColor={COLORS.gray400}
                multiline
                numberOfLines={6}
                value={newReviewComment}
                onChangeText={setNewReviewComment}
                textAlignVertical="top"
              />
            </View>

            {/* Image Upload */}
            <View style={styles.imageUploadContainer}>
              <Text style={styles.imageUploadLabel}>Fotoğraflar (Opsiyonel)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageUploadScroll}>
                {reviewImages.map((img, index) => (
                  <View key={index} style={styles.uploadedImageContainer}>
                    <Image source={{ uri: img }} style={styles.uploadedImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}
                {reviewImages.length < 5 && (
                  <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                    <Ionicons name="camera-outline" size={32} color={COLORS.gray400} />
                    <Text style={styles.addImageText}>Fotoğraf Ekle</Text>
                    <Text style={styles.addImageSubtext}>({reviewImages.length}/5)</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitReviewButton}
              onPress={handleSubmitReview}
            >
              <Text style={styles.submitReviewText}>Yorumu Gönder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
      >
        <View style={styles.imageViewerContainer}>
          <SafeAreaView style={styles.imageViewerSafeArea} edges={['top']}>
            <View style={styles.imageViewerHeader}>
              <TouchableOpacity
                style={styles.imageViewerCloseButton}
                onPress={() => setShowImageViewer(false)}
              >
                <Ionicons name="close" size={28} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.imageViewerCounter}>
                {imageViewerIndex + 1} / {productImages.length}
              </Text>
            </View>
          </SafeAreaView>

          <View style={styles.imageViewerContent}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / width);
                setImageViewerIndex(index);
              }}
              contentOffset={{ x: imageViewerIndex * width, y: 0 }}
            >
              {productImages.map((image, index) => (
                <View key={index} style={styles.imageViewerSlide}>
                  <Image
                    source={{ uri: image }}
                    style={styles.imageViewerImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          </View>

          {productImages.length > 1 && (
            <View style={styles.imageViewerPagination}>
              {productImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.imageViewerDot,
                    imageViewerIndex === index && styles.imageViewerDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>

      {/* Review Image Viewer Modal */}
      <Modal
        visible={showReviewImageViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReviewImageViewer(false)}
      >
        <View style={styles.imageViewerContainer}>
          <SafeAreaView style={styles.imageViewerSafeArea} edges={['top']}>
            <View style={styles.imageViewerHeader}>
              <TouchableOpacity
                style={styles.imageViewerCloseButton}
                onPress={() => setShowReviewImageViewer(false)}
              >
                <Ionicons name="close" size={28} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.imageViewerCounter}>
                {reviewImageViewerIndex + 1} / {reviewImageViewerImages.length}
              </Text>
              <View style={styles.imageViewerBadge}>
                <Ionicons name="chatbox" size={16} color={COLORS.white} />
                <Text style={styles.imageViewerBadgeText}>Yorum</Text>
              </View>
            </View>
          </SafeAreaView>

          <View style={styles.imageViewerContent}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / width);
                setReviewImageViewerIndex(index);
              }}
              contentOffset={{ x: reviewImageViewerIndex * width, y: 0 }}
            >
              {reviewImageViewerImages.map((image, index) => (
                <View key={index} style={styles.imageViewerSlide}>
                  <Image
                    source={{ uri: image }}
                    style={styles.imageViewerImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          </View>

          {reviewImageViewerImages.length > 1 && (
            <View style={styles.imageViewerPagination}>
              {reviewImageViewerImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.imageViewerDot,
                    reviewImageViewerIndex === index && styles.imageViewerDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>

      {/* AI Assistant Modal */}
      <CustomModal
        visible={showAIModal}
        onClose={() => setShowAIModal(false)}
        title="AI Asistan"
        subtitle="Size nasıl yardımcı olabilirim?"
        icon="sparkles"
        iconColor={COLORS.primary}
        actionButton
        actionButtonText="Kapat"
        onActionPress={() => setShowAIModal(false)}
        scrollable={false}
      >
        <ModalOption
          icon="color-palette"
          iconColor={COLORS.primary}
          title="Ürün Bilgisi ve Stil Önerileri"
          description="Kombinasyon ve stil önerileri alın"
          onPress={() => handleAIOption('styleadvisor')}
        />
        <ModalOption
          icon="grid"
          iconColor={COLORS.primary}
          title="Benzer Ürünler"
          description="Size özel öneriler"
          onPress={() => handleAIOption('similar')}
        />
        <ModalOption
          icon="bulb"
          iconColor={COLORS.primary}
          title="Kullanım Önerileri"
          description="Ürünü en iyi şekilde kullanın"
          onPress={() => handleAIOption('tips')}
        />
      </CustomModal>

      {/* Similar Products Modal */}
      <CustomModal
        visible={showSimilarModal}
        onClose={() => setShowSimilarModal(false)}
        title="Benzer Ürünler"
        icon="grid"
        iconColor={COLORS.primary}
        scrollable={false}
      >
        <View style={styles.similarModalContent}>
          <Text style={styles.similarModalText}>
            Benzer ürünleri görmek için ürün listesine gidin.
          </Text>
          <View style={styles.similarModalActions}>
            <TouchableOpacity
              style={styles.similarModalCancelButton}
              onPress={() => setShowSimilarModal(false)}
            >
              <Text style={styles.similarModalCancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.similarModalActionButton}
              onPress={() => {
                setShowSimilarModal(false);
                navigation.navigate('Shop');
              }}
            >
              <Text style={styles.similarModalActionText}>Ürünlere Git</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CustomModal>

      {/* Usage Tips Modal - Gemini AI */}
      <CustomModal
        visible={showTipsModal}
        onClose={() => {
          setShowTipsModal(false);
          setAiTips([]);
          setAiTipsError(null);
        }}
        title="AI Kullanım Önerileri"
        subtitle="Huğlu AI tarafından oluşturuldu"
        icon="bulb"
        iconColor={COLORS.primary}
        actionButton
        actionButtonText="Tamam"
        onActionPress={() => {
          setShowTipsModal(false);
          setAiTips([]);
          setAiTipsError(null);
        }}
        scrollable={true}
      >
        <View style={styles.tipsModalContent}>
          <Text style={styles.tipsProductName}>
            {product?.name || 'Bu ürün'} için öneriler:
          </Text>
          
          {aiTipsLoading ? (
            <View style={styles.tipsLoadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.tipsLoadingText}>AI önerileriniz hazırlanıyor...</Text>
            </View>
          ) : aiTipsError ? (
            <View style={styles.tipsErrorContainer}>
              <Ionicons name="alert-circle" size={40} color={COLORS.error} />
              <Text style={styles.tipsErrorText}>{aiTipsError}</Text>
              <TouchableOpacity style={styles.tipsRetryButton} onPress={fetchAITips}>
                <Text style={styles.tipsRetryText}>Tekrar Dene</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tipsList}>
              {aiTips.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <View style={styles.tipIconContainer}>
                    <Ionicons name="sparkles" size={18} color={COLORS.white} />
                  </View>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.aiPoweredBadge}>
            <Ionicons name="sparkles" size={14} color={COLORS.primary} />
            <Text style={styles.aiPoweredText}>Huğlu AI ile oluşturuldu</Text>
          </View>
        </View>
      </CustomModal>

      {/* Add to Cart Success Modal */}
      <AddToCartSuccessModal
        visible={showAddToCartSuccessModal}
        onClose={() => setShowAddToCartSuccessModal(false)}
        onContinueShopping={() => {
          setShowAddToCartSuccessModal(false);
        }}
        onGoToCart={() => {
          setShowAddToCartSuccessModal(false);
          navigation.navigate('Cart');
        }}
      />

      {/* B2B Size Distribution Modal */}
      <Modal
        visible={showSizeDistributionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSizeDistributionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sizeDistributionModal}>
            <View style={styles.sizeDistributionHeader}>
              <Text style={styles.sizeDistributionTitle}>Beden Dağılımı</Text>
              <TouchableOpacity onPress={() => setShowSizeDistributionModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sizeDistributionSubtitle}>
              Her beden için sipariş miktarını belirleyin (Min: {B2B_MINIMUM_QUANTITY} adet)
            </Text>

            <ScrollView style={styles.sizeDistributionList}>
              {selectedSizes.map((sizeIndex) => {
                const size = sizeOptions[sizeIndex];
                const sizeValue = size.value || size;
                const currentQuantity = sizeQuantities[sizeIndex] || B2B_MINIMUM_QUANTITY;

                return (
                  <View key={sizeIndex} style={styles.sizeDistributionItem}>
                    <View style={styles.sizeDistributionInfo}>
                      <View style={styles.sizeDistributionBadge}>
                        <Text style={styles.sizeDistributionBadgeText}>{sizeValue}</Text>
                      </View>
                      <View style={styles.sizeDistributionDetails}>
                        <Text style={styles.sizeDistributionLabel}>Beden: {sizeValue}</Text>
                        {size.stock && (
                          <Text style={styles.sizeDistributionStock}>Stok: {size.stock} adet</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.sizeDistributionQuantity}>
                      <TouchableOpacity
                        style={styles.sizeDistributionButton}
                        onPress={() => {
                          const newQty = Math.max(B2B_MINIMUM_QUANTITY, currentQuantity - 1);
                          setSizeQuantities(prev => ({ ...prev, [sizeIndex]: newQty }));
                        }}
                      >
                        <Ionicons name="remove" size={20} color={COLORS.textMain} />
                      </TouchableOpacity>

                      <Text style={styles.sizeDistributionQuantityText}>{currentQuantity}</Text>

                      <TouchableOpacity
                        style={styles.sizeDistributionButton}
                        onPress={() => {
                          const maxQty = size.stock || 9999;
                          const newQty = Math.min(maxQty, currentQuantity + 1);
                          setSizeQuantities(prev => ({ ...prev, [sizeIndex]: newQty }));
                        }}
                      >
                        <Ionicons name="add" size={20} color={COLORS.textMain} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.sizeDistributionFooter}>
              <View style={styles.sizeDistributionTotal}>
                <Text style={styles.sizeDistributionTotalLabel}>Toplam Adet:</Text>
                <Text style={styles.sizeDistributionTotalValue}>
                  {Object.values(sizeQuantities).reduce((sum, qty) => sum + qty, 0)} adet
                </Text>
              </View>

              <TouchableOpacity
                style={styles.sizeDistributionConfirmButton}
                onPress={handleConfirmSizeDistribution}
                disabled={addingCart}
              >
                {addingCart ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="cart-outline" size={20} color={COLORS.white} />
                    <Text style={styles.sizeDistributionConfirmText}>Sepete Ekle</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert */}
      {/* Price Alert Modal */}
      <Modal
        visible={showPriceAlertModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPriceAlertModal(false);
          setPriceAlertTargetPrice('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.priceAlertModalContent}>
            <View style={styles.priceAlertModalHeader}>
              <Text style={styles.priceAlertModalTitle}>Fiyat Alarmı Oluştur</Text>
              <TouchableOpacity onPress={() => {
                setShowPriceAlertModal(false);
                setPriceAlertTargetPrice('');
              }}>
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <View style={styles.priceAlertModalBody}>
              <Text style={styles.priceAlertProductName}>{product?.name}</Text>
              
              <View style={styles.priceInfoRow}>
                <Text style={styles.priceLabel}>Mevcut Fiyat:</Text>
                <Text style={styles.currentPriceText}>
                  {parseFloat(product?.price || 0).toLocaleString('tr-TR', {
                    style: 'currency',
                    currency: 'TRY',
                  })}
                </Text>
              </View>

              <View style={styles.priceAlertInputContainer}>
                <Text style={styles.priceAlertInputLabel}>
                  Hedef Fiyat (₺)
                </Text>
                <TextInput
                  style={styles.priceAlertInput}
                  placeholder="Örn: 299.99"
                  placeholderTextColor={COLORS.gray400}
                  keyboardType="decimal-pad"
                  value={priceAlertTargetPrice}
                  onChangeText={setPriceAlertTargetPrice}
                />
                <Text style={styles.priceAlertHint}>
                  Ürün bu fiyata veya altına düştüğünde bildirim alacaksınız
                </Text>
              </View>

              {hasPriceAlert && (
                <View style={styles.priceAlertWarning}>
                  <Ionicons name="information-circle" size={20} color={COLORS.warning} />
                  <Text style={styles.priceAlertWarningText}>
                    Bu ürün için zaten aktif bir fiyat alarmınız var. Yeni alarm oluşturulduğunda eskisi güncellenecektir.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.priceAlertButton}
                onPress={handleCreatePriceAlert}
              >
                <Ionicons name="notifications" size={20} color={COLORS.white} />
                <Text style={styles.priceAlertButtonText}>Fiyat Alarmı Oluştur</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.priceAlertManageButton}
                onPress={() => {
                  setShowPriceAlertModal(false);
                  navigation.navigate('PriceAlerts');
                }}
              >
                <Text style={styles.priceAlertManageButtonText}>
                  Tüm Fiyat Alarmlarımı Görüntüle
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {alert.AlertComponent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  // Deep Link Loading & Error Styles
  deepLinkLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    gap: 16,
  },
  deepLinkLoadingText: {
    fontSize: 16,
    color: COLORS.gray600,
    marginTop: 12,
  },
  deepLinkErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    padding: 24,
    gap: 16,
  },
  deepLinkErrorText: {
    fontSize: 16,
    color: COLORS.gray600,
    textAlign: 'center',
    marginTop: 8,
  },
  deepLinkRetryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  deepLinkRetryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  headerScrollable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiButton: {
    backgroundColor: 'rgba(128, 128, 128, 0.9)',
    shadowColor: '#808080',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    width: width,
    height: 450,
    backgroundColor: COLORS.gray200,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  galleryContainer: {
    backgroundColor: COLORS.backgroundLight,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 8,
    zIndex: 1,
  },
  galleryContent: {
    gap: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailContainerActive: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  content: {
    backgroundColor: COLORS.backgroundLight,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  titleSection: {
    marginBottom: 24,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  productName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 12,
    lineHeight: 32,
  },
  liveViewersContainer: {
    marginBottom: 12,
  },
  liveViewersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    alignSelf: 'flex-start',
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  liveViewersText: {
    fontSize: 13,
    color: COLORS.gray700,
    fontWeight: '500',
  },
  liveViewersCount: {
    fontWeight: '700',
    color: COLORS.error,
  },
  skuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  skuText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  flashPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ef4444', // Kırmızı renk flash indirim için
  },
  oldPriceDetail: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
  },
  flashDiscountBadgeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff5722',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  flashDiscountTextDetail: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  reviews: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  sizeGuide: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sizeGuideContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  colorsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    transform: [{ scale: 1.1 }],
  },
  sizesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  sizeOption: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sizeOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
  },
  sizeCheckmark: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedSizesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  selectedSizesText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  sizeTextSelected: {
    color: COLORS.primary,
  },
  sizeOptionDisabled: {
    backgroundColor: COLORS.gray100,
    opacity: 0.5,
  },
  sizeTextDisabled: {
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
  },
  outOfStockLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: COLORS.gray400,
    transform: [{ rotate: '-15deg' }],
  },
  specsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  specCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  specIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  specLabel: {
    fontSize: 9,
    color: COLORS.gray500,
    marginBottom: 4,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.gray600,
  },
  readMore: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.gray600,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  b2bWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  b2bWarningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  bottomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray100,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    minWidth: 20,
    textAlign: 'center',
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addToCartButtonDisabled: {
    backgroundColor: COLORS.gray300,
    shadowOpacity: 0,
    elevation: 0,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 16,
  },
  addReviewText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reviewModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  reviewModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  ratingContainer: {
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 8,
  },
  commentContainer: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  commentInput: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: 16,
    fontSize: 15,
    color: COLORS.textMain,
    minHeight: 120,
  },
  submitReviewButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitReviewText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  reviewImagesContainer: {
    marginTop: 12,
    flexDirection: 'row',
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  imageUploadContainer: {
    marginBottom: 24,
  },
  imageUploadLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  imageUploadScroll: {
    flexDirection: 'row',
  },
  uploadedImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  uploadedImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
  },
  addImageText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray500,
    marginTop: 4,
  },
  addImageSubtext: {
    fontSize: 10,
    color: COLORS.gray400,
    marginTop: 2,
  },
  zoomIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  salesBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(17, 212, 33, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 2,
  },
  salesIcon: {
    marginRight: 2,
  },
  salesText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageViewerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  imageViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  imageViewerCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCounter: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  imageViewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageViewerBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  imageViewerContent: {
    flex: 1,
  },
  imageViewerSlide: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: width,
    height: '100%',
  },
  imageViewerPagination: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  imageViewerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  imageViewerDotActive: {
    width: 24,
    backgroundColor: COLORS.white,
  },
  // Question Styles
  askQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginBottom: 16,
  },
  askQuestionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
  },
  questionCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    marginBottom: 12,
    position: 'relative',
    zIndex: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  questionUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
    zIndex: 1,
  },
  questionUserInfo: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  questionUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937', // Koyu gri - görünürlük için garantili
    marginBottom: 2,
    position: 'relative',
    zIndex: 2,
  },
  questionDate: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  questionContent: {
    marginBottom: 12,
  },
  questionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  questionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3b82f6',
  },
  questionText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMain,
    fontWeight: '500',
  },
  answerContent: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  answerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  answerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  answerText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.gray600,
    marginBottom: 6,
  },
  answeredBy: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.gray500,
  },
  waitingAnswer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  waitingAnswerText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: COLORS.gray400,
  },
  emptyQuestionsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyQuestionsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray500,
    marginTop: 12,
  },
  emptyQuestionsSubtext: {
    fontSize: 14,
    color: COLORS.gray400,
    marginTop: 4,
  },
  seeAllQuestionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  seeAllQuestionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray400,
  },
  questionModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  questionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  questionModalInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  questionModalInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.gray600,
  },
  questionInputContainer: {
    marginBottom: 20,
  },
  questionInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  questionInput: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: 16,
    fontSize: 15,
    color: COLORS.textMain,
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.gray400,
    textAlign: 'right',
    marginTop: 6,
  },
  submitQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitQuestionButtonDisabled: {
    backgroundColor: COLORS.gray300,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitQuestionText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Chatbot Styles
  chatbotButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  chatbotContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  chatbotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chatbotBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  chatbotHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  chatbotHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatbotHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatbotHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
  },
  chatbotMenuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  chatbotOnlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  chatbotOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  chatbotOnlineText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  chatbotMessages: {
    flex: 1,
  },
  chatbotMessagesContent: {
    padding: 16,
  },
  chatbotMessageWrapper: {
    marginBottom: 16,
  },
  chatbotBotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  chatbotAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  chatbotMessageLabel: {
    fontSize: 12,
    color: COLORS.gray400,
    fontWeight: '600',
  },
  chatbotMessage: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chatbotMessageBot: {
    backgroundColor: COLORS.white,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  chatbotMessageUser: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  chatbotMessageText: {
    fontSize: 14,
    color: COLORS.textMain,
    lineHeight: 20,
  },
  chatbotMessageTextUser: {
    color: COLORS.white,
  },
  chatbotMessageTime: {
    fontSize: 11,
    color: COLORS.gray400,
    textAlign: 'right',
    marginTop: 4,
  },
  chatbotQuickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  chatbotQuickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  chatbotQuickActionPrimary: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: COLORS.primary,
  },
  chatbotQuickActionText: {
    fontSize: 13,
    color: COLORS.textMain,
    fontWeight: '500',
  },
  chatbotQuickActionTextPrimary: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  chatbotQuickActionSupport: {
    backgroundColor: `${COLORS.success}15`,
    borderColor: COLORS.success,
    borderWidth: 1,
  },
  chatbotQuickActionTextSupport: {
    color: COLORS.success,
    fontWeight: '600',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.success,
    borderRadius: 12,
  },
  supportButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  quickRepliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quickReplyButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    marginRight: 8,
    marginBottom: 8,
  },
  quickReplyText: {
    fontSize: 13,
    color: COLORS.textMain,
    fontWeight: '500',
  },
  chatbotProductsContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  chatbotProductsScroll: {
    paddingHorizontal: 4,
    gap: 12,
  },
  chatbotProductCard: {
    width: 160,
    marginRight: 12,
    position: 'relative',
  },
  chatbotAddToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  chatbotAddToCartText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  quickOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  quickOrderButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  chatbotInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  chatbotAttachButton: {
    padding: 4,
  },
  chatbotInput: {
    flex: 1,
    backgroundColor: COLORS.gray50,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textMain,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  chatbotVoiceButton: {
    padding: 4,
  },
  chatbotSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray500,
  },
  // AI Modal Styles
  similarModalContent: {
    gap: 20,
  },
  similarModalText: {
    fontSize: 15,
    color: COLORS.gray600,
    lineHeight: 22,
    textAlign: 'center',
  },
  similarModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  similarModalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    alignItems: 'center',
  },
  similarModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  similarModalActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  similarModalActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  tipsModalContent: {
    gap: 16,
  },
  tipsLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  tipsLoadingText: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: 'center',
  },
  tipsErrorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 12,
  },
  tipsErrorText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
  },
  tipsRetryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  tipsRetryText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  tipsProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  tipIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMain,
    lineHeight: 22,
  },
  aiPoweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  aiPoweredText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  priceAlertModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  priceAlertModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  priceAlertModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  priceAlertModalBody: {
    gap: 20,
  },
  priceAlertProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  priceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  currentPriceText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  priceAlertInputContainer: {
    gap: 8,
  },
  priceAlertInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  priceAlertInput: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textMain,
    backgroundColor: COLORS.white,
  },
  priceAlertHint: {
    fontSize: 12,
    color: COLORS.gray500,
    lineHeight: 16,
  },
  priceAlertWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  priceAlertWarningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning || '#F59E0B',
    lineHeight: 18,
  },
  priceAlertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  priceAlertButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  priceAlertManageButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  priceAlertManageButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

// Size Distribution Modal Styles - Appended
const sizeDistributionStyles = StyleSheet.create({
  sizeDistributionModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    width: '100%',
  },
  sizeDistributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  sizeDistributionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  sizeDistributionSubtitle: {
    fontSize: 13,
    color: COLORS.gray500,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  sizeDistributionList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  sizeDistributionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  sizeDistributionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sizeDistributionBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  sizeDistributionBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sizeDistributionDetails: {
    flex: 1,
  },
  sizeDistributionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  sizeDistributionStock: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  sizeDistributionQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sizeDistributionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeDistributionQuantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    minWidth: 30,
    textAlign: 'center',
  },
  sizeDistributionFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    gap: 16,
  },
  sizeDistributionTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
  },
  sizeDistributionTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  sizeDistributionTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sizeDistributionConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sizeDistributionConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});

// Merge styles
Object.assign(styles, sizeDistributionStyles);
