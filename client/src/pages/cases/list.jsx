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

import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  FilterX,
  Plus,
  Search,
  Scale,
  UserRound,
} from 'lucide-react';

import caseApi from '../../features/cases/case.api.js';

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

// ======================================================
// CONSTANTS
// ======================================================

const STATUSES = [
  {
    value: '',
    label: 'Tüm Durumlar',
  },
  {
    value: 'preparation',
    label: 'Hazırlık',
  },
  {
    value: 'active',
    label: 'Devam Ediyor',
  },
  {
    value: 'hearing',
    label: 'Duruşmada',
  },
  {
    value: 'appeal',
    label: 'İstinaf',
  },
  {
    value: 'cassation',
    label: 'Temyiz',
  },
  {
    value: 'suspended',
    label: 'Durduruldu',
  },
  {
    value: 'concluded',
    label: 'Sonuçlandı',
  },
  {
    value: 'archived',
    label: 'Arşivlendi',
  },
];

const PRIORITIES = [
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

// ======================================================
// HELPERS
// ======================================================

const getStatusLabel = (
  status
) => {
  return (
    STATUSES.find(
      (
        item
      ) =>
        item.value ===
        status
    )?.label ||
    status ||
    '-'
  );
};

const getStatusVariant = (
  status
) => {
  const variants = {
    preparation:
      'warning',

    active:
      'success',

    hearing:
      'info',

    appeal:
      'warning',

    cassation:
      'default',

    suspended:
      'warning',

    concluded:
      'default',

    archived:
      'danger',
  };

  return (
    variants[status] ||
    'default'
  );
};

const getPriorityLabel = (
  priority
) => {
  return (
    PRIORITIES.find(
      (
        item
      ) =>
        item.value ===
        priority
    )?.label ||
    priority ||
    'Normal'
  );
};

const getPriorityVariant = (
  priority
) => {
  const variants = {
    low:
      'default',

    normal:
      'primary',

    high:
      'warning',

    critical:
      'danger',
  };

  return (
    variants[priority] ||
    'default'
  );
};

const getAssigneeName = (
  caseItem
) => {
  const assignee =
    caseItem?.assignee;

  if (
    !assignee
  ) {
    return null;
  }

  const fullName =
    [
      assignee.first_name,
      assignee.last_name,
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
    null
  );
};

// ======================================================
// COMPONENT
// ======================================================

const CasesList = () => {
  const {
    user,
  } =
    useAuth();

  const canCreate =
    hasPermission(
      user,
      PERMISSION_KEYS.CREATE_CASES
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
    page,
    setPage,
  ] =
    useState(
      1
    );

  // ====================================================
  // QUERY
  // ====================================================

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } =
    useQuery({
      queryKey: [
        'cases',
        {
          page,

          search:
            debouncedSearch,

          status:
            statusFilter,
        },
      ],

      queryFn: () =>
        caseApi.getAll({
          page,

          search:
            debouncedSearch,

          status:
            statusFilter,
        }),

      staleTime:
        1000,

      placeholderData:
        (
          previousData
        ) =>
          previousData,
    });

  // ====================================================
  // DATA
  // ====================================================

  const cases =
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

  // ====================================================
  // RESET PAGE ON SEARCH
  // ====================================================

  useEffect(() => {
    setPage(
      1
    );
  }, [
    debouncedSearch,
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

  const clearFilters =
    () => {
      setSearch(
        ''
      );

      setStatusFilter(
        ''
      );

      setPage(
        1
      );
    };

  const hasFilters =
    Boolean(
      search.trim() ||
      statusFilter
    );

  const activeStatusLabel =
    statusFilter
      ? getStatusLabel(
          statusFilter
        )
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

        <Loader text="Davalar yükleniyor..." />

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
        title="Davalar yüklenemedi"
        message={
          error
            ?.response
            ?.data
            ?.message ||
          'Dava kayıtları alınırken bir hata oluştu.'
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
                Davalar
              </h1>

              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Büroya kayıtlı dava dosyalarını görüntüleyin ve yönetin.
              </p>

            </div>

          </div>

        </div>

        {canCreate && (
          <Link
            to="/cases/create"
          >
            <Button>
              <Plus className="h-4 w-4" />

              Yeni Dava
            </Button>
          </Link>
        )}

      </div>

      {/* ==================================================
          FILTERS
      ================================================== */}

      <Card>

        <Card.Body>

          <div className="flex flex-col gap-3 lg:flex-row">

            <div className="min-w-0 flex-1">

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
                placeholder="Dosya no, mahkeme, konu veya yargı birimi ara..."
                icon={
                  <Search size={16} />
                }
              />

            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:w-auto">

              <div className="min-w-[200px]">

                <select
                  value={
                    statusFilter
                  }
                  onChange={
                    handleStatusChange
                  }
                  disabled={
                    isFetching
                  }
                  aria-label="Dava durumuna göre filtrele"
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

              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={
                    isFetching
                  }
                  onClick={
                    clearFilters
                  }
                >
                  <FilterX className="h-4 w-4" />

                  Filtreleri Temizle
                </Button>
              )}

            </div>

          </div>

          {/* ACTIVE FILTER INFO */}

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

      {cases.length ===
      0 ? (
        <Empty
          icon={
            Scale
          }
          title={
            hasFilters
              ? 'Eşleşen dava bulunamadı'
              : 'Henüz dava kaydı yok'
          }
          description={
            hasFilters
              ? 'Arama veya durum filtresini değiştirerek tekrar deneyin.'
              : canCreate
                ? 'İlk dava kaydınızı oluşturarak dosya yönetimine başlayabilirsiniz.'
                : 'Henüz görüntüleyebileceğiniz bir dava kaydı bulunmuyor.'
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
                to="/cases/create"
              >
                <Button>
                  <Plus className="h-4 w-4" />

                  İlk Davayı Oluştur
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
                  Dosya
                </Table.HeadCell>

                <Table.HeadCell>
                  Yargı Birimi
                </Table.HeadCell>

                <Table.HeadCell>
                  Mahkeme
                </Table.HeadCell>

                <Table.HeadCell>
                  Müvekkiller
                </Table.HeadCell>

                <Table.HeadCell>
                  Sorumlu
                </Table.HeadCell>

                <Table.HeadCell>
                  Öncelik
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

              {cases.map(
                (
                  caseItem
                ) => {
                  const assigneeName =
                    getAssigneeName(
                      caseItem
                    );

                  return (
                    <Table.Row
                      key={
                        caseItem.id
                      }
                    >

                      {/* ==============================
                          FILE
                      ============================== */}

                      <Table.Cell>

                        <div className="min-w-[180px] max-w-[260px]">

                          <Link
                            to={`/cases/${caseItem.id}`}
                            className="font-semibold text-gray-900 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                          >
                            {caseItem.judiciary_type ||
                              caseItem.title ||
                              'Dava Dosyası'}
                          </Link>

                          <p className="mt-1 text-xs font-medium text-gray-400 dark:text-slate-500">
                            {caseItem.case_number ||
                              'Dosya no belirtilmemiş'}
                          </p>

                          {caseItem.subject && (
                            <p
                              className="mt-1 truncate text-xs text-gray-500 dark:text-slate-400"
                              title={
                                caseItem.subject
                              }
                            >
                              {caseItem.subject}
                            </p>
                          )}

                        </div>

                      </Table.Cell>

                      {/* ==============================
                          JUDICIARY
                      ============================== */}

                      <Table.Cell>

                        <div className="min-w-[130px] max-w-[220px]">

                          <p
                            className="truncate font-medium text-gray-700 dark:text-slate-300"
                            title={
                              caseItem.judiciary_unit ||
                              ''
                            }
                          >
                            {caseItem.judiciary_unit ||
                              '-'}
                          </p>

                        </div>

                      </Table.Cell>

                      {/* ==============================
                          COURT
                      ============================== */}

                      <Table.Cell>

                        <div className="max-w-[240px]">

                          <p
                            className="truncate text-gray-700 dark:text-slate-300"
                            title={
                              caseItem.court_name ||
                              ''
                            }
                          >
                            {caseItem.court_name ||
                              '-'}
                          </p>

                        </div>

                      </Table.Cell>

                      {/* ==============================
                          CLIENTS
                      ============================== */}

                      <Table.Cell>

                        {Array.isArray(
                          caseItem.clients
                        ) &&
                        caseItem.clients
                          .length >
                          0 ? (
                          <div className="flex max-w-[260px] flex-wrap gap-1.5">

                            {caseItem.clients
                              .slice(
                                0,
                                2
                              )
                              .map(
                                (
                                  client
                                ) => (
                                  <Link
                                    key={
                                      client.id
                                    }
                                    to={`/clients/${client.id}`}
                                    className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-blue-500/20 dark:hover:bg-blue-500/[0.05] dark:hover:text-blue-400"
                                  >
                                    {client.name}
                                  </Link>
                                )
                              )}

                            {caseItem.clients
                              .length >
                              2 && (
                              <span className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-500 dark:bg-white/[0.04] dark:text-slate-400">
                                +
                                {caseItem.clients
                                  .length -
                                  2}
                              </span>
                            )}

                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-slate-600">
                            Müvekkil yok
                          </span>
                        )}

                      </Table.Cell>

                      {/* ==============================
                          ASSIGNEE
                      ============================== */}

                      <Table.Cell>

                        {assigneeName ? (
                          <div className="flex min-w-[130px] items-center gap-2">

                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-slate-400">
                              <UserRound size={13} />
                            </div>

                            <span className="text-sm text-gray-700 dark:text-slate-300">
                              {assigneeName}

                              {String(
                                caseItem.assignee?.id
                              ) ===
                              String(
                                user?.id
                              )
                                ? ' (Ben)'
                                : ''}
                            </span>

                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-slate-600">
                            Atanmadı
                          </span>
                        )}

                      </Table.Cell>

                      {/* ==============================
                          PRIORITY
                      ============================== */}

                      <Table.Cell>

                        <Badge
                          variant={
                            getPriorityVariant(
                              caseItem.priority
                            )
                          }
                        >
                          {getPriorityLabel(
                            caseItem.priority
                          )}
                        </Badge>

                      </Table.Cell>

                      {/* ==============================
                          STATUS
                      ============================== */}

                      <Table.Cell>

                        <Badge
                          variant={
                            getStatusVariant(
                              caseItem.status
                            )
                          }
                          dot
                        >
                          {getStatusLabel(
                            caseItem.status
                          )}
                        </Badge>

                      </Table.Cell>

                      {/* ==============================
                          ACTION
                      ============================== */}

                      <Table.Cell className="text-right">

                        <Link
                          to={`/cases/${caseItem.id}`}
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
                    dava
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

export default CasesList;