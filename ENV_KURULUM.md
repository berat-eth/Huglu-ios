# .env Dosyaları Kurulum Rehberi

Bu dokümantasyon, Huğlu projesinde **nerelere** ve **nasıl** `.env` dosyalarını oluşturmanız gerektiğini açıklar.

---

## Genel Kurallar

- **`.env` dosyaları asla Git'e eklenmez** (`.gitignore` içindedir).
- Her ortam (development, production) için ayrı değerler kullanın.
- Hassas bilgileri (şifre, API key) paylaşmayın; `.env.example` dosyalarında örnek placeholder kullanın.

---

## 1. Backend (API – Server)

### Konum

| Ortam | Dosya yolu | Açıklama |
|-------|------------|----------|
| **Production (sunucu)** | `/root/data/.env` | Öncelikli konum. `no_sdk_setups.sh` ve server bu yolu kullanır. |
| **Fallback** | `server/.env` veya proje kökünde `../.env` | `/root/data/.env` yoksa server bunlara bakar. |
| **Özel konum** | `ENV_FILE` env değişkeni | İsterseniz `ENV_FILE=/farkli/yol/.env` ile yolu değiştirebilirsiniz. |

### Server .env yükleme sırası

1. `ENV_FILE` tanımlıysa → o dosya
2. `/root/data/.env` varsa → o dosya
3. `../.env` (server klasörüne göre üst dizin) varsa → o dosya
4. Hiçbiri yoksa → uyarı verilir, default değerler kullanılır

### Gerekli değişkenler (zorunlu – production)

```env
# Veritabanı
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_database_name
DB_PORT=3306

# Güvenlik (env-validation.js kontrol eder)
ENCRYPTION_KEY=64_karakterlik_hex_string   # openssl rand -hex 32
JWT_SECRET=your-jwt-secret-min-32-chars
ADMIN_KEY=your-admin-api-key
```

### Opsiyonel değişkenler

```env
# Sunucu
NODE_ENV=production
PORT=3000
LOG_LEVEL=error
DATA_DIR=/root/data
UPLOADS_DIR=/root/data/uploads
ENV_FILE=/root/data/.env

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# Admin girişi
ADMIN_USERNAME=admin
ADMIN_PASSWORD=guclu_sifre
ADMIN_EMAIL=admin@ornek.com
ADMIN_TOKEN=admin-bearer-token   # Login cevabındaki token; admin panel Bearer olarak kullanır. Production'da mutlaka ayarlayın.

# API / Frontend URL’leri
BASE_URL=https://api.huglutekstil.com
API_BASE_URL=https://api.huglutekstil.com/api
FRONTEND_URL=https://hugluoutdoor.com

# Ödeme (Iyzico)
IYZICO_API_KEY=your_iyzico_api_key
IYZICO_SECRET_KEY=your_iyzico_secret_key
IYZICO_URI=https://sandbox-api.iyzipay.com

# Harici servisler
OLLAMA_URL=http://localhost:11434
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_CLIENT_ID=your-google-client-id
```

### Production sunucuda adımlar

1. `/root/data` dizininin var olduğundan emin olun.
2. `/root/data/.env` dosyasını oluşturun.
3. Yukarıdaki zorunlu ve kullandığınız opsiyonel değişkenleri ekleyin.
4. **no_sdk_setups.sh ile kurulum**:
   - Tam kurulum veya Deploy sırasında script, `server/.env` varsa bunu **kopyalayarak** `/root/data/.env` oluşturur.
   - API kurulumunda `server/` içinde `.env` yoksa `/root/data/.env` sadece temel şablonla (DATA_DIR, UPLOADS_DIR, ENV_FILE, REDIS_*) oluşturulur; veritabanı vb. değerleri sizin eklemeniz gerekir.
   - Veriler `/root/data` altında tutulduğu için **production’da API config’i her zaman `/root/data/.env` üzerinden yönetilir**; `server/.env` kullanılmaz.

### Server script’leri ve .env

- **`server/scripts/archive-live-support-messages.js`**: Önce `ENV_FILE` / `/root/data/.env`, yoksa `../.env`.
- **`server/scripts/create-chat-tables.js`**: `../.env` (server’a göre üst dizin).
- **`server/scripts/remove-unused-tables.js`**: `../../.env` (proje kökü).

Script’leri çalıştırırken ilgili `.env` dosyasının erişilebilir olduğundan emin olun.

---

## 2. Admin Panel (Next.js)

### Konum

- **`admin-panel/.env.local`** (tercih edilen; Next.js bunu otomatik yükler)
- Alternatif: **`admin-panel/.env`**

### Gerekli değişkenler

```env
# API
NEXT_PUBLIC_API_URL=https://api.huglutekstil.com/api
NEXT_PUBLIC_API_KEY=your_api_key
NEXT_PUBLIC_ADMIN_KEY=your_admin_key
```

### Örnek şablon

`admin-panel/.env.example` dosyası mevcuttur. Kopyalayıp `.env.local` yapabilirsiniz:

```bash
cd admin-panel
cp .env.example .env.local
# .env.local içindeki değerleri kendi ortamınıza göre düzenleyin
```

### Not

- `NEXT_PUBLIC_*` değişkenleri client tarafında kullanılır; sadece bu prefix’li olanları frontend’de kullanın.
- `NEXT_PUBLIC_ADMIN_KEY`, backend’deki `ADMIN_KEY` ile uyumlu olmalıdır.

