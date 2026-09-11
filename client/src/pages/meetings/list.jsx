import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import meetingApi from '../../features/meetings/meeting.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';

import Loader from '../../components/shared/Loader.jsx';
import Error from '../../components/shared/Error.jsx';
import Empty from '../../components/shared/Empty.jsx';

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  MapPin,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';

import {
  useDebounce,
} from '../../hooks/useDebounce.js';

// ======================================================
// HELPERS
// ======================================================

const getStatusVariant = (
  status
) => {
  const variants = {
    scheduled:
      'warning',

    ongoing:
      'info',

    completed:
      'success',

    cancelled:
      'danger',
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

const formatDate = (
  date
) => {
  if (!date) {
    return '-';
  }

  try {
    const parsed =
      new Date(
        date
      );

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

        day: '2-digit',
        month: '2-digit',
        year: 'numeric',

        hour: '2-digit',
        minute: '2-digit',

        hour12: false,
      }
    ).format(
      parsed
    );
  } catch {
    return '-';
  }
};

const getPersonName = (
  person,
  fallback = 'Kullanıcı'
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
   * Eski toplantılar için legacy fallback.
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

const getParticipantNames = (
  meeting
) => {
  return getInternalParticipants(
    meeting
  )
    .map(
      (person) =>
        getPersonName(
          person
        )
    )
    .filter(Boolean);
};

const getCaseDisplayName = (
  caseItem
) => {
  if (!caseItem) {
    return '-';
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
    '-'
  );
};

// ======================================================
// COMPONENT
// ======================================================

const MeetingsList = () => {
  const {
    user,
  } = useAuth();

  const canCreate =
    hasPermission(
      user,
      PERMISSION_KEYS.CREATE_MEETINGS
    );

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    page,
    setPage,
  ] =
    useState(1);

  const debouncedSearch =
    useDebounce(
      search,
      400
    );

  // ====================================================
  // QUERY
  // ====================================================

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } =
    useQuery({
      queryKey: [
        'meetings',
        {
          page,
          search:
            debouncedSearch,
        },
      ],

      queryFn: () =>
        meetingApi.getAll({
          page,

          search:
            debouncedSearch,
        }),

      staleTime:
        1000,

      placeholderData: (
        previousData
      ) => previousData,
    });

  const meetings =
    Array.isArray(
      data?.data?.data
    )
      ? data.data.data
      : [];

  const pagination =
    data?.data
      ?.pagination;

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
  ]);

  const hasSearch =
    Boolean(
      debouncedSearch
    );

  // ====================================================
  // HANDLERS
  // ====================================================

  const handleSearchChange =
    (
      event
    ) => {
      setSearch(
        event.target.value
      );
    };

  const handleClearSearch =
    () => {
      setSearch('');
      setPage(1);
    };

  // ====================================================
  // LOADING
  // ====================================================

  if (
    isLoading &&
    !data
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader text="Toplantılar yükleniyor..." />
      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (
    error
  ) {
    return (
      <Error
        title="Toplantılar yüklenemedi"
        message="Toplantı kayıtları alınırken bir hata oluştu."
        error={
          error
        }
        onRetry={() =>
          refetch?.()
        }
      />
    );
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div className="flex items-start gap-3">

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-blue-50
              text-blue-600
              dark:bg-blue-500/[0.08]
              dark:text-blue-400
            "
          >
            <CalendarDays size={21} />
          </div>

          <div>

            <h1
              className="
                text-2xl
                font-semibold
                tracking-[-0.035em]
                text-gray-900
                dark:text-white
              "
            >
              Toplantılar
            </h1>

            <p
              className="
                mt-1
                max-w-2xl
                text-sm
                leading-6
                text-gray-500
                dark:text-slate-400
              "
            >
              Müvekkil ve dava bağlantılı toplantıları,
              tarihlerini ve durumlarını takip edin.
            </p>

            <p
              className="
                mt-1
                text-xs
                text-gray-400
                dark:text-slate-500
              "
            >
              Toplam{' '}
              <span className="font-semibold text-gray-600 dark:text-slate-300">
                {pagination?.total ||
                  0}
              </span>{' '}
              toplantı
            </p>

          </div>

        </div>

        {canCreate && (
          <Link to="/meetings/create">
            <Button>
              <Plus className="h-4 w-4" />
              Yeni Toplantı
            </Button>
          </Link>
        )}

      </div>

      {/* ==================================================
          SEARCH
      ================================================== */}

      <Card>

        <Card.Body>

          <div className="flex flex-col gap-2 sm:flex-row">

            <Input
              value={
                search
              }
              onChange={
                handleSearchChange
              }
              placeholder="Toplantı adı, müvekkil veya dava ara..."
              icon={
                <Search size={16} />
              }
            />

            {search && (
              <Button
                variant="ghost"
                onClick={
                  handleClearSearch
                }
              >
                <X className="h-4 w-4" />
                Temizle
              </Button>
            )}

          </div>

          {isFetching &&
            !isLoading && (
              <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
                Liste güncelleniyor...
              </p>
            )}

        </Card.Body>

      </Card>

      {/* ==================================================
          EMPTY / TABLE
      ================================================== */}

      {meetings.length ===
      0 ? (
        <Empty
          icon={
            CalendarDays
          }
          title={
            hasSearch
              ? 'Eşleşen toplantı bulunamadı'
              : 'Henüz toplantı bulunmuyor'
          }
          description={
            hasSearch
              ? 'Arama kriterinizi değiştirerek tekrar deneyin.'
              : canCreate
                ? 'Yeni bir toplantı oluşturarak planlamaya başlayabilirsiniz.'
                : 'Henüz görüntüleyebileceğiniz bir toplantı kaydı bulunmuyor.'
          }
          action={
            hasSearch ? (
              <Button
                variant="secondary"
                onClick={
                  handleClearSearch
                }
              >
                Aramayı Temizle
              </Button>
            ) : canCreate ? (
              <Link to="/meetings/create">
                <Button>
                  <Plus className="h-4 w-4" />
                  İlk Toplantıyı Oluştur
                </Button>
              </Link>
            ) : null
          }
        />
      ) : (
        <>

          <Table>

            <Table.Head>

              <Table.Row hover={false}>

                <Table.HeadCell>
                  Toplantı
                </Table.HeadCell>

                <Table.HeadCell>
                  Katılımcılar
                </Table.HeadCell>

                <Table.HeadCell>
                  Müvekkil
                </Table.HeadCell>

                <Table.HeadCell>
                  Dava
                </Table.HeadCell>

                <Table.HeadCell>
                  Tarih
                </Table.HeadCell>

                <Table.HeadCell>
                  Yer
                </Table.HeadCell>

                <Table.HeadCell>
                  Durum
                </Table.HeadCell>

                <Table.HeadCell className="text-right">
                  İşlem
                </Table.HeadCell>

              </Table.Row>

            </Table.Head>

            <Table.Body>

              {meetings.map(
                (
                  meeting
                ) => (
                  <Table.Row
                    key={
                      meeting.id
                    }
                  >

                    {/* MEETING */}

                    <Table.Cell>

                      <div className="min-w-[16rem]">

                        <Link
                          to={`/meetings/${meeting.id}`}
                          className="
                            font-semibold
                            text-gray-900
                            transition
                            hover:text-blue-600
                            dark:text-white
                            dark:hover:text-blue-400
                          "
                        >
                          {meeting.title}
                        </Link>

                        {meeting.description && (
                          <p
                            className="
                              mt-1
                              max-w-sm
                              truncate
                              text-xs
                              text-gray-500
                              dark:text-slate-500
                            "
                            title={
                              meeting.description
                            }
                          >
                            {meeting.description}
                          </p>
                        )}

                      </div>

                    </Table.Cell>

                    {/* INTERNAL PARTICIPANTS */}

                    <Table.Cell>

                      {(() => {
                        const participantNames =
                          getParticipantNames(
                            meeting
                          );

                        if (
                          participantNames.length ===
                          0
                        ) {
                          return (
                            <span className="text-gray-400 dark:text-slate-600">
                              -
                            </span>
                          );
                        }

                        return (
                          <div
                            className="min-w-[150px]"
                            title={
                              participantNames.join(
                                ', '
                              )
                            }
                          >

                            <div className="flex items-center gap-2">

                              <Users
                                size={14}
                                className="shrink-0 text-gray-400 dark:text-slate-500"
                              />

                              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                                {participantNames.length ===
                                1
                                  ? participantNames[0]
                                  : `${participantNames.length} kişi`}
                              </span>

                            </div>

                            {participantNames.length >
                              1 && (
                              <p className="mt-1 max-w-[180px] truncate text-xs text-gray-400 dark:text-slate-500">
                                {participantNames.join(
                                  ', '
                                )}
                              </p>
                            )}

                          </div>
                        );
                      })()}

                    </Table.Cell>

                    {/* CLIENT */}

                    <Table.Cell>

                      {meeting.client ? (
                        <Link
                          to={`/clients/${meeting.client.id}`}
                          className="
                            inline-flex
                            max-w-[14rem]
                            items-center
                            gap-2
                            truncate
                            text-sm
                            font-medium
                            text-gray-700
                            transition
                            hover:text-blue-600
                            dark:text-slate-300
                            dark:hover:text-blue-400
                          "
                        >
                          <Users className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-slate-500" />

                          <span className="truncate">
                            {meeting.client.name}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-600">
                          -
                        </span>
                      )}

                    </Table.Cell>

                    {/* CASE */}

                    <Table.Cell>

                      {meeting.case ? (
                        <Link
                          to={`/cases/${meeting.case.id}`}
                          className="
                            block
                            max-w-[14rem]
                            truncate
                            text-sm
                            font-medium
                            text-gray-700
                            transition
                            hover:text-blue-600
                            dark:text-slate-300
                            dark:hover:text-blue-400
                          "
                          title={
                            getCaseDisplayName(
                              meeting.case
                            )
                          }
                        >
                          {getCaseDisplayName(
                            meeting.case
                          )}
                        </Link>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-600">
                          -
                        </span>
                      )}

                    </Table.Cell>

                    {/* DATE */}

                    <Table.Cell>

                      <div className="flex min-w-[145px] items-center gap-2">

                        <CalendarDays
                          size={14}
                          className="shrink-0 text-gray-400 dark:text-slate-500"
                        />

                        <span className="whitespace-nowrap text-xs text-gray-600 dark:text-slate-400">
                          {formatDate(
                            meeting.start_date
                          )}
                        </span>

                      </div>

                    </Table.Cell>

                    {/* LOCATION */}

                    <Table.Cell>

                      {meeting.location ? (
                        <div className="flex max-w-[180px] items-center gap-2">

                          <MapPin
                            size={14}
                            className="shrink-0 text-gray-400 dark:text-slate-500"
                          />

                          <span
                            className="
                              truncate
                              text-sm
                              text-gray-600
                              dark:text-slate-400
                            "
                            title={
                              meeting.location
                            }
                          >
                            {meeting.location}
                          </span>

                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-600">
                          -
                        </span>
                      )}

                    </Table.Cell>

                    {/* STATUS */}

                    <Table.Cell>

                      <Badge
                        variant={
                          getStatusVariant(
                            meeting.status
                          )
                        }
                        dot
                      >
                        {getStatusLabel(
                          meeting.status
                        )}
                      </Badge>

                    </Table.Cell>

                    {/* ACTION */}

                    <Table.Cell className="text-right">

                      <Link
                        to={`/meetings/${meeting.id}`}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                        >
                          İncele
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>

                    </Table.Cell>

                  </Table.Row>
                )
              )}

            </Table.Body>

          </Table>

          {/* ==================================================
              PAGINATION
          ================================================== */}

          {pagination &&
            pagination.totalPages >
              1 && (
              <div
                className="
                  flex
                  flex-col
                  gap-3
                  rounded-xl
                  border
                  border-gray-200
                  bg-white
                  px-4
                  py-3
                  dark:border-white/[0.07]
                  dark:bg-[#0b1b33]
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >

                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Toplam{' '}
                  <span className="font-semibold text-gray-700 dark:text-slate-300">
                    {pagination.total}
                  </span>{' '}
                  toplantı
                </p>

                <div className="flex items-center gap-2">

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={
                      page <= 1 ||
                      isFetching
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          Math.max(
                            1,
                            current -
                              1
                          )
                      )
                    }
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Önceki
                  </Button>

                  <span
                    className="
                      min-w-[70px]
                      text-center
                      text-xs
                      font-semibold
                      text-gray-600
                      dark:text-slate-400
                    "
                  >
                    {page} /{' '}
                    {pagination.totalPages}
                  </span>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={
                      page >=
                        pagination.totalPages ||
                      isFetching
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          Math.min(
                            pagination.totalPages,
                            current +
                              1
                          )
                      )
                    }
                  >
                    Sonraki
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>

                </div>

              </div>
            )}

        </>
      )}

    </div>
  );
};

export default MeetingsList;