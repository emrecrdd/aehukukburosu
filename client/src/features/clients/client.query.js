import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import clientApi from './client.api.js';

import toast from 'react-hot-toast';

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

const normalizeIds = (
  values
) => {
  if (
    !Array.isArray(
      values
    )
  ) {
    return [];
  }

  return [
    ...new Set(
      values
        .map(
          normalizeId
        )
        .filter(
          Boolean
        )
    ),
  ];
};

const getResponseItem = (
  response
) => {
  return (
    response?.data?.data ??
    response?.data ??
    response ??
    null
  );
};

const getCreatedClientId = (
  response
) => {
  return normalizeId(
    getResponseItem(
      response
    )?.id
  );
};

const getErrorMessage = (
  error,
  fallback
) => {
  return (
    error?.response
      ?.data?.message ||
    error?.message ||
    fallback
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
        data:
          nextItem,
      },
    };
  }

  if (
    current?.data !==
    undefined
  ) {
    return {
      ...current,
      data:
        nextItem,
    };
  }

  return nextItem;
};

const mergeClientDetailCache = (
  queryClient,
  id,
  response,
  submittedData = {}
) => {
  const normalizedId =
    normalizeId(
      id
    );

  if (!normalizedId) {
    return;
  }

  const responseItem =
    getResponseItem(
      response
    );

  queryClient.setQueryData(
    [
      'client',
      normalizedId,
    ],
    (
      current
    ) => {
      const currentItem =
        getResponseItem(
          current
        );

      const nextItem = {
        ...(
          currentItem &&
          typeof currentItem ===
            'object'
            ? currentItem
            : {}
        ),

        ...(
          submittedData &&
          typeof submittedData ===
            'object' &&
          !(
            typeof FormData !==
              'undefined' &&
            submittedData instanceof
              FormData
          )
            ? submittedData
            : {}
        ),

        ...(
          responseItem &&
          typeof responseItem ===
            'object'
            ? responseItem
            : {}
        ),
      };

      return replaceResponseItem(
        current,
        nextItem
      );
    }
  );
};

const syncClientDetailFromServer =
  async (
    queryClient,
    id
  ) => {
    const normalizedId =
      normalizeId(
        id
      );

    if (!normalizedId) {
      return null;
    }

    try {
      const response =
        await clientApi.getOne(
          normalizedId
        );

      queryClient.setQueryData(
        [
          'client',
          normalizedId,
        ],
        response
      );

      return response;
    } catch {
      return null;
    }
  };

const getPagination = (
  response
) => {
  return (
    response?.data
      ?.pagination ??
    response?.pagination ??
    response?.data
      ?.data
      ?.pagination ??
    null
  );
};

// ======================================================
// QUERY KEYS
// ======================================================

/*
 * Uygulamanın diğer modüllerinde kullanılan cache anahtarlarıyla
 * birebir aynı standardı kullanıyoruz:
 *
 *   Müvekkil detail: ['client', id]
 *   Müvekkil davaları: ['clients', id, 'cases']
 *   Liste: ['clients', params]
 *
 * Eski anahtarlar:
 *   ['clients', 'detail', id]
 *   ['clients', 'case-history', id]
 *   ['clients', 'list', params]
 *
 * artık yeni query üretmek için kullanılmıyor. Aşağıdaki cleanup
 * yardımcıları eski cache kalıntılarını da temizliyor.
 */
