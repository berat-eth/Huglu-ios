# Huglu Mobil Uygulama - E-posta Şablonları Dokümantasyonu

Bu doküman, Huglu mobil uygulaması için gerekli tüm e-posta şablonlarını kod tabanı analizi sonucunda belirlenmiş şekilde listelemektedir.

---

## Kod Tabanı Analiz Özeti

### Mevcut Durum

| Bileşen | Durum |
|---------|-------|
| **Mobil Uygulama (`src/`)** | E-posta adresleri toplanıyor, gönderim backend'e bırakılmış |
| **Server (`server/`)** | E-posta gönderimi için sadece placeholder mevcut, şablon yok |
| **Admin Panel (`admin-panel/`)** | E-posta şablon yönetim arayüzü hazır, backend entegrasyonu eksik |

### İlgili Dosyalar

- `server/services/alerting.js` - E-posta gönderim placeholder'ı (satır 79-89)
- `admin-panel/components/Email.tsx` - Şablon yönetim arayüzü
- `admin-panel/.env.example` - SMTP yapılandırma örneği (satır 12-16)

---

## 1. Kimlik Doğrulama Şablonları

### 1.1 Hoş Geldiniz E-postası (Welcome Email)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `welcome` |
| **Kaynak Dosya** | `src/screens/SignUpScreen.js` (satır 98) |
| **Tetikleyici** | Yeni kullanıcı kaydı başarılı olduğunda |
| **Öncelik** | Yüksek |

**İçerik Gereksinimleri:**
- Hoş geldiniz mesajı
- Marka tanıtımı ve değer önerisi
- Hesap bilgileri özeti
- Uygulama kullanım başlangıç rehberi
- Destek iletişim bilgileri
- Sosyal medya linkleri

**Örnek Konu:** `Huglu'ya Hoş Geldiniz! 🎉`

---

### 1.2 E-posta Doğrulama (Email Verification)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `email_verification` |
| **Kaynak Dosya** | Henüz implement edilmemiş (gerekli) |
| **Tetikleyici** | Kayıt sonrası otomatik |
| **Öncelik** | Kritik |

**İçerik Gereksinimleri:**
- Doğrulama linki (token ile)
- Link son kullanma süresi (örn: 24 saat)
- "Doğrula" butonu
- Link çalışmıyorsa alternatif yöntem
- Güvenlik uyarısı

**Örnek Konu:** `E-posta Adresinizi Doğrulayın`

**Teknik Notlar:**
```
Token: JWT veya UUID
Geçerlilik: 24 saat
URL Format: https://huglu.com/verify?token={token}
```

---

### 1.3 Şifre Sıfırlama (Password Reset)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `password_reset` |
| **Kaynak Dosya** | `src/screens/ForgotPasswordScreen.js` (satır 35-38) |
| **Tetikleyici** | Şifre sıfırlama talebi |
| **Öncelik** | Kritik |

**İçerik Gereksinimleri:**
- Şifre sıfırlama linki
- Link son kullanma süresi (örn: 1 saat)
- "Şifremi Sıfırla" butonu
- Talep etmediyseniz uyarısı
- Güvenlik ipuçları

**Örnek Konu:** `Şifre Sıfırlama Talebiniz`

**Teknik Notlar:**
```
Token: Tek kullanımlık, 1 saat geçerli
URL Format: https://huglu.com/reset-password?token={token}
```

---

### 1.4 Şifre Değişikliği Bildirimi (Password Changed)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `password_changed` |
| **Kaynak Dosya** | Güvenlik için gerekli |
| **Tetikleyici** | Şifre başarıyla değiştirildiğinde |
| **Öncelik** | Yüksek |

**İçerik Gereksinimleri:**
- Şifre değişikliği onayı
- Değişiklik tarihi ve saati
- IP adresi (opsiyonel)
- "Bu siz değilseniz" uyarısı
- Hesap güvenliği linki

**Örnek Konu:** `Şifreniz Değiştirildi`

---

## 2. Sipariş Şablonları

### 2.1 Sipariş Onayı (Order Confirmation)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `order_confirmation` |
| **Kaynak Dosya** | `src/screens/OrderConfirmationScreen.js` (satır 347) |
| **Tetikleyici** | Sipariş oluşturulduğunda |
| **Öncelik** | Kritik |

