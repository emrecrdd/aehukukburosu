import {
  useMemo,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CheckSquare2,
  Clock3,
  FileText,
  FolderKanban,
  Gavel,
  Landmark,
  Plus,
  Scale,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  WalletCards,
} from 'lucide-react';

import dayjs from 'dayjs';
import 'dayjs/locale/tr';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import dashboardApi from '../../features/dashboard/dashboard.api.js';
import eventApi from '../../features/events/event.api.js';
import meetingApi from '../../features/meetings/meeting.api.js';

import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Loader from '../../components/shared/Loader.jsx';

dayjs.locale('tr');

// ======================================================
// HELPERS
// ======================================================

const formatDateLocal = (
  date
) => {
  if (!date) {
    return '-';
  }

  const value =
    dayjs(
      date
    );

  if (
    !value.isValid()
  ) {
    return '-';
  }

  return value.format(
    'DD.MM.YYYY'
  );
};

const formatMoney = (
  value
) => {
  return new Intl.NumberFormat(
    'tr-TR',
    {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }
  ).format(
    Number(value) ||
      0
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
    pending: 'Bekliyor',
    in_progress: 'Devam Ediyor',
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
    scheduled: 'warning',
    ongoing: 'info',
    completed: 'success',
    cancelled: 'danger',
    pending: 'warning',
    in_progress: 'info',
  };

  return (
    variants[status] ||
    'default'
  );
};

const getPriorityLabel = (
  priority
) => {
  const labels = {
    critical: 'Kritik',
    high: 'Yüksek',
    normal: 'Normal',
    low: 'Düşük',
  };

  return (
    labels[priority] ||
    priority ||
    '-'
  );
};

const getPriorityVariant = (
  priority
) => {
  const variants = {
    critical: 'danger',
    high: 'warning',
    normal: 'primary',
    low: 'default',
  };

  return (
    variants[priority] ||
    'default'
  );
};
const getGreeting = () => {
  const hour = Number(
    new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      hour: '2-digit',
      hour12: false,
    }).format(new Date())
  );

  if (hour >= 5 && hour < 12) return 'Günaydın';
  if (hour >= 12 && hour < 18) return 'İyi günler';
  if (hour >= 18 && hour < 22) return 'İyi akşamlar';

  return 'İyi geceler';
};
// ======================================================
// DASHBOARD
// ======================================================