export const CLIENT_QUERY_KEYS = {
  all: [
    'clients',
  ],

  lists: () => [
    'clients',
  ],

  list: (
    params = {}
  ) => [
    'clients',
    params,
  ],

  detail: (
    id
  ) => [
    'client',
    normalizeId(
      id
    ),
  ],

  details: () => [
    'client',
  ],

  statistics: () => [
    'clients',
    'statistics',
  ],

  caseHistory: (
    clientId
  ) => [
    'clients',
    normalizeId(
      clientId
    ),
    'cases',
  ],

  payments: (
    clientId
  ) => [
    'clients',
    normalizeId(
      clientId
    ),
    'payments',
  ],

  notes: (
    clientId
  ) => [
    'clients',
    normalizeId(
      clientId
    ),
    'notes',
  ],

  powerOfAttorneys: (
    clientId
  ) => [
    'clients',
    normalizeId(
      clientId
    ),
    'power-of-attorneys',
  ],

  documents: (
    clientId
  ) => [
    'client-documents',
    normalizeId(
      clientId
    ),
  ],

  infinite: (
    params = {}
  ) => [
    'clients',
    'infinite',
    params,
  ],

  legacy: {
    detail: (
      id
    ) => [
      'clients',
      'detail',
      normalizeId(
        id
      ),
    ],

    caseHistory: (
      id
    ) => [
      'clients',
      'case-history',
      normalizeId(
        id
      ),
    ],

    lists: () => [
      'clients',
      'list',
    ],
  },
};

// ======================================================
// CACHE
// ======================================================

const CACHE = {
  LIST:
    2 * 60 * 1000,

  /*
   * Relation değişiklikleri başka modüllerden yapılabiliyor.
   * Detail sayfası bu yüzden fresh kabul edilmemeli.
   */
  DETAIL:
    0,

  STATISTICS:
    10 * 60 * 1000,

  RELATIONS:
    0,

  GC:
    15 * 60 * 1000,
};

// ======================================================
// CACHE INVALIDATION / CLEANUP
// ======================================================

const removeLegacyClientCache = (
  queryClient,
  id
) => {
  const normalizedId =
    normalizeId(
      id
    );

  if (!normalizedId) {
    return;
  }

  queryClient.removeQueries({
    queryKey:
      CLIENT_QUERY_KEYS
        .legacy
        .detail(
          normalizedId
        ),
    exact:
      true,
  });

  queryClient.removeQueries({
    queryKey:
      CLIENT_QUERY_KEYS
        .legacy
        .caseHistory(
          normalizedId
        ),
    exact:
      true,
  });
};

const invalidateClientLists =
  async (
    queryClient
  ) => {
    /*
     * Canonical list key:
     *   ['clients', { ...params }]
     *
     * Infinite ve eski ['clients','list',...] cache'leri de
     * beraber yenilenir/temizlenir.
     */
    const invalidations = [
      queryClient.invalidateQueries({
        predicate:
          (query) => {
            const key =
              query.queryKey;

            if (
              key?.[0] !==
              'clients'
            ) {
              return false;
            }

            if (
              key.length ===
              2 &&
              key?.[1] &&
              typeof key[1] ===
                'object' &&
              !Array.isArray(
                key[1]
              )
            ) {
              return true;
            }

            return (
              key?.[1] ===
                'infinite' ||
              key?.[1] ===
                'list'
            );
          },
      }),
    ];

    await Promise.all(
      invalidations
    );
  };

const invalidateClientStatistics =
  (
    queryClient
  ) => {
    return queryClient.invalidateQueries({
      queryKey:
        CLIENT_QUERY_KEYS.statistics(),
    });
  };

const invalidateDashboardClientViews =
  async (
    queryClient
  ) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [
          'dashboard-stats',
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          'dashboard-clients',
        ],
      }),
    ]);
  };

