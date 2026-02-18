#!/bin/bash

# ========================================
# Huglu Full Stack Deployment Script
# SDK Tools Disabled - Only Project Dependencies
# Debian 11 Bullseye Optimized
# Interactive Menu System
# PORT & NGINX CONFLICT FIXED
# ========================================

set -eE
set -o pipefail

# --------------------------
# Colors
# --------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# --------------------------
# Git fallback (rollback) helpers
# --------------------------
# Purpose: If a repo update/build step fails, rollback the repo to the commit
# that was checked out when the step started ("önceki commit" in the sense of
# "script başlamadan önceki durum").
#
# Toggle:
# - Export NO_SDK_GIT_FALLBACK=0 to disable.
# - Export NO_SDK_GIT_FALLBACK_STASH=0 to avoid stashing dirty changes.
NO_SDK_GIT_FALLBACK="${NO_SDK_GIT_FALLBACK:-1}"
NO_SDK_GIT_FALLBACK_STASH="${NO_SDK_GIT_FALLBACK_STASH:-1}"

_GIT_FALLBACK_ACTIVE=0
_GIT_FALLBACK_REPO_DIR=""
_GIT_FALLBACK_START_COMMIT=""
_GIT_FALLBACK_STASH_REF=""

_git_fallback__in_git_repo() {
    git rev-parse --is-inside-work-tree >/dev/null 2>&1
}

_git_fallback_begin() {
    local repo_dir="$1"
    local prev_dir=""

    # Disabled by env
    if [ "${NO_SDK_GIT_FALLBACK}" != "1" ]; then
        return 0
    fi

    if [ -z "${repo_dir}" ] || [ ! -d "${repo_dir}" ]; then
        return 0
    fi

    # Prevent nested activation
    if [ "${_GIT_FALLBACK_ACTIVE}" = "1" ]; then
        return 0
    fi

    prev_dir="$(pwd)"
    cd "${repo_dir}" || return 0

    if ! _git_fallback__in_git_repo; then
        cd "${prev_dir}" || true
        return 0
    fi

    _GIT_FALLBACK_REPO_DIR="${repo_dir}"
    _GIT_FALLBACK_START_COMMIT="$(git rev-parse HEAD 2>/dev/null || true)"

    # If repo is dirty, stash so we can restore it after rollback/success.
    if [ "${NO_SDK_GIT_FALLBACK_STASH}" = "1" ]; then
        if ! git diff --quiet >/dev/null 2>&1 || ! git diff --cached --quiet >/dev/null 2>&1; then
            _GIT_FALLBACK_STASH_REF="$(git stash push -u -m "no_sdk_setups.sh auto-stash $(date +%Y%m%d_%H%M%S)" 2>/dev/null || true)"
        fi
    fi

    _GIT_FALLBACK_ACTIVE=1

    # Rollback on any error inside functions/pipefail.
    trap '_git_fallback_rollback $LINENO' ERR

    cd "${prev_dir}" || true
}

_git_fallback_end() {
    # Disabled or not active: nothing to do
    if [ "${NO_SDK_GIT_FALLBACK}" != "1" ] || [ "${_GIT_FALLBACK_ACTIVE}" != "1" ]; then
        return 0
    fi

    local repo_dir="${_GIT_FALLBACK_REPO_DIR}"
    local prev_dir=""

    # Clear rollback trap first (success path)
    trap - ERR

    prev_dir="$(pwd)"
    cd "${repo_dir}" >/dev/null 2>&1 || return 0

    # If we created an auto-stash, restore it back on success.
    if [ "${NO_SDK_GIT_FALLBACK_STASH}" = "1" ]; then
        if git stash list | grep -q "no_sdk_setups.sh auto-stash" 2>/dev/null; then
            git stash pop >/dev/null 2>&1 || true
        fi
    fi

    cd "${prev_dir}" || true

    # Reset state
    _GIT_FALLBACK_ACTIVE=0
    _GIT_FALLBACK_REPO_DIR=""
    _GIT_FALLBACK_START_COMMIT=""
    _GIT_FALLBACK_STASH_REF=""
}

_git_fallback_rollback() {
    local line_no="${1:-unknown}"
    local prev_dir=""

    # Avoid recursion
    trap - ERR

    if [ "${NO_SDK_GIT_FALLBACK}" != "1" ] || [ "${_GIT_FALLBACK_ACTIVE}" != "1" ]; then
        echo -e "${RED}❌ Hata oluştu (satır: ${line_no}).${NC}"
        exit 1
    fi

    local repo_dir="${_GIT_FALLBACK_REPO_DIR}"
    local start_commit="${_GIT_FALLBACK_START_COMMIT}"

    echo -e "${RED}❌ Hata oluştu (satır: ${line_no}). Repo geri alınıyor...${NC}"
    echo -e "${YELLOW}↩️  Rollback hedefi: ${repo_dir} @ ${start_commit}${NC}"

    prev_dir="$(pwd)"
    cd "${repo_dir}" >/dev/null 2>&1 || exit 1

    if _git_fallback__in_git_repo && [ -n "${start_commit}" ]; then
        git reset --hard "${start_commit}" >/dev/null 2>&1 || true
        git clean -fd >/dev/null 2>&1 || true
    fi

    # Restore any auto-stashed changes back after rollback.
    if [ "${NO_SDK_GIT_FALLBACK_STASH}" = "1" ]; then
        if git stash list | grep -q "no_sdk_setups.sh auto-stash" 2>/dev/null; then
            git stash pop >/dev/null 2>&1 || true
        fi
    fi

    cd "${prev_dir}" || true

    echo -e "${GREEN}✅ Rollback tamamlandı.${NC}"
    exit 1
}

# --------------------------
# Variables
# --------------------------
# Main Site
MAIN_DOMAIN="huglutekstil.com"
MAIN_DIR="/root/huglu_2/web"
MAIN_PORT=3006
MAIN_PM2_NAME="huglu-web"

# API
API_DOMAIN="api.huglutekstil.com"
API_DIR="/root/huglu_2/server"
API_PORT=3000
API_PM2_NAME="huglu-api"

# Admin Panel
ADMIN_DOMAIN="admin.huglutekstil.com"
ADMIN_DIR="/root/huglu_2/admin-panel"
ADMIN_PORT=3001
ADMIN_PM2_NAME="admin-panel"

# Redis
REDIS_PORT=6379
REDIS_MAXMEMORY="256mb"
REDIS_MAXMEMORY_POLICY="allkeys-lru"

EMAIL="berat@beratsimsek.com.tr"

ERRORS=0
WARNINGS=0
SKIP_ADMIN=false
SKIP_MAIN=false

# --------------------------
# Root Check
# --------------------------
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}This script must be run as root!${NC}"
    exit 1
