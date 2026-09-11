export const money = (value, currency = 'TRY') => {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(n) ? n : 0);
  } catch {
    return `${Number.isFinite(n) ? n.toFixed(2) : '0.00'} ${currency || ''}`.trim();
  }
};

export const dateTR = (value) =>
  value
    ? new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Europe/Istanbul',
      }).format(new Date(value))
    : '-';

export const dateTimeTR = (value) =>
  value
    ? new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Europe/Istanbul',
      }).format(new Date(value))
    : '-';

const labels = {
  transaction: {
    receipt: 'Tahsilat',
    expense: 'Gider',
    refund: 'İade',
    transfer_in: 'Transfer Girişi',
    transfer_out: 'Transfer Çıkışı',
    reversal: 'Ters Kayıt',
  },
  status: {
    draft: 'Taslak',
    posted: 'İşlendi',
    open: 'Açık',
    partially_paid: 'Kısmen Kapatıldı',
    paid: 'Ödendi',
    reversed: 'Ters Kaydedildi',
    active: 'Aktif',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
    canceled: 'İptal',
    pending: 'Bekliyor',
    overdue: 'Gecikmiş',
    defaulted: 'Temerrütte',
    closed: 'Kapalı',
  },
  paymentMethod: {
    bank_transfer: 'Banka Havalesi',
    cash: 'Nakit',
    credit_card: 'Kredi Kartı',
    debit_card: 'Banka Kartı',
    pos: 'POS',
    check: 'Çek',
    cheque: 'Çek',
    other: 'Diğer',
  },
  accountType: {
    bank: 'Banka',
    cash: 'Kasa',
    pos: 'POS',
    clearing: 'Geçiş Hesabı',
    other: 'Diğer',
  },
  billingModel: {
    fixed: 'Sabit Ücret',
    hourly: 'Saatlik',
    retainer: 'Avans',
    installment: 'Taksitli',
    success_fee: 'Başarı Ücreti',
    mixed: 'Karma',
    other: 'Diğer',
  },
  expenseType: {
    office: 'Ofis Gideri',
    matter: 'Dosya Gideri',
    client_reimbursable: 'Müvekkile Yansıtılacak Gider',
    non_reimbursable: 'Geri Ödenmeyen Dosya Gideri',
  },
  receivableType: {
    legal_fee: 'Hukuki Ücret',
    expense_reimbursement: 'Masraf Yansıtma',
    success_fee: 'Başarı Ücreti',
    other: 'Diğer',
  },
  adjustmentType: {
    discount: 'İndirim',
    write_off: 'Terkin',
  },
  direction: {
    in: 'Giriş',
    out: 'Çıkış',
  },
  auditAction: {
    create: 'Oluşturuldu',
    create_and_post: 'Oluşturuldu ve Tahakkuk Ettirildi',
    post: 'İşlendi',
    activate: 'Aktifleştirildi',
    complete: 'Tamamlandı',
    cancel: 'İptal Edildi',
    reverse: 'Ters Kaydedildi',
    refund: 'İade Kaydedildi',
    adjust: 'Düzeltme Kaydedildi',
    discount: 'İndirim Uygulandı',
    write_off: 'Terkin Uygulandı',
    reopen: 'Yeniden Açıldı',
    close: 'Kapatıldı',
    default: 'Temerrüde Alındı',
  },
};

const pick = (group, value) => labels[group]?.[value] || value || '-';

export const transactionLabel = (value) => pick('transaction', value);
export const statusLabel = (value) => pick('status', value);
export const paymentMethodLabel = (value) => pick('paymentMethod', value);
export const accountTypeLabel = (value) => pick('accountType', value);
export const billingModelLabel = (value) => pick('billingModel', value);
export const expenseTypeLabel = (value) => pick('expenseType', value);
export const receivableTypeLabel = (value) => pick('receivableType', value);
export const adjustmentTypeLabel = (value) => pick('adjustmentType', value);
export const directionLabel = (value) => pick('direction', value);
export const auditActionLabel = (value) => pick('auditAction', value);

export const rowsOf = (value) =>
  Array.isArray(value?.rows) ? value.rows : Array.isArray(value) ? value : [];
