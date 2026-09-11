import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import financeV2Api from './finance-v2.api.js';

export const FINANCE_V2_KEYS = {
  all: ['finance-v2'],
  dashboard: (params = {}) => ['finance-v2', 'dashboard', params],
  ledger: (params = {}) => ['finance-v2', 'ledger', params],
  accounts: () => ['finance-v2', 'accounts'],
  balances: () => ['finance-v2', 'balances'],
  agreements: (params = {}) => ['finance-v2', 'agreements', params],
  agreement: (id) => ['finance-v2', 'agreement', id],
  receivables: (params = {}) => ['finance-v2', 'receivables', params],
  receivable: (id) => ['finance-v2', 'receivable', id],
  plans: (params = {}) => ['finance-v2', 'plans', params],
  plan: (id) => ['finance-v2', 'plan', id],
  transaction: (id) => ['finance-v2', 'transaction', id],
  expenses: (params = {}) => ['finance-v2', 'expenses', params],
  expense: (id) => ['finance-v2', 'expense', id],
  periods: () => ['finance-v2', 'periods'],
  audit: (type, id) => ['finance-v2', 'audit', type, id],
  context: (type, id) => ['finance-v2', 'context', type, id],
  profitability: (params = {}) => ['finance-v2', 'profitability', params],
  reconciliation: () => ['finance-v2', 'reconciliation'],
};

export const unwrapFinance = (response) => response?.data?.data ?? response?.data ?? response;
const message = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const invalidate = (qc) => qc.invalidateQueries({ queryKey: FINANCE_V2_KEYS.all });
const mutation = (fn, success) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => { invalidate(qc); toast.success(success); }, onError: (e) => toast.error(message(e, 'İşlem tamamlanamadı')) });
};

export const useFinanceDashboard = (params = {}, enabled = true) => useQuery({ queryKey: FINANCE_V2_KEYS.dashboard(params), queryFn: async () => unwrapFinance(await financeV2Api.getDashboard(params)), enabled, staleTime: 60_000 });
export const useFinanceLedger = (params = {}) => useQuery({ queryKey: FINANCE_V2_KEYS.ledger(params), queryFn: async () => unwrapFinance(await financeV2Api.getLedger(params)), placeholderData: (old) => old, staleTime: 60_000 });
export const useFinanceAccounts = () => useQuery({ queryKey: FINANCE_V2_KEYS.accounts(), queryFn: async () => unwrapFinance(await financeV2Api.getAccounts()), staleTime: 300_000 });
export const useFinanceBalances = (enabled = true) => useQuery({ queryKey: FINANCE_V2_KEYS.balances(), queryFn: async () => unwrapFinance(await financeV2Api.getAccountBalances()), enabled, staleTime: 60_000, retry: false });
export const useFeeAgreements = (params = {}) => useQuery({ queryKey: FINANCE_V2_KEYS.agreements(params), queryFn: async () => unwrapFinance(await financeV2Api.getFeeAgreements(params)), placeholderData: (old) => old });
export const useFeeAgreement = (id) => useQuery({ queryKey: FINANCE_V2_KEYS.agreement(id), queryFn: async () => unwrapFinance(await financeV2Api.getFeeAgreement(id)), enabled: Boolean(id) });
export const useReceivables = (params = {}) => useQuery({ queryKey: FINANCE_V2_KEYS.receivables(params), queryFn: async () => unwrapFinance(await financeV2Api.getReceivables(params)), placeholderData: (old) => old });
export const useReceivable = (id) => useQuery({ queryKey: FINANCE_V2_KEYS.receivable(id), queryFn: async () => unwrapFinance(await financeV2Api.getReceivable(id)), enabled: Boolean(id) });
export const useFinancePaymentPlans = (params = {}) => useQuery({ queryKey: FINANCE_V2_KEYS.plans(params), queryFn: async () => unwrapFinance(await financeV2Api.getPaymentPlans(params)), placeholderData: (old) => old });
export const useFinancePaymentPlan = (id) => useQuery({ queryKey: FINANCE_V2_KEYS.plan(id), queryFn: async () => unwrapFinance(await financeV2Api.getPaymentPlan(id)), enabled: Boolean(id) });
export const useFinanceTransaction = (id) => useQuery({ queryKey: FINANCE_V2_KEYS.transaction(id), queryFn: async () => unwrapFinance(await financeV2Api.getTransaction(id)), enabled: Boolean(id) });
export const useFinanceExpenses = (params = {}) => useQuery({ queryKey: FINANCE_V2_KEYS.expenses(params), queryFn: async () => unwrapFinance(await financeV2Api.getExpenses(params)), placeholderData: (old) => old });
export const useFinanceExpense = (id) => useQuery({ queryKey: FINANCE_V2_KEYS.expense(id), queryFn: async () => unwrapFinance(await financeV2Api.getExpense(id)), enabled: Boolean(id) });
export const useFinancePeriods = (enabled = true) => useQuery({ queryKey: FINANCE_V2_KEYS.periods(), queryFn: async () => unwrapFinance(await financeV2Api.getPeriods()), enabled, retry:false });
export const useFinanceAudit = (type, id) => useQuery({ queryKey: FINANCE_V2_KEYS.audit(type, id), queryFn: async () => unwrapFinance(await financeV2Api.getAudit(type, id)), enabled: Boolean(type && id) });
export const useFinanceProfitability = (params = {}, enabled = true) => useQuery({ queryKey: FINANCE_V2_KEYS.profitability(params), queryFn: async () => unwrapFinance(await financeV2Api.getProfitability(params)), enabled });
export const useFinanceReconciliation = (enabled = true) => useQuery({ queryKey: FINANCE_V2_KEYS.reconciliation(), queryFn: async () => unwrapFinance(await financeV2Api.getReconciliation()), enabled, retry: false });
export const useFinanceContextSummary = (type, id) => useQuery({ queryKey: FINANCE_V2_KEYS.context(type, id), queryFn: async () => {
  const fn = type === 'client' ? financeV2Api.getClientSummary : type === 'case' ? financeV2Api.getCaseSummary : financeV2Api.getConsultationSummary;
  return unwrapFinance(await fn(id));
}, enabled: Boolean(type && id), staleTime: 60_000 });

