import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  FilterX,
  Plus,
  Search,
  UserRound,
} from 'lucide-react';

import {
  useConsultationAssignableUsers,
  useConsultations,
  useConsultationStatistics,
} from '../../features/consultations/consultation.query.js';

import {
  CONSULTATION_STATUS_OPTIONS,
  CONSULTATION_TYPE_OPTIONS,
  formatConsultationMoney,
  getConsultationStatusLabel,
  getConsultationStatusVariant,
  getConsultationTypeLabel,
} from '../../features/consultations/consultation.constants.js';

import {
  CONSULTATION_PERMISSION_KEYS,
} from '../../features/consultations/consultation.permissions.js';

import {
  useDebounce,
} from '../../hooks/useDebounce.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
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

// ======================================================
// CONSTANTS
// ======================================================

const PAGE_LIMIT =
  25;

const STATUSES = [
  {
    value: '',
    label: 'Tüm Durumlar',
  },
  ...CONSULTATION_STATUS_OPTIONS,
];

const CONSULTATION_TYPES = [
  {
    value: '',
    label: 'Tüm Türler',
  },
  ...CONSULTATION_TYPE_OPTIONS,
];

// ======================================================
// HELPERS
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
      value?.id ??
      value?._id;

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

const getStatusLabel =
  getConsultationStatusLabel;

const getStatusVariant =
  getConsultationStatusVariant;

const getTypeLabel =
  getConsultationTypeLabel;

const getFullName = (
  user
) => {
  if (
    !user
  ) {
    return '';
  }

  const fullName =
    [
      user.first_name,
      user.last_name,
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      )
      .trim();

  return (
    fullName ||
    user.name ||
    user.full_name ||
    user.email ||
    ''
  );
};

const isPrimaryAssignee = (
  user
) => {
  return Boolean(
    user?.ConsultationAssignee
      ?.is_primary ??
    user?.consultation_assignee
      ?.is_primary ??
    user?.through
      ?.is_primary ??
    user?.is_primary
  );
};

const getSortedAssignees = (
  consultation
) => {
  const assignees =
    Array.isArray(
      consultation
        ?.assignees
    )
      ? consultation.assignees
      : [];

  return [
    ...assignees,
  ].sort(
    (
      first,
      second
    ) =>
      Number(
        isPrimaryAssignee(
          second
        )
      ) -
      Number(
        isPrimaryAssignee(
          first
        )
      )
  );
};

const formatMoney = (
  consultation
) => {
  if (
    consultation
      ?.billing_type ===
    'free'
  ) {
    return 'Ücretsiz';
  }

  return formatConsultationMoney(
    consultation?.agreed_fee,
    consultation?.currency
  );
};

const formatExactDateTime = (
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
    date
  );
};

