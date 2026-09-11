import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  FileDown,
  Landmark,
  Settings2,
  Plus,
  RefreshCw,
  Search,
  WalletCards,
  FileSignature,
  ReceiptText,
  Receipt,
  ArrowRightLeft,
} from 'lucide-react';

import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Table from '../../components/ui/Table.jsx';

import { useAuth } from '../../app/providers/auth.provider.jsx';

import {
  hasPermission,
  PERMISSION_KEYS,
} from '../../constants/roles.js';

import {
  useFinanceAccounts,
  useFinanceBalances,
  useFinanceDashboard,
  useFinanceLedger,
  useFeeAgreements,
  useReceivables,
  useFinancePaymentPlans,
  useFinanceExpenses,
} from '../../features/finance-v2/finance-v2.query.js';

import financeV2Api from '../../features/finance-v2/finance-v2.api.js';

import {
  dateTR,
  money,
  rowsOf,
  statusLabel,
  transactionLabel,
  accountTypeLabel,
  billingModelLabel,
  expenseTypeLabel,
} from '../../features/finance-v2/finance-v2.format.js';

import toast from 'react-hot-toast';

const tabs = [
  ['dashboard', 'Genel Bakış'],
  ['receivables', 'Alacaklar'],
  ['ledger', 'Hareketler'],
  ['agreements', 'Ücret Anlaşmaları'],
  ['plans', 'Ödeme Planları'],
  ['expenses', 'Giderler'],
  ['accounts', 'Kasa & Banka'],
];

const badgeVariant = (status) =>
  status === 'posted' ||
  status === 'paid' ||
  status === 'active' ||
  status === 'completed'
    ? 'success'
    : status === 'partially_paid' ||
        status === 'draft'
      ? 'warning'
      : status === 'reversed' ||
          status === 'cancelled'
        ? 'danger'
        : 'default';

const agingTotal = (row) =>
  [
    'current',
    'd1_30',
    'd31_60',
    'd61_90',
    'd90_plus',
  ].reduce(
    (sum, k) =>
      sum + Number(row?.[k] || 0),
    0
  );

const overdueTotal = (row) =>
  [
    'd1_30',
    'd31_60',
    'd61_90',
    'd90_plus',
  ].reduce(
    (sum, k) =>
      sum + Number(row?.[k] || 0),
    0
  );

