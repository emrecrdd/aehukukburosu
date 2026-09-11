import {
  Ban,
  CalendarDays,
  CheckCircle2,
  FilePlus2,
  Play,
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
  useActivateFeeAgreement,
  useCancelFeeAgreement,
  useCompleteFeeAgreement,
  useFeeAgreement,
  useFinanceAudit,
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

import ReasonActionModal from './components/ReasonActionModal.jsx';

export default function FeeAgreementDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const q = useFeeAgreement(id);
  const auditQ = useFinanceAudit('fee_agreement', id);

  const activate = useActivateFeeAgreement();
  const complete = useCompleteFeeAgreement();
  const cancel = useCancelFeeAgreement();

  const [cancelOpen, setCancelOpen] = useState(false);

  const x = q.data || {};

  const canManage = hasPermission(
    user,
    PERMISSION_KEYS.MANAGE_FEE_AGREEMENTS
  );

  const canCreateReceivable = hasPermission(
    user,
    PERMISSION_KEYS.CREATE_RECEIVABLES
  );

  if (q.isLoading) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">
        Yükleniyor…
      </div>
    );
  }

  const receivableUrl =
    `/finance/receivables/create` +
    `?fee_agreement_id=${id}` +
    `&client_id=${x.client_id || ''}` +
    `&case_id=${x.case_id || ''}` +
    `&consultation_id=${x.consultation_id || ''}` +
    `&currency=${x.currency || 'TRY'}`;

  const paymentPlanUrl =
    `/finance/plans/create` +
    `?fee_agreement_id=${id}` +
    `&client_id=${x.client_id || ''}` +
    `&case_id=${x.case_id || ''}` +
    `&consultation_id=${x.consultation_id || ''}` +
    `&currency=${x.currency || 'TRY'}` +
    `&amount=${x.agreed_amount || ''}` +
    `&title=${encodeURIComponent(x.title || '')}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Header
        back="/finance"
        title={`${x.reference_no || ''} · ${
          x.title || 'Ücret Anlaşması'
        }`}
        subtitle={`${billingModelLabel(x.billing_model)} · ${money(
          x.agreed_amount,
          x.currency
        )}`}
      />

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-gray-400">
              Anlaşılan Ücret
            </p>

            <p className="mt-1 text-3xl font-bold">
              {money(x.agreed_amount, x.currency)}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              {dateTR(x.effective_from)} –{' '}
              {x.effective_to ? dateTR(x.effective_to) : '-'}
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

        <div className="mt-6 flex flex-wrap gap-2">
          {canCreateReceivable &&
            ['draft', 'active'].includes(x.status) && (
              <Link to={receivableUrl}>
                <Button>
                  <FilePlus2 className="h-4 w-4" />
                  Tahakkuk Oluştur
                </Button>
              </Link>
            )}

          {canCreateReceivable &&
            x.status === 'active' &&
            x.billing_model === 'installment' && (
              <Link to={paymentPlanUrl}>
                <Button variant="outline">
                  <CalendarDays className="h-4 w-4" />
                  Ödeme Planı Oluştur
                </Button>
              </Link>
            )}

          {canManage && x.status === 'draft' && (
            <Button
              variant="success"
              loading={activate.isPending}
              onClick={async () => {
                await activate.mutateAsync(id);
                q.refetch();
                auditQ.refetch();
              }}
            >
              <Play className="h-4 w-4" />
              Aktifleştir
            </Button>
          )}

          {canManage && x.status === 'active' && (
            <Button
              variant="outline"
              loading={complete.isPending}
              onClick={async () => {
                await complete.mutateAsync(id);
                q.refetch();
                auditQ.refetch();
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Tamamla
            </Button>
          )}

          {canManage &&
            ['draft', 'active'].includes(x.status) && (
              <Button
                variant="danger"
                onClick={() => setCancelOpen(true)}
              >
                <Ban className="h-4 w-4" />
                İptal Et
              </Button>
            )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <List
          title="Bağlı Tahakkuklar"
          rows={x.receivables || []}
          path="receivables"
          amount="amount"
        />

        <List
          title="Ödeme Planları"
          rows={x.payment_plans || []}
          path="plans"
          amount="total_amount"
        />
      </section>

      <AuditPanel
        rows={Array.isArray(auditQ.data) ? auditQ.data : []}
      />

      <ReasonActionModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Ücret Anlaşmasını İptal Et"
        description="Açık alacağı bulunan anlaşmalar doğrudan iptal edilemez. İptal gerekçesi audit geçmişine yazılır."
        confirmLabel="Anlaşmayı İptal Et"
        loading={cancel.isPending}
        onConfirm={async (reason) => {
          await cancel.mutateAsync({
            id,
            reason,
          });

          setCancelOpen(false);
          q.refetch();
          auditQ.refetch();
        }}
      />
    </div>
  );
}

function List({
  title,
  rows,
  path,
  amount,
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.07] dark:bg-[#0b1b33]">
      <h2 className="font-bold">
        {title}
      </h2>

      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <Link
            key={r.id}
            to={`/finance/${path}/${r.id}`}
            className="flex justify-between rounded-xl bg-gray-50 p-3 text-sm hover:bg-gray-100 dark:bg-white/[0.035]"
          >
            <span>
              <b>{r.reference_no}</b>

              <small className="ml-2 text-gray-400">
                {r.description ||
                  r.title ||
                  statusLabel(r.status)}
              </small>
            </span>

            <b>
              {money(r[amount], r.currency)}
            </b>
          </Link>
        ))}

        {!rows.length && (
          <p className="py-5 text-center text-sm text-gray-400">
            Kayıt yok.
          </p>
        )}
      </div>
    </section>
  );
}

function billingModelLabel(value) {
  const labels = {
    fixed: 'Sabit Ücret',
    hourly: 'Saatlik',
    retainer: 'Avans / Retainer',
    success: 'Başarı Ücreti',
    hybrid: 'Karma',
    installment: 'Taksitli',
    other: 'Diğer',
  };

  return labels[value] || value || '-';
}