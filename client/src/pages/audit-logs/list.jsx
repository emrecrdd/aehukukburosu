import {
  useEffect,
  useState,
} from 'react';

import auditLogApi from '../../features/audit-log/auditLog.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Table from '../../components/ui/Table.jsx';
import Modal from '../../components/ui/Modal.jsx';

import Loader from '../../components/shared/Loader.jsx';
import Error from '../../components/shared/Error.jsx';
import Empty from '../../components/shared/Empty.jsx';

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  Square,
  Trash2,
  X,
} from 'lucide-react';

import {
  format,
} from 'date-fns';

import {
  tr,
} from 'date-fns/locale/tr';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const ACTION_OPTIONS = [
  {
    value: '',
    label: 'Tüm İşlemler',
  },
  {
    value: 'create',
    label: 'Oluşturma',
  },
  {
    value: 'update',
    label: 'Güncelleme',
  },
  {
    value: 'delete',
    label: 'Silme',
  },
  {
    value: 'view',
    label: 'Görüntüleme',
  },
  {
    value: 'login',
    label: 'Giriş',
  },
  {
    value: 'logout',
    label: 'Çıkış',
  },
  {
    value: 'upload',
    label: 'Yükleme',
  },
  {
    value: 'download',
    label: 'İndirme',
  },
  {
    value: 'share',
    label: 'Paylaşma',
  },
];

const ENTITY_OPTIONS = [
  {
    value: '',
    label: 'Tüm Modüller',
  },
  {
    value: 'case',
    label: 'Dava',
  },
  {
    value: 'client',
    label: 'Müvekkil',
  },
  {
    value: 'task',
    label: 'Görev',
  },
  {
    value: 'event',
    label: 'Duruşma',
  },
  {
    value: 'meeting',
    label: 'Toplantı',
  },
  {
    value: 'document',
    label: 'Belge',
  },
  {
    value: 'payment',
    label: 'Ödeme',
  },
  {
    value: 'user',
    label: 'Kullanıcı',
  },
  {
    value: 'case_party',
    label: 'Taraf',
  },
  {
    value: 'notification',
    label: 'Bildirim',
  },
];

// ======================================================
// HELPERS
// ======================================================

const getActionVariant = (
  action
) => {
  const variants = {
    create: 'success',
    update: 'warning',
    delete: 'danger',
    view: 'info',
    login: 'primary',
    logout: 'default',
    upload: 'success',
    download: 'info',
    share: 'warning',
  };

  return (
    variants[action] ||
    'default'
  );
};

const getActionLabel = (
  action
) => {
  const labels = {
    create: 'Oluşturdu',
    update: 'Güncelledi',
    delete: 'Sildi',
    view: 'Görüntüledi',
    login: 'Giriş Yaptı',
    logout: 'Çıkış Yaptı',
    upload: 'Yükledi',
    download: 'İndirdi',
    share: 'Paylaştı',
  };

  return (
    labels[action] ||
    action ||
    '-'
  );
};

const getEntityLabel = (
  type
) => {
  const labels = {
    case: 'Dava',
    client: 'Müvekkil',
    task: 'Görev',
    event: 'Duruşma',
    meeting: 'Toplantı',
    document: 'Belge',
    payment: 'Ödeme',
    user: 'Kullanıcı',
    case_party: 'Taraf',
    notification: 'Bildirim',
  };

  return (
    labels[type] ||
    type ||
    '-'
  );
};

const getUserName = (
  log
) => {
  const firstName =
    log?.user?.first_name;

  const lastName =
    log?.user?.last_name;

  const fullName = [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    fullName ||
    'Sistem'
  );
};

const formatDate = (
  date
) => {
  if (!date) {
    return '-';
  }

  try {
    return format(
      new Date(date),
      'dd.MM.yyyy HH:mm',
      {
        locale: tr,
      }
    );
  } catch {
    return '-';
  }
};

// ======================================================
// COMPONENT
// ======================================================