export default function FinanceV2Center() {
  const [exportFormat, setExportFormat] = useState('xlsx');
  const navigate = useNavigate();
  const { user } = useAuth();

  const canReports = hasPermission(
    user,
    PERMISSION_KEYS.VIEW_FINANCE_REPORTS
  );

  const [tab, setTab] = useState(
    canReports ? 'dashboard' : 'ledger'
  );

  const [currency, setCurrency] =
    useState('TRY');

  const [page, setPage] = useState(0);

  const [search, setSearch] =
    useState('');

  const deferredSearch =
    useDeferredValue(search);

  const [
    ledgerFilters,
    setLedgerFilters,
  ] = useState({
    from: '',
    to: '',
    transaction_type: '',
    status: '',
  });

  const canAll = hasPermission(
    user,
    PERMISSION_KEYS.VIEW_ALL_FINANCE
  );

  const canExport = hasPermission(
    user,
    PERMISSION_KEYS.EXPORT_FINANCE
  );

  const canRecord = hasPermission(
    user,
    PERMISSION_KEYS.RECORD_PAYMENTS
  );

  const canAgreement = hasPermission(
    user,
    PERMISSION_KEYS.MANAGE_FEE_AGREEMENTS
  );

  const canReceivable = hasPermission(
    user,
    PERMISSION_KEYS.CREATE_RECEIVABLES
  );

  const canExpense = hasPermission(
    user,
    PERMISSION_KEYS.CREATE_EXPENSES
  );

  const canTransfer = hasPermission(
    user,
    PERMISSION_KEYS.MANAGE_FINANCE_ACCOUNTS
  );

  const canPlans = hasPermission(
    user,
    PERMISSION_KEYS.MANAGE_PAYMENT_PLANS
  );

  const dashboardQ =
    useFinanceDashboard({}, canReports);

  const ledgerQ = useFinanceLedger({
    limit: 25,
    offset: page * 25,
    currency: currency || undefined,
    search:
      deferredSearch || undefined,
    from:
      ledgerFilters.from || undefined,
    to:
      ledgerFilters.to || undefined,
    transaction_type:
      ledgerFilters.transaction_type ||
      undefined,
    status:
      ledgerFilters.status || undefined,
  });

  const receivablesQ =
    useReceivables({
      limit: 50,
      offset: 0,
      currency:
        currency || undefined,
    });

  const agreementsQ =
    useFeeAgreements({
      limit: 50,
      offset: 0,
      currency:
        currency || undefined,
    });

  const plansQ =
    useFinancePaymentPlans({
      limit: 50,
      offset: 0,
    });

  const expensesQ =
    useFinanceExpenses({
      limit: 50,
      offset: 0,
      currency:
        currency || undefined,
    });

  const accountsQ =
    useFinanceAccounts();

  const balancesQ =
    useFinanceBalances(
      canAll && canReports
    );

  const dashboard =
    dashboardQ.data || {};

  const cashflow =
    dashboard.cashflow_by_currency ||
    [];

  const aging =
    dashboard.aging_by_currency || [];

  const flow =
    cashflow.find(
      (x) =>
        x.currency === currency
    ) || {};

  const age =
    aging.find(
      (x) =>
        x.currency === currency
    ) || {};

  const ledger =
    rowsOf(ledgerQ.data);

  const receivables =
    rowsOf(receivablesQ.data);

  const agreements =
    rowsOf(agreementsQ.data);

  const plans =
    rowsOf(plansQ.data);

  const expenses =
    rowsOf(expensesQ.data);

  const accounts =
    rowsOf(accountsQ.data);

  const balances =
    rowsOf(balancesQ.data);

  const currencies = useMemo(
    () =>
      Array.from(
        new Set([
          'TRY',
          ...cashflow.map(
            (x) => x.currency
          ),
          ...aging.map(
            (x) => x.currency
          ),
        ])
      ).filter(Boolean),
    [cashflow, aging]
  );

  const loading =
    dashboardQ.isLoading;

  const refresh = () =>
    [
      dashboardQ,
      ledgerQ,
      receivablesQ,
      agreementsQ,
      plansQ,
      expensesQ,
      accountsQ,
      balancesQ,
    ].forEach((q) =>
      q.refetch?.()
    );

  const exportFinance = async () => {
    try {
      const res =
        await financeV2Api.exportLedger({
          currency:
            currency || undefined,
          search:
            deferredSearch ||
            undefined,
          from:
            ledgerFilters.from ||
            dashboard?.period?.from ||
            undefined,
          to:
            ledgerFilters.to ||
            dashboard?.period?.to ||
            undefined,
          transaction_type:
            ledgerFilters.transaction_type ||
            undefined,
          status:
            ledgerFilters.status ||
            undefined,
        }, exportFormat);

      const url =
        URL.createObjectURL(
          res.data
        );

      const a =
        document.createElement('a');

      a.href = url;

      a.download =
        `derkenar-finans-hareketleri-${new Date()
          .toISOString()
          .slice(0, 10)}.${exportFormat}`;

      a.click();

      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(
        e?.response?.data
          ?.message ||
          'Dışa aktarma başarısız'
      );
    }
  };

  if (
    canReports &&
    dashboardQ.error
  ) {
    return (
      <div className="py-16 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />

        <h2 className="mt-3 text-xl font-semibold">
          Finans merkezi yüklenemedi
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {dashboardQ.error
            ?.response?.data
            ?.message ||
            dashboardQ.error
              .message}
        </p>

        <Button
          className="mt-4"
          onClick={refresh}
        >
          Yeniden Dene
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10">
            <WalletCards className="h-6 w-6 text-blue-600" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Finans Merkezi
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Tahakkuk, tahsilat,
              masraf, ödeme planı
              ve kasa/banka
              hareketlerinin tek
              finans kaynağı.
            </p>

            <p className="mt-2 text-xs text-gray-400">
              Görünüm:{' '}
              {dashboard.scope ===
              'firm'
                ? 'Firma geneli'
                : 'Erişebildiğiniz dosyalar'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(canAll ||
            canReports) && (
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  '/finance/controls'
                )
              }
            >
              <Settings2 className="h-4 w-4" />
              Kontroller
            </Button>
          )}

          <Button
            variant="outline"
            onClick={refresh}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Yenile
          </Button>

          {canExport && (
            <div className="flex items-center gap-2">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-400 dark:border-white/[0.08] dark:bg-[#0b1b33] dark:text-gray-200"
                aria-label="Dışa aktarma biçimi"
              >
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="pdf">PDF (.pdf)</option>
                <option value="csv">CSV (.csv)</option>
              </select>
              <Button variant="outline" onClick={exportFinance}>
                <FileDown className="h-4 w-4" />
                Dışa Aktar
              </Button>
            </div>
          )}

          {canAgreement && (
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  '/finance/agreements/create'
                )
              }
            >
              <FileSignature className="h-4 w-4" />
              Ücret Anlaşması
            </Button>
          )}

          {canReceivable && (
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  '/finance/receivables/create'
                )
              }
            >
              <ReceiptText className="h-4 w-4" />
              Tahakkuk
            </Button>
          )}

          {canExpense && (
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  '/finance/expenses/create'
                )
              }
            >
              <Receipt className="h-4 w-4" />
              Gider
            </Button>
          )}

          {canTransfer && (
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  '/finance/transfers/create'
                )
              }
            >
              <ArrowRightLeft className="h-4 w-4" />
              Transfer
            </Button>
          )}

          {canPlans && (
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  '/finance/plans/create'
                )
              }
            >
              <CalendarClock className="h-4 w-4" />
              Ödeme Planı
            </Button>
          )}

          {canRecord && (
            <Button
              onClick={() =>
                navigate(
                  '/finance/create'
                )
              }
            >
              <Plus className="h-4 w-4" />
              Tahsilat
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {tabs
            .filter(
              ([id]) =>
                id !==
                  'dashboard' ||
                canReports
            )
            .map(
              ([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    setTab(id)
                  }
                  className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    tab === id
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  {label}
                </button>
              )
            )}
        </div>

        <select
          value={currency}
          onChange={(e) =>
            setCurrency(
              e.target.value
            )
          }
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200"
        >
          {currencies.map(
            (c) => (
              <option
                key={c}
                value={c}
              >
                {c}
              </option>
            )
          )}
        </select>
      </div>

      {tab ===
        'dashboard' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={
                ArrowDownLeft
              }
              label="Dönem Tahsilatı"
              value={money(
                flow.receipts,
                currency
              )}
              hint={`${
                dashboard.period
                  ?.from || '-'
              } – ${
                dashboard.period
                  ?.to || '-'
              }`}
            />

            <Metric
              icon={ArrowUpRight}
              label="Dönem Gideri"
              value={money(
                flow.expenses,
                currency
              )}
              hint="Nakit çıkışları"
            />

            <Metric
              icon={
                CircleDollarSign
              }
              label="Açık Alacak"
              value={money(
                agingTotal(age),
                currency
              )}
              hint="Tahakkuk edilmiş bakiye"
            />

            <Metric
              icon={
                CalendarClock
              }
              label="Vadesi Geçmiş"
              value={money(
                overdueTotal(age),
                currency
              )}
              hint="1 gün ve üzeri gecikme"
              danger={
                overdueTotal(age) >
                0
              }
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33]">
              <div className="mb-5">
                <h2 className="font-bold text-gray-900 dark:text-white">
                  Alacak
                  Yaşlandırma
                </h2>

                <p className="text-xs text-gray-500">
                  Vadesine göre
                  açık alacak
                  dağılımı
                </p>
              </div>

              <div className="space-y-3">
                <Aging
                  label="Cari / Vadesi Gelmemiş"
                  value={
                    age.current
                  }
                  currency={
                    currency
                  }
                />

                <Aging
                  label="1–30 Gün"
                  value={
                    age.d1_30
                  }
                  currency={
                    currency
                  }
                />

                <Aging
                  label="31–60 Gün"
                  value={
                    age.d31_60
                  }
                  currency={
                    currency
                  }
                />

                <Aging
                  label="61–90 Gün"
                  value={
                    age.d61_90
                  }
                  currency={
                    currency
                  }
                />

                <Aging
                  label="90+ Gün"
                  value={
                    age.d90_plus
                  }
                  currency={
                    currency
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33]">
              <h2 className="font-bold text-gray-900 dark:text-white">
                Son Hareketler
              </h2>

              <div className="mt-3 divide-y divide-gray-100 dark:divide-white/[0.06]">
                {ledger
                  .slice(0, 7)
                  .map(
                    (x) => (
                      <div
                        key={x.id}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-800 dark:text-slate-200">
                            {transactionLabel(
                              x.transaction_type
                            )}{' '}
                            ·{' '}
                            {
                              x.reference_no
                            }
                          </p>

                          <p className="truncate text-xs text-gray-400">
                            {x.description ||
                              x.account_name ||
                              '-'}{' '}
                            ·{' '}
                            {dateTR(
                              x.transaction_date
                            )}
                          </p>
                        </div>

                        <p
                          className={`whitespace-nowrap text-sm font-bold ${
                            x.direction ===
                            'in'
                              ? 'text-emerald-600'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {x.direction ===
                          'in'
                            ? '+'
                            : '−'}
                          {money(
                            x.amount,
                            x.currency
                          )}
                        </p>
                      </div>
                    )
                  )}

                {ledger.length ===
                  0 && (
                  <Empty text="Henüz finans hareketi yok." />
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {tab === 'ledger' && (
        <section className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/[0.07] dark:bg-[#0b1b33] md:grid-cols-2 xl:grid-cols-[minmax(250px,1fr)_160px_160px_180px_160px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

              <input
                value={search}
                onChange={(e) => {
                  setSearch(
                    e.target.value
                  );
                  setPage(0);
                }}
                placeholder="Referans, açıklama veya hesap ara"
                className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
              />
            </div>

            <input
              type="date"
              value={
                ledgerFilters.from
              }
              onChange={(e) => {
                setLedgerFilters(
                  (x) => ({
                    ...x,
                    from:
                      e.target
                        .value,
                  })
                );

                setPage(0);
              }}
              className="h-10 rounded-xl border border-gray-200 px-3 text-sm dark:border-white/[0.08] dark:bg-white/[0.04]"
            />

            <input
              type="date"
              value={ledgerFilters.to}
              onChange={(e) => {
                setLedgerFilters(
                  (x) => ({
                    ...x,
                    to:
                      e.target
                        .value,
                  })
                );

                setPage(0);
              }}
              className="h-10 rounded-xl border border-gray-200 px-3 text-sm dark:border-white/[0.08] dark:bg-white/[0.04]"
            />

            <select
              value={
                ledgerFilters.transaction_type
              }
              onChange={(e) => {
                setLedgerFilters(
                  (x) => ({
                    ...x,
                    transaction_type:
                      e.target
                        .value,
                  })
                );

                setPage(0);
              }}
              className="h-10 rounded-xl border border-gray-200 px-3 text-sm dark:border-white/[0.08] dark:bg-white/[0.04]"
            >
              <option value="">
                Tüm işlem türleri
              </option>
              <option value="receipt">
                Tahsilat
              </option>
              <option value="refund">
                İade
              </option>
              <option value="expense">
                Gider
              </option>
              <option value="transfer_in">
                Transfer Giriş
              </option>
              <option value="transfer_out">
                Transfer Çıkış
              </option>
              <option value="reversal">
                Ters Kayıt
              </option>
            </select>

            <select
              value={
                ledgerFilters.status
              }
              onChange={(e) => {
                setLedgerFilters(
                  (x) => ({
                    ...x,
                    status:
                      e.target
                        .value,
                  })
                );

                setPage(0);
              }}
              className="h-10 rounded-xl border border-gray-200 px-3 text-sm dark:border-white/[0.08] dark:bg-white/[0.04]"
            >
              <option value="">
                Tüm durumlar
              </option>
              <option value="posted">
                Post Edilmiş
              </option>
              <option value="reversed">
                Ters Kayıtlı
              </option>
              <option value="cancelled">
                İptal
              </option>
            </select>

            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setLedgerFilters({
                  from: '',
                  to: '',
                  transaction_type:
                    '',
                  status: '',
                });
                setPage(0);
              }}
            >
              Temizle
            </Button>
          </div>

          <LedgerTable
            rows={ledger}
            navigate={navigate}
          />

          <Pager
            total={
              ledgerQ.data
                ?.total || 0
            }
            page={page}
            setPage={setPage}
          />
        </section>
      )}

      {tab ===
        'receivables' && (
        <ReceivableTable
          rows={receivables}
          navigate={navigate}
        />
      )}

      {tab ===
        'agreements' && (
        <AgreementTable
          rows={agreements}
          navigate={navigate}
        />
      )}

      {tab === 'plans' && (
        <PlanTable
          rows={plans}
          navigate={navigate}
        />
      )}

      {tab ===
        'expenses' && (
        <ExpenseTable
          rows={expenses}
          navigate={navigate}
        />
      )}

      {tab ===
        'accounts' && (
        <AccountTable
          rows={accounts}
          balances={balances}
          canAll={canAll}
        />
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  danger,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
            {label}
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              danger
                ? 'text-amber-600'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {value}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            {hint}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-white/[0.04]">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
      </div>
    </div>
  );
}

function Aging({
  label,
  value,
  currency,
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.035]">
      <span className="text-sm text-gray-600 dark:text-slate-300">
        {label}
      </span>

      <strong className="text-sm text-gray-900 dark:text-white">
        {money(
          value,
          currency
        )}
      </strong>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="py-10 text-center text-sm text-gray-400">
      {text}
    </div>
  );
}

function LedgerTable({
  rows,
  navigate,
}) {
  return (
    <Table>
      <Table.Head>
        <Table.Row hover={false}>
          <Table.HeadCell>
            Referans
          </Table.HeadCell>
          <Table.HeadCell>
            Tür
          </Table.HeadCell>
          <Table.HeadCell>
            Tarih
          </Table.HeadCell>
          <Table.HeadCell>
            Hesap
          </Table.HeadCell>
          <Table.HeadCell>
            Durum
          </Table.HeadCell>
          <Table.HeadCell className="text-right">
            Tutar
          </Table.HeadCell>
        </Table.Row>
      </Table.Head>

      <Table.Body>
        {rows.map((x) => (
          <Table.Row
            key={x.id}
            onClick={() =>
              navigate(
                `/finance/transactions/${x.id}`
              )
            }
            className="cursor-pointer"
          >
            <Table.Cell className="font-semibold text-blue-600">
              {x.reference_no}
            </Table.Cell>

            <Table.Cell>
              {transactionLabel(
                x.transaction_type
              )}
            </Table.Cell>

            <Table.Cell>
              {dateTR(
                x.transaction_date
              )}
            </Table.Cell>

            <Table.Cell>
              {x.account_name ||
                x.account_code ||
                '-'}
            </Table.Cell>

            <Table.Cell>
              <Badge
                variant={badgeVariant(
                  x.status
                )}
              >
                {statusLabel(
                  x.status
                )}
              </Badge>
            </Table.Cell>

            <Table.Cell
              className={`text-right font-bold ${
                x.direction ===
                'in'
                  ? 'text-emerald-600'
                  : ''
              }`}
            >
              {x.direction ===
              'in'
                ? '+'
                : '−'}
              {money(
                x.amount,
                x.currency
              )}
            </Table.Cell>
          </Table.Row>
        ))}

        {rows.length ===
          0 && (
          <tr>
            <td colSpan="6">
              <Empty text="Kayıt bulunamadı." />
            </td>
          </tr>
        )}
      </Table.Body>
    </Table>
  );
}

function ReceivableTable({
  rows,
  navigate,
}) {
  return (
    <Table>
      <Table.Head>
        <Table.Row hover={false}>
          <Table.HeadCell>
            Referans
          </Table.HeadCell>
          <Table.HeadCell>
            Açıklama
          </Table.HeadCell>
          <Table.HeadCell>
            Vade
          </Table.HeadCell>
          <Table.HeadCell>
            Durum
          </Table.HeadCell>
          <Table.HeadCell className="text-right">
            Tutar
          </Table.HeadCell>
          <Table.HeadCell className="text-right">
            Açık
          </Table.HeadCell>
        </Table.Row>
      </Table.Head>

      <Table.Body>
        {rows.map((x) => (
          <Table.Row
            key={x.id}
            onClick={() =>
              navigate(
                `/finance/receivables/${x.id}`
              )
            }
            className="cursor-pointer"
          >
            <Table.Cell className="font-semibold text-blue-600">
              {x.reference_no}
            </Table.Cell>

            <Table.Cell>
              {x.description ||
                '-'}
            </Table.Cell>

            <Table.Cell>
              {dateTR(x.due_date)}
            </Table.Cell>

            <Table.Cell>
              <Badge
                variant={badgeVariant(
                  x.status
                )}
              >
                {statusLabel(
                  x.status
                )}
              </Badge>
            </Table.Cell>

            <Table.Cell className="text-right">
              {money(
                x.amount,
                x.currency
              )}
            </Table.Cell>

            <Table.Cell className="text-right font-bold">
              {money(
                x.open_balance,
                x.currency
              )}
            </Table.Cell>
          </Table.Row>
        ))}

        {rows.length ===
          0 && (
          <tr>
            <td colSpan="6">
              <Empty text="Alacak kaydı yok." />
            </td>
          </tr>
        )}
      </Table.Body>
    </Table>
  );
}

function AgreementTable({
  rows,
  navigate,
}) {
  return (
    <Table>
      <Table.Head>
        <Table.Row hover={false}>
          <Table.HeadCell>
            Referans
          </Table.HeadCell>
          <Table.HeadCell>
            Başlık
          </Table.HeadCell>
          <Table.HeadCell>
            Model
          </Table.HeadCell>
          <Table.HeadCell>
            Durum
          </Table.HeadCell>
          <Table.HeadCell className="text-right">
            Anlaşılan Ücret
          </Table.HeadCell>
        </Table.Row>
      </Table.Head>

      <Table.Body>
        {rows.map((x) => (
          <Table.Row
            key={x.id}
            onClick={() =>
              navigate(
                `/finance/agreements/${x.id}`
              )
            }
            className="cursor-pointer"
          >
            <Table.Cell className="font-semibold text-blue-600">
              {x.reference_no}
            </Table.Cell>

            <Table.Cell>
              {x.title || '-'}
            </Table.Cell>

            <Table.Cell>
              {billingModelLabel(
                x.billing_model
              )}
            </Table.Cell>

            <Table.Cell>
              <Badge
                variant={badgeVariant(
                  x.status
                )}
              >
                {statusLabel(
                  x.status
                )}
              </Badge>
            </Table.Cell>

            <Table.Cell className="text-right font-bold">
              {money(
                x.agreed_amount,
                x.currency
              )}
            </Table.Cell>
          </Table.Row>
        ))}

        {rows.length ===
          0 && (
          <tr>
            <td colSpan="5">
              <Empty text="Ücret anlaşması yok." />
            </td>
          </tr>
        )}
      </Table.Body>
    </Table>
  );
}

function PlanTable({
  rows,
  navigate,
}) {
  return (
    <Table>
      <Table.Head>
        <Table.Row hover={false}>
          <Table.HeadCell>
            Referans
          </Table.HeadCell>
          <Table.HeadCell>
            Plan
          </Table.HeadCell>
          <Table.HeadCell>
            Başlangıç
          </Table.HeadCell>
          <Table.HeadCell>
            Durum
          </Table.HeadCell>
          <Table.HeadCell className="text-right">
            Toplam
          </Table.HeadCell>
        </Table.Row>
      </Table.Head>

      <Table.Body>
        {rows.map((x) => (
          <Table.Row
            key={x.id}
            onClick={() =>
              navigate(
                `/finance/plans/${x.id}`
              )
            }
            className="cursor-pointer"
          >
            <Table.Cell className="font-semibold text-blue-600">
              {x.reference_no}
            </Table.Cell>

            <Table.Cell>
              {x.title || '-'}
            </Table.Cell>

            <Table.Cell>
              {x.start_date
                ? dateTR(
                    x.start_date
                  )
                : '-'}
            </Table.Cell>

            <Table.Cell>
              <Badge
                variant={badgeVariant(
                  x.status
                )}
              >
                {statusLabel(
                  x.status
                )}
              </Badge>
            </Table.Cell>

            <Table.Cell className="text-right font-bold">
              {money(
                x.total_amount,
                x.currency
              )}
            </Table.Cell>
          </Table.Row>
        ))}

        {rows.length ===
          0 && (
          <tr>
            <td colSpan="5">
              <Empty text="Ödeme planı yok." />
            </td>
          </tr>
        )}
      </Table.Body>
    </Table>
  );
}

function AccountTable({
  rows,
  balances,
  canAll,
}) {
  const balanceMap =
    new Map(
      balances.map((x) => [
        x.id,
        x,
      ])
    );

  return (
    <Table>
      <Table.Head>
        <Table.Row hover={false}>
          <Table.HeadCell>
            Kod
          </Table.HeadCell>

          <Table.HeadCell>
            Hesap
          </Table.HeadCell>

          <Table.HeadCell>
            Tür
          </Table.HeadCell>

          <Table.HeadCell>
            Para Birimi
          </Table.HeadCell>

          {canAll && (
            <Table.HeadCell className="text-right">
              Bakiye
            </Table.HeadCell>
          )}
        </Table.Row>
      </Table.Head>

      <Table.Body>
        {rows.map((x) => (
          <Table.Row key={x.id}>
            <Table.Cell className="font-semibold">
              {x.code}
            </Table.Cell>

            <Table.Cell className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-gray-400" />
              {x.name}
            </Table.Cell>

            <Table.Cell>
              {accountTypeLabel(
                x.account_type
              )}
            </Table.Cell>

            <Table.Cell>
              {x.currency}
            </Table.Cell>

            {canAll && (
              <Table.Cell className="text-right font-bold">
                {money(
                  balanceMap.get(
                    x.id
                  )?.balance,
                  x.currency
                )}
              </Table.Cell>
            )}
          </Table.Row>
        ))}

        {rows.length ===
          0 && (
          <tr>
            <td
              colSpan={
                canAll ? 5 : 4
              }
            >
              <Empty text="Finans hesabı yok." />
            </td>
          </tr>
        )}
      </Table.Body>
    </Table>
  );
}

function ExpenseTable({
  rows,
  navigate,
}) {
  return (
    <Table>
      <Table.Head>
        <Table.Row hover={false}>
          <Table.HeadCell>
            Referans
          </Table.HeadCell>

          <Table.HeadCell>
            Açıklama
          </Table.HeadCell>

          <Table.HeadCell>
            Tür
          </Table.HeadCell>

          <Table.HeadCell>
            Tarih
          </Table.HeadCell>

          <Table.HeadCell>
            Durum
          </Table.HeadCell>

          <Table.HeadCell className="text-right">
            Tutar
          </Table.HeadCell>
        </Table.Row>
      </Table.Head>

      <Table.Body>
        {rows.map((x) => (
          <Table.Row
            key={x.id}
            onClick={() =>
              navigate(
                `/finance/expenses/${x.id}`
              )
            }
            className="cursor-pointer"
          >
            <Table.Cell className="font-semibold text-blue-600">
              {x.reference_no}
            </Table.Cell>

            <Table.Cell>
              {x.description ||
                '-'}
            </Table.Cell>

            <Table.Cell>
              {expenseTypeLabel(x.expense_type)}
            </Table.Cell>

            <Table.Cell>
              {dateTR(
                x.expense_date
              )}
            </Table.Cell>

            <Table.Cell>
              <Badge
                variant={badgeVariant(
                  x.status
                )}
              >
                {statusLabel(
                  x.status
                )}
              </Badge>
            </Table.Cell>

            <Table.Cell className="text-right font-bold">
              {money(
                x.amount,
                x.currency
              )}
            </Table.Cell>
          </Table.Row>
        ))}

        {rows.length ===
          0 && (
          <tr>
            <td colSpan="6">
              <Empty text="Gider kaydı yok." />
            </td>
          </tr>
        )}
      </Table.Body>
    </Table>
  );
}

function Pager({
  total,
  page,
  setPage,
}) {
  const max = Math.max(
    Math.ceil(total / 25) -
      1,
    0
  );

  return (
    <div className="flex items-center justify-between text-sm text-gray-500">
      <span>
        {total} kayıt
      </span>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 0}
          onClick={() =>
            setPage((p) =>
              Math.max(
                0,
                p - 1
              )
            )
          }
        >
          Önceki
        </Button>

        <span className="px-2 py-2">
          {page + 1} /{' '}
          {max + 1}
        </span>

        <Button
          size="sm"
          variant="outline"
          disabled={
            page >= max
          }
          onClick={() =>
            setPage((p) =>
              Math.min(
                max,
                p + 1
              )
            )
          }
        >
          Sonraki
        </Button>
      </div>
    </div>
  );
}