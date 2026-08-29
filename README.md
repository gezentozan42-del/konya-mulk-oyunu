# Konya Mülk Oyunu — 40 Kare Tam Sürüm

Arkadaş grubuna özel, telefondan aynı anda oynanan, oyun içi sesli sohbetli çevrimiçi emlak oyunu.

## Özel içerik

Oyunda Ahmet, Tuğba, Merve, Murat ve Seher isimleri şans/sandık kartlarına ve bazı özel karelere işlendi.

## Bu sürümde neler var?

- Tam 40 karelik masa
- 2–5 oyunculu özel oda
- Oda kodu ve davet bağlantısı
- Mobil tarayıcı desteği
- 2 zar ve çift atınca ek tur
- Üç kez üst üste çift atınca Trafik Bekleme
- Trafik Bekleme: çift atarak veya ₺50 ödeyerek çıkma
- Mülk satın alma
- Renk grubu tekeli
- Eşit bina yapma kuralı
- 4 ev + 1 otel
- Bina satma
- İpotek / ipotek kaldırma
- İstasyon ve altyapı/utility kira sistemi
- Açık artırma
- Oyuncular arası nakit + mülk takası
- Şans ve sandık kartları
- Çay Bahçesi ortak kasa
- İflas ve kazanan tespiti
- Yazılı grup sohbeti
- WebRTC sesli sohbet
- Bağlantı kopunca aynı cihazdan odaya geri dönme
- Oyun durumunu JSON dosyasına kalıcı kaydetme
- Cloudflare Realtime TURN desteği (isteğe bağlı)

## Yerelde çalıştırma

Node.js 20+ gerekir.

```bash
npm install
npm start
```

Sonra:
`http://localhost:3000`

## Kalıcı yayın için öneri: Railway Hobby

Railway üzerinde:
1. Bu klasörü bir GitHub deposuna yükle.
2. Railway > New Project > Deploy from GitHub Repo.
3. Hobby planı seç.
4. Bir Volume ekle ve `/data` yoluna bağla.
5. Environment variable:
   - `DATA_FILE=/data/rooms.json`
6. Deploy.
7. Railway'in verdiği HTTPS adresini arkadaş grubuna gönder.

HTTPS, telefon mikrofon erişimi için önemlidir.

## Cloudflare TURN — daha güvenilir ses

STUN çoğu ağda yeterli olur. Farklı mobil operatörlerde ses bağlantısının daha güvenilir olması için Cloudflare Realtime TURN eklenebilir.

Sunucu değişkenleri:
- `CF_TURN_KEY_ID`
- `CF_TURN_API_TOKEN`

Bunlar yalnızca sunucuda tutulmalıdır. Tarayıcıya uzun ömürlü TURN anahtarı gönderilmez; uygulama `/api/ice` üzerinden kısa ömürlü ICE kimliği üretir.

## Not

Bu, arkadaş grubuna özel özgün bir emlak oyunudur. Resmî Monopoly logosu, görselleri veya marka tasarımı kullanılmamıştır.