const invalidateClientRelationViews =
  async (
    queryClient,
    id,
    {
      detail = true,
      cases = true,
      powerOfAttorneys = true,
      documents = true,
      payments = false,
      notes = false,
    } = {}
  ) => {
    const normalizedId =
      normalizeId(
        id
      );

    if (!normalizedId) {
      return;
    }

    removeLegacyClientCache(
      queryClient,
      normalizedId
    );

    const invalidations =
      [];

    if (detail) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey:
            CLIENT_QUERY_KEYS.detail(
              normalizedId
            ),
          exact:
            true,
        })
      );
    }

    if (cases) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey:
            CLIENT_QUERY_KEYS.caseHistory(
              normalizedId
            ),
          exact:
            true,
        }),

        /*
         * Bazı eski ekranlar prefix olarak bunu kullanıyor.
         */
        queryClient.invalidateQueries({
          queryKey: [
            'client-cases',
            normalizedId,
          ],
        })
      );
    }

    if (powerOfAttorneys) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey:
            CLIENT_QUERY_KEYS.powerOfAttorneys(
              normalizedId
            ),
        }),

        queryClient.invalidateQueries({
          queryKey: [
            'client-power-of-attorneys',
            normalizedId,
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            'powerOfAttorneys',
          ],
        })
      );
    }

    if (documents) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey:
            CLIENT_QUERY_KEYS.documents(
              normalizedId
            ),
        }),

        queryClient.invalidateQueries({
          queryKey: [
            'client-documents',
          ],
        })
      );
    }

    if (payments) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey:
            CLIENT_QUERY_KEYS.payments(
              normalizedId
            ),
          exact:
            true,
        })
      );
    }

    if (notes) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey:
            CLIENT_QUERY_KEYS.notes(
              normalizedId
            ),
          exact:
            true,
        })
      );
    }

    await Promise.all(
      invalidations
    );
  };

const removeClientRelatedCache = (
  queryClient,
  id
) => {
  const normalizedId =
    normalizeId(
      id
    );

  if (!normalizedId) {
    return;
  }

  const exactKeys = [
    CLIENT_QUERY_KEYS.detail(
      normalizedId
    ),

    CLIENT_QUERY_KEYS.caseHistory(
      normalizedId
    ),

    CLIENT_QUERY_KEYS.payments(
      normalizedId
    ),

    CLIENT_QUERY_KEYS.notes(
      normalizedId
    ),

    CLIENT_QUERY_KEYS.powerOfAttorneys(
      normalizedId
    ),

    CLIENT_QUERY_KEYS.documents(
      normalizedId
    ),

    CLIENT_QUERY_KEYS
      .legacy
      .detail(
        normalizedId
      ),

    CLIENT_QUERY_KEYS
      .legacy
      .caseHistory(
        normalizedId
      ),

    [
      'client-cases',
      normalizedId,
    ],

    [
      'client-power-of-attorneys',
      normalizedId,
    ],
  ];

  exactKeys.forEach(
    (
      queryKey
    ) => {
      queryClient.removeQueries({
        queryKey,
        exact:
          true,
      });
    }
  );
};

// ======================================================
// CLIENT LIST
// ======================================================

export const useClients = (
  params = {}
) => {
  return useQuery({
    queryKey:
      CLIENT_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      clientApi.getAll(
        params
      ),

    staleTime:
      CACHE.LIST,

    gcTime:
      CACHE.GC,

    placeholderData: (
      previousData
    ) =>
      previousData,
  });
};

// ======================================================
// CLIENT DETAIL
// ======================================================

export const useClient = (
  id
) => {
  const normalizedId =
    normalizeId(
      id
    );

  return useQuery({
    queryKey:
      CLIENT_QUERY_KEYS.detail(
        normalizedId
      ),

    queryFn: () =>
      clientApi.getOne(
        normalizedId
      ),

    enabled:
      Boolean(
        normalizedId
      ),

    staleTime:
      CACHE.DETAIL,

    gcTime:
      CACHE.GC,

    /*
     * Dava / vekaletname / belge gibi ilişkiler başka sayfalarda
     * değiştirildiği için Müvekkil Detay'a her dönüşte server
     * doğrulanır. Böylece F5 ihtiyacı ortadan kalkar.
     */
    refetchOnMount:
      'always',

    refetchOnWindowFocus:
      'always',

    refetchOnReconnect:
      'always',
  });
};

// ======================================================
// STATISTICS
// ======================================================

export const useClientStatistics =
  () => {
    return useQuery({
      queryKey:
        CLIENT_QUERY_KEYS.statistics(),

      queryFn: () =>
        clientApi.getStatistics(),

      staleTime:
        CACHE.STATISTICS,

      gcTime:
        CACHE.GC,
    });
  };

