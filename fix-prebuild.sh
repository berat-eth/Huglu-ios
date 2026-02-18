#!/bin/bash

# Prebuild hatalarını düzelt ve bağımlılıkları güncelle

set -e

echo "🔧 Prebuild hataları düzeltiliyor..."

# 1. Node modules ve cache temizle
echo "📦 Temizlik yapılıyor..."
rm -rf node_modules
rm -f package-lock.json
rm -rf android
rm -rf ios
rm -rf .expo

# 2. npm cache temizle
echo "🗑️  npm cache temizleniyor..."
npm cache clean --force

# 3. Bağımlılıkları yeniden yükle
echo "📦 Bağımlılıklar yükleniyor..."
npm install

# 4. Expo doctor çalıştır (opsiyonel)
echo "🔍 Expo doctor kontrol ediliyor..."
npx expo-doctor || true

# 5. Prebuild çalıştır
echo "🔧 Prebuild çalıştırılıyor..."
npx expo prebuild --platform android --clean

echo "✅ Düzeltme tamamlandı!"
echo ""
echo "Şimdi build yapabilirsiniz:"
echo "  ./build-android.sh"
