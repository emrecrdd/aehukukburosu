import {
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  powerOfAttorneyApi,
} from '../../features/power-of-attorney/powerOfAttorney.api.js';

import documentApi from '../../features/documents/document.api.js';

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
  BriefcaseBusiness,
  Download,
  Eye,
  FileText,
  Plus,
  Scale,
  Search,
  UserRound,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const STATUS_OPTIONS = [
  {
    value: '',
    label: 'Tüm Durumlar',
  },
  {
    value: 'active',
    label: 'Aktif',
  },
  {
    value: 'expired',
    label: 'Süresi Doldu',
  },
  {
    value: 'cancelled',
    label: 'İptal',
  },
];

// ======================================================
// HELPERS
// ======================================================

const getStatusVariant = (
  status
) => {
  const variants = {
    active: 'success',
    expired: 'warning',
    cancelled: 'danger',
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
    active: 'Aktif',
    expired: 'Süresi Doldu',
    cancelled: 'İptal',
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
      new Date(date);

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
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }
    ).format(
      parsed
    );
  } catch {
    return '-';
  }
};

const getDocumentLabel = (
  document
) => {
  if (!document) {
    return '-';
  }

  return (
    document.original_name ||
    document.name ||
    'Belge'
  );
};

// ======================================================
// COMPONENT
// ======================================================

