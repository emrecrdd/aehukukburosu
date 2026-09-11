import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import caseApi from './case.api.js';
import toast from 'react-hot-toast';

// ======================================================
// HELPERS
// ======================================================

const normalizeId = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  if (typeof value === 'object') {
    const objectId =
      value?.id ??
      value?._id;

    return objectId === null ||
      objectId === undefined ||
      objectId === ''
      ? ''
      : String(objectId);
  }

  return String(value);
};


const normalizeMutationData = (data) => {
  if (!data) {
    return {};
  }

  if (
    typeof FormData !== 'undefined' &&
    data instanceof FormData
  ) {
    const result = {};

    for (
      const [key, value] of
      data.entries()
    ) {
      result[key] = value;
    }

    return result;
  }

  if (typeof data === 'object') {
    return data;
  }

  return {};
};

const getResponseItem = (response) => {
  return (
    response?.data?.data ??
    response?.data ??
    response ??
    null
  );
};


const getArrayPayload = (response) => {
  const payload =
    response?.data?.data ??
    response?.data ??
    response ??
    [];

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
};

const findClientInCache = (
  queryClient,
  clientId
) => {
  const normalizedClientId =
    normalizeId(clientId);

  if (!normalizedClientId) {
    return null;
  }

  const directClient =
    queryClient.getQueryData([
      'client',
      normalizedClientId,
    ]);

  const directItem =
    getResponseItem(
      directClient
    );

  if (
    normalizeId(
      directItem?.id
    ) === normalizedClientId
  ) {
    return directItem;
  }

  const clientQueries =
    queryClient.getQueriesData({
      queryKey: [
        'clients',
      ],
    });

  for (
    const [
      queryKey,
      cachedValue,
    ] of clientQueries
  ) {
    const isClientList =
      queryKey?.length === 1 ||
      (
        queryKey?.length === 2 &&
        typeof queryKey?.[1] ===
          'object'
      );

    if (!isClientList) {
      continue;
    }

    const match =
      getArrayPayload(
        cachedValue
      ).find(
        (client) =>
          normalizeId(
            client?.id
          ) ===
          normalizedClientId
      );

    if (match) {
      return match;
    }
  }

  return null;
};

const getCaseClientIds = (
  source
) => {
  const item =
    getResponseItem(
      source
    );

  const candidates =
    Array.isArray(
      item?.client_ids
    )
      ? item.client_ids
      : Array.isArray(
          item?.clients
        )
      ? item.clients.map(
          (client) =>
            client?.id ??
            client
        )
      : [
          item?.client_id ??
          item?.client?.id,
        ];

  return [
    ...new Set(
      candidates
        .map(
          normalizeId
        )
        .filter(
          Boolean
        )
    ),
  ];
};

const getCaseClientId = (
  source
) => {
  return (
    getCaseClientIds(
      source
    )[0] ||
    ''
  );
};

const getCaseIdFromResponse = (response) => {
  const item =
    getResponseItem(response);

  return normalizeId(
    item?.id
  );
};

const isSameSubmittedValue = (
  actual,
  expected,
  key
) => {
  if (
    expected === undefined ||
    typeof expected === 'object'
  ) {
    return true;
  }

  if (
    expected === null ||
    expected === ''
  ) {
    return (
      actual === null ||
      actual === undefined ||
      actual === ''
    );
  }

  const actualString =
    String(actual ?? '');

  const expectedString =
    String(expected);

  if (
    /date/i.test(key) &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      expectedString
    )
  ) {
    return actualString.startsWith(
      expectedString
    );
  }

  return (
    actualString ===
    expectedString
  );
};

const matchesSubmittedCaseData = (
  item,
  submittedData
) => {
  if (
    !item ||
    !submittedData ||
    typeof submittedData !== 'object'
  ) {
    return true;
  }

  return Object.entries(
    submittedData
  ).every(
    ([key, expected]) => {
      if (
        expected === undefined ||
        typeof expected === 'object'
      ) {
        return true;
      }

      if (key === 'client_id') {
        return (
          normalizeId(
            item?.client_id ??
            item?.client?.id
          ) ===
          normalizeId(expected)
        );
      }

      if (
        !(key in item)
      ) {
        return true;
      }

      return isSameSubmittedValue(
        item[key],
        expected,
        key
      );
    }
  );
};