// ======================================================
// CASE HISTORY
// ======================================================

export const useClientCaseHistory = (
  clientId
) => {
  const normalizedClientId =
    normalizeId(
      clientId
    );

  return useQuery({
    queryKey:
      CLIENT_QUERY_KEYS.caseHistory(
        normalizedClientId
      ),

    queryFn: () =>
      clientApi.getCaseHistory(
        normalizedClientId
      ),

    enabled:
      Boolean(
        normalizedClientId
      ),

    staleTime:
      CACHE.RELATIONS,

    gcTime:
      CACHE.GC,

    refetchOnMount:
      'always',

    refetchOnWindowFocus:
      'always',

    refetchOnReconnect:
      'always',
  });
};

// ======================================================
// PAYMENTS
// ======================================================

export const useClientPayments = (
  clientId
) => {
  const normalizedClientId =
    normalizeId(
      clientId
    );

  return useQuery({
    queryKey:
      CLIENT_QUERY_KEYS.payments(
        normalizedClientId
      ),

    queryFn: () =>
      clientApi.getPayments(
        normalizedClientId
      ),

    enabled:
      Boolean(
        normalizedClientId
      ),

    staleTime:
      CACHE.RELATIONS,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// NOTES
// ======================================================

export const useClientNotes = (
  clientId
) => {
  const normalizedClientId =
    normalizeId(
      clientId
    );

  return useQuery({
    queryKey:
      CLIENT_QUERY_KEYS.notes(
        normalizedClientId
      ),

    queryFn: () =>
      clientApi.getNotes(
        normalizedClientId
      ),

    enabled:
      Boolean(
        normalizedClientId
      ),

    staleTime:
      CACHE.RELATIONS,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// CREATE
// ======================================================

export const useCreateClient =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        data
      ) =>
        clientApi.create(
          data
        ),

      onSuccess:
        async (
          response
        ) => {
          const createdId =
            getCreatedClientId(
              response
            );

          if (createdId) {
            queryClient.setQueryData(
              CLIENT_QUERY_KEYS.detail(
                createdId
              ),
              response
            );
          }

          /*
           * Projede eski list cache namespace'i kalmışsa artık
           * yanlış veri göstermesin.
           */
          queryClient.removeQueries({
            queryKey:
              CLIENT_QUERY_KEYS
                .legacy
                .lists(),
          });

          await Promise.all([
            invalidateClientLists(
              queryClient
            ),

            invalidateClientStatistics(
              queryClient
            ),

            invalidateDashboardClientViews(
              queryClient
            ),
          ]);

          toast.success(
            'Müvekkil başarıyla oluşturuldu'
          );
        },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Müvekkil oluşturulamadı'
          )
        );
      },
    });
  };

// ======================================================
// UPDATE
// ======================================================

export const useUpdateClient =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        data,
      }) => {
        const normalizedId =
          normalizeId(
            id
          );

        if (!normalizedId) {
          throw new Error(
            'Geçerli müvekkil kaydı bulunamadı'
          );
        }

        return clientApi.update(
          normalizedId,
          data
        );
      },

      onMutate:
        async (
          variables
        ) => {
          const normalizedId =
            normalizeId(
              variables?.id
            );

          if (!normalizedId) {
            return {
              id: '',
            };
          }

          await queryClient.cancelQueries({
            queryKey:
              CLIENT_QUERY_KEYS.detail(
                normalizedId
              ),
            exact:
              true,
          });

          return {
            id:
              normalizedId,
          };
        },

      onSuccess:
        async (
          response,
          variables,
          context
        ) => {
          const normalizedId =
            normalizeId(
              variables?.id ??
              context?.id
            );

          /*
           * Update endpoint'i yalnızca kısmi client döndürürse embedded
           * davalar / vekaletnameler kaybolmasın diye önce merge ediyoruz.
           */
          mergeClientDetailCache(
            queryClient,
            normalizedId,
            response,
            variables?.data
          );

          /*
           * Ardından server detail'i doğrula. Bu cevap ilişkileri de
           * içeriyorsa canonical detail cache kesin olarak güncel olur.
           */
          await syncClientDetailFromServer(
            queryClient,
            normalizedId
          );

          removeLegacyClientCache(
            queryClient,
            normalizedId
          );

          await Promise.all([
            invalidateClientLists(
              queryClient
            ),

            invalidateClientStatistics(
              queryClient
            ),

            invalidateDashboardClientViews(
              queryClient
            ),
          ]);

          toast.success(
            'Müvekkil başarıyla güncellendi'
          );
        },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Müvekkil güncellenemedi'
          )
        );
      },
    });
  };

