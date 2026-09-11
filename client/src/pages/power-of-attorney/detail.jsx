import {
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  useMutation,
  useQuery,
  useQueryClient,
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

import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';

import {
  ArrowLeft,
  CalendarDays,
  Download,
  Edit2,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Image,
  Inbox,
  KeyRound,
  Link2,
  Paperclip,
  ScrollText,
  UserRound,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const STATUS_OPTIONS = [
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
      value?.id;

    return objectId === null ||
      objectId === undefined ||
      objectId === ''
      ? ''
      : String(
          objectId
        );
  }

  return String(
    value
  );
};

const normalizeDocuments = (
  value
) => {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  const seen =
    new Set();

  return value
    .map(
      (entry) =>
        entry?.document ||
        entry
    )
    .filter(Boolean)
    .filter(
      (documentItem) => {
        const id =
          normalizeId(
            documentItem?.id
          );

        const key =
          id ||
          [
            documentItem?.original_name,
            documentItem?.name,
            documentItem?.created_at,
          ]
            .filter(Boolean)
            .join('|');

        if (
          !key ||
          seen.has(
            key
          )
        ) {
          return false;
        }

        seen.add(
          key
        );

        return true;
      }
    );
};

const sanitizeDownloadFilename = (
  value
) => {
  const normalized =
    String(
      value ||
      'belge'
    )
      .replace(
        /[\r\n\0]/g,
        ''
      )
      .replace(
        /[\\/]+/g,
        '_'
      )
      .trim();

  return (
    normalized ||
    'belge'
  ).slice(
    0,
    255
  );
};

// ======================================================
// HELPERS
// ======================================================

const getStatusVariant = (
  status
) => {
  switch (status) {
    case 'active':
      return 'success';

    case 'expired':
      return 'warning';

    case 'cancelled':
      return 'danger';

    default:
      return 'default';
  }
};

const getStatusLabel = (
  status
) => {
  return (
    STATUS_OPTIONS.find(
      (item) =>
        item.value ===
        status
    )?.label ||
    status ||
    'Bilinmiyor'
  );
};

const getFileIcon = (
  fileType
) => {
  switch (fileType) {
    case 'excel':
      return (
        <FileSpreadsheet className="h-5 w-5" />
      );

    case 'image':
      return (
        <Image className="h-5 w-5" />
      );

    case 'pdf':
    case 'word':
    case 'udf':
      return (
        <FileText className="h-5 w-5" />
      );

    default:
      return (
        <Paperclip className="h-5 w-5" />
      );
  }
};

const formatFileSize = (
  bytes
) => {
  const size =
    Number(bytes) || 0;

  if (size <= 0) {
    return '0 B';
  }

  const units = [
    'B',
    'KB',
    'MB',
    'GB',
  ];

  const index = Math.min(
    Math.floor(
      Math.log(size) /
        Math.log(1024)
    ),
    units.length - 1
  );

  const value =
    size /
    1024 ** index;

  return `${Number(
    value.toFixed(2)
  )} ${units[index]}`;
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
        timeZone:
          'Europe/Istanbul',

        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }
    ).format(parsed);
  } catch {
    return '-';
  }
};

const formatDateTime = (
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
        timeZone:
          'Europe/Istanbul',

        day: '2-digit',
        month: '2-digit',
        year: 'numeric',

        hour: '2-digit',
        minute: '2-digit',

        hour12: false,
      }
    ).format(parsed);
  } catch {
    return '-';
  }
};

const getPersonName = (
  person,
  fallback = '-'
) => {
  if (!person) {
    return fallback;
  }

  const fullName = [
    person.first_name,
    person.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    fullName ||
    fallback
  );
};

// ======================================================
// COMPONENT
// ======================================================

