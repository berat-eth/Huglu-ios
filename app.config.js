/**
 * Expo Configuration
 * API key ve diğer hassas bilgiler environment variable'lardan alınır
 */

// GÜVENLİK: .env dosyasını yükle (expo-constants içindeki dotenv kullanılır)
// Expo otomatik olarak .env dosyasını okur, ancak manuel yükleme de yapılabilir
try {
  // @expo/env paketi otomatik olarak .env dosyasını okur
  // Ancak manuel kontrol için:
  if (process.env.NODE_ENV !== 'production') {
    // Development'ta .env dosyası kontrolü
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      console.log('✅ .env dosyası bulundu');
    }
  }
} catch (error) {
  console.warn('⚠️ .env dosyası kontrolü başarısız:', error.message);
}

module.exports = {
  expo: {
    name: "Huğlu Outdoor",
    slug: "huglu-outdoor-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/iconns.png",
    userInterfaceStyle: "automatic",
    scheme: "hugluoutdoor",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "cover",
      backgroundColor: "#FFFFFF"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.berqt.hugluoutdoor",
      infoPlist: {
        NSMicrophoneUsageDescription: "Bu uygulama sesli arama özelliği için mikrofon erişimine ihtiyaç duyar.",
        NSSpeechRecognitionUsageDescription: "Bu uygulama sesli arama özelliği için ses tanıma erişimine ihtiyaç duyar.",
        NSLocationWhenInUseUsageDescription: "Bu uygulama size en yakın mağazaları göstermek ve pusula özelliğini kullanmak için konum bilginize ihtiyaç duyar.",
        NSMotionUsageDescription: "Bu uygulama pusula özelliği için cihaz sensörlerine erişim gerektirir.",
        NFCReaderUsageDescription: "Bu uygulama temassız kredi kartı ödemesi için NFC okuma özelliğini kullanır."
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY"
      },
      associatedDomains: ["applinks:huglutekstil.com"]
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/iconns.png",
        backgroundColor: "#11d421"
      },
      package: "com.berqt.hugluoutdoor",
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.NFC",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.CAMERA"
      ],
      blockedPermissions: [
        "android.permission.DETECT_SCREEN_CAPTURE"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY"
        }
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "hugluoutdoor"
            },
            {
              scheme: "https",
              host: "huglutekstil.com",
              pathPrefix: "/urunler"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-font"
    ],
    // GÜVENLİK: API key environment variable'dan alınır
    // Build zamanında EXPO_PUBLIC_API_KEY environment variable'ı set edilmeli
    extra: {
      apiKey: process.env.EXPO_PUBLIC_API_KEY || process.env.API_KEY || null,
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://api.huglutekstil.com/api"
    }
  }
};
