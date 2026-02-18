#!/bin/bash

# Expo Gradle Build Hatası Düzeltme Scripti
# Expo SDK 51 için Gradle uyumsuzluk sorunlarını çözer

set -e

echo "🔧 Expo Gradle Build Hatası Düzeltiliyor..."
echo "================================================"

# Renk kodları
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. node_modules ve cache temizle
echo -e "${YELLOW}[1/7] node_modules ve cache temizleniyor...${NC}"
rm -rf node_modules
rm -rf .expo
rm -rf android
rm -rf ios
rm -rf ~/.gradle/caches
rm -rf ~/.expo/cache
npm cache clean --force
echo -e "${GREEN}✓ Temizlik tamamlandı${NC}"

# 2. package-lock.json'ı yeniden oluştur
echo -e "${YELLOW}[2/7] package-lock.json yeniden oluşturuluyor...${NC}"
rm -f package-lock.json
npm install --package-lock-only
echo -e "${GREEN}✓ package-lock.json oluşturuldu${NC}"

# 3. Bağımlılıkları yükle
echo -e "${YELLOW}[3/7] Bağımlılıklar yükleniyor...${NC}"
npm install --legacy-peer-deps
echo -e "${GREEN}✓ Bağımlılıklar yüklendi${NC}"

# 4. Expo prebuild (temiz)
echo -e "${YELLOW}[4/7] Expo prebuild çalıştırılıyor...${NC}"
npx expo prebuild --platform android --clean
echo -e "${GREEN}✓ Prebuild tamamlandı${NC}"

# 5. Android Gradle Plugin ve Gradle versiyonlarını düzelt
echo -e "${YELLOW}[5/7] Gradle konfigürasyonu düzeltiliyor...${NC}"

if [ -f "android/build.gradle" ]; then
    # Android Gradle Plugin versiyonunu Expo SDK 51 için güncelle (8.3.0 veya üzeri)
    if ! grep -q "com.android.tools.build:gradle:8.3" android/build.gradle; then
        echo -e "${YELLOW}Android Gradle Plugin versiyonu güncelleniyor...${NC}"
        # build.gradle dosyasındaki dependencies bloğunu bul ve güncelle
        sed -i 's/com.android.tools.build:gradle:[0-9.]*/com.android.tools.build:gradle:8.3.0/g' android/build.gradle
    fi
    
    # Gradle wrapper versiyonunu kontrol et ve güncelle (8.8 veya üzeri)
    if [ -f "android/gradle/wrapper/gradle-wrapper.properties" ]; then
        if ! grep -q "gradle-8.8" android/gradle/wrapper/gradle-wrapper.properties; then
            echo -e "${YELLOW}Gradle wrapper versiyonu güncelleniyor...${NC}"
            sed -i 's/distributionUrl=.*/distributionUrl=https\\:\\/\\/services.gradle.org\\/distributions\\/gradle-8.8-bin.zip/g' android/gradle/wrapper/gradle-wrapper.properties
        fi
    fi
    
    # gradle.properties dosyasını kontrol et ve oluştur/güncelle
    if [ ! -f "android/gradle.properties" ]; then
        echo -e "${YELLOW}gradle.properties oluşturuluyor...${NC}"
        mkdir -p android
    fi
    
    # gradle.properties içeriğini güncelle
    cat > android/gradle.properties << 'EOF'
# Project-wide Gradle settings.
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
android.defaults.buildfeatures.buildconfig=true
android.nonTransitiveRClass=false
android.nonFinalResIds=false
# Expo için gerekli ayarlar
expo.autolinking=true
# Hermes JavaScript Engine
hermesEnabled=true
EOF
    
    # settings.gradle dosyasını kontrol et
    if [ -f "android/settings.gradle" ]; then
        # Expo modül plugin'inin doğru şekilde yüklendiğinden emin ol
        if ! grep -q "expo-modules-core" android/settings.gradle; then
            echo -e "${YELLOW}settings.gradle kontrol ediliyor...${NC}"
            # settings.gradle dosyası Expo prebuild tarafından oluşturulmalı
            # Eğer eksikse, prebuild tekrar çalıştırılmalı
        fi
    fi
fi

echo -e "${GREEN}✓ Gradle konfigürasyonu düzeltildi${NC}"

# 6. Gradle wrapper'ı güncelle ve izinleri ayarla
echo -e "${YELLOW}[6/7] Gradle wrapper güncelleniyor...${NC}"
if [ -f "android/gradlew" ]; then
    cd android
    chmod +x gradlew
    ./gradlew wrapper --gradle-version 8.8 --distribution-type bin || true
    cd ..
    echo -e "${GREEN}✓ Gradle wrapper güncellendi${NC}"
else
    echo -e "${YELLOW}⚠️  Gradle wrapper bulunamadı, prebuild tekrar çalıştırılmalı${NC}"
fi

# 7. Expo modül plugin'ini kontrol et
echo -e "${YELLOW}[7/7] Expo modül plugin'i kontrol ediliyor...${NC}"
if [ -d "node_modules/expo-modules-core" ]; then
    echo -e "${GREEN}✓ expo-modules-core bulundu${NC}"
    
    # expo-modules-core/android klasörünü kontrol et
    if [ -d "node_modules/expo-modules-core/android" ]; then
        echo -e "${GREEN}✓ expo-modules-core/android bulundu${NC}"
    else
        echo -e "${YELLOW}⚠️  expo-modules-core/android bulunamadı, npm install tekrar çalıştırılmalı${NC}"
    fi
else
    echo -e "${RED}❌ expo-modules-core bulunamadı!${NC}"
    echo -e "${YELLOW}npm install tekrar çalıştırılıyor...${NC}"
    npm install expo-modules-core
fi

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Düzeltme işlemi tamamlandı!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "${BLUE}Şimdi build işlemini tekrar deneyin:${NC}"
echo -e "${YELLOW}cd android && ./gradlew clean && ./gradlew assembleRelease${NC}"
echo -e "${BLUE}Veya build scriptini kullanın:${NC}"
echo -e "${YELLOW}bash build-android.sh${NC}"