// ======================================================
// DELETE
// ======================================================

export const useDeleteClient =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        id
      ) => {
        const normalizedId =
          normalizeId(
            id
          );

        if (!normalizedId) {
          throw new Error(
            'Geçerli müvekkil kaydı bulunamadı'
          );
        }

        return clientApi.delete(
          normalizedId
        );
      },

      onMutate:
        async (
          id
        ) => {
          const normalizedId =
            normalizeId(
              id
            );

          if (!normalizedId) {
            return {
              id: '',
            };
          }

          await queryClient.cancelQueries({
            queryKey:
              CLIENT_QUERY_KEYS.detail(
                normalizedId
              ),
            exact:
              true,
          });

          return {
            id:
              normalizedId,
          };
        },

      onSuccess:
        async (
          _response,
          id,
          context
        ) => {
          const normalizedId =
            normalizeId(
              id ??
              context?.id
            );

          /*
           * Müvekkil silinmesi davaları / vekaletnameleri / belgeleri
           * backend politikasına göre detach/cascade edebilir.
           * UI eski relation göstermesin diye ilgili global cache'ler
           * correctness-first olarak yenilenir.
           */
          await Promise.all([
            invalidateClientLists(
              queryClient
            ),

            invalidateClientStatistics(
              queryClient
            ),

            invalidateDashboardClientViews(
              queryClient
            ),

            queryClient.invalidateQueries({
              queryKey: [
                'cases',
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                'case',
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                'powerOfAttorneys',
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                'documents',
              ],
            }),
          ]);

          toast.success(
            'Müvekkil kaydı kaldırıldı'
          );

          /*
           * Sayfa-level onSuccess callback'i listeye navigate ettikten sonra
           * silinen müvekkilin aktif detail cache'i temizlenir. Böylece açık
           * detail query silinen kaydı yeniden fetch edip "Client not found"
           * üretmez.
           */
          window.setTimeout(
            () => {
              removeClientRelatedCache(
                queryClient,
                normalizedId
              );
            },
            0
          );
        },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Müvekkil kaldırılamadı'
          )
        );
      },
    });
  };

// ======================================================
// BULK DELETE
// ======================================================

export const useBulkDeleteClients =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          ids
        ) => {
          const normalizedIds =
            normalizeIds(
              ids
            );

          if (
            normalizedIds.length ===
            0
          ) {
            throw new Error(
              'Kaldırılacak müvekkil seçilmedi'
            );
          }

          const results =
            await Promise.allSettled(
              normalizedIds.map(
                (
                  id
                ) =>
                  clientApi.delete(
                    id
                  )
              )
            );

          const succeeded =
            [];

          const failed =
            [];

          results.forEach(
            (
              result,
              index
            ) => {
              const id =
                normalizedIds[
                  index
                ];

              if (
                result.status ===
                'fulfilled'
              ) {
                succeeded.push(
                  id
                );

                return;
              }

              failed.push({
                id,
                error:
                  result.reason,
              });
            }
          );

          return {
            succeeded,
            failed,
          };
        },

      onSuccess:
        async (
          result
        ) => {
          result.succeeded.forEach(
            (
              id
            ) => {
              removeClientRelatedCache(
                queryClient,
                id
              );
            }
          );

          if (
            result.succeeded.length >
            0
          ) {
            await Promise.all([
              invalidateClientLists(
                queryClient
              ),

              invalidateClientStatistics(
                queryClient
              ),

              invalidateDashboardClientViews(
                queryClient
              ),

              queryClient.invalidateQueries({
                queryKey: [
                  'cases',
                ],
              }),

              queryClient.invalidateQueries({
                queryKey: [
                  'case',
                ],
              }),

              queryClient.invalidateQueries({
                queryKey: [
                  'powerOfAttorneys',
                ],
              }),

              queryClient.invalidateQueries({
                queryKey: [
                  'documents',
                ],
              }),
            ]);
          }

          if (
            result.failed.length ===
            0
          ) {
            toast.success(
              `${result.succeeded.length} müvekkil kaydı kaldırıldı`
            );

            return;
          }

          if (
            result.succeeded.length >
            0
          ) {
            toast(
              `${result.succeeded.length} kayıt kaldırıldı, ${result.failed.length} kayıt kaldırılamadı`,
              {
                icon:
                  '⚠️',
              }
            );

            return;
          }

          toast.error(
            'Seçilen müvekkiller kaldırılamadı'
          );
        },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Toplu kaldırma işlemi başarısız'
          )
        );
      },
    });
  };