fi

# --------------------------
# Helper Functions
# --------------------------
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_menu() {
    clear
    print_header "Huglu Tekstil Dağıtım Yöneticisi"
    echo -e "${GREEN}Debian 11 Bullseye Optimize Edilmiş${NC}"
    echo ""
    echo -e "${YELLOW}Ana Menü:${NC}"
    echo -e "  ${CYAN}1)${NC} Tam Kurulum (Tüm Servisler)"
    echo -e "  ${CYAN}2)${NC} Sadece Temel Servisleri Kur (Web, API, Admin)"
    echo -e "  ${CYAN}3)${NC} Tüm Servisleri Yeniden Başlat"
    echo -e "  ${CYAN}4)${NC} Sistem Durumunu Görüntüle"
    echo -e "  ${CYAN}5)${NC} Yazılım Güncellemelerini Dağıt (Deploy)"
    echo -e "  ${CYAN}6)${NC} Git Versiyon Yönetimi (Rollback)"
    echo -e "  ${CYAN}7)${NC} Uygulamayı Derle (Android APK)"
    echo -e "  ${CYAN}8)${NC} Çıkış"
    echo ""
}

pause_screen() {
    echo ""
    read -p "Devam etmek için Enter'a basın..."
}

# --------------------------
# Port Check Function
# --------------------------
check_port_usage() {
    local port=$1
    local service_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}  Port $port zaten kullanımda ($service_name için)${NC}"
        local pid=$(lsof -Pi :$port -sTCP:LISTEN -t)
        local process=$(ps -p $pid -o comm=)
        echo -e "${YELLOW}   Process: $process (PID: $pid)${NC}"
        
        read -p "Bu portu kullanan servisi durdurmak ister misiniz? [e/H]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ee]$ ]]; then
            kill -9 $pid 2>/dev/null || true
            echo -e "${GREEN} Port $port temizlendi${NC}"
            return 0
        else
            echo -e "${RED} Port çakışması çözülmedi. Kurulum devam edemiyor.${NC}"
            return 1
        fi
    fi
    return 0
}

# --------------------------
# Restart All Services Function
# --------------------------
restart_all_services() {
    clear
    print_header "Tüm Servisleri Yeniden Başlatma"
    
    echo -e "${YELLOW}Hangi servisleri yeniden başlatmak istiyorsunuz?${NC}"
    echo ""
    echo -e "  ${CYAN}1)${NC} Sadece PM2 Servisleri (Web, API, Admin)"
    echo -e "  ${CYAN}2)${NC} Sadece Sistem Servisleri (Nginx, Redis)"
    echo -e "  ${CYAN}3)${NC} TÜM SERVİSLER (PM2 + Sistem)"
    echo -e "  ${CYAN}4)${NC} İptal"
    echo ""
    read -p "Seçiminiz [1-4]: " restart_choice
    
    case $restart_choice in
        1)
            echo -e "${BLUE}PM2 servisleri yeniden başlatılıyor...${NC}"
            echo ""
            
            # Restart PM2 services
            if pm2 describe $MAIN_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $MAIN_PM2_NAME${NC}"
                pm2 restart $MAIN_PM2_NAME
            fi
            
            if pm2 describe $API_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $API_PM2_NAME${NC}"
                pm2 restart $API_PM2_NAME
            fi
            
            if pm2 describe $ADMIN_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $ADMIN_PM2_NAME${NC}"
                pm2 restart $ADMIN_PM2_NAME
            fi
            
            echo ""
            echo -e "${GREEN} PM2 servisleri yeniden başlatıldı!${NC}"
            echo ""
            pm2 list
            ;;
            
        2)
            echo -e "${BLUE}Sistem servisleri yeniden başlatılıyor...${NC}"
            echo ""
            
            # Restart Nginx
            echo -e "${YELLOW}Yeniden başlatılıyor: Nginx${NC}"
            nginx -t && systemctl restart nginx
            if systemctl is-active --quiet nginx; then
                echo -e "${GREEN} Nginx başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED}❌ Nginx yeniden başlatılamadı!${NC}"
            fi
            
            # Restart Redis
            echo -e "${YELLOW}Yeniden başlatılıyor: Redis${NC}"
            systemctl restart redis-server
            if systemctl is-active --quiet redis-server; then
                echo -e "${GREEN} Redis başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED} Redis yeniden başlatılamadı!${NC}"
            fi
            
            echo ""
            echo -e "${GREEN} Sistem servisleri yeniden başlatıldı!${NC}"
            ;;
            
        3)
            echo -e "${BLUE}TÜM SERVİSLER yeniden başlatılıyor...${NC}"
            echo ""
            
            # PM2 Services
            echo -e "${MAGENTA}=== PM2 Servisleri ===${NC}"
            if pm2 describe $MAIN_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $MAIN_PM2_NAME${NC}"
                pm2 restart $MAIN_PM2_NAME
            fi
            
            if pm2 describe $API_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $API_PM2_NAME${NC}"
                pm2 restart $API_PM2_NAME
            fi
            
            if pm2 describe $ADMIN_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $ADMIN_PM2_NAME${NC}"
                pm2 restart $ADMIN_PM2_NAME
            fi
            
            echo ""
            echo -e "${MAGENTA}=== Sistem Servisleri ===${NC}"
            
            # Nginx
            echo -e "${YELLOW}Yeniden başlatılıyor: Nginx${NC}"
            nginx -t && systemctl restart nginx
            if systemctl is-active --quiet nginx; then
                echo -e "${GREEN} Nginx başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED}❌ Nginx yeniden başlatılamadı!${NC}"
            fi
            
            # Redis
            echo -e "${YELLOW}Yeniden başlatılıyor: Redis${NC}"
            systemctl restart redis-server
            if systemctl is-active --quiet redis-server; then
                echo -e "${GREEN} Redis başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED}❌ Redis yeniden başlatılamadı!${NC}"
            fi
            
            echo ""
            echo -e "${GREEN} TÜM SERVİSLER başarıyla yeniden başlatıldı!${NC}"
            echo ""
            echo -e "${BLUE}PM2 Durumu:${NC}"
            pm2 list
            ;;
            
        4)
            echo -e "${YELLOW}İptal edildi.${NC}"
            return
            ;;
            
        *)
            echo -e "${RED}Geçersiz seçenek!${NC}"
            ;;
    esac
}

