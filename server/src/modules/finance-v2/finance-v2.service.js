import crypto from 'node:crypto';
import { Op, QueryTypes, Transaction as SequelizeTransaction } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { FinanceAccount } from '../../models/FinanceAccount.js';
import { FinanceFeeAgreement } from '../../models/FinanceFeeAgreement.js';
import { FinanceReceivable } from '../../models/FinanceReceivable.js';
import { FinanceTransaction } from '../../models/FinanceTransaction.js';
import { FinanceAllocation } from '../../models/FinanceAllocation.js';
import { FinanceAuditEvent } from '../../models/FinanceAuditEvent.js';
import { FinanceExpense } from '../../models/FinanceExpense.js';
import { FinancePeriod } from '../../models/FinancePeriod.js';
import { FinancePaymentPlan } from '../../models/FinancePaymentPlan.js';
import { FinanceInstallment } from '../../models/FinanceInstallment.js';
import { FinanceReceivableAdjustment } from '../../models/FinanceReceivableAdjustment.js';
import { FinanceRefundAllocation } from '../../models/FinanceRefundAllocation.js';
import { Client } from '../../models/Client.js';
import { Case } from '../../models/Case.js';
import { Consultation } from '../../models/Consultation.js';
import { ROLES, PERMISSION_KEYS, getEffectivePermissions } from '../../constants/roles.js';
import { moneyToUnits, unitsToMoney, normalizeMoney } from '../../utils/money.js';
import { calculateReceivableSettlement } from './finance-v2.math.js';

const CURRENCIES = new Set(['TRY', 'USD', 'EUR', 'GBP']);
const PAYMENT_METHODS = new Set(['cash','bank_transfer','credit_card','check','other']);
const ACCOUNT_TYPES = new Set(['cash','bank','pos','clearing','other']);
const FEE_BILLING_MODELS = new Set(['fixed','hourly','installment','success_fee','retainer','mixed','other']);
const PLAN_TYPES = new Set(['one_time','installment','custom']);
const RECEIVABLE_TYPES = new Set(['legal_fee','expense_reimbursement','success_fee','other']);
const EXPENSE_TYPES = new Set(['office','matter','client_reimbursable','non_reimbursable']);
const TRANSACTION_DIRECTIONS = {
  receipt: 'in', refund: 'out', expense: 'out', transfer_in: 'in', transfer_out: 'out', adjustment: null, reversal: null,
};

const failNotFound = () => { const e = new Error('Finans kaydı bulunamadı'); e.statusCode = 404; throw e; };
const fail = (message, statusCode = 400) => { const e = new Error(message); e.statusCode = statusCode; throw e; };
const actorId = (actor) => actor?.id || failNotFound();
const permissions = (actor) => getEffectivePermissions(actor?.role, actor?.permissions || {});
const isAdmin = (actor) => actor?.role === ROLES.ADMIN;
const canViewAllCases = (actor) => isAdmin(actor) || permissions(actor).includes(PERMISSION_KEYS.VIEW_ALL_CASES);
const canViewAllFinance = (actor) => isAdmin(actor) || permissions(actor).includes(PERMISSION_KEYS.VIEW_ALL_FINANCE);
const normalizeCurrency = (value = 'TRY') => {
  const result = String(value).trim().toUpperCase();
  if (!CURRENCIES.has(result)) fail('Desteklenmeyen para birimi');
  return result;
};
const normalizeText = (value, max = 500) => value == null ? null : String(value).trim().slice(0, max) || null;

const assertPeriodOpen = async (date, transaction) => {
  const day = new Date(date || Date.now());
  if (Number.isNaN(day.getTime())) fail('Geçersiz işlem tarihi');
  const iso = day.toISOString().slice(0, 10);
  const [closed] = await sequelize.query(`
    SELECT id FROM finance_periods
    WHERE status = 'closed' AND :day BETWEEN starts_on AND ends_on
    LIMIT 1
  `, { replacements: { day: iso }, type: QueryTypes.SELECT, transaction });
  if (closed) fail('Bu finans dönemi kapalıdır', 409);
};

const assertCaseAccess = async (caseId, actor, transaction, lock = false) => {
  if (!caseId) return null;
  const where = { id: caseId };
  if (!canViewAllCases(actor)) where[Op.or] = [{ created_by: actorId(actor) }, { assigned_to: actorId(actor) }];
  const row = await Case.findOne({ where, attributes:['id','created_by','assigned_to'], transaction, lock: lock ? transaction.LOCK.UPDATE : undefined });
  if (!row) failNotFound();
  return row;
};

const assertClientAccess = async (clientId, actor, transaction) => {
  if (!clientId) return null;
  const client = await Client.findByPk(clientId, { attributes:['id','created_by'], transaction });
  if (!client) failNotFound();
  if (isAdmin(actor) || String(client.created_by) === String(actorId(actor)) || canViewAllCases(actor)) return client;
  const rows = await sequelize.query(`
    SELECT 1 FROM case_clients cc
    JOIN cases c ON c.id = cc.case_id AND c.deleted_at IS NULL
    WHERE cc.client_id = :clientId AND (c.created_by = :actorId OR c.assigned_to = :actorId)
    LIMIT 1
  `, { replacements:{clientId,actorId:actorId(actor)}, type:QueryTypes.SELECT, transaction });
  if (!rows.length) failNotFound();
  return client;
};

const assertConsultationAccess = async (consultationId, actor, transaction) => {
  if (!consultationId) return null;
  const consultation = await Consultation.findByPk(consultationId, { attributes:['id','client_id','created_by'], transaction });
  if (!consultation) failNotFound();
  if (isAdmin(actor) || permissions(actor).includes(PERMISSION_KEYS.VIEW_ALL_CONSULTATIONS) || String(consultation.created_by) === String(actorId(actor))) return consultation;
  const rows = await sequelize.query(`SELECT 1 FROM consultation_assignees WHERE consultation_id=:consultationId AND user_id=:actorId LIMIT 1`, { replacements:{consultationId,actorId:actorId(actor)}, type:QueryTypes.SELECT, transaction });
  if (!rows.length) failNotFound();
  return consultation;
};

const assertContext = async ({ client_id, case_id, consultation_id }, actor, transaction) => {
  if (!client_id && !case_id && !consultation_id) fail('Müvekkil, dava veya danışmanlık bağlantısı zorunludur');
  const client = await assertClientAccess(client_id, actor, transaction);
  await assertCaseAccess(case_id, actor, transaction);
  const consultation = await assertConsultationAccess(consultation_id, actor, transaction);

  if (case_id && client_id) {
    const rows = await sequelize.query('SELECT 1 FROM case_clients WHERE case_id=:caseId AND client_id=:clientId LIMIT 1', { replacements:{caseId:case_id,clientId:client_id}, type:QueryTypes.SELECT, transaction });
    if (!rows.length) fail('Dava seçilen müvekkile bağlı değildir', 409);
  }
  if (consultation && client_id && consultation.client_id && String(consultation.client_id) !== String(client_id)) fail('Danışmanlık seçilen müvekkile bağlı değildir', 409);
  return client;
};


const assertCompatibleContext = (left, right, label = 'Finans kayıtları') => {
  const pairs = [
    ['client_id', 'müvekkil'],
    ['case_id', 'dava'],
    ['consultation_id', 'danışmanlık'],
  ];
  for (const [key, name] of pairs) {
    if (left?.[key] && right?.[key] && String(left[key]) !== String(right[key])) {
      fail(`${label} farklı ${name} kayıtlarına bağlı olamaz`, 409);
    }
  }
};

const assertFinanceRecordAccess = async (record, actor, transaction) => {
  if (!record) failNotFound();
  if (record.client_id || record.case_id || record.consultation_id) return assertContext(record, actor, transaction);
  if (!canViewAllFinance(actor)) failNotFound();
  return record;
};

const financeScope = (alias, actor) => {
  if (canViewAllFinance(actor)) return { sql:'TRUE', replacements:{} };
  const id=actorId(actor);
  return {
    sql:`(
      (${alias}.case_id IS NOT NULL AND EXISTS (SELECT 1 FROM cases c WHERE c.id=${alias}.case_id AND c.deleted_at IS NULL AND (c.created_by=:financeActorId OR c.assigned_to=:financeActorId)))
      OR (${alias}.consultation_id IS NOT NULL AND EXISTS (SELECT 1 FROM consultations co WHERE co.id=${alias}.consultation_id AND co.deleted_at IS NULL AND (co.created_by=:financeActorId OR EXISTS (SELECT 1 FROM consultation_assignees ca WHERE ca.consultation_id=co.id AND ca.user_id=:financeActorId))))
      OR (${alias}.client_id IS NOT NULL AND EXISTS (SELECT 1 FROM clients cl WHERE cl.id=${alias}.client_id AND cl.deleted_at IS NULL AND cl.created_by=:financeActorId))
    )`,
    replacements:{financeActorId:id},
  };
};

const nextReference = async (key, prefix, transaction) => {
  const [rows] = await sequelize.query(`
    INSERT INTO finance_sequences (id, sequence_key, current_value, created_at, updated_at)
    VALUES (gen_random_uuid(), :key, 1, NOW(), NOW())
    ON CONFLICT (sequence_key)
    DO UPDATE SET current_value = finance_sequences.current_value + 1, updated_at = NOW()
    RETURNING current_value
  `, { replacements:{key}, transaction });
  const value = String(rows[0].current_value).padStart(6, '0');
  const year = new Date().getUTCFullYear();
  return `${prefix}-${year}-${value}`;
};

const audit = (data, transaction) => FinanceAuditEvent.create(data, { transaction });

const computeBaseAmount = (amount, fxRate) => {
  // Exact string arithmetic for monetary amount; FX has up to 10 decimals.
  // Multiplication uses integer scaling to avoid IEEE-754 errors.
  const amountUnits = moneyToUnits(amount);
  const rateText = String(fxRate ?? '1').trim();
  if (!/^\d+(\.\d+)?$/.test(rateText)) fail('Geçersiz döviz kuru');
  const [whole, fraction=''] = rateText.split('.');
  const rateScale = 10n ** 10n;
  const rateUnits = BigInt(whole) * rateScale + BigInt((fraction + '0000000000').slice(0,10));
  if (rateUnits <= 0n) fail('Döviz kuru 0’dan büyük olmalıdır');
  const result = (amountUnits * rateUnits + rateScale / 2n) / rateScale;
  return { fxRate: `${whole}.${(fraction + '0000000000').slice(0,10)}`, baseAmount: unitsToMoney(result) };
};

const computeTransactionBase = (amount, currency, baseCurrency='TRY', fxRate=null) => {
  const normalizedBase = normalizeCurrency(baseCurrency || 'TRY');
  if (currency === normalizedBase) return { baseCurrency:normalizedBase, ...computeBaseAmount(amount,'1') };
  if (fxRate == null || String(fxRate).trim() === '') fail(`${currency}/${normalizedBase} işlemi için döviz kuru zorunludur`);
  return { baseCurrency:normalizedBase, ...computeBaseAmount(amount,fxRate) };
};

const refreshReceivableStatus = async (receivableId, transaction) => {
  const receivable = await FinanceReceivable.findByPk(receivableId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!receivable || ['cancelled','written_off'].includes(receivable.status)) return;
  const [row] = await sequelize.query(`
    SELECT (COALESCE(SUM(a.amount),0) - COALESCE((SELECT SUM(ra.amount) FROM finance_refund_allocations ra JOIN finance_transactions rt ON rt.id=ra.refund_transaction_id WHERE ra.receivable_id=:receivableId AND ra.deleted_at IS NULL AND rt.deleted_at IS NULL AND rt.status='posted'),0))::text AS allocated
    FROM finance_allocations a
    JOIN finance_transactions t ON t.id=a.transaction_id
    WHERE a.receivable_id=:receivableId AND a.deleted_at IS NULL AND t.deleted_at IS NULL AND t.status='posted' AND t.direction='in'
  `, { replacements:{receivableId}, type:QueryTypes.SELECT, transaction });
  const allocated = moneyToUnits(row.allocated);
  const [adj] = await sequelize.query(`SELECT COALESCE(SUM(amount),0)::text AS adjusted FROM finance_receivable_adjustments WHERE receivable_id=:receivableId AND status='posted' AND deleted_at IS NULL`, {replacements:{receivableId},type:QueryTypes.SELECT,transaction});
  const adjusted = moneyToUnits(adj.adjusted);
  const total = moneyToUnits(receivable.amount);
  const settled = allocated + adjusted;
  const status = settled <= 0n ? 'open' : settled >= total ? 'paid' : 'partially_paid';
  await receivable.update({ status }, { transaction });

  const installment = await FinanceInstallment.findOne({ where:{receivable_id:receivable.id}, transaction, lock:transaction.LOCK.UPDATE });
  if (installment && installment.status !== 'cancelled') {
    let installmentStatus = status === 'paid' ? 'paid' : status === 'partially_paid' ? 'partially_paid' : 'pending';
    if (installmentStatus === 'pending' && installment.due_date && new Date(`${installment.due_date}T23:59:59Z`) < new Date()) installmentStatus = 'overdue';
    await installment.update({ status:installmentStatus, paid_at:installmentStatus==='paid'?(installment.paid_at||new Date()):null }, {transaction});
  }
};

