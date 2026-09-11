import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../../app/providers/auth.provider.jsx';
import { hasPermission, PERMISSION_KEYS } from '../../constants/roles.js';
import Badge from '../../components/ui/Badge.jsx';
import { useFinanceAudit, useFinanceExpense, useReverseFinanceExpense } from '../../features/finance-v2/finance-v2.query.js';
import { dateTR, expenseTypeLabel, money, statusLabel } from '../../features/finance-v2/finance-v2.format.js';
import { Header, AuditPanel } from './transaction-detail.jsx';
import ReasonActionModal from './components/ReasonActionModal.jsx';

export default function FinanceExpenseDetail(){
  const {id}=useParams(),{user}=useAuth(),q=useFinanceExpense(id),auditQ=useFinanceAudit('finance_expense',id),reverse=useReverseFinanceExpense(),[reverseOpen,setReverseOpen]=useState(false),x=q.data||{};
  const canReverse=hasPermission(user,PERMISSION_KEYS.REVERSE_PAYMENTS)&&x.status==='posted';
  if(q.isLoading)return <div className="py-16 text-center text-sm text-gray-400">Gider yükleniyor…</div>;
  return <div className="mx-auto max-w-5xl space-y-6"><Header back="/finance" title={`${x.reference_no||''} · ${x.description||'Gider'}`} subtitle={`${dateTR(x.expense_date)} · ${x.category||expenseTypeLabel(x.expense_type)}`}/>
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33]"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-gray-400">Gider Tutarı</p><p className="mt-2 text-3xl font-bold">{money(x.amount,x.currency)}</p><p className="mt-2 text-sm text-gray-500">{x.reimbursable?'Müvekkile yansıtılabilir':'Geri ödenmeyen / büro gideri'}</p></div><Badge variant={x.status==='posted'?'success':x.status==='cancelled'?'danger':'default'}>{statusLabel(x.status)}</Badge></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><Info l="Gider Türü" v={expenseTypeLabel(x.expense_type)}/><Info l="Kategori" v={x.category||'-'}/><Info l="İşlem Referansı" v={x.transaction_reference||'-'}/><Info l="Açıklama" v={x.description||'-'}/></div>
    <div className="mt-5 flex flex-wrap gap-3">{canReverse&&<Button variant="danger" onClick={()=>setReverseOpen(true)}><RotateCcw className="h-4 w-4"/>Gideri Ters Kaydet</Button>}{x.transaction_id&&<Link className="text-sm font-semibold text-blue-600" to={`/finance/transactions/${x.transaction_id}`}>Finans hareketini aç</Link>}{x.reimbursement_receivable_id&&<Link className="text-sm font-semibold text-blue-600" to={`/finance/receivables/${x.reimbursement_receivable_id}`}>Yansıtma tahakkukunu aç</Link>}</div></section>
    <AuditPanel rows={Array.isArray(auditQ.data)?auditQ.data:[]}/>
    <ReasonActionModal open={reverseOpen} onClose={()=>setReverseOpen(false)} title="Gideri Ters Kaydet" description="Gidere bağlı finans hareketi karşı kayıtla kapatılır. Müvekkile yansıtılan masraf tahsil edilmişse önce bağlı alacağın tahsilat/iade zinciri temizlenmelidir." confirmLabel="Gideri Ters Kaydet" loading={reverse.isPending} onConfirm={async reason=>{await reverse.mutateAsync({id,reason});setReverseOpen(false);q.refetch();auditQ.refetch()}}/>
  </div>;
}
function Info({l,v}){return <div><p className="text-xs font-bold uppercase text-gray-400">{l}</p><p className="mt-1 text-sm font-semibold">{v}</p></div>}
