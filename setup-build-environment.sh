#!/bin/bash

# Huğlu Outdoor Build Environment Setup Script
# Ubuntu 22.04 için otomatik kurulum scripti
# Root veya sudo ile çalıştırılabilir

set -e

# Renk kodları
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}🚀 Huğlu Outdoor Build Environment Setup${NC}"
echo -e "${BLUE}================================================${NC}"

# Root kontrolü
if [ "$EUID" -eq 0 ]; then 
    echo -e "${YELLOW}⚠️  Root olarak çalışıyorsunuz${NC}"
    SUDO=""
else
    echo -e "${YELLOW}📋 Sudo izinleri gerekebilir${NC}"
    SUDO="sudo"
fi

# 1. Sistem güncellemesi
update_system() {
    echo -e "${YELLOW}📦 Sistem güncelleniyor...${NC}"
    $SUDO apt update
    $SUDO apt upgrade -y
    echo -e "${GREEN}✓ Sistem güncellendi${NC}"
}

# 2. Temel araçları kur
install_basic_tools() {
    echo -e "${YELLOW}🔧 Temel araçlar kuruluyor...${NC}"
    $SUDO apt install -y \
        curl \
        wget \
        git \
        unzip \
        build-essential \
        file \
        apt-transport-https \
        ca-certificates
    echo -e "${GREEN}✓ Temel araçlar kuruldu${NC}"
}

# 3. Node.js kur
install_nodejs() {
    if command -v node &> /dev/null; then
        echo -e "${GREEN}✓ Node.js zaten kurulu: $(node --version)${NC}"
        return
    fi
    
    echo -e "${YELLOW}📦 Node.js 18.x kuruluyor...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | $SUDO -E bash -
    $SUDO apt install -y nodejs
    echo -e "${GREEN}✓ Node.js kuruldu: $(node --version)${NC}"
    echo -e "${GREEN}✓ npm kuruldu: $(npm --version)${NC}"
}

# 4. Java JDK kur
install_java() {
    if command -v java &> /dev/null; then
        echo -e "${GREEN}✓ Java zaten kurulu: $(java -version 2>&1 | head -n 1)${NC}"
        return
    fi
    
    echo -e "${YELLOW}☕ Java JDK 11 kuruluyor...${NC}"
    $SUDO apt install -y openjdk-11-jdk
    echo -e "${GREEN}✓ Java kuruldu: $(java -version 2>&1 | head -n 1)${NC}"
}

# 5. Android Command Line Tools kur
install_android_sdk() {
    ANDROID_HOME="$HOME/Android/Sdk"
    
    if [ -d "$ANDROID_HOME" ]; then
        echo -e "${GREEN}✓ Android SDK zaten kurulu: $ANDROID_HOME${NC}"
    else
        echo -e "${YELLOW}📱 Android SDK kuruluyor...${NC}"
        
        # SDK dizinini oluştur
        mkdir -p "$ANDROID_HOME/cmdline-tools"
        cd "$ANDROID_HOME/cmdline-tools"
        
        # Command line tools indir
        wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
        unzip -q commandlinetools-linux-9477386_latest.zip
        mv cmdline-tools latest
        rm commandlinetools-linux-9477386_latest.zip
        
        echo -e "${GREEN}✓ Android SDK kuruldu${NC}"
    fi
    
    # Environment variables ekle
    if ! grep -q "ANDROID_HOME" "$HOME/.bashrc"; then
        echo -e "${YELLOW}🔧 Environment variables ekleniyor...${NC}"
        cat >> "$HOME/.bashrc" << 'EOF'

# Android SDK
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
EOF
        echo -e "${GREEN}✓ Environment variables eklendi${NC}"
        echo -e "${YELLOW}⚠️  Değişikliklerin aktif olması için: source ~/.bashrc${NC}"
    fi
    
    # Şimdilik export et
    export ANDROID_HOME="$HOME/Android/Sdk"
    export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
    export PATH=$PATH:$ANDROID_HOME/platform-tools
}