const PowerOfAttorneyList = () => {
  const {
    user,
  } = useAuth();

  const canCreate =
    hasPermission(
      user,
      PERMISSION_KEYS.CREATE_POWER_OF_ATTORNEY
    );

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState('');

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    downloadingId,
    setDownloadingId,
  ] =
    useState(null);

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
        'powerOfAttorneys',
        {
          page,
          search:
            searchQuery,
          status:
            statusFilter,
        },
      ],

      queryFn: () =>
        powerOfAttorneyApi.getAll({
          page,
          search:
            searchQuery,
          status:
            statusFilter,
        }),

      staleTime:
        1000,

      keepPreviousData:
        true,
    });

  // ====================================================
  // RESPONSE DATA
  // ====================================================

  /*
   * Bu endpoint diğer bazı listelerden farklı olarak:
   *
   * response.data.data = {
   *   data: [...],
   *   pagination: {...}
   * }
   *
   * yapısında dönüyor.
   */

  const responseData =
    data?.data?.data;

  const powerOfAttorneys =
    Array.isArray(
      responseData?.data
    )
      ? responseData.data
      : [];

  const pagination =
    responseData?.pagination;

  const hasFilters =
    Boolean(
      searchQuery ||
      statusFilter
    );

  // ====================================================
  // SEARCH
  // ====================================================

  const handleSearch =
    () => {
      setSearchQuery(
        search.trim()
      );

      setPage(1);
    };

  const handleKeyDown =
    (
      event
    ) => {
      if (
        event.key ===
        'Enter'
      ) {
        handleSearch();
      }
    };

  const handleClearFilters =
    () => {
      setSearch('');
      setSearchQuery('');
      setStatusFilter('');
      setPage(1);
    };

  // ====================================================
  // DOWNLOAD
  // ====================================================

  const handleDownload =
    async (
      document
    ) => {
      const docId =
        document?.id;

      if (!docId) {
        toast.error(
          'Belge bulunamadı'
        );

        return;
      }

      try {
        setDownloadingId(
          docId
        );

        const response =
          await documentApi.download(
            docId
          );

        const blob =
          new Blob([
            response.data,
          ]);

        const url =
          window.URL.createObjectURL(
            blob
          );

        const link =
          documentCreateElement(
            'a'
          );

        link.href =
          url;

        link.download =
          getDocumentLabel(
            document
          );

        document.body.appendChild(
          link
        );

        link.click();
        link.remove();

        window.URL.revokeObjectURL(
          url
        );

        toast.success(
          'Belge indirildi'
        );
      } catch (
        downloadError
      ) {
        console.error(
          'Document download error:',
          downloadError
        );

        toast.error(
          downloadError
            ?.response
            ?.data
            ?.message ||
            'Belge indirilemedi'
        );
      } finally {
        setDownloadingId(
          null
        );
      }
    };

  // ====================================================
  // LOADING
  // ====================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader text="Vekaletnameler yükleniyor..." />
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
        title="Vekaletnameler yüklenemedi"
        message="Vekaletname kayıtları alınırken bir hata oluştu."
        error={error}
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
            <Scale size={21} />
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
              Vekaletnameler
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
              Müvekkillere ait vekalet kayıtlarını, geçerlilik sürelerini,
              ilişkili davaları ve belgeleri yönetin.
            </p>

            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              Toplam{' '}
              <span className="font-semibold text-gray-600 dark:text-slate-300">
                {pagination?.total ||
                  0}
              </span>{' '}
              vekaletname
            </p>

          </div>

        </div>

        {canCreate && (
          <Link to="/power-of-attorney/create">

            <Button>
              <Plus className="h-4 w-4" />
              Yeni Vekaletname
            </Button>

          </Link>
        )}

      </div>

      {/* ==================================================
          FILTERS
      ================================================== */}

      <Card>

        <Card.Body>

          <div className="flex flex-col gap-3 sm:flex-row">

            <div className="flex flex-1 flex-col gap-2 sm:flex-row">

              <Input
                placeholder="Müvekkil, başlık veya açıklamada ara..."
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
                onKeyDown={
                  handleKeyDown
                }
                icon={
                  <Search size={16} />
                }
              />

              <Button
                onClick={
                  handleSearch
                }
              >
                <Search className="h-4 w-4" />
                Ara
              </Button>

            </div>

            <div className="min-w-[190px]">

              <select
                value={
                  statusFilter
                }
                onChange={(
                  event
                ) => {
                  setStatusFilter(
                    event.target.value
                  );

                  setPage(
                    1
                  );
                }}
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

      {powerOfAttorneys.length ===
      0 ? (
        <Empty
          icon={Scale}
          title={
            hasFilters
              ? 'Eşleşen vekaletname bulunamadı'
              : 'Henüz vekaletname bulunmuyor'
          }
          description={
            hasFilters
              ? 'Arama veya durum filtresini değiştirerek tekrar deneyin.'
              : canCreate
                ? 'Müvekkilleriniz için vekaletname kayıtları oluşturmaya başlayabilirsiniz.'
                : 'Henüz görüntüleyebileceğiniz bir vekaletname kaydı bulunmuyor.'
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
            ) : canCreate ? (
              <Link to="/power-of-attorney/create">

                <Button>
                  <Plus className="h-4 w-4" />
                  İlk Vekaletnameyi Oluştur
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
                  Müvekkil
                </Table.HeadCell>

                <Table.HeadCell>
                  Vekaletname
                </Table.HeadCell>

                <Table.HeadCell>
                  Dava
                </Table.HeadCell>

                <Table.HeadCell>
                  Geçerlilik
                </Table.HeadCell>

                <Table.HeadCell>
                  Durum
                </Table.HeadCell>

                <Table.HeadCell>
                  Belge
                </Table.HeadCell>

                <Table.HeadCell className="text-right">
                  İşlem
                </Table.HeadCell>

              </Table.Row>

            </Table.Head>

            <Table.Body>

              {powerOfAttorneys.map(
                (
                  item
                ) => {
                  const firstDocument =
                    Array.isArray(
                      item.documents
                    )
                      ? item.documents[0]
                      : null;

                  return (
                    <Table.Row
                      key={
                        item.id
                      }
                    >

                      {/* CLIENT */}

                      <Table.Cell>

                        {item.client ? (
                          <Link
                            to={`/clients/${item.client_id || item.client.id}`}
                            className="
                              inline-flex
                              max-w-[200px]
                              items-center
                              gap-2
                              font-medium
                              text-gray-700
                              transition
                              hover:text-blue-600
                              dark:text-slate-300
                              dark:hover:text-blue-400
                            "
                          >
                            <div
                              className="
                                flex
                                h-8
                                w-8
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                bg-blue-50
                                text-blue-600
                                dark:bg-blue-500/[0.08]
                                dark:text-blue-400
                              "
                            >
                              <UserRound size={15} />
                            </div>

                            <span className="truncate">
                              {item.client.name ||
                                '-'}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-600">
                            -
                          </span>
                        )}

                      </Table.Cell>

                      {/* POWER OF ATTORNEY */}

                      <Table.Cell>

                        <div className="min-w-[16rem]">

                          <Link
                            to={`/power-of-attorney/${item.id}`}
                            className="
                              block
                              max-w-sm
                              truncate
                              font-semibold
                              text-gray-900
                              transition
                              hover:text-blue-600
                              dark:text-white
                              dark:hover:text-blue-400
                            "
                            title={
                              item.title
                            }
                          >
                            {item.title ||
                              'Vekaletname'}
                          </Link>

                          {item.description && (
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
                                item.description
                              }
                            >
                              {item.description}
                            </p>
                          )}

                        </div>

                      </Table.Cell>

                      {/* CASE */}

                      <Table.Cell>

                        {item.case ? (
                          <Link
                            to={`/cases/${item.case.id}`}
                            className="
                              inline-flex
                              max-w-[220px]
                              items-center
                              gap-2
                              text-sm
                              font-medium
                              text-gray-700
                              transition
                              hover:text-blue-600
                              dark:text-slate-300
                              dark:hover:text-blue-400
                            "
                          >
                            <BriefcaseBusiness
                              size={14}
                              className="shrink-0 text-gray-400 dark:text-slate-500"
                            />

                            <span
                              className="truncate"
                              title={
                                item.case.title
                              }
                            >
                              {item.case.title}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-600">
                            -
                          </span>
                        )}

                      </Table.Cell>

                      {/* DATES */}

                      <Table.Cell>

                        <div className="min-w-[130px]">

                          <p className="text-xs font-medium text-gray-700 dark:text-slate-300">
                            {formatDate(
                              item.start_date
                            )}
                          </p>

                          <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">
                            Bitiş:{' '}
                            {formatDate(
                              item.end_date
                            )}
                          </p>

                        </div>

                      </Table.Cell>

                      {/* STATUS */}

                      <Table.Cell>

                        <Badge
                          variant={
                            getStatusVariant(
                              item.status
                            )
                          }
                          dot
                        >
                          {getStatusLabel(
                            item.status
                          )}
                        </Badge>

                      </Table.Cell>

                      {/* DOCUMENT */}

                      <Table.Cell>

                        {firstDocument ? (
                          <div className="flex items-center gap-2">

                            <div
                              className="
                                flex
                                h-8
                                w-8
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
                              <FileText size={15} />
                            </div>

                            <div className="min-w-0">

                              <button
                                type="button"
                                onClick={() =>
                                  handleDownload(
                                    firstDocument
                                  )
                                }
                                disabled={
                                  downloadingId ===
                                  firstDocument.id
                                }
                                className="
                                  flex
                                  items-center
                                  gap-1.5
                                  text-xs
                                  font-medium
                                  text-gray-600
                                  transition
                                  hover:text-emerald-600
                                  disabled:cursor-not-allowed
                                  disabled:opacity-50
                                  dark:text-slate-400
                                  dark:hover:text-emerald-400
                                "
                                title={
                                  getDocumentLabel(
                                    firstDocument
                                  )
                                }
                              >
                                <Download
                                  className={`h-3.5 w-3.5 ${
                                    downloadingId ===
                                    firstDocument.id
                                      ? 'animate-pulse'
                                      : ''
                                  }`}
                                />

                                İndir
                              </button>

                              {item.documents.length >
                                1 && (
                                <p className="mt-0.5 text-[10px] text-gray-400 dark:text-slate-600">
                                  +
                                  {item.documents.length -
                                    1}{' '}
                                  belge
                                </p>
                              )}

                            </div>

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
                          to={`/power-of-attorney/${item.id}`}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                          >
                            <Eye className="h-3.5 w-3.5" />
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
                  vekaletname
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
                            current - 1
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
                            current + 1
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

// ======================================================
// SMALL DOM HELPER
// ======================================================

const documentCreateElement = (
  tagName
) => {
  return window.document.createElement(
    tagName
  );
};

export default PowerOfAttorneyList;