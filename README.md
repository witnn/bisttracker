# BIST Portföy Takip Uygulaması

Bu uygulama, kullanıcıların BIST hisselerini portföylerine ekleyip gerçek zamanlı kâr/zarar durumlarını takip edebildikleri, hisse bazlı performans grafikleri görebildikleri bir web uygulamasıdır.

## Mimari

Uygulama API-first mantığıyla tasarlanmıştır:
- **Backend:** Node.js, Express, TypeScript, Prisma, SQLite.
- **Frontend:** React (Vite), TypeScript, Recharts, Lucide-React, Vanilla CSS (Glassmorphism & Dark Mode).
- **Veri Kaynağı:** Yahoo Finance (`yahoo-finance2`).

## Kurulum ve Çalıştırma

Proje yolunda `&` (ampersand) işareti bulunduğunda npm scriptleri (örneğin `npx` ve `.bin` yolları) sorun yaşayabildiği için sunucuları çalıştırırken doğrudan node ile başlatıyoruz.

### 1. Backend

```bash
cd backend
npm install
# Prisma veritabanı ayarlandı ve migration yapıldı
# Sunucuyu başlatmak için:
node ./node_modules/ts-node/dist/bin.js src/index.ts
```
Backend sunucusu `http://localhost:3000` adresinde çalışacaktır. API route'ları `/api/portfolio` ve `/api/stocks` altındadır.

### 2. Frontend

```bash
cd frontend
npm install
# Sunucuyu başlatmak için:
node ./node_modules/vite/bin/vite.js
```
Frontend, genellikle `http://localhost:5173` adresinde çalışacaktır.

## Özellikler

- **Dashboard:** Toplam yatırım, güncel değer, toplam kâr/zarar özeti ve portföydeki hisselerin listesi.
- **Portföy Yönetimi:** Yeni hisse ekleme, düzenleme, silme (lot, alış fiyatı, alış tarihi bilgileri ile).
- **Hisse Detayı:** Seçilen hisseye özel 1G, 7G, 1A, 1Y fiyat grafiği çizimi ve hissenin en yüksek/en düşük fiyat istatistikleri.
- **Fiyat Sağlayıcı:** Yahoo Finance kullanılarak 15 dk gecikmeli BIST verisi çekilmekte, gereksiz API isteklerini önlemek için 5 dakikalık bellek içi önbellek (cache) uygulanmaktadır.
