# Derkenar Finance V2 — Final Backend Release

## Kapsam
Finance V2; müvekkil, dava ve danışmanlık bağlamlarını tek finans çekirdeğinde birleştirir. Tahakkuklar finansal gerçeği temsil eder; tahsilatlar allocation ile tahakkuklara mahsup edilir. İade, ters kayıt, indirim/terkin ve transfer işlemleri geçmişi silmeden karşı kayıt/audit yaklaşımıyla yürütülür.

## Final hardening
- Generic transaction endpoint yalnız `receipt` kabul eder. Refund, expense, transfer, reversal ve adjustment özel servis akışlarından geçer.
- Ücret anlaşmaları create sırasında daima `draft` başlar; activate/complete/cancel lifecycle endpointleri kullanılır.
- Payment plan lifecycle: activate, complete, default, cancel.
- Receivable adjustment ters kayıt desteği.
- Masraf özel ters kayıt akışı; reimbursement tahakkuku varsa güvenli geri alma kuralları.
- Transfer iki bacak birlikte ters kaydedilir; tek bacaklı ters kayıt engellenir.
- Contextsiz ofis gideri/transfer kayıtları yalnız `VIEW_ALL_FINANCE` ile okunabilir/audit edilebilir.
- Base currency farklıysa FX kuru zorunludur; cross-currency transferde kaynak ve hedef kurları ayrı desteklenir.
- Account type, fee billing model, plan type, receivable type, expense type ve payment method servis seviyesinde doğrulanır.
- Idempotency reuse aynı payloadın temel finans kimliğini doğrular.
- Yeni expense list/detail ve period list read API'leri.
- Ledger/agreements/receivables/plans/expenses için arama filtreleri.

## Yeni final migration
`20260908160000-finance-v2-final-invariants.cjs`

DB seviyesinde refund/transfer/reversal ilişki invariantları, self-reference engeli, reversed metadata tutarlılığı, aktif reversal uniqueness ve raporlama indexleri ekler.

## Doğrulama
- `node --check`: kritik Finance V2 service/controller/routes ve final migration başarılı.
- `npm test`: 5 test / 5 başarılı.
- Gerçek PostgreSQL migration/runtime entegrasyonu bu çalışma ortamında çalıştırılmadı. Staging üzerinde uygulanmalıdır.

## Deployment sırası
1. Veritabanı yedeği alın.
2. Server paketini deploy edin ve bağımlılıkları kurun.
3. Migrationları staging üzerinde çalıştırın.
4. `npm run finance:reconcile-legacy` ile dry-run alın.
5. Çıktıyı inceleyin; gerekiyorsa kontrollü biçimde `--apply` çalıştırın.
6. `npm run finance:readiness` sonucu `READY` olmalıdır.
7. Client final paketini deploy edin.
8. Smoke test listesini tamamlayın.
9. Frontend cutover doğrulandıktan sonra `LEGACY_FINANCE_API_ENABLED=false` yapın.
10. Legacy tablo/model/migrationları hemen fiziksel olarak silmeyin; veri saklama ve rollback penceresi sonrasında ayrı migration ile kaldırın.

## Kritik smoke testleri
- TRY hesabı ve USD/EUR hesabı oluşturma.
- Non-base currency tahsilatta FX zorunluluğu.
- Fee agreement draft → active → complete/cancel.
- Receivable create/post.
- Payment plan activate/complete/default/cancel.
- Kısmi tahsilat ve allocation.
- Refund sonrası receivable'ın yeniden açılması.
- Discount/write-off ve adjustment reversal.
- Office/matter/reimbursable/non-reimbursable expense.
- Expense reversal.
- Same-currency ve cross-currency transfer + paired reversal.
- Period close ile yeni kayıt engeli; reason ile reopen.
- Ledger filtreleri ve CSV export.
- Client/Case/Consultation scope kontrolleri.
- Contextsiz office expense/transfer için VIEW_ALL_FINANCE kontrolü.
- Consultation → Case finance link.
- Reconciliation ve readiness.