export const useCreateFinanceTransaction = () => mutation(({ data, idempotencyKey }) => financeV2Api.createTransaction(data, idempotencyKey), 'Tahsilat kaydedildi');
export const useCreateFeeAgreement = () => mutation((data) => financeV2Api.createFeeAgreement(data), 'Ücret anlaşması oluşturuldu');
export const useActivateFeeAgreement = () => mutation((id) => financeV2Api.activateFeeAgreement(id), 'Ücret anlaşması aktifleştirildi');
export const useCompleteFeeAgreement = () => mutation((id) => financeV2Api.completeFeeAgreement(id), 'Ücret anlaşması tamamlandı');
export const useCancelFeeAgreement = () => mutation(({ id, reason }) => financeV2Api.cancelFeeAgreement(id, reason), 'Ücret anlaşması iptal edildi');
export const useCreateReceivable = () => mutation((data) => financeV2Api.createReceivable(data), 'Tahakkuk oluşturuldu');
export const usePostReceivable = () => mutation((id) => financeV2Api.postReceivable(id), 'Tahakkuk post edildi');
export const useCreateExpense = () => mutation((data) => financeV2Api.createExpense(data), 'Gider kaydedildi');
export const useTransferFinance = () => mutation((data) => financeV2Api.transfer(data), 'Hesap transferi tamamlandı');
export const useReverseFinanceTransaction = () => mutation(({ id, reason }) => financeV2Api.reverseTransaction(id, reason), 'Ters kayıt oluşturuldu');
export const useReverseFinanceTransfer = () => mutation(({ transactionId, reason }) => financeV2Api.reverseTransfer(transactionId, reason), 'Transfer ters kaydedildi');
export const useReverseFinanceExpense = () => mutation(({ id, reason }) => financeV2Api.reverseExpense(id, reason), 'Gider ters kaydedildi');
export const useRefundFinanceTransaction = () => mutation(({ id, data, idempotencyKey }) => financeV2Api.refundTransaction(id, data, idempotencyKey), 'İade kaydedildi');
export const useActivatePaymentPlan = () => mutation((id) => financeV2Api.activatePaymentPlan(id), 'Ödeme planı aktifleştirildi');
export const useCompletePaymentPlan = () => mutation((id) => financeV2Api.completePaymentPlan(id), 'Ödeme planı tamamlandı');
export const useDefaultPaymentPlan = () => mutation(({ id, reason }) => financeV2Api.defaultPaymentPlan(id, reason), 'Ödeme planı temerrüde alındı');
export const useCancelPaymentPlan = () => mutation(({ id, reason }) => financeV2Api.cancelPaymentPlan(id, reason), 'Ödeme planı iptal edildi');

export const useCreateFinanceAccount = () => mutation((data) => financeV2Api.createAccount(data), 'Finans hesabı oluşturuldu');
export const useAdjustReceivable = () => mutation(({ id, data }) => financeV2Api.adjustReceivable(id, data), 'Alacak düzeltmesi kaydedildi');
export const useReverseReceivableAdjustment = () => mutation(({ adjustmentId, reason }) => financeV2Api.reverseReceivableAdjustment(adjustmentId, reason), 'Alacak düzeltmesi ters kaydedildi');
export const useCloseFinancePeriod = () => mutation((data) => financeV2Api.closePeriod(data), 'Finans dönemi kapatıldı');
export const useReopenFinancePeriod = () => mutation(({ periodKey, reason }) => financeV2Api.reopenPeriod(periodKey, reason), 'Finans dönemi yeniden açıldı');