const replaceResponseItem = (
  current,
  nextItem
) => {
  if (!current) {
    return nextItem;
  }

  if (
    current?.data?.data !==
    undefined
  ) {
    return {
      ...current,
      data: {
        ...current.data,
        data: nextItem,
      },
    };
  }

  if (
    current?.data !==
    undefined
  ) {
    return {
      ...current,
      data: nextItem,
    };
  }

  return nextItem;
};

const mergeCaseDetailCache = (
  queryClient,
  caseId,
  response,
  submittedData = {}
) => {
  const normalizedCaseId =
    normalizeId(caseId);

  if (!normalizedCaseId) {
    return;
  }

  const responseItem =
    getResponseItem(response);

  queryClient.setQueryData(
    [
      'case',
      normalizedCaseId,
    ],
    (current) => {
      const currentItem =
        getResponseItem(current);

      const submittedClientId =
        Object.prototype.hasOwnProperty.call(
          submittedData ?? {},
          'client_id'
        )
          ? normalizeId(
              submittedData?.client_id
            )
          : null;

      const responseClientId =
        normalizeId(
          responseItem?.client_id ??
          responseItem?.client?.id
        );

      const currentClientId =
        normalizeId(
          currentItem?.client_id ??
          currentItem?.client?.id
        );

      let resolvedClient =
        responseItem?.client;

      if (
        submittedClientId !== null
      ) {
        if (!submittedClientId) {
          resolvedClient = null;
        } else if (
          normalizeId(
            resolvedClient?.id
          ) !== submittedClientId
        ) {
          resolvedClient =
            findClientInCache(
              queryClient,
              submittedClientId
            );

          if (
            !resolvedClient &&
            currentClientId ===
              submittedClientId
          ) {
            resolvedClient =
              currentItem?.client ??
              null;
          }
        }
      } else if (
        !resolvedClient &&
        responseClientId &&
        responseClientId ===
          currentClientId
      ) {
        resolvedClient =
          currentItem?.client ??
          null;
      }

      const nextItem = {
        ...(currentItem &&
        typeof currentItem ===
          'object'
          ? currentItem
          : {}),

        ...(submittedData &&
        typeof submittedData ===
          'object'
          ? submittedData
          : {}),

        ...(responseItem &&
        typeof responseItem ===
          'object'
          ? responseItem
          : {}),
      };

      if (
        submittedClientId !== null
      ) {
        nextItem.client_id =
          submittedClientId ||
          null;

        nextItem.client =
          resolvedClient;
      }

      if (
        !current &&
        response
      ) {
        return replaceResponseItem(
          response,
          nextItem
        );
      }

      if (
        current ||
        Object.keys(nextItem).length >
          0
      ) {
        return replaceResponseItem(
          current,
          nextItem
        );
      }

      return current;
    }
  );
};

const syncCaseDetailFromServer =
  async (
    queryClient,
    caseId,
    submittedData = {},
    attempts = 5
  ) => {
    const normalizedCaseId =
      normalizeId(caseId);

    if (!normalizedCaseId) {
      return null;
    }

    for (
      let attempt = 0;
      attempt < attempts;
      attempt += 1
    ) {
      try {
        const response =
          await caseApi.getOne(
            normalizedCaseId
          );

        const item =
          getResponseItem(
            response
          );

        if (
          matchesSubmittedCaseData(
            item,
            submittedData
          )
        ) {
          queryClient.setQueryData(
            [
              'case',
              normalizedCaseId,
            ],
            response
          );

          return response;
        }
      } catch {
        // Bir sonraki denemede tekrar kontrol edilir.
      }

      if (
        attempt <
        attempts - 1
      ) {
        await new Promise(
          (resolve) => {
            setTimeout(
              resolve,
              100 *
                (attempt + 1)
            );
          }
        );
      }
    }

    /*
     * Beklenen değerler hâlâ görünmüyorsa eski response'u cache'e yazma.
     * Çağıran mutation fallback olarak submit edilen değerleri ve mutation
     * response'unu mevcut detail cache ile merge eder.
     */
    return null;
  };