# --------------------------
# Migrate Existing Data to /root/data
# --------------------------
migrate_existing_data() {
    echo -e "${BLUE}Mevcut veriler /root/data'ya taşınıyor...${NC}"
    
    # /root/data klasör yapısını oluştur
    mkdir -p /root/data/uploads/{community,invoices,reports,reviews}
    mkdir -p /root/data/data/{users,archives/live-support,snort-reports}
    chmod -R 755 /root/data/uploads
    chmod -R 755 /root/data/data
    chown -R root:root /root/data
    
    # Mevcut uploads klasörünü taşı
    if [ -d "$API_DIR/uploads" ] && [ "$(ls -A $API_DIR/uploads 2>/dev/null)" ]; then
        echo -e "${YELLOW}Uploads klasörü taşınıyor...${NC}"
        if [ -z "$(ls -A /root/data/uploads 2>/dev/null)" ]; then
            cp -r "$API_DIR/uploads/"* /root/data/uploads/ 2>/dev/null || true
            echo -e "${GREEN}✅ Uploads klasörü taşındı${NC}"
        else
            echo -e "${YELLOW}⚠️  /root/data/uploads zaten dolu, atlandı${NC}"
        fi
    fi
    
    # Mevcut data klasörünü taşı
    if [ -d "$API_DIR/data" ] && [ "$(ls -A $API_DIR/data 2>/dev/null)" ]; then
        echo -e "${YELLOW}Data klasörü taşınıyor...${NC}"
        if [ -z "$(ls -A /root/data/data 2>/dev/null)" ]; then
            cp -r "$API_DIR/data/"* /root/data/data/ 2>/dev/null || true
            echo -e "${GREEN}✅ Data klasörü taşındı${NC}"
        else
            echo -e "${YELLOW}⚠️  /root/data/data zaten dolu, atlandı${NC}"
        fi
    fi
    
    # Mevcut .env dosyasını taşı
    if [ -f "$API_DIR/.env" ] && [ ! -f "/root/data/.env" ]; then
        echo -e "${YELLOW}.env dosyası taşınıyor...${NC}"
        cp "$API_DIR/.env" "/root/data/.env"
        chmod 600 /root/data/.env
        
        # Environment variable'ları ekle
        if ! grep -q "DATA_DIR" /root/data/.env; then
            echo "" >> /root/data/.env
            echo "DATA_DIR=/root/data" >> /root/data/.env
            echo "UPLOADS_DIR=/root/data/uploads" >> /root/data/.env
            echo "ENV_FILE=/root/data/.env" >> /root/data/.env
        fi
        
        echo -e "${GREEN}✅ .env dosyası taşındı${NC}"
    fi
    
    echo -e "${GREEN}✅ Veri taşıma işlemi tamamlandı${NC}"
    echo -e "${CYAN}📁 Veriler: /root/data${NC}"
}

# --------------------------
# Deploy Latest Updates (Pull, Build, Restart)
# --------------------------
deploy_updates() {
    clear
    print_header "Yazılım Güncellemelerini Dağıtma"

    if [ ! -d "/root/huglu_2/.git" ]; then
        echo -e "${RED}Repository bulunamadı. Önce kurulum yapın.${NC}"
        return 1
    fi

    cd /root/huglu_2
    _git_fallback_begin "/root/huglu_2"

    # ✅ /root/data dizinini koruma altına al
    echo -e "${YELLOW}Veri dizini korunuyor (/root/data)...${NC}"
    if [ ! -d "/root/data" ]; then
        mkdir -p /root/data/uploads/{community,invoices,reports,reviews}
        mkdir -p /root/data/data/{users,archives/live-support,snort-reports}
        chmod -R 755 /root/data/uploads
        chmod -R 755 /root/data/data
        chown -R root:root /root/data
        echo -e "${GREEN}✅ /root/data dizini oluşturuldu${NC}"
    fi
    
    # .env dosyasını kontrol et ve migrate et
    if [ ! -f "/root/data/.env" ] && [ -f "$API_DIR/.env" ]; then
        echo -e "${YELLOW}⚠️  .env dosyası /root/data/.env'e taşınıyor...${NC}"
        cp "$API_DIR/.env" "/root/data/.env"
        chmod 600 /root/data/.env
    fi
    
    # Mevcut verileri migrate et (ilk deployment için)
    if [ -d "$API_DIR/uploads" ] && [ -z "$(ls -A /root/data/uploads 2>/dev/null)" ]; then
        echo -e "${YELLOW}⚠️  Mevcut uploads klasörü /root/data/uploads'e taşınıyor...${NC}"
        cp -r "$API_DIR/uploads/"* /root/data/uploads/ 2>/dev/null || true
    fi
    
    if [ -d "$API_DIR/data" ] && [ -z "$(ls -A /root/data/data 2>/dev/null)" ]; then
        echo -e "${YELLOW}⚠️  Mevcut data klasörü /root/data/data'ya taşınıyor...${NC}"
        cp -r "$API_DIR/data/"* /root/data/data/ 2>/dev/null || true
    fi

    echo -e "${BLUE}Son değişiklikler çekiliyor...${NC}"
    if git pull --rebase --autostash origin main; then
        echo -e "${GREEN}Ana daldan güncellemeler çekildi.${NC}"
    elif git pull --rebase --autostash origin master; then
        echo -e "${GREEN}Master dalından güncellemeler çekildi.${NC}"
    else
        echo -e "${RED}Güncellemeler alınamadı. Lütfen ağı veya erişimi kontrol edin.${NC}"
        return 1
    fi

    echo ""
    echo -e "${BLUE}Ana site derleniyor...${NC}"
    if [ -d "$MAIN_DIR" ]; then
        cd $MAIN_DIR
        npm install
        echo -e "${YELLOW}Güvenlik açıkları kontrol ediliyor ve düzeltiliyor...${NC}"
        npm audit fix 2>/dev/null || true
        # Eğer hala açıklar varsa force ile düzelt
        if npm audit --audit-level=moderate 2>/dev/null | grep -q "found"; then
            echo -e "${YELLOW}Kritik açıklar için zorunlu düzeltme uygulanıyor...${NC}"
            npm audit fix --force 2>/dev/null || true
        fi
        npm run build
        if pm2 describe $MAIN_PM2_NAME &>/dev/null; then
            pm2 restart $MAIN_PM2_NAME || pm2 start ecosystem.config.js
        else
            pm2 start ecosystem.config.js
        fi
    else
        echo -e "${YELLOW}Ana site dizini bulunamadı, atlandı.${NC}"
    fi

    echo ""
    echo -e "${BLUE}API güncelleniyor...${NC}"
    if [ -d "$API_DIR" ]; then
        cd $API_DIR
        npm install --production
        echo -e "${YELLOW}Güvenlik açıkları kontrol ediliyor ve düzeltiliyor...${NC}"
        npm audit fix --production 2>/dev/null || true
        # Eğer hala açıklar varsa force ile düzelt
        if npm audit --production --audit-level=moderate 2>/dev/null | grep -q "found"; then
            echo -e "${YELLOW}Kritik açıklar için zorunlu düzeltme uygulanıyor...${NC}"
            npm audit fix --force --production 2>/dev/null || true
        fi
        if pm2 describe $API_PM2_NAME &>/dev/null; then
            pm2 restart $API_PM2_NAME || pm2 start server.js --name $API_PM2_NAME --time
        else
            pm2 start server.js --name $API_PM2_NAME --time
        fi
    else
        echo -e "${YELLOW}API dizini bulunamadı, atlandı.${NC}"
    fi

    echo ""
    echo -e "${BLUE}Admin paneli güncelleniyor...${NC}"
    if [ -d "$ADMIN_DIR" ]; then
        cd $ADMIN_DIR
        npm install
        echo -e "${YELLOW}Güvenlik açıkları kontrol ediliyor ve düzeltiliyor...${NC}"
        npm audit fix 2>/dev/null || true
        # Eğer hala açıklar varsa force ile düzelt
        if npm audit --audit-level=moderate 2>/dev/null | grep -q "found"; then
            echo -e "${YELLOW}Kritik açıklar için zorunlu düzeltme uygulanıyor...${NC}"
            npm audit fix --force 2>/dev/null || true
        fi
        npm run build
        if pm2 describe $ADMIN_PM2_NAME &>/dev/null; then
            pm2 restart $ADMIN_PM2_NAME || PORT=$ADMIN_PORT pm2 start npm --name "$ADMIN_PM2_NAME" -- start
        else
            PORT=$ADMIN_PORT pm2 start npm --name "$ADMIN_PM2_NAME" -- start
        fi
    else
        echo -e "${YELLOW}Admin dizini bulunamadı, atlandı.${NC}"
    fi

    pm2 save
    echo ""
    echo -e "${BLUE}Nginx yeniden yükleniyor...${NC}"
    nginx -t && systemctl reload nginx

    echo ""
    echo -e "${GREEN}Güncellemeler dağıtıldı ve servisler yeniden başlatıldı.${NC}"
    echo -e "${CYAN}📁 Veriler korundu: /root/data${NC}"

    _git_fallback_end
}