const allocatedForReceivable = async (receivableId, transaction) => {
  const [row] = await sequelize.query(`
    SELECT (COALESCE(SUM(a.amount),0) - COALESCE((SELECT SUM(ra.amount) FROM finance_refund_allocations ra JOIN finance_transactions rt ON rt.id=ra.refund_transaction_id WHERE ra.receivable_id=:receivableId AND ra.deleted_at IS NULL AND rt.deleted_at IS NULL AND rt.status='posted'),0))::text AS allocated
    FROM finance_allocations a
    JOIN finance_transactions t ON t.id=a.transaction_id
    WHERE a.receivable_id=:receivableId AND a.deleted_at IS NULL AND t.deleted_at IS NULL AND t.status='posted' AND t.direction='in'
  `,{replacements:{receivableId},type:QueryTypes.SELECT,transaction});
  return moneyToUnits(row.allocated);
};

const settledForReceivable = async (receivableId, transaction) => {
  const allocated = await allocatedForReceivable(receivableId, transaction);
  const [row] = await sequelize.query(`SELECT COALESCE(SUM(amount),0)::text AS adjusted FROM finance_receivable_adjustments WHERE receivable_id=:receivableId AND status='posted' AND deleted_at IS NULL`,{replacements:{receivableId},type:QueryTypes.SELECT,transaction});
  return allocated + moneyToUnits(row.adjusted);
};

