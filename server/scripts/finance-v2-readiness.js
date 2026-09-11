import { QueryTypes } from 'sequelize';
import { connectDB, disconnectDB, sequelize } from '../src/config/database.js';

const scalar=async(sql,replacements={})=>{const [r]=await sequelize.query(sql,{replacements,type:QueryTypes.SELECT});return Number(r?.value||0);};
const exists=async(name)=>{const [r]=await sequelize.query('SELECT to_regclass(:name) IS NOT NULL present',{replacements:{name:`public.${name}`},type:QueryTypes.SELECT});return r?.present===true;};

await connectDB();
try{
  const checks=[];
  if(await exists('payments')) checks.push({name:'unmapped_legacy_payments',value:await scalar(`SELECT COUNT(*) value FROM payments p LEFT JOIN finance_transactions t ON t.legacy_payment_id=p.id AND t.deleted_at IS NULL WHERE p.deleted_at IS NULL AND t.id IS NULL`),expected:0});
  if(await exists('payment_plans')) checks.push({name:'unmapped_legacy_plans',value:await scalar(`SELECT COUNT(*) value FROM payment_plans p LEFT JOIN finance_payment_plans v ON v.legacy_payment_plan_id=p.id AND v.deleted_at IS NULL WHERE p.deleted_at IS NULL AND v.id IS NULL`),expected:0});
  if(await exists('payment_installments')) checks.push({name:'unmapped_legacy_installments',value:await scalar(`SELECT COUNT(*) value FROM payment_installments p LEFT JOIN finance_installments v ON v.legacy_installment_id=p.id AND v.deleted_at IS NULL WHERE p.deleted_at IS NULL AND v.id IS NULL`),expected:0});
  checks.push({name:'orphan_allocations',value:await scalar(`SELECT COUNT(*) value FROM finance_allocations a LEFT JOIN finance_transactions t ON t.id=a.transaction_id LEFT JOIN finance_receivables r ON r.id=a.receivable_id WHERE a.deleted_at IS NULL AND (t.id IS NULL OR r.id IS NULL)`),expected:0});
  checks.push({name:'allocation_currency_mismatch',value:await scalar(`SELECT COUNT(*) value FROM finance_allocations a JOIN finance_transactions t ON t.id=a.transaction_id JOIN finance_receivables r ON r.id=a.receivable_id WHERE a.deleted_at IS NULL AND (a.currency<>t.currency OR a.currency<>r.currency)`),expected:0});
  checks.push({name:'refund_currency_mismatch',value:await scalar(`SELECT COUNT(*) value FROM finance_refund_allocations a JOIN finance_transactions t ON t.id=a.refund_transaction_id JOIN finance_receivables r ON r.id=a.receivable_id WHERE a.deleted_at IS NULL AND (a.currency<>t.currency OR a.currency<>r.currency)`),expected:0});
  checks.push({name:'over_settled_receivables',value:await scalar(`SELECT COUNT(*) value FROM finance_receivables r WHERE r.deleted_at IS NULL AND (COALESCE((SELECT SUM(a.amount) FROM finance_allocations a JOIN finance_transactions t ON t.id=a.transaction_id WHERE a.receivable_id=r.id AND a.deleted_at IS NULL AND t.deleted_at IS NULL AND t.status='posted' AND t.direction='in'),0)-COALESCE((SELECT SUM(ra.amount) FROM finance_refund_allocations ra JOIN finance_transactions rt ON rt.id=ra.refund_transaction_id WHERE ra.receivable_id=r.id AND ra.deleted_at IS NULL AND rt.deleted_at IS NULL AND rt.status='posted'),0)+COALESCE((SELECT SUM(x.amount) FROM finance_receivable_adjustments x WHERE x.receivable_id=r.id AND x.deleted_at IS NULL AND x.status='posted'),0)) > r.amount`),expected:0});
  const failed=checks.filter(x=>x.value!==x.expected);
  console.log(JSON.stringify({status:failed.length?'NOT_READY':'READY',checked_at:new Date().toISOString(),checks,failed:failed.map(x=>x.name)},null,2));
  if(failed.length) process.exitCode=2;
} finally { await disconnectDB(); }
