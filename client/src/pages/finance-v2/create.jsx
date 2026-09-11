import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, WalletCards } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import {
  useFinanceAccounts,
  useCreateFinanceTransaction,
  useReceivables,
} from '../../features/finance-v2/finance-v2.query.js';
import {
  ContextFields,
  Field,
  Select,
  inputClass,
  nowLocal,
  toIso,
} from './components/FinanceFormBits.jsx';
import { money } from '../../features/finance-v2/finance-v2.format.js';

export default function FinanceV2Create() {
  const navigate = useNavigate();
  const mutation = useCreateFinanceTransaction();
  const accountsQ = useFinanceAccounts();

  const [form, setForm] = useState({
    client_id: '',
    case_id: '',
    consultation_id: '',
    account_id: '',
    amount: '',
    currency: 'TRY',
    payment_method: 'bank_transfer',
    transaction_date: nowLocal(),
    description: '',
    external_reference: '',
    base_currency: 'TRY',
    fx_rate: '',
    allocations: {},
  });

  const accounts = Array.isArray(accountsQ.data)
    ? accountsQ.data
    : accountsQ.data?.rows || [];

  const hasContext = Boolean(
    form.client_id ||
      form.case_id ||
      form.consultation_id
  );

  const receivableParams = {
    client_id: form.client_id || undefined,
    case_id: form.case_id || undefined,
    consultation_id: form.consultation_id || undefined,
    currency: form.currency,
    limit: 100,
    offset: 0,
  };

  const receivablesQ = useReceivables({
    ...receivableParams,
    status: 'open',
  });

  const partialQ = useReceivables({
    ...receivableParams,
    status: 'partially_paid',
  });

  const receivables = useMemo(() => {
    const rows = [
      ...(receivablesQ.data?.rows || []),
      ...(partialQ.data?.rows || []),
    ];

    const seen = new Set();

    return rows.filter((row) => {
      if (!row?.id || seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
  }, [receivablesQ.data, partialQ.data]);

  const allocated = useMemo(
    () =>
      Object.values(form.allocations).reduce(
        (sum, value) => sum + Number(value || 0),
        0
      ),
    [form.allocations]
  );

  const totalAmount = Number(form.amount || 0);

  const remaining = Math.max(
    totalAmount - allocated,
    0
  );

  const set = (name, value) => {
    setForm((current) => {
      const next = {
        ...current,
        [name]: value,
      };

      if (name === 'account_id') {
        next.currency =
          accounts.find(
            (account) =>
              String(account.id) === String(value)
          )?.currency || current.currency;

        next.allocations = {};
      }

      return next;
    });
  };

  const autoAllocate = () => {
    let left = Number(form.amount || 0);
    const next = {};

    for (const receivable of receivables) {
      if (left <= 0) break;

      const cap = Math.max(
        Number(receivable.open_balance || 0),
        0
      );

      const take = Math.min(left, cap);

      if (take > 0) {
        next[receivable.id] = take.toFixed(2);
        left -= take;
      }
    }

    setForm((current) => ({
      ...current,
      allocations: next,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (
      !hasContext ||
      !form.account_id ||
      totalAmount <= 0 ||
      allocated > totalAmount
    ) {
      return;
    }

    const allocations = Object.entries(
      form.allocations
    )
      .filter(([, value]) => Number(value) > 0)
      .map(([receivable_id, amount]) => ({
        receivable_id,
        amount: String(amount),
      }));

    const payload = {
      client_id: form.client_id || null,
      case_id: form.case_id || null,
      consultation_id:
        form.consultation_id || null,

      account_id: form.account_id,

      transaction_type: 'receipt',
      amount: String(form.amount),
      currency: form.currency,

      payment_method: form.payment_method,
      transaction_date: toIso(
        form.transaction_date
      ),

      description: form.description,
      external_reference:
        form.external_reference,

      base_currency: form.base_currency,

      fx_rate:
        form.currency === form.base_currency
          ? undefined
          : form.fx_rate,

      allocations,
    };

    const res = await mutation.mutateAsync({
      data: payload,
      idempotencyKey: crypto.randomUUID(),
    });

    const id =
      res?.data?.data?.id ||
      res?.data?.id;

    navigate(
      id
        ? `/finance/transactions/${id}`
        : '/finance'
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start gap-3">
        <Link
          to="/finance"
          className="mt-1 rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-white/[0.08]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Yeni Tahsilat
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Tahsilatı açık alacaklara kısmi veya tam
            mahsup edin; kalan tutar avans olarak
            kalır.
          </p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33]"
      >
        <div className="flex items-center gap-3 border-b border-gray-100 pb-5 dark:border-white/[0.06]">
          <div className="rounded-xl bg-blue-50 p-2.5 dark:bg-blue-500/10">
            <WalletCards className="h-5 w-5 text-blue-600" />
          </div>

          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              Tahsilat Bilgileri
            </h2>

            <p className="text-xs text-gray-400">
              Posted tahsilat düzeltmeleri ters kayıt
              veya iade ile yapılır.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <ContextFields
            form={form}
            setForm={setForm}
            allowEmpty
          />

          <Field label="Finans Hesabı">
            <Select
              required
              value={form.account_id}
              onChange={(event) =>
                set(
                  'account_id',
                  event.target.value
                )
              }
            >
              <option value="">
                Hesap seçin
              </option>

              {accounts.map((account) => (
                <option
                  key={account.id}
                  value={account.id}
                >
                  {account.name} ·{' '}
                  {account.currency}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tutar">
            <input
              required
              min="0.01"
              step="0.01"
              type="number"
              value={form.amount}
              onChange={(event) =>
                set(
                  'amount',
                  event.target.value
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Para Birimi">
            <input
              readOnly
              value={form.currency}
              className={`${inputClass} bg-gray-50 dark:bg-white/[0.025]`}
            />
          </Field>

          {form.currency !==
            form.base_currency && (
            <Field
              label={`${form.currency}/${form.base_currency} Kuru`}
              hint="Baz tutarın doğru hesaplanması için zorunludur."
            >
              <input
                required
                min="0.0000000001"
                step="0.000001"
                type="number"
                value={form.fx_rate}
                onChange={(event) =>
                  set(
                    'fx_rate',
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>
          )}

          <Field label="İşlem Tarihi">
            <input
              required
              type="datetime-local"
              value={form.transaction_date}
              onChange={(event) =>
                set(
                  'transaction_date',
                  event.target.value
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Ödeme Yöntemi">
            <Select
              value={form.payment_method}
              onChange={(event) =>
                set(
                  'payment_method',
                  event.target.value
                )
              }
            >
              <option value="bank_transfer">
                Banka Havalesi
              </option>
              <option value="cash">
                Nakit
              </option>
              <option value="credit_card">
                Kredi Kartı
              </option>
              <option value="check">
                Çek
              </option>
              <option value="other">
                Diğer
              </option>
            </Select>
          </Field>

          <Field
            label="Açıklama"
            full
          >
            <textarea
              value={form.description}
              onChange={(event) =>
                set(
                  'description',
                  event.target.value
                )
              }
              rows="3"
              className={`${inputClass} h-auto py-3`}
            />
          </Field>

          <Field
            label="Harici Referans"
            full
          >
            <input
              value={
                form.external_reference
              }
              onChange={(event) =>
                set(
                  'external_reference',
                  event.target.value
                )
              }
              placeholder="Banka işlem no, dekont referansı vb."
              className={inputClass}
            />
          </Field>
        </div>

        {hasContext && (
          <section className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.025]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Alacak Mahsupları
                </h3>

                <p className="text-xs text-gray-400">
                  Seçili bağlama ve aynı para
                  birimine ait açık tahakkuklar.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={autoAllocate}
                disabled={
                  Number(form.amount) <= 0 ||
                  !receivables.length
                }
              >
                Eskiden Yeniye Otomatik Mahsup
              </Button>
            </div>

            <div className="space-y-2">
              {receivables.map(
                (receivable) => (
                  <div
                    key={receivable.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl bg-white p-3 dark:bg-white/[0.035]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {
                          receivable.reference_no
                        }{' '}
                        ·{' '}
                        {
                          receivable.description
                        }
                      </p>

                      <p className="text-xs text-gray-400">
                        Açık:{' '}
                        {money(
                          receivable.open_balance,
                          receivable.currency
                        )}
                      </p>
                    </div>

                    <input
                      type="number"
                      min="0"
                      max={
                        receivable.open_balance
                      }
                      step="0.01"
                      value={
                        form.allocations[
                          receivable.id
                        ] || ''
                      }
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            allocations: {
                              ...current.allocations,
                              [receivable.id]:
                                event.target
                                  .value,
                            },
                          })
                        )
                      }
                      className={`${inputClass} w-36`}
                    />
                  </div>
                )
              )}

              {(receivablesQ.isLoading ||
                partialQ.isLoading) && (
                <p className="py-5 text-center text-sm text-gray-400">
                  Açık tahakkuklar
                  yükleniyor...
                </p>
              )}

              {!receivablesQ.isLoading &&
                !partialQ.isLoading &&
                !receivables.length && (
                  <p className="py-5 text-center text-sm text-gray-400">
                    Bu bağlama ait açık
                    tahakkuk yok.
                  </p>
                )}
            </div>

            <div
              className={`mt-4 flex flex-wrap justify-between gap-2 rounded-xl p-3 text-sm ${
                allocated >
                Number(form.amount || 0)
                  ? 'bg-red-50 text-red-700 dark:bg-red-500/10'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10'
              }`}
            >
              <span>
                Mahsup:{' '}
                <b>
                  {money(
                    allocated,
                    form.currency
                  )}
                </b>
              </span>

              <span>
                Avans / mahsupsuz kalan:{' '}
                <b>
                  {money(
                    remaining,
                    form.currency
                  )}
                </b>
              </span>
            </div>
          </section>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate('/finance')
            }
          >
            Vazgeç
          </Button>

          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={
              !hasContext ||
              !form.account_id ||
              totalAmount <= 0 ||
              allocated > totalAmount
            }
          >
            <Save className="h-4 w-4" />
            Tahsilatı Kaydet
          </Button>
        </div>
      </form>
    </div>
  );
}