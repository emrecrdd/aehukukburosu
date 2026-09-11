# Derkenar Finance V2 — Phase 2

Bu faz Finance V2 çekirdeğini native ödeme planı/taksit ve kontrollü legacy geçişi ile genişletir.

## Eklenenler
- `finance_payment_plans` ve `finance_installments`
- Her taksit için ayrı `finance_receivable`; taksit borcun görünümü, receivable finansal gerçeğin kaynağıdır.
- Çoklu/kısmi allocation; toplam mahsup alacak bakiyesini aşamaz.
- Yalnız incoming transaction alacağa mahsup edilebilir.
- Consultation → Case dönüşümünde Finance V2 kayıtları kopyalanmaz; consultation origin korunur ve `case_id` atomik eklenir.
- Legacy plan/installment backfill migrationı idempotent mapping kolonları ile eklenmiştir.
- Legacy `payments` için dry-run varsayılan reconciliation aracı vardır.

## Güvenli çalıştırma
1. Production kopyasında değil development/staging DB'de `npm run db:migrate`.
2. `npm run finance:reconcile-legacy` yalnız rapor üretir, veri değiştirmez.
3. Rapor kontrolünden sonra `npm run finance:reconcile-legacy -- --apply`.
4. `manual_review` içindeki legacy `adjustment` kayıtları otomatik taşınmaz; yön/iş anlamı insan tarafından doğrulanmalıdır.
5. Reconciliation sonrası eski `/api/finance` ve `/api/payments` henüz silinmemelidir; frontend cutover tamamlanınca kaldırılmalıdır.

## Yeni endpointler
- `POST /api/finance-v2/payment-plans`
- `POST /api/finance-v2/payment-plans/:id/activate`
