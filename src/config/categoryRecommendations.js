/**
 * Kategori Bazlı Ürün Önerileri Eşleştirme Tablosu
 * 
 * Her kategori için tamamlayıcı/uyumlu kategoriler tanımlanmıştır.
 * API'den gelen gerçek kategori isimlerine göre düzenlenmiştir.
 */

export const CATEGORY_RECOMMENDATIONS = {
  // ============================================
  // ÜST GİYİM
  // ============================================
  'Tişört': {
    recommendations: ['Pantolon', 'Şapka', 'Bandana', 'Yelek'],
    reason: 'Tişört ile uyumlu',
    priority: 1,
  },
  'Tshirt': {
    recommendations: ['Pantolon', 'Şapka', 'Bandana', 'Yelek'],
    reason: 'Tişört ile uyumlu',
    priority: 1,
  },
  'Tişort': {
    recommendations: ['Pantolon', 'Şapka', 'Bandana', 'Yelek'],
    reason: 'Tişört ile uyumlu',
    priority: 1,
  },
  
  'Gömlek': {
    recommendations: ['Pantolon', 'Yelek', 'Şapka'],
    reason: 'Gömlek ile uyumlu',
    priority: 1,
  },
  
  'Hoodie': {
    recommendations: ['Pantolon', 'Esofman', 'Şapka', 'Polar Bere'],
    reason: 'Hoodie ile uyumlu',
    priority: 1,
  },
  'Sweatshirt': {
    recommendations: ['Pantolon', 'Esofman', 'Şapka', 'Polar Bere'],
    reason: 'Sweatshirt ile uyumlu',
    priority: 1,
  },
  
  'Mont': {
    recommendations: ['Pantolon', 'Polar Bere', 'Şapka', 'Rüzgarlık'],
    reason: 'Mont ile uyumlu',
    priority: 1,
  },
  
  'Hırka': {
    recommendations: ['Tişört', 'Pantolon', 'Gömlek'],
    reason: 'Hırka ile uyumlu',
    priority: 1,
  },
  
  'Yelek': {
    recommendations: ['Tişört', 'Gömlek', 'Pantolon', 'Silah Aksesuar'],
    reason: 'Yelek ile uyumlu',
    priority: 1,
  },
  'Waistcoat': {
    recommendations: ['Tişört', 'Gömlek', 'Pantolon', 'Silah Aksesuar'],
    reason: 'Yelek ile uyumlu',
    priority: 1,
  },
  
  // ============================================
  // ALT GİYİM
  // ============================================
  'Pantolon': {
    recommendations: ['Tişört', 'Gömlek', 'Mont', 'Yelek', 'Hoodie'],
    reason: 'Pantolon ile uyumlu',
    priority: 1,
  },
  
  'Esofman': {
    recommendations: ['Tişört', 'Hoodie', 'Sweatshirt'],
    reason: 'Esofman ile uyumlu',
    priority: 1,
  },
  
  // ============================================
  // DIŞ GİYİM
  // ============================================
  'Yağmurluk': {
    recommendations: ['Pantolon', 'Şapka', 'Camp Ürünleri'],
    reason: 'Yağmurluk ile uyumlu',
    priority: 1,
  },
  
  'Rüzgarlık': {
    recommendations: ['Tişört', 'Pantolon', 'Şapka', 'Mont'],
    reason: 'Rüzgarlık ile uyumlu',
    priority: 1,
  },
  
  // ============================================
  // AKSESUAR
  // ============================================
  'Şapka': {
    recommendations: ['Tişört', 'Gömlek', 'Mont', 'Yağmurluk'],
    reason: 'Şapka ile uyumlu',
    priority: 2,
  },
  
  'Polar Bere': {
    recommendations: ['Mont', 'Hoodie', 'Sweatshirt'],
    reason: 'Polar Bere ile uyumlu',
    priority: 2,
  },
  'Bere': {
    recommendations: ['Mont', 'Hoodie', 'Sweatshirt'],
    reason: 'Bere ile uyumlu',
    priority: 2,
  },
  
  'Bandana': {
    recommendations: ['Tişört', 'Şapka', 'Camp Ürünleri'],
    reason: 'Bandana ile uyumlu',
    priority: 2,
  },
  
  // ============================================
  // ÖZEL KATEGORİLER
  // ============================================
  'Camp Ürünleri': {
    recommendations: ['Mont', 'Yağmurluk', 'Rüzgarlık', 'Pantolon', 'Bandana'],
    reason: 'Kamp için uygun',
    priority: 1,
  },
  'Kamp Ürünleri': {
    recommendations: ['Mont', 'Yağmurluk', 'Rüzgarlık', 'Pantolon', 'Bandana'],
    reason: 'Kamp için uygun',
    priority: 1,
  },
  'Kamp': {
    recommendations: ['Mont', 'Yağmurluk', 'Rüzgarlık', 'Pantolon', 'Bandana'],
    reason: 'Kamp için uygun',
    priority: 1,
  },
  
  'Silah Aksesuar': {
    recommendations: ['Yelek', 'Pantolon', 'Camp Ürünleri'],
    reason: 'Silah aksesuarı ile uyumlu',
    priority: 1,
  },
  'Silah Aksesuarları': {
    recommendations: ['Yelek', 'Pantolon', 'Camp Ürünleri'],
    reason: 'Silah aksesuarı ile uyumlu',
    priority: 1,
  },
  'Silah': {
    recommendations: ['Yelek', 'Pantolon', 'Camp Ürünleri'],
    reason: 'Silah aksesuarı ile uyumlu',
    priority: 1,
  },
  
  'Aplike': {
    recommendations: ['Tişört', 'Gömlek', 'Şapka', 'Yelek'],
    reason: 'Aplike için uygun',
    priority: 2,
  },
  
  // ============================================
  // EV TEKSTİLİ
  // ============================================
  'Battaniye': {
    recommendations: ['Mutfak Ürünleri'],
    reason: 'Ev tekstili',
    priority: 3,
  },
  
  'Mutfak Ürünleri': {
    recommendations: ['Battaniye'],
    reason: 'Ev tekstili',
    priority: 3,
  },
  'Mutfak': {
    recommendations: ['Battaniye'],
    reason: 'Ev tekstili',
    priority: 3,
  },
};