export const financeV2Service = {
  async listAccounts(actor) {
    actorId(actor);
    return FinanceAccount.findAll({ where:{ is_active:true }, order:[['name','ASC']] });
  },

  async createAccount(data, actor, requestMeta = {}) {
    return sequelize.transaction(async (transaction) => {
      const creator = actorId(actor);
      const currency = normalizeCurrency(data.currency);
      const opening_balance = normalizeMoney(data.opening_balance ?? '0');
      const code = normalizeText(data.code,40)?.toUpperCase();
      const name = normalizeText(data.name,160);
      if (!code || !name) fail('Hesap kodu ve adı zorunludur');
      if (!ACCOUNT_TYPES.has(data.account_type)) fail('Geçersiz finans hesabı türü');
      const duplicate = await FinanceAccount.findOne({ where:{ code }, paranoid:false, transaction, lock:transaction.LOCK.UPDATE });
      if (duplicate && !duplicate.deleted_at) fail('Bu finans hesabı kodu zaten kullanılıyor',409);
      if (duplicate?.deleted_at) fail('Bu finans hesabı kodu daha önce kullanılmış; farklı bir hesap kodu seçin',409);
      const account = await FinanceAccount.create({ code, name, account_type:data.account_type, currency, opening_balance, created_by:creator }, { transaction });
      await audit({ entity_type:'finance_account', entity_id:account.id, action:'create', actor_id:creator, after_data:account.toJSON(), metadata:requestMeta }, transaction);
      return account;
    });
  },

  async createFeeAgreement(data, actor, requestMeta = {}) {
    return sequelize.transaction(async (transaction) => {
      const creator = actorId(actor);
      await assertContext(data, actor, transaction);
      const title = normalizeText(data.title,255);
      if (!title) fail('Ücret anlaşması başlığı zorunludur');
      const billingModel=data.billing_model||'fixed'; if(!FEE_BILLING_MODELS.has(billingModel)) fail('Geçersiz ücret modeli');
      const reference_no = await nextReference('fee_agreement','FEE',transaction);
      const agreement = await FinanceFeeAgreement.create({
        reference_no, client_id:data.client_id||null, case_id:data.case_id||null, consultation_id:data.consultation_id||null,
        title, billing_model:billingModel, agreed_amount:normalizeMoney(data.agreed_amount,{positive:true}), currency:normalizeCurrency(data.currency),
        status:'draft', effective_from:data.effective_from||null, effective_to:data.effective_to||null, signed_at:data.signed_at||null, notes:normalizeText(data.notes,5000), created_by:creator,
      }, { transaction });
      await audit({ entity_type:'fee_agreement', entity_id:agreement.id, action:'create', actor_id:creator, after_data:agreement.toJSON(), metadata:requestMeta }, transaction);
      return agreement;
    });
  },

  async createPaymentPlan(data, actor, requestMeta = {}) {
    return sequelize.transaction(async (transaction) => {
      const creator=actorId(actor);
      await assertContext(data,actor,transaction);
      const title=normalizeText(data.title,255);
      if(!title) fail('Ödeme planı başlığı zorunludur');
      const installments=Array.isArray(data.installments)?data.installments:[];
      if(!installments.length) fail('Ödeme planında en az bir taksit olmalıdır');
      const currency=normalizeCurrency(data.currency);
      const planType=data.plan_type||'installment'; if(!PLAN_TYPES.has(planType)) fail('Geçersiz ödeme planı türü');
      const receivableType=data.receivable_type||'legal_fee'; if(!RECEIVABLE_TYPES.has(receivableType)) fail('Geçersiz alacak türü');
      const total=normalizeMoney(data.total_amount,{positive:true});
      if(data.fee_agreement_id){const agreement=await FinanceFeeAgreement.findByPk(data.fee_agreement_id,{transaction});if(!agreement) fail('Ücret anlaşması bulunamadı',404);await assertFinanceRecordAccess(agreement,actor,transaction);if(String(agreement.currency)!==currency) fail('Ödeme planı para birimi ücret anlaşmasıyla aynı olmalıdır',409);if(data.client_id&&agreement.client_id&&String(data.client_id)!==String(agreement.client_id)) fail('Ödeme planı farklı müvekkilin ücret anlaşmasına bağlanamaz',409);if(data.case_id&&agreement.case_id&&String(data.case_id)!==String(agreement.case_id)) fail('Ödeme planı farklı davanın ücret anlaşmasına bağlanamaz',409);if(data.consultation_id&&agreement.consultation_id&&String(data.consultation_id)!==String(agreement.consultation_id)) fail('Ödeme planı farklı danışmanlığın ücret anlaşmasına bağlanamaz',409);}
      let sum=0n;
      for(const item of installments) sum += moneyToUnits(normalizeMoney(item.amount,{positive:true}));
      if(sum!==moneyToUnits(total)) fail('Taksit toplamı ödeme planı toplamına eşit olmalıdır',409);
      const numbers=installments.map((item,i)=>Number(item.installment_number??i+1));
      if(numbers.some(n=>!Number.isInteger(n)||n<1)||new Set(numbers).size!==numbers.length) fail('Taksit numaraları benzersiz pozitif tam sayı olmalıdır');
      if(installments.some(item=>!item.due_date)) fail('Her taksit için vade tarihi zorunludur');

      const reference_no=await nextReference('payment_plan','PLN',transaction);
      const plan=await FinancePaymentPlan.create({
        reference_no,fee_agreement_id:data.fee_agreement_id||null,client_id:data.client_id||null,case_id:data.case_id||null,consultation_id:data.consultation_id||null,
        title,description:normalizeText(data.description,5000),total_amount:total,currency,plan_type:planType,status:data.activate===true?'active':'draft',start_date:data.start_date||null,end_date:data.end_date||null,activated_at:data.activate===true?new Date():null,created_by:creator,
      },{transaction});

      const created=[];
      for(let i=0;i<installments.length;i++){
        const item=installments[i];
        const amount=normalizeMoney(item.amount,{positive:true});
        const receivableRef=await nextReference('receivable','RCV',transaction);
        const receivable=await FinanceReceivable.create({
          reference_no:receivableRef,fee_agreement_id:data.fee_agreement_id||null,client_id:data.client_id||null,case_id:data.case_id||null,consultation_id:data.consultation_id||null,
          receivable_type:receivableType,description:normalizeText(item.title||`${plan.title} - Taksit ${numbers[i]}`,500),amount,currency,due_date:item.due_date,status:data.activate===true?'open':'draft',posted_at:data.activate===true?new Date():null,created_by:creator,
        },{transaction});
        const installment=await FinanceInstallment.create({payment_plan_id:plan.id,receivable_id:receivable.id,installment_number:numbers[i],title:normalizeText(item.title,255),amount,currency,due_date:item.due_date,status:'pending'},{transaction});
        created.push({installment,receivable});
      }
      await audit({entity_type:'finance_payment_plan',entity_id:plan.id,action:data.activate===true?'create_and_activate':'create',actor_id:creator,after_data:{...plan.toJSON(),installment_count:created.length},metadata:requestMeta},transaction);
      return {plan,installments:created};
    });
  },

  async activatePaymentPlan(id, actor, requestMeta = {}) {
    return sequelize.transaction(async transaction=>{
      const plan=await FinancePaymentPlan.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});
      if(!plan) failNotFound();
      await assertContext(plan,actor,transaction);
      if(plan.status!=='draft') fail('Yalnız taslak ödeme planı aktifleştirilebilir',409);
      const receivables=await FinanceReceivable.findAll({include:[{model:FinanceInstallment,as:'installment',required:true,where:{payment_plan_id:plan.id}}],transaction,lock:transaction.LOCK.UPDATE});
      const before=plan.toJSON();
      await plan.update({status:'active',activated_at:new Date()},{transaction});
      for(const r of receivables) if(r.status==='draft') await r.update({status:'open',posted_at:new Date()},{transaction});
      await audit({entity_type:'finance_payment_plan',entity_id:plan.id,action:'activate',actor_id:actorId(actor),before_data:before,after_data:plan.toJSON(),metadata:requestMeta},transaction);
      return plan;
    });
  },

  async transitionPaymentPlan(id, action, reason, actor, requestMeta = {}) {
    return sequelize.transaction(async transaction => {
      const plan=await FinancePaymentPlan.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE}); if(!plan) failNotFound();
      await assertContext(plan,actor,transaction);
      const normalizedReason=normalizeText(reason,500);
      const before=plan.toJSON();
      if(action==='complete') {
        if(plan.status!=='active') fail('Yalnız aktif ödeme planı tamamlanabilir',409);
        const open=await FinanceReceivable.count({include:[{model:FinanceInstallment,as:'installment',required:true,where:{payment_plan_id:plan.id}}],where:{status:{[Op.in]:['draft','open','partially_paid']}},transaction});
        if(open) fail('Açık taksiti bulunan ödeme planı tamamlanamaz',409);
        await plan.update({status:'completed',completed_at:new Date()},{transaction});
      } else if(action==='default') {
        if(plan.status!=='active') fail('Yalnız aktif ödeme planı temerrüde alınabilir',409);
        if(!normalizedReason) fail('Temerrüt nedeni zorunludur');
        await plan.update({status:'defaulted'},{transaction});
      } else if(action==='cancel') {
        if(!['draft','active','defaulted'].includes(plan.status)) fail('Bu ödeme planı iptal edilemez',409);
        if(!normalizedReason) fail('İptal nedeni zorunludur');
        const settled=await sequelize.query(`SELECT 1 FROM finance_installments i JOIN finance_receivables r ON r.id=i.receivable_id WHERE i.payment_plan_id=:id AND i.deleted_at IS NULL AND r.deleted_at IS NULL AND (r.status IN ('paid','partially_paid') OR EXISTS (SELECT 1 FROM finance_allocations a JOIN finance_transactions t ON t.id=a.transaction_id WHERE a.receivable_id=r.id AND a.deleted_at IS NULL AND t.deleted_at IS NULL AND t.status='posted')) LIMIT 1`,{replacements:{id},type:QueryTypes.SELECT,transaction});
        if(settled.length) fail('Tahsilat uygulanmış ödeme planı doğrudan iptal edilemez; önce finans hareketlerini ters kaydedin/iade edin',409);
        const receivables=await FinanceReceivable.findAll({include:[{model:FinanceInstallment,as:'installment',required:true,where:{payment_plan_id:plan.id}}],transaction,lock:transaction.LOCK.UPDATE});
        for(const r of receivables) if(['draft','open'].includes(r.status)) await r.update({status:'cancelled'},{transaction});
        await FinanceInstallment.update({status:'cancelled'},{where:{payment_plan_id:plan.id},transaction});
        await plan.update({status:'cancelled',cancelled_at:new Date()},{transaction});
      } else fail('Geçersiz ödeme planı işlemi');
      await audit({entity_type:'finance_payment_plan',entity_id:plan.id,action,actor_id:actorId(actor),reason:normalizedReason,before_data:before,after_data:plan.toJSON(),metadata:requestMeta},transaction);
      return plan;
    });
  },

  async createReceivable(data, actor, requestMeta = {}) {
    return sequelize.transaction(async (transaction) => {
      const creator = actorId(actor);
      await assertContext(data, actor, transaction);
      const description=normalizeText(data.description,500);
      if(!description) fail('Alacak açıklaması zorunludur');
      const receivableType=data.receivable_type||'legal_fee'; if(!RECEIVABLE_TYPES.has(receivableType)) fail('Geçersiz alacak türü');
      const receivableCurrency=normalizeCurrency(data.currency);
      if(data.fee_agreement_id){const agreement=await FinanceFeeAgreement.findByPk(data.fee_agreement_id,{transaction});if(!agreement) fail('Ücret anlaşması bulunamadı',404);await assertFinanceRecordAccess(agreement,actor,transaction);if(String(agreement.currency)!==receivableCurrency) fail('Alacak para birimi ücret anlaşmasıyla aynı olmalıdır',409);if(data.client_id&&agreement.client_id&&String(data.client_id)!==String(agreement.client_id)) fail('Alacak farklı müvekkilin ücret anlaşmasına bağlanamaz',409);if(data.case_id&&agreement.case_id&&String(data.case_id)!==String(agreement.case_id)) fail('Alacak farklı davanın ücret anlaşmasına bağlanamaz',409);if(data.consultation_id&&agreement.consultation_id&&String(data.consultation_id)!==String(agreement.consultation_id)) fail('Alacak farklı danışmanlığın ücret anlaşmasına bağlanamaz',409);}
      const reference_no = await nextReference('receivable','RCV',transaction);
      const status = data.post === true ? 'open' : 'draft';
      const receivable = await FinanceReceivable.create({
        reference_no, fee_agreement_id:data.fee_agreement_id||null, client_id:data.client_id||null, case_id:data.case_id||null, consultation_id:data.consultation_id||null,
        receivable_type:receivableType, description, amount:normalizeMoney(data.amount,{positive:true}), currency:receivableCurrency, due_date:data.due_date||null,
        status, posted_at:status==='open'?new Date():null, created_by:creator,
      }, { transaction });
      await audit({ entity_type:'receivable', entity_id:receivable.id, action:status==='open'?'create_and_post':'create', actor_id:creator, after_data:receivable.toJSON(), metadata:requestMeta }, transaction);
      return receivable;
    });
  },

  async postReceivable(id, actor, requestMeta = {}) {
    return sequelize.transaction(async (transaction) => {
      const receivable = await FinanceReceivable.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});
      if (!receivable) failNotFound();
      await assertContext(receivable,actor,transaction);
      if (receivable.status !== 'draft') fail('Yalnız taslak alacak tahakkuk ettirilebilir',409);
      const before=receivable.toJSON(); await receivable.update({status:'open',posted_at:new Date()},{transaction});
      await audit({entity_type:'receivable',entity_id:receivable.id,action:'post',actor_id:actorId(actor),before_data:before,after_data:receivable.toJSON(),metadata:requestMeta},transaction);
      return receivable;
    });
  },

  async createTransaction(data, actor, requestMeta = {}) {
    const isolationLevel = SequelizeTransaction.ISOLATION_LEVELS.READ_COMMITTED;
    return sequelize.transaction({ isolationLevel }, async (transaction) => {
      const creator = actorId(actor);
      const idempotencyKey = data.idempotency_key ? String(data.idempotency_key).slice(0,128) : null;
      if (idempotencyKey) {
        const existing = await FinanceTransaction.findOne({where:{idempotency_key:idempotencyKey},transaction});
        if (existing) {
          const expectedAmount = normalizeMoney(data.amount,{positive:true});
          const expectedCurrency = normalizeCurrency(data.currency || existing.currency);
          if (existing.transaction_type !== 'receipt' || String(existing.account_id) !== String(data.account_id) || String(existing.amount) !== String(expectedAmount) || String(existing.currency) !== expectedCurrency) fail('Idempotency-Key farklı bir tahsilat için kullanılmış',409);
          return existing;
        }
      }
      await assertContext(data, actor, transaction);
      await assertPeriodOpen(data.transaction_date, transaction);
      const account = await FinanceAccount.findOne({where:{id:data.account_id,is_active:true},transaction,lock:transaction.LOCK.UPDATE});
      if (!account) fail('Finans hesabı bulunamadı',404);
      const type = data.transaction_type || 'receipt';
      if (type !== 'receipt') fail('Bu endpoint yalnız tahsilat kaydı içindir; iade, masraf ve transfer için özel finans endpointlerini kullanın',409);
      const amount = normalizeMoney(data.amount,{positive:true});
      const currency = normalizeCurrency(data.currency || account.currency);
      if (String(account.currency) !== currency) fail('Tahsilat para birimi finans hesabıyla aynı olmalıdır',409);
      const {baseCurrency:base_currency,fxRate,baseAmount}=computeTransactionBase(amount,currency,data.base_currency||'TRY',data.fx_rate);
      const direction = 'in';
      if (data.payment_method && !PAYMENT_METHODS.has(data.payment_method)) fail('Geçersiz ödeme yöntemi');
      const reference_no=await nextReference('transaction','PAY',transaction);
      const financeTransaction=await FinanceTransaction.create({
        reference_no,idempotency_key:idempotencyKey,client_id:data.client_id||null,case_id:data.case_id||null,consultation_id:data.consultation_id||null,account_id:account.id,
        transaction_type:type,direction,amount,currency,base_currency,fx_rate:fxRate,base_amount:baseAmount,payment_method:data.payment_method||null,transaction_date:data.transaction_date||new Date(),description:normalizeText(data.description,500),external_reference:normalizeText(data.external_reference,160),status:'posted',posted_at:new Date(),created_by:creator,
      },{transaction});

      const allocations=Array.isArray(data.allocations)?data.allocations:[];
      if (allocations.length && direction !== 'in') fail('Yalnız gelen finans hareketleri alacağa mahsup edilebilir',409);
      let allocatedUnits=0n;
      for (const item of allocations) {
        const receivable=await FinanceReceivable.findByPk(item.receivable_id,{transaction,lock:transaction.LOCK.UPDATE});
        if (!receivable || !['open','partially_paid'].includes(receivable.status)) fail('Mahsup edilecek açık alacak bulunamadı',409);
        await assertContext(receivable,actor,transaction);
        if (String(receivable.currency)!==currency) fail('Tahsilat ve alacak para birimi aynı olmalıdır',409);
        assertCompatibleContext(financeTransaction, receivable, 'Tahsilat ve alacak');
        const allocAmount=normalizeMoney(item.amount,{positive:true}); const allocUnits=moneyToUnits(allocAmount); allocatedUnits += allocUnits;
        if (allocatedUnits>moneyToUnits(amount)) fail('Mahsup toplamı işlem tutarını aşamaz',409);
        const alreadyAllocated=await settledForReceivable(receivable.id,transaction);
        if (alreadyAllocated + allocUnits > moneyToUnits(receivable.amount)) fail('Mahsup tutarı alacağın açık bakiyesini aşamaz',409);
        await FinanceAllocation.create({transaction_id:financeTransaction.id,receivable_id:receivable.id,amount:allocAmount,currency,created_by:creator},{transaction});
        await refreshReceivableStatus(receivable.id,transaction);
      }
      await audit({entity_type:'finance_transaction',entity_id:financeTransaction.id,action:'post',actor_id:creator,after_data:{...financeTransaction.toJSON(),allocated_amount:unitsToMoney(allocatedUnits)},metadata:requestMeta},transaction);
      return financeTransaction;
    });
  },

  async reverseTransaction(id, reason, actor, requestMeta = {}) {
    return sequelize.transaction(async (transaction) => {
      const original=await FinanceTransaction.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});
      if (!original) failNotFound();
      await assertFinanceRecordAccess(original,actor,transaction); await assertPeriodOpen(new Date(),transaction);
      if (original.status!=='posted') fail('Yalnız post edilmiş hareket ters kayıtla kapatılabilir',409);
      if (original.transaction_type==='reversal') fail('Ters kayıt hareketi yeniden ters kaydedilemez',409);
      if (original.transaction_type==='expense') fail('Gider hareketi özel gider ters kayıt akışıyla kapatılmalıdır',409);
      if (['transfer_in','transfer_out'].includes(original.transaction_type)) fail('Transfer hareketi çift taraflı transfer ters kayıt akışıyla kapatılmalıdır',409);
      const normalizedReason=normalizeText(reason,500); if (!normalizedReason) fail('Ters kayıt nedeni zorunludur');
      const existing=await FinanceTransaction.findOne({where:{reversed_transaction_id:original.id,status:'posted'},transaction}); if(existing) fail('Bu hareket zaten ters kaydedilmiş',409);
      if (original.transaction_type==='receipt') {
        const refundCount=await FinanceTransaction.count({where:{transaction_type:'refund',related_transaction_id:original.id,status:'posted'},transaction});
        if(refundCount) fail('İade uygulanmış tahsilat doğrudan ters kaydedilemez; önce iadeleri ters kaydedin',409);
      }
      const reference_no=await nextReference('transaction','REV',transaction);
      const reversal=await FinanceTransaction.create({reference_no,client_id:original.client_id,case_id:original.case_id,consultation_id:original.consultation_id,account_id:original.account_id,transaction_type:'reversal',direction:original.direction==='in'?'out':'in',amount:original.amount,currency:original.currency,base_currency:original.base_currency,fx_rate:original.fx_rate,base_amount:original.base_amount,payment_method:original.payment_method,transaction_date:new Date(),description:`Ters kayıt: ${original.reference_no}`,status:'posted',reversed_transaction_id:original.id,reversal_reason:normalizedReason,posted_at:new Date(),created_by:actorId(actor)},{transaction});
      await original.update({status:'reversed',reversed_at:new Date(),reversed_by:actorId(actor),reversal_reason:normalizedReason},{transaction});
      const allocations=await FinanceAllocation.findAll({where:{transaction_id:original.id},transaction});
      for(const allocation of allocations) await refreshReceivableStatus(allocation.receivable_id,transaction);
      if(original.transaction_type==='refund') {
        const refundAllocations=await FinanceRefundAllocation.findAll({where:{refund_transaction_id:original.id},transaction});
        for(const item of refundAllocations) await refreshReceivableStatus(item.receivable_id,transaction);
      }
      await audit({entity_type:'finance_transaction',entity_id:original.id,action:'reverse',actor_id:actorId(actor),reason:normalizedReason,before_data:{status:'posted'},after_data:{status:'reversed',reversal_id:reversal.id},metadata:requestMeta},transaction);
      return {original,reversal};
    });
  },


  async createExpense(data, actor, requestMeta = {}) {
    return sequelize.transaction(async (transaction) => {
      const creator = actorId(actor);
      const expenseType=data.expense_type||'office'; if(!EXPENSE_TYPES.has(expenseType)) fail('Geçersiz masraf türü');
      const description=normalizeText(data.description,500);
      if(!description) fail('Masraf açıklaması zorunludur');
      const isOffice = expenseType === 'office';
      const hasContext = Boolean(data.client_id || data.case_id || data.consultation_id);
      const reimbursable = expenseType === 'client_reimbursable' || data.reimbursable === true;
      if (!isOffice || hasContext || reimbursable) await assertContext(data, actor, transaction);
      await assertPeriodOpen(data.expense_date, transaction);
      const account = await FinanceAccount.findOne({ where:{id:data.account_id,is_active:true}, transaction, lock:transaction.LOCK.UPDATE });
      if (!account) fail('Finans hesabı bulunamadı',404);
      const amount = normalizeMoney(data.amount,{positive:true});
      const currency = normalizeCurrency(data.currency || account.currency);
      if (String(account.currency) !== currency) fail('Masraf para birimi finans hesabıyla aynı olmalıdır',409);
      if (data.payment_method && !PAYMENT_METHODS.has(data.payment_method)) fail('Geçersiz ödeme yöntemi');
      const {baseCurrency,fxRate,baseAmount}=computeTransactionBase(amount,currency,data.base_currency||'TRY',data.fx_rate);
      const transactionReference = await nextReference('transaction','EXP',transaction);
      const tx = await FinanceTransaction.create({
        reference_no:transactionReference, client_id:data.client_id||null, case_id:data.case_id||null, consultation_id:data.consultation_id||null,
        account_id:account.id, transaction_type:'expense', direction:'out', amount, currency, base_currency:baseCurrency, fx_rate:fxRate, base_amount:baseAmount,
        payment_method:data.payment_method||null, transaction_date:data.expense_date||new Date(), description, external_reference:normalizeText(data.external_reference,160),
        status:'posted', posted_at:new Date(), created_by:creator,
      },{transaction});
      const expenseReference = await nextReference('expense','EXPNS',transaction);
      let reimbursementReceivable = null;
      if (reimbursable) {
        if (!data.client_id && !data.case_id && !data.consultation_id) fail('Müvekkile yansıtılacak masraf bir hukuki işe bağlı olmalıdır',409);
        const receivableReference = await nextReference('receivable','RCV',transaction);
        reimbursementReceivable = await FinanceReceivable.create({
          reference_no:receivableReference, client_id:data.client_id||null, case_id:data.case_id||null, consultation_id:data.consultation_id||null,
          receivable_type:'expense_reimbursement', description:`Masraf yansıtma: ${normalizeText(data.description,420) || expenseReference}`,
          amount,currency,due_date:data.reimbursement_due_date||null,status:'open',posted_at:new Date(),created_by:creator,
        },{transaction});
      }
      const expense = await FinanceExpense.create({
        reference_no:expenseReference,transaction_id:tx.id,client_id:data.client_id||null,case_id:data.case_id||null,consultation_id:data.consultation_id||null,
        expense_type:expenseType,category:normalizeText(data.category,100),description,amount,currency,expense_date:data.expense_date||new Date(),reimbursable,
        reimbursement_receivable_id:reimbursementReceivable?.id||null,status:'posted',created_by:creator,
      },{transaction});
      await audit({entity_type:'finance_expense',entity_id:expense.id,action:'post',actor_id:creator,after_data:{...expense.toJSON(),transaction_reference:tx.reference_no,reimbursement_receivable_reference:reimbursementReceivable?.reference_no||null},metadata:requestMeta},transaction);
      return {expense,transaction:tx,reimbursement_receivable:reimbursementReceivable};
    });
  },

  async closePeriod(data, actor, requestMeta = {}) {
    return sequelize.transaction(async (transaction) => {
      const key=String(data.period_key||'').trim();
      if(!/^\d{4}-\d{2}$/.test(key)) fail('Dönem YYYY-MM formatında olmalıdır');
      const [year,month]=key.split('-').map(Number);
      if(month<1||month>12) fail('Geçersiz finans dönemi');
      const starts_on=`${year}-${String(month).padStart(2,'0')}-01`;
      const endDate=new Date(Date.UTC(year,month,0));
      const ends_on=endDate.toISOString().slice(0,10);
      let period=await FinancePeriod.findOne({where:{period_key:key},transaction,lock:transaction.LOCK.UPDATE});
      if(!period) period=await FinancePeriod.create({period_key:key,starts_on,ends_on,status:'open'},{transaction});
      if(period.status==='closed') fail('Finans dönemi zaten kapalı',409);
      const before=period.toJSON(); await period.update({status:'closed',closed_at:new Date(),closed_by:actorId(actor),reopened_at:null,reopened_by:null,reopen_reason:null},{transaction});
      await audit({entity_type:'finance_period',entity_id:period.id,action:'close',actor_id:actorId(actor),before_data:before,after_data:period.toJSON(),metadata:requestMeta},transaction);
      return period;
    });
  },

  async reopenPeriod(periodKey, reason, actor, requestMeta = {}) {
    return sequelize.transaction(async (transaction) => {
      const period=await FinancePeriod.findOne({where:{period_key:periodKey},transaction,lock:transaction.LOCK.UPDATE});
      if(!period) fail('Finans dönemi bulunamadı',404);
      if(period.status!=='closed') fail('Yalnız kapalı finans dönemi yeniden açılabilir',409);
      const normalizedReason=normalizeText(reason,500); if(!normalizedReason) fail('Yeniden açma nedeni zorunludur');
      const before=period.toJSON(); await period.update({status:'open',reopened_at:new Date(),reopened_by:actorId(actor),reopen_reason:normalizedReason},{transaction});
      await audit({entity_type:'finance_period',entity_id:period.id,action:'reopen',actor_id:actorId(actor),reason:normalizedReason,before_data:before,after_data:period.toJSON(),metadata:requestMeta},transaction);
      return period;
    });
  },

  async linkConsultationToClient({ consultationId, clientId, actorId: conversionActorId, transaction }) {
    if(!transaction) fail('Finans bağlantısı mevcut DB transaction içinde çalışmalıdır',500);
    const [plans,agreements,receivables,transactions,expenses]=await Promise.all([
      FinancePaymentPlan.update({client_id:clientId},{where:{consultation_id:consultationId,client_id:null},transaction}),
      FinanceFeeAgreement.update({client_id:clientId},{where:{consultation_id:consultationId,client_id:null},transaction}),
      FinanceReceivable.update({client_id:clientId},{where:{consultation_id:consultationId,client_id:null},transaction}),
      FinanceTransaction.update({client_id:clientId},{where:{consultation_id:consultationId,client_id:null},transaction}),
      FinanceExpense.update({client_id:clientId},{where:{consultation_id:consultationId,client_id:null},transaction}),
    ]);
    const counts={payment_plans:plans[0],fee_agreements:agreements[0],receivables:receivables[0],transactions:transactions[0],expenses:expenses[0]};
    await audit({entity_type:'consultation',entity_id:consultationId,action:'link_to_client',actor_id:conversionActorId,after_data:{client_id:clientId,linked:counts},metadata:{source:'consultation_conversion'}},transaction);
    return counts;
  },

  async linkConsultationToCase({ consultationId, caseId, actorId: conversionActorId, transaction }) {
    if(!transaction) fail('Finans bağlantısı mevcut DB transaction içinde çalışmalıdır',500);
    const [plans,agreements,receivables,transactions,expenses]=await Promise.all([
      FinancePaymentPlan.update({case_id:caseId},{where:{consultation_id:consultationId,case_id:null},transaction}),
      FinanceFeeAgreement.update({case_id:caseId},{where:{consultation_id:consultationId,case_id:null},transaction}),
      FinanceReceivable.update({case_id:caseId},{where:{consultation_id:consultationId,case_id:null},transaction}),
      FinanceTransaction.update({case_id:caseId},{where:{consultation_id:consultationId,case_id:null},transaction}),
      FinanceExpense.update({case_id:caseId},{where:{consultation_id:consultationId,case_id:null},transaction}),
    ]);
    const counts={payment_plans:plans[0],fee_agreements:agreements[0],receivables:receivables[0],transactions:transactions[0],expenses:expenses[0]};
    await audit({entity_type:'consultation',entity_id:consultationId,action:'link_to_case',actor_id:conversionActorId,after_data:{case_id:caseId,linked:counts},metadata:{source:'consultation_conversion'}},transaction);
    return counts;
  },

  async activateFeeAgreement(id, actor, requestMeta = {}) {
    return sequelize.transaction(async transaction => {
      const agreement=await FinanceFeeAgreement.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE}); if(!agreement) failNotFound();
      await assertContext(agreement,actor,transaction); if(agreement.status!=='draft') fail('Yalnız taslak ücret anlaşması aktifleştirilebilir',409);
      const before=agreement.toJSON(); await agreement.update({status:'active',approved_by:actorId(actor),approved_at:new Date()},{transaction});
      await audit({entity_type:'fee_agreement',entity_id:id,action:'activate',actor_id:actorId(actor),before_data:before,after_data:agreement.toJSON(),metadata:requestMeta},transaction); return agreement;
    });
  },

  async completeFeeAgreement(id, actor, requestMeta = {}) {
    return sequelize.transaction(async transaction => {
      const agreement=await FinanceFeeAgreement.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE}); if(!agreement) failNotFound(); await assertContext(agreement,actor,transaction);
      if(agreement.status!=='active') fail('Yalnız aktif ücret anlaşması tamamlanabilir',409);
      const open=await FinanceReceivable.count({where:{fee_agreement_id:id,status:{[Op.in]:['draft','open','partially_paid']}},transaction}); if(open) fail('Açık/taslak alacak bulunan ücret anlaşması tamamlanamaz',409);
      const before=agreement.toJSON(); await agreement.update({status:'completed'},{transaction}); await audit({entity_type:'fee_agreement',entity_id:id,action:'complete',actor_id:actorId(actor),before_data:before,after_data:agreement.toJSON(),metadata:requestMeta},transaction); return agreement;
    });
  },

  async cancelFeeAgreement(id, reason, actor, requestMeta = {}) {
    return sequelize.transaction(async transaction => {
      const agreement=await FinanceFeeAgreement.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE}); if(!agreement) failNotFound();
      await assertContext(agreement,actor,transaction);
      if(!['draft','active'].includes(agreement.status)) fail('Yalnız taslak veya aktif ücret anlaşması iptal edilebilir',409);
      const normalizedReason=normalizeText(reason,500); if(!normalizedReason) fail('İptal nedeni zorunludur');
      const open=await FinanceReceivable.count({where:{fee_agreement_id:id,status:{[Op.in]:['draft','open','partially_paid']}},transaction});
      if(open) fail('Açık alacağı bulunan ücret anlaşması iptal edilemez; önce alacakları kapatın veya ters kayıt/düzeltme uygulayın',409);
      const before=agreement.toJSON(); await agreement.update({status:'cancelled'},{transaction});
      await audit({entity_type:'fee_agreement',entity_id:id,action:'cancel',actor_id:actorId(actor),reason:normalizedReason,before_data:before,after_data:agreement.toJSON(),metadata:requestMeta},transaction); return agreement;
    });
  },

  async adjustReceivable(id, data, actor, requestMeta = {}) {
    return sequelize.transaction(async transaction => {
      const r=await FinanceReceivable.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE}); if(!r) failNotFound(); await assertContext(r,actor,transaction);
      if(!['open','partially_paid'].includes(r.status)) fail('Yalnız açık alacakta indirim/terkin yapılabilir',409);
      const kind=data.adjustment_type; if(!['discount','write_off'].includes(kind)) fail('Geçersiz alacak düzeltme türü');
      const reason=normalizeText(data.reason,500); if(!reason) fail('Düzeltme nedeni zorunludur'); const amount=normalizeMoney(data.amount,{positive:true});
      const settled=await settledForReceivable(id,transaction); if(settled+moneyToUnits(amount)>moneyToUnits(r.amount)) fail('Düzeltme tutarı açık alacağı aşamaz',409);
      const reference_no=await nextReference('receivable_adjustment',kind==='discount'?'DSC':'WOF',transaction);
      const adj=await FinanceReceivableAdjustment.create({reference_no,receivable_id:id,adjustment_type:kind,amount,currency:r.currency,reason,status:'posted',created_by:actorId(actor)},{transaction});
      await refreshReceivableStatus(id,transaction); await audit({entity_type:'finance_receivable_adjustment',entity_id:adj.id,action:'post',actor_id:actorId(actor),reason,after_data:adj.toJSON(),metadata:requestMeta},transaction); return adj;
    });
  },

  async reverseReceivableAdjustment(adjustmentId, reason, actor, requestMeta = {}) {
    return sequelize.transaction(async transaction => {
      const adjustment=await FinanceReceivableAdjustment.findByPk(adjustmentId,{transaction,lock:transaction.LOCK.UPDATE}); if(!adjustment) failNotFound();
      const receivable=await FinanceReceivable.findByPk(adjustment.receivable_id,{transaction,lock:transaction.LOCK.UPDATE}); if(!receivable) failNotFound();
      await assertContext(receivable,actor,transaction);
      if(adjustment.status!=='posted') fail('Yalnız post edilmiş indirim/terkin ters kaydedilebilir',409);
      const normalizedReason=normalizeText(reason,500); if(!normalizedReason) fail('Ters kayıt nedeni zorunludur');
      const before=adjustment.toJSON();
      await adjustment.update({status:'reversed',reversed_by:actorId(actor),reversed_at:new Date()},{transaction});
      await refreshReceivableStatus(receivable.id,transaction);
      await audit({entity_type:'finance_receivable_adjustment',entity_id:adjustment.id,action:'reverse',actor_id:actorId(actor),reason:normalizedReason,before_data:before,after_data:adjustment.toJSON(),metadata:requestMeta},transaction);
      return adjustment;
    });
  },

  async reverseExpense(id, reason, actor, requestMeta = {}) {
    return sequelize.transaction(async transaction => {
      // Bu endpoint hem FinanceExpense.id hem de bağlı FinanceTransaction.id kabul eder.
      // Transaction detay ekranı doğal olarak transaction UUID'si ile açıldığı için sadece
      // FinanceExpense PK aramak 404 üretiyordu. Önce expense PK, yoksa transaction_id ile çöz.
      let expense=await FinanceExpense.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});
      if(!expense){
        expense=await FinanceExpense.findOne({
          where:{transaction_id:id},
          transaction,
          lock:transaction.LOCK.UPDATE,
        });
      }
      if(!expense) failNotFound();
      await assertFinanceRecordAccess(expense,actor,transaction);
      if(expense.status!=='posted') fail('Yalnız post edilmiş masraf ters kaydedilebilir',409);
      const normalizedReason=normalizeText(reason,500); if(!normalizedReason) fail('Masraf ters kayıt nedeni zorunludur');
      await assertPeriodOpen(new Date(),transaction);
      const original=await FinanceTransaction.findByPk(expense.transaction_id,{transaction,lock:transaction.LOCK.UPDATE});
      if(!original||original.status!=='posted'||original.transaction_type!=='expense') fail('Masrafa bağlı aktif finans hareketi bulunamadı',409);
      if(expense.reimbursement_receivable_id){
        const receivable=await FinanceReceivable.findByPk(expense.reimbursement_receivable_id,{transaction,lock:transaction.LOCK.UPDATE});
        if(receivable){const settled=await settledForReceivable(receivable.id,transaction);if(settled>0n) fail('Müvekkile yansıtılan masrafta tahsilat/indirim bulunduğu için önce bağlı alacak finans hareketlerini geri alın',409); if(['draft','open'].includes(receivable.status)) await receivable.update({status:'cancelled'},{transaction});}
      }
      const reference_no=await nextReference('transaction','REV',transaction);
      const reversal=await FinanceTransaction.create({reference_no,client_id:original.client_id,case_id:original.case_id,consultation_id:original.consultation_id,account_id:original.account_id,transaction_type:'reversal',direction:'in',amount:original.amount,currency:original.currency,base_currency:original.base_currency,fx_rate:original.fx_rate,base_amount:original.base_amount,payment_method:original.payment_method,transaction_date:new Date(),description:`Masraf ters kayıt: ${expense.reference_no}`,status:'posted',reversed_transaction_id:original.id,reversal_reason:normalizedReason,posted_at:new Date(),created_by:actorId(actor)},{transaction});
      await original.update({status:'reversed',reversed_at:new Date(),reversed_by:actorId(actor),reversal_reason:normalizedReason},{transaction});
      const before=expense.toJSON(); await expense.update({status:'cancelled'},{transaction});
      await audit({entity_type:'finance_expense',entity_id:expense.id,action:'reverse',actor_id:actorId(actor),reason:normalizedReason,before_data:before,after_data:{...expense.toJSON(),reversal_transaction_id:reversal.id},metadata:requestMeta},transaction);
      await audit({entity_type:'finance_transaction',entity_id:original.id,action:'reverse',actor_id:actorId(actor),reason:normalizedReason,before_data:{status:'posted'},after_data:{status:'reversed',reversal_id:reversal.id},metadata:requestMeta},transaction);
      return {expense,original,reversal};
    });
  },

  async reverseTransfer(transactionId, reason, actor, requestMeta = {}) {
    return sequelize.transaction(async transaction => {
      actorId(actor); const seed=await FinanceTransaction.findByPk(transactionId,{transaction,lock:transaction.LOCK.UPDATE}); if(!seed) failNotFound();
      if(!['transfer_in','transfer_out'].includes(seed.transaction_type)||!seed.transfer_group_id) fail('Finans hareketi bir hesap transferi değildir',409);
      if(!canViewAllFinance(actor)) failNotFound();
      const normalizedReason=normalizeText(reason,500); if(!normalizedReason) fail('Transfer ters kayıt nedeni zorunludur');
      await assertPeriodOpen(new Date(),transaction);
      const legs=await FinanceTransaction.findAll({where:{transfer_group_id:seed.transfer_group_id,transaction_type:{[Op.in]:['transfer_in','transfer_out']}},transaction,lock:transaction.LOCK.UPDATE,order:[['transaction_type','ASC']]});
      if(legs.length!==2||legs.some(x=>x.status!=='posted')) fail('Transferin iki aktif ayağı bulunamadı veya transfer zaten kapatılmış',409);
      const reversals=[];
      for(const leg of legs){const reference_no=await nextReference('transaction','REV',transaction);const reversal=await FinanceTransaction.create({reference_no,client_id:null,case_id:null,consultation_id:null,account_id:leg.account_id,transaction_type:'reversal',direction:leg.direction==='in'?'out':'in',amount:leg.amount,currency:leg.currency,base_currency:leg.base_currency,fx_rate:leg.fx_rate,base_amount:leg.base_amount,payment_method:'bank_transfer',transaction_date:new Date(),description:`Transfer ters kayıt: ${leg.reference_no}`,status:'posted',transfer_group_id:leg.transfer_group_id,reversed_transaction_id:leg.id,reversal_reason:normalizedReason,posted_at:new Date(),created_by:actorId(actor)},{transaction});await leg.update({status:'reversed',reversed_at:new Date(),reversed_by:actorId(actor),reversal_reason:normalizedReason},{transaction});reversals.push(reversal);}
      await audit({entity_type:'finance_transfer',entity_id:seed.transfer_group_id,action:'reverse',actor_id:actorId(actor),reason:normalizedReason,before_data:{transaction_ids:legs.map(x=>x.id)},after_data:{reversal_ids:reversals.map(x=>x.id)},metadata:requestMeta},transaction);
      return {transfer_group_id:seed.transfer_group_id,originals:legs,reversals};
    });
  },

  async transfer(data, actor, requestMeta = {}) {
    return sequelize.transaction(async transaction => {
      const creator=actorId(actor);
      if(!canViewAllFinance(actor)) fail('Hesaplar arası transfer için firma geneli finans yetkisi gerekir',403);
      await assertPeriodOpen(data.transaction_date,transaction);
      if(!data.from_account_id||!data.to_account_id||String(data.from_account_id)===String(data.to_account_id)) fail('Kaynak ve hedef hesap farklı olmalıdır');

      // Hesapları deterministik sırayla kilitlemek eşzamanlı transferlerde deadlock riskini azaltır.
      const ids=[String(data.from_account_id),String(data.to_account_id)].sort();
      const accounts=[];
      for(const id of ids){
        const a=await FinanceAccount.findOne({where:{id,is_active:true},transaction,lock:transaction.LOCK.UPDATE});
        if(!a) fail('Finans hesabı bulunamadı',404);
        accounts.push(a);
      }
      const from=accounts.find(a=>String(a.id)===String(data.from_account_id));
      const to=accounts.find(a=>String(a.id)===String(data.to_account_id));
      if(!from||!to) fail('Kaynak veya hedef finans hesabı bulunamadı',404);

      const amount=normalizeMoney(data.amount,{positive:true});
      const sourceCurrency=normalizeCurrency(data.currency||from.currency);
      if(sourceCurrency!==String(from.currency)) fail('Transfer para birimi kaynak hesapla aynı olmalıdır',409);
      const targetAmount=normalizeMoney(data.target_amount||amount,{positive:true});
      if(String(to.currency)===String(from.currency) && moneyToUnits(targetAmount)!==moneyToUnits(amount)) fail('Aynı para birimindeki transferde giriş/çıkış tutarı eşit olmalıdır',409);

      const group=crypto.randomUUID();
      const outId=crypto.randomUUID();
      const incomingId=crypto.randomUUID();
      const date=data.transaction_date||new Date();
      const outRef=await nextReference('transaction','TRF',transaction);
      const inRef=await nextReference('transaction','TRF',transaction);
      const transferBaseCurrency=normalizeCurrency(data.base_currency||'TRY');
      const sourceFx=data.fx_rate;
      const targetFx=data.target_fx_rate || (String(from.currency)===String(to.currency) ? data.fx_rate : null);
      const outBase=computeTransactionBase(amount,String(from.currency),transferBaseCurrency,sourceFx);
      const inBase=computeTransactionBase(targetAmount,String(to.currency),transferBaseCurrency,targetFx);
      const common={client_id:null,case_id:null,consultation_id:null,payment_method:'bank_transfer',transaction_date:date,description:normalizeText(data.description,500)||`Hesap transferi ${from.code} → ${to.code}`,status:'posted',posted_at:new Date(),created_by:creator,transfer_group_id:group};

      // DB constraint'i transfer ayaklarının INSERT anında birbirine bağlı olmasını zorunlu tutuyor.
      // Bu yüzden iki UUID önceden üretilir; sonradan UPDATE ile ilişki kurmak constraint ihlali oluşturur.
      // İki ayak tek INSERT statement'ında yazılır. Böylece hem CHECK constraint hem de
      // self-referencing FK, iki karşı kayıt aynı statement içinde mevcut olduğundan sağlanır.
      const createdLegs=await FinanceTransaction.bulkCreate([
        {
          ...common,id:outId,reference_no:outRef,account_id:from.id,transaction_type:'transfer_out',direction:'out',amount,currency:from.currency,
          base_currency:outBase.baseCurrency,fx_rate:outBase.fxRate,base_amount:outBase.baseAmount,related_transaction_id:incomingId,
        },
        {
          ...common,id:incomingId,reference_no:inRef,account_id:to.id,transaction_type:'transfer_in',direction:'in',amount:targetAmount,currency:to.currency,
          base_currency:inBase.baseCurrency,fx_rate:inBase.fxRate,base_amount:inBase.baseAmount,related_transaction_id:outId,
        },
      ],{transaction,returning:true});
      const out=createdLegs.find(x=>String(x.id)===outId);
      const incoming=createdLegs.find(x=>String(x.id)===incomingId);
      if(!out||!incoming) fail('Transfer hareketleri oluşturulamadı',500);

      await audit({entity_type:'finance_transfer',entity_id:group,action:'post',actor_id:creator,after_data:{transfer_group_id:group,out_transaction_id:out.id,in_transaction_id:incoming.id},metadata:requestMeta},transaction);
      return {transfer_group_id:group,out,in:incoming};
    });
  },

  async createRefund(originalId, data, actor, requestMeta = {}) {
    return sequelize.transaction(async transaction => {
      const creator=actorId(actor);
      const idempotencyKey=data.idempotency_key?String(data.idempotency_key).slice(0,128):null;
      if(idempotencyKey){const existing=await FinanceTransaction.findOne({where:{idempotency_key:idempotencyKey},transaction});if(existing){const expectedAmount=normalizeMoney(data.amount,{positive:true});if(existing.transaction_type!=='refund'||String(existing.related_transaction_id)!==String(originalId)||String(existing.amount)!==String(expectedAmount)||(data.account_id&&String(existing.account_id)!==String(data.account_id))) fail('Idempotency-Key farklı bir finans işlemi için kullanılmış',409);return existing;}}
      const reason=normalizeText(data.reason,500); if(!reason) fail('İade nedeni zorunludur');
      if (data.payment_method && !PAYMENT_METHODS.has(data.payment_method)) fail('Geçersiz ödeme yöntemi');
      const original=await FinanceTransaction.findByPk(originalId,{transaction,lock:transaction.LOCK.UPDATE});
      if(!original) failNotFound();
      await assertContext(original,actor,transaction);
      if(original.transaction_type!=='receipt' || original.direction!=='in' || original.status!=='posted') fail('Yalnız aktif tahsilat iade edilebilir',409);
      await assertPeriodOpen(data.transaction_date,transaction);
      const amount=normalizeMoney(data.amount,{positive:true});
      const amountUnits=moneyToUnits(amount);
      const [refundTotals]=await sequelize.query(`SELECT COALESCE(SUM(amount),0)::text total FROM finance_transactions WHERE transaction_type='refund' AND related_transaction_id=:originalId AND status='posted' AND deleted_at IS NULL`,{replacements:{originalId},type:QueryTypes.SELECT,transaction});
      if(moneyToUnits(refundTotals.total)+amountUnits>moneyToUnits(original.amount)) fail('İade toplamı tahsilat tutarını aşamaz',409);

      const account=await FinanceAccount.findOne({where:{id:data.account_id||original.account_id,is_active:true},transaction,lock:transaction.LOCK.UPDATE});
      if(!account) fail('Finans hesabı bulunamadı',404);
      if(String(account.currency)!==String(original.currency)) fail('İade hesabının para birimi tahsilatla aynı olmalıdır',409);

      const [allocationTotal]=await sequelize.query(`SELECT COALESCE(SUM(amount),0)::text total FROM finance_allocations WHERE transaction_id=:originalId AND deleted_at IS NULL`,{replacements:{originalId},type:QueryTypes.SELECT,transaction});
      const [refundedAllocationTotal]=await sequelize.query(`SELECT COALESCE(SUM(ra.amount),0)::text total FROM finance_refund_allocations ra JOIN finance_transactions rt ON rt.id=ra.refund_transaction_id WHERE ra.original_transaction_id=:originalId AND ra.deleted_at IS NULL AND rt.status='posted' AND rt.deleted_at IS NULL`,{replacements:{originalId},type:QueryTypes.SELECT,transaction});
      const originalUnallocated=moneyToUnits(original.amount)-moneyToUnits(allocationTotal.total);
      const alreadyUnallocatedRefund=moneyToUnits(refundTotals.total)-moneyToUnits(refundedAllocationTotal.total);
      const availableUnallocated=originalUnallocated-alreadyUnallocatedRefund;

      const refundAllocations=Array.isArray(data.allocations)?data.allocations:[];
      let allocatedRefundUnits=0n;
      const checked=[];
      for(const item of refundAllocations){
        const refundAmount=normalizeMoney(item.amount,{positive:true});
        const refundUnits=moneyToUnits(refundAmount); allocatedRefundUnits+=refundUnits;
        if(allocatedRefundUnits>amountUnits) fail('İade mahsup toplamı iade tutarını aşamaz',409);
        const originalAllocation=await FinanceAllocation.findOne({where:{transaction_id:originalId,receivable_id:item.receivable_id},transaction,lock:transaction.LOCK.UPDATE});
        if(!originalAllocation) fail('Tahsilatın bu alacağa ait mahsup kaydı bulunamadı',409);
        const [prior]=await sequelize.query(`SELECT COALESCE(SUM(ra.amount),0)::text total FROM finance_refund_allocations ra JOIN finance_transactions rt ON rt.id=ra.refund_transaction_id WHERE ra.original_transaction_id=:originalId AND ra.receivable_id=:receivableId AND ra.deleted_at IS NULL AND rt.status='posted' AND rt.deleted_at IS NULL`,{replacements:{originalId,receivableId:item.receivable_id},type:QueryTypes.SELECT,transaction});
        if(moneyToUnits(prior.total)+refundUnits>moneyToUnits(originalAllocation.amount)) fail('Alacak bazındaki iade, özgün mahsup tutarını aşamaz',409);
        checked.push({receivable_id:item.receivable_id,amount:refundAmount});
      }
      if(amountUnits-allocatedRefundUnits>availableUnallocated) fail('İadenin mahsupsuz kısmı kullanılabilir müvekkil avansını aşar; alacak mahsuplarını belirtin',409);

      const reference_no=await nextReference('transaction','RFD',transaction);
      const {baseCurrency,fxRate,baseAmount}=computeTransactionBase(amount,original.currency,original.base_currency||'TRY',data.fx_rate||original.fx_rate);
      const refund=await FinanceTransaction.create({
        reference_no,idempotency_key:idempotencyKey,
        client_id:original.client_id,case_id:original.case_id,consultation_id:original.consultation_id,account_id:account.id,
        transaction_type:'refund',direction:'out',amount,currency:original.currency,base_currency:baseCurrency,fx_rate:fxRate,base_amount:baseAmount,
        payment_method:data.payment_method||original.payment_method,transaction_date:data.transaction_date||new Date(),description:normalizeText(data.description,500)||`İade: ${original.reference_no}`,
        external_reference:normalizeText(data.external_reference,160),status:'posted',posted_at:new Date(),created_by:creator,related_transaction_id:original.id,
      },{transaction});
      for(const item of checked){
        await FinanceRefundAllocation.create({refund_transaction_id:refund.id,original_transaction_id:original.id,receivable_id:item.receivable_id,amount:item.amount,currency:original.currency,created_by:creator},{transaction});
        await refreshReceivableStatus(item.receivable_id,transaction);
      }
      await audit({entity_type:'finance_transaction',entity_id:refund.id,action:'refund',actor_id:creator,reason,after_data:{...refund.toJSON(),original_transaction_id:original.id,refund_allocations:checked},metadata:requestMeta},transaction);
      return refund;
    });
  },

  async getDashboard(actor, filters={}) {
    actorId(actor);
    const from=filters.from||new Date(Date.UTC(new Date().getUTCFullYear(),new Date().getUTCMonth(),1)).toISOString().slice(0,10);
    const to=filters.to||new Date().toISOString().slice(0,10);
    const txScope=financeScope('t',actor); const rScope=financeScope('r',actor);
    const rows=await sequelize.query(`SELECT t.currency,
      COALESCE(SUM(CASE WHEN t.transaction_type='receipt' AND t.direction='in' THEN t.amount ELSE 0 END),0)::text receipts,
      COALESCE(SUM(CASE WHEN t.transaction_type='expense' AND t.direction='out' THEN t.amount ELSE 0 END),0)::text expenses,
      COALESCE(SUM(CASE WHEN t.transaction_type='refund' AND t.direction='out' THEN t.amount ELSE 0 END),0)::text refunds
      FROM finance_transactions t WHERE t.status='posted' AND t.deleted_at IS NULL AND t.transaction_date::date BETWEEN :from AND :to AND ${txScope.sql}
      GROUP BY t.currency ORDER BY t.currency`,{replacements:{from,to,...txScope.replacements},type:QueryTypes.SELECT});
    const aging=await sequelize.query(`SELECT currency,
      COALESCE(SUM(CASE WHEN due_date IS NULL OR due_date>=CURRENT_DATE THEN GREATEST(amount-settled,0) ELSE 0 END),0)::text current,
      COALESCE(SUM(CASE WHEN CURRENT_DATE-due_date BETWEEN 1 AND 30 THEN GREATEST(amount-settled,0) ELSE 0 END),0)::text d1_30,
      COALESCE(SUM(CASE WHEN CURRENT_DATE-due_date BETWEEN 31 AND 60 THEN GREATEST(amount-settled,0) ELSE 0 END),0)::text d31_60,
      COALESCE(SUM(CASE WHEN CURRENT_DATE-due_date BETWEEN 61 AND 90 THEN GREATEST(amount-settled,0) ELSE 0 END),0)::text d61_90,
      COALESCE(SUM(CASE WHEN CURRENT_DATE-due_date>90 THEN GREATEST(amount-settled,0) ELSE 0 END),0)::text d90_plus
      FROM (SELECT r.*,
        COALESCE((SELECT SUM(a.amount) FROM finance_allocations a JOIN finance_transactions t2 ON t2.id=a.transaction_id WHERE a.receivable_id=r.id AND a.deleted_at IS NULL AND t2.status='posted' AND t2.direction='in'),0)
        -COALESCE((SELECT SUM(ra.amount) FROM finance_refund_allocations ra JOIN finance_transactions rt ON rt.id=ra.refund_transaction_id WHERE ra.receivable_id=r.id AND ra.deleted_at IS NULL AND rt.status='posted'),0)
        +COALESCE((SELECT SUM(x.amount) FROM finance_receivable_adjustments x WHERE x.receivable_id=r.id AND x.status='posted' AND x.deleted_at IS NULL),0) settled
        FROM finance_receivables r WHERE r.deleted_at IS NULL AND r.status IN ('open','partially_paid') AND ${rScope.sql}) q
      GROUP BY currency ORDER BY currency`,{replacements:rScope.replacements,type:QueryTypes.SELECT});
    return {period:{from,to},cashflow_by_currency:rows,aging_by_currency:aging,scope:canViewAllFinance(actor)?'firm':'accessible_resources'};
  },

  async getAccountBalances(actor) {
  actorId(actor);

  if (!canViewAllFinance(actor)) {
    fail('Firma geneli finans hesabı bakiyeleri için yetkiniz yok', 403);
  }

  return sequelize.query(`
    SELECT
      a.id,
      a.code,
      a.name,
      a.account_type,
      a.currency,
      (
        a.opening_balance
        + COALESCE(
            SUM(
              CASE
                WHEN t.status IN ('posted', 'reversed')
                     AND t.direction = 'in'
                  THEN t.amount

                WHEN t.status IN ('posted', 'reversed')
                     AND t.direction = 'out'
                  THEN -t.amount

                ELSE 0
              END
            ),
            0
          )
      )::text AS balance
    FROM finance_accounts a
    LEFT JOIN finance_transactions t
      ON t.account_id = a.id
      AND t.deleted_at IS NULL
    WHERE
      a.deleted_at IS NULL
      AND a.is_active = true
    GROUP BY a.id
    ORDER BY a.name
  `, {
    type: QueryTypes.SELECT
  });
},

  async getContextSummary(context, id, actor) {
    const column=context==='client'?'client_id':context==='case'?'case_id':'consultation_id';
    if(context==='client') await assertClientAccess(id,actor,null); else if(context==='case') await assertCaseAccess(id,actor,null); else await assertConsultationAccess(id,actor,null);
    const receivables=await sequelize.query(`SELECT r.currency,
      COALESCE(SUM(r.amount),0)::text receivables,
      COALESCE(SUM(COALESCE((SELECT SUM(a.amount) FROM finance_allocations a JOIN finance_transactions t ON t.id=a.transaction_id WHERE a.receivable_id=r.id AND a.deleted_at IS NULL AND t.status='posted' AND t.direction='in'),0)-COALESCE((SELECT SUM(ra.amount) FROM finance_refund_allocations ra JOIN finance_transactions rt ON rt.id=ra.refund_transaction_id WHERE ra.receivable_id=r.id AND ra.deleted_at IS NULL AND rt.status='posted'),0)),0)::text allocated,
      COALESCE(SUM(COALESCE((SELECT SUM(x.amount) FROM finance_receivable_adjustments x WHERE x.receivable_id=r.id AND x.status='posted' AND x.deleted_at IS NULL),0)),0)::text adjustments,
      COALESCE(SUM(GREATEST(r.amount-COALESCE((SELECT SUM(a.amount) FROM finance_allocations a JOIN finance_transactions t ON t.id=a.transaction_id WHERE a.receivable_id=r.id AND a.deleted_at IS NULL AND t.status='posted' AND t.direction='in'),0)+COALESCE((SELECT SUM(ra.amount) FROM finance_refund_allocations ra JOIN finance_transactions rt ON rt.id=ra.refund_transaction_id WHERE ra.receivable_id=r.id AND ra.deleted_at IS NULL AND rt.status='posted'),0)-COALESCE((SELECT SUM(x.amount) FROM finance_receivable_adjustments x WHERE x.receivable_id=r.id AND x.status='posted' AND x.deleted_at IS NULL),0),0)),0)::text open_balance
      FROM finance_receivables r WHERE r.${column}=:id AND r.deleted_at IS NULL AND r.status IN ('open','partially_paid','paid') GROUP BY r.currency ORDER BY r.currency`,{replacements:{id},type:QueryTypes.SELECT});
    const cash=await sequelize.query(`SELECT t.currency,
      COALESCE(SUM(CASE WHEN t.transaction_type='receipt' AND t.status='posted' THEN t.amount ELSE 0 END),0)::text receipts,
      COALESCE(SUM(CASE WHEN t.transaction_type='refund' AND t.status='posted' THEN t.amount ELSE 0 END),0)::text refunds,
      COALESCE(SUM(CASE WHEN t.transaction_type='expense' AND t.status='posted' THEN t.amount ELSE 0 END),0)::text expenses
      FROM finance_transactions t WHERE t.${column}=:id AND t.deleted_at IS NULL GROUP BY t.currency ORDER BY t.currency`,{replacements:{id},type:QueryTypes.SELECT});
    return {context,id,receivables_by_currency:receivables,cash_by_currency:cash};
  },

  async getClientSummary(clientId, actor) { return this.getContextSummary('client',clientId,actor); },
  async getCaseSummary(caseId, actor) { return this.getContextSummary('case',caseId,actor); },
  async getConsultationSummary(consultationId, actor) { return this.getContextSummary('consultation',consultationId,actor); },

  async getProfitability(actor, filters={}) {
    actorId(actor);
    const context=filters.context||null, id=filters.id||null;
    let contextSql='TRUE', replacements={};
    if(context&&id){
      if(context==='case'){await assertCaseAccess(id,actor,null);contextSql='t.case_id=:contextId';}
      else if(context==='consultation'){await assertConsultationAccess(id,actor,null);contextSql='t.consultation_id=:contextId';}
      else if(context==='client'){await assertClientAccess(id,actor,null);contextSql='t.client_id=:contextId';}
      else fail('Geçersiz kârlılık bağlamı');
      replacements.contextId=id;
    } else {
      const scope=financeScope('t',actor); contextSql=scope.sql; replacements={...scope.replacements};
    }
    const rows=await sequelize.query(`SELECT t.currency,
      COALESCE(SUM(CASE WHEN t.transaction_type='receipt' AND t.status='posted' THEN t.amount ELSE 0 END),0)::text collected,
      COALESCE(SUM(CASE WHEN t.transaction_type='refund' AND t.status='posted' THEN t.amount ELSE 0 END),0)::text refunds,
      COALESCE(SUM(CASE WHEN t.transaction_type='expense' AND t.status='posted' AND EXISTS(SELECT 1 FROM finance_expenses e WHERE e.transaction_id=t.id AND e.deleted_at IS NULL AND e.reimbursable=false) THEN t.amount ELSE 0 END),0)::text non_reimbursable_expenses,
      (COALESCE(SUM(CASE WHEN t.transaction_type='receipt' AND t.status='posted' THEN t.amount ELSE 0 END),0)-COALESCE(SUM(CASE WHEN t.transaction_type='refund' AND t.status='posted' THEN t.amount ELSE 0 END),0)-COALESCE(SUM(CASE WHEN t.transaction_type='expense' AND t.status='posted' AND EXISTS(SELECT 1 FROM finance_expenses e WHERE e.transaction_id=t.id AND e.deleted_at IS NULL AND e.reimbursable=false) THEN t.amount ELSE 0 END),0))::text net_cash_contribution
      FROM finance_transactions t WHERE t.deleted_at IS NULL AND ${contextSql} GROUP BY t.currency ORDER BY t.currency`,{replacements,type:QueryTypes.SELECT});
    return {basis:'cash_collection_less_non_reimbursable_expenses',context:context&&id?{type:context,id}:null,by_currency:rows};
  },

  async getLedger(actor, filters={}) {
    actorId(actor);
    const limit=Math.min(Math.max(parseInt(filters.limit||50,10)||50,1),filters.export===true?5000:200);
    const offset=Math.max(parseInt(filters.offset||0,10)||0,0);
    const where=[`t.deleted_at IS NULL`]; const replacements={limit,offset};
    if(filters.client_id){await assertClientAccess(filters.client_id,actor,null);where.push('t.client_id=:clientId');replacements.clientId=filters.client_id;}
    else if(filters.case_id){await assertCaseAccess(filters.case_id,actor,null);where.push('t.case_id=:caseId');replacements.caseId=filters.case_id;}
    else if(filters.consultation_id){await assertConsultationAccess(filters.consultation_id,actor,null);where.push('t.consultation_id=:consultationId');replacements.consultationId=filters.consultation_id;}
    else {const scope=financeScope('t',actor);where.push(scope.sql);Object.assign(replacements,scope.replacements);}
    if(filters.from){where.push('t.transaction_date::date>=:from');replacements.from=filters.from;}
    if(filters.to){where.push('t.transaction_date::date<=:to');replacements.to=filters.to;}
    if(filters.currency){where.push('t.currency=:currency');replacements.currency=normalizeCurrency(filters.currency);}
    if(filters.transaction_type){where.push('t.transaction_type=:type');replacements.type=filters.transaction_type;}
    if(filters.status){where.push('t.status=:status');replacements.status=filters.status;}
    if(filters.search){const q=normalizeText(filters.search,120);if(q){where.push(`(t.reference_no ILIKE :search OR COALESCE(t.description,'') ILIKE :search OR COALESCE(t.external_reference,'') ILIKE :search OR EXISTS (SELECT 1 FROM finance_accounts sa WHERE sa.id=t.account_id AND (sa.name ILIKE :search OR sa.code ILIKE :search)))`);replacements.search=`%${q}%`;}}
    const sqlWhere=where.join(' AND ');
    const rows=await sequelize.query(`SELECT t.id,t.reference_no,t.transaction_type,t.direction,t.amount::text,t.currency,t.base_amount::text,t.base_currency,t.transaction_date,t.description,t.external_reference,t.status,t.client_id,t.case_id,t.consultation_id,t.account_id,a.code account_code,a.name account_name,t.related_transaction_id,t.reversed_transaction_id,t.created_at FROM finance_transactions t JOIN finance_accounts a ON a.id=t.account_id WHERE ${sqlWhere} ORDER BY t.transaction_date DESC,t.created_at DESC LIMIT :limit OFFSET :offset`,{replacements,type:QueryTypes.SELECT});
    const [countRow]=await sequelize.query(`SELECT COUNT(*)::int total FROM finance_transactions t WHERE ${sqlWhere}`,{replacements,type:QueryTypes.SELECT});
    return {rows,total:Number(countRow.total),limit,offset};
  },

  async listFeeAgreements(actor, filters={}) {
    actorId(actor);
    const limit=Math.min(Math.max(parseInt(filters.limit||50,10)||50,1),200), offset=Math.max(parseInt(filters.offset||0,10)||0,0);
    const where=['f.deleted_at IS NULL']; const replacements={limit,offset};
    if(filters.client_id){await assertClientAccess(filters.client_id,actor,null);where.push('f.client_id=:clientId');replacements.clientId=filters.client_id;}
    else if(filters.case_id){await assertCaseAccess(filters.case_id,actor,null);where.push('f.case_id=:caseId');replacements.caseId=filters.case_id;}
    else if(filters.consultation_id){await assertConsultationAccess(filters.consultation_id,actor,null);where.push('f.consultation_id=:consultationId');replacements.consultationId=filters.consultation_id;}
    else {const scope=financeScope('f',actor);where.push(scope.sql);Object.assign(replacements,scope.replacements);}
    if(filters.status){where.push('f.status=:status');replacements.status=filters.status;}
    if(filters.currency){where.push('f.currency=:currency');replacements.currency=normalizeCurrency(filters.currency);}
    if(filters.search){const q=normalizeText(filters.search,120);if(q){where.push(`(f.reference_no ILIKE :search OR f.title ILIKE :search)`);replacements.search=`%${q}%`;}}
    const sqlWhere=where.join(' AND ');
    const rows=await sequelize.query(`SELECT f.id,f.reference_no,f.title,f.billing_model,f.agreed_amount::text,f.currency,f.status,f.effective_from,f.effective_to,f.signed_at,f.client_id,f.case_id,f.consultation_id,f.created_by,f.approved_by,f.approved_at,f.created_at,f.updated_at FROM finance_fee_agreements f WHERE ${sqlWhere} ORDER BY f.created_at DESC LIMIT :limit OFFSET :offset`,{replacements,type:QueryTypes.SELECT});
    const [count]=await sequelize.query(`SELECT COUNT(*)::int total FROM finance_fee_agreements f WHERE ${sqlWhere}`,{replacements,type:QueryTypes.SELECT});
    return {rows,total:Number(count.total),limit,offset};
  },

  async getFeeAgreement(id, actor) {
    actorId(actor); const row=await FinanceFeeAgreement.findByPk(id); if(!row) failNotFound();
    await assertContext(row,actor,null);
    const [data]=await sequelize.query(`SELECT f.*, f.agreed_amount::text agreed_amount FROM finance_fee_agreements f WHERE f.id=:id AND f.deleted_at IS NULL`,{replacements:{id},type:QueryTypes.SELECT});
    if(!data) failNotFound();
    const receivables=await sequelize.query(`SELECT id,reference_no,description,amount::text,currency,due_date,status,posted_at FROM finance_receivables WHERE fee_agreement_id=:id AND deleted_at IS NULL ORDER BY due_date NULLS LAST,created_at`,{replacements:{id},type:QueryTypes.SELECT});
    const plans=await sequelize.query(`SELECT id,reference_no,title,total_amount::text,currency,status,start_date,end_date FROM finance_payment_plans WHERE fee_agreement_id=:id AND deleted_at IS NULL ORDER BY created_at DESC`,{replacements:{id},type:QueryTypes.SELECT});
    return {...data,receivables,payment_plans:plans};
  },

  async listReceivables(actor, filters={}) {
    actorId(actor); const limit=Math.min(Math.max(parseInt(filters.limit||50,10)||50,1),200),offset=Math.max(parseInt(filters.offset||0,10)||0,0);
    const where=['r.deleted_at IS NULL'];const replacements={limit,offset};
    if(filters.client_id){await assertClientAccess(filters.client_id,actor,null);where.push('r.client_id=:clientId');replacements.clientId=filters.client_id;}
    else if(filters.case_id){await assertCaseAccess(filters.case_id,actor,null);where.push('r.case_id=:caseId');replacements.caseId=filters.case_id;}
    else if(filters.consultation_id){await assertConsultationAccess(filters.consultation_id,actor,null);where.push('r.consultation_id=:consultationId');replacements.consultationId=filters.consultation_id;}
    else {const scope=financeScope('r',actor);where.push(scope.sql);Object.assign(replacements,scope.replacements);}
    if(filters.status){where.push('r.status=:status');replacements.status=filters.status;} if(filters.currency){where.push('r.currency=:currency');replacements.currency=normalizeCurrency(filters.currency);}
    if(filters.due_before){where.push('r.due_date<=:dueBefore');replacements.dueBefore=filters.due_before;}
    if(filters.search){const q=normalizeText(filters.search,120);if(q){where.push(`(r.reference_no ILIKE :search OR COALESCE(r.description,'') ILIKE :search)`);replacements.search=`%${q}%`;}}
    const sqlWhere=where.join(' AND ');
    const base=`SELECT r.id,r.reference_no,r.receivable_type,r.description,r.amount::text,r.currency,r.due_date,r.status,r.posted_at,r.client_id,r.case_id,r.consultation_id,r.fee_agreement_id,
      COALESCE((SELECT SUM(a.amount) FROM finance_allocations a JOIN finance_transactions t ON t.id=a.transaction_id WHERE a.receivable_id=r.id AND a.deleted_at IS NULL AND t.deleted_at IS NULL AND t.status='posted' AND t.direction='in'),0)::text allocated,
      COALESCE((SELECT SUM(ra.amount) FROM finance_refund_allocations ra JOIN finance_transactions rt ON rt.id=ra.refund_transaction_id WHERE ra.receivable_id=r.id AND ra.deleted_at IS NULL AND rt.deleted_at IS NULL AND rt.status='posted'),0)::text refunded,
      COALESCE((SELECT SUM(x.amount) FROM finance_receivable_adjustments x WHERE x.receivable_id=r.id AND x.status='posted' AND x.deleted_at IS NULL),0)::text adjusted
      FROM finance_receivables r WHERE ${sqlWhere}`;
    const rows=await sequelize.query(`${base} ORDER BY r.due_date NULLS LAST,r.created_at DESC LIMIT :limit OFFSET :offset`,{replacements,type:QueryTypes.SELECT});
    const [count]=await sequelize.query(`SELECT COUNT(*)::int total FROM finance_receivables r WHERE ${sqlWhere}`,{replacements,type:QueryTypes.SELECT});
    return {rows:rows.map(x=>({...x,...calculateReceivableSettlement({amount:x.amount,allocated:x.allocated,refunded:x.refunded,adjusted:x.adjusted})})),total:Number(count.total),limit,offset};
  },

  async getReceivable(id, actor) {
    actorId(actor);
    const row=await FinanceReceivable.findByPk(id);
    if(!row) failNotFound();
    await assertContext(row,actor,null);

    const [data]=await sequelize.query(`
      SELECT r.*, r.amount::text AS amount
      FROM finance_receivables r
      WHERE r.id=:id AND r.deleted_at IS NULL
    `,{replacements:{id},type:QueryTypes.SELECT});
    if(!data) failNotFound();

    const allocations=await sequelize.query(`
      SELECT
        a.id,
        a.amount::text,
        a.currency,
        a.transaction_id,
        t.reference_no AS transaction_reference,
        t.transaction_date,
        t.status
      FROM finance_allocations a
      JOIN finance_transactions t ON t.id=a.transaction_id
      WHERE a.receivable_id=:id
        AND a.deleted_at IS NULL
        AND t.deleted_at IS NULL
      ORDER BY a.created_at
    `,{replacements:{id},type:QueryTypes.SELECT});

    // Only active refunds affect the receivable settlement.
    // Reversed refunds remain in the ledger/audit trail, but must not reopen the receivable.
    const refunds=await sequelize.query(`
      SELECT
        ra.id,
        ra.amount::text,
        ra.currency,
        ra.refund_transaction_id,
        t.reference_no AS refund_reference,
        t.transaction_date,
        t.status
      FROM finance_refund_allocations ra
      JOIN finance_transactions t ON t.id=ra.refund_transaction_id
      WHERE ra.receivable_id=:id
        AND ra.deleted_at IS NULL
        AND t.deleted_at IS NULL
        AND t.status='posted'
      ORDER BY ra.created_at
    `,{replacements:{id},type:QueryTypes.SELECT});

    const adjustments=await sequelize.query(`
      SELECT id,reference_no,adjustment_type,amount::text,currency,reason,status,created_at
      FROM finance_receivable_adjustments
      WHERE receivable_id=:id AND deleted_at IS NULL
      ORDER BY created_at
    `,{replacements:{id},type:QueryTypes.SELECT});

    return {...data,allocations,refunds,adjustments};
  },

  async listPaymentPlans(actor, filters={}) {
    actorId(actor); const limit=Math.min(Math.max(parseInt(filters.limit||50,10)||50,1),200),offset=Math.max(parseInt(filters.offset||0,10)||0,0);
    const where=['p.deleted_at IS NULL'];const replacements={limit,offset};
    if(filters.client_id){await assertClientAccess(filters.client_id,actor,null);where.push('p.client_id=:clientId');replacements.clientId=filters.client_id;}
    else if(filters.case_id){await assertCaseAccess(filters.case_id,actor,null);where.push('p.case_id=:caseId');replacements.caseId=filters.case_id;}
    else if(filters.consultation_id){await assertConsultationAccess(filters.consultation_id,actor,null);where.push('p.consultation_id=:consultationId');replacements.consultationId=filters.consultation_id;}
    else {const scope=financeScope('p',actor);where.push(scope.sql);Object.assign(replacements,scope.replacements);}
    if(filters.status){where.push('p.status=:status');replacements.status=filters.status;}
    if(filters.search){const q=normalizeText(filters.search,120);if(q){where.push(`(p.reference_no ILIKE :search OR p.title ILIKE :search OR COALESCE(p.description,'') ILIKE :search)`);replacements.search=`%${q}%`;}}
    const sqlWhere=where.join(' AND ');
    const rows=await sequelize.query(`SELECT p.id,p.reference_no,p.title,p.total_amount::text,p.currency,p.plan_type,p.status,p.start_date,p.end_date,p.client_id,p.case_id,p.consultation_id,p.fee_agreement_id,p.created_at FROM finance_payment_plans p WHERE ${sqlWhere} ORDER BY p.created_at DESC LIMIT :limit OFFSET :offset`,{replacements,type:QueryTypes.SELECT});
    const [count]=await sequelize.query(`SELECT COUNT(*)::int total FROM finance_payment_plans p WHERE ${sqlWhere}`,{replacements,type:QueryTypes.SELECT}); return {rows,total:Number(count.total),limit,offset};
  },

  async getPaymentPlan(id, actor) {
    actorId(actor); const plan=await FinancePaymentPlan.findByPk(id); if(!plan) failNotFound(); await assertContext(plan,actor,null);
    const [data]=await sequelize.query(`SELECT p.*,p.total_amount::text total_amount FROM finance_payment_plans p WHERE p.id=:id AND p.deleted_at IS NULL`,{replacements:{id},type:QueryTypes.SELECT}); if(!data) failNotFound();
    const installments=await sequelize.query(`SELECT i.id,i.installment_number,i.title,i.amount::text,i.currency,i.due_date,i.status,i.paid_at,i.receivable_id,r.reference_no receivable_reference,r.status receivable_status FROM finance_installments i JOIN finance_receivables r ON r.id=i.receivable_id WHERE i.payment_plan_id=:id AND i.deleted_at IS NULL ORDER BY i.installment_number`,{replacements:{id},type:QueryTypes.SELECT}); return {...data,installments};
  },

  async getTransaction(id, actor) {
    actorId(actor); const row=await FinanceTransaction.findByPk(id); if(!row) failNotFound(); await assertFinanceRecordAccess(row,actor,null);
    const [data]=await sequelize.query(`SELECT t.*,t.amount::text amount,t.base_amount::text base_amount,t.fx_rate::text fx_rate,a.code account_code,a.name account_name FROM finance_transactions t JOIN finance_accounts a ON a.id=t.account_id WHERE t.id=:id AND t.deleted_at IS NULL`,{replacements:{id},type:QueryTypes.SELECT}); if(!data) failNotFound();
    const allocations=await sequelize.query(`SELECT a.id,a.receivable_id,a.amount::text,a.currency,r.reference_no receivable_reference FROM finance_allocations a JOIN finance_receivables r ON r.id=a.receivable_id WHERE a.transaction_id=:id AND a.deleted_at IS NULL`,{replacements:{id},type:QueryTypes.SELECT});
    const refund_allocations=await sequelize.query(`SELECT id,receivable_id,amount::text,currency,original_transaction_id FROM finance_refund_allocations WHERE refund_transaction_id=:id AND deleted_at IS NULL`,{replacements:{id},type:QueryTypes.SELECT});
    const refunds=await sequelize.query(`SELECT id,reference_no,amount::text,currency,transaction_date,status FROM finance_transactions WHERE related_transaction_id=:id AND transaction_type='refund' AND deleted_at IS NULL ORDER BY created_at`,{replacements:{id},type:QueryTypes.SELECT});
    return {...data,allocations,refund_allocations,refunds};
  },

  async getAuditTimeline(entityType, entityId, actor, filters={}) {
    actorId(actor); const allowed=new Set(['fee_agreement','receivable','finance_transaction','finance_payment_plan','finance_expense','finance_account','finance_period','finance_receivable_adjustment','finance_transfer','consultation']); if(!allowed.has(entityType)) fail('Geçersiz finans entity türü');
    let context=null;
    if(entityType==='fee_agreement') context=await FinanceFeeAgreement.findByPk(entityId); else if(entityType==='receivable') context=await FinanceReceivable.findByPk(entityId); else if(entityType==='finance_transaction') context=await FinanceTransaction.findByPk(entityId); else if(entityType==='finance_payment_plan') context=await FinancePaymentPlan.findByPk(entityId); else if(entityType==='finance_expense') context=await FinanceExpense.findByPk(entityId);
    if(context) await assertFinanceRecordAccess(context,actor,null); else if(!canViewAllFinance(actor)) failNotFound();
    const limit=Math.min(Math.max(parseInt(filters.limit||100,10)||100,1),200);
    return FinanceAuditEvent.findAll({where:{entity_type:entityType,entity_id:entityId},order:[['created_at','DESC']],limit,raw:true});
  },

  async listExpenses(actor, filters={}) {
    actorId(actor); const limit=Math.min(Math.max(parseInt(filters.limit||50,10)||50,1),200),offset=Math.max(parseInt(filters.offset||0,10)||0,0);
    const where=['e.deleted_at IS NULL']; const replacements={limit,offset};
    if(filters.client_id){await assertClientAccess(filters.client_id,actor,null);where.push('e.client_id=:clientId');replacements.clientId=filters.client_id;}
    else if(filters.case_id){await assertCaseAccess(filters.case_id,actor,null);where.push('e.case_id=:caseId');replacements.caseId=filters.case_id;}
    else if(filters.consultation_id){await assertConsultationAccess(filters.consultation_id,actor,null);where.push('e.consultation_id=:consultationId');replacements.consultationId=filters.consultation_id;}
    else if(!canViewAllFinance(actor)){const scope=financeScope('e',actor);where.push(scope.sql);Object.assign(replacements,scope.replacements);}
    if(filters.currency){where.push('e.currency=:currency');replacements.currency=normalizeCurrency(filters.currency);}
    if(filters.expense_type){where.push('e.expense_type=:expenseType');replacements.expenseType=filters.expense_type;}
    if(filters.status){where.push('e.status=:status');replacements.status=filters.status;}
    if(filters.from){where.push('e.expense_date::date>=:from');replacements.from=filters.from;}
    if(filters.to){where.push('e.expense_date::date<=:to');replacements.to=filters.to;}
    if(filters.search){const q=normalizeText(filters.search,120);if(q){where.push(`(e.reference_no ILIKE :search OR e.description ILIKE :search OR COALESCE(e.category,'') ILIKE :search)`);replacements.search=`%${q}%`;}}
    const sqlWhere=where.join(' AND ');
    const rows=await sequelize.query(`SELECT e.id,e.reference_no,e.transaction_id,e.client_id,e.case_id,e.consultation_id,e.expense_type,e.category,e.description,e.amount::text,e.currency,e.expense_date,e.reimbursable,e.reimbursement_receivable_id,e.status,e.created_at,t.reference_no transaction_reference FROM finance_expenses e LEFT JOIN finance_transactions t ON t.id=e.transaction_id AND t.deleted_at IS NULL WHERE ${sqlWhere} ORDER BY e.expense_date DESC,e.created_at DESC LIMIT :limit OFFSET :offset`,{replacements,type:QueryTypes.SELECT});
    const [count]=await sequelize.query(`SELECT COUNT(*)::int total FROM finance_expenses e WHERE ${sqlWhere}`,{replacements,type:QueryTypes.SELECT});
    return {rows,total:Number(count.total),limit,offset};
  },

  async getExpense(id, actor) {
    actorId(actor); const expense=await FinanceExpense.findByPk(id); if(!expense) failNotFound();
    if(expense.client_id||expense.case_id||expense.consultation_id) await assertContext(expense,actor,null); else if(!canViewAllFinance(actor)) failNotFound();
    const [data]=await sequelize.query(`SELECT e.*,e.amount::text amount,t.reference_no transaction_reference,t.status transaction_status FROM finance_expenses e LEFT JOIN finance_transactions t ON t.id=e.transaction_id AND t.deleted_at IS NULL WHERE e.id=:id AND e.deleted_at IS NULL`,{replacements:{id},type:QueryTypes.SELECT});
    if(!data) failNotFound(); return data;
  },

  async listPeriods(actor) {
    actorId(actor); if(!canViewAllFinance(actor)) fail('Finans dönemleri için firma geneli finans yetkisi gerekir',403);
    return FinancePeriod.findAll({order:[['starts_on','DESC']],raw:true});
  },

  async getLegacyReconciliation(actor) {
    actorId(actor); if(!canViewAllFinance(actor)) fail('Legacy finans mutabakat raporu için firma geneli finans yetkisi gerekir',403);
    const tables=await sequelize.query(`SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name IN ('payments','payment_plans','payment_installments')`,{type:QueryTypes.SELECT});
    const exists=new Set(tables.map(x=>x.table_name));
    const result={legacy_tables:[...exists],payments:{legacy_count:0,mapped_count:0,unmapped_count:0,by_currency:[]},plans:{legacy_count:0,mapped_count:0},installments:{legacy_count:0,mapped_count:0},status:'ok'};
    if(exists.has('payments')){
      const [counts]=await sequelize.query(`SELECT COUNT(*)::int legacy_count,COUNT(v.id)::int mapped_count FROM payments p LEFT JOIN finance_transactions v ON v.legacy_payment_id=p.id AND v.deleted_at IS NULL WHERE p.deleted_at IS NULL`,{type:QueryTypes.SELECT});
      result.payments={...result.payments,...counts,unmapped_count:Number(counts.legacy_count)-Number(counts.mapped_count)};
      result.payments.by_currency=await sequelize.query(`SELECT COALESCE(pp.currency,'TRY') currency,COALESCE(SUM(p.amount),0)::text legacy_amount,COALESCE(SUM(v.amount),0)::text mapped_amount,COUNT(*)::int legacy_rows,COUNT(v.id)::int mapped_rows FROM payments p LEFT JOIN payment_plans pp ON pp.id=p.payment_plan_id LEFT JOIN finance_transactions v ON v.legacy_payment_id=p.id AND v.deleted_at IS NULL WHERE p.deleted_at IS NULL GROUP BY COALESCE(pp.currency,'TRY') ORDER BY COALESCE(pp.currency,'TRY')`,{type:QueryTypes.SELECT});
    }
    if(exists.has('payment_plans')){const [x]=await sequelize.query(`SELECT COUNT(*)::int legacy_count,COUNT(v.id)::int mapped_count FROM payment_plans p LEFT JOIN finance_payment_plans v ON v.legacy_payment_plan_id=p.id AND v.deleted_at IS NULL WHERE p.deleted_at IS NULL`,{type:QueryTypes.SELECT});result.plans=x;}
    if(exists.has('payment_installments')){const [x]=await sequelize.query(`SELECT COUNT(*)::int legacy_count,COUNT(v.id)::int mapped_count FROM payment_installments p LEFT JOIN finance_installments v ON v.legacy_installment_id=p.id AND v.deleted_at IS NULL WHERE p.deleted_at IS NULL`,{type:QueryTypes.SELECT});result.installments=x;}
    result.payments.by_currency=result.payments.by_currency.map(x=>({...x,amount_matches:moneyToUnits(x.legacy_amount)===moneyToUnits(x.mapped_amount),difference:unitsToMoney(moneyToUnits(x.legacy_amount)-moneyToUnits(x.mapped_amount))}));
    if(result.payments.unmapped_count>0 || result.payments.by_currency.some(x=>!x.amount_matches) || Number(result.plans.legacy_count)!==Number(result.plans.mapped_count) || Number(result.installments.legacy_count)!==Number(result.installments.mapped_count)) result.status='attention_required';
    return result;
  },

};
