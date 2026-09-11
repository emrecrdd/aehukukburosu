import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import eventApi from '../../features/events/event.api.js';

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
  Building2,
  Calendar,
  CheckSquare,
  Clock,
  DollarSign,
  Edit2,
  Eye,
  FileText,
  Gavel,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Microscope,
  Phone,
  Scale,
  Target,
  User,
  UserRound,
  Users,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const ROLE_OPTIONS = [
  {
    value: 'avukat',
    label: 'Avukat',
  },
  {
    value: 'karsi_taraf_avukati',
    label: 'Karşı Taraf Avukatı',
  },
  {
    value: 'müvekkil',
    label: 'Müvekkil',
  },
  {
    value: 'davaci',
    label: 'Davacı',
  },
  {
    value: 'davali',
    label: 'Davalı',
  },
  {
    value: 'tanik',
    label: 'Tanık',
  },
  {
    value: 'bilirkişi',
    label: 'Bilirkişi',
  },
  {
    value: 'uzman',
    label: 'Uzman',
  },
  {
    value: 'tercüman',
    label: 'Tercüman',
  },
  {
    value: 'gözlemci',
    label: 'Gözlemci',
  },
  {
    value: 'diger',
    label: 'Diğer',
  },
];

// ======================================================
// LABEL HELPERS
// ======================================================

const getCaseStatusLabel = (
  status
) => {
  const labels = {
    active: 'Devam Ediyor',
    preparation: 'Hazırlık',
    hearing: 'Duruşmada',
    appeal: 'İstinaf',
    cassation: 'Temyiz',
    concluded: 'Sonuçlandı',
    archived: 'Arşivlendi',
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
  const variants = {
    active: 'success',
    preparation: 'warning',
    hearing: 'info',
    appeal: 'warning',
    cassation: 'default',
    concluded: 'default',
    archived: 'danger',
  };

  return (
    variants[status] ||
    'default'
  );
};

const getStatusLabel = (
  status
) => {
  const labels = {
    scheduled: 'Planlandı',
    ongoing: 'Devam Ediyor',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
  };

  return (
    labels[status] ||
    status ||
    '-'
  );
};

const getStatusVariant = (
  status
) => {
  const variants = {
    scheduled: 'info',
    ongoing: 'warning',
    completed: 'success',
    cancelled: 'danger',
  };

  return (
    variants[status] ||
    'default'
  );
};

const getEventTypeLabel = (
  type
) => {
  const labels = {
    hearing: 'Duruşma',
    meeting: 'Toplantı',
    deadline: 'Son Tarih',
    reminder: 'Hatırlatma',
    other: 'Diğer',
  };

  return (
    labels[type] ||
    type ||
    '-'
  );
};

const getHearingTypeLabel = (
  type
) => {
  const labels = {
    preliminary: 'Ön İnceleme',
    investigation: 'Tahkikat',
    expert_examination:
      'Bilirkişi İncelemesi',
    witness_hearing:
      'Tanık Dinlenmesi',
    final_decision:
      'Karar Duruşması',
    other: 'Diğer',
  };

  return (
    labels[type] ||
    type ||
    '-'
  );
};

const getExpenseStatusLabel = (
  status
) => {
  const labels = {
    paid: 'Ödendi',
    pending: 'Bekliyor',
    not_applicable: 'Yok',
  };

  return (
    labels[status] ||
    status ||
    '-'
  );
};

const getExpenseStatusVariant = (
  status
) => {
  const variants = {
    paid: 'success',
    pending: 'warning',
    not_applicable: 'default',
  };

  return (
    variants[status] ||
    'default'
  );
};

// ======================================================
// DATE HELPERS
// ======================================================

const parseDate = (
  value
) => {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
};

const formatDate = (
  value
) => {
  const date =
    parseDate(value);

  if (!date) {
    return '-';
  }

  return new Intl.DateTimeFormat(
    'tr-TR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone:
        'Europe/Istanbul',
    }
  ).format(date);
};

const formatTime = (
  value
) => {
  const date =
    parseDate(value);

  if (!date) {
    return '-';
  }

  return new Intl.DateTimeFormat(
    'tr-TR',
    {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone:
        'Europe/Istanbul',
    }
  ).format(date);
};

const formatDateTime = (
  value
) => {
  const date =
    parseDate(value);

  if (!date) {
    return '-';
  }

  return new Intl.DateTimeFormat(
    'tr-TR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone:
        'Europe/Istanbul',
    }
  ).format(date);
};

