import {
  Ban,
  CheckCircle2,
  Play,
  TriangleAlert,
} from 'lucide-react';

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

import { useAuth } from '../../app/providers/auth.provider.jsx';
import {
  hasPermission,
  PERMISSION_KEYS,
} from '../../constants/roles.js';

import {
  useActivatePaymentPlan,
  useCancelPaymentPlan,
  useCompletePaymentPlan,
  useDefaultPaymentPlan,
  useFinanceAudit,
  useFinancePaymentPlan,
} from '../../features/finance-v2/finance-v2.query.js';

import {
  dateTR,
  money,
  statusLabel,
} from '../../features/finance-v2/finance-v2.format.js';

import {
  Header,
  AuditPanel,
} from './transaction-detail.jsx';

import ReasonActionModal
  from './components/ReasonActionModal.jsx';


const installmentStatusLabel = (status) => {
  const labels = {
    pending: 'Bekliyor',
    paid: 'Ödendi',
    overdue: 'Gecikmiş',
    cancelled: 'İptal',
    canceled: 'İptal',
  };

  return labels[status] || statusLabel(status);
};


export default function PaymentPlanDetailV2() {
  const { id } = useParams();
  const { user } = useAuth();

  const q = useFinancePaymentPlan(id);
  const auditQ = useFinanceAudit(
    'finance_payment_plan',
    id
  );

  const activate = useActivatePaymentPlan();
  const complete = useCompletePaymentPlan();
  const markDefault = useDefaultPaymentPlan();
  const cancel = useCancelPaymentPlan();

  const [action, setAction] = useState(null);

  const x = q.data || {};

  const canManage = hasPermission(
    user,
    PERMISSION_KEYS.MANAGE_PAYMENT_PLANS
  );

  if (q.isLoading) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">
        Yükleniyor…
      </div>
    );
  }

  const refresh = () => {
    q.refetch();
    auditQ.refetch();
  };

  const planPeriod = [
    x.start_date ? dateTR(x.start_date) : null,
    x.end_date ? dateTR(x.end_date) : null,
  ].filter(Boolean);

  const subtitle = [
    planPeriod.length
      ? planPeriod.join(' – ')
      : null,

    money(
      x.total_amount,
      x.currency
    ),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Header
        back="/finance"
        title={`${x.reference_no || ''} · ${
          x.title || 'Ödeme Planı'
        }`}
        subtitle={subtitle}
      />

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.07] dark:bg-[#0b1b33]">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-gray-400">
              Plan Toplamı
            </p>

            <p className="mt-2 text-3xl font-bold">
              {money(
                x.total_amount,
                x.currency
              )}
            </p>
          </div>

          <Badge
            variant={
              x.status === 'active'
                ? 'success'
                : x.status === 'draft'
                  ? 'warning'
                  : x.status === 'cancelled'
                    ? 'danger'
                    : 'default'
            }
          >
            {statusLabel(x.status)}
          </Badge>
        </div>

        {canManage && (
          <div className="mt-5 flex flex-wrap gap-2">
            {x.status === 'draft' && (
              <Button
                loading={activate.isPending}
                onClick={async () => {
                  await activate.mutateAsync(id);
                  refresh();
                }}
              >
                <Play className="h-4 w-4" />
                Planı Aktifleştir
              </Button>
            )}

            {x.status === 'active' && (
              <Button
                variant="outline"
                loading={complete.isPending}
                onClick={async () => {
                  await complete.mutateAsync(id);
                  refresh();
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                Tamamla
              </Button>
            )}

            {x.status === 'active' && (
              <Button
                variant="warning"
                onClick={() =>
                  setAction('default')
                }
              >
                <TriangleAlert className="h-4 w-4" />
                Temerrüt
              </Button>
            )}

            {[
              'draft',
              'active',
              'defaulted',
            ].includes(x.status) && (
              <Button
                variant="danger"
                onClick={() =>
                  setAction('cancel')
                }
              >
                <Ban className="h-4 w-4" />
                İptal
              </Button>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.07] dark:bg-[#0b1b33]">
        <h2 className="font-bold">
          Taksitler
        </h2>

        <div className="mt-3 space-y-2">
          {(x.installments || []).map(
            (i) => (
              <Link
                key={i.id}
                to={`/finance/receivables/${i.receivable_id}`}
                className="grid grid-cols-[50px_1fr_auto_auto] items-center gap-3 rounded-xl bg-gray-50 p-3 text-sm dark:bg-white/[0.035]"
              >
                <span className="font-bold">
                  #{i.installment_number}
                </span>

                <span>
                  {i.title ||
                    i.receivable_reference}
                </span>

                <span className="text-gray-400">
                  {dateTR(i.due_date)}
                </span>

                <span className="flex items-center gap-2">
                  <Badge
                    variant={
                      i.status === 'paid'
                        ? 'success'
                        : i.status ===
                            'overdue'
                          ? 'danger'
                          : 'default'
                    }
                  >
                    {installmentStatusLabel(
                      i.status
                    )}
                  </Badge>

                  <b>
                    {money(
                      i.amount,
                      i.currency
                    )}
                  </b>
                </span>
              </Link>
            )
          )}
        </div>
      </section>

      <AuditPanel
        rows={
          Array.isArray(auditQ.data)
            ? auditQ.data
            : []
        }
      />

      <ReasonActionModal
        open={action === 'default'}
        onClose={() => setAction(null)}
        title="Ödeme Planını Temerrüde Al"
        description="Plan aktif kalmaz ve temerrüt statüsüne geçer. Gerekçe audit geçmişine kaydedilir."
        confirmLabel="Temerrüde Al"
        variant="warning"
        loading={markDefault.isPending}
        onConfirm={async (reason) => {
          await markDefault.mutateAsync({
            id,
            reason,
          });

          setAction(null);
          refresh();
        }}
      />

      <ReasonActionModal
        open={action === 'cancel'}
        onClose={() => setAction(null)}
        title="Ödeme Planını İptal Et"
        description="Tahsilat uygulanmış planlar doğrudan iptal edilemez. Önce ilgili tahsilatların iade/ters kayıt süreci tamamlanmalıdır."
        confirmLabel="Planı İptal Et"
        loading={cancel.isPending}
        onConfirm={async (reason) => {
          await cancel.mutateAsync({
            id,
            reason,
          });

          setAction(null);
          refresh();
        }}
      />
    </div>
  );
}