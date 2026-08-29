# KonyaPoly

2–5 arkadaşın aynı odada gerçek zamanlı oynadığı, Konya temalı profesyonel mülk oyunu. Oyun kuralları ve oda durumu sunucuda yönetilir; zar, sıra, mülkler, takaslar, açık artırma, Şans/Şehir Sandığı kartları ve ortak bildirimler bütün oyuncularda eş zamanlı görünür.

Tahtadaki karelere dokununca kira, ev/otel maliyeti ve sahiplik bilgileri açılır. Önemli satın alma, kira ve takas olayları masa üzerindeki akış çerçevesinde görünür; kartların hedef hamleleri piyonun kare kare ilerlemesiyle izlenir. Telefon görünümünde renk grupları yüksek kontrastlı ve takas mülkleri renk etiketlidir.

İpotekli tapular portföyden bankaya satılabilir; satışta tapu silinir ve banka ipotek bedelini öder.

Şans destesindeki Kira Dokunulmazlığı kartı, kartı açan oyuncunun karşılaşacağı ilk kirayı siler. Binalar yalnızca sıra sahibinin turunda kurulabilir ve bir turda en fazla üç bina geliştirilebilir. Eksi bakiyedeki oyuncu, Takas sekmesinden mülkünü nakit karşılığında devrederek borcunu kapatabilir.

## Railway kurulumu

1. Bu klasörü bir GitHub deposuna gönderin ve Railway'de **Deploy from GitHub Repo** ile seçin.
2. Railway projesine bir **PostgreSQL** servisi ekleyin.
3. Uygulama servisinde PostgreSQL'in `DATABASE_URL` değişkenini referanslayın. Railway çoğu projede bağlantıyı otomatik ekler.
4. Uygulama servisine bir alan adı üretin. HTTPS, mikrofon erişimi için gereklidir.
5. İsteğe bağlı sağlam ses bağlantısı için bir TURN hizmetinin bilgilerini `ICE_SERVERS_JSON` değişkenine JSON dizi olarak ekleyin.

Örnek TURN ayarı:

```json
[
  {"urls":["stun:stun.cloudflare.com:3478"]},
  {"urls":["turn:turn.example.com:3478"],"username":"kullanici","credential":"sifre"}
]
```

Yalnızca STUN ile ses çoğu ev ve mobil ağında çalışır. Kurumsal ağlar ve bazı operatörlerde hatasız ses için TURN önerilir.

## Yerel çalışma

```bash
npm install
npm test
npm start
```

`DATABASE_URL` boşsa odalar bellekte tutulur. Railway PostgreSQL bağlandığında aktif odalar servis yeniden başlasa bile korunur.

## Sağlık kontrolü

`GET /health` servisin, oda deposunun ve uygulamanın ayakta olduğunu bildirir.
