import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import eventApi from '../../features/events/event.api.js';
import meetingApi from '../../features/meetings/meeting.api.js';

import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

import Loader from '../../components/shared/Loader.jsx';

import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gavel,
  MapPin,
  Users,
} from 'lucide-react';

import dayjs from 'dayjs';
import 'dayjs/locale/tr';

dayjs.locale('tr');

// ======================================================
// CONSTANTS
// ======================================================

const WEEK_DAYS = [
  'Pzt',
  'Sal',
  'Çar',
  'Per',
  'Cum',
  'Cmt',
  'Paz',
];

// ======================================================
// DATE HELPERS
// ======================================================

const formatDateLocal = (
  date
) => {
  if (!date) {
    return '-';
  }

  const parsed =
    dayjs(
      date
    );

  if (
    !parsed.isValid()
  ) {
    return '-';
  }

  return parsed.format(
    'DD.MM.YYYY'
  );
};

const formatTime = (
  date
) => {
  if (!date) {
    return '-';
  }

  return dayjs(
    date
  ).format(
    'HH:mm'
  );
};

// ======================================================
// EVENT HELPERS
// ======================================================

const getEventTypeLabel = (
  event
) => {
  if (
    event.type ===
    'meeting'
  ) {
    return 'Toplantı';
  }

  if (
    event.type ===
    'task'
  ) {
    return 'Görev';
  }

  const labels = {
    hearing:
      'Duruşma',

    meeting:
      'Toplantı',

    deadline:
      'Son Tarih',

    reminder:
      'Hatırlatma',

    other:
      'Etkinlik',
  };

  return (
    labels[
      event.event_type
    ] ||
    'Etkinlik'
  );
};

const getEventVariant = (
  event
) => {
  if (
    event.status ===
    'cancelled'
  ) {
    return 'danger';
  }

  if (
    event.status ===
    'completed'
  ) {
    return 'success';
  }

  if (
    event.type ===
    'meeting'
  ) {
    return 'primary';
  }

  if (
    event.type ===
    'task'
  ) {
    if (
      event.priority ===
      'critical'
    ) {
      return 'danger';
    }

    if (
      event.priority ===
      'high'
    ) {
      return 'warning';
    }

    return 'default';
  }

  if (
    event.event_type ===
    'hearing'
  ) {
    return 'danger';
  }

  if (
    event.event_type ===
    'deadline'
  ) {
    return 'warning';
  }

  return 'info';
};

const getEventAccent = (
  event
) => {
  if (
    event.status ===
    'cancelled'
  ) {
    return 'border-l-red-400';
  }

  if (
    event.type ===
    'meeting'
  ) {
    return 'border-l-blue-500';
  }

  if (
    event.type ===
    'task'
  ) {
    return event.priority ===
      'critical'
      ? 'border-l-red-500'
      : event.priority ===
          'high'
        ? 'border-l-amber-500'
        : 'border-l-violet-500';
  }

  if (
    event.event_type ===
    'hearing'
  ) {
    return 'border-l-red-500';
  }

  if (
    event.event_type ===
    'deadline'
  ) {
    return 'border-l-amber-500';
  }

  return 'border-l-slate-400';
};

const getEventLink = (
  event
) => {
  if (
    event.type ===
    'meeting'
  ) {
    return `/meetings/${event.source_id}`;
  }

  if (
    event.type ===
    'task'
  ) {
    return `/tasks/${event.source_id}`;
  }

  return `/events/${
    event.source_id ||
    event.id
  }`;
};

// ======================================================
// COMPONENT
// ======================================================

