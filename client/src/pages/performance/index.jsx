import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  hasPermission,
  PERMISSION_KEYS,
} from '../../constants/roles.js';

import {
  useMyPerformance,
  useTeamPerformanceOverview,
  useUsersPerformance,
} from '../../features/performance/performance.query.js';

import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Table from '../../components/ui/Table.jsx';

import Loader from '../../components/shared/Loader.jsx';
import Error from '../../components/shared/Error.jsx';

import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gauge,
  ListTodo,
  Percent,
  SlidersHorizontal,
  Timer,
  TrendingUp,
  UserRound,
  Users,
  X,
} from 'lucide-react';

// ======================================================
// HELPERS
// ======================================================

const safeNumber = (
  value
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
};

const formatNumber = (
  value,
  maximumFractionDigits = 1
) => {
  return new Intl.NumberFormat(
    'tr-TR',
    {
      maximumFractionDigits,
    }
  ).format(
    safeNumber(
      value
    )
  );
};

const formatPercent = (
  value
) => {
  return `${formatNumber(
    value,
    1
  )}%`;
};

const formatHours = (
  value
) => {
  return `${formatNumber(
    value,
    2
  )} sa`;
};

const formatDate = (
  value
) => {
  if (!value) {
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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  ).format(
    date
  );
};

const getFullName = (
  user
) => {
  if (!user) {
    return '-';
  }

  return (
    user.full_name ||
    [
      user.first_name,
      user.last_name,
    ]
      .filter(
        Boolean
      )
      .join(' ')
      .trim() ||
    user.email ||
    '-'
  );
};

const getStatusLabel = (
  status
) => {
  const labels = {
    pending:
      'Bekliyor',

    in_progress:
      'Devam Ediyor',

    completed:
      'Tamamlandı',
  };

  return (
    labels[
      status
    ] ||
    status ||
    '-'
  );
};

const getStatusVariant = (
  status
) => {
  const variants = {
    pending:
      'warning',

    in_progress:
      'info',

    completed:
      'success',
  };

  return (
    variants[
      status
    ] ||
    'default'
  );
};

// ======================================================
// METRIC CARD
// ======================================================

const MetricCard = ({
  title,
  value,
  description,
  icon:
    Icon,
}) => {
  return (
    <Card>
      <Card.Body>

        <div className="flex items-start justify-between gap-4">

          <div className="min-w-0">

            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
              {title}
            </p>

            <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {value}
            </p>

            {description && (
              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-400">
                {description}
              </p>
            )}

          </div>

          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-gray-50
              text-gray-500
              dark:bg-white/[0.04]
              dark:text-slate-400
            "
          >
            <Icon
              size={19}
            />
          </div>

        </div>

      </Card.Body>
    </Card>
  );
};

// ======================================================
// METRICS GRID
// ======================================================

const MetricsGrid = ({
  metrics,
}) => {
  const data =
    metrics || {};

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

      <MetricCard
        title="Toplam Görev"
        value={
          formatNumber(
            data.total_assignments
          )
        }
        description="Filtreye uyan toplam görev"
        icon={
          ListTodo
        }
      />

      <MetricCard
        title="Tamamlanan"
        value={
          formatNumber(
            data.completed
          )
        }
        description={`Tamamlama oranı ${formatPercent(
          data.completion_rate
        )}`}
        icon={
          CheckCircle2
        }
      />

      <MetricCard
        title="Devam Eden"
        value={
          formatNumber(
            data.in_progress
          )
        }
        description={`${formatNumber(
          data.pending
        )} görev bekliyor`}
        icon={
          Activity
        }
      />

      <MetricCard
        title="Geciken"
        value={
          formatNumber(
            data.overdue
          )
        }
        description={`Gecikme oranı ${formatPercent(
          data.overdue_rate
        )}`}
        icon={
          AlertTriangle
        }
      />

      <MetricCard
        title="Zamanında Tamamlama"
        value={
          formatPercent(
            data.on_time_completion_rate
          )
        }
        description={`${formatNumber(
          data.completed_on_time
        )} zamanında · ${formatNumber(
          data.completed_late
        )} geç`}
        icon={
          Percent
        }
      />

      <MetricCard
        title="Toplam Çalışma"
        value={
          formatHours(
            data.total_actual_hours
          )
        }
        description={`Görev başına ortalama ${formatHours(
          data.average_actual_hours
        )}`}
        icon={
          Timer
        }
      />

      <MetricCard
        title="Ortalama İlerleme"
        value={
          formatPercent(
            data.average_progress
          )
        }
        description="Kişisel görev ilerleme ortalaması"
        icon={
          Gauge
        }
      />

      <MetricCard
        title="Aktif İş Yükü"
        value={
          formatNumber(
            data.active
          )
        }
        description="Bekleyen ve devam eden görevler"
        icon={
          TrendingUp
        }
      />

    </div>
  );
};