const getPagination = (
  response
) => {
  const direct =
    response?.data?.pagination ??
    response?.pagination;

  if (direct) {
    return direct;
  }

  const nested =
    response?.data?.data;

  return (
    nested?.pagination ??
    null
  );
};

const invalidateCaseCollections =
  async (
    queryClient,
    {
      includeStatistics = true,
      includeDashboard = true,
    } = {}
  ) => {
    const invalidations = [
      queryClient.invalidateQueries({
        queryKey:
          CASE_QUERY_KEYS.all,
      }),

      queryClient.invalidateQueries({
        queryKey:
          CASE_QUERY_KEYS.infinites(),
      }),

      queryClient.invalidateQueries({
        queryKey:
          CASE_QUERY_KEYS.searches(),
      }),
    ];

    if (includeStatistics) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey:
            CASE_QUERY_KEYS.statistics(),
        })
      );
    }

    if (includeDashboard) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: [
            'dashboard-stats',
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            'dashboard-cases',
          ],
        })
      );
    }

    await Promise.all(
      invalidations
    );
  };

const invalidateClientCaseViews =
  async (
    queryClient,
    clientIds = []
  ) => {
    const normalizedIds = [
      ...new Set(
        clientIds
          .flatMap(
            (value) =>
              Array.isArray(
                value
              )
                ? value
                : [
                    value,
                  ]
          )
          .map(
            normalizeId
          )
          .filter(
            Boolean
          )
      ),
    ];

    /*
     * Müvekkil listesinde case_count liste endpoint'inden geliyor.
     * Spesifik client ID çözülemese bile dava create/update/delete
     * sonrası ['clients'] mutlaka invalidate edilmelidir.
     */
    const invalidations = [
      queryClient.invalidateQueries({
        queryKey: [
          'clients',
        ],
      }),
    ];

    normalizedIds.forEach(
      (clientId) => {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              'client',
              clientId,
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'clients',
              clientId,
              'cases',
            ],
          })
        );
      }
    );

    await Promise.all(
      invalidations
    );
  };

const invalidateCaseRelations =
  async (
    queryClient,
    caseId
  ) => {
    const normalizedCaseId =
      normalizeId(caseId);

    if (!normalizedCaseId) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey:
          CASE_QUERY_KEYS.parties(
            normalizedCaseId
          ),
      }),

      queryClient.invalidateQueries({
        queryKey:
          CASE_QUERY_KEYS.documents(
            normalizedCaseId
          ),
      }),

      queryClient.invalidateQueries({
        queryKey:
          CASE_QUERY_KEYS.tasks(
            normalizedCaseId
          ),
      }),

      queryClient.invalidateQueries({
        queryKey:
          CASE_QUERY_KEYS.events(
            normalizedCaseId
          ),
      }),

      queryClient.invalidateQueries({
        queryKey:
          CASE_QUERY_KEYS.payments(
            normalizedCaseId
          ),
      }),

      queryClient.invalidateQueries({
        queryKey:
          CASE_QUERY_KEYS.notes(
            normalizedCaseId
          ),
      }),
    ]);
  };

// ======================================================
// QUERY KEYS
// ======================================================

export const CASE_QUERY_KEYS = {
  all: [
    'cases',
  ],

  lists: () => [
    'cases',
  ],

  list: (
    params = {}
  ) => [
    ...CASE_QUERY_KEYS.lists(),
    params,
  ],

  detail: (id) => [
    'case',
    normalizeId(id),
  ],

  statistics: () => [
    'case-statistics',
  ],

  parties: (caseId) => [
    'case-parties',
    normalizeId(caseId),
  ],

  documents: (caseId) => [
    'case-documents',
    normalizeId(caseId),
  ],

  tasks: (caseId) => [
    'case-tasks',
    normalizeId(caseId),
  ],

  events: (caseId) => [
    'case-events',
    normalizeId(caseId),
  ],

  payments: (caseId) => [
    'case-payments',
    normalizeId(caseId),
  ],

  notes: (caseId) => [
    'case-notes',
    normalizeId(caseId),
  ],

  infinites: () => [
    'cases-infinite',
  ],

  infinite: (
    params = {}
  ) => [
    ...CASE_QUERY_KEYS.infinites(),
    params,
  ],

  searches: () => [
    'cases-search',
  ],

  search: (
    query,
    params = {}
  ) => [
    ...CASE_QUERY_KEYS.searches(),
    String(query ?? '').trim(),
    params,
  ],
};

