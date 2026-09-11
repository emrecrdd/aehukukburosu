import { useState } from 'react';
import { Receipt, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import {
  useCreateExpense,
  useFinanceAccounts,
} from '../../features/finance-v2/finance-v2.query.js';
import {
  ContextFields,
  Field,
  Select,
  inputClass,
  nowLocal,
  toIso,
} from './components/FinanceFormBits.jsx';
import { FormShell } from './fee-agreement-create.jsx';

export default function ExpenseCreate() {
  const navigate = useNavigate();
  const create = useCreateExpense();
  const accountsQ = useFinanceAccounts();

  const accounts = Array.isArray(accountsQ.data)
    ? accountsQ.data
    : accountsQ.data?.rows || [];

  const [form, setForm] = useState({
    expense_type: 'office',
    client_id: '',
    case_id: '',
    consultation_id: '',
    account_id: '',
    amount: '',
    currency: 'TRY',
    expense_date: nowLocal(),
    payment_method: 'bank_transfer',
    category: '',
    description: '',
    external_reference: '',
    reimbursement_due_date: '',
    base_currency: 'TRY',
    fx_rate: '',
  });

  const needsContext =
    form.expense_type !== 'office';

  const hasContext = Boolean(
    form.client_id ||
      form.case_id ||
      form.consultation_id
  );

  const amount = Number(form.amount || 0);

  const change = (name, value) => {
    setForm((current) => {
      const next = {
        ...current,
        [name]: value,
      };

      if (name === 'account_id') {
        next.currency =
          accounts.find(
            (account) =>
              String(account.id) ===
              String(value)
          )?.currency || current.currency;
      }

      if (
        name === 'expense_type' &&
        value === 'office'
      ) {
        next.client_id = '';
        next.case_id = '';
        next.consultation_id = '';
        next.reimbursement_due_date = '';
      }

      if (
        name === 'expense_type' &&
        value !== 'client_reimbursable'
      ) {
        next.reimbursement_due_date = '';
      }

      return next;
    });
  };

  const submit = async (event) => {
    event.preventDefault();

    if (
      !form.account_id ||
      amount <= 0 ||
      !form.description.trim() ||
      (needsContext && !hasContext)
    ) {
      return;
    }

    const payload = {
      ...form,

      client_id:
        form.client_id || null,

      case_id:
        form.case_id || null,

      consultation_id:
        form.consultation_id || null,

      account_id:
        form.account_id,

      amount:
        String(form.amount),

      expense_date:
        toIso(form.expense_date),

      reimbursement_due_date:
        form.reimbursement_due_date ||
        null,

      reimbursable:
        form.expense_type ===
        'client_reimbursable',

      base_currency:
        form.base_currency,

      fx_rate:
        form.currency ===
        form.base_currency
          ? undefined
          : form.fx_rate,
    };

    await create.mutateAsync(payload);

    navigate('/finance');
  };

  const disabled =
    create.isPending ||
    !form.account_id ||
    amount <= 0 ||
    !form.description.trim() ||
    (needsContext && !hasContext);

  return (
    <FormShell
      title="Gider Kaydı"
      subtitle="Ofis veya dosya giderlerini doğru finans hesabından kaydedin."
      icon={Receipt}
      back="/finance"
    >
      <form
        onSubmit={submit}
        className="grid gap-5 md:grid-cols-2"
      >
        <Field label="Gider Türü">
          <Select
            value={form.expense_type}
            onChange={(event) =>
              change(
                'expense_type',
                event.target.value
              )
            }
          >
            <option value="office">
              Ofis Gideri
            </option>

            <option value="matter">
              Dosya Gideri
            </option>

            <option value="client_reimbursable">
              Müvekkile Yansıtılacak
            </option>

            <option value="non_reimbursable">
              Geri Ödenmeyen Dosya Gideri
            </option>
          </Select>
        </Field>

        <Field label="Finans Hesabı">
          <Select
            required
            value={form.account_id}
            onChange={(event) =>
              change(
                'account_id',
                event.target.value
              )
            }
          >
            <option value="">
              Hesap seçin
            </option>

            {accounts.map((account) => (
              <option
                key={account.id}
                value={account.id}
              >
                {account.name} ·{' '}
                {account.currency}
              </option>
            ))}
          </Select>
        </Field>

        {needsContext && (
          <ContextFields
            form={form}
            setForm={setForm}
            allowEmpty
          />
        )}

        <Field label="Tutar">
          <input
            required
            min="0.01"
            step="0.01"
            type="number"
            value={form.amount}
            onChange={(event) =>
              change(
                'amount',
                event.target.value
              )
            }
            className={inputClass}
          />
        </Field>

        <Field label="Para Birimi">
          <input
            readOnly
            value={form.currency}
            className={`${inputClass} bg-gray-50 dark:bg-white/[0.025]`}
          />
        </Field>

        {form.currency !==
          form.base_currency && (
          <Field
            label={`${form.currency}/${form.base_currency} Kuru`}
            hint="Baz tutarın doğru hesaplanması için zorunludur."
          >
            <input
              required
              min="0.0000000001"
              step="0.000001"
              type="number"
              value={form.fx_rate}
              onChange={(event) =>
                change(
                  'fx_rate',
                  event.target.value
                )
              }
              className={inputClass}
            />
          </Field>
        )}

        <Field label="Tarih">
          <input
            required
            type="datetime-local"
            value={form.expense_date}
            onChange={(event) =>
              change(
                'expense_date',
                event.target.value
              )
            }
            className={inputClass}
          />
        </Field>

        <Field label="Ödeme Yöntemi">
          <Select
            value={form.payment_method}
            onChange={(event) =>
              change(
                'payment_method',
                event.target.value
              )
            }
          >
            <option value="bank_transfer">
              Banka Havalesi
            </option>

            <option value="cash">
              Nakit
            </option>

            <option value="credit_card">
              Kredi Kartı
            </option>

            <option value="check">
              Çek
            </option>

            <option value="other">
              Diğer
            </option>
          </Select>
        </Field>

        <Field label="Kategori">
          <input
            value={form.category}
            onChange={(event) =>
              change(
                'category',
                event.target.value
              )
            }
            placeholder="Harç, posta, seyahat, ofis..."
            className={inputClass}
          />
        </Field>

        {form.expense_type ===
          'client_reimbursable' && (
          <Field label="Yansıtma Vadesi">
            <input
              type="date"
              value={
                form.reimbursement_due_date
              }
              onChange={(event) =>
                change(
                  'reimbursement_due_date',
                  event.target.value
                )
              }
              className={inputClass}
            />
          </Field>
        )}

        <Field
          label="Açıklama"
          full
        >
          <textarea
            required
            rows="4"
            value={form.description}
            onChange={(event) =>
              change(
                'description',
                event.target.value
              )
            }
            className={`${inputClass} h-auto py-3`}
          />
        </Field>

        <Field
          label="Harici Referans"
          full
        >
          <input
            value={form.external_reference}
            onChange={(event) =>
              change(
                'external_reference',
                event.target.value
              )
            }
            className={inputClass}
          />
        </Field>

        <div className="md:col-span-2 flex justify-end">
          <Button
            type="submit"
            loading={create.isPending}
            disabled={disabled}
          >
            <Save className="h-4 w-4" />
            Gideri Kaydet
          </Button>
        </div>
      </form>
    </FormShell>
  );
}