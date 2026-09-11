import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import meetingApi from '../../features/meetings/meeting.api.js';

import {
  useUpdateMeetingStatus,
} from '../../features/meetings/meeting.query.js';

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

import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Edit2,
  ExternalLink,
  Link2,
  MapPin,
  MessageSquareText,
  Phone,
  UserRound,
  UsersRound,
  Video,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const STATUS_OPTIONS = [
  {
    value: 'scheduled',
    label: 'Planlandı',
  },
  {
    value: 'ongoing',
    label: 'Devam Ediyor',
  },
  {
    value: 'completed',
    label: 'Tamamlandı',
  },
  {
    value: 'cancelled',
    label: 'İptal',
  },
];

// ======================================================
// STATUS HELPERS
// ======================================================

const getStatusVariant = (status) => {
  switch (status) {
    case 'scheduled':
      return 'warning';

    case 'ongoing':
      return 'info';

    case 'completed':
      return 'success';

    case 'cancelled':
      return 'danger';

    default:
      return 'default';
  }
};

const getStatusLabel = (status) => {
  const labels = {
    scheduled: 'Planlandı',
    ongoing: 'Devam Ediyor',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
  };

  return (
    labels[status] ||
    status ||
    'Bilinmiyor'
  );
};

// ======================================================
// MEETING TYPE HELPERS
// ======================================================

const getMeetingTypeInfo = (type) => {
  switch (type) {
    case 'client':
      return {
        label:
          'Müvekkil Görüşmesi',
        icon:
          UserRound,
      };

    case 'internal':
      return {
        label:
          'İç Toplantı',
        icon:
          BriefcaseBusiness,
      };

    case 'phone':
      return {
        label:
          'Telefon Görüşmesi',
        icon:
          Phone,
      };

    default:
      return {
        label:
          'Diğer',
        icon:
          UsersRound,
      };
  }
};

// ======================================================
// DATE HELPER
// ======================================================

const formatDate = (
  date
) => {
  if (!date) {
    return '-';
  }

  try {
    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
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
    ).format(
      parsed
    );
  } catch {
    return '-';
  }
};

// ======================================================
// NAME HELPER
// ======================================================

const getPersonName = (
  person,
  fallback = 'Belirtilmemiş'
) => {
  if (!person) {
    return fallback;
  }

  const name = [
    person.first_name,
    person.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    name ||
    fallback
  );
};

// ======================================================
// INTERNAL PARTICIPANT HELPERS
// ======================================================

const getInternalParticipants = (
  meeting
) => {
  if (
    Array.isArray(
      meeting?.participantUsers
    ) &&
    meeting.participantUsers.length >
      0
  ) {
    return meeting.participantUsers;
  }

  /*
   * Legacy toplantılar için assigned_to / assignee fallback.
   * Migration sonrası normal durumda participantUsers dolu gelir.
   */
  if (
    meeting?.assignee
  ) {
    return [
      meeting.assignee,
    ];
  }

  return [];
};

const getParticipantSummary = (
  participants
) => {
  if (
    !Array.isArray(
      participants
    ) ||
    participants.length ===
      0
  ) {
    return 'Atanmadı';
  }

  if (
    participants.length ===
    1
  ) {
    return getPersonName(
      participants[0],
      'Atanmadı'
    );
  }

  return `${participants.length} kişi`;
};

// ======================================================
// ID HELPER
// ======================================================

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
    return normalizeId(
      value?.id
    );
  }

  return String(
    value
  );
};

// ======================================================
// CASE NAME HELPER
// ======================================================

const getCaseDisplayName = (
  caseItem
) => {
  if (!caseItem) {
    return 'Dava';
  }

  const courtName =
    String(
      caseItem.court_name ||
      ''
    ).trim();

  const caseNumber =
    String(
      caseItem.case_number ||
      ''
    ).trim();

  if (
    courtName &&
    caseNumber
  ) {
    return `${courtName} · ${caseNumber}`;
  }

  return (
    courtName ||
    caseNumber ||
    caseItem.title ||
    'Dava'
  );
};

const getConsultationDisplayName = (
  consultation
) => {
  if (!consultation) {
    return 'Danışmanlık';
  }

  const consultationNumber =
    String(
      consultation.consultation_number ||
      ''
    ).trim();

  const title =
    String(
      consultation.title ||
      ''
    ).trim();

  if (
    consultationNumber &&
    title
  ) {
    return `${consultationNumber} · ${title}`;
  }

  return (
    consultationNumber ||
    title ||
    'Danışmanlık'
  );
};

