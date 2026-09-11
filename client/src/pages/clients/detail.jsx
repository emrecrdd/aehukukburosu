import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  useClient,
  useClientCaseHistory,
  useClientPayments,
} from '../../features/clients/client.query.js';

import {
  useClientTaskOverview,
} from '../../features/tasks/task.query.js';

import {
  useClientMeetingTimeline,
} from '../../features/meetings/meeting.query.js';

import documentApi from '../../features/documents/document.api.js';

import {
  powerOfAttorneyApi,
} from '../../features/power-of-attorney/powerOfAttorney.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import FinanceContextSummary from '../../components/finance/FinanceContextSummary.jsx';

import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit2,
  FileText,
  ListTodo,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Scale,
  ShieldCheck,
  User,
  UserCog,
  WalletCards,
} from 'lucide-react';

// ======================================================
// HELPERS
// ======================================================

const formatDate = (
  value
) => {
  if (!value) {
    return '-';
  }

  try {
    const date =
      new Date(value);

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
        timeZone:
          'Europe/Istanbul',

        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',
      }
    ).format(date);
  } catch {
    return '-';
  }
};

const formatDateTime = (
  value
) => {
  if (!value) {
    return '-';
  }

  try {
    const date =
      new Date(value);

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
        timeZone:
          'Europe/Istanbul',

        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit',

        hour12:
          false,
      }
    ).format(date);
  } catch {
    return '-';
  }
};