**İçerik Gereksinimleri:**
- Sipariş numarası
- Sipariş tarihi
- Ürün listesi (resim, ad, adet, fiyat)
- Ara toplam, kargo ücreti, toplam
- Teslimat adresi
- Tahmini teslimat tarihi
- Sipariş takip linki

**Örnek Konu:** `Siparişiniz Alındı - #{{order_number}}`

**Dinamik Değişkenler:**
```
{{order_number}} - Sipariş numarası
{{order_date}} - Sipariş tarihi
{{customer_name}} - Müşteri adı
{{items}} - Ürün listesi (döngü)
{{subtotal}} - Ara toplam
{{shipping_fee}} - Kargo ücreti
{{total}} - Toplam tutar
{{delivery_address}} - Teslimat adresi
{{estimated_delivery}} - Tahmini teslimat
```

---

### 2.2 Sipariş Durumu Güncelleme (Order Status Update)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `order_status_update` |
| **Kaynak Dosya** | `src/screens/OrdersScreen.js` |
| **Tetikleyici** | Sipariş durumu değiştiğinde |
| **Öncelik** | Yüksek |

**Desteklenen Durumlar:**
- `pending` - Beklemede
- `processing` - Hazırlanıyor
- `shipped` - Kargoya Verildi
- `delivered` - Teslim Edildi
- `cancelled` - İptal Edildi

**İçerik Gereksinimleri:**
- Yeni sipariş durumu
- Durum açıklaması
- Sipariş özeti
- Sonraki adımlar
- Takip linki

**Örnek Konu:** `Siparişiniz {{status}} - #{{order_number}}`

---

### 2.3 Kargo Bilgilendirme (Shipment Notification)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `shipment_notification` |
| **Kaynak Dosya** | `src/screens/OrderTrackingScreen.js` |
| **Tetikleyici** | Kargo çıkışı yapıldığında |
| **Öncelik** | Yüksek |

**İçerik Gereksinimleri:**
- Kargo takip numarası
- Kargo firması adı ve logosu
- Kargo firması takip linki
- Tahmini teslimat tarihi
- Teslimat adresi
- "Kargonu Takip Et" butonu

**Örnek Konu:** `Siparişiniz Kargoya Verildi! 📦`

**Dinamik Değişkenler:**
```
{{tracking_number}} - Takip numarası
{{carrier_name}} - Kargo firması
{{carrier_tracking_url}} - Kargo takip linki
{{estimated_delivery}} - Tahmini teslimat
```

---

### 2.4 Teslimat Bildirimi (Delivery Confirmation)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `delivery_confirmation` |
| **Kaynak Dosya** | Sipariş akışı için gerekli |
| **Tetikleyici** | Sipariş teslim edildiğinde |
| **Öncelik** | Orta |

**İçerik Gereksinimleri:**
- Teslimat onayı mesajı
- Teslimat tarihi ve saati
- Sipariş özeti
- Ürün değerlendirme daveti
- Değerlendirme linki
- Sorun bildirme linki

**Örnek Konu:** `Siparişiniz Teslim Edildi! ✅`

---

## 3. Ödeme Şablonları

### 3.1 Ödeme Onayı (Payment Confirmation)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `payment_confirmation` |
| **Kaynak Dosya** | `src/screens/PaymentMethodScreen.js` (satır 299-440) |
| **Tetikleyici** | Ödeme başarılı olduğunda |
| **Öncelik** | Kritik |

**İçerik Gereksinimleri:**
- Ödeme onay mesajı
- Ödeme tutarı
- Ödeme yöntemi (son 4 hane)
- İşlem referans numarası
- Fatura linki
- İşlem tarihi

**Örnek Konu:** `Ödemeniz Alındı - {{amount}} TL`

---

### 3.2 Ödeme Başarısız (Payment Failed)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `payment_failed` |
| **Kaynak Dosya** | Ödeme akışı için gerekli |
| **Tetikleyici** | Ödeme reddedildiğinde |
| **Öncelik** | Yüksek |

**İçerik Gereksinimleri:**
- Ödeme başarısız mesajı
- Hata açıklaması (genel)
- Alternatif ödeme seçenekleri
- Tekrar deneme linki
- Destek iletişim bilgileri

**Örnek Konu:** `Ödemeniz Gerçekleştirilemedi`

---

### 3.3 Fatura E-postası (Invoice Email)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `invoice` |
| **Kaynak Dosya** | `server/server.js` (satır 12971-13433) |
| **Tetikleyici** | Sipariş tamamlandığında |
| **Öncelik** | Yüksek |