const getCaseSecondaryInfo = (
  caseItem
) => {
  if (!caseItem) {
    return '';
  }

  return [
    caseItem.judiciary_type,
    caseItem.judiciary_unit,
  ]
    .filter(Boolean)
    .join(' · ');
};

// ======================================================
// FILE NAME HELPER
// ======================================================

const createCalendarFileName = (
  title
) => {
  const normalized =
    String(
      title ||
        'toplanti'
    )
      .trim()
      .toLocaleLowerCase(
        'tr-TR'
      )
      .replace(
        /ı/g,
        'i'
      )
      .replace(
        /ğ/g,
        'g'
      )
      .replace(
        /ü/g,
        'u'
      )
      .replace(
        /ş/g,
        's'
      )
      .replace(
        /ö/g,
        'o'
      )
      .replace(
        /ç/g,
        'c'
      )
      .replace(
        /[^a-z0-9]+/g,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        ''
      );

  return `derkenar-toplanti-${
    normalized ||
    'toplanti'
  }.ics`;
};

// ======================================================
// COMPONENT
// ======================================================

const MeetingDetail = () => {
  const {
    id,
  } =
    useParams();

  const {
    user,
  } = useAuth();

  const canEdit =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_MEETINGS
    );

  // ======================================================
  // QUERY
  // ======================================================

  const {
    data,
    isLoading,
    error,
  } =
    useQuery({
      queryKey: [
        'meeting',
        id,
      ],

      queryFn:
        () =>
          meetingApi.getOne(
            id
          ),

      enabled:
        Boolean(id),
    });

  // ======================================================
  // STATUS MUTATION
  // ======================================================

  const updateMeetingStatus =
    useUpdateMeetingStatus();

  const updateStatus = {
    ...updateMeetingStatus,

    mutate: (
      status
    ) =>
      updateMeetingStatus.mutate({
        id,
        status,
      }),
  };

  // ======================================================
  // CALENDAR MUTATION
  // ======================================================

  const downloadCalendar =
    useMutation({
      mutationFn:
        () =>
          meetingApi.downloadCalendar(
            id
          ),

      onSuccess:
        (
          response
        ) => {
          try {
            const rawData =
              response?.data;

            const blob =
              rawData instanceof
              Blob
                ? rawData
                : new Blob(
                    [
                      rawData,
                    ],
                    {
                      type:
                        'text/calendar;charset=utf-8',
                    }
                  );

            const url =
              window.URL.createObjectURL(
                blob
              );

            const link =
              document.createElement(
                'a'
              );

            link.href =
              url;

            link.download =
              createCalendarFileName(
                meeting?.title
              );

            document.body.appendChild(
              link
            );

            link.click();

            link.remove();

            window.setTimeout(
              () => {
                window.URL.revokeObjectURL(
                  url
                );
              },
              1000
            );

            toast.success(
              'Takvim dosyası indirildi'
            );
          } catch (
            error
          ) {
            console.error(
              'Meeting calendar file error:',
              error
            );

            toast.error(
              'Takvim dosyası açılamadı'
            );
          }
        },

      onError:
        async (
          error
        ) => {
          /*
           * responseType blob olduğu için backend hata
           * mesajı da Blob olarak gelebilir.
           */
          let message =
            'Takvim dosyası indirilemedi';

          try {
            const errorData =
              error
                ?.response
                ?.data;

            if (
              errorData instanceof
              Blob
            ) {
              const text =
                await errorData.text();

              try {
                const parsed =
                  JSON.parse(
                    text
                  );

                message =
                  parsed
                    ?.message ||
                  message;
              } catch {
                if (
                  text?.trim()
                ) {
                  message =
                    text.trim();
                }
              }
            } else if (
              errorData
                ?.message
            ) {
              message =
                errorData.message;
            }
          } catch {
            // Varsayılan mesaj kullanılır.
          }

          toast.error(
            message
          );
        },
    });

  // ======================================================
  // DATA
  // ======================================================

  const meeting =
    data?.data?.data;

  const meetingType =
    getMeetingTypeInfo(
      meeting
        ?.meeting_type
    );

  const MeetingTypeIcon =
    meetingType.icon;

  const internalParticipants =
    getInternalParticipants(
      meeting
    );

  // ======================================================
  // LOADING
  // ======================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Toplantı bilgileri yükleniyor...
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
    !meeting
  ) {
    return (
      <div className="py-12 text-center">

        <div className="mb-4 flex justify-center">
          <UsersRound className="h-12 w-12 text-gray-300 dark:text-slate-600" />
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Toplantı Bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {error
            ?.response
            ?.data
            ?.message ||
            error
              ?.message ||
            'Toplantı bilgileri yüklenemedi'}
        </p>

        <Link
          to="/meetings"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Toplantılara Dön
        </Link>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <Link
            to="/meetings"
            className="
              inline-flex
              items-center
              gap-1.5
              text-xs
              font-medium
              text-gray-500
              transition
              hover:text-blue-600
              dark:text-slate-500
              dark:hover:text-blue-400
            "
          >
            <ArrowLeft className="h-3.5 w-3.5" />

            Toplantılar
          </Link>

          <h1
            className="
              mt-3
              text-2xl
              font-semibold
              tracking-[-0.035em]
              text-gray-900
              dark:text-white
            "
          >
            {meeting.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">

            <Badge
              variant={getStatusVariant(
                meeting.status
              )}
            >
              {getStatusLabel(
                meeting.status
              )}
            </Badge>

            <Badge variant="default">

              <span className="inline-flex items-center gap-1">

                <MeetingTypeIcon className="h-3.5 w-3.5" />

                {meetingType.label}

              </span>

            </Badge>

          </div>

        </div>

        {/* ACTIONS */}

        <div className="flex flex-wrap items-center gap-2">

          {canEdit && (
            <select
              value={
                meeting.status
              }
              onChange={(
                event
              ) =>
                updateStatus.mutate(
                  event.target
                    .value
                )
              }
              disabled={
                updateStatus
                  .isPending
              }
              className="
                rounded-lg
                border
                border-gray-200
                bg-white
                px-3
                py-2
                text-sm
                font-medium
                text-gray-700
                outline-none
                transition
                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-500/10
                disabled:cursor-not-allowed
                disabled:opacity-60
                dark:border-white/[0.08]
                dark:bg-white/[0.035]
                dark:text-slate-200
              "
            >

              {STATUS_OPTIONS.map(
                (
                  status
                ) => (
                  <option
                    key={
                      status.value
                    }
                    value={
                      status.value
                    }
                  >
                    {
                      status.label
                    }
                  </option>
                )
              )}

            </select>
          )}

          {/* TAKVİME EKLE */}

          {meeting.start_date && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCalendar.mutate()
              }
              loading={
                downloadCalendar
                  .isPending
              }
              disabled={
                downloadCalendar
                  .isPending
              }
            >
              <CalendarDays className="mr-2 h-4 w-4" />

              Takvime Ekle
            </Button>
          )}

          {canEdit && (
            <Link
              to={`/meetings/${meeting.id}/edit`}
            >

              <Button
                variant="outline"
                size="sm"
              >
                <Edit2 className="mr-2 h-4 w-4" />

                Düzenle
              </Button>

            </Link>
          )}

        </div>

      </div>

      {/* ==================================================
          SUMMARY
      ================================================== */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

        {/* START */}

        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.06]
            dark:bg-white/[0.025]
          "
        >

          <div className="flex items-start gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">

              <CalendarDays className="h-4 w-4" />

            </div>

            <div>

              <p className="text-xs text-gray-400">
                Başlangıç
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(
                  meeting.start_date
                )}
              </p>

            </div>

          </div>

        </div>

        {/* END */}

        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.06]
            dark:bg-white/[0.025]
          "
        >

          <div className="flex items-start gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/[0.08] dark:text-violet-400">

              <Clock3 className="h-4 w-4" />

            </div>

            <div>

              <p className="text-xs text-gray-400">
                Bitiş
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {meeting.end_date
                  ? formatDate(
                      meeting.end_date
                    )
                  : 'Belirtilmemiş'}
              </p>

            </div>

          </div>

        </div>

        {/* LOCATION */}

        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.06]
            dark:bg-white/[0.025]
          "
        >

          <div className="flex items-start gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400">

              <MapPin className="h-4 w-4" />

            </div>

            <div className="min-w-0">

              <p className="text-xs text-gray-400">
                Yer
              </p>

              <p className="mt-1 truncate text-sm font-medium text-gray-900 dark:text-white">
                {meeting.location ||
                  'Belirtilmemiş'}
              </p>

            </div>

          </div>

        </div>

        {/* INTERNAL PARTICIPANTS */}

        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.06]
            dark:bg-white/[0.025]
          "
        >

          <div className="flex items-start gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400">

              <UsersRound className="h-4 w-4" />

            </div>

            <div className="min-w-0">

              <p className="text-xs text-gray-400">
                Toplantı Katılımcıları
              </p>

              <p className="mt-1 truncate text-sm font-medium text-gray-900 dark:text-white">
                {getParticipantSummary(
                  internalParticipants
                )}
              </p>

              {internalParticipants.length >
                1 && (
                <p className="mt-1 truncate text-xs text-gray-400 dark:text-slate-500">
                  {internalParticipants
                    .map(
                      (
                        person
                      ) =>
                        getPersonName(
                          person,
                          'Kullanıcı'
                        )
                    )
                    .join(', ')}
                </p>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* ==================================================
          MAIN GRID
      ================================================== */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ==================================================
            INFORMATION
        ================================================== */}

        <Card
          className="
            overflow-hidden
            border
            border-gray-200
            shadow-sm
            dark:border-white/[0.06]
            lg:col-span-2
          "
        >

          <Card.Header>

            <h2 className="font-semibold text-gray-900 dark:text-white">
              Toplantı Bilgileri
            </h2>

          </Card.Header>

          <Card.Body className="space-y-6">

            {/* DESCRIPTION */}

            {meeting.description && (
              <div>

                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Açıklama
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-slate-300">
                  {
                    meeting.description
                  }
                </p>

              </div>
            )}

            {/* TYPE / PEOPLE */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div
                className="
                  rounded-xl
                  border
                  border-gray-100
                  bg-gray-50/60
                  p-4
                  dark:border-white/[0.05]
                  dark:bg-white/[0.02]
                "
              >

                <div className="flex items-center gap-2 text-xs text-gray-400">

                  <MeetingTypeIcon className="h-4 w-4" />

                  Toplantı Türü

                </div>

                <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {
                    meetingType.label
                  }
                </p>

              </div>

              <div
                className="
                  rounded-xl
                  border
                  border-gray-100
                  bg-gray-50/60
                  p-4
                  dark:border-white/[0.05]
                  dark:bg-white/[0.02]
                "
              >

                <div className="flex items-center gap-2 text-xs text-gray-400">

                  <UserRound className="h-4 w-4" />

                  Oluşturan

                </div>

                <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {getPersonName(
                    meeting.creator,
                    'Bilinmiyor'
                  )}
                </p>

              </div>

            </div>

            {/* ONLINE LINK */}

            {meeting.meeting_link && (
              <div className="border-t border-gray-100 pt-5 dark:border-white/[0.05]">

                <div className="mb-2 flex items-center gap-2">

                  <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />

                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Çevrim İçi Toplantı
                  </p>

                </div>

                <a
                  href={
                    meeting.meeting_link
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    inline-flex
                    max-w-full
                    items-center
                    gap-2
                    rounded-lg
                    bg-blue-50
                    px-3
                    py-2
                    text-sm
                    font-medium
                    text-blue-700
                    transition
                    hover:bg-blue-100
                    dark:bg-blue-500/[0.08]
                    dark:text-blue-300
                    dark:hover:bg-blue-500/[0.12]
                  "
                >

                  <span className="truncate">
                    Toplantıya Git
                  </span>

                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />

                </a>

              </div>
            )}

            {/* NOTES */}

            {meeting.notes && (
              <div className="border-t border-gray-100 pt-5 dark:border-white/[0.05]">

                <div className="mb-2 flex items-center gap-2">

                  <MessageSquareText className="h-4 w-4 text-blue-600 dark:text-blue-400" />

                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Notlar
                  </p>

                </div>

                <div
                  className="
                    rounded-xl
                    bg-gray-50
                    p-4
                    text-sm
                    leading-7
                    text-gray-700
                    dark:bg-white/[0.025]
                    dark:text-slate-300
                  "
                >
                  <p className="whitespace-pre-wrap">
                    {
                      meeting.notes
                    }
                  </p>
                </div>

              </div>
            )}

          </Card.Body>

        </Card>

        {/* ==================================================
            RELATED
        ================================================== */}

        <Card
          className="
            overflow-hidden
            border
            border-gray-200
            shadow-sm
            dark:border-white/[0.06]
          "
        >

          <Card.Header>

            <div className="flex items-center gap-2">

              <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                İlişkili Kayıtlar
              </h2>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            {/* CASE */}

            <div>

              <p className="text-xs text-gray-400">
                Dava
              </p>

              {meeting.case ? (
                <Link
                  to={`/cases/${meeting.case.id}`}
                  className="
                    mt-1
                    block
                    text-sm
                    font-medium
                    text-blue-600
                    hover:underline
                    dark:text-blue-400
                  "
                >
                  {getCaseDisplayName(
                    meeting.case
                  )}

                  {getCaseSecondaryInfo(
                    meeting.case
                  ) && (
                    <span className="mt-1 block text-xs font-normal text-gray-400 no-underline dark:text-slate-500">
                      {getCaseSecondaryInfo(
                        meeting.case
                      )}
                    </span>
                  )}
                </Link>
              ) : (
                <p className="mt-1 text-sm text-gray-400">
                  İlişkilendirilmemiş
                </p>
              )}

            </div>

            <div className="border-t border-gray-100 dark:border-white/[0.05]" />

            {/* CLIENT */}

            <div>

              <p className="text-xs text-gray-400">
                Müvekkil
              </p>

              {meeting.client ? (
                <Link
                  to={`/clients/${meeting.client.id}`}
                  className="
                    mt-1
                    block
                    text-sm
                    font-medium
                    text-blue-600
                    hover:underline
                    dark:text-blue-400
                  "
                >
                  {meeting.client.name}

                  {meeting.client
                    .company_name &&
                    ` (${meeting.client.company_name})`}
                </Link>
              ) : (
                <p className="mt-1 text-sm text-gray-400">
                  İlişkilendirilmemiş
                </p>
              )}

            </div>

            <div className="border-t border-gray-100 dark:border-white/[0.05]" />

            {/* CONSULTATION */}

            <div>

              <p className="text-xs text-gray-400">
                Danışmanlık
              </p>

              {normalizeId(
                meeting.consultation?.id ??
                meeting.consultation_id
              ) ? (
                <Link
                  to={`/consultations/${normalizeId(
                    meeting.consultation?.id ??
                    meeting.consultation_id
                  )}`}
                  className="
                    mt-1
                    block
                    text-sm
                    font-medium
                    text-blue-600
                    hover:underline
                    dark:text-blue-400
                  "
                >
                  {meeting.consultation
                    ? getConsultationDisplayName(
                        meeting.consultation
                      )
                    : 'Danışmanlığı Görüntüle'}
                </Link>
              ) : (
                <p className="mt-1 text-sm text-gray-400">
                  İlişkilendirilmemiş
                </p>
              )}

            </div>

            {/* INTERNAL PARTICIPANTS */}

            {internalParticipants.length >
              0 && (
              <>
                <div className="border-t border-gray-100 dark:border-white/[0.05]" />

                <div>

                  <div className="flex items-center gap-2">

                    <UsersRound className="h-4 w-4 text-blue-500 dark:text-blue-400" />

                    <p className="text-xs text-gray-400">
                      Derkenar Katılımcıları
                    </p>

                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">

                    {internalParticipants.map(
                      (
                        person
                      ) => (
                        <Badge
                          key={
                            person?.id ||
                            getPersonName(
                              person
                            )
                          }
                          variant="primary"
                        >
                          {getPersonName(
                            person,
                            'Kullanıcı'
                          )}
                        </Badge>
                      )
                    )}

                  </div>

                </div>
              </>
            )}

            {/* EXTERNAL ATTENDEES */}

            {meeting.attendees &&
              meeting
                .attendees
                .length >
                0 && (
                <>
                  <div className="border-t border-gray-100 dark:border-white/[0.05]" />

                  <div>

                    <div className="flex items-center gap-2">

                      <UsersRound className="h-4 w-4 text-gray-400" />

                      <p className="text-xs text-gray-400">
                        Harici Katılımcılar
                      </p>

                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">

                      {meeting.attendees.map(
                        (
                          attendee,
                          index
                        ) => {
                          const name =
                            typeof attendee ===
                            'string'
                              ? attendee
                              : attendee
                                  ?.name;

                          const role =
                            typeof attendee ===
                            'object'
                              ? attendee
                                  ?.role
                              : null;

                          return (
                            <Badge
                              key={`${name}-${index}`}
                              variant="default"
                            >
                              {name ||
                                'Katılımcı'}

                              {role &&
                                ` · ${role}`}
                            </Badge>
                          );
                        }
                      )}

                    </div>

                  </div>
                </>
              )}

          </Card.Body>

        </Card>

      </div>

    </div>
  );
};

export default MeetingDetail;