# --------------------------
# Deploy CURRENT checked-out version (no git pull)
# --------------------------
deploy_current_version() {
    clear
    print_header "Mevcut Versiyonu Kur (Pull Yok)"

    if [ ! -d "/root/huglu_2/.git" ]; then
        echo -e "${RED}Repository bulunamadı. Önce kurulum yapın.${NC}"
        return 1
    fi

    cd /root/huglu_2

    echo -e "${CYAN}Şu anki commit:${NC} $(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"
    echo ""

    echo -e "${YELLOW}Hangi bileşenler kurulsun?${NC}"
    echo -e "  ${CYAN}1)${NC} Tümü (Web + API + Admin)"
    echo -e "  ${CYAN}2)${NC} Sadece Web"
    echo -e "  ${CYAN}3)${NC} Sadece API"
    echo -e "  ${CYAN}4)${NC} Sadece Admin"
    echo -e "  ${CYAN}5)${NC} İptal"
    echo ""
    read -p "Seçiminiz [1-5]: " deploy_choice

    local do_web=false
    local do_api=false
    local do_admin=false

    case "${deploy_choice}" in
        1) do_web=true; do_api=true; do_admin=true ;;
        2) do_web=true ;;
        3) do_api=true ;;
        4) do_admin=true ;;
        5) echo -e "${YELLOW}İptal edildi.${NC}"; return 0 ;;
        *) echo -e "${RED}Geçersiz seçenek!${NC}"; return 1 ;;
    esac

    # ✅ /root/data dizinini koruma altına al (deploy_updates ile aynı davranış)
    echo -e "${YELLOW}Veri dizini korunuyor (/root/data)...${NC}"
    if [ ! -d "/root/data" ]; then
        mkdir -p /root/data/uploads/{community,invoices,reports,reviews}
        mkdir -p /root/data/data/{users,archives/live-support,snort-reports}
        chmod -R 755 /root/data/uploads
        chmod -R 755 /root/data/data
        chown -R root:root /root/data
        echo -e "${GREEN}✅ /root/data dizini oluşturuldu${NC}"
    fi

    # .env dosyasını kontrol et ve migrate et
    if [ ! -f "/root/data/.env" ] && [ -f "$API_DIR/.env" ]; then
        echo -e "${YELLOW}⚠️  .env dosyası /root/data/.env'e taşınıyor...${NC}"
        cp "$API_DIR/.env" "/root/data/.env"
        chmod 600 /root/data/.env
    fi

    # Mevcut verileri migrate et (ilk deployment için)
    if [ -d "$API_DIR/uploads" ] && [ -z "$(ls -A /root/data/uploads 2>/dev/null)" ]; then
        echo -e "${YELLOW}⚠️  Mevcut uploads klasörü /root/data/uploads'e taşınıyor...${NC}"
        cp -r "$API_DIR/uploads/"* /root/data/uploads/ 2>/dev/null || true
    fi

    if [ -d "$API_DIR/data" ] && [ -z "$(ls -A /root/data/data 2>/dev/null)" ]; then
        echo -e "${YELLOW}⚠️  Mevcut data klasörü /root/data/data'ya taşınıyor...${NC}"
        cp -r "$API_DIR/data/"* /root/data/data/ 2>/dev/null || true
    fi

    echo ""
    if [ "${do_web}" = true ]; then
        echo -e "${BLUE}Ana site derleniyor...${NC}"
        if [ -d "$MAIN_DIR" ]; then
            cd $MAIN_DIR
            npm install
            echo -e "${YELLOW}Güvenlik açıkları kontrol ediliyor ve düzeltiliyor...${NC}"
            npm audit fix 2>/dev/null || true
            if npm audit --audit-level=moderate 2>/dev/null | grep -q "found"; then
                echo -e "${YELLOW}Kritik açıklar için zorunlu düzeltme uygulanıyor...${NC}"
                npm audit fix --force 2>/dev/null || true
            fi
            npm run build
            if pm2 describe $MAIN_PM2_NAME &>/dev/null; then
                pm2 restart $MAIN_PM2_NAME || pm2 start ecosystem.config.js
            else
                pm2 start ecosystem.config.js
            fi
        else
            echo -e "${YELLOW}Ana site dizini bulunamadı, atlandı.${NC}"
        fi
    fi

    echo ""
    if [ "${do_api}" = true ]; then
        echo -e "${BLUE}API güncelleniyor...${NC}"
        if [ -d "$API_DIR" ]; then
            cd $API_DIR
            npm install --production
            echo -e "${YELLOW}Güvenlik açıkları kontrol ediliyor ve düzeltiliyor...${NC}"
            npm audit fix --production 2>/dev/null || true
            if npm audit --production --audit-level=moderate 2>/dev/null | grep -q "found"; then
                echo -e "${YELLOW}Kritik açıklar için zorunlu düzeltme uygulanıyor...${NC}"
                npm audit fix --force --production 2>/dev/null || true
            fi
            if pm2 describe $API_PM2_NAME &>/dev/null; then
                pm2 restart $API_PM2_NAME || pm2 start server.js --name $API_PM2_NAME --time
            else
                pm2 start server.js --name $API_PM2_NAME --time
            fi
        else
            echo -e "${YELLOW}API dizini bulunamadı, atlandı.${NC}"
        fi
    fi

    echo ""
    if [ "${do_admin}" = true ]; then
        echo -e "${BLUE}Admin paneli güncelleniyor...${NC}"
        if [ -d "$ADMIN_DIR" ]; then
            cd $ADMIN_DIR
            npm install
            echo -e "${YELLOW}Güvenlik açıkları kontrol ediliyor ve düzeltiliyor...${NC}"
            npm audit fix 2>/dev/null || true
            if npm audit --audit-level=moderate 2>/dev/null | grep -q "found"; then
                echo -e "${YELLOW}Kritik açıklar için zorunlu düzeltme uygulanıyor...${NC}"
                npm audit fix --force 2>/dev/null || true
            fi
            npm run build
            if pm2 describe $ADMIN_PM2_NAME &>/dev/null; then
                pm2 restart $ADMIN_PM2_NAME || PORT=$ADMIN_PORT pm2 start npm --name "$ADMIN_PM2_NAME" -- start
            else
                PORT=$ADMIN_PORT pm2 start npm --name "$ADMIN_PM2_NAME" -- start
            fi
        else
            echo -e "${YELLOW}Admin dizini bulunamadı, atlandı.${NC}"
        fi
    fi

    pm2 save
    echo ""
    echo -e "${BLUE}Nginx yeniden yükleniyor...${NC}"
    nginx -t && systemctl reload nginx

    echo ""
    echo -e "${GREEN}✅ Mevcut versiyon kuruldu ve servisler yeniden başlatıldı.${NC}"
    echo -e "${CYAN}📁 Veriler korundu: /root/data${NC}"
}