// ======================================================
// PAGE
// ======================================================

const Performance = () => {
  const {
    user,
  } = useAuth();

  const canViewTeam =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_TEAM_PERFORMANCE
    );

  // ====================================================
  // FILTER STATE
  // ====================================================

  const [
    filterForm,
    setFilterForm,
  ] =
    useState({
      status: '',
      date_from: '',
      date_to: '',
      overdue: '',
    });

  const [
    appliedFilters,
    setAppliedFilters,
  ] =
    useState({});

  const dateRangeInvalid =
    Boolean(
      filterForm.date_from &&
      filterForm.date_to &&
      filterForm.date_from >
        filterForm.date_to
    );

  const hasFilterInput =
    Boolean(
      filterForm.status ||
      filterForm.date_from ||
      filterForm.date_to ||
      filterForm.overdue ||
      Object.keys(
        appliedFilters
      ).length >
        0
    );

  const updateFilter = (
    name,
    value
  ) => {
    setFilterForm(
      (
        current
      ) => ({
        ...current,

        [name]:
          value,
      })
    );
  };

  const applyFilters = () => {
    if (
      dateRangeInvalid
    ) {
      return;
    }

    const next =
      {};

    if (
      filterForm.status
    ) {
      next.status =
        filterForm.status;
    }

    if (
      filterForm.date_from
    ) {
      next.date_from =
        filterForm.date_from;
    }

    if (
      filterForm.date_to
    ) {
      next.date_to =
        filterForm.date_to;
    }

    if (
      filterForm.overdue !==
      ''
    ) {
      next.overdue =
        filterForm.overdue;
    }

    setAppliedFilters(
      next
    );
  };

  const resetFilters = () => {
    setFilterForm({
      status: '',
      date_from: '',
      date_to: '',
      overdue: '',
    });

    setAppliedFilters(
      {}
    );
  };

  // ====================================================
  // MY PERFORMANCE
  // ====================================================

  const {
    data:
      myResponse,

    isLoading:
      isMyLoading,

    isFetching:
      isMyFetching,

    error:
      myError,

    refetch:
      refetchMy,
  } =
    useMyPerformance(
      appliedFilters
    );

  // ====================================================
  // TEAM OVERVIEW
  // ====================================================

  const {
    data:
      overviewResponse,

    isLoading:
      isOverviewLoading,

    isFetching:
      isOverviewFetching,

    error:
      overviewError,

    refetch:
      refetchOverview,
  } =
    useTeamPerformanceOverview(
      appliedFilters,
      {
        enabled:
          canViewTeam,
      }
    );

  // ====================================================
  // USERS PERFORMANCE
  // ====================================================

  const {
    data:
      usersResponse,

    isLoading:
      isUsersLoading,

    isFetching:
      isUsersFetching,

    error:
      usersError,

    refetch:
      refetchUsers,
  } =
    useUsersPerformance(
      appliedFilters,
      {
        enabled:
          canViewTeam,
      }
    );

  // ====================================================
  // RESPONSE DATA
  // ====================================================

  const myPerformance =
    myResponse
      ?.data
      ?.data ||
    null;

  const overview =
    overviewResponse
      ?.data
      ?.data ||
    null;

  const usersPerformance =
    Array.isArray(
      usersResponse
        ?.data
        ?.data
    )
      ? usersResponse
          .data
          .data
      : [];

  const assignments =
    Array.isArray(
      myPerformance
        ?.assignments
    )
      ? myPerformance
          .assignments
      : [];

  // ====================================================
  // ASSIGNMENTS
  // ====================================================

  const recentAssignments =
    useMemo(
      () =>
        assignments.slice(
          0,
          10
        ),
      [
        assignments,
      ]
    );

  const isUpdating =
    isMyFetching ||
    (
      canViewTeam &&
      (
        isOverviewFetching ||
        isUsersFetching
      )
    );

  // ====================================================
  // INITIAL LOADING
  // ====================================================

  if (
    isMyLoading
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader text="Performans bilgileri yükleniyor..." />
      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (
    myError
  ) {
    return (
      <Error
        title="Performans bilgileri alınamadı"
        message="Kendi performans verileriniz yüklenirken bir hata oluştu."
        error={
          myError
        }
        onRetry={() =>
          refetchMy?.()
        }
      />
    );
  }

  return (
    <div className="space-y-7">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

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
            <TrendingUp
              size={21}
            />
          </div>

          <div>

            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
              Performans
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-slate-400">
              Görev tamamlama, ilerleme, çalışma süresi ve zamanında teslim performansını takip edin.
            </p>

            {myPerformance
              ?.user && (
              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                {getFullName(
                  myPerformance.user
                )}
              </p>
            )}

          </div>

        </div>

        <div className="flex flex-wrap items-center gap-2">

          {isUpdating && (
            <Badge
              variant="info"
            >
              Güncelleniyor
            </Badge>
          )}

          {canViewTeam && (
            <Badge
              variant="success"
            >
              Ekip performansı erişimi
            </Badge>
          )}

        </div>

      </div>

      {/* ==================================================
          FILTERS
      ================================================== */}

      <Card>

        <Card.Body>

          <div className="space-y-4">

            <div className="flex items-start gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  bg-gray-50
                  text-gray-500
                  dark:bg-white/[0.04]
                  dark:text-slate-400
                "
              >
                <SlidersHorizontal
                  size={17}
                />
              </div>

              <div>

                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Performans Filtreleri
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-400">
                  Tarih filtresi görevin son tarihine göre uygulanır.
                </p>

              </div>

            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

              {/* STATUS */}

              <div>

                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-slate-400">
                  Görev Durumu
                </label>

                <select
                  value={
                    filterForm.status
                  }
                  onChange={(
                    event
                  ) =>
                    updateFilter(
                      'status',
                      event.target.value
                    )
                  }
                  className="
                    h-10
                    w-full
                    rounded-lg
                    border
                    border-gray-200
                    bg-white
                    px-3
                    text-sm
                    text-gray-700
                    outline-none
                    transition
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  <option value="">
                    Tüm Durumlar
                  </option>

                  <option value="pending">
                    Bekliyor
                  </option>

                  <option value="in_progress">
                    Devam Ediyor
                  </option>

                  <option value="completed">
                    Tamamlandı
                  </option>
                </select>

              </div>

              {/* DATE FROM */}

              <div>

                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-slate-400">
                  Başlangıç Tarihi
                </label>

                <div className="relative">

                  <CalendarDays
                    size={15}
                    className="
                      pointer-events-none
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-gray-400
                      dark:text-slate-500
                    "
                  />

                  <input
                    type="date"
                    value={
                      filterForm.date_from
                    }
                    onChange={(
                      event
                    ) =>
                      updateFilter(
                        'date_from',
                        event.target.value
                      )
                    }
                    className="
                      h-10
                      w-full
                      rounded-lg
                      border
                      border-gray-200
                      bg-white
                      pl-9
                      pr-3
                      text-sm
                      text-gray-700
                      outline-none
                      transition
                      focus:border-blue-500
                      focus:ring-2
                      focus:ring-blue-500/10
                      dark:border-white/[0.08]
                      dark:bg-white/[0.035]
                      dark:text-slate-300
                    "
                  />

                </div>

              </div>

              {/* DATE TO */}

              <div>

                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-slate-400">
                  Bitiş Tarihi
                </label>

                <div className="relative">

                  <CalendarDays
                    size={15}
                    className="
                      pointer-events-none
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-gray-400
                      dark:text-slate-500
                    "
                  />

                  <input
                    type="date"
                    value={
                      filterForm.date_to
                    }
                    onChange={(
                      event
                    ) =>
                      updateFilter(
                        'date_to',
                        event.target.value
                      )
                    }
                    className="
                      h-10
                      w-full
                      rounded-lg
                      border
                      border-gray-200
                      bg-white
                      pl-9
                      pr-3
                      text-sm
                      text-gray-700
                      outline-none
                      transition
                      focus:border-blue-500
                      focus:ring-2
                      focus:ring-blue-500/10
                      dark:border-white/[0.08]
                      dark:bg-white/[0.035]
                      dark:text-slate-300
                    "
                  />

                </div>

              </div>

              {/* OVERDUE */}

              <div>

                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-slate-400">
                  Gecikme Durumu
                </label>

                <select
                  value={
                    filterForm.overdue
                  }
                  onChange={(
                    event
                  ) =>
                    updateFilter(
                      'overdue',
                      event.target.value
                    )
                  }
                  className="
                    h-10
                    w-full
                    rounded-lg
                    border
                    border-gray-200
                    bg-white
                    px-3
                    text-sm
                    text-gray-700
                    outline-none
                    transition
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  <option value="">
                    Tümü
                  </option>

                  <option value="true">
                    Sadece Gecikenler
                  </option>

                  <option value="false">
                    Gecikmeyenler
                  </option>
                </select>

              </div>

            </div>

            {dateRangeInvalid && (
              <div
                className="
                  rounded-lg
                  border
                  border-red-200
                  bg-red-50
                  px-3
                  py-2
                  text-xs
                  text-red-700
                  dark:border-red-500/15
                  dark:bg-red-500/[0.06]
                  dark:text-red-300
                "
              >
                Başlangıç tarihi bitiş tarihinden sonra olamaz.
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-white/[0.06]">

              <div className="text-xs text-gray-400 dark:text-slate-500">

                {Object.keys(
                  appliedFilters
                ).length >
                0
                  ? 'Aktif filtreler performans verilerine uygulanıyor.'
                  : 'Şu anda tüm performans kayıtları gösteriliyor.'}

              </div>

              <div className="flex items-center gap-2">

                {hasFilterInput && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={
                      resetFilters
                    }
                    disabled={
                      isUpdating
                    }
                  >
                    <X className="h-4 w-4" />
                    Temizle
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={
                    applyFilters
                  }
                  disabled={
                    dateRangeInvalid ||
                    isUpdating
                  }
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtreleri Uygula
                </Button>

              </div>

            </div>

          </div>

        </Card.Body>

      </Card>

      {/* ==================================================
          MY PERFORMANCE
      ================================================== */}

      <section className="space-y-4">

        <div>

          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Benim Performansım
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Buradaki değerler yalnızca size ait görev atamalarından hesaplanır.
          </p>

        </div>

        <MetricsGrid
          metrics={
            myPerformance
              ?.metrics
          }
        />

      </section>

      {/* ==================================================
          MY RECENT TASKS
      ================================================== */}

      <section className="space-y-4">

        <div className="flex items-end justify-between gap-4">

          <div>

            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Son Görevlerim
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Uygulanan filtrelere göre kişisel görev durumunuz ve ilerlemeniz.
            </p>

          </div>

          <Link
            to="/tasks"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Tüm görevler
          </Link>

        </div>

        <Card>

          {recentAssignments.length ===
          0 ? (
            <Card.Body>

              <div className="py-8 text-center">

                <ListTodo className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600" />

                <p className="mt-3 text-sm font-medium text-gray-700 dark:text-slate-300">
                  Görev bulunamadı
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                  Seçili filtrelere uyan kişisel görev kaydı bulunmuyor.
                </p>

              </div>

            </Card.Body>
          ) : (
            <Table>

              <Table.Head>

                <Table.Row
                  hover={
                    false
                  }
                >

                  <Table.HeadCell>
                    Görev
                  </Table.HeadCell>

                  <Table.HeadCell>
                    Durum
                  </Table.HeadCell>

                  <Table.HeadCell>
                    İlerleme
                  </Table.HeadCell>

                  <Table.HeadCell>
                    Son Tarih
                  </Table.HeadCell>

                  <Table.HeadCell>
                    Süre
                  </Table.HeadCell>

                </Table.Row>

              </Table.Head>

              <Table.Body>

                {recentAssignments.map(
                  (
                    assignment
                  ) => (
                    <Table.Row
                      key={
                        `${assignment.task_id}-${assignment.user_id}`
                      }
                    >

                      <Table.Cell>

                        <div className="min-w-[190px]">

                          <Link
                            to={`/tasks/${assignment.task_id}`}
                            className="font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                          >
                            {assignment
                              .task
                              ?.title ||
                              'Görev'}
                          </Link>

                          {assignment
                            .task
                            ?.case && (
                            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">

                              {assignment
                                .task
                                .case
                                .case_number
                                ? `${assignment.task.case.case_number} · `
                                : ''}

                              {assignment
                                .task
                                .case
                                .title}

                            </p>
                          )}

                        </div>

                      </Table.Cell>

                      <Table.Cell>

                        <div className="flex items-center gap-2">

                          <Badge
                            variant={
                              getStatusVariant(
                                assignment.status
                              )
                            }
                            dot
                          >
                            {getStatusLabel(
                              assignment.status
                            )}
                          </Badge>

                          {assignment.overdue && (
                            <Badge
                              variant="danger"
                            >
                              Gecikti
                            </Badge>
                          )}

                        </div>

                      </Table.Cell>

                      <Table.Cell>

                        <div className="min-w-[120px]">

                          <div className="mb-1 flex items-center justify-between text-xs">

                            <span className="text-gray-500 dark:text-slate-400">
                              İlerleme
                            </span>

                            <span className="font-semibold text-gray-700 dark:text-slate-300">
                              {formatPercent(
                                assignment.progress
                              )}
                            </span>

                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">

                            <div
                              className="h-full rounded-full bg-blue-500 transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    safeNumber(
                                      assignment.progress
                                    )
                                  )
                                )}%`,
                              }}
                            />

                          </div>

                        </div>

                      </Table.Cell>

                      <Table.Cell>

                        <span className="whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">
                          {formatDate(
                            assignment
                              .task
                              ?.due_date
                          )}
                        </span>

                      </Table.Cell>

                      <Table.Cell>

                        <span className="whitespace-nowrap text-xs font-medium text-gray-600 dark:text-slate-300">

                          {assignment
                            .actual_hours !=
                          null
                            ? formatHours(
                                assignment.actual_hours
                              )
                            : '-'}

                        </span>

                      </Table.Cell>

                    </Table.Row>
                  )
                )}

              </Table.Body>

            </Table>
          )}

        </Card>

      </section>

      {/* ==================================================
          TEAM AREA
      ================================================== */}

      {canViewTeam && (
        <>

          <section className="space-y-4">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/[0.08] dark:text-violet-400">

                <Users
                  size={18}
                />

              </div>

              <div>

                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Ekip Performansı
                </h2>

                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Aynı filtreler tüm ekip performans hesaplamalarına uygulanır.
                </p>

              </div>

            </div>

            {overviewError ? (
              <Error
                title="Ekip özeti alınamadı"
                message="Ekip performans özeti yüklenemedi."
                error={
                  overviewError
                }
                onRetry={() =>
                  refetchOverview?.()
                }
              />
            ) : isOverviewLoading ? (
              <div className="flex min-h-[180px] items-center justify-center">
                <Loader text="Ekip özeti yükleniyor..." />
              </div>
            ) : (
              <>

                <MetricsGrid
                  metrics={
                    overview
                  }
                />

                <Card>

                  <Card.Body>

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-500 dark:bg-white/[0.04] dark:text-slate-400">

                        <UserRound
                          size={19}
                        />

                      </div>

                      <div>

                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Görev kaydı bulunan personel
                        </p>

                        <p className="mt-0.5 text-xl font-semibold text-gray-900 dark:text-white">

                          {formatNumber(
                            overview
                              ?.users_with_assignments
                          )}

                        </p>

                      </div>

                    </div>

                  </Card.Body>

                </Card>

              </>
            )}

          </section>

          {/* ==================================================
              TEAM USERS TABLE
          ================================================== */}

          <section className="space-y-4">

            <div>

              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Personel Karşılaştırması
              </h2>

              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Seçilen filtrelere göre kullanıcı bazlı görev performansı.
              </p>

            </div>

            {usersError ? (
              <Error
                title="Personel performansı alınamadı"
                message="Kullanıcı performans listesi yüklenemedi."
                error={
                  usersError
                }
                onRetry={() =>
                  refetchUsers?.()
                }
              />
            ) : isUsersLoading ? (
              <div className="flex min-h-[220px] items-center justify-center">
                <Loader text="Personel performansları yükleniyor..." />
              </div>
            ) : (
              <Card>

                {usersPerformance.length ===
                0 ? (
                  <Card.Body>

                    <div className="py-8 text-center">

                      <Users className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600" />

                      <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
                        Gösterilecek kullanıcı performansı bulunamadı.
                      </p>

                    </div>

                  </Card.Body>
                ) : (
                  <Table>

                    <Table.Head>

                      <Table.Row
                        hover={
                          false
                        }
                      >

                        <Table.HeadCell>
                          Personel
                        </Table.HeadCell>

                        <Table.HeadCell>
                          Görev
                        </Table.HeadCell>

                        <Table.HeadCell>
                          Tamamlanan
                        </Table.HeadCell>

                        <Table.HeadCell>
                          Aktif
                        </Table.HeadCell>

                        <Table.HeadCell>
                          Geciken
                        </Table.HeadCell>

                        <Table.HeadCell>
                          Zamanında
                        </Table.HeadCell>

                        <Table.HeadCell>
                          Çalışma
                        </Table.HeadCell>

                        <Table.HeadCell>
                          Ort. İlerleme
                        </Table.HeadCell>

                      </Table.Row>

                    </Table.Head>

                    <Table.Body>

                      {usersPerformance.map(
                        (
                          item
                        ) => {
                          const metrics =
                            item.metrics ||
                            {};

                          return (
                            <Table.Row
                              key={
                                item
                                  .user
                                  ?.id
                              }
                            >

                              <Table.Cell>

                                <div className="flex min-w-[180px] items-center gap-3">

                                  <div
                                    className="
                                      flex
                                      h-9
                                      w-9
                                      shrink-0
                                      items-center
                                      justify-center
                                      rounded-full
                                      bg-violet-50
                                      text-xs
                                      font-semibold
                                      text-violet-600
                                      dark:bg-violet-500/[0.08]
                                      dark:text-violet-400
                                    "
                                  >

                                    {item.user
                                      ?.first_name
                                      ?.[0] ||
                                      ''}

                                    {item.user
                                      ?.last_name
                                      ?.[0] ||
                                      ''}

                                  </div>

                                  <div>

                                    <Link
                                      to={`/performance/users/${item.user?.id}`}
                                      className="
                                        font-semibold
                                        text-gray-900
                                        transition
                                        hover:text-blue-600
                                        dark:text-white
                                        dark:hover:text-blue-400
                                      "
                                    >
                                      {getFullName(
                                        item.user
                                      )}
                                    </Link>

                                    <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">

                                      {item
                                        .user
                                        ?.email ||
                                        '-'}

                                    </p>

                                  </div>

                                </div>

                              </Table.Cell>

                              <Table.Cell>

                                {formatNumber(
                                  metrics.total_assignments
                                )}

                              </Table.Cell>

                              <Table.Cell>

                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">

                                  {formatNumber(
                                    metrics.completed
                                  )}

                                </span>

                              </Table.Cell>

                              <Table.Cell>

                                {formatNumber(
                                  metrics.active
                                )}

                              </Table.Cell>

                              <Table.Cell>

                                <span
                                  className={
                                    safeNumber(
                                      metrics.overdue
                                    ) >
                                    0
                                      ? 'font-semibold text-red-600 dark:text-red-400'
                                      : 'text-gray-500 dark:text-slate-400'
                                  }
                                >

                                  {formatNumber(
                                    metrics.overdue
                                  )}

                                </span>

                              </Table.Cell>

                              <Table.Cell>

                                <span className="whitespace-nowrap text-sm font-semibold text-gray-700 dark:text-slate-300">

                                  {formatPercent(
                                    metrics.on_time_completion_rate
                                  )}

                                </span>

                              </Table.Cell>

                              <Table.Cell>

                                <div className="flex items-center gap-1.5 whitespace-nowrap">

                                  <Clock3
                                    size={14}
                                    className="text-gray-400"
                                  />

                                  <span className="text-sm text-gray-600 dark:text-slate-300">

                                    {formatHours(
                                      metrics.total_actual_hours
                                    )}

                                  </span>

                                </div>

                              </Table.Cell>

                              <Table.Cell>

                                <span className="font-semibold text-blue-600 dark:text-blue-400">

                                  {formatPercent(
                                    metrics.average_progress
                                  )}

                                </span>

                              </Table.Cell>

                            </Table.Row>
                          );
                        }
                      )}

                    </Table.Body>

                  </Table>
                )}

              </Card>
            )}

          </section>

        </>
      )}

    </div>
  );
};

export default Performance;