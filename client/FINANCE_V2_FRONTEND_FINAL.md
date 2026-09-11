# Derkenar Finance V2 — Final Frontend Release

## Finance Center
`/finance` artık Finance V2'nin ana merkezi. Genel Bakış, Tahakkuklar, Hareketler, Ücret Anlaşmaları, Ödeme Planları, Masraflar ve Kasa/Banka hesapları aynı finans çekirdeğini kullanır.

## Operasyon akışları
- Ücret anlaşması create/detail/activate/complete/cancel.
- Tahakkuk create/detail/post, discount/write-off ve adjustment reversal.
- Allocation destekli tahsilat; mahsupsuz bakiye müvekkil avansı olarak görünür.
- Payment plan create/detail/activate/complete/default/cancel.
- Expense create/list/detail/reversal.
- Refund ve generic receipt reversal.
- Account transfer ve iki bacaklı transfer reversal.
- Transaction detail + allocation/refund/audit timeline.
- Client/Case/Consultation finans özet kartları.
- Period list/close/reopen, reconciliation ve cash-contribution profitability kontrolleri.
- Gelişmiş ledger filtreleri ve aynı filtrelerle CSV export.
- Non-base currency işlem/masraf/refund/transfer için FX alanları.

## Yetkilendirme
UI aksiyonları backend Finance V2 izinleri ile eşleştirilmiştir. Firma-geneli reconciliation/period ve contextless transfer ters kayıt gibi işlemler `VIEW_ALL_FINANCE` şartını frontend'de de uygular.

## Legacy route uyumluluğu
Ana finance route'ları Finance V2'ye gider. `/payments/plans/create` canonical `/finance/plans/create` rotasına yönlendirilir; eski deep-link plan detayı V2 detayına taşınmıştır. Legacy dosyalar rollback/cutover amacıyla henüz fiziksel olarak silinmemiştir.

## Doğrulama
- Relative import taraması: 0 hata.
- Finance V2 frontend çağrıları backend route yüzeyiyle çapraz kontrol edildi.
- Gerçek Vite build bu çalışma ortamında dependency kurulumunun tamamlanamaması (`vite` binary oluşmadı) nedeniyle çalıştırılamadı. Deployment öncesinde temiz ortamda `npm ci && npm run build` zorunludur.
