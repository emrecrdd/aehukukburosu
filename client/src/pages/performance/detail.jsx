import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  useUserPerformance,
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
  ArrowLeft,
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

const formatDateTime = (
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
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
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

const getRoleLabel = (
  role
) => {
  const labels = {
    admin:
      'Yönetici',

    lawyer:
      'Avukat',

    intern:
      'Stajyer',

    secretary:
      'Sekreter',
  };

  return (
    labels[
      role
    ] ||
    role ||
    '-'
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
// PAGE
// ======================================================

const PerformanceDetail = () => {
  const {
    userId,
  } =
    useParams();

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
  // PERFORMANCE QUERY
  // ====================================================

  const {
    data:
      response,

    isLoading,

    isFetching,

    error,

    refetch,
  } =
    useUserPerformance(
      userId,
      appliedFilters
    );

  const performance =
    response
      ?.data
      ?.data ||
    null;

  const user =
    performance
      ?.user ||
    null;

  const metrics =
    performance
      ?.metrics ||
    {};

  const assignments =
    Array.isArray(
      performance
        ?.assignments
    )
      ? performance
          .assignments
      : [];

  // ====================================================
  // DERIVED
  // ====================================================

  const completedAssignments =
    useMemo(
      () =>
        assignments.filter(
          (
            assignment
          ) =>
            assignment.status ===
            'completed'
        ),
      [
        assignments,
      ]
    );

  const activeAssignments =
    useMemo(
      () =>
        assignments.filter(
          (
            assignment
          ) =>
            assignment.status ===
              'pending' ||
            assignment.status ===
              'in_progress'
        ),
      [
        assignments,
      ]
    );

  const overdueAssignments =
    useMemo(
      () =>
        assignments.filter(
          (
            assignment
          ) =>
            assignment.overdue ===
            true
        ),
      [
        assignments,
      ]
    );

  // ====================================================
  // LOADING
  // ====================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader text="Personel performansı yükleniyor..." />
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
        title="Personel performansı alınamadı"
        message="Kullanıcının performans bilgileri yüklenirken bir hata oluştu."
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
    <div className="space-y-7">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div>

        <Link
          to="/performance"
          className="
            inline-flex
            items-center
            gap-1.5
            text-xs
            font-semibold
            text-gray-500
            transition
            hover:text-blue-600
            dark:text-slate-400
            dark:hover:text-blue-400
          "
        >
          <ArrowLeft
            size={15}
          />

          Performansa Dön
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

          <div className="flex items-start gap-3">

            <div
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-violet-50
                text-violet-600
                dark:bg-violet-500/[0.08]
                dark:text-violet-400
              "
            >
              <UserRound
                size={22}
              />
            </div>

            <div>

              <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
                {getFullName(
                  user
                )}
              </h1>

              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Personel Performans Detayı
              </p>

              {user
                ?.email && (
                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  {user.email}
                </p>
              )}

            </div>

          </div>

          <div className="flex flex-wrap items-center gap-2">

            {isFetching && (
              <Badge
                variant="info"
              >
                Güncelleniyor
              </Badge>
            )}

            {user
              ?.role && (
              <Badge
                variant="info"
              >
                {getRoleLabel(
                  user.role
                )}
              </Badge>
            )}

          </div>

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
                  Personel Performans Filtreleri
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-400">
                  Tarih aralığı görevin son tarihine göre uygulanır.
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

              <p className="text-xs text-gray-400 dark:text-slate-500">

                {Object.keys(
                  appliedFilters
                ).length >
                0
                  ? 'Aktif filtreler personelin metriklerine ve görev geçmişine uygulanıyor.'
                  : 'Şu anda kullanıcının tüm performans kayıtları gösteriliyor.'}

              </p>

              <div className="flex items-center gap-2">

                {hasFilterInput && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={
                      resetFilters
                    }
                    disabled={
                      isFetching
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
                    isFetching
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
          METRICS
      ================================================== */}

      <section className="space-y-4">

        <div>

          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Performans Özeti
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Değerler kullanıcının filtreye uyan kişisel görev atamalarından hesaplanır.
          </p>

        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <MetricCard
            title="Toplam Görev"
            value={
              formatNumber(
                metrics.total_assignments
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
                metrics.completed
              )
            }
            description={`Tamamlama oranı ${formatPercent(
              metrics.completion_rate
            )}`}
            icon={
              CheckCircle2
            }
          />

          <MetricCard
            title="Aktif İş Yükü"
            value={
              formatNumber(
                metrics.active
              )
            }
            description={`${formatNumber(
              metrics.pending
            )} bekleyen · ${formatNumber(
              metrics.in_progress
            )} devam eden`}
            icon={
              Activity
            }
          />

          <MetricCard
            title="Geciken"
            value={
              formatNumber(
                metrics.overdue
              )
            }
            description={`Gecikme oranı ${formatPercent(
              metrics.overdue_rate
            )}`}
            icon={
              AlertTriangle
            }
          />

          <MetricCard
            title="Zamanında Tamamlama"
            value={
              formatPercent(
                metrics.on_time_completion_rate
              )
            }
            description={`${formatNumber(
              metrics.completed_on_time
            )} zamanında · ${formatNumber(
              metrics.completed_late
            )} geç`}
            icon={
              Percent
            }
          />

          <MetricCard
            title="Toplam Çalışma"
            value={
              formatHours(
                metrics.total_actual_hours
              )
            }
            description={`Görev başına ortalama ${formatHours(
              metrics.average_actual_hours
            )}`}
            icon={
              Timer
            }
          />

          <MetricCard
            title="Ortalama İlerleme"
            value={
              formatPercent(
                metrics.average_progress
              )
            }
            description="Filtredeki kişisel görevlerin ilerleme ortalaması"
            icon={
              Gauge
            }
          />

          <MetricCard
            title="Tamamlama Oranı"
            value={
              formatPercent(
                metrics.completion_rate
              )
            }
            description={`${formatNumber(
              metrics.completed
            )} / ${formatNumber(
              metrics.total_assignments
            )} görev tamamlandı`}
            icon={
              TrendingUp
            }
          />

        </div>

      </section>

      {/* ==================================================
          QUICK COUNTS
      ================================================== */}

      <div className="grid gap-4 md:grid-cols-3">

        <Card>
          <Card.Body>

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
                <Activity
                  size={18}
                />
              </div>

              <div>

                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Aktif Görevler
                </p>

                <p className="mt-0.5 text-xl font-semibold text-gray-900 dark:text-white">
                  {activeAssignments.length}
                </p>

              </div>

            </div>

          </Card.Body>
        </Card>

        <Card>
          <Card.Body>

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400">
                <CheckCircle2
                  size={18}
                />
              </div>

              <div>

                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Tamamlanan Görevler
                </p>

                <p className="mt-0.5 text-xl font-semibold text-gray-900 dark:text-white">
                  {completedAssignments.length}
                </p>

              </div>

            </div>

          </Card.Body>
        </Card>

        <Card>
          <Card.Body>

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/[0.08] dark:text-red-400">
                <AlertTriangle
                  size={18}
                />
              </div>

              <div>

                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Geciken Görevler
                </p>

                <p className="mt-0.5 text-xl font-semibold text-gray-900 dark:text-white">
                  {overdueAssignments.length}
                </p>

              </div>

            </div>

          </Card.Body>
        </Card>

      </div>

      {/* ==================================================
          TASK HISTORY
      ================================================== */}

      <section className="space-y-4">

        <div>

          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Görev Geçmişi
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Seçilen filtrelere göre kullanıcının görev bazlı kişisel durum, ilerleme ve çalışma süresi kayıtları.
          </p>

        </div>

        <Card>

          {assignments.length ===
          0 ? (
            <Card.Body>

              <div className="py-10 text-center">

                <ListTodo className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600" />

                <p className="mt-3 text-sm font-medium text-gray-700 dark:text-slate-300">
                  Görev kaydı bulunamadı
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                  Seçili filtrelere uyan görev bulunmuyor.
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
                    Başlama
                  </Table.HeadCell>

                  <Table.HeadCell>
                    Tamamlama
                  </Table.HeadCell>

                  <Table.HeadCell>
                    Süre
                  </Table.HeadCell>

                </Table.Row>

              </Table.Head>

              <Table.Body>

                {assignments.map(
                  (
                    assignment
                  ) => (
                    <Table.Row
                      key={
                        `${assignment.task_id}-${assignment.user_id}`
                      }
                    >

                      <Table.Cell>

                        <div className="min-w-[210px]">

                          <Link
                            to={`/tasks/${assignment.task_id}`}
                            className="font-semibold text-gray-900 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
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

                        <div className="flex flex-wrap items-center gap-2">

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

                          {assignment.completed_on_time && (
                            <Badge
                              variant="success"
                            >
                              Zamanında
                            </Badge>
                          )}

                          {assignment.completed_late && (
                            <Badge
                              variant="danger"
                            >
                              Geç Tamamlandı
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
                              className="h-full rounded-full bg-blue-500"
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

                        <span className="whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">
                          {formatDateTime(
                            assignment.started_at
                          )}
                        </span>

                      </Table.Cell>

                      <Table.Cell>

                        <span className="whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">
                          {formatDateTime(
                            assignment.completed_at
                          )}
                        </span>

                      </Table.Cell>

                      <Table.Cell>

                        <div className="flex items-center gap-1.5 whitespace-nowrap">

                          <Clock3
                            size={14}
                            className="text-gray-400"
                          />

                          <span className="text-xs font-medium text-gray-600 dark:text-slate-300">

                            {assignment
                              .actual_hours !=
                            null
                              ? formatHours(
                                  assignment.actual_hours
                                )
                              : '-'}

                          </span>

                        </div>

                      </Table.Cell>

                    </Table.Row>
                  )
                )}

              </Table.Body>

            </Table>
          )}

        </Card>

      </section>

    </div>
  );
};

export default PerformanceDetail;