const PowerOfAttorneyDetail = () => {
  const {
    id: idParam,
  } =
    useParams();

  const id =
    normalizeId(
      idParam
    );

  const queryClient =
    useQueryClient();

  const [
    downloadingId,
    setDownloadingId,
  ] = useState('');

  const {
    user,
  } = useAuth();

  const canEdit =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_POWER_OF_ATTORNEY
    );

  const canViewDocuments =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_DOCUMENTS
    );

  const canUploadDocuments =
    hasPermission(
      user,
      PERMISSION_KEYS.UPLOAD_DOCUMENTS
    );

  const canDownloadDocuments =
    hasPermission(
      user,
      PERMISSION_KEYS.DOWNLOAD_DOCUMENTS
    );

  // ======================================================
  // QUERY
  // ======================================================

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      'powerOfAttorney',
      id,
    ],

    queryFn: () =>
      powerOfAttorneyApi.getOne(
        id
      ),

    enabled:
      Boolean(
        id
      ),

    // Belge yükleme ekranından geri dönünce embedded
    // documents listesini F5 beklemeden yeniden çek.
    staleTime: 0,
    refetchOnMount:
      'always',
    refetchOnWindowFocus:
      true,
  });

  const item =
    data?.data?.data ??
    data?.data ??
    null;

  // ======================================================
  // MUTATIONS
  // ======================================================

  const refreshRelatedViews =
    async ({
      includeDetail = true,
      includeDocuments = false,
    } = {}) => {
      const clientId =
        normalizeId(
          item?.client_id ??
          item?.client?.id
        );

      const caseId =
        normalizeId(
          item?.case_id ??
          item?.case?.id
        );

      const invalidations = [
        queryClient.invalidateQueries({
          queryKey: [
            'powerOfAttorneys',
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            'dashboard-stats',
          ],
        }),
      ];

      if (
        includeDetail &&
        id
      ) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              'powerOfAttorney',
              id,
            ],
          })
        );
      }

      if (
        includeDocuments
      ) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              'documents',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'case-documents',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'client-documents',
            ],
          })
        );
      }

      if (
        clientId
      ) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              'client',
              clientId,
            ],
          })
        );
      }

      if (
        caseId
      ) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              'case',
              caseId,
            ],
          })
        );
      }

      await Promise.all(
        invalidations
      );
    };

  const updateStatusMutation =
    useMutation({
      mutationFn: (
        status
      ) => {
        if (
          !id
        ) {
          throw new Error(
            'Geçerli vekaletname kaydı bulunamadı'
          );
        }

        if (
          !STATUS_OPTIONS.some(
            (option) =>
              option.value ===
              status
          )
        ) {
          throw new Error(
            'Geçersiz vekaletname durumu'
          );
        }

        return powerOfAttorneyApi.updateStatus(
          id,
          status
        );
      },

      onSuccess: async () => {
        await refreshRelatedViews();

        toast.success(
          'Durum güncellendi'
        );
      },

      onError: (error) => {
        toast.error(
          error?.response
            ?.data?.message ||
          error?.message ||
          'Durum güncellenemedi'
        );
      },
    });

  // ======================================================
  // DOWNLOAD
  // ======================================================

  const handleDownload =
    async (
      docId,
      docName
    ) => {
      if (!canDownloadDocuments) {
        toast.error(
          'Belge indirme yetkiniz bulunmuyor'
        );

        return;
      }

      const normalizedDocumentId =
        normalizeId(
          docId
        );

      if (
        !normalizedDocumentId
      ) {
        toast.error(
          'Belge bulunamadı'
        );

        return;
      }

      if (
        downloadingId
      ) {
        return;
      }

      setDownloadingId(
        normalizedDocumentId
      );

      let objectUrl = null;
      let link = null;

      try {
        const response =
          await documentApi.download(
            normalizedDocumentId
          );

        const contentType =
          response.headers?.[
            'content-type'
          ] ||
          'application/octet-stream';

        const blob =
          response.data instanceof
            Blob
            ? response.data
            : new Blob(
                [
                  response.data,
                ],
                {
                  type:
                    contentType,
                }
              );

        if (
          blob.size <= 0
        ) {
          throw new Error(
            'Sunucu boş dosya döndürdü'
          );
        }

        objectUrl =
          window.URL.createObjectURL(
            blob
          );

        link =
          window.document.createElement(
            'a'
          );

        link.href =
          objectUrl;

        link.download =
          sanitizeDownloadFilename(
            docName
          );

        link.style.display =
          'none';

        window.document.body.appendChild(
          link
        );

        link.click();

        toast.success(
          'Belge indirildi'
        );
      } catch (error) {
        console.error(
          'Download error:',
          error
        );

        toast.error(
          error?.response
            ?.data?.message ||
          error?.message ||
          'Belge indirilemedi'
        );
      } finally {
        setDownloadingId(
          ''
        );

        if (
          link?.parentNode
        ) {
          link.parentNode.removeChild(
            link
          );
        }

        if (
          objectUrl
        ) {
          window.setTimeout(
            () =>
              window.URL.revokeObjectURL(
                objectUrl
              ),
            1000
          );
        }
      }
    };

  // ======================================================
  // LOADING
  // ======================================================

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Vekaletname yükleniyor...
          </p>

        </div>

      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    error ||
    !item
  ) {
    return (
      <div className="py-12 text-center">

        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800">
          <ScrollText className="h-6 w-6" />
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Vekaletname Bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {error?.response
            ?.data?.message ||
            error?.message ||
            'Vekaletname bilgileri yüklenemedi'}
        </p>

        <Link
          to="/power-of-attorney"
          className="mt-4 inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Vekaletnamelere Dön
        </Link>

      </div>
    );
  }

  // ======================================================
  // DERIVED
  // ======================================================

  const title =
    String(
      item.title ||
      ''
    ).trim() ||
    `${item.client?.name || 'Müvekkil'} Vekaletnamesi`;

  const documents =
    normalizeDocuments(
      item.documents
    );

  const clientId =
    normalizeId(
      item.client?.id ??
      item.client_id
    );

  const caseId =
    normalizeId(
      item.case?.id ??
      item.case_id
    );

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <Link
            to="/power-of-attorney"
            className="
              inline-flex
              items-center
              gap-1.5
              text-xs
              font-medium
              text-gray-500
              transition
              hover:text-blue-600
              dark:text-slate-500
              dark:hover:text-blue-400
            "
          >
            <ArrowLeft className="h-3.5 w-3.5" />

            Vekaletnameler
          </Link>

          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
            {title}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">

            <Badge
              variant={getStatusVariant(
                item.status
              )}
            >
              {getStatusLabel(
                item.status
              )}
            </Badge>

            <Badge variant="default">
              <span className="inline-flex items-center gap-1">
                <ScrollText className="h-3.5 w-3.5" />
                Vekaletname
              </span>
            </Badge>

            {documents.length >
              0 && (
              <Badge variant="info">
                {documents.length}{' '}
                belge
              </Badge>
            )}

          </div>

        </div>

        {/* ACTIONS */}

        <div className="flex flex-wrap gap-2">

          {canEdit && (
            <select
              value={
                item.status
              }
              onChange={(event) => {
                const nextStatus =
                  event.target.value;

                if (
                  nextStatus ===
                    item.status ||
                  updateStatusMutation.isPending
                ) {
                  return;
                }

                updateStatusMutation.mutate(
                  nextStatus
                );
              }}
              disabled={
                updateStatusMutation.isPending
              }
              className="
                rounded-md
                border
                border-gray-300
                bg-white
                px-3
                py-2
                text-sm
                text-gray-900
                outline-none
                focus:ring-2
                focus:ring-blue-500
                disabled:cursor-not-allowed
                disabled:opacity-60
                dark:border-gray-600
                dark:bg-gray-700
                dark:text-white
              "
            >

              {STATUS_OPTIONS.map(
                (status) => (
                  <option
                    key={
                      status.value
                    }
                    value={
                      status.value
                    }
                  >
                    {
                      status.label
                    }
                  </option>
                )
              )}

            </select>
          )}

          {canEdit && (
            <Link
              to={`/power-of-attorney/${normalizeId(
                item.id
              )}/edit`}
            >
              <Button
                variant="outline"
                size="sm"
              >
                <Edit2 className="mr-2 h-4 w-4" />

                Düzenle
              </Button>
            </Link>
          )}


        </div>

      </div>

      {/* MAIN INFO */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* CLIENT / CASE */}

        <Card className="lg:col-span-2">

          <Card.Header>

            <div className="flex items-center gap-2">

              <Link2 className="h-4 w-4 text-blue-600" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Vekalet Bilgileri
              </h2>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            {/* CLIENT */}

            <div>

              <div className="mb-1 flex items-center gap-2 text-sm text-gray-500">

                <UserRound className="h-4 w-4" />

                Müvekkil

              </div>

              {clientId ? (
                <Link
                  to={`/clients/${clientId}`}
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {item.client?.name ||
                    'Müvekkili Görüntüle'}
                </Link>
              ) : (
                <span className="text-gray-400">
                  -
                </span>
              )}

              {item.client
                ?.identification_number && (
                <p className="mt-1 text-xs text-gray-500">
                  TCKNO / VKN:{' '}
                  {
                    item.client
                      .identification_number
                  }
                </p>
              )}

            </div>

            {/* CASE */}

            <div>

              <p className="text-sm text-gray-500">
                İlişkili Dava
              </p>

              {caseId ? (
                <Link
                  to={`/cases/${caseId}`}
                  className="mt-1 inline-block font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {item.case?.title ||
                    item.case?.court_name ||
                    'Davayı Görüntüle'}

                  {item.case?.case_number &&
                    ` · ${item.case.case_number}`}
                </Link>
              ) : (
                <p className="mt-1 text-gray-400">
                  İlişkili dava yok
                </p>
              )}

            </div>

            {/* DESCRIPTION */}

            {item.description && (
              <div>

                <p className="text-sm text-gray-500">
                  Açıklama
                </p>

                <p className="mt-1 whitespace-pre-wrap leading-7 text-gray-900 dark:text-white">
                  {
                    item.description
                  }
                </p>

              </div>
            )}

          </Card.Body>

        </Card>

        {/* DATES */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-2">

              <CalendarDays className="h-4 w-4 text-blue-600" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Tarihler
              </h2>

            </div>

          </Card.Header>

          <Card.Body className="space-y-4">

            <div>

              <p className="text-sm text-gray-500">
                Başlangıç
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {formatDate(
                  item.start_date
                )}
              </p>

            </div>

            <div>

              <p className="text-sm text-gray-500">
                Bitiş
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {formatDate(
                  item.end_date
                )}
              </p>

            </div>

            <div className="border-t border-gray-200 pt-4 dark:border-gray-700">

              <p className="text-sm text-gray-500">
                Oluşturulma
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {formatDateTime(
                  item.created_at
                )}
              </p>

            </div>

            <div>

              <p className="text-sm text-gray-500">
                Oluşturan
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {getPersonName(
                  item.creator
                )}
              </p>

            </div>

          </Card.Body>

        </Card>

      </div>

      {/* AUTHORITIES */}

      {Array.isArray(
        item.authorities
      ) &&
        item.authorities.length >
          0 && (
          <Card>

            <Card.Header>

              <div className="flex items-center gap-2">

                <KeyRound className="h-4 w-4 text-blue-600" />

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Yetkiler
                </h2>

              </div>

            </Card.Header>

            <Card.Body>

              <div className="flex flex-wrap gap-2">

                {item.authorities.map(
                  (
                    authority,
                    index
                  ) => (
                    <Badge
                      key={`${authority}-${index}`}
                      variant="default"
                    >
                      {
                        authority
                      }
                    </Badge>
                  )
                )}

              </div>

            </Card.Body>

          </Card>
        )}

      {/* DOCUMENTS */}

      <Card>

        <Card.Header>

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <FileText className="h-4 w-4 text-blue-600" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Belgeler
              </h2>

              {documents.length >
                0 && (
                <Badge variant="default">
                  {
                    documents.length
                  }
                </Badge>
              )}

            </div>

            {canUploadDocuments && (
              <Link
                to={`/documents/upload?power_of_attorney_id=${normalizeId(
                  item.id
                )}`}
              >
                <Button
                  size="sm"
                  variant="outline"
                >
                  <FilePlus2 className="mr-2 h-4 w-4" />

                  Belge Ekle
                </Button>
              </Link>
            )}

          </div>

        </Card.Header>

        <Card.Body>

          {!canViewDocuments ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800">
                <Inbox className="h-5 w-5" />
              </div>

              <p className="mt-3 font-medium text-gray-700 dark:text-gray-300">
                Belgeleri görüntüleme yetkiniz bulunmuyor
              </p>
            </div>
          ) : documents.length ===
          0 ? (
            <div className="py-8 text-center">

              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800">
                <Inbox className="h-5 w-5" />
              </div>

              <p className="mt-3 font-medium text-gray-700 dark:text-gray-300">
                Bu vekaletnameye bağlı belge bulunmuyor
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Vekaletname dosyasını veya ilgili ek belgeleri buraya bağlayabilirsiniz.
              </p>

              {canUploadDocuments && (
                <Link
                  to={`/documents/upload?power_of_attorney_id=${normalizeId(
                  item.id
                )}`}
                  className="mt-3 inline-block text-sm text-blue-600 hover:underline"
                >
                  İlk belgeyi ekle
                </Link>
              )}

            </div>
          ) : (
            <div className="space-y-2">

              {documents.map(
                (doc) => (
                  <div
                    key={
                      doc.id
                    }
                    className="
                      flex
                      flex-col
                      gap-3
                      rounded-xl
                      border
                      border-gray-200
                      bg-gray-50
                      p-4
                      transition
                      hover:border-gray-300
                      hover:bg-gray-100
                      dark:border-gray-700
                      dark:bg-gray-800
                      dark:hover:bg-gray-700
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >

                    <div className="flex min-w-0 items-center gap-3">

                      <span className="shrink-0 text-2xl">
                        {getFileIcon(
                          doc.file_type
                        )}
                      </span>

                      <div className="min-w-0">

                        <Link
                          to={`/documents/${normalizeId(
                            doc.id
                          )}`}
                          className="block truncate font-medium text-gray-900 hover:text-blue-600 hover:underline dark:text-white"
                        >
                          {doc.name ||
                            doc.original_name ||
                            'Belge'}
                        </Link>

                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-gray-500">

                          <span>
                            {formatFileSize(
                              doc.file_size
                            )}
                          </span>

                          {doc.created_at && (
                            <>
                              <span>
                                •
                              </span>

                              <span>
                                {formatDateTime(
                                  doc.created_at
                                )}
                              </span>
                            </>
                          )}

                        </div>

                      </div>

                    </div>

                    <div className="flex shrink-0 items-center gap-2">

                      {canViewDocuments && (
                        <Link
                          to={`/documents/${normalizeId(
                            doc.id
                          )}`}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            Görüntüle
                          </Button>
                        </Link>
                      )}

                      {canDownloadDocuments && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          loading={
                            downloadingId ===
                            normalizeId(
                              doc.id
                            )
                          }
                          disabled={
                            Boolean(
                              downloadingId
                            )
                          }
                          onClick={() =>
                            handleDownload(
                              doc.id,
                              doc.original_name ||
                                doc.name
                            )
                          }
                        >
                          <Download className="mr-2 h-4 w-4" />

                          İndir
                        </Button>
                      )}

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </Card.Body>

      </Card>

      {/* LEGACY FILE */}

      {canViewDocuments &&
        item.file_url &&
        documents.length ===
          0 && (
          <Card>

            <Card.Header>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Eski Dosya Kaydı
              </h2>

            </Card.Header>

            <Card.Body>

              <div className="flex flex-col gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex min-w-0 items-center gap-3">

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-800/40 dark:text-amber-300">
                    <FileText className="h-5 w-5" />
                  </span>

                  <div className="min-w-0">

                    <p className="truncate font-medium text-gray-900 dark:text-white">
                      {item.file_name ||
                        'Vekaletname'}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {formatFileSize(
                        item.file_size
                      )}
                    </p>

                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      Bu kayıt eski dosya alanından geliyor. Yeni belgeler belge modülü üzerinden yönetiliyor.
                    </p>

                  </div>

                </div>

                {canDownloadDocuments && (
                  <a
                    href={
                      item.file_url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                  >
                    <Download className="h-4 w-4" />

                    Dosyayı Aç
                  </a>
                )}

              </div>

            </Card.Body>

          </Card>
        )}

      {/* NOTES */}

      {item.notes && (
        <Card>

          <Card.Header>

            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Notlar
              </h2>
            </div>

          </Card.Header>

          <Card.Body>

            <p className="whitespace-pre-wrap leading-7 text-gray-900 dark:text-white">
              {
                item.notes
              }
            </p>

          </Card.Body>

        </Card>
      )}

    </div>
  );
};

export default PowerOfAttorneyDetail;