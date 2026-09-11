import { useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  LockKeyhole,
  Plus,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useAuth } from '../../app/providers/auth.provider.jsx';
import { hasPermission, PERMISSION_KEYS } from '../../constants/roles.js';
import {
  dateTR,
  money,
  rowsOf,
  statusLabel,
} from '../../features/finance-v2/finance-v2.format.js';

import {
  useCloseFinancePeriod,
  useCreateFinanceAccount,
  useFinanceAccounts,
  useFinancePeriods,
  useFinanceProfitability,
  useReopenFinancePeriod,
} from '../../features/finance-v2/finance-v2.query.js';

const box =
  'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33]';

export default function FinanceControls() {
  const { user } = useAuth();

  const canAll = hasPermission(user, PERMISSION_KEYS.VIEW_ALL_FINANCE);
  const canProfit = hasPermission(user, PERMISSION_KEYS.VIEW_PROFITABILITY);
  const canReports = hasPermission(
    user,
    PERMISSION_KEYS.VIEW_FINANCE_REPORTS
  );
  const canAccounts = hasPermission(
    user,
    PERMISSION_KEYS.MANAGE_FINANCE_ACCOUNTS
  );
  const canClose = hasPermission(
    user,
    PERMISSION_KEYS.CLOSE_FINANCE_PERIOD
  );
  const canReopen = hasPermission(
    user,
    PERMISSION_KEYS.REOPEN_FINANCE_PERIOD
  );

  const profit = useFinanceProfitability({}, canProfit);
  const periodsQ = useFinancePeriods(canReports && canAll);
  const accounts = useFinanceAccounts();

  const createAccount = useCreateFinanceAccount();
  const close = useCloseFinancePeriod();
  const reopen = useReopenFinancePeriod();

  const [account, setAccount] = useState({
    code: '',
    name: '',
    account_type: 'bank',
    currency: 'TRY',
    opening_balance: '0',
  });

  const [period, setPeriod] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [reason, setReason] = useState('');

  const refreshPeriods = () => periodsQ.refetch?.();

  const handleCreateAccount = async (e) => {
    e.preventDefault();

    await createAccount.mutateAsync(account);

    setAccount((prev) => ({
      ...prev,
      code: '',
      name: '',
      opening_balance: '0',
    }));
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          className="h-10 w-10 shrink-0 p-0"
          aria-label="Geri dön"
          title="Geri dön"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div>
          <h1 className="text-2xl font-bold">
            Finans Kontrol Merkezi
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Hesap yönetimi, dönem kilidi ve nakit katkı analizi.
          </p>
        </div>
      </div>

      {/* PROFITABILITY */}
      {canProfit && (
        <section className={box}>
          <Title
            icon={BarChart3}
            t="Nakit Katkı Analizi"
            s="Tahsilat − iadeler − geri ödenmeyen giderler. Operasyonel nakit katkısıdır; resmi muhasebe kâr/zarar hesabı değildir."
          />

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(profit.data?.by_currency || []).map((x) => (
              <div
                key={x.currency}
                className="rounded-xl bg-gray-50 p-4 dark:bg-white/[.04]"
              >
                <b>{x.currency}</b>

                <p className="mt-2 text-2xl font-bold">
                  {money(x.net_cash_contribution, x.currency)}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Tahsilat {money(x.collected, x.currency)}
                  {' · '}
                  İade {money(x.refunds, x.currency)}
                  {' · '}
                  Gider {
                    money(
                      x.non_reimbursable_expenses,
                      x.currency
                    )
                  }
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ACCOUNT CREATE */}
      {canAccounts && (
        <section className={box}>
          <Title
            icon={Plus}
            t="Finans Hesabı Oluştur"
            s="Kasa/banka hesabı ve açılış bakiyesi."
          />

          <form
            className="mt-4 grid gap-3 md:grid-cols-5"
            onSubmit={handleCreateAccount}
          >
            <input
              required
              value={account.code}
              onChange={(e) =>
                setAccount((prev) => ({
                  ...prev,
                  code: e.target.value,
                }))
              }
              placeholder="Hesap kodu"
              className="h-10 rounded-xl border px-3 dark:bg-white/[.04]"
            />

            <input
              required
              value={account.name}
              onChange={(e) =>
                setAccount((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder="Hesap adı"
              className="h-10 rounded-xl border px-3 dark:bg-white/[.04]"
            />

            <input
              required
              type="number"
              step="0.0001"
              value={account.opening_balance}
              onChange={(e) =>
                setAccount((prev) => ({
                  ...prev,
                  opening_balance: e.target.value,
                }))
              }
              placeholder="Açılış bakiyesi"
              className="h-10 rounded-xl border px-3 dark:bg-white/[.04]"
            />

            <select
              value={account.account_type}
              onChange={(e) =>
                setAccount((prev) => ({
                  ...prev,
                  account_type: e.target.value,
                }))
              }
              className="h-10 rounded-xl border px-3 dark:bg-white/[.04]"
            >
              <option value="bank">Banka</option>
              <option value="cash">Kasa</option>
              <option value="pos">POS</option>
              <option value="clearing">
  Geçiş Hesabı
</option>
              <option value="other">Diğer</option>
            </select>

            <div className="flex gap-2">
              <select
                value={account.currency}
                onChange={(e) =>
                  setAccount((prev) => ({
                    ...prev,
                    currency: e.target.value,
                  }))
                }
                className="h-10 min-w-20 rounded-xl border px-2 dark:bg-white/[.04]"
              >
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>

              <Button
                type="submit"
                loading={createAccount.isPending}
              >
                Oluştur
              </Button>
            </div>
          </form>

          <div className="mt-4 text-xs text-gray-500">
            Aktif hesap: {rowsOf(accounts.data).length}
          </div>
        </section>
      )}

      {/* PERIOD CONTROL */}
      {(canClose || canReopen) && (
        <section className={box}>
          <Title
            icon={LockKeyhole}
            t="Dönem Kontrolü"
            s="Kapalı döneme finans hareketi yazılamaz. Yeniden açma gerekçesi audit'e kaydedilir."
          />

          <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto_auto]">
            <input
              type="month"
              value={period}
              onChange={(e) =>
                setPeriod(e.target.value)
              }
              className="h-10 rounded-xl border px-3 dark:bg-white/[.04]"
            />

            <input
              value={reason}
              onChange={(e) =>
                setReason(e.target.value)
              }
              placeholder="Yeniden açma gerekçesi"
              className="h-10 rounded-xl border px-3 dark:bg-white/[.04]"
            />

            {canClose && (
              <Button
                type="button"
                loading={close.isPending}
                onClick={async () => {
                  await close.mutateAsync({
                    period_key: period,
                  });

                  refreshPeriods();
                }}
              >
                <ShieldCheck className="h-4 w-4" />
                Dönemi Kapat
              </Button>
            )}

            {canReopen && (
              <Button
                type="button"
                variant="outline"
                disabled={!reason.trim()}
                loading={reopen.isPending}
                onClick={async () => {
                  await reopen.mutateAsync({
                    periodKey: period,
                    reason,
                  });

                  setReason('');
                  refreshPeriods();
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Yeniden Aç
              </Button>
            )}
          </div>

          {canReports && canAll && (
            <div className="mt-5 space-y-2">
              {rowsOf(periodsQ.data).map((x) => (
                <div
                  key={x.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-white/[.04]"
                >
                  <span>
                    <b>{x.period_key}</b>

                    <small className="ml-2 text-gray-400">
                      {dateTR(x.starts_on)} –{' '}
                      {dateTR(x.ends_on)}
                    </small>
                  </span>

                  <span className="flex items-center gap-2">
                    <Badge
                      variant={
                        x.status === 'closed'
                          ? 'danger'
                          : 'success'
                      }
                    >
                      {statusLabel(x.status)}
                    </Badge>

                    {x.reopen_reason && (
                      <small className="max-w-72 truncate text-gray-400">
                        {x.reopen_reason}
                      </small>
                    )}
                  </span>
                </div>
              ))}

              {rowsOf(periodsQ.data).length === 0 && (
                <p className="py-4 text-center text-sm text-gray-400">
                  Henüz dönem kaydı yok.
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Title({ icon: Icon, t, s }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-5 w-5 text-blue-600" />

      <div>
        <h2 className="font-bold">{t}</h2>
        <p className="text-xs text-gray-500">{s}</p>
      </div>
    </div>
  );
}
