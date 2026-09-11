import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Headphones,
  Info,
  KeyRound,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

import Card from '../../components/ui/Card.jsx';
import useAuth from '../../hooks/useAuth.js';

import {
  licenseApi,
} from '../../services/licenseApi.js';

const APP_VERSION =
  import.meta.env.VITE_APP_VERSION ||
  '1.0.0';

const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL ||
  'destek@derkenar.com';

const SUPPORT_PHONE =
  import.meta.env.VITE_SUPPORT_PHONE ||
  '+90 5XX XXX XX XX';

const SUPPORT_PHONE_LINK =
  import.meta.env.VITE_SUPPORT_PHONE_LINK ||
  '+905XXXXXXXXX';

const SUPPORT_WHATSAPP =
  import.meta.env.VITE_SUPPORT_WHATSAPP ||
  SUPPORT_PHONE_LINK;

const SUPPORT_HOURS =
  import.meta.env.VITE_SUPPORT_HOURS ||
  'Hafta içi 09:00 – 18:00';

const formatDate = (
  value
) => {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'tr-TR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  ).format(date);
};

const getStatusTone = (
  status
) => {
  if (status === 'active') {
    return {
      badge:
        'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300',
      icon:
        'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/[0.08] dark:text-emerald-300',
      dot:
        'bg-emerald-500',
    };
  }

  if (
    status === 'expired' ||
    status === 'suspended' ||
    status === 'scheduled'
  ) {
    return {
      badge:
        'border-amber-400/20 bg-amber-400/[0.08] text-amber-300',
      icon:
        'bg-amber-50 text-amber-600 dark:bg-amber-400/[0.08] dark:text-amber-300',
      dot:
        'bg-amber-500',
    };
  }

  return {
    badge:
      'border-red-400/20 bg-red-400/[0.08] text-red-300',
    icon:
      'bg-red-50 text-red-600 dark:bg-red-400/[0.08] dark:text-red-300',
    dot:
      'bg-red-500',
  };
};