const Calendar = () => {
  const [
    currentDate,
    setCurrentDate,
  ] =
    useState(
      dayjs()
    );

  const [
    view,
    setView,
  ] =
    useState(
      'month'
    );

  const year =
    currentDate.year();

  const month =
    currentDate.month() +
    1;

  // ====================================================
  // QUERIES
  // ====================================================

  const {
    data:
      eventsData,

    isLoading:
      eventsLoading,

    error:
      eventsError,
  } =
    useQuery({
      queryKey: [
        'calendar-events',
        year,
        month,
      ],

      queryFn: () =>
        eventApi.getCalendarEvents({
          year,
          month,
        }),
    });

  const {
    data:
      meetingsData,

    isLoading:
      meetingsLoading,

    error:
      meetingsError,
  } =
    useQuery({
      queryKey: [
        'calendar-meetings',
        year,
        month,
      ],

      queryFn: () =>
        meetingApi.getAll({
          page: 1,
          limit: 100,
        }),
    });

  const isLoading =
    eventsLoading ||
    meetingsLoading;

  // ====================================================
  // DATA
  // ====================================================

  const events =
    Array.isArray(
      eventsData
        ?.data
        ?.data
    )
      ? eventsData
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

  /*
   * Meeting endpoint'i şu an doğrudan ay filtresi almıyor.
   * Bu nedenle gelen kayıtları frontend'de seçili aya süzüyoruz.
   */
  const monthMeetings =
    useMemo(
      () =>
        meetings.filter(
          (
            meeting
          ) => {
            const date =
              dayjs(
                meeting.start_date
              );

            return (
              date.year() ===
                year &&
              date.month() +
                1 ===
                month
            );
          }
        ),
      [
        meetings,
        year,
        month,
      ]
    );

  const allEvents =
    useMemo(
      () => [
        ...events,

        ...monthMeetings.map(
          (
            meeting
          ) => ({
            id:
              `meeting-${meeting.id}`,

            source_id:
              meeting.id,

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

            location:
              meeting.location,

            case_id:
              meeting.case_id,

            case_title:
              meeting.case
                ?.title ||
              null,

            client_id:
              meeting.client_id,

            client_name:
              meeting.client
                ?.name ||
              null,
          })
        ),
      ],
      [
        events,
        monthMeetings,
      ]
    );

  // ====================================================
  // CALENDAR CALCULATIONS
  // ====================================================

  const getEventsForDay =
    (
      date
    ) => {
      return allEvents
        .filter(
          (
            event
          ) =>
            dayjs(
              event.start
            ).isSame(
              date,
              'day'
            )
        )
        .sort(
          (
            first,
            second
          ) =>
            dayjs(
              first.start
            ).valueOf() -
            dayjs(
              second.start
            ).valueOf()
        );
    };

  const monthDays =
    useMemo(
      () => {
        const result =
          [];

        const start =
          currentDate.startOf(
            'month'
          );

        /*
         * dayjs day():
         * Pazar = 0
         * Pazartesi = 1
         *
         * Takvim Pazartesi başladığı için dönüştürüyoruz.
         */
        const leadingDays =
          (
            start.day() +
            6
          ) %
          7;

        for (
          let index = 0;
          index <
          leadingDays;
          index += 1
        ) {
          result.push(
            null
          );
        }

        const dayCount =
          currentDate.daysInMonth();

        for (
          let day = 1;
          day <=
          dayCount;
          day += 1
        ) {
          result.push(
            currentDate.date(
              day
            )
          );
        }

        /*
         * Son satırı 7 güne tamamla.
         */
        while (
          result.length %
            7 !==
          0
        ) {
          result.push(
            null
          );
        }

        return result;
      },
      [
        currentDate,
      ]
    );

  const weekDays =
    useMemo(
      () => {
        /*
         * Pazartesi başlangıcı.
         */
        const dayIndex =
          (
            currentDate.day() +
            6
          ) %
          7;

        const monday =
          currentDate.subtract(
            dayIndex,
            'day'
          );

        return Array.from(
          {
            length: 7,
          },
          (
            _,
            index
          ) =>
            monday.add(
              index,
              'day'
            )
        );
      },
      [
        currentDate,
      ]
    );

  const todayEvents =
    useMemo(
      () =>
        getEventsForDay(
          dayjs()
        ),
      [
        allEvents,
      ]
    );

  const selectedDayEvents =
    useMemo(
      () =>
        getEventsForDay(
          currentDate
        ),
      [
        allEvents,
        currentDate,
      ]
    );

  // ====================================================
  // STATISTICS
  // ====================================================

  const hearingCount =
    events.filter(
      (
        event
      ) =>
        event.event_type ===
        'hearing'
    ).length;

  const meetingCount =
    monthMeetings.length;

  const taskCount =
    events.filter(
      (
        event
      ) =>
        event.type ===
        'task'
    ).length;

  const emptyCount =
    useMemo(
      () => {
        let count =
          0;

        const daysInMonth =
          currentDate.daysInMonth();

        for (
          let day = 1;
          day <=
          daysInMonth;
          day += 1
        ) {
          if (
            getEventsForDay(
              currentDate.date(
                day
              )
            ).length ===
            0
          ) {
            count +=
              1;
          }
        }

        return count;
      },
      [
        allEvents,
        currentDate,
      ]
    );

  // ====================================================
  // NAVIGATION
  // ====================================================

  const navigatePrevious =
    () => {
      if (
        view ===
        'day'
      ) {
        setCurrentDate(
          (
            current
          ) =>
            current.subtract(
              1,
              'day'
            )
        );

        return;
      }

      if (
        view ===
        'week'
      ) {
        setCurrentDate(
          (
            current
          ) =>
            current.subtract(
              1,
              'week'
            )
        );

        return;
      }

      setCurrentDate(
        (
          current
        ) =>
          current.subtract(
            1,
            'month'
          )
      );
    };

  const navigateNext =
    () => {
      if (
        view ===
        'day'
      ) {
        setCurrentDate(
          (
            current
          ) =>
            current.add(
              1,
              'day'
            )
        );

        return;
      }

      if (
        view ===
        'week'
      ) {
        setCurrentDate(
          (
            current
          ) =>
            current.add(
              1,
              'week'
            )
        );

        return;
      }

      setCurrentDate(
        (
          current
        ) =>
          current.add(
            1,
            'month'
          )
      );
    };

  const getPeriodTitle =
    () => {
      if (
        view ===
        'day'
      ) {
        return currentDate.format(
          'D MMMM YYYY'
        );
      }

      if (
        view ===
        'week'
      ) {
        const start =
          weekDays[0];

        const end =
          weekDays[6];

        if (
          start.month() ===
          end.month()
        ) {
          return `${start.format(
            'D'
          )} – ${end.format(
            'D MMMM YYYY'
          )}`;
        }

        return `${start.format(
          'D MMM'
        )} – ${end.format(
          'D MMM YYYY'
        )}`;
      }

      return currentDate.format(
        'MMMM YYYY'
      );
    };

  // ====================================================
  // EVENT ITEM
  // ====================================================

  const renderEventItem =
    (
      event,
      compact = false
    ) => (
      <Link
        key={
          event.id
        }
        to={
          getEventLink(
            event
          )
        }
        className={`
          block
          border-l-2
          ${getEventAccent(
            event
          )}
          rounded-md
          bg-gray-50
          transition
          hover:bg-gray-100
          dark:bg-white/[0.035]
          dark:hover:bg-white/[0.06]
          ${
            compact
              ? 'px-2 py-1.5'
              : 'px-3 py-2.5'
          }
        `}
      >
        <div className="flex items-center gap-2">

          {!compact && (
            <span className="shrink-0 text-[10px] font-semibold text-gray-400 dark:text-slate-500">
              {formatTime(
                event.start
              )}
            </span>
          )}

          <span
            className={`
              min-w-0
              flex-1
              truncate
              font-medium
              text-gray-800
              dark:text-slate-200
              ${
                compact
                  ? 'text-[11px]'
                  : 'text-sm'
              }
            `}
          >
            {event.title}
          </span>

        </div>
      </Link>
    );

  // ====================================================
  // LOADING
  // ====================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader text="Takvim hazırlanıyor..." />
      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (
    eventsError ||
    meetingsError
  ) {
    return (
      <div
        className="
          rounded-2xl
          border
          border-red-200
          bg-red-50
          px-6
          py-10
          text-center
          dark:border-red-500/15
          dark:bg-red-500/[0.04]
        "
      >
        <CalendarDays className="mx-auto h-9 w-9 text-red-400" />

        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Takvim yüklenemedi
        </h2>

        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          Takvim verileri alınırken bir hata oluştu.
        </p>
      </div>
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

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

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
              Takvim
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Duruşma, toplantı, görev ve son tarihlerinizi tek takvimde yönetin.
            </p>

          </div>

        </div>

        <div className="flex flex-wrap items-center gap-2">

          <Button
            variant="secondary"
            size="sm"
            onClick={
              navigatePrevious
            }
            aria-label="Önceki dönem"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div
            className="
              min-w-[180px]
              px-3
              text-center
              text-sm
              font-semibold
              capitalize
              text-gray-800
              dark:text-white
            "
          >
            {getPeriodTitle()}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={
              navigateNext
            }
            aria-label="Sonraki dönem"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCurrentDate(
                dayjs()
              )
            }
          >
            Bugün
          </Button>

        </div>

      </div>

      {/* ==================================================
          TOOLBAR
      ================================================== */}

      <Card>

        <Card.Body className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/[0.04]">

            {[
              {
                value:
                  'month',
                label:
                  'Ay',
              },
              {
                value:
                  'week',
                label:
                  'Hafta',
              },
              {
                value:
                  'day',
                label:
                  'Gün',
              },
            ].map(
              (
                option
              ) => (
                <button
                  key={
                    option.value
                  }
                  type="button"
                  onClick={() =>
                    setView(
                      option.value
                    )
                  }
                  className={`
                    rounded-md
                    px-4
                    py-1.5
                    text-xs
                    font-semibold
                    transition
                    ${
                      view ===
                      option.value
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-[#10294b] dark:text-white'
                        : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
                    }
                  `}
                >
                  {option.label}
                </button>
              )
            )}

          </div>

          <p className="text-xs text-gray-400 dark:text-slate-500">
            {formatDateLocal(
              new Date()
            )}
          </p>

        </Card.Body>

      </Card>

      {/* ==================================================
          STATS
      ================================================== */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

        <Card>
          <Card.Body>

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  Duruşma
                </p>

                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {hearingCount}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/[0.08] dark:text-red-400">
                <Gavel size={17} />
              </div>

            </div>

          </Card.Body>
        </Card>

        <Card>
          <Card.Body>

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  Toplantı
                </p>

                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {meetingCount}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
                <Users size={17} />
              </div>

            </div>

          </Card.Body>
        </Card>

        <Card>
          <Card.Body>

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  Görev
                </p>

                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {taskCount}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/[0.08] dark:text-violet-400">
                <CheckSquare2 size={17} />
              </div>

            </div>

          </Card.Body>
        </Card>

        <Card>
          <Card.Body>

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  Boş Gün
                </p>

                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {emptyCount}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400">
                <CalendarDays size={17} />
              </div>

            </div>

          </Card.Body>
        </Card>

      </div>

      {/* ==================================================
          MONTH VIEW
      ================================================== */}

      {view ===
        'month' && (
        <Card className="overflow-hidden">

          <div className="overflow-x-auto">

            <div className="min-w-[900px]">

              <div
                className="
                  grid
                  grid-cols-7
                  border-b
                  border-gray-100
                  bg-gray-50/70
                  dark:border-white/[0.06]
                  dark:bg-white/[0.025]
                "
              >
                {WEEK_DAYS.map(
                  (
                    day
                  ) => (
                    <div
                      key={
                        day
                      }
                      className="
                        px-3
                        py-3
                        text-center
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-[0.08em]
                        text-gray-400
                        dark:text-slate-500
                      "
                    >
                      {day}
                    </div>
                  )
                )}
              </div>

              <div className="grid grid-cols-7">

                {monthDays.map(
                  (
                    date,
                    index
                  ) => {
                    if (
                      !date
                    ) {
                      return (
                        <div
                          key={
                            `empty-${index}`
                          }
                          className="
                            min-h-[128px]
                            border-b
                            border-r
                            border-gray-100
                            bg-gray-50/30
                            dark:border-white/[0.05]
                            dark:bg-white/[0.01]
                          "
                        />
                      );
                    }

                    const dayEvents =
                      getEventsForDay(
                        date
                      );

                    const isToday =
                      date.isSame(
                        dayjs(),
                        'day'
                      );

                    return (
                      <button
                        key={
                          date.format(
                            'YYYY-MM-DD'
                          )
                        }
                        type="button"
                        onClick={() =>
                          setCurrentDate(
                            date
                          )
                        }
                        className={`
                          min-h-[128px]
                          border-b
                          border-r
                          border-gray-100
                          p-2
                          text-left
                          align-top
                          transition
                          hover:bg-gray-50
                          dark:border-white/[0.05]
                          dark:hover:bg-white/[0.02]
                          ${
                            isToday
                              ? 'bg-blue-50/40 dark:bg-blue-500/[0.025]'
                              : 'bg-white dark:bg-transparent'
                          }
                        `}
                      >
                        <div className="mb-2 flex items-center justify-between">

                          <span
                            className={`
                              flex
                              h-7
                              w-7
                              items-center
                              justify-center
                              rounded-full
                              text-xs
                              font-semibold
                              ${
                                isToday
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-600 dark:text-slate-400'
                              }
                            `}
                          >
                            {date.format(
                              'D'
                            )}
                          </span>

                          {dayEvents.length >
                            0 && (
                            <span className="text-[9px] font-semibold text-gray-400 dark:text-slate-600">
                              {
                                dayEvents.length
                              }
                            </span>
                          )}

                        </div>

                        <div className="space-y-1">

                          {dayEvents
                            .slice(
                              0,
                              3
                            )
                            .map(
                              (
                                event
                              ) =>
                                renderEventItem(
                                  event,
                                  true
                                )
                            )}

                          {dayEvents.length >
                            3 && (
                            <p className="px-2 pt-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                              +
                              {dayEvents.length -
                                3}{' '}
                              etkinlik
                            </p>
                          )}

                        </div>

                      </button>
                    );
                  }
                )}

              </div>

            </div>

          </div>

        </Card>
      )}

      {/* ==================================================
          WEEK VIEW
      ================================================== */}

      {view ===
        'week' && (
        <div className="grid gap-3 lg:grid-cols-7">

          {weekDays.map(
            (
              date
            ) => {
              const dayEvents =
                getEventsForDay(
                  date
                );

              const isToday =
                date.isSame(
                  dayjs(),
                  'day'
                );

              return (
                <Card
                  key={
                    date.format(
                      'YYYY-MM-DD'
                    )
                  }
                  className={
                    isToday
                      ? 'ring-1 ring-blue-500/40'
                      : ''
                  }
                >
                  <Card.Body className="p-3">

                    <div className="mb-4 text-center">

                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                        {date.format(
                          'ddd'
                        )}
                      </p>

                      <p
                        className={`
                          mx-auto
                          mt-1
                          flex
                          h-8
                          w-8
                          items-center
                          justify-center
                          rounded-full
                          text-sm
                          font-semibold
                          ${
                            isToday
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-900 dark:text-white'
                          }
                        `}
                      >
                        {date.format(
                          'D'
                        )}
                      </p>

                    </div>

                    {dayEvents.length ===
                    0 ? (
                      <p className="py-5 text-center text-[10px] text-gray-400 dark:text-slate-600">
                        Etkinlik yok
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {dayEvents.map(
                          (
                            event
                          ) =>
                            renderEventItem(
                              event,
                              true
                            )
                        )}
                      </div>
                    )}

                  </Card.Body>
                </Card>
              );
            }
          )}

        </div>
      )}

      {/* ==================================================
          DAY VIEW
      ================================================== */}

      {view ===
        'day' && (
        <Card>

          <Card.Header>

            <div className="flex items-center justify-between gap-4">

              <div>

                <h2 className="font-semibold capitalize text-gray-900 dark:text-white">
                  {currentDate.format(
                    'D MMMM YYYY, dddd'
                  )}
                </h2>

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  {selectedDayEvents.length}{' '}
                  etkinlik
                </p>

              </div>

              <CalendarDays className="h-5 w-5 text-gray-400 dark:text-slate-500" />

            </div>

          </Card.Header>

          <Card.Body>

            {selectedDayEvents.length ===
            0 ? (
              <div className="py-12 text-center">

                <CalendarDays className="mx-auto h-9 w-9 text-gray-300 dark:text-slate-700" />

                <p className="mt-3 text-sm font-medium text-gray-700 dark:text-slate-300">
                  Bu gün için etkinlik yok
                </p>

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  Takvimde planlanmış bir duruşma, toplantı veya görev bulunmuyor.
                </p>

              </div>
            ) : (
              <div className="space-y-2">

                {selectedDayEvents.map(
                  (
                    event
                  ) =>
                    renderEventItem(
                      event
                    )
                )}

              </div>
            )}

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          TODAY
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="flex items-center justify-between gap-4">

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Bugünün Programı
              </h2>

              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                {formatDateLocal(
                  new Date()
                )}
                {' · '}
                {todayEvents.length}{' '}
                etkinlik
              </p>

            </div>

            <Clock3 className="h-5 w-5 text-gray-400 dark:text-slate-500" />

          </div>

        </Card.Header>

        <Card.Body>

          {todayEvents.length ===
          0 ? (
            <div className="py-8 text-center">

              <CalendarDays className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-700" />

              <p className="mt-3 text-sm font-medium text-gray-700 dark:text-slate-300">
                Bugün planlanmış etkinlik yok
              </p>

              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                Bugünkü çalışma programınız boş görünüyor.
              </p>

            </div>
          ) : (
            <div className="space-y-2">

              {todayEvents.map(
                (
                  event
                ) => (
                  <Link
                    key={
                      event.id
                    }
                    to={
                      getEventLink(
                        event
                      )
                    }
                    className="
                      flex
                      flex-col
                      gap-3
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
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >

                    <div className="flex min-w-0 items-start gap-3">

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
                        {formatTime(
                          event.start
                        )}
                      </div>

                      <div className="min-w-0">

                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {event.title}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-400">

                          <span>
                            {getEventTypeLabel(
                              event
                            )}
                          </span>

                          {event.case_title && (
                            <span className="inline-flex items-center gap-1">
                              <BriefcaseBusiness size={12} />
                              {event.case_title}
                            </span>
                          )}

                          {event.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} />
                              {event.location}
                            </span>
                          )}

                        </div>

                      </div>

                    </div>

                    <div className="flex items-center gap-2">

                      <Badge
                        variant={
                          getEventVariant(
                            event
                          )
                        }
                      >
                        {getEventTypeLabel(
                          event
                        )}
                      </Badge>

                      <ArrowRight className="h-4 w-4 text-gray-300 dark:text-slate-600" />

                    </div>

                  </Link>
                )
              )}

            </div>
          )}

        </Card.Body>

      </Card>

    </div>
  );
};

export default Calendar;