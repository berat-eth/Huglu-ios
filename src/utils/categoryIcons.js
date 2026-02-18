// Kategori ikonları mapping
const aplıkeIcon = require('../../assets/kategori_icon/aplike.png');
const bandanaIcon = require('../../assets/kategori_icon/bandana.png');
const battaniyeIcon = require('../../assets/kategori_icon/battaniye.png');
const campIcon = require('../../assets/kategori_icon/camp ürünleri.png');
const esofmanIcon = require('../../assets/kategori_icon/esofman.png');
const gomlekIcon = require('../../assets/kategori_icon/gömlek.png');
const hirkaIcon = require('../../assets/kategori_icon/hırka.png');
const hoodieIcon = require('../../assets/kategori_icon/hoodie_4696583.png');
const montIcon = require('../../assets/kategori_icon/mont.png');
const mutfakIcon = require('../../assets/kategori_icon/mutfsk ürünleri.png');
const pantolonIcon = require('../../assets/kategori_icon/pantolon.png');
const bereIcon = require('../../assets/kategori_icon/polar bere.png');
const ruzgarlikIcon = require('../../assets/kategori_icon/rüzgarlık.png');
const sapkaIcon = require('../../assets/kategori_icon/şapka.png');
const silahIcon = require('../../assets/kategori_icon/silah aksuar.png');
const tisortIcon = require('../../assets/kategori_icon/tişört.png');
const yelekIcon = require('../../assets/kategori_icon/waistcoat_6229344.png');
const yagmurlukIcon = require('../../assets/kategori_icon/yağmurluk.png');

export const CATEGORY_ICONS = {
  // Türkçe karakterli isimler
  'Aplike': aplıkeIcon,
  'Bandana': bandanaIcon,
  'Battaniye': battaniyeIcon,
  'Camp Ürünleri': campIcon,
  'Kamp Ürünleri': campIcon,
  'Kamp': campIcon,
  'Esofman': esofmanIcon,
  'Eşofman': esofmanIcon,
  'Gömlek': gomlekIcon,
  'Hırka': hirkaIcon,
  'Hoodie': hoodieIcon,
  'Sweatshirt': hoodieIcon,
  'Mont': montIcon,
  'Mutfak Ürünleri': mutfakIcon,
  'Mutfak': mutfakIcon,
  'Pantolon': pantolonIcon,
  'Polar Bere': bereIcon,
  'Bere': bereIcon,
  'Rüzgarlık': ruzgarlikIcon,
  'Şapka': sapkaIcon,
  'Silah Aksesuar': silahIcon,
  'Silah Aksesuarları': silahIcon,
  'Silah': silahIcon,
  'Tişört': tisortIcon,
  'Tshirt': tisortIcon,
  'Tişort': tisortIcon,
  'T-Shirt': tisortIcon,
  'T-shirt': tisortIcon,
  't-shirt': tisortIcon,
  'Yelek': yelekIcon,
  'Waistcoat': yelekIcon,
  'Yardımcı Giyim': aplıkeIcon,
  'Yardımcı giyim': aplıkeIcon,
  'yardımcı giyim': aplıkeIcon,
  'Yağmurluk': yagmurlukIcon,
  
  // İngilizce ve alternatif isimler
  'aplike': aplıkeIcon,
  'bandana': bandanaIcon,
  'battaniye': battaniyeIcon,
  'camp': campIcon,
  'kamp': campIcon,
  'esofman': esofmanIcon,
  'eşofman': esofmanIcon,
  'gomlek': gomlekIcon,
  'gömlek': gomlekIcon,
  'hirka': hirkaIcon,
  'hırka': hirkaIcon,
  'hoodie': hoodieIcon,
  'sweatshirt': hoodieIcon,
  'mont': montIcon,
  'mutfak': mutfakIcon,
  'pantolon': pantolonIcon,
  'bere': bereIcon,
  'ruzgarlik': ruzgarlikIcon,
  'rüzgarlık': ruzgarlikIcon,
  'sapka': sapkaIcon,
  'şapka': sapkaIcon,
  'silah': silahIcon,
  'tisort': tisortIcon,
  'tişört': tisortIcon,
  'tişort': tisortIcon,
  't-shirt': tisortIcon,
  't-short': tisortIcon,
  'yelek': yelekIcon,
  'yardımcı giyim': aplıkeIcon,
  'yagmurluk': yagmurlukIcon,
  'yağmurluk': yagmurlukIcon,
};

