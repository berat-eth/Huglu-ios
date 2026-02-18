import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { COLORS } from '../constants/colors';
import { getApiUrl } from '../config/api.config';

export default function Stories({ stories, onStoryPress }) {
  const [imageErrors, setImageErrors] = useState({});

  if (!stories || stories.length === 0) return null;

  const handleImageError = (storyId) => {
    setImageErrors(prev => ({ ...prev, [storyId]: true }));
  };

  // Slider'daki gibi görselleri önceden normalize et - performans optimizasyonu
  const normalizedStories = useMemo(() => {
    return (stories || []).map((story) => {
      let imageUrl = story.imageUrl || story.image_url || story.image;
      
      // Eğer imageUrl yoksa veya geçersizse null döndür
      if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
        return {
          ...story,
          normalizedImageUrl: null,
        };
      }
      
      imageUrl = imageUrl.trim();
      
      // Test slider gibi tam URL'ler için - olduğu gibi kullan (hiçbir işlem yapma)
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return {
          ...story,
          normalizedImageUrl: imageUrl,
        };
      }
      
      // Base64 görselleri reddet
      if (imageUrl.startsWith('data:')) {
        return {
          ...story,
          normalizedImageUrl: null,
        };
      }
      
      // Relative URL kontrolü - /uploads/ veya / ile başlıyorsa base URL ekle
      if (imageUrl.startsWith('/uploads/') || (imageUrl.startsWith('/') && !imageUrl.startsWith('//'))) {
        // Base URL'i al - sonundaki /api'yi güvenli şekilde kaldır
        let API_BASE_URL = getApiUrl();
        if (API_BASE_URL.endsWith('/api')) {
          API_BASE_URL = API_BASE_URL.slice(0, -4); // Son 4 karakteri (/api) kaldır
        } else if (API_BASE_URL.endsWith('/api/')) {
          API_BASE_URL = API_BASE_URL.slice(0, -5); // Son 5 karakteri (/api/) kaldır
        }
        
        imageUrl = `${API_BASE_URL}${imageUrl}`;
      } else {
        // Geçersiz URL formatı
        imageUrl = null;
      }
      
      return {
        ...story,
        normalizedImageUrl: imageUrl,
      };
    });
  }, [stories]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {normalizedStories.map((story, index) => (
          <TouchableOpacity
            key={story.id ? `story-${story.id}` : `story-index-${index}`}
            style={styles.storyItem}
            onPress={() => onStoryPress(story)}
            activeOpacity={0.8}
          >
            {/* Gradient border simülasyonu - CSS gradient yerine border kullan */}
            <View style={styles.gradientBorder}>
              <View style={styles.imageContainer}>
                {story.normalizedImageUrl && 
                 !imageErrors[story.id] && 
                 story.normalizedImageUrl.startsWith('http') ? ( // Slider'daki gibi sadece HTTP/HTTPS URL'leri kabul et
                  <Image
                    source={{ 
                      uri: story.normalizedImageUrl,
                      cache: 'force-cache' // Görsel cache'leme - slider'daki gibi
                    }}
                    style={styles.storyImage}
                    resizeMode="cover"
                    onError={() => handleImageError(story.id)}
                    defaultSource={require('../../assets/icon.png')}
                  />
                ) : (
                  <View style={styles.storyImagePlaceholder}>
                    <Text style={styles.storyImagePlaceholderText}>📷</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.storyTitle} numberOfLines={1}>
              {story.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  storyItem: {
    alignItems: 'center',
    width: 80,
  },
  gradientBorder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    marginBottom: 6,
    backgroundColor: COLORS.primary, // Gradient yerine solid color
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  storyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: COLORS.lightGray,
  },
  storyImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
  },
  storyImagePlaceholderText: {
    fontSize: 24,
    opacity: 0.5,
  },
  storyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
    textAlign: 'center',
  },
});