# --------------------------
# Git Version Manager (Rollback to selected commit)
# --------------------------
git_version_manager() {
    clear
    print_header "Git Versiyon Yönetimi (Rollback)"

    if [ ! -d "/root/huglu_2/.git" ]; then
        echo -e "${RED}Repository bulunamadı: /root/huglu_2${NC}"
        echo -e "${YELLOW}Önce kurulum yapın veya repo yolunu kontrol edin.${NC}"
        return 1
    fi

    cd /root/huglu_2

    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        echo -e "${RED}/root/huglu_2 bir git repository değil.${NC}"
        return 1
    fi

    local current_branch
    current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")"
    local current_commit
    current_commit="$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"

    echo -e "${CYAN}Repo:${NC} /root/huglu_2"
    echo -e "${CYAN}Branch:${NC} ${current_branch}"
    echo -e "${CYAN}Şu anki commit:${NC} ${current_commit}"
    echo ""

    echo -e "${YELLOW}Son commit'ler:${NC}"

    # Read last N commits into array (each item: "hash subject")
    local -a commits
    mapfile -t commits < <(git --no-pager log --pretty=format:'%h %s' -n 20 2>/dev/null || true)

    if [ "${#commits[@]}" -eq 0 ]; then
        echo -e "${RED}Commit listesi alınamadı.${NC}"
        return 1
    fi

    local i
    for i in "${!commits[@]}"; do
        printf "  %b%2d)%b %s\n" "${CYAN}" "$((i+1))" "${NC}" "${commits[$i]}"
    done

    echo ""
    echo -e "${YELLOW}İşlemler:${NC}"
    echo -e "  ${CYAN}R${NC}) Remote'dan güncelle (fetch)"
    echo -e "  ${CYAN}0${NC}) İptal / Geri dön"
    echo ""

    local selection
    read -p "Geri dönmek istediğiniz versiyonu seçin [1-${#commits[@]} / R / 0]: " selection

    if [ "${selection}" = "0" ]; then
        echo -e "${YELLOW}İptal edildi.${NC}"
        return 0
    fi

    if [[ "${selection}" =~ ^[Rr]$ ]]; then
        echo -e "${BLUE}Remote güncellemeler alınıyor (fetch)...${NC}"
        git fetch --all --prune || true
        echo -e "${GREEN}Fetch tamamlandı.${NC}"
        pause_screen
        return 0
    fi

    if ! [[ "${selection}" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}Geçersiz seçim!${NC}"
        return 1
    fi

    if [ "${selection}" -lt 1 ] || [ "${selection}" -gt "${#commits[@]}" ]; then
        echo -e "${RED}Geçersiz seçim!${NC}"
        return 1
    fi

    local chosen_line="${commits[$((selection-1))]}"
    local chosen_hash="${chosen_line%% *}"

    echo ""
    echo -e "${YELLOW}Seçilen commit:${NC} ${chosen_line}"
    echo -e "${RED}UYARI:${NC} Bu işlem /root/huglu_2 içindeki çalışma alanını seçtiğiniz commit'e geri alır."
    echo -e "${YELLOW}Not:${NC} Eğer local değişiklik varsa, otomatik stash ile korunur (NO_SDK_GIT_FALLBACK_STASH=1)."
    echo ""
    read -p "Devam edilsin mi? [e/H]: " -n 1 -r
    echo
    if ! [[ $REPLY =~ ^[Ee]$ ]]; then
        echo -e "${YELLOW}İptal edildi.${NC}"
        return 0
    fi

    # Use fallback wrapper to protect current state while switching commits
    _git_fallback_begin "/root/huglu_2"
    echo -e "${BLUE}Rollback yapılıyor...${NC}"
    git reset --hard "${chosen_hash}"
    git clean -fd
    echo -e "${GREEN}✅ Rollback tamamlandı: $(git rev-parse --short HEAD)${NC}"
    _git_fallback_end

    echo ""
    echo -e "${YELLOW}Bu versiyonu kurmak ister misiniz?${NC}"
    echo -e "  ${CYAN}1)${NC} Evet, kur (pull yapmadan build+restart)"
    echo -e "  ${CYAN}2)${NC} Hayır, sadece rollback yaptım"
    echo ""
    read -p "Seçiminiz [1-2]: " after_choice
    if [ "${after_choice}" = "1" ]; then
        deploy_current_version
    fi
}

# --------------------------
# System Status Function
# --------------------------
show_system_status() {
    clear
    print_header "Sistem Durumu"
    
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}PM2 Servisleri:${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    pm2 list
    echo ""
    
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}Sistem Servisleri:${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    
    # Nginx
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN} Nginx: Çalışıyor${NC}"
    else
        echo -e "${RED} Nginx: Durdurulmuş${NC}"
    fi
    
    # Redis
    if systemctl is-active --quiet redis-server; then
        echo -e "${GREEN} Redis: Çalışıyor${NC}"
    else
        echo -e "${RED} Redis: Durdurulmuş${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}Port Kullanımı:${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    
    check_port_display() {
        local port=$1
        local service=$2
        local pm2_name=$3  # PM2 servis adı (opsiyonel)
        
        # Önce port dinleniyor mu kontrol et
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            local process=$(lsof -Pi :$port -sTCP:LISTEN | tail -1 | awk '{print $1}')
            echo -e "${GREEN} Port $port: $service ($process)${NC}"
        elif [ -n "$pm2_name" ]; then
            # PM2 servisi var mı kontrol et
            if pm2 describe "$pm2_name" &>/dev/null; then
                # PM2 servisi var - PID kontrolü yap
                local pm2_pid=$(pm2 pid "$pm2_name" 2>/dev/null)
                if [ -n "$pm2_pid" ] && [ "$pm2_pid" != "0" ] && [ "$pm2_pid" != "N/A" ]; then
                    # PM2 servisi çalışıyor - port henüz dinlenmiyor olabilir veya başka bir sorun var
                    echo -e "${YELLOW} Port $port: $service (PM2: Çalışıyor, PID: $pm2_pid - Port henüz dinlenmiyor olabilir)${NC}"
                else
                    # PM2 servisi var ama PID yok - muhtemelen durdurulmuş
                    echo -e "${RED} Port $port: $service (PM2: Durdurulmuş)${NC}"
                fi
            else
                echo -e "${RED} Port $port: $service (Kullanımda Değil)${NC}"
            fi
        else
            echo -e "${RED} Port $port: $service (Kullanımda Değil)${NC}"
        fi
    }
    
    check_port_display 80 "Nginx"
    check_port_display 443 "Nginx SSL"
    check_port_display $MAIN_PORT "Main Site" "$MAIN_PM2_NAME"
    check_port_display $API_PORT "API" "$API_PM2_NAME"
    check_port_display $ADMIN_PORT "Admin" "$ADMIN_PM2_NAME"
    check_port_display $REDIS_PORT "Redis"
    
    echo ""
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${GREEN}Public Domain URLs:${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "  ${CYAN}Ana Site:${NC} https://$MAIN_DOMAIN"
    echo -e "  ${CYAN}API:${NC} https://$API_DOMAIN"
    echo -e "  ${CYAN}Admin:${NC} https://$ADMIN_DOMAIN"
    
    echo ""
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${GREEN}Internal Services:${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "  ${CYAN}Redis:${NC} localhost:${REDIS_PORT}"
    echo ""
}

# --------------------------
# Core Installation Functions
# --------------------------
cleanup_and_fix() {
    echo -e "${YELLOW}[DÜZELTME] Mevcut PM2 ve Nginx yapılandırmaları temizleniyor...${NC}"
    pm2 delete $MAIN_PM2_NAME 2>/dev/null || true
    pm2 delete $API_PM2_NAME 2>/dev/null || true
    pm2 delete $ADMIN_PM2_NAME 2>/dev/null || true

    rm -f /etc/nginx/sites-enabled/$MAIN_DOMAIN
    rm -f /etc/nginx/sites-enabled/$API_DOMAIN
    rm -f /etc/nginx/sites-enabled/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-available/$MAIN_DOMAIN
    rm -f /etc/nginx/sites-available/$API_DOMAIN
    rm -f /etc/nginx/sites-available/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx config and reload
    nginx -t && systemctl reload nginx || true
}

install_system_packages() {
    echo -e "${BLUE}[1/7] Sistem güncelleniyor...${NC}"
    apt update -y && apt upgrade -y

    # Required packages for Debian 11
    apt install -y \
        net-tools \
        lsof \
        curl \
        wget \
        git \
        nginx \
        ufw \
        build-essential \
        python3 \
        python3-pip \
        python3-dev \
        python3-venv \
        python3-certbot-nginx \
        ca-certificates \
        gnupg \
        lsb-release \
        apt-transport-https \
        software-properties-common \
        unzip \
        zip \
        redis-server
}

install_redis() {
    echo -e "${BLUE}[2/7] Redis kuruluyor ve yapılandırılıyor...${NC}"

    # Stop Redis
    systemctl stop redis-server 2>/dev/null || true

    # Backup Redis config
    if [ -f /etc/redis/redis.conf ]; then
        cp /etc/redis/redis.conf /etc/redis/redis.conf.backup.$(date +%Y%m%d_%H%M%S)
    fi

    # Create new Redis configuration (No Password)
    cat > /etc/redis/redis.conf << 'REDISCONF'
# Redis Configuration - No Username/Password (Localhost Only)

# Network - Only localhost access
bind 127.0.0.1 ::1
protected-mode yes
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300

# General
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log
databases 16

# Snapshotting
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Memory Management
maxmemory 256mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Append Only File
appendonly no
appendfilename "appendonly.aof"
appendfsync everysec
REDISCONF

    # Set Redis directory permissions
    mkdir -p /var/lib/redis
    mkdir -p /var/log/redis
    mkdir -p /var/run/redis
    chown -R redis:redis /var/lib/redis
    chown -R redis:redis /var/log/redis
    chown -R redis:redis /var/run/redis
    chmod 750 /var/lib/redis
    chmod 750 /var/log/redis

    # Configure Redis service
    systemctl enable redis-server
    systemctl start redis-server

    # Check Redis status
    sleep 2
    if systemctl is-active --quiet redis-server; then
        echo -e "${GREEN} Redis başarıyla kuruldu ve başlatıldı${NC}"
        if redis-cli ping > /dev/null 2>&1; then
            echo -e "${GREEN} Redis bağlantı testi başarılı (PONG)${NC}"
        fi
    else
        echo -e "${RED} Redis başlatılamadı!${NC}"
    fi
}

install_nodejs() {
    echo -e "${BLUE}[3/7] Node.js ve PM2 kuruluyor...${NC}"
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt install -y nodejs
    fi

    npm install -g pm2 npm@latest

    node --version
    npm --version
}

clone_repository() {
    echo -e "${BLUE}[4/7] Repository klonlanıyor...${NC}"
    if [ ! -d "/root/huglu_2" ]; then
        git clone https://github.com/berat-eth/huglu_2.git /root/huglu_2
    else
        cd /root/huglu_2
        _git_fallback_begin "/root/huglu_2"
        git pull origin main || git pull origin master || true
        _git_fallback_end
    fi
}

install_main_site() {
    echo -e "${BLUE}[5/7] Ana site kuruluyor (Next.js)...${NC}"
    if [ -d "$MAIN_DIR" ]; then
        cd $MAIN_DIR
        
        # Check port availability
        check_port_usage $MAIN_PORT "Main Site" || return 1
        
        npm install
        echo -e "${YELLOW}Güvenlik açıkları kontrol ediliyor ve düzeltiliyor...${NC}"
        npm audit fix 2>/dev/null || true
        # Eğer hala açıklar varsa force ile düzelt
        if npm audit --audit-level=moderate 2>/dev/null | grep -q "found"; then
            echo -e "${YELLOW}Kritik açıklar için zorunlu düzeltme uygulanıyor...${NC}"
            npm audit fix --force 2>/dev/null || true
        fi
        npm run build
        
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '${MAIN_PM2_NAME}',
    script: 'npm',
    args: 'start',
    cwd: '${MAIN_DIR}',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: ${MAIN_PORT},
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: ${REDIS_PORT}
    }
  }]
};
EOF
        
        mkdir -p logs
        pm2 start ecosystem.config.js
        pm2 save
        
        echo -e "${GREEN} Next.js ana site başarıyla kuruldu${NC}"
    else
        echo -e "${YELLOW}  Web dizini bulunamadı, atlanıyor...${NC}"
        SKIP_MAIN=true
    fi
}

