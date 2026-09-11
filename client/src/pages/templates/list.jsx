import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  templateApi,
} from '../../features/templates/template.api.js';

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
  ArrowLeft,
  ArrowRight,
  Download,
  Eye,
  FileSignature,
  Files,
  Plus,
  Search,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const CATEGORY_OPTIONS = [
  {
    value: '',
    label: 'Tüm Kategoriler',
  },
  {
    value: 'dilekce',
    label: 'Dilekçe',
  },
  {
    value: 'ihtar',
    label: 'İhtar',
  },
  {
    value: 'sozlesme',
    label: 'Sözleşme',
  },
];

const LAW_AREA_OPTIONS = [
  {
    value: '',
    label: 'Tüm Hukuk Alanları',
  },
  {
    value: 'ozel_hukuk',
    label: 'Özel Hukuk',
  },
  {
    value: 'ceza_hukuku',
    label: 'Ceza Hukuku',
  },
  {
    value: 'idare_hukuku',
    label: 'İdare Hukuku',
  },
  {
    value: 'ofis_ici',
    label: 'Ofis İçi',
  },
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
  const candidates = [
    response?.data?.data,
    response?.data,
    response,
  ];

  for (
    const candidate of
    candidates
  ) {
    if (
      Array.isArray(
        candidate
      )
    ) {
      return candidate;
    }

    if (
      Array.isArray(
        candidate?.data
      )
    ) {
      return candidate.data;
    }

    if (
      Array.isArray(
        candidate?.items
      )
    ) {
      return candidate.items;
    }

    if (
      Array.isArray(
        candidate?.results
      )
    ) {
      return candidate.results;
    }

    if (
      Array.isArray(
        candidate?.rows
      )
    ) {
      return candidate.rows;
    }
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

const normalizePageNumber = (
  value,
  fallback = 1
) => {
  const parsed =
    Number(
      value
    );

  return Number.isFinite(
    parsed
  ) &&
    parsed > 0
    ? Math.floor(
        parsed
      )
    : fallback;
};

const getDownloadCount = (
  value
) => {
  const parsed =
    Number(
      value
    );

  return Number.isFinite(
    parsed
  )
    ? Math.max(
        0,
        parsed
      )
    : 0;
};

const getErrorMessage = (
  error,
  fallback
) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const getCategoryLabel = (
  category
) => {
  const labels = {
    dilekce: 'Dilekçe',
    ihtar: 'İhtar',
    sozlesme: 'Sözleşme',
  };

  return (
    labels[category] ||
    category ||
    '-'
  );
};

const getCategoryVariant = (
  category
) => {
  const variants = {
    dilekce: 'primary',
    ihtar: 'warning',
    sozlesme: 'success',
  };

  return (
    variants[category] ||
    'default'
  );
};

const getLawAreaLabel = (
  lawArea
) => {
  const labels = {
    ozel_hukuk: 'Özel Hukuk',
    ceza_hukuku: 'Ceza Hukuku',
    idare_hukuku: 'İdare Hukuku',
    ofis_ici: 'Ofis İçi',
  };

  return (
    labels[lawArea] ||
    lawArea ||
    '-'
  );
};

const getLawAreaVariant = (
  lawArea
) => {
  const variants = {
    ozel_hukuk: 'info',
    ceza_hukuku: 'danger',
    idare_hukuku: 'primary',
    ofis_ici: 'default',
  };

  return (
    variants[lawArea] ||
    'default'
  );
};

// ======================================================
// COMPONENT
// ======================================================

const TemplatesList = () => {
  const queryClient =
    useQueryClient();

  const {
    user,
  } = useAuth();

  const canCreate =
    hasPermission(
      user,
      PERMISSION_KEYS.CREATE_TEMPLATES
    );

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
    categoryFilter,
    setCategoryFilter,
  ] =
    useState('');

  const [
    lawAreaFilter,
    setLawAreaFilter,
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
        'templates',
        {
          page,
          search:
            debouncedSearch,
          category:
            categoryFilter,
          law_area:
            lawAreaFilter,
        },
      ],

      queryFn: () =>
        templateApi.getAll({
          page,
          search:
            debouncedSearch,
          category:
            categoryFilter,
          law_area:
            lawAreaFilter,
        }),

      staleTime:
        0,

      refetchOnMount:
        'always',

      refetchOnWindowFocus:
        'always',

      refetchOnReconnect:
        'always',

      placeholderData: (
        previousData
      ) => previousData,
    });

  const templates =
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

  const totalTemplates =
    Math.max(
      0,
      Number(
        pagination?.total ??
        pagination?.total_count ??
        pagination?.count ??
        templates.length
      ) || 0
    );

  const totalPages =
    Math.max(
      1,
      normalizePageNumber(
        pagination?.totalPages ??
        pagination?.total_pages ??
        pagination?.last_page ??
        (
          totalTemplates > 0
            ? Math.ceil(
                totalTemplates /
                10
              )
            : 1
        ),
        1
      )
    );

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    categoryFilter,
    lawAreaFilter,
  ]);

  useEffect(() => {
    if (
      page >
      totalPages
    ) {
      setPage(
        totalPages
      );
    }
  }, [
    page,
    totalPages,
  ]);

  const hasFilters =
    Boolean(
      search ||
      categoryFilter ||
      lawAreaFilter
    );

  // ====================================================
  // SEARCH / FILTERS
  // ====================================================

  const handleCategoryChange =
    (
      event
    ) => {
      const nextValue =
        event.target.value;

      const allowed =
        CATEGORY_OPTIONS.some(
          (option) =>
            option.value ===
            nextValue
        );

      if (!allowed) {
        return;
      }

      setCategoryFilter(
        nextValue
      );

      setPage(1);
    };

  const handleLawAreaChange =
    (
      event
    ) => {
      const nextValue =
        event.target.value;

      const allowed =
        LAW_AREA_OPTIONS.some(
          (option) =>
            option.value ===
            nextValue
        );

      if (!allowed) {
        return;
      }

      setLawAreaFilter(
        nextValue
      );

      setPage(1);
    };

  const handleClearFilters =
    () => {
      setSearch('');
      setCategoryFilter('');
      setLawAreaFilter('');
      setPage(1);
    };

  // ====================================================
  // DOWNLOAD
  // ====================================================

  const handleDownload =
    async (
      rawId,
      fileName
    ) => {
      const id =
        normalizeId(
          rawId
        );

      if (!id) {
        toast.error(
          'Şablon ID bulunamadı'
        );

        return;
      }

      if (
        downloadingId
      ) {
        return;
      }

      const currentTemplate =
        templates.find(
          (item) =>
            normalizeId(
              item?.id
            ) === id
        );

      const previousCount =
        getDownloadCount(
          currentTemplate
            ?.download_count
        );

      const optimisticCount =
        previousCount +
        1;

      const currentQueryKey = [
        'templates',
        {
          page,
          search:
            debouncedSearch,
          category:
            categoryFilter,
          law_area:
            lawAreaFilter,
        },
      ];

      try {
        setDownloadingId(
          id
        );

        const response =
          await templateApi.download(
            id
          );

        const responseData =
          response?.data?.data ??
          response?.data;

        let downloadStarted =
          false;

        if (
          responseData?.downloadUrl
        ) {
          const openedWindow =
            window.open(
              responseData.downloadUrl,
              '_blank',
              'noopener,noreferrer'
            );

          if (
            openedWindow ===
            null
          ) {
            toast.error(
              'İndirme penceresi açılamadı. Tarayıcı pop-up engelini kontrol edin.'
            );

            return;
          }

          downloadStarted =
            true;
        } else if (
          response?.data instanceof
            Blob
        ) {
          const url =
            window.URL.createObjectURL(
              response.data
            );

          const link =
            document.createElement(
              'a'
            );

          link.href =
            url;

          link.download =
            fileName ||
            'sablon';

          document.body.appendChild(
            link
          );

          link.click();
          link.remove();

          window.setTimeout(
            () => {
              window.URL.revokeObjectURL(
                url
              );
            },
            1_000
          );

          downloadStarted =
            true;
        } else if (
          response?.data
        ) {
          /*
           * Bazı axios ayarlarında binary cevap Blob instance'ı olarak
           * gelmeyebilir. Yine de gelen body'yi Blob'a çevirip indiriyoruz.
           */
          const blob =
            new Blob([
              response.data,
            ]);

          const url =
            window.URL.createObjectURL(
              blob
            );

          const link =
            document.createElement(
              'a'
            );

          link.href =
            url;

          link.download =
            fileName ||
            'sablon';

          document.body.appendChild(
            link
          );

          link.click();
          link.remove();

          window.setTimeout(
            () => {
              window.URL.revokeObjectURL(
                url
              );
            },
            1_000
          );

          downloadStarted =
            true;
        }

        if (
          !downloadStarted
        ) {
          toast.error(
            'İndirme bağlantısı alınamadı'
          );

          return;
        }

        /*
         * Liste satırındaki download_count kullanıcıya anında +1 yansır.
         * Backend daha sonra kesin sayıyı döndürdüğünde invalidate/refetch
         * ile doğrulanır.
         */
        queryClient.setQueryData(
          currentQueryKey,
          (
            current
          ) => {
            if (!current) {
              return current;
            }

            const replaceInArray =
              (
                list
              ) =>
                list.map(
                  (
                    item
                  ) =>
                    normalizeId(
                      item?.id
                    ) === id
                      ? {
                          ...item,
                          download_count:
                            optimisticCount,
                        }
                      : item
                );

            if (
              Array.isArray(
                current
              )
            ) {
              return replaceInArray(
                current
              );
            }

            if (
              Array.isArray(
                current?.data
              )
            ) {
              return {
                ...current,
                data:
                  replaceInArray(
                    current.data
                  ),
              };
            }

            if (
              Array.isArray(
                current?.data?.data
              )
            ) {
              return {
                ...current,
                data: {
                  ...current.data,
                  data:
                    replaceInArray(
                      current.data.data
                    ),
                },
              };
            }

            return current;
          }
        );

        queryClient.setQueryData(
          [
            'template',
            id,
          ],
          (
            current
          ) => {
            if (!current) {
              return current;
            }

            if (
              current?.data?.data
            ) {
              return {
                ...current,
                data: {
                  ...current.data,
                  data: {
                    ...current.data.data,
                    download_count:
                      optimisticCount,
                  },
                },
              };
            }

            if (
              current?.data &&
              typeof current.data ===
                'object'
            ) {
              return {
                ...current,
                data: {
                  ...current.data,
                  download_count:
                    optimisticCount,
                },
              };
            }

            if (
              typeof current ===
              'object'
            ) {
              return {
                ...current,
                download_count:
                  optimisticCount,
              };
            }

            return current;
          }
        );

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              'templates',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'template',
              id,
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'template-statistics',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-stats',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-templates',
            ],
          }),
        ]);

        toast.success(
          'Şablon indirildi'
        );
      } catch (
        downloadError
      ) {
        console.error(
          'Template download error:',
          downloadError
        );

        toast.error(
          getErrorMessage(
            downloadError,
            'Şablon indirilemedi'
          )
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
    isLoading &&
    !data
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader text="Şablonlar yükleniyor..." />
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
        title="Şablonlar yüklenemedi"
        message="Şablon kayıtları alınırken bir hata oluştu."
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
              bg-indigo-50
              text-indigo-600
              dark:bg-indigo-500/[0.08]
              dark:text-indigo-400
            "
          >
            <Files size={21} />
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
              Şablonlar
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
              Dilekçe, ihtar ve sözleşme şablonlarını hukuk alanlarına göre yönetin.
            </p>

            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              Toplam{' '}
              <span className="font-semibold text-gray-600 dark:text-slate-300">
                {totalTemplates}
              </span>{' '}
              şablon
            </p>

          </div>

        </div>

        {canCreate && (
          <Link to="/templates/create">

            <Button>
              <Plus className="h-4 w-4" />
              Yeni Şablon
            </Button>

          </Link>
        )}

      </div>

      {/* FILTERS */}

      <Card>

        <Card.Body>

          <div className="flex flex-col gap-3 xl:flex-row">

            <div className="flex flex-1 flex-col gap-2 sm:flex-row">

              <Input
                placeholder="Şablon adı veya açıklamada ara..."
                value={
                  search
                }
                onChange={(
                  event
                ) => {
                  setSearch(
                    event.target.value.slice(
                      0,
                      200
                    )
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

            <div className="flex flex-col gap-2 sm:flex-row">

              <div className="min-w-[190px]">

                <select
                  value={
                    categoryFilter
                  }
                  onChange={
                    handleCategoryChange
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
                  "
                >
                  {CATEGORY_OPTIONS.map(
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

              <div className="min-w-[200px]">

                <select
                  value={
                    lawAreaFilter
                  }
                  onChange={
                    handleLawAreaChange
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
                  "
                >
                  {LAW_AREA_OPTIONS.map(
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

          {isFetching &&
            !isLoading && (
              <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
                Liste güncelleniyor...
              </p>
            )}

        </Card.Body>

      </Card>

      {/* EMPTY / TABLE */}

      {templates.length ===
      0 ? (
        <Empty
          icon={
            FileSignature
          }
          title={
            hasFilters
              ? 'Eşleşen şablon bulunamadı'
              : 'Henüz şablon bulunmuyor'
          }
          description={
            hasFilters
              ? 'Arama veya filtre kriterlerini değiştirerek tekrar deneyin.'
              : canCreate
                ? 'Yeni bir hukuk belgesi şablonu oluşturarak kütüphanenizi hazırlayabilirsiniz.'
                : 'Henüz görüntüleyebileceğiniz bir şablon kaydı bulunmuyor.'
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
              <Link to="/templates/create">

                <Button>
                  <Plus className="h-4 w-4" />
                  İlk Şablonu Oluştur
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
                  Şablon
                </Table.HeadCell>

                <Table.HeadCell>
                  Kategori
                </Table.HeadCell>

                <Table.HeadCell>
                  Hukuk Alanı
                </Table.HeadCell>

                <Table.HeadCell>
                  Versiyon
                </Table.HeadCell>

                <Table.HeadCell>
                  İndirme
                </Table.HeadCell>

                <Table.HeadCell className="text-right">
                  İşlem
                </Table.HeadCell>

              </Table.Row>

            </Table.Head>

            <Table.Body>

              {templates.map(
                (
                  template,
                  index
                ) => {
                  const templateId =
                    normalizeId(
                      template?.id
                    );

                  return (
                  <Table.Row
                    key={
                      templateId ||
                      `${currentPage}-${index}`
                    }
                  >

                    {/* TEMPLATE */}

                    <Table.Cell>

                      <div className="flex min-w-[18rem] items-start gap-3">

                        <div
                          className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-indigo-50
                            text-indigo-600
                            dark:bg-indigo-500/[0.08]
                            dark:text-indigo-400
                          "
                        >
                          <FileSignature size={18} />
                        </div>

                        <div className="min-w-0">

                          {templateId ? (
                            <Link
                              to={`/templates/${templateId}`}
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
                                template.title ||
                                'İsimsiz şablon'
                              }
                            >
                              {template.title ||
                                'İsimsiz şablon'}
                            </Link>
                          ) : (
                            <span
                              className="
                                block
                                max-w-sm
                                truncate
                                font-semibold
                                text-gray-900
                                dark:text-white
                              "
                            >
                              {template.title ||
                                'İsimsiz şablon'}
                            </span>
                          )}

                          {template.description && (
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
                                template.description
                              }
                            >
                              {template.description}
                            </p>
                          )}

                        </div>

                      </div>

                    </Table.Cell>

                    {/* CATEGORY */}

                    <Table.Cell>

                      <Badge
                        variant={
                          getCategoryVariant(
                            template.category
                          )
                        }
                        dot
                      >
                        {getCategoryLabel(
                          template.category
                        )}
                      </Badge>

                    </Table.Cell>

                    {/* LAW AREA */}

                    <Table.Cell>

                      <Badge
                        variant={
                          getLawAreaVariant(
                            template.law_area
                          )
                        }
                      >
                        {getLawAreaLabel(
                          template.law_area
                        )}
                      </Badge>

                    </Table.Cell>

                    {/* VERSION */}

                    <Table.Cell>

                      <span
                        className="
                          inline-flex
                          rounded-md
                          bg-gray-100
                          px-2
                          py-1
                          font-mono
                          text-xs
                          font-semibold
                          text-gray-600
                          dark:bg-white/[0.05]
                          dark:text-slate-400
                        "
                      >
                        v{template.version ||
                          1}
                      </span>

                    </Table.Cell>

                    {/* DOWNLOAD COUNT */}

                    <Table.Cell>

                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">

                        <Download className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />

                        <span className="font-medium">
                          {Number(
                            template.download_count
                          ) || 0}
                        </span>

                      </div>

                    </Table.Cell>

                    {/* ACTIONS */}

                    <Table.Cell className="text-right">

                      <div className="flex items-center justify-end gap-1">

                        {templateId ? (
                          <Link
                            to={`/templates/${templateId}`}
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
                            title="Şablonu görüntüle"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        ) : (
                          <span
                            className="
                              inline-flex
                              h-8
                              w-8
                              items-center
                              justify-center
                              rounded-lg
                              text-gray-300
                              dark:text-slate-700
                            "
                            title="Geçersiz şablon kaydı"
                          >
                            <Eye className="h-4 w-4" />
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            handleDownload(
                              templateId,
                              template.file_name
                            )
                          }
                          disabled={
                            !templateId ||
                            Boolean(
                              downloadingId
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
                            hover:bg-emerald-50
                            hover:text-emerald-600
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                            dark:text-slate-500
                            dark:hover:bg-emerald-500/[0.08]
                            dark:hover:text-emerald-400
                          "
                          title="Şablonu indir"
                        >
                          <Download
                            className={`h-4 w-4 ${
                              downloadingId ===
                              templateId
                                ? 'animate-pulse'
                                : ''
                            }`}
                          />
                        </button>

                      </div>

                    </Table.Cell>

                  </Table.Row>
                  );
                }
              )}

            </Table.Body>

          </Table>

          {/* PAGINATION */}

          {totalPages >
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
                    {totalTemplates}
                  </span>{' '}
                  şablon
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

export default TemplatesList;