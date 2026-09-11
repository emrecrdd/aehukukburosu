import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import clientApi from '../../../features/clients/client.api.js';
import consultationApi from '../../../features/consultations/consultation.api.js';

export const inputClass =
  'h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-white';

export function Field({
  label,
  children,
  full,
  hint,
  error = false,
}) {
  return (
    <label
      className={`space-y-2 ${
        full ? 'md:col-span-2' : ''
      }`}
    >
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {label}
      </span>

      {children}

      {hint && (
        <span
          className={`block text-xs ${
            error
              ? 'text-red-500'
              : 'text-gray-400'
          }`}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

export function Select(props) {
  return (
    <select
      {...props}
      className={`${inputClass} ${
        props.className || ''
      }`}
    >
      {props.children}
    </select>
  );
}

export const toIso = (value) =>
  value
    ? new Date(value).toISOString()
    : undefined;

export const today = () =>
  new Date().toISOString().slice(0, 10);

export const nowLocal = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();

  return new Date(
    d.getTime() - off * 60000
  )
    .toISOString()
    .slice(0, 16);
};

export const rows = (response) => {
  const data =
    response?.data?.data ??
    response?.data ??
    response ??
    [];

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.rows)) {
    return data.rows;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

export const clientName = (c) =>
  c?.name ||
  c?.full_name ||
  c?.company_name ||
  c?.title ||
  c?.id;

export const caseName = (c) =>
  c?.case_number ||
  c?.title ||
  c?.subject ||
  c?.id;

/*
 * Consultation modelindeki gerçek numara alanı
 * consultation_number.
 *
 * Örnek:
 * DNS-2026-000001 · Ticari Sözleşme Danışmanlığı
 */
export const consultationName = (c) =>
  [
    c?.consultation_number,
    c?.title || c?.subject,
  ]
    .filter(Boolean)
    .join(' · ') ||
  c?.id;

export function useFinanceContexts(
  clientId
) {
  const clientsQ = useQuery({
    queryKey: [
      'clients',
      'finance-v2-select',
    ],

    queryFn: () =>
      clientApi.getAll({
        page: 1,
        limit: 200,
        status: 'active',
      }),

    staleTime: 300000,
  });

  const casesQ = useQuery({
    queryKey: [
      'clients',
      clientId,
      'finance-v2-cases',
    ],

    queryFn: () =>
      clientApi.getCaseHistory(
        clientId
      ),

    enabled: Boolean(clientId),

    staleTime: 180000,
  });

  /*
   * Consultation repository maksimum 100 kayıt
   * kabul ediyor.
   *
   * Finans formunda prospect danışmanlıklar da
   * seçilebildiği için client_id filtresi
   * uygulanmıyor.
   *
   * Test/hardening aşamasında staleTime 0 ve
   * refetchOnMount always kullanıyoruz; böylece
   * yeni açılan danışmanlık eski cache yüzünden
   * dropdown dışında kalmaz.
   */
  const consultationsQ = useQuery({
    queryKey: [
      'consultations',
      'finance-v2-select',
    ],

    queryFn: () =>
      consultationApi.getAll({
        page: 1,
        limit: 100,
      }),

    staleTime: 0,

    refetchOnMount: 'always',
  });

  const clients = rows(
    clientsQ.data
  );

  const cases = rows(
    casesQ.data
  );

  const consultations = useMemo(
    () =>
      rows(
        consultationsQ.data
      ),
    [consultationsQ.data]
  );

  return {
    clients,
    cases,
    consultations,

    loading:
      clientsQ.isLoading ||
      casesQ.isLoading ||
      consultationsQ.isLoading,

    clientsError:
      clientsQ.error || null,

    casesError:
      casesQ.error || null,

    consultationsError:
      consultationsQ.error ||
      null,

    refetchConsultations: () =>
      consultationsQ.refetch(),
  };
}

export function ContextFields({
  form,
  setForm,
  allowEmpty = false,
}) {
  const {
    clients,
    cases,
    consultations,
    loading,
    consultationsError,
  } = useFinanceContexts(
    form.client_id
  );

  const set = (
    name,
    value
  ) =>
    setForm((x) => ({
      ...x,

      [name]: value,

      /*
       * Müvekkil değiştiğinde eski dava ve
       * danışmanlık seçimi temizlenir.
       */
      ...(name ===
      'client_id'
        ? {
            case_id: '',
            consultation_id:
              '',
          }
        : {}),

      /*
       * Dava ve danışmanlık aynı anda
       * kaynak context olarak seçilmez.
       */
      ...(name ===
          'case_id' &&
        value
        ? {
            consultation_id:
              '',
          }
        : {}),

      ...(name ===
          'consultation_id' &&
        value
        ? {
            case_id: '',
          }
        : {}),
    }));

  const consultationErrorMessage =
    consultationsError
      ? consultationsError
          ?.response?.data
          ?.message ||
        consultationsError
          ?.message ||
        'Danışmanlık listesi yüklenemedi.'
      : null;

  return (
    <>
      <Field label="Müvekkil">
        <Select
          required={!allowEmpty}
          value={
            form.client_id || ''
          }
          onChange={(e) =>
            set(
              'client_id',
              e.target.value
            )
          }
        >
          <option value="">
            {allowEmpty
              ? 'Bağlanmadı'
              : 'Müvekkil seçin'}
          </option>

          {clients.map((c) => (
            <option
              key={c.id}
              value={c.id}
            >
              {clientName(c)}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Dava">
        <Select
          value={
            form.case_id || ''
          }
          disabled={
            !form.client_id
          }
          onChange={(e) =>
            set(
              'case_id',
              e.target.value
            )
          }
        >
          <option value="">
            {!form.client_id
              ? 'Önce müvekkil seçin'
              : cases.length ===
                  0
                ? 'Dava bulunamadı'
                : 'Dava seçilmedi'}
          </option>

          {cases.map((c) => (
            <option
              key={c.id}
              value={c.id}
            >
              {caseName(c)}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Danışmanlık"
        hint={
          consultationErrorMessage
        }
        error={Boolean(
          consultationsError
        )}
      >
        <Select
          value={
            form.consultation_id ||
            ''
          }
          disabled={
            loading &&
            consultations.length ===
              0
          }
          onChange={(e) =>
            set(
              'consultation_id',
              e.target.value
            )
          }
        >
          <option value="">
            {consultationsError
              ? 'Danışmanlıklar yüklenemedi'
              : loading &&
                  consultations.length ===
                    0
                ? 'Danışmanlıklar yükleniyor...'
                : consultations.length ===
                    0
                  ? 'Danışmanlık bulunamadı'
                  : 'Danışmanlık seçilmedi'}
          </option>

          {consultations.map(
            (c) => (
              <option
                key={c.id}
                value={c.id}
              >
                {consultationName(
                  c
                )}
              </option>
            )
          )}
        </Select>
      </Field>
    </>
  );
}