const Dashboard = () => {
  const {
    user,
  } =
    useAuth();

  // ====================================================
  // QUERIES
  // ====================================================

  const {
    data:
      statsData,

    isLoading:
      statsLoading,
  } =
    useQuery({
      queryKey: [
        'dashboard-stats',
      ],

      queryFn: () =>
        dashboardApi.getStats(),

      staleTime:
        5 * 60 * 1000,
    });

  const {
    data:
      hearingsData,

    isLoading:
      hearingsLoading,
  } =
    useQuery({
      queryKey: [
        'dashboard-hearings',
      ],

      queryFn: () =>
        dashboardApi.getHearings(),

      staleTime:
        5 * 60 * 1000,
    });

  const {
    data:
      tasksData,

    isLoading:
      tasksLoading,
  } =
    useQuery({
      queryKey: [
        'dashboard-tasks',
      ],

      queryFn: () =>
        dashboardApi.getTasks(),

      staleTime:
        5 * 60 * 1000,
    });

  const {
    data:
      meetingsData,
  } =
    useQuery({
      queryKey: [
        'dashboard-meetings',
      ],

      queryFn: () =>
        meetingApi.getUpcoming(),

      staleTime:
        5 * 60 * 1000,
    });

  const currentMonth =
    dayjs().month() +
    1;

  const currentYear =
    dayjs().year();

  const {
    data:
      monthlyMeetingsData,
  } =
    useQuery({
      queryKey: [
        'dashboard-monthly-meetings',
        currentYear,
        currentMonth,
      ],

      queryFn: () =>
        meetingApi.getAll({
          page: 1,
          limit: 100,
        }),

      staleTime:
        5 * 60 * 1000,
    });

  const {
    data:
      calendarData,
  } =
    useQuery({
      queryKey: [
        'calendar-events',
        currentYear,
        currentMonth,
      ],

      queryFn: () =>
        eventApi.getCalendarEvents({
          year:
            currentYear,

          month:
            currentMonth,
        }),

      staleTime:
        5 * 60 * 1000,
    });

  // ====================================================
  // DATA
  // ====================================================

  const stats =
    statsData
      ?.data
      ?.data ||
    {};

  const hearings =
    Array.isArray(
      hearingsData
        ?.data
        ?.data
    )
      ? hearingsData
          .data
          .data
      : [];

  const tasks =
    Array.isArray(
      tasksData
        ?.data
        ?.data
    )
      ? tasksData
          .data
          .data
      : [];

  const meetings =
    Array.isArray(
      meetingsData
        ?.data
        ?.data
    )
      ? meetingsData
          .data
          .data
      : [];

  const monthlyMeetings =
    useMemo(
      () => {
        const rows =
          Array.isArray(
            monthlyMeetingsData
              ?.data
              ?.data
          )
            ? monthlyMeetingsData
                .data
                .data
            : [];

        return rows.filter(
          (
            meeting
          ) => {
            const start =
              dayjs(
                meeting.start_date
              );

            return (
              start.isValid() &&
              start.year() ===
                currentYear &&
              start.month() +
                1 ===
                currentMonth
            );
          }
        );
      },
      [
        monthlyMeetingsData,
        currentYear,
        currentMonth,
      ]
    );

  const events =
    Array.isArray(
      calendarData
        ?.data
        ?.data
    )
      ? calendarData
          .data
          .data
      : [];

  // ====================================================
  // DERIVED DATA
  // ====================================================

  const today =
    dayjs();

  const todayMeetings =
    useMemo(
      () =>
        meetings.filter(
          (
            meeting
          ) =>
            dayjs(
              meeting.start_date
            ).isSame(
              today,
              'day'
            )
        ),
      [
        meetings,
      ]
    );

  const allEvents =
    useMemo(
      () => [
        ...events,

        ...monthlyMeetings.map(
          (
            meeting
          ) => ({
            id:
              `meeting-${meeting.id}`,

            title:
              meeting.title,

            start:
              meeting.start_date,

            end:
              meeting.end_date ||
              meeting.start_date,

            type:
              'meeting',

            status:
              meeting.status,
          })
        ),
      ],
      [
        events,
        monthlyMeetings,
      ]
    );

  const monthlyStats =
    useMemo(
      () => {
        const daysInMonth =
          dayjs()
            .daysInMonth();

        const days = [];

        for (
          let day = 1;
          day <=
          daysInMonth;
          day += 1
        ) {
          const date =
            dayjs().date(
              day
            );

          const dayEvents =
            allEvents.filter(
              (
                item
              ) =>
                dayjs(
                  item.start
                ).isSame(
                  date,
                  'day'
                )
            );

          days.push({
            date,
            events:
              dayEvents,
          });
        }

        const emptyDays =
          days.filter(
            (
              item
            ) =>
              item.events
                .length ===
              0
          );

        const emptyRatio =
          days.length >
          0
            ? Math.round(
                (
                  emptyDays.length /
                  days.length
                ) *
                  100
              )
            : 0;

        let busiestDay =
          null;

        let maximum =
          0;

        days.forEach(
          (
            item
          ) => {
            if (
              item.events
                .length >
              maximum
            ) {
              maximum =
                item.events
                  .length;

              busiestDay =
                item;
            }
          }
        );

        return {
          daysInMonth,
          emptyDays:
            emptyDays.length,

          emptyRatio,

          busyRatio:
            100 -
            emptyRatio,

          busiestDay,
        };
      },
      [
        allEvents,
      ]
    );

  const weeklyEmptyDays =
    useMemo(
      () => {
        const start =
          dayjs().startOf(
            'week'
          );

        const end =
          dayjs().endOf(
            'week'
          );

        let current =
          start;

        let count =
          0;

        while (
          current.isBefore(
            end
          ) ||
          current.isSame(
            end,
            'day'
          )
        ) {
          const hasEvent =
            allEvents.some(
              (
                item
              ) =>
                dayjs(
                  item.start
                ).isSame(
                  current,
                  'day'
                )
            );

          if (
            !hasEvent
          ) {
            count +=
              1;
          }

          current =
            current.add(
              1,
              'day'
            );
        }

        return count;
      },
      [
        allEvents,
      ]
    );

  const hearingCount =
    events.filter(
      (
        event
      ) =>
        event.event_type ===
        'hearing'
    ).length;

  const taskCount =
    events.filter(
      (
        event
      ) =>
        event.type ===
        'task'
    ).length;

  // ====================================================
  // CARDS
  // ====================================================

  const statCards = [
    {
      label:
        'Toplam Müvekkil',

      value:
        stats.totalClients ||
        0,

      icon:
        Users,

      link:
        '/clients',

      iconClass:
        'bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400',
    },

    {
      label:
        'Aktif Davalar',

      value:
        stats.activeCases ||
        0,

      icon:
        FolderKanban,

      link:
        '/cases',

      iconClass:
        'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400',
    },

    {
      label:
        'Toplam Belge',

      value:
        stats.totalDocuments ||
        0,

      icon:
        FileText,

      link:
        '/documents',

      iconClass:
        'bg-violet-50 text-violet-600 dark:bg-violet-500/[0.08] dark:text-violet-400',
    },

    {
      label:
        'Bekleyen Görev',

      value:
        stats.pendingTasks ||
        0,

      icon:
        CheckSquare2,

      link:
        '/tasks',

      iconClass:
        'bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400',
    },
  ];

  const quickActions = [
    {
      label:
        'Müvekkil Ekle',

      description:
        'Yeni müvekkil kaydı',

      icon:
        UserPlus,

      link:
        '/clients/create',
    },

    {
      label:
        'Yeni Dava',

      description:
        'Dosya oluştur',

      icon:
        BriefcaseBusiness,

      link:
        '/cases/create',
    },

    {
      label:
        'Belge Yükle',

      description:
        'Dosyaya belge ekle',

      icon:
        Upload,

      link:
        '/documents/upload',
    },

    {
      label:
        'Görev Oluştur',

      description:
        'Yeni iş ata',

      icon:
        CheckSquare2,

      link:
        '/tasks/create',
    },
  ];

  // ====================================================
  // LOADING
  // ====================================================

  if (
    statsLoading ||
    hearingsLoading ||
    tasksLoading
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader
          text="Çalışma alanı hazırlanıyor..."
        />
      </div>
    );
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="space-y-6">

      {/* ==================================================
          HERO
      ================================================== */}

      <section
        className="
          relative
          overflow-hidden
          rounded-2xl
          border
          border-[#153363]
          bg-[#081b3d]
          px-5
          py-6
          text-white
          shadow-[0_12px_32px_rgba(7,20,38,0.12)]
          md:px-7
          md:py-7
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            -right-24
            -top-24
            h-72
            w-72
            rounded-full
            bg-blue-500/[0.12]
            blur-3xl
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -bottom-24
            left-1/3
            h-60
            w-60
            rounded-full
            bg-amber-400/[0.04]
            blur-3xl
          "
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

           <div className="flex items-center gap-2">
  <span
    className="
      h-px
      w-6
      bg-amber-400
    "
  />

   <p
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-[0.18em]
                text-blue-300/70
              "
            >
              Çalışma Alanı
            </p>
</div>

            <h1
              className="
                mt-2
                text-2xl
                font-semibold
                tracking-[-0.035em]
                md:text-3xl
              "
            >
             {getGreeting()},{' '}
{user?.first_name ||
  user?.name ||
  'Kullanıcı'}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Bugünkü duruşmalarınızı, toplantılarınızı ve açık işlerinizi tek ekrandan takip edin.
            </p>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            <div
             className="
  rounded-xl
  border
  border-amber-300/[0.12]
  bg-white/[0.04]
  px-4
  py-3
  shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]
"
            >
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-300/60">
                Bugün
              </p>

              <p className="mt-1 text-sm font-semibold text-white">
                {formatDateLocal(
                  new Date()
                )}
              </p>
            </div>

            <Link to="/calendar">
              <Button
                variant="secondary"
                size="sm"
              >
                <CalendarDays className="h-4 w-4" />
                Takvimi Aç
              </Button>
            </Link>

          </div>

        </div>
      </section>

      {/* ==================================================
          MAIN STATS
      ================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {statCards.map(
          (
            stat
          ) => {
            const Icon =
              stat.icon;

            return (
              <Link
                key={
                  stat.label
                }
                to={
                  stat.link
                }
              >
                <Card
                  hover
                  className="h-full"
                >
                  <Card.Body>

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <p
                          className="
                            text-xs
                            font-medium
                            text-gray-500
                            dark:text-slate-400
                          "
                        >
                          {stat.label}
                        </p>

                        <p
                          className="
                            mt-2
                            text-3xl
                            font-semibold
                            tracking-[-0.04em]
                            text-gray-900
                            dark:text-white
                          "
                        >
                          {stat.value}
                        </p>

                      </div>

                      <div
                        className={`
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-xl
                          ${stat.iconClass}
                        `}
                      >
                        <Icon size={19} />
                      </div>

                    </div>

                    <div
                      className="
                        mt-5
                        flex
                        items-center
                        gap-1
                        text-[11px]
                        font-semibold
                        text-gray-400
                        transition
                        group-hover:text-blue-600
                        dark:text-slate-500
                      "
                    >
                      Görüntüle
                      <ArrowRight size={13} />
                    </div>

                  </Card.Body>
                </Card>
              </Link>
            );
          }
        )}

      </section>

      {/* ==================================================
          FINANCE + QUICK ACTIONS
      ================================================== */}

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">

        {/* FINANCE */}

        <Card>

          <Card.Header>

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    bg-emerald-50
                    text-emerald-600
                    dark:bg-emerald-500/[0.08]
                    dark:text-emerald-400
                  "
                >
                  <WalletCards size={17} />
                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Finansal Durum
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    Tahsilat görünümü
                  </p>

                </div>

              </div>

              <Link
                to="/finance"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Detaylar
              </Link>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid gap-4 sm:grid-cols-2">

              <div
                className="
                  rounded-xl
                  border
                  border-emerald-100
                  bg-emerald-50/50
                  p-4
                  dark:border-emerald-500/10
                  dark:bg-emerald-500/[0.035]
                "
              >
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  Toplam Tahsilat
                </p>

                <p
                  className="
                    mt-2
                    text-2xl
                    font-semibold
                    tracking-[-0.035em]
                    text-emerald-700
                    dark:text-emerald-400
                  "
                >
                  {formatMoney(
                    stats.totalReceived
                  )}
                </p>

                <div className="mt-3 flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-500">
                  <CheckCircle2 size={12} />
                  Tahsil edilen tutar
                </div>
              </div>

              <div
                className="
                  rounded-xl
                  border
                  border-amber-100
                  bg-amber-50/50
                  p-4
                  dark:border-amber-500/10
                  dark:bg-amber-500/[0.035]
                "
              >
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  Bekleyen Tahsilat
                </p>

                <p
                  className="
                    mt-2
                    text-2xl
                    font-semibold
                    tracking-[-0.035em]
                    text-amber-700
                    dark:text-amber-400
                  "
                >
                  {formatMoney(
                    stats.totalPendingPayments
                  )}
                </p>

                <div className="mt-3 flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-500">
                  <Clock3 size={12} />
                  Tahsil edilmesi beklenen
                </div>

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* QUICK ACTIONS */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-blue-50
                  text-blue-600
                  dark:bg-blue-500/[0.08]
                  dark:text-blue-400
                "
              >
                <Plus size={18} />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Hızlı İşlemler
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Sık kullanılan işlemler
                </p>
              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid gap-2 sm:grid-cols-2">

              {quickActions.map(
                (
                  action
                ) => {
                  const Icon =
                    action.icon;

                  return (
                    <Link
                      key={
                        action.label
                      }
                      to={
                        action.link
                      }
                      className="
                        group
                        rounded-xl
                        border
                        border-gray-200
                        p-3
                        transition
                        hover:border-blue-200
                        hover:bg-blue-50/40
                        dark:border-white/[0.06]
                        dark:hover:border-blue-500/20
                        dark:hover:bg-blue-500/[0.04]
                      "
                    >
                      <div className="flex items-center gap-3">

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
                            transition
                            group-hover:bg-blue-100
                            group-hover:text-blue-600
                            dark:bg-white/[0.04]
                            dark:text-slate-400
                            dark:group-hover:bg-blue-500/[0.08]
                            dark:group-hover:text-blue-400
                          "
                        >
                          <Icon size={17} />
                        </div>

                        <div className="min-w-0">

                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {action.label}
                          </p>

                          <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-slate-500">
                            {action.description}
                          </p>

                        </div>

                      </div>
                    </Link>
                  );
                }
              )}

            </div>

          </Card.Body>

        </Card>

      </section>

      {/* ==================================================
          TODAY
      ================================================== */}

      <section className="grid gap-4 xl:grid-cols-2">

        {/* HEARINGS */}

        <Card>

          <Card.Header>

            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    bg-red-50
                    text-red-600
                    dark:bg-red-500/[0.08]
                    dark:text-red-400
                  "
                >
                  <Gavel size={17} />
                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Bugünkü Duruşmalar
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    {hearings.length} kayıt
                  </p>

                </div>

              </div>

              <Link
                to="/calendar"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Takvim
              </Link>

            </div>

          </Card.Header>

          <Card.Body>

            {hearings.length ===
            0 ? (
              <div className="py-8 text-center">

                <Scale className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-700" />

                <p className="mt-3 text-sm font-medium text-gray-700 dark:text-slate-300">
                  Bugün duruşma yok
                </p>

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  Güncel duruşmalar burada görüntülenir.
                </p>

              </div>
            ) : (
              <div className="space-y-2">

                {hearings.map(
                  (
                    hearing
                  ) => (
                    <Link
                      key={
                        hearing.id
                      }
                      to={`/events/${hearing.id}`}
                      className="
                        block
                        rounded-xl
                        border
                        border-gray-100
                        p-3.5
                        transition
                        hover:border-blue-200
                        hover:bg-gray-50/70
                        dark:border-white/[0.05]
                        dark:hover:border-blue-500/20
                        dark:hover:bg-white/[0.025]
                      "
                    >
                      <div className="flex items-start justify-between gap-4">

                        <div className="flex min-w-0 gap-3">

                          <div
                            className="
                              flex
                              h-10
                              min-w-10
                              items-center
                              justify-center
                              rounded-lg
                              bg-gray-50
                              text-xs
                              font-bold
                              text-gray-700
                              dark:bg-white/[0.04]
                              dark:text-slate-300
                            "
                          >
                            {dayjs(
                              hearing.start_date
                            ).format(
                              'HH:mm'
                            )}
                          </div>

                          <div className="min-w-0">

                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {hearing.title ||
                                hearing.case
                                  ?.title ||
                                'Duruşma'}
                            </p>

                            <p className="mt-1 truncate text-xs text-gray-500 dark:text-slate-400">
                              {hearing.location ||
                                hearing.case
                                  ?.court_name ||
                                'Yer belirtilmemiş'}
                            </p>

                            {hearing.case
                              ?.case_number && (
                              <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">
                                Dosya:{' '}
                                {
                                  hearing
                                    .case
                                    .case_number
                                }
                              </p>
                            )}

                          </div>

                        </div>

                        <Badge
                          variant={
                            getStatusVariant(
                              hearing.status
                            )
                          }
                          dot
                        >
                          {getStatusLabel(
                            hearing.status
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

        {/* MEETINGS */}

        <Card>

          <Card.Header>

            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    bg-blue-50
                    text-blue-600
                    dark:bg-blue-500/[0.08]
                    dark:text-blue-400
                  "
                >
                  <CalendarDays size={17} />
                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Bugünkü Toplantılar
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    {todayMeetings.length} kayıt
                  </p>

                </div>

              </div>

              <Link
                to="/meetings"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Tümü
              </Link>

            </div>

          </Card.Header>

          <Card.Body>

            {todayMeetings.length ===
            0 ? (
              <div className="py-8 text-center">

                <CalendarDays className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-700" />

                <p className="mt-3 text-sm font-medium text-gray-700 dark:text-slate-300">
                  Bugün toplantı yok
                </p>

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  Planlanan toplantılar burada görüntülenir.
                </p>

              </div>
            ) : (
              <div className="space-y-2">

                {todayMeetings.map(
                  (
                    meeting
                  ) => (
                    <Link
                      key={
                        meeting.id
                      }
                      to={`/meetings/${meeting.id}`}
                      className="
                        block
                        rounded-xl
                        border
                        border-gray-100
                        p-3.5
                        transition
                        hover:border-blue-200
                        hover:bg-gray-50/70
                        dark:border-white/[0.05]
                        dark:hover:border-blue-500/20
                        dark:hover:bg-white/[0.025]
                      "
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div className="flex min-w-0 gap-3">

                          <div
                            className="
                              flex
                              h-10
                              min-w-10
                              items-center
                              justify-center
                              rounded-lg
                              bg-gray-50
                              text-xs
                              font-bold
                              text-gray-700
                              dark:bg-white/[0.04]
                              dark:text-slate-300
                            "
                          >
                            {dayjs(
                              meeting.start_date
                            ).format(
                              'HH:mm'
                            )}
                          </div>

                          <div className="min-w-0">

                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {meeting.title}
                            </p>

                            <p className="mt-1 truncate text-xs text-gray-500 dark:text-slate-400">
                              {meeting.case
                                ?.title ||
                                meeting.client
                                  ?.name ||
                                meeting.location ||
                                'Genel toplantı'}
                            </p>

                          </div>

                        </div>

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

                      </div>

                    </Link>
                  )
                )}

              </div>
            )}

          </Card.Body>

        </Card>

      </section>

      {/* ==================================================
          TASKS + MONTH
      ================================================== */}

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">

        {/* TASKS */}

        <Card>

          <Card.Header>

            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    bg-amber-50
                    text-amber-600
                    dark:bg-amber-500/[0.08]
                    dark:text-amber-400
                  "
                >
                  <CheckSquare2 size={17} />
                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Açık Görevler
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    Öncelikli işleriniz
                  </p>

                </div>

              </div>

              <Link
                to="/tasks"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Tüm Görevler
              </Link>

            </div>

          </Card.Header>

          <Card.Body>

            {tasks.length ===
            0 ? (
              <div className="py-8 text-center">

                <CheckCircle2 className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-700" />

                <p className="mt-3 text-sm font-medium text-gray-700 dark:text-slate-300">
                  Açık görev bulunmuyor
                </p>

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  Yeni görevler burada listelenir.
                </p>

              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

                {tasks
                  .slice(
                    0,
                    6
                  )
                  .map(
                    (
                      task
                    ) => (
                      <Link
                        key={
                          task.id
                        }
                        to={`/tasks/${task.id}`}
                        className="
                          flex
                          items-center
                          justify-between
                          gap-4
                          py-3
                          first:pt-0
                          last:pb-0
                        "
                      >

                        <div className="min-w-0">

                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {task.title}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-gray-400 dark:text-slate-500">

                            {task.due_date && (
                              <span className="inline-flex items-center gap-1">
                                <Clock3 size={11} />

                                {dayjs(
                                  task.due_date
                                ).format(
                                  'DD MMM HH:mm'
                                )}
                              </span>
                            )}

                            {task.case
                              ?.title && (
                              <span>
                                {
                                  task
                                    .case
                                    .title
                                }
                              </span>
                            )}

                          </div>

                        </div>

                        <Badge
                          variant={
                            getPriorityVariant(
                              task.priority
                            )
                          }
                        >
                          {getPriorityLabel(
                            task.priority
                          )}
                        </Badge>

                      </Link>
                    )
                  )}

              </div>
            )}

          </Card.Body>

        </Card>

        {/* MONTH SUMMARY */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-violet-50
                  text-violet-600
                  dark:bg-violet-500/[0.08]
                  dark:text-violet-400
                "
              >
                <TrendingUp size={17} />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Bu Ay
                </h2>

                <p className="mt-0.5 text-xs capitalize text-gray-400 dark:text-slate-500">
                  {dayjs().format(
                    'MMMM YYYY'
                  )}
                </p>
              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div className="grid grid-cols-3 gap-3">

              <div
                className="
                  rounded-xl
                  bg-gray-50
                  p-3
                  dark:bg-white/[0.025]
                "
              >
                <p className="text-[10px] font-medium text-gray-400">
                  Duruşma
                </p>

                <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                  {hearingCount}
                </p>
              </div>

              <div
                className="
                  rounded-xl
                  bg-gray-50
                  p-3
                  dark:bg-white/[0.025]
                "
              >
                <p className="text-[10px] font-medium text-gray-400">
                  Toplantı
                </p>

                <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                  {monthlyMeetings.length}
                </p>
              </div>

              <div
                className="
                  rounded-xl
                  bg-gray-50
                  p-3
                  dark:bg-white/[0.025]
                "
              >
                <p className="text-[10px] font-medium text-gray-400">
                  Görev
                </p>

                <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                  {taskCount}
                </p>
              </div>

            </div>

            <div>

              <div className="flex items-center justify-between text-xs">

                <span className="text-gray-500 dark:text-slate-400">
                  Boş gün oranı
                </span>

                <span className="font-semibold text-gray-900 dark:text-white">
                  {monthlyStats.emptyRatio}%
                </span>

              </div>

              <div
                className="
                  mt-2
                  h-2
                  overflow-hidden
                  rounded-full
                  bg-gray-100
                  dark:bg-white/[0.05]
                "
              >
                <div
                  className="
                    h-full
                    rounded-full
                    bg-emerald-500
                  "
                  style={{
                    width:
                      `${monthlyStats.emptyRatio}%`,
                  }}
                />
              </div>

            </div>

            <div>

              <div className="flex items-center justify-between text-xs">

                <span className="text-gray-500 dark:text-slate-400">
                  Dolu gün oranı
                </span>

                <span className="font-semibold text-gray-900 dark:text-white">
                  {monthlyStats.busyRatio}%
                </span>

              </div>

              <div
                className="
                  mt-2
                  h-2
                  overflow-hidden
                  rounded-full
                  bg-gray-100
                  dark:bg-white/[0.05]
                "
              >
                <div
                  className="
                    h-full
                    rounded-full
                    bg-blue-500
                  "
                  style={{
                    width:
                      `${monthlyStats.busyRatio}%`,
                  }}
                />
              </div>

            </div>

            <div
              className="
                rounded-xl
                border
                border-gray-100
                bg-gray-50/60
                p-3
                dark:border-white/[0.05]
                dark:bg-white/[0.02]
              "
            >
              <div className="flex items-center gap-2">

                <Landmark
                  size={15}
                  className="text-gray-400"
                />

                <p className="text-xs font-medium text-gray-600 dark:text-slate-300">
                  En yoğun gün
                </p>

              </div>

              <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">

                {monthlyStats.busiestDay &&
                monthlyStats
                  .busiestDay
                  .events
                  .length >
                  0
                  ? `${dayjs(
                      monthlyStats
                        .busiestDay
                        .date
                    ).format(
                      'DD MMMM YYYY'
                    )} · ${
                      monthlyStats
                        .busiestDay
                        .events
                        .length
                    } etkinlik`
                  : 'Henüz veri yok'}

              </p>

            </div>

          </Card.Body>

        </Card>

      </section>

      {/* ==================================================
          WEEK SUMMARY
      ================================================== */}

      <Card>

        <Card.Body>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">

              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-xl
                  bg-emerald-50
                  text-emerald-600
                  dark:bg-emerald-500/[0.08]
                  dark:text-emerald-400
                "
              >
                <CalendarDays size={21} />
              </div>

              <div>

                <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                  Bu Haftaki Boş Gün
                </p>

                <div className="mt-1 flex items-baseline gap-2">

                  <p
                    className="
                      text-3xl
                      font-semibold
                      tracking-[-0.04em]
                      text-gray-900
                      dark:text-white
                    "
                  >
                    {weeklyEmptyDays}
                  </p>

                  <span className="text-sm text-gray-500 dark:text-slate-400">
                    gün
                  </span>

                </div>

              </div>

            </div>

            <div className="max-w-md">

              <p className="text-sm leading-6 text-gray-500 dark:text-slate-400">

                {weeklyEmptyDays >=
                4
                  ? 'Takviminizde bu hafta geniş çalışma alanı bulunuyor.'
                  : weeklyEmptyDays >=
                      2
                    ? 'Haftanız dengeli görünüyor; birkaç boş gününüz mevcut.'
                    : 'Bu hafta takviminiz oldukça yoğun görünüyor.'}

              </p>

            </div>

          </div>

        </Card.Body>

      </Card>

    </div>
  );
};

export default Dashboard;