// ======================================================
// CACHE
// ======================================================

const CACHE = {
  NORMAL:
    5 * 60 * 1000,

  LONG:
    10 * 60 * 1000,

  GC:
    10 * 60 * 1000,

  GC_LONG:
    30 * 60 * 1000,
};

// ======================================================
// QUERIES
// ======================================================

export const useCases = (
  params = {}
) => {
  return useQuery({
    queryKey:
      CASE_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      caseApi.getAll(
        params
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,

    placeholderData: (
      previousData
    ) =>
      previousData,
  });
};

export const useCase = (
  id
) => {
  const normalizedId =
    normalizeId(id);

  return useQuery({
    queryKey:
      CASE_QUERY_KEYS.detail(
        normalizedId
      ),

    queryFn: () =>
      caseApi.getOne(
        normalizedId
      ),

    enabled:
      Boolean(
        normalizedId
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,

    /*
     * Cache invalid ise sayfaya dönüldüğünde mutlaka refetch edilir.
     * Mutation sonrası cache doğrudan güncellendiğinde ise gereksiz
     * refetch yapılmaz.
     */
    refetchOnMount:
      true,

    refetchOnWindowFocus:
      true,
  });
};

export const useCaseStatistics =
  () => {
    return useQuery({
      queryKey:
        CASE_QUERY_KEYS.statistics(),

      queryFn: () =>
        caseApi.getStatistics(),

      staleTime:
        CACHE.LONG,

      gcTime:
        CACHE.GC_LONG,
    });
  };

export const useCaseParties = (
  caseId
) => {
  const normalizedCaseId =
    normalizeId(caseId);

  return useQuery({
    queryKey:
      CASE_QUERY_KEYS.parties(
        normalizedCaseId
      ),

    queryFn: () =>
      caseApi.getParties(
        normalizedCaseId
      ),

    enabled:
      Boolean(
        normalizedCaseId
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

export const useCaseDocuments = (
  caseId
) => {
  const normalizedCaseId =
    normalizeId(caseId);

  return useQuery({
    queryKey:
      CASE_QUERY_KEYS.documents(
        normalizedCaseId
      ),

    queryFn: () =>
      caseApi.getDocuments(
        normalizedCaseId
      ),

    enabled:
      Boolean(
        normalizedCaseId
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

export const useCaseTasks = (
  caseId
) => {
  const normalizedCaseId =
    normalizeId(caseId);

  return useQuery({
    queryKey:
      CASE_QUERY_KEYS.tasks(
        normalizedCaseId
      ),

    queryFn: () =>
      caseApi.getTasks(
        normalizedCaseId
      ),

    enabled:
      Boolean(
        normalizedCaseId
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

export const useCaseEvents = (
  caseId
) => {
  const normalizedCaseId =
    normalizeId(caseId);

  return useQuery({
    queryKey:
      CASE_QUERY_KEYS.events(
        normalizedCaseId
      ),

    queryFn: () =>
      caseApi.getEvents(
        normalizedCaseId
      ),

    enabled:
      Boolean(
        normalizedCaseId
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

export const useCasePayments = (
  caseId
) => {
  const normalizedCaseId =
    normalizeId(caseId);

  return useQuery({
    queryKey:
      CASE_QUERY_KEYS.payments(
        normalizedCaseId
      ),

    queryFn: () =>
      caseApi.getPayments(
        normalizedCaseId
      ),

    enabled:
      Boolean(
        normalizedCaseId
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

export const useCaseNotes = (
  caseId
) => {
  const normalizedCaseId =
    normalizeId(caseId);

  return useQuery({
    queryKey:
      CASE_QUERY_KEYS.notes(
        normalizedCaseId
      ),

    queryFn: () =>
      caseApi.getNotes(
        normalizedCaseId
      ),

    enabled:
      Boolean(
        normalizedCaseId
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// MUTATIONS
// ======================================================

export const useCreateCase =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        data
      ) =>
        caseApi.create(
          data
        ),

      onSuccess: async (
        response,
        variables
      ) => {
        const createdId =
          getCaseIdFromResponse(
            response
          );

        if (createdId) {
          queryClient.setQueryData(
            CASE_QUERY_KEYS.detail(
              createdId
            ),
            response
          );
        }

        await Promise.all([
          invalidateCaseCollections(
            queryClient
          ),

          invalidateClientCaseViews(
            queryClient,
            [
              normalizeMutationData(
                variables
              )?.client_ids,
              normalizeMutationData(
                variables
              )?.client_id,
              getCaseClientIds(
                response
              ),
            ]
          ),
        ]);

        toast.success(
          'Dava başarıyla oluşturuldu'
        );
      },

      onError: (error) => {
        toast.error(
          error?.response
            ?.data?.message ||
          error?.message ||
          'Dava oluşturulamadı'
        );
      },
    });
  };

export const useUpdateCase =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        data,
      }) => {
        const normalizedId =
          normalizeId(id);

        if (!normalizedId) {
          throw new Error(
            'Geçerli dava kaydı bulunamadı'
          );
        }

        return caseApi.update(
          normalizedId,
          data
        );
      },

      onMutate: async (
        variables
      ) => {
        const caseId =
          normalizeId(
            variables?.id
          );

        if (!caseId) {
          return {
            caseId: '',
            oldClientIds: [],
          };
        }

        await queryClient.cancelQueries({
          queryKey:
            CASE_QUERY_KEYS.detail(
              caseId
            ),
        });

        let previousDetail =
          queryClient.getQueryData(
            CASE_QUERY_KEYS.detail(
              caseId
            )
          );

        if (!previousDetail) {
          try {
            previousDetail =
              await caseApi.getOne(
                caseId
              );
          } catch {
            // Update yine devam eder; sadece eski müvekkil cache bilgisi eksik kalır.
          }
        }

        return {
          caseId,
          oldClientIds:
            getCaseClientIds(
              previousDetail
            ),
        };
      },

      onSuccess: async (
        response,
        variables,
        context
      ) => {
        const caseId =
          normalizeId(
            variables?.id ??
            context?.caseId
          );

        const submittedData =
          normalizeMutationData(
            variables?.data
          );

        const submittedClientIds =
          Array.isArray(
            submittedData
              ?.client_ids
          )
            ? submittedData.client_ids
            : [];

        const newClientIds = [
          ...new Set(
            [
              ...submittedClientIds,
              submittedData
                ?.client_id,
              ...getCaseClientIds(
                response
              ),
            ]
              .map(
                normalizeId
              )
              .filter(
                Boolean
              )
          ),
        ];

        /*
         * Önce API'nin güncel detail cevabını almaya çalış.
         * Böylece CaseEdit -> CaseDetail geçişinde metadata ve
         * müvekkil ilişkisi F5 beklemeden doğru görünür.
         */
        const syncedResponse =
          await syncCaseDetailFromServer(
            queryClient,
            caseId,
            submittedData
          );

        if (!syncedResponse) {
          mergeCaseDetailCache(
            queryClient,
            caseId,
            response,
            submittedData
          );
        }

        await Promise.all([
          invalidateCaseCollections(
            queryClient
          ),

          invalidateClientCaseViews(
            queryClient,
            [
              context?.oldClientIds,
              newClientIds,
            ]
          ),
        ]);

        toast.success(
          'Dava başarıyla güncellendi'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          error?.response
            ?.data?.message ||
          error?.message ||
          'Dava güncellenemedi'
        );
      },
    });
  };

export const useDeleteCase =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        id
      ) => {
        const normalizedId =
          normalizeId(id);

        if (!normalizedId) {
          throw new Error(
            'Geçerli dava kaydı bulunamadı'
          );
        }

        return caseApi.delete(
          normalizedId
        );
      },

      onMutate: async (
        id
      ) => {
        const caseId =
          normalizeId(id);

        await queryClient.cancelQueries({
          queryKey:
            CASE_QUERY_KEYS.detail(
              caseId
            ),
        });

        let previousDetail =
          queryClient.getQueryData(
            CASE_QUERY_KEYS.detail(
              caseId
            )
          );

        if (!previousDetail) {
          try {
            previousDetail =
              await caseApi.getOne(
                caseId
              );
          } catch {
            // Silme yine devam eder; yalnız ilişkili müvekkil cache'i bilinmeyebilir.
          }
        }

        return {
          caseId,
          clientIds:
            getCaseClientIds(
              previousDetail
            ),
        };
      },

      onSuccess: async (
        _response,
        id,
        context
      ) => {
        const caseId =
          normalizeId(
            id ??
            context?.caseId
          );

        queryClient.removeQueries({
          queryKey:
            CASE_QUERY_KEYS.detail(
              caseId
            ),
          exact: true,
        });

        [
          CASE_QUERY_KEYS.parties(
            caseId
          ),
          CASE_QUERY_KEYS.documents(
            caseId
          ),
          CASE_QUERY_KEYS.tasks(
            caseId
          ),
          CASE_QUERY_KEYS.events(
            caseId
          ),
          CASE_QUERY_KEYS.payments(
            caseId
          ),
          CASE_QUERY_KEYS.notes(
            caseId
          ),
        ].forEach(
          (queryKey) => {
            queryClient.removeQueries({
              queryKey,
              exact: true,
            });
          }
        );

        await Promise.all([
          invalidateCaseCollections(
            queryClient
          ),

          invalidateClientCaseViews(
            queryClient,
            [
              context?.clientIds,
            ]
          ),
        ]);

        toast.success(
          'Dava başarıyla silindi'
        );
      },

      onError: (error) => {
        toast.error(
          error?.response
            ?.data?.message ||
          error?.message ||
          'Dava silinemedi'
        );
      },
    });
  };

export const useUpdateCaseStatus =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        status,
      }) => {
        const normalizedId =
          normalizeId(id);

        if (!normalizedId) {
          throw new Error(
            'Geçerli dava kaydı bulunamadı'
          );
        }

        return caseApi.updateStatus(
          normalizedId,
          status
        );
      },

      onSuccess: async (
        response,
        variables
      ) => {
        const caseId =
          normalizeId(
            variables?.id
          );

        const syncedResponse =
          await syncCaseDetailFromServer(
            queryClient,
            caseId,
            {
              status:
                variables?.status,
            }
          );

        if (!syncedResponse) {
          mergeCaseDetailCache(
            queryClient,
            caseId,
            response,
            {
              status:
                variables?.status,
            }
          );
        }

        const relatedClientIds =
          getCaseClientIds(
            syncedResponse ??
            response
          );

        await Promise.all([
          invalidateCaseCollections(
            queryClient
          ),

          invalidateClientCaseViews(
            queryClient,
            [
              relatedClientIds,
            ]
          ),
        ]);

        toast.success(
          'Dava durumu güncellendi'
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
  };

// ======================================================
// PARTY MUTATIONS
// ======================================================

export const useAddCaseParty =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        caseId,
        data,
      }) => {
        const normalizedCaseId =
          normalizeId(
            caseId
          );

        if (!normalizedCaseId) {
          throw new Error(
            'Geçerli dava kaydı bulunamadı'
          );
        }

        return caseApi.addParty(
          normalizedCaseId,
          data
        );
      },

      onSuccess: async (
        _response,
        variables
      ) => {
        const caseId =
          normalizeId(
            variables?.caseId
          );

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              CASE_QUERY_KEYS.parties(
                caseId
              ),
          }),

          queryClient.invalidateQueries({
            queryKey:
              CASE_QUERY_KEYS.detail(
                caseId
              ),
          }),

          invalidateCaseCollections(
            queryClient,
            {
              includeStatistics:
                false,
              includeDashboard:
                false,
            }
          ),
        ]);

        toast.success(
          'Taraf başarıyla eklendi'
        );
      },

      onError: (error) => {
        toast.error(
          error?.response
            ?.data?.message ||
          error?.message ||
          'Taraf eklenemedi'
        );
      },
    });
  };

export const useRemoveCaseParty =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        caseId,
        partyId,
      }) => {
        const normalizedCaseId =
          normalizeId(
            caseId
          );

        const normalizedPartyId =
          normalizeId(
            partyId
          );

        if (
          !normalizedCaseId ||
          !normalizedPartyId
        ) {
          throw new Error(
            'Geçerli dava veya taraf kaydı bulunamadı'
          );
        }

        return caseApi.removeParty(
          normalizedCaseId,
          normalizedPartyId
        );
      },

      onSuccess: async (
        _response,
        variables
      ) => {
        const caseId =
          normalizeId(
            variables?.caseId
          );

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              CASE_QUERY_KEYS.parties(
                caseId
              ),
          }),

          queryClient.invalidateQueries({
            queryKey:
              CASE_QUERY_KEYS.detail(
                caseId
              ),
          }),

          invalidateCaseCollections(
            queryClient,
            {
              includeStatistics:
                false,
              includeDashboard:
                false,
            }
          ),
        ]);

        toast.success(
          'Taraf başarıyla kaldırıldı'
        );
      },

      onError: (error) => {
        toast.error(
          error?.response
            ?.data?.message ||
          error?.message ||
          'Taraf kaldırılamadı'
        );
      },
    });
  };

