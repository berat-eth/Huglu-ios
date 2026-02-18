# 🔒 Güvenlik Açıkları Raporu
**Tarih:** 23 Ocak 2026  
**Kapsam:** Mobil Uygulama, Backend API, Web Sitesi, Admin Panel

---

## 🚨 KRİTİK GÜVENLİK AÇIKLARI

### 1. Hardcoded API Keys ve Admin Credentials ⚠️ KRİTİK

**Lokasyon:**
- `admin-panel/lib/api.ts:4-5`
- `web/utils/api.ts:7`
- `server/server.js:4414-4415, 4425`
- `server/middleware/auth.js:91`

**Sorun:**
```typescript
// admin-panel/lib/api.ts
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS';

// server/server.js
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '38cdfD8217..';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'huglu-admin-token-2025';
const isValidApiKey = apiKey && apiKey === 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f';
```

**Risk:** 
- API key'ler ve admin credentials kod içinde hardcoded
- Git repository'de görünür durumda
- Production'da kullanılırsa tüm sistem erişilebilir hale gelir

**Öneri:**
- Tüm hardcoded değerleri kaldırın
- Environment variable'ları zorunlu hale getirin (fallback kullanmayın)
- `.env` dosyalarını `.gitignore`'a ekleyin
- Production'da secret management sistemi kullanın (AWS Secrets Manager, HashiCorp Vault)

---

### 2. XSS (Cross-Site Scripting) Riskleri ⚠️ YÜKSEK

**Lokasyon:**
- `admin-panel/components/Email.tsx:484`
- `web/app/urunler/[id]/page.tsx:600`
- `web/app/giris/page.tsx:230`
- `web/app/layout.tsx:89, 132`
- `admin-panel/components/Orders.tsx:194`

**Sorun:**
```typescript
// dangerouslySetInnerHTML kullanımı
dangerouslySetInnerHTML={{ __html: sanitizeHTML(templateHtml) }}
dangerouslySetInnerHTML={{ __html: sanitizeHTML(product.description) }}
w.document.write(html) // Orders.tsx
```

**Risk:**
- `sanitizeHTML` fonksiyonu yeterince güçlü olmayabilir
- `document.write` kullanımı XSS'e açık
- Kullanıcı girdileri doğrudan HTML'e render ediliyor

**Öneri:**
- `dangerouslySetInnerHTML` kullanımını minimize edin
- DOMPurify gibi güçlü sanitization kütüphanesi kullanın
- `document.write` kullanımını kaldırın
- Content Security Policy (CSP) header'larını güçlendirin

---

### 3. Token Storage Güvenliği ⚠️ YÜKSEK

**Lokasyon:**
- `web/utils/auth.ts:12-14, 23-24, 31-33`
- `web/utils/api.ts:23, 133`
- `admin-panel/lib/api.ts:133`

**Sorun:**
```typescript
// Web uygulamasında localStorage kullanımı
localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
localStorage.setItem(TOKEN_STORAGE_KEY, token);
sessionStorage.getItem('authToken')
```

**Risk:**
- localStorage XSS saldırılarına karşı savunmasız
- Token'lar JavaScript ile erişilebilir
- XSS saldırısı durumunda token'lar çalınabilir

**Öneri:**
- Mobil uygulamada `SecureStore` kullanımı doğru (devam edin)
- Web için HttpOnly cookie kullanın
- Token'ları localStorage'da saklamayın
- Mümkünse token'ları memory'de tutun (sessionStorage bile riskli)

---

### 4. CORS Yapılandırması ⚠️ ORTA

**Lokasyon:**
- `server/server.js:520-569`
- `server/server-production.js:301-364`

**Sorun:**
```javascript
// Origin yoksa (mobil uygulama veya same-origin request için)
if (!origin) {
  if (process.env.NODE_ENV === 'production') {
    return callback(null, true); // Production'da origin yoksa izin ver
  }
}
credentials: true, // credentials: true ile wildcard origin kullanılmıyor
```

**Risk:**
- Production'da origin yoksa tüm isteklere izin veriliyor
- API key kontrolü yeterli olmayabilir
- Credentials: true ile birlikte dikkatli kullanılmalı

**Öneri:**
- Origin yoksa bile API key doğrulaması zorunlu olmalı
- CORS whitelist'i daha sıkı olmalı
- Preflight request'leri için rate limiting ekleyin

---

### 5. SQL Injection Potansiyel Riskleri ⚠️ ORTA

**Lokasyon:**
- `server/server.js:16366-16368` (query parametreleri)
- Genel olarak prepared statement kullanımı iyi, ancak bazı yerlerde dikkat gerekiyor

**Sorun:**
```javascript
// Bazı yerlerde string concatenation riski olabilir
whereClauses.push('(u.name LIKE ? OR u.email LIKE ?)');
params.push(`%${q}%`, `%${q}%`);
```

**Not:** Genel olarak prepared statement kullanımı doğru görünüyor, ancak tüm query'lerin kontrol edilmesi gerekiyor.

**Öneri:**
- Tüm SQL sorgularında prepared statement kullanımını garanti edin
- Dynamic table/column name'ler için whitelist kullanın (zaten yapılıyor)
- SQL injection testleri yapın

---

### 6. Admin Authentication Zayıflıkları ⚠️ YÜKSEK

**Lokasyon:**
- `server/server.js:4417-4436`
- `server/middleware/auth.js:76-126`

