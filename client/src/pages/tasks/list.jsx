import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  useTasks,
} from '../../features/tasks/task.query.js';

import {
  useDebounce,
} from '../../hooks/useDebounce.js';

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
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckSquare2,
  Clock3,
  Filter,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';

// ======================================================
// SABİTLER
// ======================================================

const STATUS_OPTIONS = [
  {
    value: '',
    label: 'Tüm Durumlar',
  },
  {
    value: 'pending',
    label: 'Bekliyor',
  },
  {
    value: 'in_progress',
    label: 'Devam Ediyor',
  },
  {
    value: 'completed',
    label: 'Tamamlananlar',
  },
  {
    value: 'cancelled',
    label: 'İptal',
  },
];

const PRIORITY_OPTIONS = [
  {
    value: '',
    label: 'Tüm Öncelikler',
  },
  {
    value: 'low',
    label: 'Düşük',
  },
  {
    value: 'normal',
    label: 'Normal',
  },
  {
    value: 'high',
    label: 'Yüksek',
  },
  {
    value: 'critical',
    label: 'Kritik',
  },
];

const PRIORITY_LABELS = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  critical: 'Kritik',
};

// ======================================================
// STATUS HELPERS
// ======================================================

const getTaskDisplayStatus = (
  task
) => {
  if (
    task?.status ===
      'completed' &&
    !task?.approved_at
  ) {
    return {
      label:
        'Onay Bekliyor',

      variant:
        'warning',
    };
  }

  if (
    task?.status ===
      'completed' &&
    task?.approved_at
  ) {
    return {
      label:
        'Tamamlandı',

      variant:
        'success',
    };
  }

  switch (
    task?.status
  ) {
    case 'pending':
      return {
        label:
          'Bekliyor',

        variant:
          'warning',
      };

    case 'in_progress':
      return {
        label:
          'Devam Ediyor',

        variant:
          'info',
      };

    case 'cancelled':
      return {
        label:
          'İptal',

        variant:
          'danger',
      };

    default:
      return {
        label:
          task?.status ||
          'Bilinmiyor',

        variant:
          'default',
      };
  }
};

const getPriorityVariant = (
  priority
) => {
  const variants = {
    critical:
      'danger',

    high:
      'warning',

    normal:
      'primary',

    low:
      'default',
  };

  return (
    variants[
      priority
    ] ||
    'default'
  );
};

// ======================================================
// DATE HELPERS
// ======================================================

