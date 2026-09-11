import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  useClients,
} from '../../features/clients/client.query.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import {
  useDebounce,
} from '../../hooks/useDebounce.js';

import Button from '../../components/ui/Button.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';

import Loader from '../../components/shared/Loader.jsx';
import Error from '../../components/shared/Error.jsx';
import Empty from '../../components/shared/Empty.jsx';

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  FileText,
  MapPin,
  Plus,
  Search,
  UserRound,
  Users,
  X,
} from 'lucide-react';

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
    value: 'passive',
    label: 'Pasif',
  },
  {
    value: 'archived',
    label: 'Arşiv',
  },
];

const CLIENT_TYPE_OPTIONS = [
  {
    value: '',
    label: 'Tüm Türler',
  },
  {
    value: 'individual',
    label: 'Bireysel',
  },
  {
    value: 'corporate',
    label: 'Kurumsal',
  },
];

// ======================================================
// HELPERS
// ======================================================

const getStatusLabel = (
  status
) => {
  const labels = {
    active: 'Aktif',
    passive: 'Pasif',
    archived: 'Arşiv',
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
    active: 'success',
    passive: 'warning',
    archived: 'default',
  };

  return (
    variants[status] ||
    'default'
  );
};

const getClientTypeLabel = (
  type
) => {
  const labels = {
    individual:
      'Bireysel',

    corporate:
      'Kurumsal',
  };

  return (
    labels[type] ||
    'Bilinmiyor'
  );
};

const getClientTypeIcon = (
  type
) => {
  return type === 'corporate'
    ? Building2
    : UserRound;
};

const getClientIconClass = (
  type
) => {
  if (
    type ===
    'corporate'
  ) {
    return 'bg-violet-50 text-violet-600 dark:bg-violet-500/[0.08] dark:text-violet-400';
  }

  if (
    type ===
    'individual'
  ) {
    return 'bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400';
  }

  return 'bg-gray-50 text-gray-500 dark:bg-white/[0.05] dark:text-slate-400';
};

const getPersonName = (
  client
) => {
  return (
    client?.name ||
    'İsimsiz Müvekkil'
  );
};

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

    if (
      objectId === null ||
      objectId === undefined ||
      objectId === ''
    ) {
      return '';
    }

    return String(
      objectId
    );
  }

  return String(
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

  if (
    Array.isArray(
      payload
    )
  ) {
    return payload;
  }

  if (
    Array.isArray(
      payload?.data
    )
  ) {
    return payload.data;
  }

  if (
    Array.isArray(
      payload?.items
    )
  ) {
    return payload.items;
  }

  if (
    Array.isArray(
      payload?.results
    )
  ) {
    return payload.results;
  }

  if (
    Array.isArray(
      payload?.rows
    )
  ) {
    return payload.rows;
  }

  return [];
};

const getPaginationPayload = (
  response
) => {
  return (
    response?.data?.pagination ??
    response?.pagination ??
    response?.data?.data?.pagination ??
    null
  );
};

const getClientCaseCount = (
  client
) => {
  const value =
    client?.case_count ??
    client?.cases_count ??
    client?.summary?.case_count ??
    (
      Array.isArray(
        client?.cases
      )
        ? client.cases.length
        : 0
    );

  const count =
    Number(
      value
    );

  return Number.isFinite(
    count
  )
    ? Math.max(
        0,
        count
      )
    : 0;
};

const normalizePageNumber = (
  value,
  fallback = 1
) => {
  const page =
    Number(
      value
    );

  if (
    !Number.isFinite(
      page
    ) ||
    page < 1
  ) {
    return fallback;
  }

  return Math.floor(
    page
  );
};

// ======================================================
// COMPONENT
// ======================================================