/**
 * Kategori için önerilen kategorileri getir
 * @param {string} categoryName - Mevcut ürünün kategorisi
 * @returns {Object} - Önerilen kategoriler ve bilgiler
 */
export const getCategoryRecommendations = (categoryName) => {
  if (!categoryName) {
    return {
      recommendations: [],
      reason: '',
      priority: 0,
    };
  }
  
  // Tam eşleşme ara
  if (CATEGORY_RECOMMENDATIONS[categoryName]) {
    return CATEGORY_RECOMMENDATIONS[categoryName];
  }
  
  // Büyük/küçük harf duyarsız arama
  const normalizedName = categoryName.toLowerCase().trim();
  const matchedKey = Object.keys(CATEGORY_RECOMMENDATIONS).find(
    key => key.toLowerCase().trim() === normalizedName
  );
  
  if (matchedKey) {
    return CATEGORY_RECOMMENDATIONS[matchedKey];
  }
  
  // Kısmi eşleşme ara
  const partialMatch = Object.keys(CATEGORY_RECOMMENDATIONS).find(
    key => {
      const keyLower = key.toLowerCase().trim();
      return keyLower.includes(normalizedName) || normalizedName.includes(keyLower);
    }
  );
  
  if (partialMatch) {
    return CATEGORY_RECOMMENDATIONS[partialMatch];
  }
  
  // Eşleşme bulunamazsa boş döndür
  return {
    recommendations: [],
    reason: '',
    priority: 0,
  };
};

/**
 * Tüm kategori eşleştirmelerini getir
 * @returns {Object} - Tüm eşleştirme tablosu
 */
export const getAllCategoryRecommendations = () => {
  return CATEGORY_RECOMMENDATIONS;
};

/**
 * Kategori eşleştirmesi var mı kontrol et
 * @param {string} categoryName - Kontrol edilecek kategori
 * @returns {boolean} - Eşleştirme var mı?
 */
export const hasCategoryRecommendations = (categoryName) => {
  const result = getCategoryRecommendations(categoryName);
  return result.recommendations.length > 0;
};