**İçerik Gereksinimleri:**
- Fatura numarası
- Fatura tarihi
- Müşteri bilgileri
- Ürün detayları
- Vergi bilgileri
- Toplam tutar
- PDF fatura eki

**Örnek Konu:** `Faturanız - #{{invoice_number}}`

**Ek Dosya:**
```
Dosya Adı: Huglu_Fatura_{{invoice_number}}.pdf
Format: PDF
```

---

## 4. Cüzdan Şablonları

### 4.1 Bakiye Yükleme (Balance Added)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `wallet_balance_added` |
| **Kaynak Dosya** | `src/screens/WalletScreen.js` (satır 207-311) |
| **Tetikleyici** | Cüzdana bakiye eklendiğinde |
| **Öncelik** | Orta |

**İçerik Gereksinimleri:**
- Yüklenen miktar
- Yeni bakiye
- İşlem tarihi
- İşlem referansı
- Cüzdan linki

**Örnek Konu:** `Cüzdanınıza {{amount}} TL Yüklendi`

---

### 4.2 Para Transferi (Wallet Transfer)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `wallet_transfer` |
| **Kaynak Dosya** | `src/screens/WalletTransferScreen.js` (satır 125, 375) |
| **Tetikleyici** | Transfer yapıldığında |
| **Öncelik** | Yüksek |

**İçerik Gereksinimleri (Gönderen):**
- Transfer tutarı
- Alıcı bilgisi
- Yeni bakiye
- İşlem tarihi

**İçerik Gereksinimleri (Alıcı):**
- Transfer tutarı
- Gönderen bilgisi
- Yeni bakiye
- İşlem tarihi

**Örnek Konu:** 
- Gönderen: `{{amount}} TL Transfer Edildi`
- Alıcı: `{{amount}} TL Transfer Alındı`

---

## 5. Pazarlama Şablonları

### 5.1 Kampanya/Promosyon (Campaign/Promotion)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `campaign_promotion` |
| **Kaynak Dosya** | `src/screens/SettingsScreen.js` (satır 230-239) |
| **Tetikleyici** | Yeni kampanya başladığında |
| **Öncelik** | Düşük |

**İçerik Gereksinimleri:**
- Kampanya başlığı
- Kampanya açıklaması
- İndirim oranı/tutarı
- Geçerlilik tarihleri
- İndirim kodu (varsa)
- Kampanya sayfası linki
- Görsel banner

**Örnek Konu:** `🎁 {{campaign_title}} - {{discount}}% İndirim!`

**Not:** Kullanıcı e-posta bildirimi tercihine göre gönderilmeli.

---

### 5.2 Flash Deal Bildirimi (Flash Deal)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `flash_deal` |
| **Kaynak Dosya** | `src/screens/FlashDealsScreen.js` |
| **Tetikleyici** | Flash deal başladığında |
| **Öncelik** | Düşük |

**İçerik Gereksinimleri:**
- Ürün bilgisi
- Normal fiyat ve indirimli fiyat
- Kalan süre/bitiş zamanı
- Kalan stok (opsiyonel)
- "Hemen Al" butonu
- Ürün sayfası linki

**Örnek Konu:** `⚡ Flash Deal: {{product_name}} - %{{discount}} İndirim!`

---

### 5.3 Terk Edilmiş Sepet (Abandoned Cart)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `abandoned_cart` |
| **Kaynak Dosya** | Pazarlama için gerekli |
| **Tetikleyici** | Sepette ürün bırakıldığında (24 saat sonra) |
| **Öncelik** | Orta |

**İçerik Gereksinimleri:**
- Sepetteki ürünler
- Toplam tutar
- "Alışverişi Tamamla" butonu
- Özel indirim kodu (opsiyonel)
- Ürün görselleri

**Örnek Konu:** `Sepetinizde ürünler bekliyor! 🛒`

---

## 6. Hesap Şablonları

### 6.1 Profil Güncelleme (Profile Updated)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `profile_updated` |
| **Kaynak Dosya** | `src/screens/PersonalInfoScreen.js` (satır 256-282) |
| **Tetikleyici** | Profil bilgileri değiştiğinde |
| **Öncelik** | Orta |

**İçerik Gereksinimleri:**
- Değişiklik özeti
- Değişiklik tarihi
- "Bu siz değilseniz" uyarısı
- Hesap güvenliği linki

