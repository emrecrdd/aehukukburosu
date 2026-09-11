import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  useDocuments,
  useDocumentCategories,
  useDeleteDocument,
  useBulkDeleteDocuments,
} from '../../features/documents/document.query.js';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import Button from '../../components/ui/Button.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';
import Loader from '../../components/shared/Loader.jsx';
import Error from '../../components/shared/Error.jsx';
import Empty from '../../components/shared/Empty.jsx';

import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  Eye,
  File,
  FileArchive,
  FileImage,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Files,
  FileType2,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import {
  useDebounce,
} from '../../hooks/useDebounce.js';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const CATEGORY_LABELS = {
  general: 'Genel',
  petition: 'Dilekçe',
  expert_report: 'Bilirkişi Raporu',
  court_decision: 'Mahkeme Kararı',
  notification: 'Tebligat',
  evidence: 'Delil',
  correspondence: 'Yazışma',
  other: 'Diğer',
};

// ======================================================
// HELPERS
// ======================================================

const getCategoryLabel = (
  category
) => {
  return (
    CATEGORY_LABELS[
      category
    ] ||
    category ||
    'Genel'
  );
};

const getCategoryVariant = (
  category
) => {
  const variants = {
    general: 'default',
    petition: 'primary',
    expert_report: 'info',
    court_decision: 'success',
    notification: 'warning',
    evidence: 'danger',
    correspondence: 'primary',
    other: 'default',
  };

  return (
    variants[
      category
    ] ||
    'default'
  );
};

const getFileTypeLabel = (
  fileType
) => {
  const labels = {
    pdf: 'PDF',
    word: 'Word',
    excel: 'Excel',
    udf: 'UDF',
    image: 'Görsel',
    archive: 'Arşiv',
    other: 'Dosya',
  };

  return (
    labels[
      fileType
    ] ||
    'Dosya'
  );
};

const getFileIcon = (
  fileType
) => {
  switch (
    fileType
  ) {
    case 'pdf':
      return FileText;

    case 'word':
      return FileType2;

    case 'excel':
      return FileSpreadsheet;

    case 'udf':
      return FileText;

    case 'image':
      return FileImage;

    case 'archive':
      return FileArchive;

    default:
      return File;
  }
};

const getFileIconClasses = (
  fileType
) => {
  switch (
    fileType
  ) {
    case 'pdf':
      return 'bg-red-50 text-red-600 dark:bg-red-500/[0.08] dark:text-red-400';

    case 'word':
      return 'bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400';

    case 'excel':
      return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400';

    case 'udf':
      return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/[0.08] dark:text-cyan-400';

    case 'image':
      return 'bg-violet-50 text-violet-600 dark:bg-violet-500/[0.08] dark:text-violet-400';

    case 'archive':
      return 'bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400';

    default:
      return 'bg-gray-50 text-gray-500 dark:bg-white/[0.04] dark:text-slate-400';
  }
};

const formatFileSize = (
  bytes
) => {
  const size =
    Number(
      bytes
    ) || 0;

  if (
    size <= 0
  ) {
    return '0 B';
  }

  const units = [
    'B',
    'KB',
    'MB',
    'GB',
  ];

  const index =
    Math.min(
      Math.floor(
        Math.log(
          size
        ) /
          Math.log(
            1024
          )
      ),
      units.length -
        1
    );

  const value =
    size /
    1024 **
      index;

  return `${Number(
    value.toFixed(
      2
    )
  )} ${
    units[index]
  }`;
};

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

