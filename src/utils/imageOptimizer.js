import React, { useState } from 'react';
import { Image, View, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * Optimize edilmiş görsel prop'ları döndürür
 * @param {string} uri - Görsel URL'i
 * @param {number} width - Genişlik
 * @param {number} height - Yükseklik
 * @returns {object} Image component için optimize edilmiş props
 */
export const optimizedImageProps = (uri, width, height) => ({
  source: {
    uri,
    cache: 'force-cache', // Agresif cache stratejisi
  },
  style: { width, height },
  resizeMode: 'cover',
  // Progressive loading için
  progressiveRenderingEnabled: true,
  // Bellek optimizasyonu
  defaultSource: require('../../assets/icon.png'),
});

/**
 * Lazy loading ile görsel component
 * Görsel yüklenirken loading gösterir ve hata durumunda fallback gösterir
 */
export const LazyImage = ({ 
  uri, 
  style, 
  resizeMode = 'cover',
  defaultSource = require('../../assets/icon.png'),
  ...props 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!uri || error) {
    return (
      <View style={[style, styles.placeholder]}>
        <Image 
          source={defaultSource} 
          style={style}
          resizeMode={resizeMode}
        />
      </View>
    );
  }

  return (
    <View style={style}>
      {loading && (
        <View style={[style, styles.loadingContainer]}>
          <ActivityIndicator size="small" color="#11d421" />
        </View>
      )}
      <Image
        source={{ 
          uri, 
          cache: 'force-cache' // Agresif cache
        }}
        style={[style, { opacity: loading ? 0 : 1 }]}
        resizeMode={resizeMode}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  placeholder: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

/**
 * Görsel URL'ini optimize eder (boyutlandırma parametreleri ekler)
 * @param {string} url - Orijinal görsel URL'i
 * @param {number} width - İstenen genişlik
 * @param {number} height - İstenen yükseklik
 * @param {number} quality - Kalite (1-100, varsayılan: 80)
 * @returns {string} Optimize edilmiş URL
 */
export const optimizeImageUrl = (url, width = 400, height = 400, quality = 80) => {
  if (!url || typeof url !== 'string') {
    return url;
  }

  // Eğer URL zaten optimize edilmişse veya external bir servis ise
  if (url.includes('?') || url.includes('&') || url.includes('cloudinary') || url.includes('imgix')) {
    return url;
  }

  // API endpoint'ine göre optimize et
  // Örnek: /uploads/image.jpg -> /uploads/image.jpg?w=400&h=400&q=80
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${width}&h=${height}&q=${quality}`;
};