const ClientsList = () => {
  const {
    user,
  } = useAuth();

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('');

  const [
    clientTypeFilter,
    setClientTypeFilter,
  ] = useState('');

  const [
    cityFilter,
    setCityFilter,
  ] = useState('');

  const [
    page,
    setPage,
  ] = useState(1);

  const debouncedSearch =
    useDebounce(
      search,
      400
    );

  const debouncedCity =
    useDebounce(
      cityFilter,
      400
    );

  // ======================================================
  // PERMISSIONS
  // ======================================================

  const canCreate =
    hasPermission(
      user,
      PERMISSION_KEYS.CREATE_CLIENTS
    );

  const canViewCases =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_CASES
    );

  // ======================================================
  // QUERY
  // ======================================================

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useClients({
    page,

    limit: 10,

    search:
      debouncedSearch,

    status:
      statusFilter,

    client_type:
      clientTypeFilter,

    city:
      debouncedCity,
  });

  // ======================================================
  // DATA
  // ======================================================

  const clients =
    getArrayPayload(
      data
    );

  const pagination =
    getPaginationPayload(
      data
    );

  const currentPage =
    normalizePageNumber(
      pagination?.page ??
      pagination?.current_page ??
      pagination?.currentPage ??
      page,
      page
    );

  const totalPages =
    normalizePageNumber(
      pagination?.totalPages ??
      pagination?.total_pages ??
      pagination?.last_page ??
      1
    );

  const totalClients =
    Math.max(
      0,
      Number(
        pagination?.total ??
        pagination?.total_count ??
        pagination?.count ??
        clients.length
      ) || 0
    );

  // ======================================================
  // RESET PAGE
  // ======================================================

  /*
   * Filtre input handler'ları page'i anında 1'e çeker.
   * Bu effect yalnız debounced değerlerin dışarıdan değişmesi gibi
   * edge-case'lerde güvenlik ağı olarak kalır.
   */
  useEffect(() => {
    setPage(
      (current) =>
        current === 1
          ? current
          : 1
    );
  }, [
    debouncedSearch,
    debouncedCity,
  ]);

  // ======================================================
  // PAGINATION SAFETY
  // ======================================================

  useEffect(() => {
    if (
      !pagination
    ) {
      return;
    }

    if (
      page >
      totalPages
    ) {
      setPage(
        totalPages
      );
    }
  }, [
    pagination,
    page,
    totalPages,
  ]);

  // ======================================================
  // FILTER STATE
  // ======================================================

  const hasFilters =
    Boolean(
      search ||
      statusFilter ||
      clientTypeFilter ||
      cityFilter
    );

  const handleSearchChange =
    (
      event
    ) => {
      setSearch(
        String(
          event.target.value ??
          ''
        ).slice(
          0,
          200
        )
      );

      setPage(1);
    };

  const handleStatusChange =
    (
      event
    ) => {
      const value =
        event.target.value;

      if (
        !STATUS_OPTIONS.some(
          (option) =>
            option.value ===
            value
        )
      ) {
        return;
      }

      setStatusFilter(
        value
      );

      setPage(1);
    };

  const handleClientTypeFilterChange =
    (
      event
    ) => {
      const value =
        event.target.value;

      if (
        !CLIENT_TYPE_OPTIONS.some(
          (option) =>
            option.value ===
            value
        )
      ) {
        return;
      }

      setClientTypeFilter(
        value
      );

      setPage(1);
    };

  const handleCityChange =
    (
      event
    ) => {
      setCityFilter(
        String(
          event.target.value ??
          ''
        ).slice(
          0,
          100
        )
      );

      setPage(1);
    };

  const handleClearFilters =
    () => {
      setSearch('');
      setStatusFilter('');
      setClientTypeFilter('');
      setCityFilter('');
      setPage(1);
    };

  // ======================================================
  // LOADING
  // ======================================================

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader text="Müvekkiller yükleniyor..." />
      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (error) {
    return (
      <Error
        title="Müvekkiller yüklenemedi"
        message="Müvekkil kayıtları alınırken bir hata oluştu."
        error={error}
        onRetry={() =>
          refetch?.()
        }
      />
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

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
            <Users size={21} />
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
              Müvekkiller
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
              Bireysel ve kurumsal müvekkilleri,
              ilişkili davaları ve iletişim bilgilerini yönetin.
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
                {totalClients}
              </span>{' '}
              müvekkil
            </p>

          </div>

        </div>

        {canCreate && (
          <Link to="/clients/create">
            <Button>
              <Plus className="h-4 w-4" />
              Yeni Müvekkil
            </Button>
          </Link>
        )}

      </div>

      {/* ==================================================
          FILTERS
      ================================================== */}

      <Card>

        <Card.Body>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">

            {/* SEARCH */}

            <div className="relative xl:col-span-5">

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
                value={search}
                onChange={
                  handleSearchChange
                }
                maxLength={200}
                placeholder="Ad, TCKN/VKN, e-posta veya telefon ara..."
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
                  dark:hover:border-white/[0.14]
                  dark:focus:border-blue-500/60
                "
              />

            </div>

            {/* STATUS */}

            <div className="xl:col-span-2">

              <select
                value={statusFilter}
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
                {STATUS_OPTIONS.map(
                  (
                    option
                  ) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

            </div>

            {/* TYPE */}

            <div className="xl:col-span-2">

              <select
                value={
                  clientTypeFilter
                }
                onChange={
                  handleClientTypeFilterChange
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
                {CLIENT_TYPE_OPTIONS.map(
                  (
                    option
                  ) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

            </div>

            {/* CITY */}

            <div className="relative xl:col-span-2">

              <MapPin
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
                type="text"
                value={cityFilter}
                onChange={
                  handleCityChange
                }
                maxLength={100}
                placeholder="Şehir"
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
                  placeholder:text-gray-400
                  hover:border-gray-300
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-slate-300
                  dark:placeholder:text-slate-500
                "
              />

            </div>

            {/* CLEAR */}

            <div className="xl:col-span-1">

              {hasFilters && (
                <Button
                  variant="ghost"
                  onClick={
                    handleClearFilters
                  }
                  className="w-full"
                  title="Filtreleri temizle"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

            </div>

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

      {clients.length === 0 ? (
        <Empty
          icon={Users}
          title={
            hasFilters
              ? 'Eşleşen müvekkil bulunamadı'
              : 'Henüz müvekkil kaydı yok'
          }
          description={
            hasFilters
              ? 'Arama veya filtre kriterlerini değiştirerek tekrar deneyin.'
              : canCreate
                ? 'İlk müvekkil kaydınızı oluşturarak çalışmaya başlayabilirsiniz.'
                : 'Henüz görüntüleyebileceğiniz bir müvekkil kaydı bulunmuyor.'
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
              <Link to="/clients/create">
                <Button>
                  <Plus className="h-4 w-4" />
                  İlk Müvekkili Oluştur
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
                  İletişim
                </Table.HeadCell>

                <Table.HeadCell>
                  Konum
                </Table.HeadCell>

                <Table.HeadCell>
                  Dava
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

              {clients.map(
                (
                  client
                ) => {
                  const ClientIcon =
                    getClientTypeIcon(
                      client.client_type
                    );

                  const clientId =
                    normalizeId(
                      client?.id
                    );

                  const caseCount =
                    getClientCaseCount(
                      client
                    );

                  return (
                    <Table.Row
                      key={
                        clientId ||
                        `${getPersonName(
                          client
                        )}-${client?.identification_number || 'unknown'}`
                      }
                    >

                      {/* CLIENT */}

                      <Table.Cell>

                        <div className="flex min-w-[15rem] items-start gap-3">

                          <div
                            className={`
                              flex
                              h-10
                              w-10
                              shrink-0
                              items-center
                              justify-center
                              rounded-xl
                              ${getClientIconClass(
                                client.client_type
                              )}
                            `}
                          >
                            <ClientIcon size={18} />
                          </div>

                          <div className="min-w-0">

                            {clientId ? (
                              <Link
                                to={`/clients/${clientId}`}
                                className="
                                  block
                                  max-w-xs
                                  truncate
                                  font-semibold
                                  text-gray-900
                                  transition
                                  hover:text-blue-600
                                  dark:text-white
                                  dark:hover:text-blue-400
                                "
                                title={
                                  getPersonName(
                                    client
                                  )
                                }
                              >
                                {getPersonName(
                                  client
                                )}
                              </Link>
                            ) : (
                              <span
                                className="block max-w-xs truncate font-semibold text-gray-900 dark:text-white"
                                title={
                                  getPersonName(
                                    client
                                  )
                                }
                              >
                                {getPersonName(
                                  client
                                )}
                              </span>
                            )}

                            <div className="mt-1 flex items-center gap-2">

                              <span className="text-xs text-gray-500 dark:text-slate-500">
                                {getClientTypeLabel(
                                  client.client_type
                                )}
                              </span>

                              {client.identification_number && (
                                <>
                                  <span className="text-gray-300 dark:text-slate-700">
                                    ·
                                  </span>

                                  <span className="text-[10px] text-gray-400 dark:text-slate-500">
                                    Kimlik/VKN ••••
                                    {String(
                                      client.identification_number
                                    ).slice(
                                      -4
                                    )}
                                  </span>
                                </>
                              )}

                            </div>

                          </div>

                        </div>

                      </Table.Cell>

                      {/* CONTACT */}

                      <Table.Cell>

                        <div className="min-w-[11rem]">

                          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                            {client.phone || '-'}
                          </p>

                          {client.email && (
                            <p
                              className="
                                mt-1
                                max-w-[14rem]
                                truncate
                                text-xs
                                text-gray-500
                                dark:text-slate-500
                              "
                              title={
                                client.email
                              }
                            >
                              {client.email}
                            </p>
                          )}

                        </div>

                      </Table.Cell>

                      {/* LOCATION */}

                      <Table.Cell>

                        {client.city ||
                        client.district ? (
                          <div className="flex items-start gap-2">

                            <MapPin
                              size={14}
                              className="mt-0.5 shrink-0 text-gray-400 dark:text-slate-500"
                            />

                            <div>

                              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                                {client.city || '-'}
                              </p>

                              {client.district && (
                                <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-500">
                                  {client.district}
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

                      {/* CASE COUNT */}

                      <Table.Cell>

                        {canViewCases &&
                        clientId ? (
                          <Link
                            to={`/clients/${clientId}`}
                            className="
                              inline-flex
                              items-center
                              gap-2
                              rounded-lg
                              px-2
                              py-1
                              text-sm
                              font-medium
                              text-gray-600
                              transition
                              hover:bg-blue-50
                              hover:text-blue-600
                              dark:text-slate-400
                              dark:hover:bg-blue-500/[0.06]
                              dark:hover:text-blue-400
                            "
                          >
                            <FileText size={14} />

                            <span>
                              {caseCount}
                            </span>
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-2 py-1 text-sm text-gray-400 dark:text-slate-600">
                            <FileText size={14} />

                            <span>
                              -
                            </span>
                          </span>
                        )}

                      </Table.Cell>

                      {/* STATUS */}

                      <Table.Cell>

                        <Badge
                          variant={
                            getStatusVariant(
                              client.status
                            )
                          }
                          dot
                        >
                          {getStatusLabel(
                            client.status
                          )}
                        </Badge>

                      </Table.Cell>

                      {/* ACTION */}

                      <Table.Cell className="text-right">

                        {clientId ? (
                          <Link
                            to={`/clients/${clientId}`}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                            >
                              İncele
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            title="Geçerli müvekkil kimliği bulunamadı"
                          >
                            İncele
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}

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
            totalPages >
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
                    {totalClients}
                  </span>{' '}
                  müvekkil
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
                    {currentPage} /{' '}
                    {totalPages}
                  </span>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={
                      page >=
                        totalPages ||
                      isFetching
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          Math.min(
                            totalPages,
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

export default ClientsList;