const formatRelativeDate = (
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

  const diffMs =
    date.getTime() -
    Date.now();

  const absoluteMs =
    Math.abs(
      diffMs
    );

  const relativeFormatter =
    new Intl.RelativeTimeFormat(
      'tr',
      {
        numeric:
          'auto',
      }
    );

  if (
    absoluteMs <
    60 * 1000
  ) {
    return 'Az önce';
  }

  if (
    absoluteMs <
    60 * 60 * 1000
  ) {
    return relativeFormatter.format(
      Math.round(
        diffMs /
        (
          60 *
          1000
        )
      ),
      'minute'
    );
  }

  if (
    absoluteMs <
    24 * 60 * 60 * 1000
  ) {
    return relativeFormatter.format(
      Math.round(
        diffMs /
        (
          60 *
          60 *
          1000
        )
      ),
      'hour'
    );
  }

  if (
    absoluteMs <
    7 * 24 * 60 * 60 * 1000
  ) {
    return relativeFormatter.format(
      Math.round(
        diffMs /
        (
          24 *
          60 *
          60 *
          1000
        )
      ),
      'day'
    );
  }

  return formatExactDateTime(
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

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
};

const getStatisticsPayload = (
  response
) => {
  return (
    response?.data?.data ??
    response?.data ??
    {}
  );
};

// ======================================================
// COMPONENT
// ======================================================

const ConsultationsList = () => {
  const {
    user,
  } =
    useAuth();

  const canCreate =
    hasPermission(
      user,
      CONSULTATION_PERMISSION_KEYS.CREATE
    );

  // ====================================================
  // STATE
  // ====================================================

  const [
    search,
    setSearch,
  ] =
    useState('');

  const debouncedSearch =
    useDebounce(
      search,
      400
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState('');

  const [
    legalAreaFilter,
    setLegalAreaFilter,
  ] =
    useState('');

  const [
    assigneeFilter,
    setAssigneeFilter,
  ] =
    useState('');

  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState('');

  const [
    page,
    setPage,
  ] =
    useState(
      1
    );

  /*
   * Assignable users backend endpoint'inden alınır.
   * Ayrıca eski/inaktif assignee'ler filtrede kaybolmasın diye
   * görüntülenen kayıtların assignee'leri de bu sözlüğe eklenir.
   */
  const [
    knownAssignees,
    setKnownAssignees,
  ] =
    useState({});

  const [
    knownLegalAreas,
    setKnownLegalAreas,
  ] =
    useState([]);

  // ====================================================
  // QUERY
  // ====================================================

  /*
   * Boş opsiyonel filtreleri query string'e göndermiyoruz.
   *
   * Backend enum / UUID filtrelerini yalnızca gerçekten
   * değer gönderildiğinde doğrulamalı. Axios'a status: ''
   * veya assigned_to: '' vermek "?status=&assigned_to="
   * üretip liste endpoint'ini gereksiz yere 400'e düşürüyordu.
   */
  const consultationQueryParams =
    useMemo(
      () => ({
        page,

        limit:
          PAGE_LIMIT,

        ...(
          debouncedSearch
            ?.trim()
          ? {
              search:
                debouncedSearch.trim(),
            }
          : {}
        ),

        ...(
          statusFilter
          ? {
              status:
                statusFilter,
            }
          : {}
        ),

        ...(
          legalAreaFilter
            ?.trim()
          ? {
              legal_area:
                legalAreaFilter.trim(),
            }
          : {}
        ),

        ...(
          assigneeFilter
          ? {
              assigned_to:
                assigneeFilter,
            }
          : {}
        ),

        ...(
          typeFilter
          ? {
              type:
                typeFilter,
            }
          : {}
        ),
      }),
      [
        page,
        debouncedSearch,
        statusFilter,
        legalAreaFilter,
        assigneeFilter,
        typeFilter,
      ]
    );

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } =
    useConsultations(
      consultationQueryParams
    );

  const {
    data:
      statisticsData,
    isLoading:
      statisticsLoading,
  } =
    useConsultationStatistics();

  const {
    data:
      assignableUsersData,
  } =
    useConsultationAssignableUsers();

  // ====================================================
  // DATA
  // ====================================================

  const consultations =
    Array.isArray(
      data
        ?.data
        ?.data
    )
      ? data.data.data
      : [];

  const pagination =
    data
      ?.data
      ?.pagination;

  const assignableUsers =
    getArrayPayload(
      assignableUsersData
    );

  const statistics =
    getStatisticsPayload(
      statisticsData
    );

  const summaryItems =
    useMemo(
      () => {
        const activeCount =
          Number(
            statistics
              ?.evaluating ||
            0
          ) +
          Number(
            statistics
              ?.meetingScheduled ||
            0
          ) +
          Number(
            statistics
              ?.inProgress ||
            0
          );

        return [
          {
            label:
              'Tümü',

            value:
              Number(
                statistics
                  ?.total ||
                0
              ),
          },
          {
            label:
              'Yeni',

            value:
              Number(
                statistics
                  ?.new ||
                0
              ),
          },
          {
            label:
              'Devam Eden',

            value:
              activeCount,
          },
          {
            label:
              'Bekleyen',

            value:
              Number(
                statistics
                  ?.waitingClient ||
                0
              ),
          },
          {
            label:
              'Tamamlanan',

            value:
              Number(
                statistics
                  ?.completed ||
                0
              ),
          },
          {
            label:
              'Davaya Dönüşen',

            value:
              Number(
                statistics
                  ?.convertedToCase ||
                0
              ),
          },
        ];
      },
      [
        statistics,
      ]
    );

  // ====================================================
  // DISCOVER FILTER OPTIONS
  // ====================================================

  useEffect(() => {
    setKnownAssignees(
      (
        current
      ) => {
        const next = {
          ...current,
        };

        assignableUsers.forEach(
          (
            assignee
          ) => {
            const id =
              normalizeId(
                assignee?.id
              );

            if (
              !id
            ) {
              return;
            }

            next[id] = {
              id,

              name:
                getFullName(
                  assignee
                ) ||
                assignee?.email ||
                'Kullanıcı',
            };
          }
        );

        consultations.forEach(
          (
            consultation
          ) => {
            getSortedAssignees(
              consultation
            ).forEach(
              (
                assignee
              ) => {
                const id =
                  normalizeId(
                    assignee?.id
                  );

                if (
                  !id
                ) {
                  return;
                }

                next[id] = {
                  id,

                  name:
                    getFullName(
                      assignee
                    ) ||
                    assignee?.email ||
                    'Kullanıcı',
                };
              }
            );
          }
        );

        return next;
      }
    );

    setKnownLegalAreas(
      (
        current
      ) => {
        const merged =
          new Set(
            current
          );

        consultations.forEach(
          (
            consultation
          ) => {
            const legalArea =
              String(
                consultation
                  ?.legal_area ||
                ''
              ).trim();

            if (
              legalArea
            ) {
              merged.add(
                legalArea
              );
            }
          }
        );

        return [
          ...merged,
        ].sort(
          (
            first,
            second
          ) =>
            first.localeCompare(
              second,
              'tr'
            )
        );
      }
    );
  }, [
    assignableUsers,
    consultations,
  ]);

  const assigneeOptions =
    useMemo(
      () => {
        return Object.values(
          knownAssignees
        ).sort(
          (
            first,
            second
          ) =>
            String(
              first?.name ||
              ''
            ).localeCompare(
              String(
                second?.name ||
                ''
              ),
              'tr'
            )
        );
      },
      [
        knownAssignees,
      ]
    );

  // ====================================================
  // RESET PAGE ON FILTER CHANGE
  // ====================================================

  useEffect(() => {
    setPage(
      1
    );
  }, [
    debouncedSearch,
    statusFilter,
    legalAreaFilter,
    assigneeFilter,
    typeFilter,
  ]);

  // ====================================================
  // INVALID PAGE PROTECTION
  // ====================================================

  useEffect(() => {
    if (
      !pagination
        ?.totalPages
    ) {
      return;
    }

    if (
      page >
      pagination.totalPages
    ) {
      setPage(
        pagination.totalPages
      );
    }
  }, [
    page,
    pagination?.totalPages,
  ]);

  // ====================================================
  // FILTER ACTIONS
  // ====================================================

  const clearFilters =
    () => {
      setSearch(
        ''
      );

      setStatusFilter(
        ''
      );

      setLegalAreaFilter(
        ''
      );

      setAssigneeFilter(
        ''
      );

      setTypeFilter(
        ''
      );

      setPage(
        1
      );
    };

  const hasFilters =
    Boolean(
      search.trim() ||
      statusFilter ||
      legalAreaFilter ||
      assigneeFilter ||
      typeFilter
    );

  const activeStatusLabel =
    statusFilter
      ? getStatusLabel(
          statusFilter
        )
      : null;

  const activeTypeLabel =
    typeFilter
      ? getTypeLabel(
          typeFilter
        )
      : null;

  const activeAssigneeName =
    assigneeFilter
      ? knownAssignees[
          assigneeFilter
        ]?.name ||
        null
      : null;

  // ====================================================
  // LOADING
  // ====================================================

  if (
    isLoading &&
    !data
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">

        <Loader text="Danışmanlıklar yükleniyor..." />

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
        title="Danışmanlıklar yüklenemedi"
        message={
          error
            ?.response
            ?.data
            ?.message ||
          'Danışmanlık kayıtları alınırken bir hata oluştu.'
        }
        error={
          error
        }
        onRetry={() =>
          refetch()
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
              <BriefcaseBusiness size={21} />
            </div>

            <div>

              <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
                Danışmanlıklar
              </h1>

              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Hukuki danışmanlık taleplerini, sorumluları ve iş akışını yönetin.
              </p>

            </div>

          </div>

        </div>

        {canCreate && (
          <Link
            to="/consultations/create"
          >
            <Button>
              <Plus className="h-4 w-4" />

              Yeni Danışmanlık
            </Button>
          </Link>
        )}

      </div>

      {/* ==================================================
          SUMMARY
      ================================================== */}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">

        {summaryItems.map(
          (
            item
          ) => (
            <Card
              key={
                item.label
              }
            >
              <Card.Body>

                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  {item.label}
                </p>

                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-gray-900 dark:text-white">
                  {statisticsLoading
                    ? '—'
                    : item.value}
                </p>

              </Card.Body>
            </Card>
          )
        )}

      </div>

      {/* ==================================================
          FILTERS
      ================================================== */}

      <Card>

        <Card.Body>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-6">

            <div className="xl:col-span-2">

              <Input
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                maxLength={150}
                placeholder="Danışmanlık no, başlık veya talep sahibi ara..."
                icon={
                  <Search size={16} />
                }
              />

            </div>

            <div>

              <select
                value={
                  statusFilter
                }
                onChange={(
                  event
                ) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                disabled={
                  isFetching
                }
                aria-label="Danışmanlık durumuna göre filtrele"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 shadow-sm outline-none transition hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300 dark:hover:border-white/[0.14] dark:focus:border-blue-500/60"
              >

                {STATUSES.map(
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
                      {status.label}
                    </option>
                  )
                )}

              </select>

            </div>

            <div>

              <select
                value={
                  legalAreaFilter
                }
                onChange={(
                  event
                ) =>
                  setLegalAreaFilter(
                    event.target.value
                  )
                }
                disabled={
                  isFetching
                }
                aria-label="Hukuk alanına göre filtrele"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 shadow-sm outline-none transition hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300 dark:hover:border-white/[0.14] dark:focus:border-blue-500/60"
              >
                <option value="">
                  Tüm Hukuk Alanları
                </option>

                {knownLegalAreas.map(
                  (
                    legalArea
                  ) => (
                    <option
                      key={
                        legalArea
                      }
                      value={
                        legalArea
                      }
                    >
                      {legalArea}
                    </option>
                  )
                )}

              </select>

            </div>

            <div>

              <select
                value={
                  assigneeFilter
                }
                onChange={(
                  event
                ) =>
                  setAssigneeFilter(
                    event.target.value
                  )
                }
                disabled={
                  isFetching
                }
                aria-label="Sorumlu danışmana göre filtrele"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 shadow-sm outline-none transition hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300 dark:hover:border-white/[0.14] dark:focus:border-blue-500/60"
              >
                <option value="">
                  Tüm Sorumlular
                </option>

                {assigneeOptions.map(
                  (
                    assignee
                  ) => (
                    <option
                      key={
                        assignee.id
                      }
                      value={
                        assignee.id
                      }
                    >
                      {assignee.name}
                    </option>
                  )
                )}

              </select>

            </div>

            <div>

              <select
                value={
                  typeFilter
                }
                onChange={(
                  event
                ) =>
                  setTypeFilter(
                    event.target.value
                  )
                }
                disabled={
                  isFetching
                }
                aria-label="Danışmanlık türüne göre filtrele"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 shadow-sm outline-none transition hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300 dark:hover:border-white/[0.14] dark:focus:border-blue-500/60"
              >

                {CONSULTATION_TYPES.map(
                  (
                    type
                  ) => (
                    <option
                      key={
                        type.value
                      }
                      value={
                        type.value
                      }
                    >
                      {type.label}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

          {hasFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">

              <span className="text-xs text-gray-400 dark:text-slate-500">
                Aktif filtreler:
              </span>

              {search.trim() && (
                <Badge
                  variant="default"
                >
                  Arama: “{search.trim()}”
                </Badge>
              )}

              {activeStatusLabel && (
                <Badge
                  variant={
                    getStatusVariant(
                      statusFilter
                    )
                  }
                >
                  {activeStatusLabel}
                </Badge>
              )}

              {legalAreaFilter && (
                <Badge
                  variant="default"
                >
                  {legalAreaFilter}
                </Badge>
              )}

              {activeAssigneeName && (
                <Badge
                  variant="default"
                >
                  Sorumlu: {activeAssigneeName}
                </Badge>
              )}

              {activeTypeLabel && (
                <Badge
                  variant="default"
                >
                  {activeTypeLabel}
                </Badge>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={
                  isFetching
                }
                onClick={
                  clearFilters
                }
              >
                <FilterX className="h-4 w-4" />

                Temizle
              </Button>

            </div>
          )}

          {isFetching && (
            <div className="mt-3 flex items-center gap-2">

              <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-b-blue-600" />

              <p className="text-xs text-gray-400 dark:text-slate-500">
                Liste güncelleniyor...
              </p>

            </div>
          )}

        </Card.Body>

      </Card>

      {/* ==================================================
          EMPTY
      ================================================== */}

      {consultations.length ===
      0 ? (
        <Empty
          icon={
            BriefcaseBusiness
          }
          title={
            hasFilters
              ? 'Eşleşen danışmanlık bulunamadı'
              : 'Henüz danışmanlık kaydı yok'
          }
          description={
            hasFilters
              ? 'Arama veya filtreleri değiştirerek tekrar deneyin.'
              : canCreate
                ? 'İlk danışmanlık kaydınızı oluşturarak hukuki talep yönetimine başlayabilirsiniz.'
                : 'Henüz görüntüleyebileceğiniz bir danışmanlık kaydı bulunmuyor.'
          }
          action={
            hasFilters ? (
              <Button
                type="button"
                variant="secondary"
                onClick={
                  clearFilters
                }
              >
                <FilterX className="h-4 w-4" />

                Filtreleri Temizle
              </Button>
            ) : canCreate ? (
              <Link
                to="/consultations/create"
              >
                <Button>
                  <Plus className="h-4 w-4" />

                  İlk Danışmanlığı Oluştur
                </Button>
              </Link>
            ) : null
          }
        />
      ) : (
        <>

          {/* ==================================================
              TABLE
          ================================================== */}

          <Table>

            <Table.Head>

              <Table.Row
                hover={
                  false
                }
              >

                <Table.HeadCell>
                  No
                </Table.HeadCell>

                <Table.HeadCell>
                  Danışmanlık
                </Table.HeadCell>

                <Table.HeadCell>
                  Müvekkil / Talep Sahibi
                </Table.HeadCell>

                <Table.HeadCell>
                  Hukuk Alanı
                </Table.HeadCell>

                <Table.HeadCell>
                  Sorumlu
                </Table.HeadCell>

                <Table.HeadCell>
                  Durum
                </Table.HeadCell>

                <Table.HeadCell>
                  Ücret
                </Table.HeadCell>

                <Table.HeadCell>
                  Son Güncelleme
                </Table.HeadCell>

                <Table.HeadCell className="text-right">
                  İşlem
                </Table.HeadCell>

              </Table.Row>

            </Table.Head>

            <Table.Body>

              {consultations.map(
                (
                  consultation
                ) => {
                  const assignees =
                    getSortedAssignees(
                      consultation
                    );

                  const primaryAssignee =
                    assignees[0] ||
                    null;

                  const primaryAssigneeName =
                    getFullName(
                      primaryAssignee
                    );

                  const clientName =
                    consultation
                      ?.client
                      ?.name ||
                    consultation
                      ?.prospect_name ||
                    '';

                  return (
                    <Table.Row
                      key={
                        consultation.id
                      }
                    >

                      {/* ==============================
                          NUMBER
                      ============================== */}

                      <Table.Cell>

                        <Link
                          to={`/consultations/${consultation.id}`}
                          className="whitespace-nowrap text-xs font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {consultation.consultation_number ||
                            'Numara yok'}
                        </Link>

                      </Table.Cell>

                      {/* ==============================
                          CONSULTATION
                      ============================== */}

                      <Table.Cell>

                        <div className="min-w-[220px] max-w-[340px]">

                          <Link
                            to={`/consultations/${consultation.id}`}
                            className="font-semibold text-gray-900 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                          >
                            {consultation.title ||
                              'Danışmanlık'}
                          </Link>

                          <p
                            className="mt-1 truncate text-xs text-gray-500 dark:text-slate-400"
                            title={
                              getTypeLabel(
                                consultation.consultation_type
                              )
                            }
                          >
                            {getTypeLabel(
                              consultation.consultation_type
                            )}
                          </p>

                        </div>

                      </Table.Cell>

                      {/* ==============================
                          CLIENT / PROSPECT
                      ============================== */}

                      <Table.Cell>

                        <div className="min-w-[160px] max-w-[240px]">

                          {consultation
                            ?.client
                            ?.id ? (
                            <Link
                              to={`/clients/${consultation.client.id}`}
                              className="font-medium text-gray-700 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
                            >
                              {clientName ||
                                'Müvekkil'}
                            </Link>
                          ) : (
                            <p className="font-medium text-gray-700 dark:text-slate-300">
                              {clientName ||
                                'Talep sahibi belirtilmemiş'}
                            </p>
                          )}

                          <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">
                            {consultation
                              ?.client
                              ?.id
                              ? 'Müvekkil'
                              : 'Potansiyel kişi'}
                          </p>

                        </div>

                      </Table.Cell>

                      {/* ==============================
                          LEGAL AREA
                      ============================== */}

                      <Table.Cell>

                        <div className="max-w-[200px]">

                          <p
                            className="truncate text-gray-700 dark:text-slate-300"
                            title={
                              consultation.legal_area ||
                              ''
                            }
                          >
                            {consultation.legal_area ||
                              '-'}
                          </p>

                        </div>

                      </Table.Cell>

                      {/* ==============================
                          ASSIGNEES
                      ============================== */}

                      <Table.Cell>

                        {primaryAssignee ? (
                          <div className="min-w-[150px]">

                            <div className="flex items-center gap-2">

                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-slate-400">
                                <UserRound size={13} />
                              </div>

                              <span className="text-sm text-gray-700 dark:text-slate-300">
                                {primaryAssigneeName ||
                                  'Kullanıcı'}

                                {normalizeId(
                                  primaryAssignee?.id
                                ) ===
                                normalizeId(
                                  user?.id
                                )
                                  ? ' (Ben)'
                                  : ''}
                              </span>

                            </div>

                            {assignees.length >
                              1 && (
                              <p className="mt-1 pl-9 text-[11px] font-medium text-gray-400 dark:text-slate-500">
                                +{assignees.length - 1} sorumlu
                              </p>
                            )}

                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-slate-600">
                            Atanmadı
                          </span>
                        )}

                      </Table.Cell>

                      {/* ==============================
                          STATUS
                      ============================== */}

                      <Table.Cell>

                        <Badge
                          variant={
                            getStatusVariant(
                              consultation.status
                            )
                          }
                          dot
                        >
                          {getStatusLabel(
                            consultation.status
                          )}
                        </Badge>

                      </Table.Cell>

                      {/* ==============================
                          FEE
                      ============================== */}

                      <Table.Cell>

                        <span className="whitespace-nowrap font-medium text-gray-700 dark:text-slate-300">
                          {formatMoney(
                            consultation
                          )}
                        </span>

                      </Table.Cell>

                      {/* ==============================
                          UPDATED AT
                      ============================== */}

                      <Table.Cell>

                        <span
                          className="whitespace-nowrap text-xs text-gray-500 dark:text-slate-400"
                          title={
                            formatExactDateTime(
                              consultation.updated_at
                            )
                          }
                        >
                          {formatRelativeDate(
                            consultation.updated_at
                          )}
                        </span>

                      </Table.Cell>

                      {/* ==============================
                          ACTION
                      ============================== */}

                      <Table.Cell className="text-right">

                        <Link
                          to={`/consultations/${consultation.id}`}
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
                  );
                }
              )}

            </Table.Body>

          </Table>

          {/* ==================================================
              PAGINATION
          ================================================== */}

          {pagination &&
            pagination.totalPages >
              1 && (
              <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-white/[0.07] dark:bg-[#0b1b33] sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Toplam{' '}
                    <span className="font-semibold text-gray-700 dark:text-slate-300">
                      {pagination.total}
                    </span>{' '}
                    danışmanlık
                  </p>

                  {hasFilters && (
                    <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-600">
                      Sonuçlar aktif filtrelere göre gösteriliyor.
                    </p>
                  )}

                </div>

                <div className="flex items-center gap-2">

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={
                      page <=
                        1 ||
                      isFetching
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          Math.max(
                            current -
                              1,
                            1
                          )
                      )
                    }
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />

                    Önceki
                  </Button>

                  <span className="min-w-[78px] text-center text-xs font-semibold text-gray-600 dark:text-slate-400">
                    {page} /{' '}
                    {pagination.totalPages}
                  </span>

                  <Button
                    type="button"
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
                            current +
                              1,
                            pagination.totalPages
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

export default ConsultationsList;
