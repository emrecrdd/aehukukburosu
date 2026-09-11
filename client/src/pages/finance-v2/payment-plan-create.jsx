import { useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarClock,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

import Button from '../../components/ui/Button.jsx';
import clientApi from '../../features/clients/client.api.js';
import consultationApi from '../../features/consultations/consultation.api.js';
import financeV2Api from '../../features/finance-v2/finance-v2.api.js';
import {
  FINANCE_V2_KEYS,
} from '../../features/finance-v2/finance-v2.query.js';
import toast from 'react-hot-toast';

const input =
  'h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-white';

const installment = (amount = '') => ({
  id: crypto.randomUUID(),
  title: '',
  amount,
  due_date: '',
});

const consultationName = (consultation) =>
  [
    consultation?.consultation_number,
    consultation?.title ||
      consultation?.subject,
  ]
    .filter(Boolean)
    .join(' · ') ||
  consultation?.id;

export default function FinanceV2PaymentPlanCreate() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] =
    useSearchParams();

  const feeAgreementId =
    searchParams.get(
      'fee_agreement_id'
    ) || '';

  const clientId =
    searchParams.get(
      'client_id'
    ) || '';

  const caseId =
    searchParams.get(
      'case_id'
    ) || '';

  const consultationId =
    searchParams.get(
      'consultation_id'
    ) || '';

  const currency =
    searchParams.get(
      'currency'
    ) || 'TRY';

  const amount =
    searchParams.get(
      'amount'
    ) || '';

  const agreementTitle =
    searchParams.get(
      'title'
    ) || '';

  const [form, setForm] =
    useState(() => ({
      fee_agreement_id:
        feeAgreementId,

      client_id:
        clientId,

      case_id:
        caseId,

      consultation_id:
        consultationId,

      title:
        agreementTitle
          ? `${agreementTitle} - Ödeme Planı`
          : '',

      description: '',

      currency,

      start_date: '',

      end_date: '',

      activate: true,

      installments: [
        installment(amount),
      ],
    }));

  const clientsQ = useQuery({
    queryKey: [
      'clients',
      'finance-v2-plan',
    ],

    queryFn: () =>
      clientApi.getAll({
        page: 1,
        limit: 100,
        status: 'active',
      }),

    staleTime: 300000,
  });

  const casesQ = useQuery({
    queryKey: [
      'clients',
      form.client_id,
      'finance-v2-plan-cases',
    ],

    queryFn: () =>
      clientApi.getCaseHistory(
        form.client_id
      ),

    enabled:
      Boolean(form.client_id),
  });

  const consultationsQ = useQuery({
    queryKey: [
      'consultations',
      'finance-v2-plan',
    ],

    queryFn: () =>
      consultationApi.getAll({
        page: 1,
        limit: 100,
      }),

    staleTime: 0,
    refetchOnMount: 'always',
  });

  const clients =
    Array.isArray(
      clientsQ.data
        ?.data
        ?.data
    )
      ? clientsQ.data.data.data
      : [];

  const cases = useMemo(() => {
    const data =
      casesQ.data?.data?.data ??
      casesQ.data?.data ??
      [];

    return Array.isArray(data)
      ? data
      : Array.isArray(data?.cases)
        ? data.cases
        : [];
  }, [casesQ.data]);

  const consultations = useMemo(() => {
    const data =
      consultationsQ.data?.data?.data ??
      consultationsQ.data?.data ??
      consultationsQ.data ??
      [];

    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.rows)) {
      return data.rows;
    }

    if (Array.isArray(data?.data)) {
      return data.data;
    }

    return [];
  }, [consultationsQ.data]);

  const total =
    form.installments.reduce(
      (sum, item) =>
        sum +
        (Number(
          item.amount
        ) || 0),
      0
    );

  const mutation =
    useMutation({
      mutationFn: (data) =>
        financeV2Api
          .createPaymentPlan(
            data
          ),

      onSuccess: () => {
        qc.invalidateQueries({
          queryKey:
            FINANCE_V2_KEYS.all,
        });

        toast.success(
          'Ödeme planı oluşturuldu'
        );

        if (
          form.fee_agreement_id
        ) {
          navigate(
            `/finance/agreements/${form.fee_agreement_id}`
          );
        } else {
          navigate(
            '/finance'
          );
        }
      },

      onError: (e) =>
        toast.error(
          e?.response?.data
            ?.message ||
            'Ödeme planı oluşturulamadı'
        ),
    });

  const update = (
    name,
    value
  ) =>
    setForm(
      (current) => ({
        ...current,

        [name]: value,

        ...(name ===
        'client_id'
          ? {
              case_id: '',
            }
          : {}),
      })
    );

  const updateInstallment = (
    id,
    name,
    value
  ) =>
    setForm(
      (current) => ({
        ...current,

        installments:
          current.installments.map(
            (item) =>
              item.id === id
                ? {
                    ...item,
                    [name]:
                      value,
                  }
                : item
          ),
      })
    );

  const submit = (e) => {
    e.preventDefault();

    const hasContext =
      Boolean(
        form.client_id
      ) ||
      Boolean(
        form.case_id
      ) ||
      Boolean(
        form.consultation_id
      );

    if (
      !hasContext ||
      !form.title ||
      !form.installments
        .length ||
      total <= 0
    ) {
      toast.error(
        'Müvekkil, dava veya danışmanlıktan en az biri ile plan başlığı ve taksit tutarlarını kontrol edin.'
      );

      return;
    }

    const hasInvalidInstallment =
      form.installments.some(
        (item) =>
          !item.due_date ||
          !item.amount ||
          Number(
            item.amount
          ) <= 0
      );

    if (
      hasInvalidInstallment
    ) {
      toast.error(
        'Her taksit için tutar ve vade girilmelidir.'
      );

      return;
    }

    mutation.mutate({
      fee_agreement_id:
        form.fee_agreement_id ||
        null,

      client_id:
        form.client_id ||
        null,

      case_id:
        form.case_id ||
        null,

      consultation_id:
        form.consultation_id ||
        null,

      title:
        form.title,

      description:
        form.description ||
        null,

      total_amount:
        total.toFixed(2),

      currency:
        form.currency,

      plan_type:
        'installment',

      start_date:
        form.start_date ||
        null,

      end_date:
        form.end_date ||
        null,

      activate:
        form.activate,

      installments:
        form.installments.map(
          (
            item,
            index
          ) => ({
            installment_number:
              index + 1,

            title:
              item.title ||
              `Taksit ${
                index + 1
              }`,

            amount:
              Number(
                item.amount
              ).toFixed(2),

            due_date:
              item.due_date,
          })
        ),
    });
  };

  const addInstallment = () => {
    setForm(
      (current) => ({
        ...current,

        installments: [
          ...current.installments,
          installment(),
        ],
      })
    );
  };

  const splitIntoThree =
    () => {
      if (
        !amount ||
        Number(amount) <= 0
      ) {
        return;
      }

      const totalAmount =
        Number(amount);

      const first =
        Math.floor(
          (totalAmount / 3) *
            100
        ) / 100;

      const second =
        first;

      const third =
        totalAmount -
        first -
        second;

      setForm(
        (current) => ({
          ...current,

          installments: [
            installment(
              first.toFixed(2)
            ),

            installment(
              second.toFixed(2)
            ),

            installment(
              third.toFixed(2)
            ),
          ],
        })
      );
    };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start gap-3">
        <Link
          to={
            feeAgreementId
              ? `/finance/agreements/${feeAgreementId}`
              : '/finance'
          }
          className="mt-1 rounded-xl border border-gray-200 p-2 text-gray-500 dark:border-white/[0.08]"
          aria-label="Geri dön"
          title="Geri dön"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Yeni Ödeme Planı
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Her taksit Finans
            modülü içinde ayrı
            bir alacak/tahakkuk
            kaydına bağlanır.
          </p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="space-y-6"
      >
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33]">
          <h2 className="mb-5 flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <CalendarClock className="h-5 w-5 text-blue-600" />
            Plan Bilgileri
          </h2>

          {feeAgreementId && (
            <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
              Bu ödeme planı
              aktif ücret
              anlaşmasına
              bağlanacaktır.
            </div>
          )}


          <div className="grid gap-5 md:grid-cols-2">
            <F label="Müvekkil">
              <select
                className={input}
                value={
                  form.client_id
                }
                onChange={(e) =>
                  update(
                    'client_id',
                    e.target.value
                  )
                }
              >
                <option value="">
                  Bağlanmadı
                </option>

                {clients.map(
                  (c) => (
                    <option
                      key={c.id}
                      value={c.id}
                    >
                      {c.name ||
                        c.full_name ||
                        c.company_name ||
                        c.title ||
                        c.id}
                    </option>
                  )
                )}
              </select>
            </F>

            <F label="Dava">
              <select
                className={input}
                value={
                  form.case_id
                }
                disabled={
                  !form.client_id
                }
                onChange={(e) =>
                  update(
                    'case_id',
                    e.target.value
                  )
                }
              >
                <option value="">
                  {!form.client_id
                    ? 'Önce müvekkil seçin'
                    : 'Dava seçilmedi'}
                </option>

                {cases.map(
                  (c) => (
                    <option
                      key={c.id}
                      value={c.id}
                    >
                      {c.case_number ||
                        c.title ||
                        c.id}
                    </option>
                  )
                )}
              </select>
            </F>

            <F label="Danışmanlık">
              <select
                className={input}
                value={form.consultation_id}
                onChange={(e) =>
                  update(
                    'consultation_id',
                    e.target.value
                  )
                }
              >
                <option value="">
                  {consultationsQ.isLoading
                    ? 'Danışmanlıklar yükleniyor...'
                    : consultationsQ.isError
                      ? 'Danışmanlıklar yüklenemedi'
                      : 'Danışmanlık seçilmedi'}
                </option>

                {consultations.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {consultationName(c)}
                  </option>
                ))}
              </select>

              {consultationsQ.isError && (
                <p className="mt-1 text-xs text-red-500">
                  {consultationsQ.error?.response?.data?.message ||
                    'Danışmanlık listesi alınamadı.'}
                </p>
              )}
            </F>

            <F label="Plan Başlığı">
              <input
                required
                className={input}
                value={
                  form.title
                }
                onChange={(e) =>
                  update(
                    'title',
                    e.target.value
                  )
                }
              />
            </F>

            <F label="Para Birimi">
              <select
                className={input}
                value={
                  form.currency
                }
                onChange={(e) =>
                  update(
                    'currency',
                    e.target.value
                  )
                }
              >
                <option value="TRY">
                  TRY
                </option>

                <option value="USD">
                  USD
                </option>

                <option value="EUR">
                  EUR
                </option>

                <option value="GBP">
                  GBP
                </option>
              </select>
            </F>

            <F label="Başlangıç">
              <input
                type="date"
                className={input}
                value={
                  form.start_date
                }
                onChange={(e) =>
                  update(
                    'start_date',
                    e.target.value
                  )
                }
              />
            </F>

            <F label="Bitiş">
              <input
                type="date"
                className={input}
                value={
                  form.end_date
                }
                onChange={(e) =>
                  update(
                    'end_date',
                    e.target.value
                  )
                }
              />
            </F>

            <F
              label="Açıklama"
              full
            >
              <textarea
                rows="3"
                className={`${input} h-auto py-3`}
                value={
                  form.description
                }
                onChange={(e) =>
                  update(
                    'description',
                    e.target.value
                  )
                }
              />
            </F>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Taksitler
              </h2>

              <p className="text-xs text-gray-400">
                Toplam:{' '}
                {total.toLocaleString(
                  'tr-TR',
                  {
                    minimumFractionDigits:
                      2,
                  }
                )}{' '}
                {form.currency}
              </p>
            </div>

            <div className="flex gap-2">
              {amount &&
                Number(amount) >
                  0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={
                      splitIntoThree
                    }
                  >
                    3 Eşit Taksit
                  </Button>
                )}

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={
                  addInstallment
                }
              >
                <Plus className="h-4 w-4" />
                Taksit
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {form.installments.map(
              (
                item,
                index
              ) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.035] md:grid-cols-[70px_1fr_180px_180px_42px] md:items-end"
                >
                  <div className="text-sm font-bold text-gray-400">
                    #{index + 1}
                  </div>

                  <F label="Başlık">
                    <input
                      className={
                        input
                      }
                      value={
                        item.title
                      }
                      onChange={(
                        e
                      ) =>
                        updateInstallment(
                          item.id,
                          'title',
                          e.target
                            .value
                        )
                      }
                      placeholder={`Taksit ${
                        index +
                        1
                      }`}
                    />
                  </F>

                  <F label="Tutar">
                    <input
                      required
                      min="0.01"
                      step="0.01"
                      type="number"
                      className={
                        input
                      }
                      value={
                        item.amount
                      }
                      onChange={(
                        e
                      ) =>
                        updateInstallment(
                          item.id,
                          'amount',
                          e.target
                            .value
                        )
                      }
                    />
                  </F>

                  <F label="Vade">
                    <input
                      required
                      type="date"
                      className={
                        input
                      }
                      value={
                        item.due_date
                      }
                      onChange={(
                        e
                      ) =>
                        updateInstallment(
                          item.id,
                          'due_date',
                          e.target
                            .value
                        )
                      }
                    />
                  </F>

                  <button
                    type="button"
                    disabled={
                      form.installments
                        .length === 1
                    }
                    onClick={() =>
                      setForm(
                        (
                          current
                        ) => ({
                          ...current,

                          installments:
                            current.installments.filter(
                              (
                                x
                              ) =>
                                x.id !==
                                item.id
                            ),
                        })
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 disabled:opacity-30"
                    aria-label="Taksiti sil"
                    title="Taksiti sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            )}
          </div>
        </section>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={
                form.activate
              }
              onChange={(e) =>
                update(
                  'activate',
                  e.target
                    .checked
                )
              }
            />

            Oluşturunca
            tahakkukları
            aktifleştir
          </label>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(
                  feeAgreementId
                    ? `/finance/agreements/${feeAgreementId}`
                    : '/finance'
                )
              }
            >
              Vazgeç
            </Button>

            <Button
              type="submit"
              loading={
                mutation.isPending
              }
            >
              <Save className="h-4 w-4" />
              Planı Kaydet
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function F({
  label,
  children,
  full,
}) {
  return (
    <label
      className={`space-y-2 ${
        full
          ? 'md:col-span-2'
          : ''
      }`}
    >
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {label}
      </span>

      {children}
    </label>
  );
}