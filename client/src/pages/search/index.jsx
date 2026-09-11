import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import searchApi from '../../features/search/search.api.js';

import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import Loader from '../../components/shared/Loader.jsx';
import Error from '../../components/shared/Error.jsx';
import Empty from '../../components/shared/Empty.jsx';

import {
  ArrowRight,
  Building2,
  CheckSquare,
  FileText,
  FolderOpen,
  NotebookText,
  Scale,
  Search as SearchIcon,
  Sparkles,
  UserRound,
} from 'lucide-react';

import {
  useDebounce,
} from '../../hooks/useDebounce.js';

// ======================================================
// CONSTANTS
// ======================================================

const TYPE_OPTIONS = [
  {
    value: 'all',
    label: 'Tüm Sonuçlar',
  },
  {
    value: 'clients',
    label: 'Müvekkiller',
  },
  {
    value: 'cases',
    label: 'Davalar',
  },
  {
    value: 'consultations',
    label: 'Danışmanlıklar',
  },
  {
    value: 'documents',
    label: 'Belgeler',
  },
  {
    value: 'tasks',
    label: 'Görevler',
  },
  {
    value: 'notes',
    label: 'Notlar',
  },
];

const CASE_STATUS_LABELS = {
  preparation: 'Hazırlık',
  active: 'Devam Ediyor',
  hearing: 'Duruşmada',
  appeal: 'İstinaf',
  cassation: 'Temyiz',
  concluded: 'Sonuçlandı',
  archived: 'Arşivlendi',
};

// ======================================================
// HELPERS
// ======================================================

const getTypeBadge = (
  type
) => {
  const badges = {
    client: {
      label: 'Müvekkil',
      variant: 'success',
    },

    case: {
      label: 'Dava',
      variant: 'info',
    },

    consultation: {
      label: 'Danışmanlık',
      variant: 'primary',
    },

    document: {
      label: 'Belge',
      variant: 'primary',
    },

    task: {
      label: 'Görev',
      variant: 'warning',
    },

    note: {
      label: 'Not',
      variant: 'default',
    },
  };

  return (
    badges[type] ||
    badges.note
  );
};

const getClientStatusVariant = (
  status
) => {
  if (
    status === 'active'
  ) {
    return 'success';
  }

  if (
    status === 'archived'
  ) {
    return 'default';
  }

  return 'warning';
};

const getClientStatusLabel = (
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

const getCaseStatusVariant = (
  status
) => {
  const variants = {
    preparation: 'warning',
    active: 'success',
    hearing: 'info',
    appeal: 'warning',
    cassation: 'default',
    concluded: 'default',
    archived: 'danger',
  };

  return (
    variants[status] ||
    'default'
  );
};

const getTaskStatusVariant = (
  status
) => {
  const variants = {
    pending: 'warning',
    in_progress: 'info',
    completed: 'success',
    cancelled: 'danger',
  };

  return (
    variants[status] ||
    'default'
  );
};

const getTaskStatusLabel = (
  status
) => {
  const labels = {
    pending: 'Bekliyor',
    in_progress: 'Devam Ediyor',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
  };

  return (
    labels[status] ||
    status ||
    '-'
  );
};

const formatFileSize = (
  bytes
) => {
  const size =
    Number(bytes) || 0;

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
        Math.log(size) /
          Math.log(1024)
      ),
      units.length - 1
    );

  const value =
    size /
    1024 ** index;

  return `${Number(
    value.toFixed(1)
  )} ${units[index]}`;
};

const getAssigneeName = (
  task
) => {
  const assignees =
    Array.isArray(
      task?.assignees
    )
      ? task.assignees
      : [];

  const names =
    assignees
      .map((
        assignee
      ) =>
        [
          assignee?.first_name,
          assignee?.last_name,
        ]
          .filter(Boolean)
          .join(' ')
          .trim()
      )
      .filter(Boolean);

  return (
    names.join(', ') ||
    'Atanmadı'
  );
};

// ======================================================
// COMPONENT
// ======================================================