# 6. Android SDK bileşenlerini kur
install_android_components() {
    echo -e "${YELLOW}📦 Android SDK bileşenleri kuruluyor...${NC}"
    
    # Lisansları kabul et
    yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses 2>/dev/null || true
    
    # Gerekli bileşenleri kur
    $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager \
        "platform-tools" \
        "platforms;android-33" \
        "build-tools;33.0.0" \
        "emulator" \
        "system-images;android-33;google_apis;x86_64"
    
    echo -e "${GREEN}✓ Android SDK bileşenleri kuruldu${NC}"
}

# 7. Watchman kur (React Native için)
install_watchman() {
    if command -v watchman &> /dev/null; then
        echo -e "${GREEN}✓ Watchman zaten kurulu${NC}"
        return
    fi
    
    echo -e "${YELLOW}👁️  Watchman kuruluyor...${NC}"
    
    cd /tmp
    git clone https://github.com/facebook/watchman.git
    cd watchman
    git checkout v2023.11.20.00
    
    $SUDO apt install -y \
        autoconf \
        automake \
        libtool \
        pkg-config \
        libssl-dev
    
    ./autogen.sh
    ./configure
    make
    $SUDO make install
    
    cd ..
    rm -rf watchman
    
    echo -e "${GREEN}✓ Watchman kuruldu${NC}"
}

# 8. Expo CLI kur
install_expo_cli() {
    echo -e "${YELLOW}🌐 Expo CLI kuruluyor...${NC}"
    npm install -g expo-cli
    echo -e "${GREEN}✓ Expo CLI kuruldu${NC}"
}

# 9. Proje bağımlılıklarını kur
install_project_dependencies() {
    if [ -f "package.json" ]; then
        echo -e "${YELLOW}📦 Proje bağımlılıkları kuruluyor...${NC}"
        npm install
        echo -e "${GREEN}✓ Proje bağımlılıkları kuruldu${NC}"
    else
        echo -e "${YELLOW}⚠️  package.json bulunamadı, proje dizininde değilsiniz${NC}"
    fi
}

# 10. Gradle wrapper izinlerini ayarla
setup_gradle_permissions() {
    if [ -f "android/gradlew" ]; then
        echo -e "${YELLOW}🔧 Gradle izinleri ayarlanıyor...${NC}"
        chmod +x android/gradlew
        echo -e "${GREEN}✓ Gradle izinleri ayarlandı${NC}"
    fi
}

# Kurulum özetini göster
show_summary() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${GREEN}✅ Kurulum Tamamlandı!${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
    echo -e "${YELLOW}Kurulu Araçlar:${NC}"
    echo -e "  • Node.js: $(node --version 2>/dev/null || echo 'Kurulmadı')"
    echo -e "  • npm: $(npm --version 2>/dev/null || echo 'Kurulmadı')"
    echo -e "  • Java: $(java -version 2>&1 | head -n 1 | cut -d'"' -f2 || echo 'Kurulmadı')"
    echo -e "  • Android SDK: ${ANDROID_HOME:-'Kurulmadı'}"
    echo ""
    echo -e "${YELLOW}Sonraki Adımlar:${NC}"
    echo -e "  1. Terminal'i yeniden başlatın veya çalıştırın:"
    echo -e "     ${GREEN}source ~/.bashrc${NC}"
    echo ""
    echo -e "  2. Build script'ini çalıştırın:"
    echo -e "     ${GREEN}chmod +x build-android.sh${NC}"
    echo -e "     ${GREEN}./build-android.sh${NC}"
    echo ""
    echo -e "${BLUE}================================================${NC}"
}

# Ana kurulum fonksiyonu
main() {
    update_system
    install_basic_tools
    install_nodejs
    install_java
    install_android_sdk
    install_android_components
    # install_watchman  # Opsiyonel, uzun sürebilir
    install_expo_cli
    install_project_dependencies
    setup_gradle_permissions
    show_summary
}

# Script'i çalıştır
main
