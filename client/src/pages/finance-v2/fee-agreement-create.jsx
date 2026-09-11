import { useState } from 'react';
import {
  ArrowLeft,
  FileSignature,
  Save,
} from 'lucide-react';
import {
  Link,
  useNavigate,
} from 'react-router-dom';

import Button from '../../components/ui/Button.jsx';

import {
  useCreateFeeAgreement,
} from '../../features/finance-v2/finance-v2.query.js';

import {
  ContextFields,
  Field,
  Select,
  inputClass,
  today,
} from './components/FinanceFormBits.jsx';

export default function FeeAgreementCreate() {
  const navigate = useNavigate();
  const create = useCreateFeeAgreement();

  const [form, setForm] = useState({
    client_id: '',
    case_id: '',
    consultation_id: '',
    title: '',
    billing_model: 'fixed',
    agreed_amount: '',
    currency: 'TRY',
    effective_from: today(),
    effective_to: '',
    signed_at: '',
    notes: '',
  });

  const submit = async (e) => {
    e.preventDefault();

    if (
      !form.client_id &&
      !form.case_id &&
      !form.consultation_id
    ) {
      return;
    }

    const data = {
      ...form,
      client_id: form.client_id || null,
      case_id: form.case_id || null,
      consultation_id:
        form.consultation_id || null,
      effective_to:
        form.effective_to || null,
      signed_at:
        form.signed_at || null,
      status: 'draft',
    };

    const res =
      await create.mutateAsync(data);

    const id =
      res?.data?.data?.id ||
      res?.data?.id;

    navigate(
      id
        ? `/finance/agreements/${id}`
        : '/finance'
    );
  };

  return (
    <FormShell
      title="Yeni Ücret Anlaşması"
      subtitle="Müvekkil, dava veya danışmanlığa bağlı hukuki ücret sözleşmesi."
      icon={FileSignature}
      back="/finance"
    >
      <form
        onSubmit={submit}
        className="grid gap-5 md:grid-cols-2"
      >
        <ContextFields
          form={form}
          setForm={setForm}
          allowEmpty
        />

        <Field
          label="Başlık"
          full
        >
          <input
            required
            value={form.title}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                title: e.target.value,
              }))
            }
            className={inputClass}
          />
        </Field>

        <Field label="Ücret Modeli">
          <Select
            value={form.billing_model}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                billing_model:
                  e.target.value,
              }))
            }
          >
            <option value="fixed">
              Sabit Ücret
            </option>

            <option value="hourly">
              Saatlik
            </option>

            <option value="retainer">
              Avans
            </option>

            <option value="success_fee">
              Başarı Ücreti
            </option>

            <option value="mixed">
              Karma
            </option>

            <option value="installment">
              Taksitli
            </option>

            <option value="other">
              Diğer
            </option>
          </Select>
        </Field>

        <Field label="Anlaşılan Tutar">
          <div className="flex gap-2">
            <input
              required
              min="0.01"
              step="0.01"
              type="number"
              value={form.agreed_amount}
              onChange={(e) =>
                setForm((x) => ({
                  ...x,
                  agreed_amount:
                    e.target.value,
                }))
              }
              className={inputClass}
            />

            <Select
              value={form.currency}
              onChange={(e) =>
                setForm((x) => ({
                  ...x,
                  currency:
                    e.target.value,
                }))
              }
              className="max-w-28"
            >
              <option value="TRY">
                TRY
              </option>

              <option value="USD">
                USD
              </option>

              <option value="EUR">
                EUR
              </option>

              <option value="GBP">
                GBP
              </option>
            </Select>
          </div>
        </Field>

        <Field label="Başlangıç">
          <input
            type="date"
            value={form.effective_from}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                effective_from:
                  e.target.value,
              }))
            }
            className={inputClass}
          />
        </Field>

        <Field label="Bitiş">
          <input
            type="date"
            value={form.effective_to}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                effective_to:
                  e.target.value,
              }))
            }
            className={inputClass}
          />
        </Field>

        <Field label="İmza Tarihi">
          <input
            type="date"
            value={form.signed_at}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                signed_at:
                  e.target.value,
              }))
            }
            className={inputClass}
          />
        </Field>

        <Field
          label="Notlar"
          full
        >
          <textarea
            rows="5"
            value={form.notes}
            onChange={(e) =>
              setForm((x) => ({
                ...x,
                notes:
                  e.target.value,
              }))
            }
            className={`${inputClass} h-auto py-3`}
          />
        </Field>

        <div className="md:col-span-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate('/finance')
            }
          >
            Vazgeç
          </Button>

          <Button
            type="submit"
            loading={create.isPending}
          >
            <Save className="h-4 w-4" />
            Taslak Oluştur
          </Button>
        </div>
      </form>
    </FormShell>
  );
}

export function FormShell({
  title,
  subtitle,
  icon: Icon,
  back,
  children,
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start gap-3">
        <Link
          to={back}
          className="mt-1 rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-white/[0.08]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {subtitle}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33]">
        {children}
      </section>
    </div>
  );
}