install_api() {
    echo -e "${BLUE}[6/7] API kuruluyor...${NC}"
    if [ -d "$API_DIR" ]; then
        cd $API_DIR
        
        # Check port availability
        check_port_usage $API_PORT "API" || return 1
        
        # ✅ /root/data klasör yapısını oluştur
        echo -e "${YELLOW}Veri dizini yapısı oluşturuluyor...${NC}"
        mkdir -p /root/data/uploads/{community,invoices,reports,reviews}
        mkdir -p /root/data/data/{users,archives/live-support,snort-reports}
        chmod -R 755 /root/data/uploads
        chmod -R 755 /root/data/data
        chown -R root:root /root/data
        echo -e "${GREEN}✅ /root/data klasör yapısı oluşturuldu${NC}"
        
        # ✅ .env dosyasını /root/data/.env'e taşı veya kopyala
        if [ -f ".env" ] && [ ! -f "/root/data/.env" ]; then
            echo -e "${YELLOW}Mevcut .env dosyası /root/data/.env'e kopyalanıyor...${NC}"
            cp .env /root/data/.env
            chmod 600 /root/data/.env
        fi
        
        # ✅ /root/data/.env dosyasını oluştur veya güncelle
        if [ -f "/root/data/.env" ]; then
            if ! grep -q "DATA_DIR" /root/data/.env; then
                echo "" >> /root/data/.env
                echo "DATA_DIR=/root/data" >> /root/data/.env
                echo "UPLOADS_DIR=/root/data/uploads" >> /root/data/.env
                echo "ENV_FILE=/root/data/.env" >> /root/data/.env
            fi
            if ! grep -q "REDIS_HOST" /root/data/.env; then
                echo "REDIS_HOST=127.0.0.1" >> /root/data/.env
                echo "REDIS_PORT=${REDIS_PORT}" >> /root/data/.env
            fi
        else
            # ✅ /root/data/.env dosyasını oluştur
            cat > /root/data/.env << ENVEOF
NODE_ENV=production
PORT=${API_PORT}
DATA_DIR=/root/data
UPLOADS_DIR=/root/data/uploads
ENV_FILE=/root/data/.env
REDIS_HOST=127.0.0.1
REDIS_PORT=${REDIS_PORT}
ENVEOF
            chmod 600 /root/data/.env
            echo -e "${YELLOW}⚠️  /root/data/.env dosyası oluşturuldu. Lütfen yapılandırın!${NC}"
        fi
        
        npm install --production
        echo -e "${YELLOW}Güvenlik açıkları kontrol ediliyor ve düzeltiliyor...${NC}"
        npm audit fix --production 2>/dev/null || true
        # Eğer hala açıklar varsa force ile düzelt
        if npm audit --production --audit-level=moderate 2>/dev/null | grep -q "found"; then
            echo -e "${YELLOW}Kritik açıklar için zorunlu düzeltme uygulanıyor...${NC}"
            npm audit fix --force --production 2>/dev/null || true
        fi
        pm2 start server.js --name $API_PM2_NAME --time
        pm2 save
        echo -e "${GREEN}✅ API başarıyla kuruldu${NC}"
        echo -e "${CYAN}📁 Veriler: /root/data/uploads${NC}"
        echo -e "${CYAN}⚙️  Config: /root/data/.env${NC}"
    fi
}