// ======================================================
// INFINITE CLIENTS
// ======================================================

export const useInfiniteClients = (
  params = {}
) => {
  return useInfiniteQuery({
    queryKey:
      CLIENT_QUERY_KEYS.infinite(
        params
      ),

    queryFn: ({
      pageParam = 1,
    }) =>
      clientApi.getAll({
        ...params,

        page:
          pageParam,
      }),

    initialPageParam:
      1,

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
        !Number.isFinite(
          currentPage
        ) ||
        !Number.isFinite(
          totalPages
        )
      ) {
        return undefined;
      }

      return currentPage <
        totalPages
        ? currentPage +
            1
        : undefined;
    },

    staleTime:
      CACHE.LIST,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// SEARCH
// ======================================================

export const useSearchClients = (
  query,
  params = {}
) => {
  const normalizedQuery =
    String(
      query ??
      ''
    ).trim();

  const queryParams = {
    ...params,

    search:
      normalizedQuery,
  };

  return useQuery({
    /*
     * Search de canonical list key'i kullanır.
     * Aynı HTTP request için ayrı search namespace yaratılmaz.
     */
    queryKey:
      CLIENT_QUERY_KEYS.list(
        queryParams
      ),

    queryFn: () =>
      clientApi.getAll(
        queryParams
      ),

    enabled:
      normalizedQuery.length >=
        2,

    staleTime:
      CACHE.LIST,

    gcTime:
      CACHE.GC,

    placeholderData: (
      previousData
    ) =>
      previousData,
  });
};

// ======================================================
// PREFETCH DETAIL
// ======================================================

export const prefetchClient = (
  queryClient,
  id
) => {
  const normalizedId =
    normalizeId(
      id
    );

  if (!normalizedId) {
    return Promise.resolve();
  }

  return queryClient.prefetchQuery({
    queryKey:
      CLIENT_QUERY_KEYS.detail(
        normalizedId
      ),

    queryFn: () =>
      clientApi.getOne(
        normalizedId
      ),

    /*
     * Prefetch sonrası relation değişmiş olabileceği için
     * detail uzun süre fresh tutulmaz.
     */
    staleTime:
      CACHE.DETAIL,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// PREFETCH LIST
// ======================================================

export const prefetchClients = (
  queryClient,
  params = {}
) => {
  return queryClient.prefetchQuery({
    queryKey:
      CLIENT_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      clientApi.getAll(
        params
      ),

    staleTime:
      CACHE.LIST,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// OPTIONAL CACHE REFRESH HELPER
// ======================================================

/*
 * Dava / vekaletname / belge modülleri isterse tek noktadan
 * müvekkilin embedded relation cache'lerini yenileyebilir.
 */
export const refreshClientRelations =
  async (
    queryClient,
    id,
    options = {}
  ) => {
    await invalidateClientRelationViews(
      queryClient,
      id,
      options
    );
  };