const Search = () => {
  const [
    searchParams,
  ] =
    useSearchParams();

  const urlQuery =
    searchParams.get(
      'q'
    ) ||
    '';

  const requestedType =
    searchParams.get(
      'type'
    ) ||
    'all';

  const urlType =
    TYPE_OPTIONS.some(
      (option) =>
        option.value ===
        requestedType
    )
      ? requestedType
      : 'all';

  const [
    query,
    setQuery,
  ] =
    useState(
      urlQuery
    );

  const [
    type,
    setType,
  ] =
    useState(
      urlType
    );

  useEffect(() => {
    setQuery(
      urlQuery
    );

    setType(
      urlType
    );
  }, [
    urlQuery,
    urlType,
  ]);

  const debouncedQuery =
    useDebounce(
      query,
      500
    );

  // ====================================================
  // SEARCH QUERY
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
        'search',
        {
          q:
            debouncedQuery,
          type,
        },
      ],

      queryFn: () =>
        searchApi.search(
          debouncedQuery,
          type,
          type === 'all'
            ? 10
            : 20
        ),

      enabled:
        debouncedQuery.trim().length >=
        2,
    });

  // ====================================================
  // SUGGESTIONS
  // ====================================================

  const {
    data:
      suggestions,
  } =
    useQuery({
      queryKey: [
        'suggestions',
        debouncedQuery,
      ],

      queryFn: () =>
        searchApi.getSuggestions(
          debouncedQuery
        ),

      enabled:
        debouncedQuery.trim().length >=
          2 &&
        debouncedQuery.trim().length <
          3,
    });

  // ====================================================
  // DATA
  // ====================================================

  const rawResults =
    data?.data?.data ||
    data?.data ||
    data ||
    null;

  const results =
    type === 'all'
      ? rawResults
      : {
          clients:
            type === 'clients' &&
            Array.isArray(
              rawResults
            )
              ? rawResults
              : [],

          cases:
            type === 'cases' &&
            Array.isArray(
              rawResults
            )
              ? rawResults
              : [],

          consultations:
            type === 'consultations' &&
            Array.isArray(
              rawResults
            )
              ? rawResults
              : [],

          documents:
            type === 'documents' &&
            Array.isArray(
              rawResults
            )
              ? rawResults
              : [],

          tasks:
            type === 'tasks' &&
            Array.isArray(
              rawResults
            )
              ? rawResults
              : [],

          notes:
            type === 'notes' &&
            Array.isArray(
              rawResults
            )
              ? rawResults
              : [],
        };

  const suggestionData =
    suggestions?.data?.data ||
    suggestions?.data ||
    [];

  const hasResults =
    Boolean(
      results &&
        (
          (results.clients?.length ||
            0) >
            0 ||
          (results.cases?.length ||
            0) >
            0 ||
          (results.consultations?.length ||
            0) >
            0 ||
          (results.documents?.length ||
            0) >
            0 ||
          (results.tasks?.length ||
            0) >
            0 ||
          (results.notes?.length ||
            0) >
            0
        )
    );

  const totalResults =
    (results?.clients?.length ||
      0) +
    (results?.cases?.length ||
      0) +
    (results?.consultations?.length ||
      0) +
    (results?.documents?.length ||
      0) +
    (results?.tasks?.length ||
      0) +
    (results?.notes?.length ||
      0);

  const hasSearch =
    debouncedQuery
      .trim()
      .length >=
    2;

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

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
          <SearchIcon size={21} />
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
            Global Arama
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
            Müvekkil, dava, danışmanlık, belge, görev ve not kayıtlarında tek noktadan arama yapın.
          </p>

        </div>

      </div>

      {/* ==================================================
          SEARCH BOX
      ================================================== */}

      <Card>

        <Card.Body>

          <div className="flex flex-col gap-3 sm:flex-row">

            <div className="flex-1">

              <Input
                placeholder="Müvekkil, dava, danışmanlık, belge, görev veya not ara..."
                value={
                  query
                }
                onChange={(
                  event
                ) =>
                  setQuery(
                    event.target.value
                  )
                }
                icon={
                  <SearchIcon size={16} />
                }
                autoFocus
              />

            </div>

            <div className="sm:w-52">

              <select
                value={
                  type
                }
                onChange={(
                  event
                ) =>
                  setType(
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
                {TYPE_OPTIONS.map(
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

          </div>

          <div className="mt-3 flex items-center justify-between">

            <p className="text-xs text-gray-400 dark:text-slate-500">
              Arama için en az 2 karakter girin.
            </p>

            {isFetching &&
              hasSearch && (
                <span className="text-xs text-blue-500 dark:text-blue-400">
                  Aranıyor...
                </span>
              )}

          </div>

          {/* SUGGESTIONS */}

          {Array.isArray(
            suggestionData
          ) &&
            suggestionData.length >
              0 &&
            query.trim().length <
              3 && (
              <div className="mt-5 border-t border-gray-100 pt-4 dark:border-white/[0.06]">

                <div className="mb-3 flex items-center gap-2">

                  <Sparkles
                    size={14}
                    className="text-amber-500"
                  />

                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                    Öneriler
                  </p>

                </div>

                <div className="flex flex-wrap gap-2">

                  {suggestionData.map(
                    (
                      item
                    ) => {
                      const badge =
                        getTypeBadge(
                          item.type
                        );

                      return (
                        <Link
                          key={`${item.type}-${item.id}`}
                          to={
                            item.url
                          }
                          className="
                            inline-flex
                            items-center
                            gap-2
                            rounded-lg
                            border
                            border-gray-200
                            bg-white
                            px-3
                            py-2
                            text-sm
                            text-gray-700
                            transition
                            hover:border-blue-200
                            hover:bg-blue-50/50
                            hover:text-blue-700
                            dark:border-white/[0.07]
                            dark:bg-white/[0.025]
                            dark:text-slate-300
                            dark:hover:border-blue-500/20
                            dark:hover:bg-blue-500/[0.05]
                            dark:hover:text-blue-400
                          "
                        >

                          <Badge
                            variant={
                              badge.variant
                            }
                          >
                            {badge.label}
                          </Badge>

                          <span>
                            {item.label}
                          </span>

                        </Link>
                      );
                    }
                  )}

                </div>

              </div>
            )}

        </Card.Body>

      </Card>

      {/* ==================================================
          INITIAL STATE
      ================================================== */}

      {!hasSearch && (
        <div
          className="
            rounded-2xl
            border
            border-dashed
            border-gray-200
            bg-gray-50/50
            px-6
            py-12
            text-center
            dark:border-white/[0.07]
            dark:bg-white/[0.015]
          "
        >

          <div
            className="
              mx-auto
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-2xl
              bg-blue-50
              text-blue-600
              dark:bg-blue-500/[0.08]
              dark:text-blue-400
            "
          >
            <SearchIcon size={24} />
          </div>

          <h2 className="mt-4 font-semibold text-gray-900 dark:text-white">
            Aramaya başlayın
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-slate-400">
            Aradığınız kaydın adını, dava veya danışmanlık numarasını, belge başlığını, görev veya not bilgisini yazabilirsiniz.
          </p>

        </div>
      )}

      {/* ==================================================
          LOADING
      ================================================== */}

      {hasSearch &&
        isLoading && (
          <div className="flex min-h-[280px] items-center justify-center">
            <Loader text="Kayıtlar aranıyor..." />
          </div>
        )}

      {/* ==================================================
          ERROR
      ================================================== */}

      {hasSearch &&
        !isLoading &&
        error && (
          <Error
            title="Arama tamamlanamadı"
            message="Arama sırasında bir hata oluştu."
            error={
              error
            }
            onRetry={() =>
              refetch?.()
            }
          />
        )}

      {/* ==================================================
          EMPTY
      ================================================== */}

      {hasSearch &&
        !isLoading &&
        !error &&
        results &&
        !hasResults && (
          <Empty
            icon={
              SearchIcon
            }
            title="Sonuç bulunamadı"
            description={`"${debouncedQuery}" aramasıyla eşleşen kayıt bulunamadı.`}
          />
        )}

      {/* ==================================================
          RESULTS HEADER
      ================================================== */}

      {hasSearch &&
        !isLoading &&
        !error &&
        hasResults && (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Arama Sonuçları
              </h2>

              <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                “{debouncedQuery}” için{' '}
                <span className="font-semibold text-gray-700 dark:text-slate-300">
                  {totalResults}
                </span>{' '}
                sonuç bulundu
              </p>

            </div>

          </div>
        )}

      {/* ==================================================
          RESULTS
      ================================================== */}

      {hasSearch &&
        !isLoading &&
        !error &&
        hasResults && (
          <div className="space-y-4">

            {/* ==================================================
                CLIENTS
            ================================================== */}

            {results.clients?.length >
              0 && (
              <Card>

                <Card.Header>

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <div
                        className="
                          flex
                          h-8
                          w-8
                          items-center
                          justify-center
                          rounded-lg
                          bg-emerald-50
                          text-emerald-600
                          dark:bg-emerald-500/[0.08]
                          dark:text-emerald-400
                        "
                      >
                        <UserRound size={16} />
                      </div>

                      <h2 className="font-semibold text-gray-900 dark:text-white">
                        Müvekkiller
                      </h2>

                    </div>

                    <Badge variant="default">
                      {results.clients.length}
                    </Badge>

                  </div>

                </Card.Header>

                <Card.Body className="p-2">

                  <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

                    {results.clients.map(
                      (
                        client
                      ) => (
                        <Link
                          key={
                            client.id
                          }
                          to={`/clients/${client.id}`}
                          className="
                            flex
                            items-center
                            justify-between
                            gap-4
                            rounded-lg
                            px-3
                            py-3
                            transition
                            hover:bg-gray-50
                            dark:hover:bg-white/[0.025]
                          "
                        >

                          <div className="flex min-w-0 items-center gap-3">

                            <div
                              className="
                                flex
                                h-9
                                w-9
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                bg-gray-100
                                text-gray-500
                                dark:bg-white/[0.04]
                                dark:text-slate-400
                              "
                            >
                              {client.client_type ===
                              'corporate' ? (
                                <Building2 size={16} />
                              ) : (
                                <UserRound size={16} />
                              )}
                            </div>

                            <div className="min-w-0">

                              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {client.name ||
                                  'İsimsiz Müvekkil'}
                              </p>

                              <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-500">
                                {client.client_type ===
                                'corporate'
                                  ? 'Kurumsal Müvekkil'
                                  : 'Bireysel Müvekkil'}
                              </p>

                            </div>

                          </div>

                          <div className="flex shrink-0 items-center gap-3">

                            <Badge
                              variant={
                                getClientStatusVariant(
                                  client.status
                                )
                              }
                              dot
                            >
                              {getClientStatusLabel(
                                client.status
                              )}
                            </Badge>

                            <ArrowRight className="h-4 w-4 text-gray-300 dark:text-slate-600" />

                          </div>

                        </Link>
                      )
                    )}

                  </div>

                </Card.Body>

              </Card>
            )}

            {/* ==================================================
                CASES
            ================================================== */}

            {results.cases?.length >
              0 && (
              <Card>

                <Card.Header>

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <div
                        className="
                          flex
                          h-8
                          w-8
                          items-center
                          justify-center
                          rounded-lg
                          bg-violet-50
                          text-violet-600
                          dark:bg-violet-500/[0.08]
                          dark:text-violet-400
                        "
                      >
                        <FolderOpen size={16} />
                      </div>

                      <h2 className="font-semibold text-gray-900 dark:text-white">
                        Davalar
                      </h2>

                    </div>

                    <Badge variant="default">
                      {results.cases.length}
                    </Badge>

                  </div>

                </Card.Header>

                <Card.Body className="p-2">

                  <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

                    {results.cases.map(
                      (
                        caseItem
                      ) => (
                        <Link
                          key={
                            caseItem.id
                          }
                          to={`/cases/${caseItem.id}`}
                          className="
                            flex
                            items-center
                            justify-between
                            gap-4
                            rounded-lg
                            px-3
                            py-3
                            transition
                            hover:bg-gray-50
                            dark:hover:bg-white/[0.025]
                          "
                        >

                          <div className="min-w-0">

                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {caseItem.title}
                            </p>

                            <p className="mt-1 truncate text-xs text-gray-500 dark:text-slate-500">
                              {caseItem.case_number ||
                                'Esas no yok'}

                              {' · '}

                              {caseItem.court_name ||
                                'Mahkeme belirtilmemiş'}
                            </p>

                          </div>

                          <div className="flex shrink-0 items-center gap-3">

                            <Badge
                              variant={
                                getCaseStatusVariant(
                                  caseItem.status
                                )
                              }
                              dot
                            >
                              {CASE_STATUS_LABELS[
                                caseItem.status
                              ] ||
                                caseItem.status ||
                                '-'}
                            </Badge>

                            <ArrowRight className="h-4 w-4 text-gray-300 dark:text-slate-600" />

                          </div>

                        </Link>
                      )
                    )}

                  </div>

                </Card.Body>

              </Card>
            )}

            {/* ==================================================
                CONSULTATIONS
            ================================================== */}

            {results.consultations?.length >
              0 && (
              <Card>

                <Card.Header>

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <div
                        className="
                          flex
                          h-8
                          w-8
                          items-center
                          justify-center
                          rounded-lg
                          bg-cyan-50
                          text-cyan-600
                          dark:bg-cyan-500/[0.08]
                          dark:text-cyan-400
                        "
                      >
                        <Scale size={16} />
                      </div>

                      <h2 className="font-semibold text-gray-900 dark:text-white">
                        Danışmanlıklar
                      </h2>

                    </div>

                    <Badge variant="default">
                      {results.consultations.length}
                    </Badge>

                  </div>

                </Card.Header>

                <Card.Body className="p-2">

                  <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

                    {results.consultations.map(
                      (consultation) => (
                        <Link
                          key={consultation.id}
                          to={`/consultations/${consultation.id}`}
                          className="
                            flex
                            items-center
                            justify-between
                            gap-4
                            rounded-lg
                            px-3
                            py-3
                            transition
                            hover:bg-gray-50
                            dark:hover:bg-white/[0.025]
                          "
                        >

                          <div className="min-w-0">

                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {consultation.title ||
                                'Başlıksız Danışmanlık'}
                            </p>

                            <p className="mt-1 truncate text-xs text-gray-500 dark:text-slate-500">
                              {consultation.consultation_number ||
                                'Danışmanlık no yok'}

                              {' · '}

                              {consultation.prospect_name ||
                                consultation.legal_area ||
                                'İlgili kişi belirtilmemiş'}
                            </p>

                          </div>

                          <div className="flex shrink-0 items-center gap-3">

                            <Badge variant="primary">
                              {consultation.status || 'Danışmanlık'}
                            </Badge>

                            <ArrowRight className="h-4 w-4 text-gray-300 dark:text-slate-600" />

                          </div>

                        </Link>
                      )
                    )}

                  </div>

                </Card.Body>

              </Card>
            )}

            {/* ==================================================
                DOCUMENTS
            ================================================== */}

            {results.documents?.length >
              0 && (
              <Card>

                <Card.Header>

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <div
                        className="
                          flex
                          h-8
                          w-8
                          items-center
                          justify-center
                          rounded-lg
                          bg-blue-50
                          text-blue-600
                          dark:bg-blue-500/[0.08]
                          dark:text-blue-400
                        "
                      >
                        <FileText size={16} />
                      </div>

                      <h2 className="font-semibold text-gray-900 dark:text-white">
                        Belgeler
                      </h2>

                    </div>

                    <Badge variant="default">
                      {results.documents.length}
                    </Badge>

                  </div>

                </Card.Header>

                <Card.Body className="p-2">

                  <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

                    {results.documents.map(
                      (
                        doc
                      ) => (
                        <Link
                          key={
                            doc.id
                          }
                          to={`/documents/${doc.id}`}
                          className="
                            flex
                            items-center
                            justify-between
                            gap-4
                            rounded-lg
                            px-3
                            py-3
                            transition
                            hover:bg-gray-50
                            dark:hover:bg-white/[0.025]
                          "
                        >

                          <div className="flex min-w-0 items-center gap-3">

                            <div
                              className="
                                flex
                                h-9
                                w-9
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                bg-gray-100
                                text-gray-500
                                dark:bg-white/[0.04]
                                dark:text-slate-400
                              "
                            >
                              <FileText size={16} />
                            </div>

                            <div className="min-w-0">

                              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {doc.name}
                              </p>

                              <p className="mt-1 truncate text-xs text-gray-500 dark:text-slate-500">
                                {doc.original_name ||
                                  'Dosya adı yok'}

                                {' · '}

                                {formatFileSize(
                                  doc.file_size
                                )}
                              </p>

                            </div>

                          </div>

                          <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-slate-600" />

                        </Link>
                      )
                    )}

                  </div>

                </Card.Body>

              </Card>
            )}

            {/* ==================================================
                TASKS
            ================================================== */}

            {results.tasks?.length >
              0 && (
              <Card>

                <Card.Header>

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <div
                        className="
                          flex
                          h-8
                          w-8
                          items-center
                          justify-center
                          rounded-lg
                          bg-amber-50
                          text-amber-600
                          dark:bg-amber-500/[0.08]
                          dark:text-amber-400
                        "
                      >
                        <CheckSquare size={16} />
                      </div>

                      <h2 className="font-semibold text-gray-900 dark:text-white">
                        Görevler
                      </h2>

                    </div>

                    <Badge variant="default">
                      {results.tasks.length}
                    </Badge>

                  </div>

                </Card.Header>

                <Card.Body className="p-2">

                  <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

                    {results.tasks.map(
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
                            rounded-lg
                            px-3
                            py-3
                            transition
                            hover:bg-gray-50
                            dark:hover:bg-white/[0.025]
                          "
                        >

                          <div className="min-w-0">

                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {task.title}
                            </p>

                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                              Atanan:{' '}
                              {getAssigneeName(
                                task
                              )}
                            </p>

                          </div>

                          <div className="flex shrink-0 items-center gap-3">

                            <Badge
                              variant={
                                getTaskStatusVariant(
                                  task.status
                                )
                              }
                              dot
                            >
                              {getTaskStatusLabel(
                                task.status
                              )}
                            </Badge>

                            <ArrowRight className="h-4 w-4 text-gray-300 dark:text-slate-600" />

                          </div>

                        </Link>
                      )
                    )}

                  </div>

                </Card.Body>

              </Card>
            )}

            {/* ==================================================
                NOTES
            ================================================== */}

            {results.notes?.length >
              0 && (
              <Card>

                <Card.Header>

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <div
                        className="
                          flex
                          h-8
                          w-8
                          items-center
                          justify-center
                          rounded-lg
                          bg-slate-100
                          text-slate-600
                          dark:bg-white/[0.05]
                          dark:text-slate-400
                        "
                      >
                        <NotebookText size={16} />
                      </div>

                      <h2 className="font-semibold text-gray-900 dark:text-white">
                        Notlar
                      </h2>

                    </div>

                    <Badge variant="default">
                      {results.notes.length}
                    </Badge>

                  </div>

                </Card.Header>

                <Card.Body className="p-2">

                  <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

                    {results.notes.map(
                      (
                        note
                      ) => {
                        const target =
                          note?.case?.id
                            ? `/cases/${note.case.id}`
                            : note?.client?.id
                              ? `/clients/${note.client.id}`
                              : null;

                        const content = (
                          <>

                            <div className="min-w-0 flex-1">

                              <p className="line-clamp-2 text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                                {note.content ||
                                  'Not'}
                              </p>

                              <p className="mt-1 truncate text-xs text-gray-500 dark:text-slate-500">
                                {note?.case?.title ||
                                  note?.client?.name ||
                                  'Bağımsız not'}
                              </p>

                            </div>

                            <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-slate-600" />

                          </>
                        );

                        if (
                          target
                        ) {
                          return (
                            <Link
                              key={
                                note.id
                              }
                              to={
                                target
                              }
                              className="
                                flex
                                items-center
                                justify-between
                                gap-4
                                rounded-lg
                                px-3
                                py-3
                                transition
                                hover:bg-gray-50
                                dark:hover:bg-white/[0.025]
                              "
                            >
                              {content}
                            </Link>
                          );
                        }

                        return (
                          <div
                            key={
                              note.id
                            }
                            className="
                              flex
                              items-center
                              justify-between
                              gap-4
                              rounded-lg
                              px-3
                              py-3
                            "
                          >
                            {content}
                          </div>
                        );
                      }
                    )}

                  </div>

                </Card.Body>

              </Card>
            )}

          </div>
        )}

    </div>
  );
};

export default Search;