const AuditLogList = () => {
  const {
    user,
  } =
    useAuth();

  const isAdmin =
    user?.role ===
    'admin';

  const [
    filters,
    setFilters,
  ] =
    useState({
      action: '',
      entity_type: '',
      startDate: '',
      endDate: '',
      search: '',
    });

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    selectedLog,
    setSelectedLog,
  ] =
    useState(null);

  const [
    selectedIds,
    setSelectedIds,
  ] =
    useState([]);

  const [
    logs,
    setLogs,
  ] =
    useState([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState(null);

  const [
    pagination,
    setPagination,
  ] =
    useState(null);

  const [
    isDeleting,
    setIsDeleting,
  ] =
    useState(false);

  const [
    deleteDialog,
    setDeleteDialog,
  ] =
    useState(null);

  // ====================================================
  // FETCH
  // ====================================================

  const fetchLogs =
    async () => {
      setLoading(
        true
      );

      setError(
        null
      );

      try {
        const response =
          await auditLogApi.getAll({
            ...filters,
            page,
            limit: 20,
          });

        setLogs(
          Array.isArray(
            response
              ?.data
              ?.data
          )
            ? response
                .data
                .data
            : []
        );

        setPagination(
          response
            ?.data
            ?.pagination ||
            null
        );
      } catch (
        requestError
      ) {
        console.error(
          'Audit log API error:',
          requestError
        );

        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
            requestError
              ?.message ||
            'Veri yüklenirken hata oluştu'
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  useEffect(() => {
    fetchLogs();
  }, [
    filters,
    page,
  ]);

  useEffect(() => {
    setSelectedIds(
      []
    );
  }, [
    filters,
    page,
  ]);

  // ====================================================
  // DELETE
  // ====================================================

  const handleDelete =
    (
      id
    ) => {
      if (
        !isAdmin
      ) {
        toast.error(
          'Bu işlem için yetkiniz yok'
        );

        return;
      }

      if (
        isDeleting
      ) {
        return;
      }

      setDeleteDialog({
        type:
          'single',

        id,
      });
    };

  const handleBulkDelete =
    () => {
      if (
        !isAdmin
      ) {
        toast.error(
          'Bu işlem için yetkiniz yok'
        );

        return;
      }

      if (
        selectedIds.length ===
        0
      ) {
        toast.error(
          'Silinecek logları seçin'
        );

        return;
      }

      if (
        isDeleting
      ) {
        return;
      }

      setDeleteDialog({
        type:
          'bulk',

        ids: [
          ...selectedIds,
        ],
      });
    };

  const closeDeleteDialog =
    () => {
      if (
        isDeleting
      ) {
        return;
      }

      setDeleteDialog(
        null
      );
    };

  const confirmDelete =
    async () => {
      if (
        !deleteDialog ||
        isDeleting
      ) {
        return;
      }

      try {
        setIsDeleting(
          true
        );

        if (
          deleteDialog.type ===
          'single'
        ) {
          await auditLogApi.delete(
            deleteDialog.id
          );

          toast.success(
            'Log kaydı silindi'
          );

          setSelectedIds(
            (
              current
            ) =>
              current.filter(
                (
                  selectedId
                ) =>
                  selectedId !==
                  deleteDialog.id
              )
          );
        } else {
          const ids =
            Array.isArray(
              deleteDialog.ids
            )
              ? deleteDialog.ids
                  .filter(
                    Boolean
                  )
              : [];

          if (
            ids.length ===
            0
          ) {
            setDeleteDialog(
              null
            );

            return;
          }

          await Promise.all(
            ids.map(
              (
                id
              ) =>
                auditLogApi.delete(
                  id
                )
            )
          );

          toast.success(
            `${ids.length} log kaydı silindi`
          );

          setSelectedIds(
            []
          );
        }

        setDeleteDialog(
          null
        );

        await fetchLogs();
      } catch (
        deleteError
      ) {
        toast.error(
          deleteError
            ?.response
            ?.data
            ?.message ||
          (
            deleteDialog.type ===
              'bulk'
              ? 'Loglar silinemedi'
              : 'Log silinemedi'
          )
        );
      } finally {
        setIsDeleting(
          false
        );
      }
    };

  // ====================================================
  // SELECTION
  // ====================================================

  const toggleSelect =
    (
      id
    ) => {
      setSelectedIds(
        (
          current
        ) =>
          current.includes(
            id
          )
            ? current.filter(
                (
                  selectedId
                ) =>
                  selectedId !==
                  id
              )
            : [
                ...current,
                id,
              ]
      );
    };

  const allSelected =
    logs.length >
      0 &&
    logs.every(
      (
        log
      ) =>
        selectedIds.includes(
          log.id
        )
    );

  const toggleSelectAll =
    () => {
      if (
        allSelected
      ) {
        setSelectedIds(
          []
        );

        return;
      }

      setSelectedIds(
        logs.map(
          (
            log
          ) =>
            log.id
        )
      );
    };

  // ====================================================
  // FILTERS
  // ====================================================

  const updateFilter =
    (
      name,
      value
    ) => {
      setFilters(
        (
          current
        ) => ({
          ...current,
          [name]:
            value,
        })
      );

      setPage(
        1
      );
    };

  const resetFilters =
    () => {
      setFilters({
        action: '',
        entity_type: '',
        startDate: '',
        endDate: '',
        search: '',
      });

      setPage(
        1
      );
    };

  const hasFilters =
    Boolean(
      filters.action ||
      filters.entity_type ||
      filters.startDate ||
      filters.endDate ||
      filters.search
    );

  // ====================================================
  // LOADING
  // ====================================================

  if (
    loading &&
    logs.length ===
      0
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader text="Denetim kayıtları yükleniyor..." />
      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (
    error &&
    logs.length ===
      0
  ) {
    return (
      <Error
        title="Denetim kayıtları yüklenemedi"
        message={error}
        onRetry={
          fetchLogs
        }
      />
    );
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="space-y-6">

      {/* HEADER */}

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
              bg-violet-50
              text-violet-600
              dark:bg-violet-500/[0.08]
              dark:text-violet-400
            "
          >
            <ShieldCheck size={21} />
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
              Denetim Logları
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
              Sistemde gerçekleşen işlemleri, kullanıcı aktivitelerini ve güvenlik kayıtlarını inceleyin.
            </p>

            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              Toplam{' '}
              <span className="font-semibold text-gray-600 dark:text-slate-300">
                {pagination?.total ||
                  0}
              </span>{' '}
              kayıt
            </p>

          </div>

        </div>

        <div className="flex flex-wrap gap-2">

          {isAdmin &&
            selectedIds.length >
              0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={
                  handleBulkDelete
                }
                disabled={
                  isDeleting
                }
              >
                <Trash2 className="h-4 w-4" />
                Seçilileri Sil ({selectedIds.length})
              </Button>
            )}

          <Button
            variant="secondary"
            size="sm"
            onClick={
              fetchLogs
            }
            disabled={
              loading
            }
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? 'animate-spin'
                  : ''
              }`}
            />

            Yenile
          </Button>

        </div>

      </div>

      {/* FILTERS */}

      <Card>

        <Card.Body>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">

            <div className="relative xl:col-span-4">

              <Search
                size={16}
                className="
                  pointer-events-none
                  absolute
                  left-3.5
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                  dark:text-slate-500
                "
              />

              <input
                type="search"
                value={
                  filters.search
                }
                onChange={(
                  event
                ) =>
                  updateFilter(
                    'search',
                    event.target.value
                  )
                }
                placeholder="Kullanıcı, açıklama veya işlem ara..."
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  pl-10
                  pr-3.5
                  text-sm
                  text-gray-900
                  shadow-sm
                  outline-none
                  transition
                  placeholder:text-gray-400
                  hover:border-gray-300
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                  dark:placeholder:text-slate-500
                "
              />

            </div>

            <div className="xl:col-span-2">

              <select
                value={
                  filters.action
                }
                onChange={(
                  event
                ) =>
                  updateFilter(
                    'action',
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
                  px-3.5
                  text-sm
                  text-gray-700
                  shadow-sm
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-slate-300
                "
              >
                {ACTION_OPTIONS.map(
                  (
                    option
                  ) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

            </div>

            <div className="xl:col-span-2">

              <select
                value={
                  filters.entity_type
                }
                onChange={(
                  event
                ) =>
                  updateFilter(
                    'entity_type',
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
                  px-3.5
                  text-sm
                  text-gray-700
                  shadow-sm
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-slate-300
                "
              >
                {ENTITY_OPTIONS.map(
                  (
                    option
                  ) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

            </div>

            <div className="xl:col-span-2">

              <input
                type="date"
                value={
                  filters.startDate
                }
                onChange={(
                  event
                ) =>
                  updateFilter(
                    'startDate',
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
                  shadow-sm
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-slate-300
                "
              />

            </div>

            <div className="xl:col-span-2">

              <input
                type="date"
                value={
                  filters.endDate
                }
                onChange={(
                  event
                ) =>
                  updateFilter(
                    'endDate',
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
                  shadow-sm
                  outline-none
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

          <div className="mt-3 flex items-center justify-between">

            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
              <Filter size={13} />
              Filtreler değiştiğinde liste otomatik güncellenir.
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={
                  resetFilters
                }
              >
                <X className="h-4 w-4" />
                Temizle
              </Button>
            )}

          </div>

        </Card.Body>

      </Card>

      {/* TABLE */}

      {logs.length ===
      0 ? (
        <Empty
          icon={
            Activity
          }
          title={
            hasFilters
              ? 'Eşleşen denetim kaydı bulunamadı'
              : 'Henüz denetim kaydı yok'
          }
          description={
            hasFilters
              ? 'Filtre kriterlerini değiştirerek tekrar deneyin.'
              : 'Sistem aktiviteleri oluştukça kayıtlar burada görüntülenecek.'
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={
                  resetFilters
                }
              >
                Filtreleri Temizle
              </Button>
            ) : null
          }
        />
      ) : (
        <>

          <Table>

            <Table.Head>

              <Table.Row hover={false}>

                {isAdmin && (
                  <Table.HeadCell className="w-10 text-center">

                    <button
                      type="button"
                      onClick={
                        toggleSelectAll
                      }
                      className="inline-flex"
                      aria-label="Tüm kayıtları seç"
                    >
                      {allSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </button>

                  </Table.HeadCell>
                )}

                <Table.HeadCell>
                  İşlem
                </Table.HeadCell>

                <Table.HeadCell>
                  Modül
                </Table.HeadCell>

                <Table.HeadCell>
                  Açıklama
                </Table.HeadCell>

                <Table.HeadCell>
                  Kullanıcı
                </Table.HeadCell>

                <Table.HeadCell>
                  Tarih
                </Table.HeadCell>

                <Table.HeadCell>
                  IP
                </Table.HeadCell>

                <Table.HeadCell className="text-right">
                  İşlem
                </Table.HeadCell>

              </Table.Row>

            </Table.Head>

            <Table.Body>

              {logs.map(
                (
                  log
                ) => (
                  <Table.Row
                    key={
                      log.id
                    }
                  >

                    {isAdmin && (
                      <Table.Cell className="text-center">

                        <button
                          type="button"
                          onClick={() =>
                            toggleSelect(
                              log.id
                            )
                          }
                          className="inline-flex"
                          aria-label="Kaydı seç"
                        >
                          {selectedIds.includes(
                            log.id
                          ) ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )}
                        </button>

                      </Table.Cell>
                    )}

                    <Table.Cell>

                      <Badge
                        variant={
                          getActionVariant(
                            log.action
                          )
                        }
                        dot
                      >
                        {getActionLabel(
                          log.action
                        )}
                      </Badge>

                    </Table.Cell>

                    <Table.Cell>

                      <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                        {getEntityLabel(
                          log.entity_type
                        )}
                      </span>

                    </Table.Cell>

                    <Table.Cell>

                      <p
                        className="
                          max-w-[320px]
                          truncate
                          text-sm
                          text-gray-600
                          dark:text-slate-400
                        "
                        title={
                          log.description ||
                          ''
                        }
                      >
                        {log.description ||
                          '-'}
                      </p>

                    </Table.Cell>

                    <Table.Cell>

                      <div className="min-w-[130px]">

                        <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                          {getUserName(
                            log
                          )}
                        </p>

                        {log.user?.email && (
                          <p className="mt-0.5 max-w-[180px] truncate text-[10px] text-gray-400 dark:text-slate-500">
                            {log.user.email}
                          </p>
                        )}

                      </div>

                    </Table.Cell>

                    <Table.Cell>

                      <span className="whitespace-nowrap text-xs text-gray-500 dark:text-slate-500">
                        {formatDate(
                          log.created_at
                        )}
                      </span>

                    </Table.Cell>

                    <Table.Cell>

                      <code className="whitespace-nowrap text-[11px] text-gray-500 dark:text-slate-500">
                        {log.ip_address ||
                          '-'}
                      </code>

                    </Table.Cell>

                    <Table.Cell className="text-right">

                      <div className="flex items-center justify-end gap-1">

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedLog(
                              log
                            )
                          }
                          className="
                            inline-flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-lg
                            text-gray-400
                            transition
                            hover:bg-blue-50
                            hover:text-blue-600
                            dark:text-slate-500
                            dark:hover:bg-blue-500/[0.08]
                            dark:hover:text-blue-400
                          "
                          title="Log detayını incele"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                log.id
                              )
                            }
                            disabled={
                              isDeleting
                            }
                            className="
                              inline-flex
                              h-8
                              w-8
                              items-center
                              justify-center
                              rounded-lg
                              text-gray-400
                              transition
                              hover:bg-red-50
                              hover:text-red-600
                              disabled:opacity-50
                              dark:text-slate-500
                              dark:hover:bg-red-500/[0.08]
                              dark:hover:text-red-400
                            "
                            title="Log kaydını sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                      </div>

                    </Table.Cell>

                  </Table.Row>
                )
              )}

            </Table.Body>

          </Table>

          {/* PAGINATION */}

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
                  kayıt
                </p>

                <div className="flex items-center gap-2">

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={
                      page <= 1 ||
                      loading
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
                      loading
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

      {/* ==================================================
          DELETE CONFIRM MODAL
      ================================================== */}

      <Modal
        isOpen={
          Boolean(
            deleteDialog
          )
        }
        onClose={
          closeDeleteDialog
        }
        title={
          deleteDialog?.type ===
          'bulk'
            ? 'Denetim Kayıtlarını Sil'
            : 'Denetim Kaydını Sil'
        }
        size="md"
        closeOnBackdrop={
          !isDeleting
        }
      >

        {deleteDialog && (
          <div className="space-y-5">

            <div
              className="
                flex
                items-start
                gap-4
                rounded-xl
                border
                border-red-200
                bg-red-50/70
                p-4
                dark:border-red-500/20
                dark:bg-red-500/[0.07]
              "
            >

              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-white
                  text-red-600
                  shadow-sm
                  dark:bg-white/[0.05]
                  dark:text-red-400
                "
              >
                <Trash2 className="h-5 w-5" />
              </div>

              <div className="min-w-0">

                <p className="text-sm font-semibold text-red-950 dark:text-red-200">
                  {deleteDialog.type ===
                  'bulk'
                    ? `${deleteDialog.ids?.length || 0} denetim kaydı silinecek`
                    : 'Denetim kaydı silinecek'}
                </p>

                <p className="mt-1 text-sm leading-6 text-red-900/80 dark:text-red-200/80">
                  {deleteDialog.type ===
                  'bulk'
                    ? 'Seçili denetim kayıtları sistemden kaldırılacaktır.'
                    : 'Seçili denetim kaydı sistemden kaldırılacaktır.'}
                </p>

              </div>

            </div>

            <div
              className="
                rounded-xl
                border
                border-amber-200
                bg-amber-50/70
                p-4
                dark:border-amber-500/20
                dark:bg-amber-500/[0.06]
              "
            >

              <p className="text-sm leading-6 text-amber-900 dark:text-amber-200">
                Denetim kayıtları güvenlik ve işlem geçmişinin parçasıdır. Silme işlemi tamamlandıktan sonra bu kayıtlar normal denetim ekranından geri getirilemez.
              </p>

            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.06] sm:flex-row sm:justify-end">

              <Button
                type="button"
                variant="secondary"
                disabled={
                  isDeleting
                }
                onClick={
                  closeDeleteDialog
                }
              >
                Vazgeç
              </Button>

              <Button
                type="button"
                variant="danger"
                disabled={
                  isDeleting
                }
                onClick={
                  confirmDelete
                }
              >
                <Trash2 className="h-4 w-4" />

                {isDeleting
                  ? 'Siliniyor...'
                  : deleteDialog.type ===
                      'bulk'
                    ? 'Kayıtları Sil'
                    : 'Kaydı Sil'}
              </Button>

            </div>

          </div>
        )}

      </Modal>

      {/* DETAIL MODAL */}

      <Modal
        isOpen={
          Boolean(
            selectedLog
          )
        }
        onClose={() =>
          setSelectedLog(
            null
          )
        }
        title="Denetim Kaydı Detayı"
        size="lg"
        footer={
          <Button
            variant="secondary"
            onClick={() =>
              setSelectedLog(
                null
              )
            }
          >
            Kapat
          </Button>
        }
      >
        {selectedLog && (
          <div className="space-y-6">

            <div className="grid gap-4 sm:grid-cols-2">

              <div>

                <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                  İşlem
                </p>

                <div className="mt-2">
                  <Badge
                    variant={
                      getActionVariant(
                        selectedLog.action
                      )
                    }
                    dot
                  >
                    {getActionLabel(
                      selectedLog.action
                    )}
                  </Badge>
                </div>

              </div>

              <div>

                <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                  Modül
                </p>

                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {getEntityLabel(
                    selectedLog.entity_type
                  )}
                </p>

              </div>

            </div>

            <div>

              <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                Açıklama
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-slate-300">
                {selectedLog.description ||
                  '-'}
              </p>

            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              <div>

                <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                  Kullanıcı
                </p>

                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {getUserName(
                    selectedLog
                  )}
                </p>

                {selectedLog.user?.email && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                    {selectedLog.user.email}
                  </p>
                )}

              </div>

              <div>

                <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                  Tarih
                </p>

                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {formatDate(
                    selectedLog.created_at
                  )}
                </p>

              </div>

              <div>

                <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                  IP Adresi
                </p>

                <code className="mt-2 block text-xs text-gray-600 dark:text-slate-400">
                  {selectedLog.ip_address ||
                    '-'}
                </code>

              </div>

              <div>

                <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                  Kayıt Kimliği
                </p>

                <code className="mt-2 block break-all text-xs text-gray-600 dark:text-slate-400">
                  {selectedLog.id ||
                    '-'}
                </code>

              </div>

            </div>

            {selectedLog.metadata &&
              Object.keys(
                selectedLog.metadata
              ).length >
                0 && (
                <div>

                  <p className="mb-2 text-xs font-medium text-gray-400 dark:text-slate-500">
                    Metadata
                  </p>

                  <pre
                    className="
                      max-h-56
                      overflow-auto
                      rounded-xl
                      border
                      border-gray-200
                      bg-gray-50
                      p-4
                      text-xs
                      leading-5
                      text-gray-700
                      dark:border-white/[0.07]
                      dark:bg-white/[0.025]
                      dark:text-slate-300
                    "
                  >
                    {JSON.stringify(
                      selectedLog.metadata,
                      null,
                      2
                    )}
                  </pre>

                </div>
              )}

            {selectedLog.old_values && (
              <div>

                <p className="mb-2 text-xs font-medium text-gray-400 dark:text-slate-500">
                  Eski Değerler
                </p>

                <pre
                  className="
                    max-h-56
                    overflow-auto
                    rounded-xl
                    border
                    border-red-100
                    bg-red-50/40
                    p-4
                    text-xs
                    leading-5
                    text-gray-700
                    dark:border-red-500/10
                    dark:bg-red-500/[0.025]
                    dark:text-slate-300
                  "
                >
                  {JSON.stringify(
                    selectedLog.old_values,
                    null,
                    2
                  )}
                </pre>

              </div>
            )}

            {selectedLog.new_values && (
              <div>

                <p className="mb-2 text-xs font-medium text-gray-400 dark:text-slate-500">
                  Yeni Değerler
                </p>

                <pre
                  className="
                    max-h-56
                    overflow-auto
                    rounded-xl
                    border
                    border-emerald-100
                    bg-emerald-50/40
                    p-4
                    text-xs
                    leading-5
                    text-gray-700
                    dark:border-emerald-500/10
                    dark:bg-emerald-500/[0.025]
                    dark:text-slate-300
                  "
                >
                  {JSON.stringify(
                    selectedLog.new_values,
                    null,
                    2
                  )}
                </pre>

              </div>
            )}

          </div>
        )}
      </Modal>

    </div>
  );
};

export default AuditLogList;