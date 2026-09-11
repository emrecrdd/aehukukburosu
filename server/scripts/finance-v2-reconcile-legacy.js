import { QueryTypes } from 'sequelize';
import { connectDB, disconnectDB, sequelize } from '../src/config/database.js';
import { FinanceAccount } from '../src/models/FinanceAccount.js';
import { FinanceTransaction } from '../src/models/FinanceTransaction.js';
import { FinanceReceivable } from '../src/models/FinanceReceivable.js';
import { FinanceAllocation } from '../src/models/FinanceAllocation.js';
import { FinanceAuditEvent } from '../src/models/FinanceAuditEvent.js';
import { moneyToUnits, unitsToMoney } from '../src/utils/money.js';

const apply = process.argv.includes('--apply');
const report = { mode:apply?'apply':'dry-run', legacy_payments:0, already_migrated:0, migrated:0, allocations:0, unallocated_amount:'0.0000', manual_review:[], errors:[] };

const tableExists = async (name) => {
  const [row] = await sequelize.query('SELECT to_regclass(:name) IS NOT NULL AS present',{replacements:{name:`public.${name}`},type:QueryTypes.SELECT});
  return row?.present === true;
};

const accountFor = async (currency, creatorId, transaction) => {
  const code=`LEGACY-${currency}`;
  let account=await FinanceAccount.findOne({where:{code},transaction,lock:transaction.LOCK.UPDATE});
  if(!account) account=await FinanceAccount.create({code,name:`Legacy Geçiş Hesabı (${currency})`,account_type:'clearing',currency,opening_balance:'0.0000',created_by:creatorId},{transaction});
  return account;
};

await connectDB();
try {
  if(!(await tableExists('payments'))) throw new Error('Legacy payments tablosu bulunamadı. Bu ortamda taşıma yapılmadı.');
  const rows=await sequelize.query(`
    SELECT p.*, COALESCE(pp.currency,'TRY') AS legacy_currency
    FROM payments p LEFT JOIN payment_plans pp ON pp.id=p.payment_plan_id
    ORDER BY p.payment_date ASC, p.created_at ASC, p.id ASC
  `,{type:QueryTypes.SELECT});
  report.legacy_payments=rows.length;

  for(const p of rows){
    if(p.payment_type==='adjustment'){
      report.manual_review.push({payment_id:p.id,reason:'Legacy adjustment yönü semantik olarak belirsiz; otomatik taşınmadı.'});
      continue;
    }
    const existing=await FinanceTransaction.findOne({where:{legacy_payment_id:p.id}});
    if(existing){report.already_migrated++;continue;}
    const currency=String(p.legacy_currency||'TRY').toUpperCase();
    if(!apply) continue;
    try{
      await sequelize.transaction(async transaction=>{
        const account=await accountFor(currency,p.created_by,transaction);
        const type=p.payment_type==='received'?'receipt':p.payment_type==='refund'?'refund':'expense';
        const direction=type==='receipt'?'in':'out';
        const status=p.status==='completed'?'posted':p.status==='cancelled'?'cancelled':'draft';
        const tx=await FinanceTransaction.create({
          reference_no:`LPAY-${String(p.id).replaceAll('-','').slice(0,16).toUpperCase()}`,legacy_payment_id:p.id,client_id:p.client_id,case_id:p.case_id||null,consultation_id:null,account_id:account.id,
          transaction_type:type,direction,amount:p.amount,currency,base_currency:currency,fx_rate:'1.0000000000',base_amount:p.amount,payment_method:p.payment_method||null,transaction_date:p.payment_date,
          description:p.description||p.notes||'Legacy finans hareketi',external_reference:p.transaction_id||p.receipt_number||null,status,posted_at:status==='posted'?(p.payment_date||p.updated_at):null,created_by:p.created_by,
          reversal_reason:p.reversal_reason||null,reversed_at:p.reversed_at||null,reversed_by:p.reversed_by||null,created_at:p.created_at,updated_at:p.updated_at,deleted_at:p.deleted_at||null,
        },{transaction,silent:true});

        let allocated=0n;
        if(type==='receipt' && status==='posted' && p.installment_id){
          const receivable=await FinanceReceivable.findOne({where:{legacy_installment_id:p.installment_id},transaction,lock:transaction.LOCK.UPDATE});
          if(receivable){
            const [r]=await sequelize.query(`SELECT COALESCE(SUM(a.amount),0)::text AS allocated FROM finance_allocations a JOIN finance_transactions t ON t.id=a.transaction_id WHERE a.receivable_id=:id AND a.deleted_at IS NULL AND t.status='posted' AND t.direction='in'`,{replacements:{id:receivable.id},type:QueryTypes.SELECT,transaction});
            const open=moneyToUnits(receivable.amount)-moneyToUnits(r.allocated);
            const paymentUnits=moneyToUnits(p.amount);
            const allocUnits=open>0n?(paymentUnits<open?paymentUnits:open):0n;
            if(allocUnits>0n){
              await FinanceAllocation.create({transaction_id:tx.id,receivable_id:receivable.id,amount:unitsToMoney(allocUnits),currency,created_by:p.created_by},{transaction});
              allocated=allocUnits; report.allocations++;
              const remaining=open-allocUnits;
              await receivable.update({status:remaining<=0n?'paid':remaining<moneyToUnits(receivable.amount)?'partially_paid':'open'},{transaction});
            }
          }
        }
        const unallocated=moneyToUnits(p.amount)-allocated;
        if(type==='receipt' && status==='posted' && unallocated>0n) report.unallocated_amount=unitsToMoney(moneyToUnits(report.unallocated_amount)+unallocated);
        await FinanceAuditEvent.create({entity_type:'finance_transaction',entity_id:tx.id,action:'legacy_migration',actor_id:p.created_by,after_data:{legacy_payment_id:p.id,reference_no:tx.reference_no},metadata:{source:'payments',automatic:true}},{transaction});
      });
      report.migrated++;
    }catch(error){ report.errors.push({payment_id:p.id,message:error.message}); }
  }
  if(!apply) report.note='Dry-run: hiçbir veri değiştirilmedi. Uygulamak için npm run finance:reconcile-legacy -- --apply kullanın.';
  console.log(JSON.stringify(report,null,2));
  if(report.errors.length) process.exitCode=2;
} finally { await disconnectDB(); }
