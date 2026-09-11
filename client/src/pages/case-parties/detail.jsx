import {
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import casePartyApi
  from '../../features/case-parties/case-party.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import Card
  from '../../components/ui/Card.jsx';

import Badge
  from '../../components/ui/Badge.jsx';

import Button
  from '../../components/ui/Button.jsx';

import {
  ArrowLeft,
  Building2,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  Mail,
  MapPin,
  Phone,
  Scale,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';

// ======================================================
// HELPERS
// ======================================================

const getPartyTypeLabel = (
  type
) => {
  const labels = {
    davaci:
      'Davacı',

    davali:
      'Davalı',

    supheli:
      'Şüpheli',

    sanik:
      'Sanık',

    musteki:
      'Müşteki',

    katilan:
      'Katılan',

    magdur:
      'Mağdur',

    maktul:
      'Maktul',

    alacakli:
      'Alacaklı',

    borclu:
      'Borçlu',

    ucuncu_kisi:
      'Üçüncü Kişi',
  };

  return (
    labels[type] ||
    type ||
    'Bilinmiyor'
  );
};

const getPartyTypeVariant = (
  type
) => {
  const variants = {
    davaci:
      'success',

    davali:
      'danger',

    supheli:
      'warning',

    sanik:
      'danger',

    musteki:
      'info',

    katilan:
      'info',

    magdur:
      'warning',

    maktul:
      'default',

    alacakli:
      'success',

    borclu:
      'warning',

    ucuncu_kisi:
      'default',
  };

  return (
    variants[type] ||
    'default'
  );
};

const getEntityTypeLabel = (
  type
) => {
  return (
    type ===
    'company'
      ? 'Tüzel Kişi'
      : 'Gerçek Kişi'
  );
};

const formatDateTime = (
  value
) => {
  if (
    !value
  ) {
    return '-';
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '-';
  }

  return new Intl.DateTimeFormat(
    'tr-TR',
    {
      dateStyle:
        'medium',

      timeStyle:
        'short',

      timeZone:
        'Europe/Istanbul',
    }
  ).format(
    date
  );
};

const maskIdentityNumber = (
  value
) => {
  if (
    !value
  ) {
    return '-';
  }

  const text =
    String(
      value
    );

  if (
    text.length <=
    4
  ) {
    return text;
  }

  return (
    `${'•'.repeat(
      text.length -
        4
    )}${text.slice(
      -4
    )}`
  );
};

const normalizeId = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  if (
    typeof value ===
    'object'
  ) {
    const objectId =
      value?.id;

    return objectId === null ||
      objectId === undefined ||
      objectId === ''
      ? ''
      : String(
          objectId
        );
  }

  return String(
    value
  );
};

const normalizeCaseId = (
  party,
  fallbackCaseId
) => {
  return normalizeId(
    party?.case_id ??
    party?.case?.id ??
    fallbackCaseId
  );
};

// ======================================================
// COMPONENT
// ======================================================

const CasePartyDetail = () => {
  const {
    id: idParam,
    caseId: caseIdParam,
  } =
    useParams();

  const id =
    normalizeId(
      idParam
    );

  const caseId =
    normalizeId(
      caseIdParam
    );

  const {
    user,
  } =
    useAuth();

  const [
    showIdentity,
    setShowIdentity,
  ] =
    useState(
      false
    );

  // ====================================================
  // PERMISSION
  // ====================================================

  /*
   * Taraf düzenleme ayrı bir permission'a bağlıysa
   * ileride burada ilgili permission key kullanılabilir.
   *
   * Mevcut dava yetki yapısıyla uyumlu olması için
   * EDIT_CASES kullanıyoruz.
   */
  const canEdit =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_CASES
    );

  // ====================================================
  // QUERY
  // ====================================================

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } =
    useQuery({
      queryKey: [
        'case-party',
        id,
      ],

      queryFn: () =>
        casePartyApi.getOne(
          id
        ),

      enabled:
        Boolean(
          id
        ),

      staleTime:
        2 *
        60 *
        1000,
    });

  // ====================================================
  // DATA
  // ====================================================

  const party =
    data
      ?.data
      ?.data ??
    data
      ?.data ??
    null;

  // ====================================================
  // LOADING
  // ====================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3">

        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600 dark:border-white/[0.08] dark:border-b-blue-500" />

        <p className="text-sm text-gray-500 dark:text-slate-400">
          Taraf bilgileri yükleniyor...
        </p>

      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (
    error ||
    !party
  ) {
    const message =
      error
        ?.response
        ?.data
        ?.message ||
      error
        ?.message ||
      'Kayıt kaldırılmış veya bu taraf bilgisine erişim yetkiniz bulunmuyor.';

    return (
      <div className="mx-auto max-w-xl py-16 text-center">

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-white/[0.04] dark:text-slate-500">

          <Users className="h-7 w-7" />

        </div>

        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Taraf bilgisi görüntülenemedi
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-slate-400">
          {message}
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">

          {caseId && (
            <Link
              to={`/cases/${caseId}`}
            >
              <Button
                variant="secondary"
              >
                <ArrowLeft className="h-4 w-4" />

                Davaya Dön
              </Button>
            </Link>
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              refetch()
            }
            loading={
              isFetching
            }
          >
            Tekrar Dene
          </Button>

        </div>

      </div>
    );
  }

  // ====================================================
  // DERIVED
  // ====================================================

  const resolvedCaseId =
    normalizeCaseId(
      party,
      caseId
    );

  const resolvedPartyId =
    normalizeId(
      party?.id ??
      id
    );

  const isCompany =
    party.entity_type ===
    'company';

  const identityNumber =
    normalizeId(
      party.identification_number ??
      party.tc_number
    ) ||
    null;

  const phone =
    String(
      party.phone ||
      ''
    ).trim();

  const email =
    String(
      party.email ||
      ''
    ).trim();

  const address =
    String(
      party.address ||
      ''
    ).trim();

  const lawyerPhone =
    String(
      party.lawyer_phone ||
      ''
    ).trim();

  const lawyerEmail =
    String(
      party.lawyer_email ||
      ''
    ).trim();

  const hasContact =
    Boolean(
      phone ||
      email ||
      address
    );

  const hasLawyer =
    Boolean(
      party.lawyer_name ||
      lawyerPhone ||
      lawyerEmail ||
      party.lawyer_registry_number
    );

  const editUrl =
    resolvedCaseId &&
    resolvedPartyId
      ? `/cases/${resolvedCaseId}/parties/${resolvedPartyId}/edit`
      : null;

  const backUrl =
    resolvedCaseId
      ? `/cases/${resolvedCaseId}`
      : '/cases';

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div className="min-w-0">

          <Link
            to={
              backUrl
            }
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />

            Davaya Dön
          </Link>

          <div className="mt-4 flex items-start gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">

              {isCompany ? (
                <Building2 className="h-6 w-6" />
              ) : (
                <UserRound className="h-6 w-6" />
              )}

            </div>

            <div className="min-w-0">

              <h1 className="break-words text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
                {party.name ||
                  'İsimsiz Taraf'}
              </h1>

              <div className="mt-2 flex flex-wrap gap-2">

                <Badge
                  variant={
                    getPartyTypeVariant(
                      party.party_type
                    )
                  }
                  dot
                >
                  {getPartyTypeLabel(
                    party.party_type
                  )}
                </Badge>

                <Badge
                  variant="default"
                >
                  {getEntityTypeLabel(
                    party.entity_type
                  )}
                </Badge>

              </div>

            </div>

          </div>

        </div>

        {canEdit &&
          editUrl && (
          <Link
            to={
              editUrl
            }
          >
            <Button
              variant="secondary"
            >
              <Edit2 className="h-4 w-4" />

              Düzenle
            </Button>
          </Link>
        )}

      </div>

      {/* ==================================================
          IDENTITY
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">

              <Scale size={17} />

            </div>

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Taraf ve Kimlik Bilgileri
              </h2>

              <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                Tarafın dosyadaki sıfatı ve kimlik bilgileri
              </p>

            </div>

          </div>

        </Card.Header>

        <Card.Body>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

            {/* PARTY TYPE */}

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
                Taraf Sıfatı
              </p>

              <div className="mt-2">

                <Badge
                  variant={
                    getPartyTypeVariant(
                      party.party_type
                    )
                  }
                >
                  {getPartyTypeLabel(
                    party.party_type
                  )}
                </Badge>

              </div>

            </div>

            {/* ENTITY */}

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
                Kişi Türü
              </p>

              <p className="mt-2 font-medium text-gray-900 dark:text-white">
                {getEntityTypeLabel(
                  party.entity_type
                )}
              </p>

            </div>

            {/* IDENTITY */}

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
                {isCompany
                  ? 'Vergi Kimlik No'
                  : 'T.C. Kimlik No'}
              </p>

              {identityNumber ? (
                <div className="mt-2 flex items-center gap-2">

                  <span className="font-mono text-sm font-semibold tracking-wide text-gray-900 dark:text-white">
                    {showIdentity
                      ? identityNumber
                      : maskIdentityNumber(
                          identityNumber
                        )}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setShowIdentity(
                        (
                          current
                        ) =>
                          !current
                      )
                    }
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-white"
                    title={
                      showIdentity
                        ? 'Kimlik numarasını gizle'
                        : 'Kimlik numarasını göster'
                    }
                    aria-label={
                      showIdentity
                        ? 'Kimlik numarasını gizle'
                        : 'Kimlik numarasını göster'
                    }
                  >
                    {showIdentity ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>

                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-400 dark:text-slate-600">
                  Belirtilmedi
                </p>
              )}

            </div>

            {/* TAX OFFICE */}

            {isCompany && (
              <div>

                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
                  Vergi Dairesi
                </p>

                <p className="mt-2 font-medium text-gray-900 dark:text-white">
                  {party.tax_office ||
                    'Belirtilmedi'}
                </p>

              </div>
            )}

          </div>

          {identityNumber && (
            <div className="mt-5 flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-white/[0.025] dark:text-slate-500">

              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />

              <p>
                Kimlik ve vergi numaraları gizlilik amacıyla varsayılan olarak maskelenir.
              </p>

            </div>
          )}

        </Card.Body>

      </Card>

      {/* ==================================================
          CONTACT
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400">

              <Phone size={17} />

            </div>

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                İletişim Bilgileri
              </h2>

              <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                Tarafın telefon, e-posta ve adres bilgileri
              </p>

            </div>

          </div>

        </Card.Header>

        <Card.Body>

          {!hasContact ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center dark:border-white/[0.07]">

              <Phone className="mx-auto h-6 w-6 text-gray-300 dark:text-slate-600" />

              <p className="mt-2 text-sm font-medium text-gray-600 dark:text-slate-400">
                İletişim bilgisi bulunmuyor
              </p>

              <p className="mt-1 text-xs text-gray-400 dark:text-slate-600">
                Bu taraf için telefon, e-posta veya adres bilgisi girilmemiş.
              </p>

              {canEdit &&
                editUrl && (
                <Link
                  to={
                    editUrl
                  }
                  className="mt-3 inline-block"
                >
                  <Button
                    variant="secondary"
                    size="sm"
                  >
                    <Edit2 className="h-3.5 w-3.5" />

                    Bilgi Ekle
                  </Button>
                </Link>
              )}

            </div>
          ) : (
            <div className="space-y-5">

              <div className="flex flex-wrap gap-2">

                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-blue-500/20 dark:hover:bg-blue-500/[0.05] dark:hover:text-blue-400"
                  >
                    <Phone className="h-4 w-4" />

                    {phone}
                  </a>
                )}

                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-blue-500/20 dark:hover:bg-blue-500/[0.05] dark:hover:text-blue-400"
                  >
                    <Mail className="h-4 w-4" />

                    {email}
                  </a>
                )}

              </div>

              {address && (
                <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-4 dark:border-white/[0.06]">

                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gray-400 dark:text-slate-500" />

                  <div className="min-w-0">

                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
                      Adres
                    </p>

                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700 dark:text-slate-300">
                      {address}
                    </p>

                  </div>

                </div>
              )}

            </div>
          )}

        </Card.Body>

      </Card>

      {/* ==================================================
          LAWYER
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/[0.08] dark:text-violet-400">

              <Scale size={17} />

            </div>

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Vekil Bilgileri
              </h2>

              <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                Tarafı temsil eden avukatın kayıtlı bilgileri
              </p>

            </div>

          </div>

        </Card.Header>

        <Card.Body>

          {!hasLawyer ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center dark:border-white/[0.07]">

              <Scale className="mx-auto h-6 w-6 text-gray-300 dark:text-slate-600" />

              <p className="mt-2 text-sm font-medium text-gray-600 dark:text-slate-400">
                Vekil bilgisi bulunmuyor
              </p>

              <p className="mt-1 text-xs text-gray-400 dark:text-slate-600">
                Bu taraf için henüz avukat veya baro sicil bilgisi kaydedilmemiş.
              </p>

              {canEdit &&
                editUrl && (
                <Link
                  to={
                    editUrl
                  }
                  className="mt-3 inline-block"
                >
                  <Button
                    variant="secondary"
                    size="sm"
                  >
                    <Edit2 className="h-3.5 w-3.5" />

                    Vekil Bilgisi Ekle
                  </Button>
                </Link>
              )}

            </div>
          ) : (
            <div className="space-y-5">

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

                <div>

                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
                    Avukat
                  </p>

                  <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                    {party.lawyer_name ||
                      'Belirtilmedi'}
                  </p>

                </div>

                <div>

                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
                    Baro Sicil No
                  </p>

                  <p className="mt-2 font-medium text-gray-900 dark:text-white">
                    {party.lawyer_registry_number ||
                      'Belirtilmedi'}
                  </p>

                </div>

                <div>

                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
                    İletişim
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">

                    {lawyerPhone && (
                      <a
                        href={`tel:${lawyerPhone}`}
                        className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2.5 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50 dark:bg-white/[0.03] dark:text-blue-400 dark:hover:bg-blue-500/[0.06]"
                      >
                        <Phone className="h-4 w-4" />

                        {lawyerPhone}
                      </a>
                    )}

                    {lawyerEmail && (
                      <a
                        href={`mailto:${lawyerEmail}`}
                        className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2.5 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50 dark:bg-white/[0.03] dark:text-blue-400 dark:hover:bg-blue-500/[0.06]"
                      >
                        <Mail className="h-4 w-4" />

                        {lawyerEmail}
                      </a>
                    )}

                    {!lawyerPhone &&
                      !lawyerEmail && (
                      <span className="text-sm text-gray-400 dark:text-slate-600">
                        Belirtilmedi
                      </span>
                    )}

                  </div>

                </div>

              </div>

            </div>
          )}

        </Card.Body>

      </Card>

      {/* ==================================================
          NOTES
      ================================================== */}

      {party.notes && (
        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400">

                <FileText size={17} />

              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  İç Not
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Büro içi kullanım için kaydedilen taraf notu
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">

              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700 dark:text-slate-300">
                {party.notes}
              </p>

            </div>

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          META
      ================================================== */}

      <Card>

        <Card.Body>

          <div className="flex flex-col gap-3 text-xs text-gray-400 dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between">

            <span>
              Kayıt oluşturulma:{' '}
              <strong className="font-medium text-gray-600 dark:text-slate-400">
                {formatDateTime(
                  party.created_at
                )}
              </strong>
            </span>

            <span>
              Son güncelleme:{' '}
              <strong className="font-medium text-gray-600 dark:text-slate-400">
                {formatDateTime(
                  party.updated_at
                )}
              </strong>
            </span>

          </div>

        </Card.Body>

      </Card>

    </div>
  );
};

export default CasePartyDetail;