**Sorun:**
```javascript
// Hardcoded admin token ve API key kontrolü
const isValidBearer = bearerToken && bearerToken === ADMIN_TOKEN;
const isValidApiKey = apiKey && apiKey === 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f';
```

**Risk:**
- Admin token'ı hardcoded
- API key hardcoded ve herkes tarafından görülebilir
- Rate limiting var ama yeterli olmayabilir

**Öneri:**
- Admin authentication için JWT kullanın
- Multi-factor authentication (MFA) ekleyin
- Admin key'leri düzenli olarak rotate edin
- IP whitelist ekleyin (opsiyonel)

---

### 7. Input Validation Eksiklikleri ⚠️ ORTA

**Lokasyon:**
- Genel olarak input validation var, ancak bazı endpoint'lerde eksik olabilir

**Sorun:**
- Bazı endpoint'lerde input validation yeterince sıkı değil
- File upload'larda dosya tipi ve boyut kontrolü eksik olabilir

**Öneri:**
- Tüm user input'larını validate edin
- File upload'larda:
  - Dosya tipi whitelist'i
  - Maksimum dosya boyutu
  - Dosya içeriği kontrolü (magic bytes)
- Rate limiting ekleyin

---

### 8. Password Security ⚠️ ORTA

**Lokasyon:**
- `server/server.js:208-228`

**Sorun:**
- Password hashing bcrypt ile yapılıyor (iyi)
- Ancak password policy kontrolü eksik olabilir

**Öneri:**
- Minimum password uzunluğu (8+ karakter)
- Karmaşıklık gereksinimleri (büyük/küçük harf, rakam, özel karakter)
- Common password listesi kontrolü
- Password history (son 5 şifre tekrar kullanılamaz)

---

### 9. Error Information Disclosure ⚠️ DÜŞÜK-ORTA

**Lokasyon:**
- Genel olarak error handling iyi, ancak bazı yerlerde detaylı hata mesajları dönebilir

**Sorun:**
- Bazı hata mesajları stack trace içerebilir
- Database hata mesajları kullanıcıya gösterilebilir

**Öneri:**
- Production'da generic error mesajları gösterin
- Detaylı hataları sadece log'layın
- Error handling middleware'i güçlendirin

---

### 10. Session Management ⚠️ ORTA

**Lokasyon:**
- `server/security/jwt-auth.js`

**Sorun:**
- JWT token'lar iyi yapılandırılmış
- Token rotation var
- Ancak token expiration süreleri kontrol edilmeli

**Öneri:**
- Access token: 15 dakika (mevcut - iyi)
- Refresh token: 7 gün (mevcut - iyi)
- Token blacklist mekanizması var (iyi)
- Logout'ta tüm token'ları iptal edin

---

## ✅ İYİ GÜVENLİK UYGULAMALARI

1. **SQL Injection Koruması:** Prepared statement kullanımı genel olarak doğru
2. **Password Hashing:** bcrypt ile güvenli hashing yapılıyor
3. **JWT Token Management:** Token rotation ve blacklist mekanizması var
4. **Rate Limiting:** Bazı endpoint'lerde rate limiting var
5. **CSP Headers:** Content Security Policy header'ları eklenmiş
6. **Input Sanitization:** Bazı yerlerde input sanitization yapılıyor
7. **Secure Storage (Mobil):** Mobil uygulamada SecureStore kullanımı doğru

---

## 📋 ÖNCELİKLİ DÜZELTME LİSTESİ

### Acil (1-2 Gün İçinde)
1. ✅ Hardcoded API key'leri ve admin credentials'ları kaldırın
2. ✅ Environment variable'ları zorunlu hale getirin
3. ✅ Web'de token storage'ı localStorage'dan cookie'ye taşıyın

### Kısa Vadeli (1 Hafta İçinde)
4. ✅ XSS korumasını güçlendirin (DOMPurify)
5. ✅ Admin authentication'ı JWT ile güçlendirin
6. ✅ CORS yapılandırmasını sıkılaştırın
7. ✅ Input validation'ı tüm endpoint'lerde uygulayın

### Orta Vadeli (1 Ay İçinde)
8. ✅ Multi-factor authentication (MFA) ekleyin
9. ✅ Security audit logging sistemi kurun
10. ✅ Penetration testing yapın
11. ✅ Dependency vulnerability scanning yapın

---

## 🔧 ÖNERİLEN GÜVENLİK ARAÇLARI

1. **Static Analysis:**
   - ESLint security plugins
   - SonarQube
   - Snyk

2. **Dependency Scanning:**
   - npm audit
   - Snyk
   - Dependabot

3. **Runtime Protection:**
   - Rate limiting (express-rate-limit)
   - Helmet.js (zaten kullanılıyor)
   - CORS (zaten kullanılıyor)

4. **Monitoring:**
   - Security event logging
   - Anomaly detection
   - Intrusion detection

---

## 📝 SONUÇ

Projede genel olarak iyi güvenlik uygulamaları var, ancak kritik bazı açıklar mevcut:

- **En kritik:** Hardcoded credentials ve API key'ler
- **Yüksek risk:** XSS açıkları ve token storage güvenliği
- **Orta risk:** CORS yapılandırması ve admin authentication

Öncelikli olarak hardcoded credentials'ları kaldırın ve environment variable'ları zorunlu hale getirin. Ardından XSS korumasını güçlendirin ve token storage'ı güvenli hale getirin.

---

**Rapor Hazırlayan:** AI Security Assistant  
**Son Güncelleme:** 23 Ocak 2026