**Örnek Konu:** `Profil Bilgileriniz Güncellendi`

---

### 6.2 Toptan Satış Başvurusu Alındı (B2B Application Received)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `b2b_application_received` |
| **Kaynak Dosya** | `src/screens/WholesaleScreen.js` (satır 68) |
| **Tetikleyici** | B2B başvurusu yapıldığında |
| **Öncelik** | Yüksek |

**İçerik Gereksinimleri:**
- Başvuru alındı onayı
- Başvuru referans numarası
- Değerlendirme süreci bilgisi
- Beklenen süre
- İletişim bilgileri

**Örnek Konu:** `Toptan Satış Başvurunuz Alındı`

---

### 6.3 Toptan Satış Başvurusu Onaylandı (B2B Application Approved)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `b2b_application_approved` |
| **Kaynak Dosya** | B2B akışı için gerekli |
| **Tetikleyici** | Başvuru onaylandığında |
| **Öncelik** | Yüksek |

**İçerik Gereksinimleri:**
- Onay mesajı
- B2B hesap bilgileri
- Özel indirim oranları
- B2B portal linki
- Başlangıç rehberi

**Örnek Konu:** `🎉 Toptan Satış Hesabınız Onaylandı!`

---

### 6.4 Toptan Satış Başvurusu Reddedildi (B2B Application Rejected)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `b2b_application_rejected` |
| **Kaynak Dosya** | B2B akışı için gerekli |
| **Tetikleyici** | Başvuru reddedildiğinde |
| **Öncelik** | Orta |

**İçerik Gereksinimleri:**
- Red bildirimi
- Red nedeni (genel)
- Tekrar başvuru bilgisi
- İletişim bilgileri

**Örnek Konu:** `Toptan Satış Başvurunuz Hakkında`

---

## 7. Bildirim Şablonları

### 7.1 Stok Bildirimi (Back in Stock)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `back_in_stock` |
| **Kaynak Dosya** | İstek listesi özelliği için gerekli |
| **Tetikleyici** | Favori ürün stoğa girdiğinde |
| **Öncelik** | Orta |

**İçerik Gereksinimleri:**
- Ürün bilgisi ve görseli
- "Stokta!" mesajı
- Fiyat
- "Hemen Al" butonu
- Ürün sayfası linki

**Örnek Konu:** `{{product_name}} Tekrar Stokta! 🎯`

---

### 7.2 Fiyat Düşüş Bildirimi (Price Drop)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `price_drop` |
| **Kaynak Dosya** | İstek listesi özelliği için gerekli |
| **Tetikleyici** | Favori ürün fiyatı düştüğünde |
| **Öncelik** | Orta |

**İçerik Gereksinimleri:**
- Ürün bilgisi ve görseli
- Eski fiyat (üstü çizili)
- Yeni fiyat
- İndirim oranı
- "Hemen Al" butonu

**Örnek Konu:** `{{product_name}} Fiyatı Düştü! 📉`

---

## 8. Özel Gün Şablonları

### 8.1 Doğum Günü (Birthday)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `birthday` |
| **Kaynak Dosya** | Pazarlama için gerekli |
| **Tetikleyici** | Kullanıcının doğum gününde |
| **Öncelik** | Düşük |

**İçerik Gereksinimleri:**
- Doğum günü kutlaması
- Özel indirim kodu
- İndirim geçerlilik süresi
- Önerilen ürünler

**Örnek Konu:** `🎂 Doğum Gününüz Kutlu Olsun!`

---

### 8.2 Üyelik Yıldönümü (Anniversary)

| Özellik | Değer |
|---------|-------|
| **Şablon Adı** | `membership_anniversary` |
| **Kaynak Dosya** | Pazarlama için gerekli |
| **Tetikleyici** | Üyelik yıldönümünde |
| **Öncelik** | Düşük |

**İçerik Gereksinimleri:**
- Yıldönümü kutlaması
- Üyelik süresi
- Alışveriş özeti (toplam sipariş, tasarruf)
- Özel indirim kodu

**Örnek Konu:** `🎉 {{years}} Yıllık Huglu Üyesisiniz!`

---

## Şablon Kategorileri Özet Tablosu

Admin panel (`admin-panel/components/Email.tsx`) ile uyumlu kategorizasyon:

| Kategori | Şablonlar | Adet |
|----------|-----------|------|
| **Karşılama** | Hoş Geldiniz, E-posta Doğrulama | 2 |
| **İşlem** | Sipariş Onayı, Sipariş Durumu, Kargo Bildirimi, Teslimat, Ödeme Onayı, Ödeme Başarısız, Fatura | 7 |
| **Cüzdan** | Bakiye Yükleme, Para Transferi | 2 |
| **Promosyon** | Kampanya, Flash Deal, Terk Edilmiş Sepet | 3 |
| **Hatırlatma** | Stok Bildirimi, Fiyat Düşüşü | 2 |
| **Güvenlik** | Şifre Sıfırlama, Şifre Değişikliği, Profil Güncelleme | 3 |
| **Hesap** | B2B Başvuru Alındı, B2B Onay, B2B Red | 3 |
| **Özel Gün** | Doğum Günü, Üyelik Yıldönümü | 2 |

**Toplam: 24 Şablon**

---

## Teknik Gereksinimler

### Eksik Altyapı

1. **E-posta Kütüphanesi**: `nodemailer` kurulu değil
2. **SMTP Yapılandırması**: `.env` dosyasında SMTP ayarları eksik
3. **Şablon Motoru**: HTML şablon motoru (örn: `handlebars`, `ejs`) yok
4. **E-posta Servisi**: `server/services/alerting.js` içinde sadece placeholder var

### Önerilen SMTP Yapılandırması

`.env` dosyasına eklenecek değişkenler:

```env
# SMTP Ayarları
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@huglu.com
SMTP_PASSWORD=your_password

# E-posta Ayarları
EMAIL_FROM_NAME=Huglu
EMAIL_FROM_ADDRESS=noreply@huglu.com
EMAIL_REPLY_TO=destek@huglu.com
```

### Önerilen Dosya Yapısı

```
server/
├── services/
│   └── emailService.js       # E-posta gönderim servisi
├── templates/
│   └── email/
│       ├── layouts/
│       │   └── base.html     # Ana şablon
│       ├── auth/
│       │   ├── welcome.html
│       │   ├── email-verification.html
│       │   ├── password-reset.html
│       │   └── password-changed.html
│       ├── orders/
│       │   ├── order-confirmation.html
│       │   ├── order-status-update.html
│       │   ├── shipment-notification.html
│       │   └── delivery-confirmation.html
│       ├── payments/
│       │   ├── payment-confirmation.html
│       │   ├── payment-failed.html
│       │   └── invoice.html
│       ├── wallet/
│       │   ├── balance-added.html
│       │   └── wallet-transfer.html
│       ├── marketing/
│       │   ├── campaign-promotion.html
│       │   ├── flash-deal.html
│       │   └── abandoned-cart.html
│       ├── account/
│       │   ├── profile-updated.html
│       │   ├── b2b-application-received.html
│       │   ├── b2b-application-approved.html
│       │   └── b2b-application-rejected.html
│       ├── notifications/
│       │   ├── back-in-stock.html
│       │   └── price-drop.html
│       └── special/
│           ├── birthday.html
│           └── membership-anniversary.html
```

#
## Uygulama Öncelik Sırası

| Öncelik | Şablonlar | Neden |
|---------|-----------|-------|
| **1 - Kritik** | E-posta Doğrulama, Şifre Sıfırlama, Sipariş Onayı, Ödeme Onayı | Temel kullanıcı akışları |
| **2 - Yüksek** | Hoş Geldiniz, Şifre Değişikliği, Kargo Bildirimi, Ödeme Başarısız, Fatura, B2B Başvurular, Cüzdan | Kullanıcı deneyimi |
| **3 - Orta** | Teslimat, Profil Güncelleme, Stok/Fiyat Bildirimleri, Terk Edilmiş Sepet | Engagement |
| **4 - Düşük** | Kampanya, Flash Deal, Doğum Günü, Yıldönümü | Pazarlama |

---

## Notlar

- Tüm şablonlar mobil uyumlu (responsive) olmalıdır
- Türkçe ve İngilizce dil desteği sağlanmalıdır (`src/i18n/index.js` ile uyumlu)
- Kullanıcı e-posta tercihleri (`emailNotifications` ayarı) dikkate alınmalıdır
- GDPR/KVKK uyumlu abonelik iptal linki eklenmelidir
- Tüm şablonlarda marka tutarlılığı sağlanmalıdır