const formatMoney = (
  value
) => {
  const amount =
    Number(value) || 0;

  return new Intl.NumberFormat(
    'tr-TR',
    {
      style:
        'currency',

      currency:
        'TRY',

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  ).format(amount);
};

const formatFileSize = (
  bytes
) => {
  const size =
    Number(bytes) || 0;

  if (size <= 0) {
    return '0 B';
  }

  const units = [
    'B',
    'KB',
    'MB',
    'GB',
  ];

  const index =
    Math.min(
      Math.floor(
        Math.log(size) /
          Math.log(1024)
      ),
      units.length - 1
    );

  const value =
    size /
    1024 ** index;

  return `${Number(
    value.toFixed(2)
  )} ${units[index]}`;
};

const getPersonName = (
  person
) => {
  if (!person) {
    return '-';
  }

  return (
    [
      person.first_name,
      person.last_name,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    '-'
  );
};

const normalizePhone = (
  value
) => {
  return String(
    value || ''
  ).replace(
    /\D/g,
    ''
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
      value?.id ??
      value?._id;

    if (
      objectId === null ||
      objectId === undefined ||
      objectId === ''
    ) {
      return '';
    }

    return String(
      objectId
    );
  }

  return String(
    value
  );
};

const getArrayPayload = (
  response
) => {
  const payload =
    response?.data?.data ??
    response?.data ??
    response ??
    [];

  if (
    Array.isArray(
      payload
    )
  ) {
    return payload;
  }

  if (
    Array.isArray(
      payload?.data
    )
  ) {
    return payload.data;
  }

  if (
    Array.isArray(
      payload?.items
    )
  ) {
    return payload.items;
  }

  if (
    Array.isArray(
      payload?.results
    )
  ) {
    return payload.results;
  }

  if (
    Array.isArray(
      payload?.rows
    )
  ) {
    return payload.rows;
  }

  return [];
};

const getPaginationPayload = (
  response
) => {
  return (
    response?.data?.pagination ??
    response?.pagination ??
    response?.data?.data?.pagination ??
    null
  );
};

const normalizeWhatsAppPhone = (
  value
) => {
  const digits =
    normalizePhone(
      value
    );

  if (!digits) {
    return '';
  }

  /*
   * Türkiye'deki yaygın kayıt biçimlerini wa.me'nin
   * ülke kodlu formatına çevirir.
   * Diğer ülke kodları olduğu gibi bırakılır.
   */
  if (
    /^05\d{9}$/.test(
      digits
    )
  ) {
    return `90${digits.slice(1)}`;
  }

  if (
    /^5\d{9}$/.test(
      digits
    )
  ) {
    return `90${digits}`;
  }

  return digits;
};

const sanitizeEmail = (
  value
) => {
  const email =
    String(
      value ??
      ''
    ).trim();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  )
    ? email
    : '';
};

// ======================================================
// CLIENT STATUS
// ======================================================

const getClientStatusLabel = (
  status
) => {
  const labels = {
    active:
      'Aktif',

    passive:
      'Pasif',

    archived:
      'Arşiv',
  };

  return (
    labels[status] ||
    status ||
    '-'
  );
};

const getClientStatusVariant = (
  status
) => {
  switch (status) {
    case 'active':
      return 'success';

    case 'passive':
      return 'warning';

    default:
      return 'default';
  }
};

// ======================================================
// CASE STATUS
// ======================================================

const getCaseStatusLabel = (
  status
) => {
  const labels = {
    active:
      'Devam Ediyor',

    preparation:
      'Hazırlık',

    hearing:
      'Duruşmada',

    appeal:
      'İstinaf',

    cassation:
      'Temyiz',

    concluded:
      'Sonuçlandı',

    archived:
      'Arşivlendi',
  };

  return (
    labels[status] ||
    status ||
    '-'
  );
};

const getCaseStatusVariant = (
  status
) => {
  switch (status) {
    case 'active':
      return 'success';

    case 'preparation':
      return 'warning';

    case 'hearing':
      return 'info';

    case 'appeal':
      return 'warning';

    case 'archived':
      return 'danger';

    default:
      return 'default';
  }
};

// ======================================================
// POA STATUS
// ======================================================

const getPOAStatusLabel = (
  status
) => {
  const labels = {
    active:
      'Aktif',

    expired:
      'Süresi Doldu',

    cancelled:
      'İptal',
  };

  return (
    labels[status] ||
    status ||
    '-'
  );
};

const getPOAStatusVariant = (
  status
) => {
  switch (status) {
    case 'active':
      return 'success';

    case 'expired':
      return 'warning';

    case 'cancelled':
      return 'danger';

    default:
      return 'default';
  }
};

// ======================================================
// TASK STATUS
// ======================================================

const getTaskStatusLabel = (
  status
) => {
  const labels = {
    pending:
      'Bekliyor',

    in_progress:
      'Devam Ediyor',

    completed:
      'Tamamlandı',

    cancelled:
      'İptal',
  };

  return (
    labels[status] ||
    status ||
    '-'
  );
};

const getTaskStatusVariant = (
  status
) => {
  switch (status) {
    case 'pending':
      return 'warning';

    case 'in_progress':
      return 'info';

    case 'completed':
      return 'success';

    case 'cancelled':
      return 'danger';

    default:
      return 'default';
  }
};

// ======================================================
// MEETING STATUS
// ======================================================

const getMeetingStatusLabel = (
  status
) => {
  const labels = {
    scheduled:
      'Planlandı',

    ongoing:
      'Devam Ediyor',

    completed:
      'Tamamlandı',

    cancelled:
      'İptal',
  };

  return (
    labels[status] ||
    status ||
    '-'
  );
};

const getMeetingStatusVariant = (
  status
) => {
  switch (status) {
    case 'scheduled':
      return 'info';

    case 'ongoing':
      return 'warning';

    case 'completed':
      return 'success';

    case 'cancelled':
      return 'danger';

    default:
      return 'default';
  }
};

// ======================================================
// COMPONENT
// ======================================================

const ClientDetail = () => {
  const {
    id: idParam,
  } =
    useParams();

  const id =
    normalizeId(
      idParam
    );

  const {
    user,
  } =
    useAuth();

  // ======================================================
  // PERMISSIONS
  // Merkezi permission sistemi kullanılır.
  // Rol varsayılanı + kullanıcı override birlikte değerlendirilir.
  // ======================================================

  const canEdit =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_CLIENTS
    );

  const canViewCases =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_CASES
    );

  const canViewPayments =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_PAYMENTS
    );

  const canViewTasks =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_TASKS
    );

  const canCreateTask =
    hasPermission(
      user,
      PERMISSION_KEYS.CREATE_TASKS
    );

  const canViewMeetings =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_MEETINGS
    );

  const canCreateMeeting =
    hasPermission(
      user,
      PERMISSION_KEYS.CREATE_MEETINGS
    );

  const canViewDocuments =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_DOCUMENTS
    );

  const canUploadDocument =
    hasPermission(
      user,
      PERMISSION_KEYS.UPLOAD_DOCUMENTS
    );

  const canViewPOA =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_POWER_OF_ATTORNEY
    );

  const canCreatePOA =
    hasPermission(
      user,
      PERMISSION_KEYS.CREATE_POWER_OF_ATTORNEY
    );

  // ======================================================
  // CLIENT
  // ======================================================

  const {
    data,
    isLoading,
    error,
  } =
    useClient(
      id
    );

  // ======================================================
  // CASES
  //
  // Ana client endpoint'inden ayrıldı.
  // ======================================================

  const {
    data:
      casesData,

    isLoading:
      casesLoading,

    error:
      casesError,
  } =
    useClientCaseHistory(
      canViewCases
        ? id
        : ''
    );

  // ======================================================
  // PAYMENTS
  //
  // Ana client endpoint'inden ayrıldı.
  // ======================================================

  const {
    data:
      paymentsData,

    isLoading:
      paymentsLoading,

    error:
      paymentsError,
  } =
    useClientPayments(
      canViewPayments
        ? id
        : ''
    );

  // ======================================================
  // TASK COCKPIT
  // ======================================================

  const {
    data:
      taskOverviewData,

    isLoading:
      tasksLoading,

    error:
      tasksError,
  } =
    useClientTaskOverview(
      canViewTasks
        ? id
        : '',
      {
        active_limit:
          5,

        recent_limit:
          5,
      }
    );

  // ======================================================
  // MEETING COCKPIT
  // ======================================================

  const {
    data:
      meetingTimelineData,

    isLoading:
      meetingsLoading,

    error:
      meetingsError,
  } =
    useClientMeetingTimeline(
      canViewMeetings
        ? id
        : '',
      {
        upcoming_limit:
          5,

        recent_limit:
          5,
      }
    );

  // ======================================================
  // DOCUMENTS
  // ======================================================

  const {
    data:
      documentsData,

    isLoading:
      documentsLoading,

    error:
      documentsError,
  } =
    useQuery({
      queryKey: [
        'client-documents',
        id,
      ],

      queryFn: () =>
        documentApi.getAll({
          client_id:
            id,

          page:
            1,

          limit:
            5,
        }),

      enabled:
        canViewDocuments &&
        Boolean(
          id
        ),

      staleTime:
        0,

      refetchOnMount:
        'always',

      refetchOnWindowFocus:
        'always',

      refetchOnReconnect:
        'always',
    });

  // ======================================================
  // POWER OF ATTORNEYS
  // ======================================================

  const {
    data:
      poaData,

    isLoading:
      poaLoading,

    error:
      poaError,
  } =
    useQuery({
      queryKey: [
        'powerOfAttorneys',
        'client',
        id,
      ],

      queryFn: () =>
        powerOfAttorneyApi.getByClient(
          id
        ),

      enabled:
        canViewPOA &&
        Boolean(
          id
        ),

      staleTime:
        0,

      refetchOnMount:
        'always',

      refetchOnWindowFocus:
        'always',

      refetchOnReconnect:
        'always',
    });

  // ======================================================
  // NORMALIZE DATA
  // ======================================================

  const client =
    data?.data?.data ??
    data?.data ??
    data ??
    null;

  const cases =
    canViewCases
      ? getArrayPayload(
          casesData
        )
      : [];

  const payments =
    canViewPayments
      ? getArrayPayload(
          paymentsData
        )
      : [];

  const powerOfAttorneys =
    canViewPOA
      ? getArrayPayload(
          poaData
        )
      : [];

  const documents =
    canViewDocuments
      ? getArrayPayload(
          documentsData
        )
      : [];

  const documentPagination =
    getPaginationPayload(
      documentsData
    );

  const taskOverview =
    taskOverviewData
      ?.data?.data ??
    taskOverviewData
      ?.data ??
    null;

  const activeTasks =
    Array.isArray(
      taskOverview?.active
    )
      ? taskOverview.active
      : [];

  const taskSummary =
    taskOverview?.summary || {
      total:
        0,

      pending:
        0,

      in_progress:
        0,

      completed:
        0,

      overdue:
        0,
    };

  const meetingTimeline =
    meetingTimelineData
      ?.data?.data ??
    meetingTimelineData
      ?.data ??
    null;

  const upcomingMeetings =
    Array.isArray(
      meetingTimeline
        ?.upcoming
    )
      ? meetingTimeline
          .upcoming
      : [];

  // ======================================================
  // FINANCE V2
  // ======================================================

  const financialSummary =
    (() => {
      let received = 0;
      let refunded = 0;

      payments.forEach((payment) => {
        const amount = Number(payment?.amount) || 0;
        if (!Number.isFinite(amount) || payment?.status !== 'posted') return;

        if (payment?.transaction_type === 'receipt') received += amount;
        if (payment?.transaction_type === 'refund') refunded += amount;
      });

      return {
        received: Math.max(received - refunded, 0),
      };
    })();

  // ======================================================
  // CONTACT
  // ======================================================

  const phone =
    String(
      client?.phone ??
      ''
    ).trim();

  const email =
    sanitizeEmail(
      client?.email
    );

  const normalizedPhone =
    normalizePhone(
      phone
    );

  const whatsappPhone =
    normalizeWhatsAppPhone(
      phone
    );

  const whatsappMessage =
    encodeURIComponent(
      `Merhaba ${client?.name || ''},`
    );

  const whatsappUrl =
    whatsappPhone
      ? `https://wa.me/${whatsappPhone}?text=${whatsappMessage}`
      : null;

  const telUrl =
    normalizedPhone
      ? `tel:${phone.startsWith('+')
          ? '+'
          : ''}${normalizedPhone}`
      : null;

  const mailUrl =
    email
      ? `mailto:${email}`
      : null;

  // ======================================================
  // LOADING
  // ======================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex h-96 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Müvekkil bilgileri yükleniyor...
          </p>

        </div>

      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    error ||
    !client
  ) {
    return (
      <div className="py-20 text-center">

        <div className="mb-4 text-6xl">
          🔍
        </div>

        <h2 className="text-xl font-semibold text-red-600">
          Müvekkil bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {error?.response
            ?.data?.message ||
            error?.message ||
            'Müvekkil bilgileri yüklenemedi'}
        </p>

        <Link
          to="/clients"
          className="mt-4 inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Müvekkillere Dön
        </Link>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

          <div className="min-w-0 flex-1">

            <Link
              to="/clients"
              className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />

              Müvekkillere Dön
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">

                {client.client_type ===
                'corporate' ? (
                  <Building2 className="h-6 w-6 text-blue-600" />
                ) : (
                  <User className="h-6 w-6 text-blue-600" />
                )}

              </div>

              <div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {client.name || 'İsimsiz müvekkil'}
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  {client.client_type ===
                  'corporate'
                    ? 'Kurumsal Müvekkil'
                    : 'Bireysel Müvekkil'}
                </p>

              </div>

              <Badge
                variant={getClientStatusVariant(
                  client.status
                )}
              >
                {getClientStatusLabel(
                  client.status
                )}
              </Badge>

            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            {canUploadDocument && (
              <Link
                to={`/documents/upload?client=${client.id}`}
              >
                <Button
                  variant="outline"
                  size="sm"
                >
                  <FileText className="mr-2 h-4 w-4" />

                  Belge Yükle
                </Button>
              </Link>
            )}

            {canCreateTask && (
              <Link
                to={`/tasks/create?client_id=${client.id}`}
              >
                <Button
                  variant="outline"
                  size="sm"
                >
                  <ListTodo className="mr-2 h-4 w-4" />

                  Görev Ekle
                </Button>
              </Link>
            )}

            {canCreateMeeting && (
              <Link
                to={`/meetings/create?client_id=${client.id}`}
              >
                <Button
                  variant="outline"
                  size="sm"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />

                  Toplantı Ekle
                </Button>
              </Link>
            )}

            {canEdit && (
              <Link
                to={`/clients/${client.id}/edit`}
              >
                <Button
                  variant="secondary"
                  size="sm"
                >
                  <Edit2 className="mr-2 h-4 w-4" />

                  Düzenle
                </Button>
              </Link>
            )}

          </div>

        </div>

        {/* CONTACT */}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">

          {telUrl && (
            <a
              href={
                telUrl
              }
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <Phone className="h-4 w-4" />

              Ara
            </a>
          )}

          {whatsappUrl && (
            <a
              href={
                whatsappUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <MessageCircle className="h-4 w-4" />

              WhatsApp
            </a>
          )}

          {mailUrl && (
            <a
              href={
                mailUrl
              }
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <Mail className="h-4 w-4" />

              E-posta
            </a>
          )}

          {!telUrl &&
            !mailUrl && (
              <span className="text-sm text-gray-400">
                İletişim bilgisi bulunmuyor
              </span>
            )}

        </div>

      </div>

      {/* ==================================================
          COCKPIT SUMMARY
      ================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Briefcase className="h-4 w-4" />
            Davalar
          </div>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {!canViewCases
              ? '-'
              : casesLoading
                ? '...'
                : cases.length}
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ListTodo className="h-4 w-4" />
            Aktif Görev
          </div>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {canViewTasks
              ? (Number(
                  taskSummary.pending
                ) || 0) +
                (Number(
                  taskSummary.in_progress
                ) || 0)
              : '-'}
          </p>

          {canViewTasks &&
            Number(
              taskSummary.overdue
            ) > 0 && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {taskSummary.overdue} gecikmiş
            </p>
          )}

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CalendarDays className="h-4 w-4" />
            Yaklaşan Toplantı
          </div>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {canViewMeetings
              ? upcomingMeetings.length
              : '-'}
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FileText className="h-4 w-4" />
            Belgeler
          </div>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {canViewDocuments
              ? documentPagination?.total ??
                documents.length
              : '-'}
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <WalletCards className="h-4 w-4" />
            Tahsilat
          </div>

          <p className="mt-2 text-lg font-bold text-green-600">
            {!canViewPayments
              ? '-'
              : paymentsLoading
                ? '...'
                : formatMoney(
                    financialSummary.received
                  )}
          </p>

        </div>

      </div>

      {/* ==================================================
          ALERTS
      ================================================== */}

      {((canViewTasks &&
        Number(
          taskSummary.overdue
        ) > 0) ||
        (canViewMeetings &&
          upcomingMeetings.length >
            0)) && (
        <div className="grid gap-4 md:grid-cols-2">

          {canViewTasks &&
            Number(
              taskSummary.overdue
            ) > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/10">

              <div className="flex items-start gap-3">

                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <div>

                  <p className="font-semibold text-red-900 dark:text-red-300">
                    Gecikmiş görev bulunuyor
                  </p>

                  <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                    Bu müvekkile bağlı {taskSummary.overdue} görev son teslim tarihini geçti.
                  </p>

                </div>

              </div>

            </div>
          )}

          {canViewMeetings &&
            upcomingMeetings.length >
              0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">

              <div className="flex items-start gap-3">

                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                <div>

                  <p className="font-semibold text-blue-900 dark:text-blue-300">
                    Yaklaşan toplantı
                  </p>

                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                    İlk toplantı:{' '}
                    {formatDateTime(
                      upcomingMeetings[0]?.start_date
                    )}
                  </p>

                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* ==================================================
          TASKS + MEETINGS
      ================================================== */}

      {(canViewTasks || canViewMeetings) && (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* TASKS */}

        {canViewTasks && (
        <Card>

          <Card.Header>

            <div className="flex items-center justify-between gap-3">

              <div className="flex items-center gap-2">

                <ListTodo className="h-5 w-5 text-blue-600" />

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Aktif Görevler
                  </h2>

                  <p className="text-xs text-gray-500">
                    Öncelikli ve açık görevler
                  </p>

                </div>

              </div>

              <Badge variant="default">
                {taskSummary.total || 0} toplam
              </Badge>

            </div>

          </Card.Header>

          <Card.Body>

            {tasksLoading ? (
              <div className="py-8 text-center text-sm text-gray-500">
                Görevler yükleniyor...
              </div>
            ) : tasksError ? (
              <div className="py-8 text-center text-sm text-red-500">
                Görevler yüklenemedi.
              </div>
            ) : activeTasks.length ===
              0 ? (
              <div className="py-10 text-center">

                <CheckCircle2 className="mx-auto h-9 w-9 text-gray-300" />

                <p className="mt-2 text-sm text-gray-400">
                  Aktif görev bulunmuyor.
                </p>

              </div>
            ) : (
              <div className="space-y-3">

                {activeTasks.map(
                  (
                    task
                  ) => (
                    <Link
                      key={
                        task.id
                      }
                      to={`/tasks/${task.id}`}
                      className="block rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate font-semibold text-gray-900 dark:text-white">
                            {
                              task.title ||
                              'Görev'
                            }
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Son tarih:{' '}
                            {formatDateTime(
                              task.due_date
                            )}
                          </p>

                          {task.assignee && (
                            <p className="mt-1 text-xs text-gray-500">
                              Atanan:{' '}
                              {getPersonName(
                                task.assignee
                              )}
                            </p>
                          )}

                        </div>

                        <Badge
                          variant={getTaskStatusVariant(
                            task.status
                          )}
                        >
                          {getTaskStatusLabel(
                            task.status
                          )}
                        </Badge>

                      </div>

                    </Link>
                  )
                )}

              </div>
            )}

          </Card.Body>

        </Card>
        )}

        {/* MEETINGS */}

        {canViewMeetings && (
        <Card>

          <Card.Header>

            <div className="flex items-center justify-between gap-3">

              <div className="flex items-center gap-2">

                <CalendarDays className="h-5 w-5 text-blue-600" />

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Yaklaşan Toplantılar
                  </h2>

                  <p className="text-xs text-gray-500">
                    Müvekkil ile planlanan görüşmeler
                  </p>

                </div>

              </div>

              <Badge variant="default">
                {upcomingMeetings.length} yaklaşan
              </Badge>

            </div>

          </Card.Header>

          <Card.Body>

            {meetingsLoading ? (
              <div className="py-8 text-center text-sm text-gray-500">
                Toplantılar yükleniyor...
              </div>
            ) : meetingsError ? (
              <div className="py-8 text-center text-sm text-red-500">
                Toplantılar yüklenemedi.
              </div>
            ) : upcomingMeetings.length ===
              0 ? (
              <div className="py-10 text-center">

                <CalendarDays className="mx-auto h-9 w-9 text-gray-300" />

                <p className="mt-2 text-sm text-gray-400">
                  Yaklaşan toplantı bulunmuyor.
                </p>

              </div>
            ) : (
              <div className="space-y-3">

                {upcomingMeetings.map(
                  (
                    meeting
                  ) => (
                    <Link
                      key={
                        meeting.id
                      }
                      to={`/meetings/${meeting.id}`}
                      className="block rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate font-semibold text-gray-900 dark:text-white">
                            {
                              meeting.title ||
                              'Toplantı'
                            }
                          </p>

                          <p className="mt-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                            {formatDateTime(
                              meeting.start_date
                            )}
                          </p>

                          {meeting.location && (
                            <p className="mt-1 text-xs text-gray-500">
                              {
                                meeting.location
                              }
                            </p>
                          )}

                        </div>

                        <Badge
                          variant={getMeetingStatusVariant(
                            meeting.status
                          )}
                        >
                          {getMeetingStatusLabel(
                            meeting.status
                          )}
                        </Badge>

                      </div>

                    </Link>
                  )
                )}

              </div>
            )}

          </Card.Body>

        </Card>
        )}

      </div>
      )}

      {/* ==================================================
          DOCUMENTS
      ================================================== */}

      {canViewDocuments && (
      <Card>

        <Card.Header>

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <FileText className="h-5 w-5 text-blue-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Son Belgeler
                </h2>

                <p className="text-xs text-gray-500">
                  Müvekkile doğrudan bağlı son belge kayıtları
                </p>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <Badge variant="default">
                {documentPagination?.total ??
                  documents.length}{' '}
                belge
              </Badge>

              {canUploadDocument && (
                <Link
                  to={`/documents/upload?client=${client.id}`}
                >
                  <Button
                    size="sm"
                    variant="outline"
                  >
                    Belge Yükle
                  </Button>
                </Link>
              )}

            </div>

          </div>

        </Card.Header>

        <Card.Body>

          {documentsLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Belgeler yükleniyor...
            </div>
          ) : documentsError ? (
            <div className="py-8 text-center text-sm text-red-500">
              Belgeler yüklenemedi.
            </div>
          ) : documents.length ===
            0 ? (
            <div className="py-10 text-center">

              <FileText className="mx-auto h-10 w-10 text-gray-300" />

              <p className="mt-2 text-sm text-gray-400">
                Müvekkile bağlı belge bulunmuyor.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">

              {documents.map(
                (
                  documentItem
                ) => (
                  <Link
                    key={
                      documentItem.id
                    }
                    to={`/documents/${documentItem.id}`}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >

                    <div className="min-w-0">

                      <p className="truncate font-medium text-gray-900 hover:text-blue-600 dark:text-white">
                        {
                          documentItem.name
                        }
                      </p>

                      <p className="mt-1 truncate text-xs text-gray-500">
                        {
                          documentItem.original_name
                        }
                      </p>

                    </div>

                    <div className="shrink-0 text-right">

                      <p className="text-xs text-gray-500">
                        {formatFileSize(
                          documentItem.file_size
                        )}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {formatDate(
                          documentItem.created_at
                        )}
                      </p>

                    </div>

                  </Link>
                )
              )}

            </div>
          )}

        </Card.Body>

      </Card>
      )}

      {/* ==================================================
          INFO + FINANCE
      ================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* CLIENT INFO */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-2">

              <User className="h-5 w-5 text-blue-600" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Müvekkil Bilgileri
              </h2>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Ad Soyad / Unvan
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {client.name ||
                    '-'}
                </p>

              </div>

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  TCKNO / VKN
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {client.identification_number ||
                    '-'}
                </p>

              </div>

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Telefon
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {client.phone ||
                    '-'}
                </p>

              </div>

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  E-posta
                </p>

                <p className="mt-1 break-all font-medium text-gray-900 dark:text-white">
                  {client.email ||
                    '-'}
                </p>

              </div>

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Şehir
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {client.city ||
                    '-'}
                </p>

              </div>

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  İlçe
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {client.district ||
                    '-'}
                </p>

              </div>

            </div>

            <div>

              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Adres
              </p>

              <div className="mt-1 flex items-start gap-2">

                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />

                <p className="font-medium leading-6 text-gray-900 dark:text-white">
                  {client.address ||
                    '-'}
                </p>

              </div>

            </div>

            {client.notes && (
              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Genel Not
                </p>

                <div className="mt-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">

                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
                    {
                      client.notes
                    }
                  </p>

                </div>

              </div>
            )}

            {(() => {
              const clientTags =
                Array.isArray(
                  client.tags
                )
                  ? client.tags
                  : String(
                      client.tags ??
                      ''
                    )
                      .split(',')
                      .map(
                        (tag) =>
                          tag.trim()
                      )
                      .filter(Boolean);

              if (
                clientTags.length ===
                0
              ) {
                return null;
              }

              return (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Etiketler
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {clientTags.map(
                      (
                        tag
                      ) => (
                        <Badge
                          key={
                            String(
                              tag
                            ).toLocaleLowerCase(
                              'tr-TR'
                            )
                          }
                          variant="default"
                        >
                          #{tag}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              );
            })()}

            {client.creator && (
              <div className="border-t border-gray-100 pt-4 dark:border-gray-700">

                <p className="text-xs text-gray-400">
                  Kaydı oluşturan
                </p>

                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {getPersonName(
                    client.creator
                  )}
                </p>

              </div>
            )}

          </Card.Body>

        </Card>

        {/* FINANCE V2 */}

        {canViewPayments && (
          <FinanceContextSummary type="client" id={id} title="Müvekkil Finans Özeti" />
        )}

      </div>

      {/* ==================================================
          POWER OF ATTORNEYS
      ================================================== */}

      {canViewPOA && (
      <Card>

        <Card.Header>

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <Scale className="h-5 w-5 text-blue-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Vekâletnameler
                </h2>

                <p className="text-xs text-gray-500">
                  Müvekkile ait vekâletname kayıtları
                </p>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <Badge variant="default">
                {powerOfAttorneys.length} kayıt
              </Badge>

              {canCreatePOA && (
                <Link
                  to={`/power-of-attorney/create?client_id=${client.id}`}
                >
                  <Button size="sm">
                    + Yeni Vekâletname
                  </Button>
                </Link>
              )}

            </div>

          </div>

        </Card.Header>

        <Card.Body>

          {poaLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Vekâletnameler yükleniyor...
            </div>
          ) : poaError ? (
            <div className="py-8 text-center text-sm text-red-500">
              Vekâletnameler yüklenemedi.
            </div>
          ) : powerOfAttorneys.length ===
            0 ? (
            <div className="py-8 text-center">

              <FileText className="mx-auto h-10 w-10 text-gray-300" />

              <p className="mt-2 text-gray-400">
                Henüz vekâletname bulunmuyor.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {powerOfAttorneys.map(
                (
                  poa
                ) => (
                  <Link
                    key={
                      poa.id
                    }
                    to={`/power-of-attorney/${poa.id}`}
                    className="block rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <p className="font-semibold text-gray-900 dark:text-white">
                          {
                            poa.title ||
                            'Vekâletname'
                          }
                        </p>

                        {poa.case && (
                          <p className="mt-1 text-sm text-gray-500">
                            {
                              poa.case.title
                            }
                          </p>
                        )}

                        <p className="mt-2 text-xs text-gray-400">

                          {poa.start_date
                            ? `Başlangıç: ${formatDate(
                                poa.start_date
                              )}`
                            : ''}

                          {poa.end_date
                            ? ` · Bitiş: ${formatDate(
                                poa.end_date
                              )}`
                            : ''}

                        </p>

                      </div>

                      <Badge
                        variant={getPOAStatusVariant(
                          poa.status
                        )}
                      >
                        {getPOAStatusLabel(
                          poa.status
                        )}
                      </Badge>

                    </div>

                  </Link>
                )
              )}

            </div>
          )}

        </Card.Body>

      </Card>
      )}

      {/* ==================================================
          CASES
      ================================================== */}

      {canViewCases && (
      <Card>

        <Card.Header>

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <Briefcase className="h-5 w-5 text-blue-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Davalar
                </h2>

                <p className="text-xs text-gray-500">
                  Müvekkile bağlı dava kayıtları
                </p>

              </div>

            </div>

            <Badge variant="default">
              {casesLoading
                ? '...'
                : `${cases.length} dava`}
            </Badge>

          </div>

        </Card.Header>

        <Card.Body>

          {casesLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Davalar yükleniyor...
            </div>
          ) : casesError ? (
            <div className="py-8 text-center">

              <Briefcase className="mx-auto h-9 w-9 text-red-300" />

              <p className="mt-2 text-sm text-red-500">
                Davalar yüklenemedi.
              </p>

            </div>
          ) : cases.length ===
            0 ? (
            <div className="py-8 text-center">

              <Briefcase className="mx-auto h-10 w-10 text-gray-300" />

              <p className="mt-2 text-gray-400">
                Henüz ilişkili dava bulunmuyor.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {cases.map(
                (
                  caseItem
                ) => (
                  <Link
                    key={
                      caseItem.id
                    }
                    to={`/cases/${caseItem.id}`}
                    className="block rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                      <div className="min-w-0">

                        <p className="font-semibold text-gray-900 dark:text-white">
                          {
                            caseItem.title ||
                            caseItem.case_number ||
                            'Dava dosyası'
                          }
                        </p>

                        {caseItem.case_number && (
                          <p className="mt-1 text-xs text-gray-400">
                            Dosya No:{' '}
                            {
                              caseItem.case_number
                            }
                          </p>
                        )}

                      </div>

                      <Badge
                        variant={getCaseStatusVariant(
                          caseItem.status
                        )}
                      >
                        {getCaseStatusLabel(
                          caseItem.status
                        )}
                      </Badge>

                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">

                      <div>

                        <p className="flex items-center gap-1 text-xs text-gray-400">
                          <Building2 className="h-3 w-3" />

                          Mahkeme
                        </p>

                        <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {caseItem.court_name ||
                            '-'}
                        </p>

                      </div>

                      <div>

                        <p className="flex items-center gap-1 text-xs text-gray-400">
                          <CalendarDays className="h-3 w-3" />

                          Açılış
                        </p>

                        <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatDate(
                            caseItem.opening_date
                          )}
                        </p>

                      </div>

                      <div>

                        <p className="flex items-center gap-1 text-xs text-gray-400">
                          <UserCog className="h-3 w-3" />

                          Atanan Avukat
                        </p>

                        <p className="mt-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                          {getPersonName(
                            caseItem.assignee
                          )}
                        </p>

                      </div>

                    </div>

                  </Link>
                )
              )}

            </div>
          )}

        </Card.Body>

      </Card>
      )}

      {/* ==================================================
          FOOTER
      ================================================== */}

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">

        <div className="flex items-start gap-3">

          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

          <div>

            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Müvekkil çalışma alanı
            </p>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              Bu ekran müvekkile bağlı dava, görev, toplantı, belge,
              vekâletname ve finansal kayıtları merkezi olarak gösterir.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};

export default ClientDetail;