// ======================================================
// RELATION HELPERS
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

const getPersonName = (
  person
) => {
  if (
    !person ||
    typeof person !==
      'object'
  ) {
    return '';
  }

  const fullName = [
    person.first_name,
    person.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    fullName ||
    String(
      person.name ||
      ''
    ).trim()
  );
};

// ======================================================
// CALENDAR FILE HELPER
// ======================================================

const createCalendarFileName = ({
  title,
  eventType,
}) => {
  const normalized =
    String(
      title ||
        'etkinlik'
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

  const prefix =
    eventType ===
    'hearing'
      ? 'durusma'
      : 'etkinlik';

  return `derkenar-${prefix}-${
    normalized ||
    prefix
  }.ics`;
};

// ======================================================
// ATTENDEE HELPERS
// ======================================================

const getRoleIcon = (
  role
) => {
  switch (role) {
    case 'avukat':
    case 'karsi_taraf_avukati':
      return (
        <Scale className="h-4 w-4" />
      );

    case 'tanik':
      return (
        <MessageCircle className="h-4 w-4" />
      );

    case 'bilirkişi':
      return (
        <Microscope className="h-4 w-4" />
      );

    case 'uzman':
      return (
        <Target className="h-4 w-4" />
      );

    case 'tercüman':
      return (
        <Languages className="h-4 w-4" />
      );

    case 'gözlemci':
      return (
        <Eye className="h-4 w-4" />
      );

    default:
      return (
        <UserRound className="h-4 w-4" />
      );
  }
};

const getRoleLabel = (
  role
) => {
  return (
    ROLE_OPTIONS.find(
      (
        item
      ) =>
        item.value ===
        role
    )?.label ||
    role ||
    'Katılımcı'
  );
};

const getRoleColor = (
  role
) => {
  const colors = {
    avukat:
      'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300',

    karsi_taraf_avukati:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300',

    müvekkil:
      'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',

    davaci:
      'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300',

    davali:
      'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300',

    tanik:
      'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',

    bilirkişi:
      'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300',

    uzman:
      'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-300',

    tercüman:
      'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-900/20 dark:text-pink-300',
  };

  return (
    colors[role] ||
    'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
  );
};

// ======================================================
// COMPONENT
// ======================================================

const EventDetail = () => {
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
      PERMISSION_KEYS.EDIT_EVENTS
    );

  // ====================================================
  // QUERY
  // ====================================================

  const {
    data,
    isLoading,
    error,
  } =
    useQuery({
      queryKey: [
        'event',
        id,
      ],

      queryFn: () =>
        eventApi.getOne(
          id
        ),

      enabled:
        Boolean(id),

      staleTime:
        2 * 60 * 1000,
    });

  const event =
    data?.data?.data ||
    null;

  // ====================================================
  // CALENDAR MUTATION
  // ====================================================

  const downloadCalendar =
    useMutation({
      mutationFn:
        () =>
          eventApi.downloadCalendar(
            id
          ),

      onSuccess:
        (
          response
        ) => {
          try {
            const rawData =
              response?.data;

            if (
              rawData === null ||
              rawData === undefined
            ) {
              throw new Error(
                'Takvim dosyası boş döndü'
              );
            }

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
              window.URL
                .createObjectURL(
                  blob
                );

            const link =
              document
                .createElement(
                  'a'
                );

            link.href =
              url;

            link.download =
              createCalendarFileName({
                title:
                  event?.title,

                eventType:
                  event
                    ?.event_type,
              });

            document.body
              .appendChild(
                link
              );

            link.click();

            link.remove();

            window.setTimeout(
              () => {
                window.URL
                  .revokeObjectURL(
                    url
                  );
              },
              1000
            );

            toast.success(
              event?.event_type ===
                'hearing'
                ? 'Duruşma takvim dosyası indirildi'
                : 'Etkinlik takvim dosyası indirildi'
            );
          } catch (
            fileError
          ) {
            console.error(
              'Event calendar file error:',
              fileError
            );

            toast.error(
              'Takvim dosyası açılamadı'
            );
          }
        },

      onError:
        async (
          mutationError
        ) => {
          let message =
            'Takvim dosyası indirilemedi';

          try {
            const errorData =
              mutationError
                ?.response
                ?.data;

            /*
             * responseType blob olduğu için backend
             * JSON hatası da Blob olarak gelebilir.
             */
            if (
              errorData instanceof
              Blob
            ) {
              const text =
                await errorData
                  .text();

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
                errorData
                  .message;
            }
          } catch {
            /*
             * Varsayılan hata mesajı kullanılır.
             */
          }

          toast.error(
            message
          );
        },
    });

  /*
   * Backend artık Case + clients ilişkisini
   * event detail içinde döndürüyor.
   *
   * Böylece ikinci case API çağrısına gerek yok.
   */
  const caseItem =
    event?.case ||
    null;

  const caseId =
    normalizeId(
      event?.case_id ??
      caseItem?.id
    );

  const assignedPerson =
    event?.assignedTo ||
    (
      event?.assigned_to &&
      typeof event.assigned_to ===
        'object'
        ? event.assigned_to
        : null
    );

  const assignedPersonName =
    getPersonName(
      assignedPerson
    );

  const clients =
    Array.isArray(
      caseItem?.clients
    )
      ? caseItem.clients
      : [];

  const attendees =
    Array.isArray(
      event?.attendees
    )
      ? event.attendees
      : [];

  const todoItems =
    Array.isArray(
      event?.todo_items
    )
      ? event.todo_items
      : [];

  const attendeeCount =
    attendees.length +
    (
      assignedPerson
        ? 1
        : 0
    ) +
    (
      event?.opposing_counsel
        ? 1
        : 0
    );

  // ====================================================
  // LOADING
  // ====================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-4">

        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />

        <p className="text-sm text-gray-500">
          Duruşma bilgileri yükleniyor...
        </p>

      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (
    error ||
    !event
  ) {
    return (
      <div className="py-20 text-center">

        <Gavel className="mx-auto h-12 w-12 text-gray-300" />

        <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
          Duruşma bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {error
            ?.response
            ?.data
            ?.message ||
            'Kayıt kaldırılmış veya erişilemiyor olabilir.'}
        </p>

        <Link
          to="/calendar"
          className="mt-5 inline-block"
        >
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />

            Takvime Dön
          </Button>
        </Link>

      </div>
    );
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

        <div>

          <Link
            to={
              caseId
                ? `/cases/${caseId}`
                : '/calendar'
            }
            className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />

            {caseId
              ? 'Davaya Dön'
              : 'Takvime Dön'}
          </Link>

          <div className="mt-4 flex items-start gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">

              <Gavel className="h-6 w-6 text-blue-600" />

            </div>

            <div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {event.title ||
                  'Duruşma'}
              </h1>

              <div className="mt-2 flex flex-wrap gap-2">

                <Badge
                  variant={
                    getStatusVariant(
                      event.status
                    )
                  }
                >
                  {getStatusLabel(
                    event.status
                  )}
                </Badge>

                <Badge variant="default">
                  {getEventTypeLabel(
                    event.event_type
                  )}
                </Badge>

                {event.event_type ===
                  'hearing' &&
                  event.hearing_type && (
                    <Badge variant="info">
                      {getHearingTypeLabel(
                        event.hearing_type
                      )}
                    </Badge>
                  )}

                {event.is_all_day && (
                  <Badge variant="default">
                    Tüm Gün
                  </Badge>
                )}

              </div>

            </div>

          </div>

        </div>

        {/* ACTIONS */}

        <div className="flex flex-wrap items-center gap-2">

          {event.start_date && (
            <Button
              variant="outline"
              onClick={() =>
                downloadCalendar
                  .mutate()
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
              <Calendar className="mr-2 h-4 w-4" />

              Takvime Ekle
            </Button>
          )}

          {canEdit && (
            <Link
              to={`/events/${event.id}/edit`}
            >
              <Button variant="outline">
                <Edit2 className="mr-2 h-4 w-4" />

                Düzenle
              </Button>
            </Link>
          )}

        </div>

      </div>

      {/* ==================================================
          DATE SUMMARY
      ================================================== */}

      <div className="grid gap-4 md:grid-cols-2">

        <Card>

          <Card.Body>

            <div className="flex items-start gap-3">

              <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-900/20">

                <Calendar className="h-5 w-5 text-blue-600" />

              </div>

              <div>

                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Başlangıç
                </p>

                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {formatDate(
                    event.start_date
                  )}
                </p>

                {!event.is_all_day && (
                  <p className="text-sm text-gray-500">
                    {formatTime(
                      event.start_date
                    )}
                  </p>
                )}

              </div>

            </div>

          </Card.Body>

        </Card>

        <Card>

          <Card.Body>

            <div className="flex items-start gap-3">

              <div className="rounded-xl bg-green-50 p-3 dark:bg-green-900/20">

                <Clock className="h-5 w-5 text-green-600" />

              </div>

              <div>

                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Bitiş
                </p>

                {event.end_date ? (
                  <>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                      {formatDate(
                        event.end_date
                      )}
                    </p>

                    {!event.is_all_day && (
                      <p className="text-sm text-gray-500">
                        {formatTime(
                          event.end_date
                        )}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-gray-400">
                    Bitiş zamanı belirtilmemiş
                  </p>
                )}

              </div>

            </div>

          </Card.Body>

        </Card>

      </div>

      {/* ==================================================
          DESCRIPTION
      ================================================== */}

      {event.description && (
        <Card>

          <Card.Header>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Açıklama
            </h2>
          </Card.Header>

          <Card.Body>
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
              {event.description}
            </p>
          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          CASE
      ================================================== */}

      {caseItem && (
        <Card>

          <Card.Header>

            <div className="flex flex-wrap items-center justify-between gap-3">

              <div className="flex items-center gap-2">

                <Scale className="h-5 w-5 text-blue-600" />

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  İlişkili Dava
                </h2>

              </div>

              <Badge
                variant={
                  getCaseStatusVariant(
                    caseItem.status
                  )
                }
              >
                {getCaseStatusLabel(
                  caseItem.status
                )}
              </Badge>

            </div>

          </Card.Header>

          <Card.Body>

            <Link
              to={`/cases/${normalizeId(
                caseItem.id
              )}`}
              className="text-lg font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              {caseItem.title}
            </Link>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <div>

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Dosya No
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {caseItem.case_number ||
                    '-'}
                </p>

              </div>

              <div>

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Yargı Türü
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {caseItem.judiciary_type ||
                    '-'}
                </p>

              </div>

              <div>

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Yargı Birimi
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {caseItem.judiciary_unit ||
                    '-'}
                </p>

              </div>

              <div>

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Mahkeme
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {caseItem.court_name ||
                    '-'}
                </p>

              </div>

            </div>

            {/* MULTI CLIENT */}

            <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-700">

              <p className="text-xs uppercase tracking-wide text-gray-400">
                Müvekkiller
              </p>

              {clients.length === 0 ? (
                <p className="mt-2 text-sm text-gray-400">
                  Davaya bağlı müvekkil bulunmuyor.
                </p>
              ) : (
                <div className="mt-3 grid gap-3 md:grid-cols-2">

                  {clients.map(
                    (
                      client
                    ) => (
                      <div
                        key={
                          client.id
                        }
                        className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                      >

                        <Link
                          to={`/clients/${normalizeId(
                            client.id
                          )}`}
                          className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {client.name}
                        </Link>

                        <div className="mt-3 flex flex-wrap gap-2">

                          {client.phone && (
                            <a
                              href={`tel:${client.phone}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                            >
                              <Phone className="h-3.5 w-3.5" />

                              {client.phone}
                            </a>
                          )}

                          {client.email && (
                            <a
                              href={`mailto:${client.email}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                            >
                              <Mail className="h-3.5 w-3.5" />

                              E-posta
                            </a>
                          )}

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          LOCATION
      ================================================== */}

      {(event.location ||
        event.court_room ||
        event.judge_name) && (
        <Card>

          <Card.Header>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Duruşma Yeri
            </h2>
          </Card.Header>

          <Card.Body>

            <div className="grid gap-4 md:grid-cols-3">

              <div className="flex items-start gap-3">

                <MapPin className="mt-0.5 h-5 w-5 text-gray-400" />

                <div>

                  <p className="text-xs text-gray-400">
                    Yer / Mahkeme
                  </p>

                  <p className="mt-1 font-medium text-gray-900 dark:text-white">
                    {event.location ||
                      '-'}
                  </p>

                </div>

              </div>

              <div className="flex items-start gap-3">

                <Building2 className="mt-0.5 h-5 w-5 text-gray-400" />

                <div>

                  <p className="text-xs text-gray-400">
                    Salon
                  </p>

                  <p className="mt-1 font-medium text-gray-900 dark:text-white">
                    {event.court_room ||
                      '-'}
                  </p>

                </div>

              </div>

              <div className="flex items-start gap-3">

                <User className="mt-0.5 h-5 w-5 text-gray-400" />

                <div>

                  <p className="text-xs text-gray-400">
                    Hakim
                  </p>

                  <p className="mt-1 font-medium text-gray-900 dark:text-white">
                    {event.judge_name ||
                      '-'}
                  </p>

                </div>

              </div>

            </div>

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          ATTENDEES
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-2">

              <Users className="h-5 w-5 text-purple-600" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Katılımcılar
              </h2>

            </div>

            <Badge variant="default">
              {attendeeCount} kişi
            </Badge>

          </div>

        </Card.Header>

        <Card.Body>

          {attendeeCount ===
          0 ? (
            <p className="py-5 text-center text-sm text-gray-400">
              Henüz katılımcı eklenmemiş.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">

              {assignedPerson && (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-purple-600 dark:bg-gray-800 dark:text-purple-300">
                      <Scale className="h-5 w-5" />
                    </div>

                    <div>

                      <p className="font-semibold text-gray-900 dark:text-white">
                        {assignedPersonName ||
                          'Atanan Avukat'}
                      </p>

                      <p className="text-sm text-purple-600 dark:text-purple-300">
                        Atanan Avukat
                      </p>

                    </div>

                  </div>

                </div>
              )}

              {event.opposing_counsel && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-red-600 dark:bg-gray-800 dark:text-red-300">
                      <Scale className="h-5 w-5" />
                    </div>

                    <div>

                      <p className="font-semibold text-gray-900 dark:text-white">
                        {event.opposing_counsel}
                      </p>

                      <p className="text-sm text-red-600 dark:text-red-300">
                        Karşı Taraf Avukatı
                      </p>

                    </div>

                  </div>

                </div>
              )}

              {attendees.map(
                (
                  attendee,
                  index
                ) => {
                  const role =
                    attendee.role ||
                    'diger';

                  return (
                    <div
                      key={
                        attendee.id ||
                        `${attendee.name}-${index}`
                      }
                      className={`rounded-xl border p-4 ${getRoleColor(
                        role
                      )}`}
                    >

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 dark:bg-gray-800/60">
                          {getRoleIcon(
                            role
                          )}
                        </div>

                        <div>

                          <p className="font-semibold text-gray-900 dark:text-white">
                            {attendee.name ||
                              'İsimsiz Katılımcı'}
                          </p>

                          <p className="text-sm">
                            {getRoleLabel(
                              role
                            )}
                          </p>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </Card.Body>

      </Card>

      {/* ==================================================
          RESULT
      ================================================== */}

      {event.last_hearing_result && (
        <Card>

          <Card.Header>

            <div className="flex items-center gap-2">

              <FileText className="h-5 w-5 text-orange-500" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Son Duruşma Sonucu
              </h2>

            </div>

          </Card.Header>

          <Card.Body>

            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
              {event.last_hearing_result}
            </p>

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          TODO
      ================================================== */}

      {todoItems.length >
        0 && (
        <Card>

          <Card.Header>

            <div className="flex items-center gap-2">

              <CheckSquare className="h-5 w-5 text-blue-600" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Yapılacak İşler
              </h2>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="space-y-2">

              {todoItems.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={
                      item.id ||
                      index
                    }
                    className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                  >

                    <input
                      type="checkbox"
                      checked={
                        Boolean(
                          item.done
                        )
                      }
                      readOnly
                      disabled
                      className="h-4 w-4 rounded border-gray-300"
                    />

                    <span
                      className={
                        item.done
                          ? 'text-gray-400 line-through'
                          : 'text-gray-700 dark:text-gray-300'
                      }
                    >
                      {item.text}
                    </span>

                  </div>
                )
              )}

            </div>

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          OPERATION SUMMARY
      ================================================== */}

      <Card>

        <Card.Body>

          <div className="grid gap-5 sm:grid-cols-2">

            <div className="flex items-start gap-3">

              <DollarSign className="mt-0.5 h-5 w-5 text-green-500" />

              <div>

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Masraf / Harç
                </p>

                <div className="mt-2">

                  <Badge
                    variant={
                      getExpenseStatusVariant(
                        event.expense_status
                      )
                    }
                  >
                    {getExpenseStatusLabel(
                      event.expense_status
                    )}
                  </Badge>

                </div>

              </div>

            </div>

            <div className="flex items-start gap-3">

              <User className="mt-0.5 h-5 w-5 text-gray-400" />

              <div>

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Kaydı Oluşturan
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {getPersonName(
                    event.creator
                  ) ||
                    '-'}
                </p>

              </div>

            </div>

          </div>

          <div className="mt-5 border-t border-gray-100 pt-4 text-xs text-gray-400 dark:border-gray-700">

            Oluşturulma:{' '}
            {formatDateTime(
              event.created_at
            )}

          </div>

        </Card.Body>

      </Card>

    </div>
  );
};

export default EventDetail;