const SystemInfo = () => {
  const auth =
    useAuth();

  const token =
    auth?.accessToken ||
    auth?.access_token ||
    auth?.token ||
    null;

  const [license, setLicense] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const loadLicense =
    async () => {
      try {
        setLoading(true);
        setError('');

        const result =
          await licenseApi
            .current(token);

        setLicense(result);
      } catch (apiError) {
        setLicense(null);
        setError(
          apiError?.message ||
            'Lisans bilgisi alınamadı.'
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    void loadLicense();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const officeName =
    license?.officeName ||
    'Lisans bilgisi bekleniyor';

  const whatsappUrl =
    useMemo(() => {
      const number =
        String(
          SUPPORT_WHATSAPP ||
            ''
        ).replace(/\D/g, '');

      if (!number) {
        return null;
      }

      const text =
        encodeURIComponent(
          `Merhaba, ${officeName} adına Derkenar desteği almak istiyorum.`
        );

      return `https://wa.me/${number}?text=${text}`;
    }, [officeName]);

  const statusTone =
    getStatusTone(
      license?.effectiveStatus
    );

  const statusLabel =
    loading
      ? 'Doğrulanıyor'
      : license?.statusLabel ||
        'Bilgi Alınamadı';

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-600 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-slate-300">
            <Info size={21} />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
              Sistem ve Lisans Bilgileri
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-slate-400">
              Bu Derkenar kurulumuna ait doğrulanmış lisans, destek ve ürün bilgileri.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadLicense()}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300 dark:hover:bg-white/[0.06]"
        >
          <RefreshCw
            size={14}
            className={loading ? 'animate-spin' : ''}
          />
          Lisansı Doğrula
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/15 dark:bg-red-400/[0.06] dark:text-red-300">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0"
          />
          <div>
            <p className="font-semibold">
              Lisans bilgisi doğrulanamadı
            </p>
            <p className="mt-0.5 text-xs opacity-80">
              {error}
            </p>
          </div>
        </div>
      )}

      <Card>
        <Card.Body className="p-0">
          <div className="overflow-hidden rounded-xl">
            <div className="relative overflow-hidden bg-[#071a38] px-6 py-7 sm:px-8">
              <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-amber-400/[0.07] blur-3xl" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/20">
                    <img
                      src="/favicon.svg"
                      alt="Derkenar"
                      className="h-11 w-11 object-contain"
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-2xl font-bold uppercase tracking-[0.08em] text-white">
                        Derkenar
                      </p>
                      <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200">
                        v{APP_VERSION}
                      </span>
                    </div>

                    <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
                      Hukuk Büro Yönetim Sistemi
                    </p>

                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300/80">
                      Hukuk bürolarının operasyonlarını tek merkezden yönetmesi için geliştirilmiş kurumsal çalışma platformu.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold ${statusTone.badge}`}>
                    <span className={`h-2 w-2 rounded-full ${statusTone.dot}`} />
                    Lisans {statusLabel}
                  </div>

                  <p className="text-[11px] text-slate-400">
                    {loading
                      ? 'Sunucudan lisans bilgisi alınıyor…'
                      : officeName}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-4">
              <InfoItem
                icon={Building2}
                label="Lisanslı Büro"
                value={officeName}
              />
              <InfoItem
                icon={CalendarDays}
                label="Lisans Modeli"
                value={license?.licenseType || '—'}
              />
              <InfoItem
                icon={KeyRound}
                label="Lisans Kimliği"
                value={license?.licenseKey || '—'}
                mono
              />
              <InfoItem
                icon={ShieldCheck}
                label="Ürün Sürümü"
                value={`v${APP_VERSION}`}
              />
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="p-0">
          <SectionHeader
            icon={ShieldCheck}
            title="Lisans Durumu"
            description="Kullanım hakkı ve kapasite bilgileri doğrudan sunucu tarafından doğrulanır."
            tone={license?.effectiveStatus === 'active' ? 'emerald' : 'amber'}
          />

          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="border-b border-gray-100 px-6 py-6 lg:border-b-0 lg:border-r dark:border-white/[0.06]">
              <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${statusTone.icon}`}>
                  {license?.effectiveStatus === 'active'
                    ? <CheckCircle2 size={21} />
                    : <AlertTriangle size={21} />}
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {license?.effectiveStatus === 'active'
                      ? 'Kurumsal lisans etkin'
                      : `Lisans durumu: ${statusLabel}`}
                  </p>

                  <p className="mt-1.5 max-w-xl text-xs leading-5 text-gray-500 dark:text-slate-400">
                    {license?.effectiveStatus === 'active'
                      ? 'Bu kurulum, lisanslı büro adına tanımlanan kullanım kapsamı içerisinde çalışmaktadır.'
                      : 'Lisans durumu kullanım koşullarını karşılamıyor. Yenileme veya lisans işlemleri için Derkenar desteğiyle iletişime geçin.'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <LicensePill>
                      Kurumsal kullanım
                    </LicensePill>
                    {license?.updatesIncluded && (
                      <LicensePill>
                        Güncellemeler dahil
                      </LicensePill>
                    )}
                    {license?.supportIncluded && (
                      <LicensePill>
                        Teknik destek dahil
                      </LicensePill>
                    )}
                    {license?.enforcementEnabled && (
                      <LicensePill>
                        Sunucu doğrulaması etkin
                      </LicensePill>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2">
              <SystemItem
                label="Başlangıç"
                value={formatDate(license?.startsAt)}
              />
              <SystemItem
                label="Geçerlilik"
                value={formatDate(license?.expiresAt)}
              />
              <SystemItem
                label="Kalan Süre"
                value={
                  Number.isFinite(Number(license?.daysRemaining))
                    ? `${license.daysRemaining} gün`
                    : '—'
                }
              />
              <SystemItem
                label="Doğrulama"
                value={license?.enforcementEnabled ? 'Etkin' : 'Hazırlık Modu'}
              />
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="p-0">
          <SectionHeader
            icon={Users}
            title="Kullanıcı Kapasitesi"
            description="Aktif kullanıcı sayısı lisans kapasitesiyle birlikte takip edilir."
            tone="slate"
          />

          <div className="grid md:grid-cols-3">
            <SystemItem
              label="Aktif Kullanıcı"
              value={license?.activeUsers ?? '—'}
            />
            <SystemItem
              label="Lisans Kapasitesi"
              value={license?.maxUsers ?? '—'}
            />
            <SystemItem
              label="Kalan Kullanıcı Hakkı"
              value={license?.availableSeats ?? '—'}
            />
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="p-0">
          <SectionHeader
            icon={Headphones}
            title="Destek ve İletişim"
            description="Teknik destek, kullanım desteği ve lisans işlemleri için Derkenar ekibine ulaşın."
            tone="amber"
          />

          <div className="grid md:grid-cols-2 xl:grid-cols-4">
            <ContactItem icon={Mail} label="E-posta ">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="transition-colors hover:text-amber-600 dark:hover:text-amber-300"
              >
                {SUPPORT_EMAIL}
              </a>
            </ContactItem>

            <ContactItem icon={MessageCircle} label="WhatsApp ">
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-emerald-600 dark:hover:text-emerald-300"
                >
                  Mesaj gönder ↗
                </a>
              ) : (
                'Tanımlanmadı'
              )}
            </ContactItem>

            <ContactItem icon={Phone} label="Destek Hattı">
              <a
                href={`tel:${SUPPORT_PHONE_LINK}`}
                className="transition-colors hover:text-amber-600 dark:hover:text-amber-300"
              >
                {SUPPORT_PHONE}
              </a>
            </ContactItem>

            <ContactItem icon={Clock3} label="Mesai Saatleri">
              {SUPPORT_HOURS}
            </ContactItem>
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="p-0">
          <SectionHeader
            icon={Server}
            title="Kurulum Bilgileri"
            description="Bu Derkenar ortamına ait temel ürün ve hizmet bilgileri."
            tone="slate"
          />

          <div className="grid md:grid-cols-2 xl:grid-cols-4">
            <SystemItem label="Kurulum Tipi" value="Kurumsal Büro Kurulumu" />
            <SystemItem label="Ortam" value="Production" />
            <SystemItem label="Ürün Kanalı" value="Kararlı Sürüm" />
            <SystemItem
              label="Destek Kapsamı"
              value={license?.supportIncluded ? 'Lisans süresince dahil' : 'Lisans planına göre'}
            />
          </div>
        </Card.Body>
      </Card>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
        <div className="flex flex-col gap-5 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
              <ShieldCheck size={17} />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                Lisans ve kullanım koşulları
              </p>

              <p className="mt-1.5 max-w-3xl text-xs leading-5 text-gray-500 dark:text-slate-500">
                Derkenar, lisanslı müşteri tarafından ilgili lisans sözleşmesi ve kullanım koşulları kapsamında kullanılmaktadır. Lisans, yazılımın mülkiyetinin devri değil; belirlenen kapsam ve süre dahilinde kullanım hakkı sağlar.
              </p>

              <p className="mt-3 text-[11px] text-gray-400 dark:text-slate-600">
                © 2026 Derkenar · Tüm hakları saklıdır.
              </p>
            </div>
          </div>

          <div className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-medium text-gray-500 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-500">
            <Sparkles size={14} />
            Doğrulanmış Lisans
          </div>
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({
  icon: Icon,
  title,
  description,
  tone = 'slate',
}) => {
  const tones = {
    amber:
      'bg-amber-50 text-amber-600 dark:bg-amber-400/[0.08] dark:text-amber-300',
    emerald:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/[0.08] dark:text-emerald-300',
    slate:
      'bg-slate-100 text-slate-600 dark:bg-white/[0.05] dark:text-slate-300',
  };

  return (
    <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone] || tones.slate}`}>
          <Icon size={19} />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({
  icon: Icon,
  label,
  value,
  mono = false,
}) => (
  <div className="flex gap-3 border-b border-gray-100 px-6 py-5 md:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0 dark:border-white/[0.06]">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
      <Icon size={17} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
        {label}
      </p>
      <p className={`mt-1 break-words text-sm font-semibold text-gray-900 dark:text-white ${mono ? 'font-mono text-[12px]' : ''}`}>
        {value}
      </p>
    </div>
  </div>
);

const ContactItem = ({
  icon: Icon,
  label,
  children,
}) => (
  <div className="flex gap-3 border-b border-gray-100 px-6 py-5 md:border-r xl:border-b-0 xl:last:border-r-0 dark:border-white/[0.06]">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
      <Icon size={17} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
        {label}
      </p>
      <div className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-white">
        {children}
      </div>
    </div>
  </div>
);

const SystemItem = ({
  label,
  value,
}) => (
  <div className="border-b border-gray-100 px-6 py-5 md:border-r md:last:border-r-0 dark:border-white/[0.06]">
    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
      {label}
    </p>
    <p className="mt-1.5 text-sm font-semibold text-gray-900 dark:text-white">
      {value}
    </p>
  </div>
);

const LicensePill = ({ children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-600 dark:border-white/[0.07] dark:bg-white/[0.035] dark:text-slate-300">
    <BadgeCheck size={12} />
    {children}
  </span>
);

export default SystemInfo;