const getCaseDisplayName = (
  caseItem
) => {
  if (!caseItem) {
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

const getPersonName = (
  person,
  fallback = '-'
) => {
  if (!person) {
    return fallback;
  }

  const name = [
    person.first_name,
    person.last_name,
  ]
    .filter(
      Boolean
    )
    .join(' ')
    .trim();

  return (
    name ||
    fallback
  );
};

const unwrapResponseData = (
  response
) => {
  return (
    response?.data
      ?.data ??
    response?.data ??
    null
  );
};

// ======================================================
// COMPONENT
// ======================================================

const DocumentsList = () => {
  const navigate =
    useNavigate();

  const {
    user,
  } =
    useAuth();

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    categoryFilter,
    setCategoryFilter,
  ] =
    useState('');

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    selectedDocs,
    setSelectedDocs,
  ] =
    useState([]);

  const [
    deleteDialog,
    setDeleteDialog,
  ] =
    useState(null);

  const debouncedSearch =
    useDebounce(
      search,
      500
    );

  // ====================================================
  // PERMISSIONS
  // ====================================================

  const canUpload =
    hasPermission(
      user,
      PERMISSION_KEYS.UPLOAD_DOCUMENTS
    );

  const canEdit =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_DOCUMENTS
    );

  const canDelete =
    hasPermission(
      user,
      PERMISSION_KEYS.DELETE_DOCUMENTS
    );

  const canViewCases =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_CASES
    );

  // ====================================================
  // QUERIES
  // ====================================================

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } =
    useDocuments({
      page,

      search:
        debouncedSearch,

      category:
        categoryFilter,
    });

  const {
    data:
      categoriesData,
  } =
    useDocumentCategories();

  // ====================================================
  // MUTATIONS
  // ====================================================

  const deleteMutation =
    useDeleteDocument();

  const bulkDeleteMutation =
    useBulkDeleteDocuments();

  // ====================================================
  // DATA
  // ====================================================

  const documents =
    Array.isArray(
      data?.data
        ?.data
    )
      ? data.data.data
      : [];

  const pagination =
    data?.data
      ?.pagination;

  const categories =
    useMemo(
      () => {
        const raw =
          unwrapResponseData(
            categoriesData
          );

        if (
          !Array.isArray(
            raw
          )
        ) {
          return [];
        }

        return [
          ...new Set(
            raw.filter(
              Boolean
            )
          ),
        ].sort(
          (
            a,
            b
          ) =>
            getCategoryLabel(
              a
            ).localeCompare(
              getCategoryLabel(
                b
              ),
              'tr'
            )
        );
      },
      [
        categoriesData,
      ]
    );

  const hasFilters =
    Boolean(
      debouncedSearch ||
      categoryFilter
    );

  // ====================================================
  // SELECTION CLEANUP
  // ====================================================

  useEffect(() => {
    setSelectedDocs(
      []
    );
  }, [
    page,
    debouncedSearch,
    categoryFilter,
  ]);

  // ====================================================
  // HANDLERS
  // ====================================================

  const handleCategoryChange =
    (
      event
    ) => {
      setCategoryFilter(
        event.target.value
      );

      setPage(
        1
      );
    };

  const handleSearchChange =
    (
      event
    ) => {
      setSearch(
        event.target.value
      );

      setPage(
        1
      );
    };

  const handleClearFilters =
    () => {
      setSearch('');
      setCategoryFilter('');
      setPage(1);
    };

  const handleDelete =
    (
      doc
    ) => {
      if (
        !canDelete
      ) {
        toast.error(
          'Bu işlem için yetkiniz bulunmuyor.'
        );

        return;
      }

      if (
        !doc?.id
      ) {
        toast.error(
          'Geçersiz belge kaydı'
        );

        return;
      }

      setDeleteDialog({
        type:
          'single',

        document:
          doc,
      });
    };

  const handleBulkDelete =
    () => {
      if (
        !canDelete ||
        selectedDocs.length ===
          0
      ) {
        return;
      }

      setDeleteDialog({
        type:
          'bulk',

        ids: [
          ...selectedDocs,
        ],
      });
    };

  const isDeletePending =
    deleteMutation.isPending ||
    bulkDeleteMutation.isPending;

  const handleCloseDeleteDialog =
    () => {
      if (
        isDeletePending
      ) {
        return;
      }

      setDeleteDialog(
        null
      );
    };

  const handleConfirmDelete =
    () => {
      if (
        !deleteDialog ||
        isDeletePending
      ) {
        return;
      }

      if (
        deleteDialog.type ===
        'single'
      ) {
        const documentId =
          deleteDialog
            ?.document
            ?.id;

        if (
          !documentId
        ) {
          setDeleteDialog(
            null
          );

          toast.error(
            'Geçersiz belge kaydı'
          );

          return;
        }

        deleteMutation.mutate(
          documentId,
          {
            onSuccess:
              () => {
                setSelectedDocs(
                  (
                    current
                  ) =>
                    current.filter(
                      (
                        id
                      ) =>
                        id !==
                        documentId
                    )
                );

                setDeleteDialog(
                  null
                );
              },
          }
        );

        return;
      }

      const documentIds =
        Array.isArray(
          deleteDialog.ids
        )
          ? deleteDialog.ids.filter(
              Boolean
            )
          : [];

      if (
        documentIds.length ===
        0
      ) {
        setDeleteDialog(
          null
        );

        return;
      }

      bulkDeleteMutation.mutate(
        documentIds,
        {
          onSuccess:
            () => {
              setSelectedDocs(
                []
              );

              setDeleteDialog(
                null
              );
            },
        }
      );
    };

  useEffect(() => {
    if (
      !deleteDialog
    ) {
      return undefined;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      'hidden';

    const handleKeyDown =
      (
        event
      ) => {
        if (
          event.key ===
            'Escape' &&
          !isDeletePending
        ) {
          setDeleteDialog(
            null
          );
        }
      };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    deleteDialog,
    isDeletePending,
  ]);

  const toggleSelect =
    (
      id
    ) => {
      setSelectedDocs(
        (
          current
        ) =>
          current.includes(
            id
          )
            ? current.filter(
                (
                  documentId
                ) =>
                  documentId !==
                  id
              )
            : [
                ...current,
                id,
              ]
      );
    };

  const allCurrentPageSelected =
    documents.length >
      0 &&
    documents.every(
      (
        doc
      ) =>
        selectedDocs.includes(
          doc.id
        )
    );

  const toggleSelectAll =
    () => {
      const currentPageIds =
        documents.map(
          (
            doc
          ) =>
            doc.id
        );

      if (
        allCurrentPageSelected
      ) {
        setSelectedDocs(
          (
            current
          ) =>
            current.filter(
              (
                id
              ) =>
                !currentPageIds.includes(
                  id
                )
            )
        );

        return;
      }

      setSelectedDocs(
        (
          current
        ) => [
          ...new Set([
            ...current,
            ...currentPageIds,
          ]),
        ]
      );
    };

  // ====================================================
  // PAGINATION SAFETY
  // ====================================================

  useEffect(() => {
    if (
      pagination &&
      page >
        pagination.totalPages &&
      pagination.totalPages >
        0
    ) {
      setPage(
        pagination.totalPages
      );
    }
  }, [
    pagination,
    page,
  ]);

  // ====================================================
  // LOADING
  // ====================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader text="Belgeler yükleniyor..." />
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
        title="Belgeler yüklenemedi"
        message="Belge kayıtları alınırken bir hata oluştu."
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
              bg-violet-50
              text-violet-600
              dark:bg-violet-500/[0.08]
              dark:text-violet-400
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
              Belgeler
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
              Dava ve müvekkillere bağlı belgeleri,
              belge ailelerini ve versiyon geçmişlerini yönetin.
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
                {pagination?.total ||
                  0}
              </span>{' '}
              belge kaydı
            </p>

          </div>

        </div>

        <div className="flex flex-wrap gap-2">

          {canDelete &&
            selectedDocs.length >
              0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={
                  handleBulkDelete
                }
                loading={
                  bulkDeleteMutation.isPending
                }
                disabled={
                  bulkDeleteMutation.isPending
                }
              >
                <Trash2 className="h-4 w-4" />

                Seçilileri Kaldır (
                {selectedDocs.length})
              </Button>
            )}

          {canUpload && (
            <Link to="/documents/upload">
              <Button>
                <FilePlus2 className="h-4 w-4" />
                Belge Yükle
              </Button>
            </Link>
          )}

        </div>

      </div>

      {/* ==================================================
          FILTERS
      ================================================== */}

      <Card>

        <Card.Body>

          <div className="flex flex-col gap-3 lg:flex-row">

            <div className="relative flex-1">

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
                  search
                }
                onChange={
                  handleSearchChange
                }
                placeholder="Belge adı, dosya adı veya açıklamada ara..."
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
                  transition-all
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

            <div className="min-w-[220px]">

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
                  dark:hover:border-white/[0.14]
                  dark:focus:border-blue-500/60
                "
              >
                <option value="">
                  Tüm Kategoriler
                </option>

                {categories.map(
                  (
                    category
                  ) => (
                    <option
                      key={
                        category
                      }
                      value={
                        category
                      }
                    >
                      {getCategoryLabel(
                        category
                      )}
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
                Filtreleri Temizle
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

      {documents.length ===
      0 ? (
        <Empty
          icon={
            Files
          }
          title={
            hasFilters
              ? 'Eşleşen belge bulunamadı'
              : 'Henüz belge kaydı yok'
          }
          description={
            hasFilters
              ? 'Arama veya kategori filtresini değiştirerek tekrar deneyin.'
              : 'İlk belgenizi yükleyerek belge yönetimine başlayabilirsiniz.'
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
            ) : canUpload ? (
              <Link to="/documents/upload">
                <Button>
                  <FilePlus2 className="h-4 w-4" />
                  İlk Belgeyi Yükle
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

                {canDelete && (
                  <Table.HeadCell className="w-10">

                    <input
                      type="checkbox"
                      checked={
                        allCurrentPageSelected
                      }
                      onChange={
                        toggleSelectAll
                      }
                      className="
                        h-4
                        w-4
                        rounded
                        border-gray-300
                        text-blue-600
                        focus:ring-blue-500
                        dark:border-white/[0.15]
                        dark:bg-white/[0.04]
                      "
                      aria-label="Sayfadaki tüm belgeleri seç"
                    />

                  </Table.HeadCell>
                )}

                <Table.HeadCell>
                  Belge
                </Table.HeadCell>

                <Table.HeadCell>
                  Kategori
                </Table.HeadCell>

                <Table.HeadCell>
                  İlişkili Dava
                </Table.HeadCell>

                <Table.HeadCell>
                  Boyut
                </Table.HeadCell>

                <Table.HeadCell>
                  Yükleyen
                </Table.HeadCell>

                <Table.HeadCell>
                  Tarih
                </Table.HeadCell>

                <Table.HeadCell className="text-right">
                  İşlemler
                </Table.HeadCell>

              </Table.Row>

            </Table.Head>

            <Table.Body>

              {documents.map(
                (
                  doc
                ) => {
                  const FileIcon =
                    getFileIcon(
                      doc.file_type
                    );

                  return (
                    <Table.Row
                      key={
                        doc.id
                      }
                    >

                      {/* SELECT */}

                      {canDelete && (
                        <Table.Cell>

                          <input
                            type="checkbox"
                            checked={
                              selectedDocs.includes(
                                doc.id
                              )
                            }
                            onChange={() =>
                              toggleSelect(
                                doc.id
                              )
                            }
                            className="
                              h-4
                              w-4
                              rounded
                              border-gray-300
                              text-blue-600
                              focus:ring-blue-500
                              dark:border-white/[0.15]
                              dark:bg-white/[0.04]
                            "
                            aria-label={`${doc.name} seç`}
                          />

                        </Table.Cell>
                      )}

                      {/* DOCUMENT */}

                      <Table.Cell>

                        <div className="flex min-w-[18rem] items-start gap-3">

                          <div
                            className={`
                              flex
                              h-10
                              w-10
                              shrink-0
                              items-center
                              justify-center
                              rounded-xl
                              ${getFileIconClasses(
                                doc.file_type
                              )}
                            `}
                          >
                            <FileIcon size={19} />
                          </div>

                          <div className="min-w-0">

                            <Link
                              to={`/documents/${doc.id}`}
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
                                doc.name
                              }
                            >
                              {doc.name}
                            </Link>

                            <p
                              className="
                                mt-1
                                max-w-sm
                                truncate
                                text-xs
                                text-gray-400
                                dark:text-slate-500
                              "
                              title={
                                doc.original_name
                              }
                            >
                              {doc.original_name}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-1.5">

                              <Badge variant="info">
                                {getFileTypeLabel(
                                  doc.file_type
                                )}
                              </Badge>

                              {doc.is_public ? (
                                <Badge
                                  variant="success"
                                  dot
                                >
                                  Genel Erişim
                                </Badge>
                              ) : (
                                <Badge
                                  variant="default"
                                  dot
                                >
                                  Kısıtlı
                                </Badge>
                              )}

                              {doc.is_archived && (
                                <Badge variant="warning">
                                  <Archive className="h-3 w-3" />
                                  Arşiv
                                </Badge>
                              )}

                            </div>

                          </div>

                        </div>

                      </Table.Cell>

                      {/* CATEGORY */}

                      <Table.Cell>

                        <Badge
                          variant={
                            getCategoryVariant(
                              doc.category
                            )
                          }
                        >
                          {getCategoryLabel(
                            doc.category
                          )}
                        </Badge>

                      </Table.Cell>

                      {/* CASE */}

                      <Table.Cell>

                        {doc.case ? (
                          canViewCases ? (
                            <Link
                              to={`/cases/${doc.case.id}`}
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
                                  doc.case
                                )
                              }
                            >
                              {getCaseDisplayName(
                                doc.case
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
                                  doc.case
                                )
                              }
                            >
                              {getCaseDisplayName(
                                doc.case
                              )}
                            </span>
                          )
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-slate-600">
                            -
                          </span>
                        )}

                      </Table.Cell>

                      {/* SIZE */}

                      <Table.Cell>

                        <span className="whitespace-nowrap text-sm text-gray-600 dark:text-slate-400">
                          {formatFileSize(
                            doc.file_size
                          )}
                        </span>

                      </Table.Cell>

                      {/* UPLOADER */}

                      <Table.Cell>

                        <span className="whitespace-nowrap text-sm text-gray-700 dark:text-slate-300">
                          {getPersonName(
                            doc.uploader
                          )}
                        </span>

                      </Table.Cell>

                      {/* DATE */}

                      <Table.Cell>

                        <span className="whitespace-nowrap text-xs text-gray-500 dark:text-slate-500">
                          {formatDateTime(
                            doc.created_at
                          )}
                        </span>

                      </Table.Cell>

                      {/* ACTIONS */}

                      <Table.Cell className="text-right">

                        <div className="flex items-center justify-end gap-1">

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/documents/${doc.id}`
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
                            title="Belgeyi görüntüle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/documents/${doc.id}/edit`
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
                                hover:bg-gray-100
                                hover:text-gray-700
                                dark:text-slate-500
                                dark:hover:bg-white/[0.05]
                                dark:hover:text-white
                              "
                              title="Belge bilgilerini düzenle"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  doc
                                )
                              }
                              disabled={
                                deleteMutation.isPending
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
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                                dark:text-slate-500
                                dark:hover:bg-red-500/[0.08]
                                dark:hover:text-red-400
                              "
                              title="Belgeyi kaldır"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}

                        </div>

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
                  belge

                  {selectedDocs.length >
                    0 && (
                    <>
                      {' '}
                      ·{' '}
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {selectedDocs.length} seçili
                      </span>
                    </>
                  )}

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

                  <span
                    className="
                      min-w-[70px]
                      text-center
                      text-xs
                      font-semibold
                      text-gray-600
                      dark:text-slate-400
                    "
                  >
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


      {deleteDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCloseDeleteDialog();
            }
          }}
        >
          <div
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-delete-dialog-title"
            aria-describedby="document-delete-dialog-description"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]"
          >
            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/[0.10] dark:text-red-400">
                  <Trash2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">

                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                    Belge kaldırma onayı
                  </p>

                  <h2
                    id="document-delete-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    {deleteDialog.type ===
                    'bulk'
                      ? 'Seçili belgeleri kaldır'
                      : 'Belge kaydını kaldır'}
                  </h2>

                  <p
                    id="document-delete-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    {deleteDialog.type ===
                    'bulk' ? (
                      <>
                        <span className="font-medium text-gray-700 dark:text-slate-200">
                          {deleteDialog.ids?.length ||
                            0} belge
                        </span>{' '}
                        için bu işlemi onaylayın.
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-gray-700 dark:text-slate-200">
                          {deleteDialog.document?.name ||
                            'Seçili belge'}
                        </span>{' '}
                        için bu işlemi onaylayın.
                      </>
                    )}
                  </p>

                </div>

              </div>

            </div>

            <div className="space-y-4 px-6 py-5">

              <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-500/20 dark:bg-red-500/[0.07]">

                <div className="flex items-start gap-3">

                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

                  <div>

                    <p className="text-sm font-semibold text-red-950 dark:text-red-200">
                      {deleteDialog.type ===
                      'bulk'
                        ? `${deleteDialog.ids?.length || 0} belge kaydı kaldırılacak`
                        : 'Belge kaydı kaldırılacak'}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-900/80 dark:text-red-200/80">
                      {deleteDialog.type ===
                      'bulk'
                        ? 'Seçili belgeler normal belge listelerinden kaldırılacaktır.'
                        : 'Bu belge normal belge listelerinden kaldırılacaktır.'}
                    </p>

                  </div>

                </div>

              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">

                <p className="text-sm leading-6 text-gray-600 dark:text-slate-300">
                  {deleteDialog.type ===
                  'bulk'
                    ? 'Belge kayıtları soft-delete olarak işaretlenir. Dosyalar fiziksel depolamadan hemen silinmez.'
                    : 'Belge kaydı soft-delete olarak işaretlenir. Dosya fiziksel depolamadan hemen silinmez.'}
                </p>

              </div>

              <p className="text-xs leading-5 text-gray-400 dark:text-slate-500">
                Devam etmeden önce doğru belge kaydını seçtiğinizden emin olun.
              </p>

            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.015] sm:flex-row sm:justify-end">

              <Button
                type="button"
                variant="secondary"
                disabled={
                  isDeletePending
                }
                onClick={
                  handleCloseDeleteDialog
                }
              >
                Vazgeç
              </Button>

              <Button
                type="button"
                variant="danger"
                loading={
                  isDeletePending
                }
                disabled={
                  isDeletePending
                }
                onClick={
                  handleConfirmDelete
                }
              >
                <Trash2 className="h-4 w-4" />

                {deleteDialog.type ===
                'bulk'
                  ? 'Belgeleri Kaldır'
                  : 'Belgeyi Kaldır'}
              </Button>

            </div>

          </div>

        </div>
      )}


    </div>
  );
};

export default DocumentsList;