const formatDateTime = (
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

// ======================================================
// USER HELPERS
// ======================================================

const getUserName = (
  person,
  fallback = 'Atanmadı'
) => {
  if (!person) {
    return fallback;
  }

  const fullName = [
    person.first_name,
    person.last_name,
  ]
    .filter(
      Boolean
    )
    .join(' ')
    .trim();

  return (
    fullName ||
    fallback
  );
};

const getUserInitials = (
  person
) => {
  if (!person) {
    return '?';
  }

  const first =
    person
      ?.first_name
      ?.[0] ||
    '';

  const last =
    person
      ?.last_name
      ?.[0] ||
    '';

  return (
    `${first}${last}`.toUpperCase() ||
    '?'
  );
};

const getCaseDisplayName = (
  caseItem
) => {
  if (
    !caseItem
  ) {
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

const getTaskAssignees = (
  task
) => {
  if (
    Array.isArray(
      task?.assignees
    )
  ) {
    return task.assignees;
  }

  /*
   * Geçiş döneminde backend'den eski assignee alanı
   * gelirse ekran tamamen boş kalmasın.
   *
   * Yeni sistemin ana alanı task.assignees[].
   */
  if (
    task?.assignee
  ) {
    return [
      task.assignee,
    ];
  }

  return [];
};

// ======================================================
// COMPONENT
// ======================================================

const TasksList = () => {
  const {
    user,
  } =
    useAuth();

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
    priorityFilter,
    setPriorityFilter,
  ] =
    useState('');

  const [
    page,
    setPage,
  ] =
    useState(1);

  // ====================================================
  // PERMISSIONS
  // ====================================================

  const canCreateTask =
    hasPermission(
      user,
      PERMISSION_KEYS.CREATE_TASKS
    );

  const canApproveTask =
    hasPermission(
      user,
      PERMISSION_KEYS.APPROVE_TASKS
    );

  const canViewCases =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_CASES
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
    useTasks({
      page,

      search:
        debouncedSearch,

      status:
        statusFilter,

      priority:
        priorityFilter,
    });

  const tasks =
    Array.isArray(
      data?.data
        ?.data
    )
      ? data.data.data
      : [];

  const pagination =
    data?.data
      ?.pagination;

  // ====================================================
  // DERIVED DATA
  // ====================================================

  const enrichedTasks =
    useMemo(
      () =>
        tasks.map(
          (
            task
          ) => {
            const displayStatus =
              getTaskDisplayStatus(
                task
              );

            const dueDate =
              task.due_date
                ? new Date(
                    task.due_date
                  )
                : null;

            const isOverdue =
              Boolean(
                dueDate
              ) &&
              dueDate <
                new Date() &&
              ![
                'completed',
                'cancelled',
              ].includes(
                task.status
              );

            const assignees =
              getTaskAssignees(
                task
              );

            return {
              ...task,
              assignees,
              displayStatus,
              isOverdue,
            };
          }
        ),
      [
        tasks,
      ]
    );

  const awaitingApprovalCount =
    useMemo(
      () =>
        enrichedTasks.filter(
          (
            task
          ) =>
            task.status ===
              'completed' &&
            !task.approved_at
        ).length,
      [
        enrichedTasks,
      ]
    );

  const hasFilters =
    Boolean(
      search ||
      statusFilter ||
      priorityFilter
    );

  // ====================================================
  // HANDLERS
  // ====================================================

  const handleStatusChange =
    (
      event
    ) => {
      setStatusFilter(
        event.target.value
      );

      setPage(
        1
      );
    };

  const handlePriorityChange =
    (
      event
    ) => {
      setPriorityFilter(
        event.target.value
      );

      setPage(
        1
      );
    };

  const handleClearFilters =
    () => {
      setSearch('');
      setStatusFilter('');
      setPriorityFilter('');
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
        <Loader text="Görevler yükleniyor..." />
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
        title="Görevler yüklenemedi"
        message="Görev kayıtları alınırken bir hata oluştu."
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
              bg-amber-50
              text-amber-600
              dark:bg-amber-500/[0.08]
              dark:text-amber-400
            "
          >
            <CheckSquare2 size={21} />
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
              Görevler
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
              Atanan işleri, ilerleme durumlarını,
              son tarihleri ve yönetici onay süreçlerini takip edin.
            </p>

            {pagination?.total !==
              undefined && (
              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                Toplam{' '}
                <span className="font-semibold text-gray-600 dark:text-slate-300">
                  {pagination.total}
                </span>{' '}
                görev
              </p>
            )}

          </div>

        </div>

        {canCreateTask && (
          <Link to="/tasks/create">
            <Button>
              <Plus className="h-4 w-4" />
              Yeni Görev
            </Button>
          </Link>
        )}

      </div>

      {/* ==================================================
          ADMIN APPROVAL NOTICE
      ================================================== */}

      {canApproveTask &&
        awaitingApprovalCount >
          0 && (
          <div
            className="
              rounded-2xl
              border
              border-amber-200/80
              bg-amber-50/60
              p-4
              dark:border-amber-500/15
              dark:bg-amber-500/[0.04]
            "
          >
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
                  bg-amber-100
                  text-amber-600
                  dark:bg-amber-500/[0.08]
                  dark:text-amber-400
                "
              >
                <Clock3 size={17} />
              </div>

              <div>

                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Yönetici onayı bekleyen görevler var
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-800/80 dark:text-amber-300/80">
                  Bu listede{' '}
                  <strong>
                    {
                      awaitingApprovalCount
                    }
                  </strong>{' '}
                  görev çalışan tarafından tamamlandı ve incelemenizi bekliyor.
                </p>

              </div>

            </div>
          </div>
        )}

      {/* ==================================================
          FILTERS
      ================================================== */}

      <Card>

        <Card.Body>

          <div className="flex flex-col gap-3 xl:flex-row">

            {/* SEARCH */}

            <div className="flex flex-1 flex-col gap-2 sm:flex-row">

              <Input
                placeholder="Görev adı veya açıklamada ara..."
                value={
                  search
                }
                onChange={(
                  event
                ) => {
                  setSearch(
                    event.target.value
                  );

                  setPage(
                    1
                  );
                }}
                icon={
                  <Search size={16} />
                }
              />

            </div>

            {/* FILTERS */}

            <div className="flex flex-col gap-2 sm:flex-row">

              <div className="relative min-w-[190px]">

                <Filter
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

                <select
                  value={
                    statusFilter
                  }
                  onChange={
                    handleStatusChange
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
                    shadow-sm
                    outline-none
                    transition
                    hover:border-gray-300
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                    dark:hover:border-white/[0.14]
                    dark:focus:border-blue-500/60
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
                        {status.label}
                      </option>
                    )
                  )}
                </select>

              </div>

              <div className="min-w-[190px]">

                <select
                  value={
                    priorityFilter
                  }
                  onChange={
                    handlePriorityChange
                  }
                  className="
                    h-10
                    w-full
                    rounded-lg
                    border
                    border-gray-200
                    bg-white
                    px-3.5
                    text-sm
                    text-gray-700
                    shadow-sm
                    outline-none
                    transition
                    hover:border-gray-300
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                    dark:hover:border-white/[0.14]
                    dark:focus:border-blue-500/60
                  "
                >
                  {PRIORITY_OPTIONS.map(
                    (
                      priority
                    ) => (
                      <option
                        key={
                          priority.value
                        }
                        value={
                          priority.value
                        }
                      >
                        {priority.label}
                      </option>
                    )
                  )}
                </select>

              </div>

              {hasFilters && (
                <Button
                  variant="ghost"
                  onClick={
                    handleClearFilters
                  }
                >
                  <X className="h-4 w-4" />
                  Temizle
                </Button>
              )}

            </div>

          </div>

          {isFetching && (
            <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
              Liste güncelleniyor...
            </p>
          )}

        </Card.Body>

      </Card>

      {/* ==================================================
          EMPTY / TABLE
      ================================================== */}

      {enrichedTasks.length ===
      0 ? (
        <Empty
          icon={
            CheckSquare2
          }
          title={
            hasFilters
              ? 'Eşleşen görev bulunamadı'
              : 'Henüz görev bulunmuyor'
          }
          description={
            hasFilters
              ? 'Arama veya filtre kriterlerini değiştirerek tekrar deneyin.'
              : 'Yeni görev oluşturarak iş takibine başlayabilirsiniz.'
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={
                  handleClearFilters
                }
              >
                Filtreleri Temizle
              </Button>
            ) : canCreateTask ? (
              <Link to="/tasks/create">
                <Button>
                  <Plus className="h-4 w-4" />
                  İlk Görevi Oluştur
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
                  Görev
                </Table.HeadCell>

                <Table.HeadCell>
                  Atananlar
                </Table.HeadCell>

                <Table.HeadCell>
                  Dava
                </Table.HeadCell>

                <Table.HeadCell>
                  Öncelik
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

                <Table.HeadCell className="text-right">
                  İşlem
                </Table.HeadCell>

              </Table.Row>

            </Table.Head>

            <Table.Body>

              {enrichedTasks.map(
                (
                  task
                ) => (
                  <Table.Row
                    key={
                      task.id
                    }
                  >

                    {/* TASK */}

                    <Table.Cell>

                      <div className="min-w-[16rem]">

                        <Link
                          to={`/tasks/${task.id}`}
                          className="
                            font-semibold
                            text-gray-900
                            transition
                            hover:text-blue-600
                            dark:text-white
                            dark:hover:text-blue-400
                          "
                        >
                          {task.title}
                        </Link>

                        {task.description && (
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
                              task.description
                            }
                          >
                            {task.description}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap gap-1.5">

                          {task.isOverdue && (
                            <Badge
                              variant="danger"
                              dot
                            >
                              Gecikti
                            </Badge>
                          )}

                          {task.approved_at && (
                            <Badge
                              variant="success"
                              dot
                            >
                              Onaylandı
                            </Badge>
                          )}

                        </div>

                      </div>

                    </Table.Cell>

                    {/* ASSIGNEES */}

                    <Table.Cell>

                      {task.assignees.length ===
                      0 ? (
                        <span className="text-sm text-gray-400 dark:text-slate-600">
                          Atanmadı
                        </span>
                      ) : task.assignees.length ===
                        1 ? (
                        <div className="flex min-w-[150px] items-center gap-2">

                          <div
                            className="
                              flex
                              h-7
                              w-7
                              shrink-0
                              items-center
                              justify-center
                              rounded-full
                              bg-blue-50
                              text-[9px]
                              font-bold
                              text-blue-700
                              dark:bg-blue-500/[0.1]
                              dark:text-blue-300
                            "
                          >
                            {getUserInitials(
                              task.assignees[0]
                            )}
                          </div>

                          <span className="whitespace-nowrap text-sm text-gray-700 dark:text-slate-300">
                            {getUserName(
                              task.assignees[0]
                            )}
                          </span>

                        </div>
                      ) : (
                        <div className="min-w-[180px]">

                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400">
                            <Users className="h-3.5 w-3.5" />

                            {
                              task.assignees.length
                            }{' '}
                            kişi
                          </div>

                          <div className="mt-2 flex max-w-[240px] flex-wrap gap-1.5">

                            {task.assignees
                              .slice(
                                0,
                                3
                              )
                              .map(
                                (
                                  person
                                ) => (
                                  <span
                                    key={
                                      person.id
                                    }
                                    title={
                                      getUserName(
                                        person
                                      )
                                    }
                                    className="
                                      inline-flex
                                      max-w-[130px]
                                      items-center
                                      gap-1.5
                                      rounded-full
                                      border
                                      border-gray-200
                                      bg-gray-50
                                      px-2
                                      py-1
                                      text-[10px]
                                      font-medium
                                      text-gray-600
                                      dark:border-white/[0.07]
                                      dark:bg-white/[0.03]
                                      dark:text-slate-300
                                    "
                                  >

                                    <span
                                      className="
                                        flex
                                        h-4
                                        w-4
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-full
                                        bg-blue-100
                                        text-[7px]
                                        font-bold
                                        text-blue-700
                                        dark:bg-blue-500/[0.12]
                                        dark:text-blue-300
                                      "
                                    >
                                      {getUserInitials(
                                        person
                                      )}
                                    </span>

                                    <span className="truncate">
                                      {getUserName(
                                        person
                                      )}
                                    </span>

                                  </span>
                                )
                              )}

                            {task.assignees.length >
                              3 && (
                              <span
                                className="
                                  inline-flex
                                  items-center
                                  rounded-full
                                  border
                                  border-gray-200
                                  bg-gray-50
                                  px-2
                                  py-1
                                  text-[10px]
                                  font-semibold
                                  text-gray-500
                                  dark:border-white/[0.07]
                                  dark:bg-white/[0.03]
                                  dark:text-slate-400
                                "
                              >
                                +
                                {task.assignees.length -
                                  3}
                              </span>
                            )}

                          </div>

                        </div>
                      )}

                    </Table.Cell>

                    {/* CASE */}

                    <Table.Cell>

                      {task.case ? (
                        canViewCases ? (
                          <Link
                            to={`/cases/${task.case.id}`}
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
                                task.case
                              )
                            }
                          >
                            {getCaseDisplayName(
                              task.case
                            )}
                          </Link>
                        ) : (
                          <span
                            className="
                              block
                              max-w-[14rem]
                              truncate
                              text-sm
                              text-gray-600
                              dark:text-slate-400
                            "
                            title={
                              getCaseDisplayName(
                                task.case
                              )
                            }
                          >
                            {getCaseDisplayName(
                              task.case
                            )}
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400 dark:text-slate-600">
                          -
                        </span>
                      )}

                    </Table.Cell>

                    {/* PRIORITY */}

                    <Table.Cell>

                      <Badge
                        variant={
                          getPriorityVariant(
                            task.priority
                          )
                        }
                        dot
                      >
                        {PRIORITY_LABELS[
                          task.priority
                        ] ||
                          task.priority}
                      </Badge>

                    </Table.Cell>

                    {/* STATUS */}

                    <Table.Cell>

                      <Badge
                        variant={
                          task
                            .displayStatus
                            .variant
                        }
                        dot
                      >
                        {
                          task
                            .displayStatus
                            .label
                        }
                      </Badge>

                    </Table.Cell>

                    {/* PROGRESS */}

                    <Table.Cell>

                      <div className="min-w-[110px]">

                        <div className="mb-1.5 flex items-center justify-between">

                          <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">
                            İlerleme
                          </span>

                          <span className="text-[10px] font-semibold text-gray-600 dark:text-slate-300">
                            {task.progress ||
                              0}
                            %
                          </span>

                        </div>

                        <div
                          className="
                            h-1.5
                            overflow-hidden
                            rounded-full
                            bg-gray-100
                            dark:bg-white/[0.05]
                          "
                        >
                          <div
                            className={`
                              h-full
                              rounded-full
                              transition-all
                              ${
                                task.status ===
                                  'completed'
                                  ? 'bg-emerald-500'
                                  : task.isOverdue
                                    ? 'bg-red-500'
                                    : 'bg-blue-500'
                              }
                            `}
                            style={{
                              width:
                                `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    Number(
                                      task.progress
                                    ) ||
                                      0
                                  )
                                )}%`,
                            }}
                          />
                        </div>

                      </div>

                    </Table.Cell>

                    {/* DUE DATE */}

                    <Table.Cell>

                      {task.due_date ? (
                        <div className="flex items-center gap-2 whitespace-nowrap">

                          {task.isOverdue ? (
                            <AlertTriangle
                              size={14}
                              className="text-red-500"
                            />
                          ) : (
                            <Clock3
                              size={14}
                              className="text-gray-400 dark:text-slate-500"
                            />
                          )}

                          <span
                            className={`
                              text-xs
                              ${
                                task.isOverdue
                                  ? 'font-semibold text-red-600 dark:text-red-400'
                                  : 'text-gray-500 dark:text-slate-400'
                              }
                            `}
                          >
                            {formatDateTime(
                              task.due_date
                            )}
                          </span>

                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-600">
                          -
                        </span>
                      )}

                    </Table.Cell>

                    {/* ACTION */}

                    <Table.Cell className="text-right">

                      <Link
                        to={`/tasks/${task.id}`}
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
                  görev
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

                  <span className="min-w-[70px] text-center text-xs font-semibold text-gray-600 dark:text-slate-400">
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

export default TasksList;