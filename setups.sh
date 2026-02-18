#!/bin/bash

# ========================================
# Android SDK ve APK Build Ortamı Kurulum Scripti
# Debian 11 Bullseye Optimized
# ========================================

set -e

# --------------------------
# Renkler
# --------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --------------------------
# Değişkenler
# --------------------------
# APK Build Değişkenleri
ANDROID_DIR="/root/final_versiyonn/android"
APK_OUTPUT_DIR="/root/apk-builds"
JAVA_VERSION="17"
ANDROID_SDK_ROOT="/opt/android-sdk"
ANDROID_HOME="/opt/android-sdk"

# --------------------------
# Root kontrolü
# --------------------------
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Bu script root olarak çalıştırılmalıdır!${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Android SDK ve APK Build Ortamı Kurulumu${NC}"
echo -e "${BLUE}Debian 11 Bullseye için hazırlanmıştır${NC}"
echo -e "${BLUE}========================================${NC}"

# --------------------------
# Sistem güncelleme ve temel paketler
# --------------------------
echo -e "${BLUE}[1/5] Sistem güncelleniyor ve temel paketler kuruluyor...${NC}"
apt update -y && apt upgrade -y

# APK build için gerekli temel paketler
apt install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release \
    apt-transport-https \
    software-properties-common \
    unzip \
    zip

# --------------------------
# Java 17 Kurulumu (APK build için)
# --------------------------
echo -e "${BLUE}[2/5] Java 17 kuruluyor (APK build için)...${NC}"
if ! java -version 2>&1 | grep -q "version \"17"; then
    wget -O- https://apt.corretto.aws/corretto.key | apt-key add -
    add-apt-repository 'deb https://apt.corretto.aws stable main'
    apt update -y
    apt install -y java-17-amazon-corretto-jdk
fi

export JAVA_HOME=/usr/lib/jvm/java-17-amazon-corretto
export PATH=$JAVA_HOME/bin:$PATH
echo "export JAVA_HOME=/usr/lib/jvm/java-17-amazon-corretto" >> /root/.bashrc
echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> /root/.bashrc

java -version

# --------------------------
# Android SDK ve Build Tools Kurulumu
# --------------------------
echo -e "${BLUE}[3/5] Android SDK ve build tools kuruluyor...${NC}"
mkdir -p $ANDROID_SDK_ROOT
cd /tmp

if [ ! -f "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" ]; then
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
    unzip -q commandlinetools-linux-9477386_latest.zip -d $ANDROID_SDK_ROOT
    mkdir -p $ANDROID_SDK_ROOT/cmdline-tools/latest
    mv $ANDROID_SDK_ROOT/cmdline-tools/{bin,lib,NOTICE.txt,source.properties} $ANDROID_SDK_ROOT/cmdline-tools/latest/ 2>/dev/null || true
    rm -f commandlinetools-linux-9477386_latest.zip
fi

export ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT
export ANDROID_HOME=$ANDROID_HOME
export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools

# .bashrc'ye ekle
echo "export ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT" >> /root/.bashrc
echo "export ANDROID_HOME=$ANDROID_HOME" >> /root/.bashrc
echo "export PATH=\$PATH:\$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:\$ANDROID_SDK_ROOT/platform-tools" >> /root/.bashrc

# /etc/environment'a da ekle (tüm kullanıcılar için)
if ! grep -q "ANDROID_SDK_ROOT" /etc/environment; then
    echo "ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT" >> /etc/environment
    echo "ANDROID_HOME=$ANDROID_HOME" >> /etc/environment
fi

# Değişkenlerin doğru set edildiğini kontrol et
echo -e "${YELLOW}Android SDK değişkenleri kontrol ediliyor...${NC}"
echo -e "  ANDROID_SDK_ROOT: $ANDROID_SDK_ROOT"
echo -e "  ANDROID_HOME: $ANDROID_HOME"

# SDK paketlerini yükle
yes | sdkmanager --licenses || true
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" "ndk;25.2.9519653"

# --------------------------
# Gradle Kurulumu
# --------------------------
echo -e "${BLUE}[4/5] Gradle kuruluyor...${NC}"
if ! command -v gradle &> /dev/null; then
    GRADLE_VERSION="8.5"
    wget -q https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip -P /tmp
    unzip -q /tmp/gradle-${GRADLE_VERSION}-bin.zip -d /opt
    ln -sf /opt/gradle-${GRADLE_VERSION}/bin/gradle /usr/bin/gradle
    rm /tmp/gradle-${GRADLE_VERSION}-bin.zip
fi

gradle --version

# --------------------------
# Node.js Kurulumu (APK build için gerekli - React Native/Flutter)
# --------------------------
echo -e "${BLUE}[5/5] Node.js kuruluyor (APK build için)...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

npm install -g npm@latest

node --version
npm --version

# --------------------------
# APK Build İşlemi
# --------------------------
echo -e "${BLUE}APK Build işlemi başlatılıyor...${NC}"

# ANDROID_HOME ve ANDROID_SDK_ROOT'un set edildiğinden emin ol
export ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT
export ANDROID_HOME=$ANDROID_HOME
export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools

# Değişkenlerin doğru set edildiğini kontrol et
if [ -z "$ANDROID_HOME" ] || [ -z "$ANDROID_SDK_ROOT" ]; then
    echo -e "${RED}❌ ANDROID_HOME veya ANDROID_SDK_ROOT tanımlı değil!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ ANDROID_HOME: $ANDROID_HOME${NC}"
echo -e "${GREEN}✅ ANDROID_SDK_ROOT: $ANDROID_SDK_ROOT${NC}"

mkdir -p $APK_OUTPUT_DIR

if [ -d "$ANDROID_DIR" ]; then
    cd $ANDROID_DIR
    
    echo -e "${YELLOW}Dependencies yükleniyor...${NC}"
    if [ -f "package.json" ]; then
        npm install
    fi
    
    # React Native için
    if [ -f "android/gradlew" ]; then
        chmod +x android/gradlew
        cd android
        
        # ANDROID_HOME'u gradle için export et
        export ANDROID_HOME=$ANDROID_HOME
        export ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT
        
        echo -e "${YELLOW}Gradle dependencies indiriliyor...${NC}"
        ANDROID_HOME=$ANDROID_HOME ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT ./gradlew clean
        
        echo -e "${YELLOW}Release APK build ediliyor...${NC}"
        ANDROID_HOME=$ANDROID_HOME ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT ./gradlew assembleRelease
        
        # APK'yı kopyala
        if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
            BUILD_DATE=$(date +"%Y%m%d_%H%M%S")
            cp app/build/outputs/apk/release/app-release.apk $APK_OUTPUT_DIR/huglu-${BUILD_DATE}.apk
            echo -e "${GREEN}✅ APK başarıyla build edildi: $APK_OUTPUT_DIR/huglu-${BUILD_DATE}.apk${NC}"
        else
            echo -e "${RED}❌ APK build edilemedi!${NC}"
        fi
        
    # Flutter için
    elif [ -f "pubspec.yaml" ]; then
        if ! command -v flutter &> /dev/null; then
            echo -e "${YELLOW}Flutter kuruluyor...${NC}"
            git clone https://github.com/flutter/flutter.git -b stable /opt/flutter
            export PATH="$PATH:/opt/flutter/bin"
            echo "export PATH=\$PATH:/opt/flutter/bin" >> /root/.bashrc
            flutter doctor
        fi
        
        flutter pub get
        flutter build apk --release
        
        if [ -f "build/app/outputs/flutter-apk/app-release.apk" ]; then
            BUILD_DATE=$(date +"%Y%m%d_%H%M%S")
            cp build/app/outputs/flutter-apk/app-release.apk $APK_OUTPUT_DIR/huglu-${BUILD_DATE}.apk
            echo -e "${GREEN}✅ APK başarıyla build edildi: $APK_OUTPUT_DIR/huglu-${BUILD_DATE}.apk${NC}"
        fi
    else
        echo -e "${RED}❌ Android proje yapısı bulunamadı!${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Android dizini bulunamadı: $ANDROID_DIR${NC}"
    echo -e "${YELLOW}APK build atlanıyor...${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}SDK ve Build Ortamı Kurulumu Tamamlandı!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}Kurulu Bileşenler:${NC}"
echo -e "  ✅ Java 17 (Amazon Corretto)"
echo -e "  ✅ Android SDK (Platform 34, Build Tools 34.0.0, NDK 25.2.9519653)"
echo -e "  ✅ Gradle 8.5"
echo -e "  ✅ Node.js $(node --version)"
echo -e "  ✅ npm $(npm --version)"
echo -e ""
echo -e "${BLUE}Environment Variables:${NC}"
echo -e "  ✅ ANDROID_HOME=$ANDROID_HOME"
echo -e "  ✅ ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"
echo -e "  ✅ JAVA_HOME=$JAVA_HOME"
echo -e ""
echo -e "${YELLOW}Not: Yeni bir shell açtığınızda environment değişkenleri otomatik yüklenecektir.${NC}"
echo -e "${YELLOW}Mevcut shell'de kullanmak için: source /root/.bashrc${NC}"
echo -e "${BLUE}========================================${NC}"