install_admin() {
    if [ -d "$ADMIN_DIR" ]; then
        echo -e "${BLUE}Admin Panel kuruluyor...${NC}"
        cd $ADMIN_DIR
        
        # Check port availability
        check_port_usage $ADMIN_PORT "Admin Panel" || return 1
        
        npm install
        echo -e "${YELLOW}Güvenlik açıkları kontrol ediliyor ve düzeltiliyor...${NC}"
        npm audit fix 2>/dev/null || true
        # Eğer hala açıklar varsa force ile düzelt
        if npm audit --audit-level=moderate 2>/dev/null | grep -q "found"; then
            echo -e "${YELLOW}Kritik açıklar için zorunlu düzeltme uygulanıyor...${NC}"
            npm audit fix --force 2>/dev/null || true
        fi
        npm run build
        PORT=$ADMIN_PORT pm2 start npm --name "$ADMIN_PM2_NAME" -- start
        pm2 save
        echo -e "${GREEN}✅ Admin panel başarıyla kuruldu${NC}"
    else
        SKIP_ADMIN=true
    fi
}

configure_nginx() {
    echo -e "${BLUE}Nginx yapılandırılıyor...${NC}"

    # Main Site
    if [ "$SKIP_MAIN" != true ]; then
    cat > /etc/nginx/sites-available/$MAIN_DOMAIN << 'EOF'
server {
    listen 80;
    server_name huglutekstil.com www.huglutekstil.com;
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://127.0.0.1:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/$MAIN_DOMAIN /etc/nginx/sites-enabled/
    fi

    # API
    cat > /etc/nginx/sites-available/$API_DOMAIN << 'EOF'
server {
    listen 80;
    server_name api.huglutekstil.com;
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/$API_DOMAIN /etc/nginx/sites-enabled/

    # Admin
    if [ "$SKIP_ADMIN" != true ]; then
    cat > /etc/nginx/sites-available/$ADMIN_DOMAIN << 'EOF'
server {
    listen 80;
    server_name admin.huglutekstil.com;
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/$ADMIN_DOMAIN /etc/nginx/sites-enabled/
    fi

    # Test and reload Nginx
    if nginx -t; then
        systemctl reload nginx
        echo -e "${GREEN} Nginx yapılandırması başarıyla yüklendi${NC}"
    else
        echo -e "${RED} Nginx yapılandırma hatası!${NC}"
        nginx -t
    fi
}

install_ssl() {
    echo -e "${BLUE}SSL sertifikaları kuruluyor...${NC}"

    if [ "$SKIP_MAIN" != true ]; then
        certbot --nginx -d $MAIN_DOMAIN -d www.$MAIN_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || {
            echo -e "${YELLOW}  $MAIN_DOMAIN için SSL kurulumu başarısız${NC}"
        }
    fi

    certbot --nginx -d $API_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || {
        echo -e "${YELLOW}  $API_DOMAIN için SSL kurulumu başarısız${NC}"
    }

    if [ "$SKIP_ADMIN" != true ]; then
        certbot --nginx -d $ADMIN_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || {
            echo -e "${YELLOW}  $ADMIN_DOMAIN için SSL kurulumu başarısız${NC}"
        }
    fi

    # Auto renewal
    (crontab -l 2>/dev/null | grep -F "certbot renew") || (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
}

configure_firewall() {
    echo -e "${BLUE}Firewall yapılandırılıyor...${NC}"
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw reload
    echo -e "${GREEN} Firewall yapılandırıldı${NC}"
}

setup_pm2_startup() {
    pm2 startup systemd -u root --hp /root
    pm2 save
    echo -e "${GREEN} PM2 startup yapılandırıldı${NC}"
}

# --------------------------
# Full Installation Function
# --------------------------
full_installation() {
    print_header "Tam Kurulum Başlatılıyor"
    
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo -e "${RED}⚠️  ÖNEMLİ UYARI ⚠️${NC}"
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Bu işlem aşağıdaki verileri SİLEBİLİR:${NC}"
    echo -e "${YELLOW}  • Mevcut PM2 servisleri (Web, API, Admin)${NC}"
    echo -e "${YELLOW}  • Nginx yapılandırmaları${NC}"
    echo -e "${YELLOW}  • Git repository'deki değişiklikler (stash ile korunur)${NC}"
    echo ""
    echo -e "${CYAN}NOT:${NC} /root/data dizinindeki veriler korunur."
    echo ""
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo ""
    read -p "Devam etmek istediğinizden emin misiniz? [e/H]: " -n 1 -r
    echo
    if ! [[ $REPLY =~ ^[Ee]$ ]]; then
        echo -e "${YELLOW}Kurulum iptal edildi.${NC}"
        return 0
    fi
    
    cleanup_and_fix
    install_system_packages
    install_redis
    install_nodejs
    clone_repository
    install_main_site
    install_api
    install_admin
    configure_nginx
    install_ssl
    configure_firewall
    setup_pm2_startup
    
    echo ""
    print_header "Kurulum Tamamlandı!"
    echo -e "${GREEN}Tüm servisler başarıyla kuruldu!${NC}"
    echo ""
    show_system_status
}

# --------------------------
# Core Services Only Installation
# --------------------------
core_installation() {
    print_header "Sadece Temel Servisler Kuruluyor"
    
    cleanup_and_fix
    install_system_packages
    install_redis
    install_nodejs
    clone_repository
    install_main_site
    install_api
    install_admin
    configure_nginx
    install_ssl
    configure_firewall
    setup_pm2_startup
    
    echo ""
    print_header "Temel Kurulum Tamamlandı!"
    echo -e "${GREEN}Temel servisler başarıyla kuruldu!${NC}"
    echo ""
    show_system_status
}

# --------------------------
# Build Android APK Function
# --------------------------
build_android_apk() {
    clear
    print_header "Android APK Derleme"
    
    local SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local BUILD_SCRIPT="${SCRIPT_DIR}/build-android.sh"
    
    # Build script kontrolü
    if [ ! -f "$BUILD_SCRIPT" ]; then
        echo -e "${RED}❌ build-android.sh dosyası bulunamadı!${NC}"
        echo -e "${YELLOW}Beklenen konum: ${BUILD_SCRIPT}${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Bu işlem Android APK derleyecek ve FTP'ye yükleyecektir.${NC}"
    echo -e "${CYAN}Build scripti: ${BUILD_SCRIPT}${NC}"
    echo ""
    echo -e "${RED}⚠️  Uyarı: Bu işlem uzun sürebilir ve yüksek sistem kaynağı gerektirir.${NC}"
    echo ""
    read -p "Devam etmek istiyor musunuz? [e/H]: " -n 1 -r
    echo
    
    if ! [[ $REPLY =~ ^[Ee]$ ]]; then
        echo -e "${YELLOW}İptal edildi.${NC}"
        return 0
    fi
    
    echo ""
    echo -e "${BLUE}🚀 Android APK build başlatılıyor...${NC}"
    echo ""
    
    # Build scriptini çalıştır
    chmod +x "$BUILD_SCRIPT"
    bash "$BUILD_SCRIPT"
    
    local BUILD_RESULT=$?
    
    if [ $BUILD_RESULT -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Android APK build işlemi tamamlandı!${NC}"
    else
        echo ""
        echo -e "${RED}❌ Android APK build işlemi başarısız oldu!${NC}"
        echo -e "${YELLOW}Hata kodu: ${BUILD_RESULT}${NC}"
    fi
    
    return $BUILD_RESULT
}

# --------------------------
# Main Menu Loop
# --------------------------
main_menu() {
    while true; do
        print_menu
        read -p "Bir seçenek seçin [1-8]: " choice
        
        case $choice in
            1)
                full_installation
                pause_screen
                ;;
            2)
                core_installation
                pause_screen
                ;;
            3)
                restart_all_services
                pause_screen
                ;;
            4)
                show_system_status
                pause_screen
                ;;
            5)
                deploy_updates
                pause_screen
                ;;
            6)
                git_version_manager
                pause_screen
                ;;
            7)
                build_android_apk
                pause_screen
                ;;
            8)
                echo -e "${GREEN}Çıkılıyor...${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Geçersiz seçenek! Lütfen 1-8 arası seçin${NC}"
                pause_screen
                ;;
        esac
    done
}

# --------------------------
# Start Script
# --------------------------
print_header "Huglu Tekstil Dağıtım Yöneticisi"
echo -e "${CYAN}Debian 11 Bullseye Optimize Edilmiş${NC}"
echo -e "${CYAN}Port Çakışmaları Düzeltildi${NC}"
echo -e "${YELLOW}Başlatılıyor...${NC}"
sleep 1

# Start main menu
main_menu