---

## 3. Web sitesi (Next.js)

### Konum

- **`web/.env.local`** (tercih edilen)
- Alternatif: **`web/.env`**

### Gerekli değişkenler

```env
NEXT_PUBLIC_API_URL=https://api.huglutekstil.com/api
NEXT_PUBLIC_API_KEY=your_api_key
```

### Oluşturma

```bash
cd web
# .env.local dosyası yoksa oluşturun
echo "NEXT_PUBLIC_API_URL=https://api.huglutekstil.com/api" > .env.local
echo "NEXT_PUBLIC_API_KEY=your_api_key" >> .env.local
```

Web, API URL ve key’i bu değişkenlerden okur; admin panel ile aynı API’yi kullanıyorsanız değerler uyumlu olmalı.

---

## 4. Mobil uygulama (Expo / React Native)

### Konum

- **Proje kök dizini** (`app.config.js` ve `package.json` ile aynı seviye): **`.env`**
- `app.config.js` içinde `path.join(__dirname, '.env')` kontrol edilir; yani kök `.env` kullanılır.

### Gerekli değişkenler

```env
EXPO_PUBLIC_API_URL=https://api.huglutekstil.com/api
EXPO_PUBLIC_API_KEY=your_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Açıklama

- `app.config.js` → `extra.apiKey` ve `extra.apiUrl` için `EXPO_PUBLIC_API_KEY` / `EXPO_PUBLIC_API_URL` (veya `API_KEY` / `API_URL`) kullanır.
- `GOOGLE_MAPS_API_KEY` hem iOS hem Android Maps config’inde kullanılır.
- Expo, build sırasında `EXPO_PUBLIC_*` değişkenlerini bundle’a gömerek okutur.

### Oluşturma

```bash
# Proje kökünde (Huglu_New_Ui veya huglu_2)
touch .env
# İçeriği düzenleyin:
# EXPO_PUBLIC_API_URL=...
# EXPO_PUBLIC_API_KEY=...
# GOOGLE_MAPS_API_KEY=...
```

### Dikkat

- Mobil uygulama **kökteki** `.env` dosyasını kullanır; `server/` veya `web/` altındaki `.env`’ler Mobil için geçerli değildir.
- `.env` zaten `.gitignore`’da olduğu için commit edilmez.

---

## 5. Özet tablo

| Bileşen      | .env konumu              | Örnek zorunlu / önemli değişkenler                    |
|--------------|---------------------------|--------------------------------------------------------|
| **Server**   | `/root/data/.env` (prod) veya `server/.env` | `DB_*`, `ENCRYPTION_KEY`, `JWT_SECRET`, `ADMIN_KEY`   |
| **Admin**    | `admin-panel/.env.local`  | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_KEY`, `NEXT_PUBLIC_ADMIN_KEY` |
| **Web**      | `web/.env.local`          | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_KEY`          |
| **Mobil**    | Proje kökü `.env`         | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_API_KEY`, `GOOGLE_MAPS_API_KEY` |

---

## 6. Güvenlik notları

1. **Şifre ve key’ler**: Gerçek şifreleri ve API key’leri `.env.example` veya dokümantasyonda **paylaşmayın**.
2. **ENCRYPTION_KEY**: `openssl rand -hex 32` ile 64 karakter hex üretip kullanın.
3. **JWT / ADMIN**: `JWT_SECRET` ve `ADMIN_KEY` gibi değerler tahmin edilmesi zor, yeterince uzun string’ler olmalı.
4. **İzinler**: Sunucuda `.env` dosyalarını sadece ilgili uygulamanın çalıştığı kullanıcı okuyacak şekilde ayarlayın (ör. `chmod 600`).
5. **ADMIN_TOKEN**: Backend `/admin/login` başarılı girişte bu değeri token olarak döner. Admin panel bunu `sessionStorage` + `Authorization: Bearer` ile kullanır. **Production'da** `ADMIN_TOKEN` mutlaka tanımlı olmalı; default değer kullanılmamalı. `NEXT_PUBLIC_ADMIN_KEY` (X-Admin-Key) ile karıştırılmamalı.
6. **Admin fallback**: API erişilemezken admin panel `NEXT_PUBLIC_ADMIN_EMAIL` / `NEXT_PUBLIC_ADMIN_PASSWORD` ile lokal `admin-fallback` token üretebilir. Bu token backend'de geçersizdir; admin API çağrıları **401** döner. Mümkünse yalnızca offline / development senaryosunda kullanın; production'da API her zaman erişilebilir olmalı.

---

## 7. Hızlı kontrol

- **Server**: `ENV_FILE` veya `/root/data/.env` / `server/.env` var mı? `DB_*`, `ENCRYPTION_KEY`, `JWT_SECRET`, `ADMIN_KEY`, `ADMIN_TOKEN` dolu mu?
- **Admin**: `admin-panel/.env.local` var mı? `NEXT_PUBLIC_*` değerleri doğru mu?
- **Web**: `web/.env.local` var mı? `NEXT_PUBLIC_API_URL` ve `NEXT_PUBLIC_API_KEY` doğru mu?
- **Mobil**: Kök dizinde `.env` var mı? `EXPO_PUBLIC_*` ve `GOOGLE_MAPS_API_KEY` set mi?

Bu adımları tamamladığınızda, ilgili bileşenler kendi `.env` dosyalarından konfigürasyonu okuyacaktır.