// ======================================================
// BULK OPERATIONS
// ======================================================

export const useBulkUpdateCaseStatus =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: async ({
        ids,
        status,
      }) => {
        const normalizedIds = [
          ...new Set(
            (
              Array.isArray(ids)
                ? ids
                : []
            )
              .map(normalizeId)
              .filter(Boolean)
          ),
        ];

        if (
          normalizedIds.length ===
          0
        ) {
          throw new Error(
            'Güncellenecek dava bulunamadı'
          );
        }

        return Promise.all(
          normalizedIds.map(
            (id) =>
              caseApi.updateStatus(
                id,
                status
              )
          )
        );
      },

      onSuccess: async (
        _responses,
        variables
      ) => {
        const normalizedIds = [
          ...new Set(
            (
              Array.isArray(
                variables?.ids
              )
                ? variables.ids
                : []
            )
              .map(normalizeId)
              .filter(Boolean)
          ),
        ];

        normalizedIds.forEach(
          (id) => {
            mergeCaseDetailCache(
              queryClient,
              id,
              null,
              {
                status:
                  variables?.status,
              }
            );
          }
        );

        await Promise.all([
          invalidateCaseCollections(
            queryClient
          ),

          invalidateClientCaseViews(
            queryClient
          ),
        ]);

        toast.success(
          `${normalizedIds.length} davanın durumu güncellendi`
        );
      },

      onError: (error) => {
        toast.error(
          error?.response
            ?.data?.message ||
          error?.message ||
          'Toplu güncelleme başarısız'
        );
      },
    });
  };