// Kategori için ikon getir (resim varsa resim, yoksa null döner)
export const getCategoryIcon = (categoryName) => {
  if (!categoryName) {
    return null;
  }
  
  // Tam eşleşme ara
  if (CATEGORY_ICONS[categoryName]) {
    return CATEGORY_ICONS[categoryName];
  }
  
  // Büyük/küçük harf duyarsız arama
  const normalizedName = categoryName.toLowerCase().trim();
  const matchedKey = Object.keys(CATEGORY_ICONS).find(
    key => key.toLowerCase().trim() === normalizedName
  );
  
  if (matchedKey) {
    return CATEGORY_ICONS[matchedKey];
  }
  
  // Kısmi eşleşme ara (tire ve boşluk karakterlerini normalize et)
  const normalizedForPartial = normalizedName.replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
  const partialMatch = Object.keys(CATEGORY_ICONS).find(
    key => {
      const keyLower = key.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
      return keyLower.includes(normalizedForPartial) || normalizedForPartial.includes(keyLower);
    }
  );
  
  if (partialMatch) {
    return CATEGORY_ICONS[partialMatch];
  }
  
  return null;
};

// Ionicons fallback isimleri
export const getIoniconName = (categoryName) => {
  const iconMap = {
    'Havlu': 'water-outline',
    'Bornoz': 'shirt-outline',
    'Nevresim': 'bed-outline',
    'Pike': 'snow-outline',
    'Battaniye': 'sunny-outline',
    'Yatak Örtüsü': 'bed-outline',
    'Çarşaf': 'document-outline',
    'Yastık': 'ellipse-outline',
    'Perde': 'albums-outline',
    'Masa Örtüsü': 'square-outline',
    'Peştemal': 'fitness-outline',
    'Plaj Havlusu': 'beach-outline',
    'Mutfak': 'restaurant-outline',
    'Banyo': 'water-outline',
    'Yatak Odası': 'moon-outline',
    'Salon': 'home-outline',
    'Çocuk': 'happy-outline',
    'Aplike': 'star-outline',
    'Bandana': 'ribbon-outline',
    'Camp Ürünleri': 'bonfire-outline',
    'Kamp Ürünleri': 'bonfire-outline',
    'Esofman': 'fitness-outline',
    'Eşofman': 'fitness-outline',
    'Gömlek': 'shirt-outline',
    'Hırka': 'shirt-outline',
    'Hoodie': 'shirt-outline',
    'Sweatshirt': 'shirt-outline',
    'Mont': 'snow-outline',
    'Pantolon': 'fitness-outline',
    'Polar Bere': 'snow-outline',
    'Bere': 'snow-outline',
    'Rüzgarlık': 'cloudy-outline',
    'Şapka': 'sunny-outline',
    'Silah Aksesuar': 'shield-outline',
    'Silah Aksesuarları': 'shield-outline',
    'Tişört': 'shirt-outline',
    'Tshirt': 'shirt-outline',
    'T-Shirt': 'shirt-outline',
    'T-shirt': 'shirt-outline',
    't-shirt': 'shirt-outline',
    'Yelek': 'shirt-outline',
    'Yardımcı Giyim': 'star-outline',
    'Yardımcı giyim': 'star-outline',
    'yardımcı giyim': 'star-outline',
    'Yağmurluk': 'rainy-outline',
  };
  
  return iconMap[categoryName] || 'pricetag-outline';
};

// Kategori için ikon render et (Image veya Ionicons)
export const renderCategoryIcon = (categoryName, size = 24, color = '#11d421', style = {}) => {
  const icon = getCategoryIcon(categoryName);
  
  if (icon) {
    // Resim varsa Image component'i döndür
    return {
      type: 'image',
      source: icon,
      size,
      style,
    };
  }
  
  // Resim yoksa Ionicons ismi döndür
  return {
    type: 'ionicon',
    name: getIoniconName(categoryName),
    size,
    color,
  };
};
