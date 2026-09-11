import { Link } from 'react-router-dom';
import { ArrowUpRight, CircleDollarSign, ReceiptText, WalletCards } from 'lucide-react';
import { useFinanceContextSummary } from '../../features/finance-v2/finance-v2.query.js';
import { money } from '../../features/finance-v2/finance-v2.format.js';

export default function FinanceContextSummary({ type, id, title = 'Finansal Özet' }) {
  const q = useFinanceContextSummary(type, id);
  if (!id) return null;
  if (q.isLoading) return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-white/[0.07] dark:bg-[#0b1b33]">Finansal bilgiler yükleniyor...</div>;
  if (q.error) return <div className="rounded-2xl border border-red-100 bg-red-50/60 p-5 text-sm text-red-600 dark:border-red-500/10 dark:bg-red-500/[0.05]">Finansal bilgiler yüklenemedi.</div>;
  const data=q.data||{};
  const rec=data.receivables_by_currency||[];
  const cash=data.cash_by_currency||[];
  const currencies=Array.from(new Set([...rec.map(x=>x.currency),...cash.map(x=>x.currency)])).filter(Boolean);
  return <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33]">
    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]"><div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-blue-600"/><div><h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2><p className="text-xs text-gray-400">Finans · para birimi bazında</p></div></div><Link to="/finance" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">Finans Merkezi <ArrowUpRight className="h-3.5 w-3.5"/></Link></div>
    <div className="p-5">{currencies.length===0?<div className="py-7 text-center text-sm text-gray-400">Henüz finans kaydı bulunmuyor.</div>:<div className="space-y-4">{currencies.map(cur=>{const r=rec.find(x=>x.currency===cur)||{};const c=cash.find(x=>x.currency===cur)||{};return <div key={cur} className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.035]"><div className="mb-3 text-xs font-bold text-gray-400">{cur}</div><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Kpi label="Tahakkuk" value={money(r.receivables,cur)} icon={ReceiptText}/><Kpi label="Tahsilat" value={money(c.receipts,cur)} icon={CircleDollarSign}/><Kpi label="Açık Bakiye" value={money(r.open_balance,cur)} icon={WalletCards}/><Kpi label="Gider" value={money(c.expenses,cur)} icon={ArrowUpRight}/></div></div>})}</div>}</div>
  </section>;
}
function Kpi({label,value,icon:Icon}){return <div><p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400"><Icon className="h-3.5 w-3.5"/>{label}</p><p className="mt-1.5 text-sm font-bold text-gray-900 dark:text-white">{value}</p></div>}