// ======================================================
// INFINITE QUERIES
// ======================================================

export const useInfiniteCases = (
  params = {}
) => {
  return useInfiniteQuery({
    queryKey:
      CASE_QUERY_KEYS.infinite(
        params
      ),

    queryFn: ({
      pageParam = 1,
    }) =>
      caseApi.getAll({
        ...params,
        page:
          pageParam,
      }),

    getNextPageParam: (
      lastPage
    ) => {
      const pagination =
        getPagination(
          lastPage
        );

      if (!pagination) {
        return undefined;
      }

      const currentPage =
        Number(
          pagination.page ??
          pagination.current_page ??
          pagination.currentPage ??
          1
        );

      const totalPages =
        Number(
          pagination.totalPages ??
          pagination.total_pages ??
          pagination.last_page ??
          currentPage
        );

      if (
        Number.isFinite(
          currentPage
        ) &&
        Number.isFinite(
          totalPages
        ) &&
        currentPage <
          totalPages
      ) {
        return (
          currentPage + 1
        );
      }

      return undefined;
    },

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,

    initialPageParam:
      1,
  });
};

// ======================================================
// PREFETCHING
// ======================================================

export const prefetchCase = (
  queryClient,
  id
) => {
  const normalizedId =
    normalizeId(id);

  if (!normalizedId) {
    return Promise.resolve();
  }

  return queryClient.prefetchQuery({
    queryKey:
      CASE_QUERY_KEYS.detail(
        normalizedId
      ),

    queryFn: () =>
      caseApi.getOne(
        normalizedId
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

export const prefetchCases = (
  queryClient,
  params = {}
) => {
  return queryClient.prefetchQuery({
    queryKey:
      CASE_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      caseApi.getAll(
        params
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// CACHE HELPERS
// ======================================================

export const updateCaseCache = (
  queryClient,
  id,
  updater
) => {
  const normalizedId =
    normalizeId(id);

  if (
    !normalizedId ||
    typeof updater !==
      'function'
  ) {
    return;
  }

  queryClient.setQueryData(
    CASE_QUERY_KEYS.detail(
      normalizedId
    ),
    (oldData) => {
      if (!oldData) {
        return oldData;
      }

      const oldItem =
        getResponseItem(
          oldData
        );

      const nextItem =
        updater(
          oldItem
        );

      return replaceResponseItem(
        oldData,
        nextItem
      );
    }
  );
};

export const updateCasesCache = (
  queryClient,
  params,
  updater
) => {
  if (
    typeof updater !==
      'function'
  ) {
    return;
  }

  queryClient.setQueryData(
    CASE_QUERY_KEYS.list(
      params
    ),
    (oldData) => {
      if (!oldData) {
        return oldData;
      }

      if (
        Array.isArray(
          oldData
        )
      ) {
        return oldData.map(
          updater
        );
      }

      if (
        Array.isArray(
          oldData?.data
        )
      ) {
        return {
          ...oldData,
          data:
            oldData.data.map(
              updater
            ),
        };
      }

      if (
        Array.isArray(
          oldData?.data?.data
        )
      ) {
        return {
          ...oldData,
          data: {
            ...oldData.data,
            data:
              oldData.data.data.map(
                updater
              ),
          },
        };
      }

      return oldData;
    }
  );
};

export const removeCaseFromCache = (
  queryClient,
  id
) => {
  const normalizedId =
    normalizeId(id);

  if (!normalizedId) {
    return;
  }

  queryClient.removeQueries({
    queryKey:
      CASE_QUERY_KEYS.detail(
        normalizedId
      ),
    exact:
      true,
  });
};

// ======================================================
// SEARCH
// ======================================================

export const useSearchCases = (
  query,
  params = {}
) => {
  const normalizedQuery =
    String(
      query ??
      ''
    ).trim();

  return useQuery({
    queryKey:
      CASE_QUERY_KEYS.search(
        normalizedQuery,
        params
      ),

    queryFn: () =>
      caseApi.getAll({
        ...params,
        search:
          normalizedQuery,
      }),

    enabled:
      normalizedQuery.length >=
      2,

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// EXPORT
// ======================================================

export default {
  // Queries
  useCases,
  useCase,
  useCaseStatistics,
  useCaseParties,
  useCaseDocuments,
  useCaseTasks,
  useCaseEvents,
  useCasePayments,
  useCaseNotes,
  useSearchCases,
  useInfiniteCases,

  // Mutations
  useCreateCase,
  useUpdateCase,
  useDeleteCase,
  useUpdateCaseStatus,
  useAddCaseParty,
  useRemoveCaseParty,
  useBulkUpdateCaseStatus,

  // Helpers
  prefetchCase,
  prefetchCases,
  updateCaseCache,
  updateCasesCache,
  removeCaseFromCache,
};
