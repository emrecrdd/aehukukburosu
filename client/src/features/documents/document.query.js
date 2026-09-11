import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import documentApi from './document.api.js';

import toast from 'react-hot-toast';

// ======================================================
// QUERY KEYS
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

export const DOCUMENT_QUERY_KEYS = {
  all: ['documents'],

  lists: () => [
    ...DOCUMENT_QUERY_KEYS.all,
    'list',
  ],

  list: (params = {}) => [
    ...DOCUMENT_QUERY_KEYS.lists(),
    params,
  ],

  detail: (id) => [
    ...DOCUMENT_QUERY_KEYS.all,
    'detail',
    normalizeId(
      id
    ),
  ],

  categories: () => [
    ...DOCUMENT_QUERY_KEYS.all,
    'categories',
  ],

  statistics: () => [
    ...DOCUMENT_QUERY_KEYS.all,
    'statistics',
  ],

  versions: (documentId) => [
    ...DOCUMENT_QUERY_KEYS.all,
    'versions',
    normalizeId(
      documentId
    ),
  ],

  infinites: () => [
    ...DOCUMENT_QUERY_KEYS.all,
    'infinite',
  ],

  infinite: (params = {}) => [
    ...DOCUMENT_QUERY_KEYS.infinites(),
    params,
  ],

  searches: () => [
    ...DOCUMENT_QUERY_KEYS.all,
    'search',
  ],

  search: (query, params = {}) => [
    ...DOCUMENT_QUERY_KEYS.searches(),
    query,
    params,
  ],
};

// ======================================================
// CACHE SETTINGS
// ======================================================

const CACHE = {
  NORMAL: 5 * 60 * 1000,
  LONG: 10 * 60 * 1000,
  GC: 15 * 60 * 1000,
};

// ======================================================
// ERROR HELPER
// ======================================================

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

const invalidateDocumentCollections = async (
  queryClient,
  {
    categories = true,
    statistics = true,
    relatedViews = true,
  } = {}
) => {
  const invalidations = [
    // Normal belge listeleri
    queryClient.invalidateQueries({
      queryKey:
        DOCUMENT_QUERY_KEYS.lists(),
    }),

    // Sonsuz kaydırmalı belge listeleri
    queryClient.invalidateQueries({
      queryKey:
        DOCUMENT_QUERY_KEYS.infinites(),
    }),

    // Arama sonuçları
    queryClient.invalidateQueries({
      queryKey:
        DOCUMENT_QUERY_KEYS.searches(),
    }),

    // Dashboard'da belge özeti / son belgeler varsa
    queryClient.invalidateQueries({
      queryKey: [
        'dashboard-documents',
      ],
    }),

    // Dashboard toplam belge sayısı / istatistik kartları
    queryClient.invalidateQueries({
      queryKey: [
        'dashboard-stats',
      ],
    }),
  ];

  if (
    categories
  ) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey:
          DOCUMENT_QUERY_KEYS.categories(),
      })
    );
  }

  if (
    statistics
  ) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey:
          DOCUMENT_QUERY_KEYS.statistics(),
      })
    );
  }

  if (
    relatedViews
  ) {
    invalidations.push(
      // Belge bir davaya bağlıysa açık dava detayını yeniler.
      queryClient.invalidateQueries({
        queryKey: [
          'case',
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          'case-documents',
        ],
      }),

      // Belge bir müvekkile bağlıysa açık müvekkil detayını yeniler.
      queryClient.invalidateQueries({
        queryKey: [
          'client',
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          'client-documents',
        ],
      }),

      // Danışmanlık detayındaki belge sekmesi ve sayaç.
      queryClient.invalidateQueries({
        queryKey: [
          'consultation-documents',
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          'consultation',
        ],
      }),

      // Belgenin vekaletname ilişkisi değiştiğinde liste ve detayları yeniler.
      queryClient.invalidateQueries({
        queryKey: [
          'powerOfAttorneys',
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          'powerOfAttorney',
        ],
      })
    );
  }

  await Promise.all(
    invalidations
  );
};

const invalidateDocumentDetail = async (
  queryClient,
  id,
  {
    versions = false,
  } = {}
) => {
  const normalizedId =
    normalizeId(
      id
    );

  if (
    !normalizedId
  ) {
    return;
  }

  const invalidations = [
    queryClient.invalidateQueries({
      queryKey:
        DOCUMENT_QUERY_KEYS.detail(
          normalizedId
        ),
    }),
  ];

  if (
    versions
  ) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey:
          DOCUMENT_QUERY_KEYS.versions(
            normalizedId
          ),
      })
    );
  }

  await Promise.all(
    invalidations
  );
};

// ======================================================
// DOCUMENT LIST
// ======================================================

export const useDocuments = (
  params = {}
) => {
  return useQuery({
    queryKey:
      DOCUMENT_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      documentApi.getAll(params),

    staleTime: CACHE.NORMAL,

    gcTime: CACHE.GC,

    placeholderData: (
      previousData
    ) => previousData,
  });
};

// ======================================================
// DOCUMENT DETAIL
// ======================================================

export const useDocument = (
  id
) => {
  const normalizedId =
    normalizeId(
      id
    );

  return useQuery({
    queryKey:
      DOCUMENT_QUERY_KEYS.detail(
        normalizedId
      ),

    queryFn: () =>
      documentApi.getOne(
        normalizedId
      ),

    enabled:
      Boolean(
        normalizedId
      ),

    staleTime: CACHE.NORMAL,

    gcTime: CACHE.GC,
  });
};

// ======================================================
// CATEGORIES
// ======================================================

export const useDocumentCategories =
  () => {
    return useQuery({
      queryKey:
        DOCUMENT_QUERY_KEYS.categories(),

      queryFn: () =>
        documentApi.getCategories(),

      staleTime: CACHE.LONG,

      gcTime: CACHE.GC,
    });
  };

// ======================================================
// STATISTICS
// ======================================================

export const useDocumentStatistics =
  () => {
    return useQuery({
      queryKey:
        DOCUMENT_QUERY_KEYS.statistics(),

      queryFn: () =>
        documentApi.getStatistics(),

      staleTime: CACHE.LONG,

      gcTime: CACHE.GC,
    });
  };

// ======================================================
// DOCUMENT VERSIONS
// ======================================================

export const useDocumentVersions = (
  documentId
) => {
  const normalizedDocumentId =
    normalizeId(
      documentId
    );

  return useQuery({
    queryKey:
      DOCUMENT_QUERY_KEYS.versions(
        normalizedDocumentId
      ),

    queryFn: () =>
      documentApi.getVersions(
        normalizedDocumentId
      ),

    enabled:
      Boolean(
        normalizedDocumentId
      ),

    staleTime: CACHE.NORMAL,

    gcTime: CACHE.GC,
  });
};

// ======================================================
// UPLOAD DOCUMENT
// ======================================================

export const useUploadDocument =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (formData) =>
        documentApi.upload(
          formData
        ),

      onSuccess: async () => {
        await invalidateDocumentCollections(
          queryClient
        );

        toast.success(
          'Belge başarıyla yüklendi'
        );
      },

      onError: (error) => {
        toast.error(
          getErrorMessage(
            error,
            'Belge yüklenemedi'
          )
        );
      },
    });
  };

// ======================================================
// MULTIPLE DOCUMENT UPLOAD
// ======================================================

export const useUploadDocuments =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (formData) =>
        documentApi.uploadMultiple(
          formData
        ),

      onSuccess: async (
        response
      ) => {
        await invalidateDocumentCollections(
          queryClient
        );

        const result =
          response?.data?.data;

        const success =
          result?.success;

        const failed =
          result?.failed;

        if (
          typeof success ===
            'number' &&
          typeof failed === 'number'
        ) {
          if (failed > 0) {
            toast.error(
              `${success} belge yüklendi, ${failed} belge yüklenemedi`
            );
          } else {
            toast.success(
              `${success} belge başarıyla yüklendi`
            );
          }

          return;
        }

        toast.success(
          'Belgeler başarıyla yüklendi'
        );
      },

      onError: (error) => {
        toast.error(
          getErrorMessage(
            error,
            'Belgeler yüklenemedi'
          )
        );
      },
    });
  };

// ======================================================
// UPLOAD NEW VERSION
// ======================================================

export const useUploadDocumentVersion =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        documentId,
        formData,
      }) =>
        documentApi.uploadVersion(
          documentId,
          formData
        ),

      onSuccess: async (
        _response,
        variables
      ) => {
        const documentId =
          normalizeId(
            variables.documentId
          );

        await Promise.all([
          invalidateDocumentDetail(
            queryClient,
            documentId,
            {
              versions: true,
            }
          ),

          invalidateDocumentCollections(
            queryClient,
            {
              categories: false,
            }
          ),
        ]);

        toast.success(
          'Yeni belge versiyonu yüklendi'
        );
      },

      onError: (error) => {
        toast.error(
          getErrorMessage(
            error,
            'Yeni versiyon yüklenemedi'
          )
        );
      },
    });
  };

// ======================================================
// UPDATE DOCUMENT
// ======================================================

export const useUpdateDocument =
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

        if (
          !normalizedId
        ) {
          throw new Error(
            'Geçerli belge kimliği bulunamadı'
          );
        }

        return documentApi.update(
          normalizedId,
          data
        );
      },

      onSuccess: async (
        _response,
        variables
      ) => {
        const documentId =
          normalizeId(
            variables.id
          );

        await Promise.all([
          invalidateDocumentDetail(
            queryClient,
            documentId
          ),

          invalidateDocumentCollections(
            queryClient
          ),
        ]);

        toast.success(
          'Belge başarıyla güncellendi'
        );
      },

      onError: (error) => {
        toast.error(
          getErrorMessage(
            error,
            'Belge güncellenemedi'
          )
        );
      },
    });
  };

// ======================================================
// DELETE DOCUMENT
// ======================================================

export const useDeleteDocument =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (id) => {
        const normalizedId =
          normalizeId(
            id
          );

        if (
          !normalizedId
        ) {
          throw new Error(
            'Geçerli belge kimliği bulunamadı'
          );
        }

        return documentApi.delete(
          normalizedId
        );
      },

      onSuccess: async (
        _response,
        id
      ) => {
        const documentId =
          normalizeId(
            id
          );

        await Promise.all([
          queryClient.cancelQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.detail(
                documentId
              ),
          }),

          queryClient.cancelQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.versions(
                documentId
              ),
          }),
        ]);

        queryClient.removeQueries({
          queryKey:
            DOCUMENT_QUERY_KEYS.detail(
              documentId
            ),
          exact: true,
        });

        queryClient.removeQueries({
          queryKey:
            DOCUMENT_QUERY_KEYS.versions(
              documentId
            ),
          exact: true,
        });

        await invalidateDocumentCollections(
          queryClient
        );

        toast.success(
          'Belge kaldırıldı'
        );
      },

      onError: (error) => {
        toast.error(
          getErrorMessage(
            error,
            'Belge kaldırılamadı'
          )
        );
      },
    });
  };

// ======================================================
// BULK DELETE
// ======================================================

export const useBulkDeleteDocuments =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: async (
        ids
      ) => {
        if (
          !Array.isArray(ids) ||
          ids.length === 0
        ) {
          throw new Error(
            'Silinecek belge seçilmedi'
          );
        }

        const normalizedIds = [
          ...new Set(
            ids
              .map(
                (id) =>
                  normalizeId(
                    id
                  )
              )
              .filter(Boolean)
          ),
        ];

        if (
          normalizedIds.length ===
          0
        ) {
          throw new Error(
            'Geçerli belge kimliği bulunamadı'
          );
        }

        const results =
          await Promise.allSettled(
            normalizedIds.map(
              (id) =>
                documentApi.delete(
                  id
                )
            )
          );

        const succeeded = [];
        const failed = [];

        results.forEach(
          (result, index) => {
            const id =
              normalizedIds[index];

            if (
              result.status ===
              'fulfilled'
            ) {
              succeeded.push(id);
            } else {
              failed.push({
                id,
                error:
                  result.reason,
              });
            }
          }
        );

        return {
          succeeded,
          failed,
        };
      },

      onSuccess: async (
        result
      ) => {
        await Promise.all(
          result.succeeded.flatMap(
            (id) => [
              queryClient.cancelQueries({
                queryKey:
                  DOCUMENT_QUERY_KEYS.detail(
                    id
                  ),
              }),

              queryClient.cancelQueries({
                queryKey:
                  DOCUMENT_QUERY_KEYS.versions(
                    id
                  ),
              }),
            ]
          )
        );

        result.succeeded.forEach(
          (id) => {
            queryClient.removeQueries({
              queryKey:
                DOCUMENT_QUERY_KEYS.detail(
                  id
                ),
              exact: true,
            });

            queryClient.removeQueries({
              queryKey:
                DOCUMENT_QUERY_KEYS.versions(
                  id
                ),
              exact: true,
            });
          }
        );

        await invalidateDocumentCollections(
          queryClient
        );

        if (
          result.failed.length ===
          0
        ) {
          toast.success(
            `${result.succeeded.length} belge kaldırıldı`
          );

          return;
        }

        if (
          result.succeeded.length >
          0
        ) {
          toast.error(
            `${result.succeeded.length} belge kaldırıldı, ${result.failed.length} belge kaldırılamadı`
          );

          return;
        }

        toast.error(
          'Seçilen belgeler kaldırılamadı'
        );
      },

      onError: (error) => {
        toast.error(
          getErrorMessage(
            error,
            'Toplu silme işlemi başarısız'
          )
        );
      },
    });
  };

// ======================================================
// INFINITE DOCUMENTS
// ======================================================

export const useInfiniteDocuments = (
  params = {}
) => {
  return useInfiniteQuery({
    queryKey:
      DOCUMENT_QUERY_KEYS.infinite(
        params
      ),

    queryFn: ({
      pageParam,
    }) =>
      documentApi.getAll({
        ...params,
        page: pageParam,
      }),

    initialPageParam: 1,

    getNextPageParam: (
      lastPage
    ) => {
      const pagination =
        lastPage?.data
          ?.pagination ??
        lastPage?.data
          ?.data
          ?.pagination ??
        lastPage?.pagination ??
        null;

      if (!pagination) {
        return undefined;
      }

      const currentPage =
        Number(
          pagination.page
        ) || 1;

      const totalPages =
        Number(
          pagination.totalPages
        ) || 1;

      if (
        currentPage <
        totalPages
      ) {
        return (
          currentPage + 1
        );
      }

      return undefined;
    },

    staleTime: CACHE.NORMAL,

    gcTime: CACHE.GC,
  });
};

// ======================================================
// SEARCH DOCUMENTS
// ======================================================

export const useSearchDocuments = (
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
      DOCUMENT_QUERY_KEYS.search(
        normalizedQuery,
        params
      ),

    queryFn: () =>
      documentApi.getAll({
        ...params,
        search:
          normalizedQuery,
      }),

    enabled:
      normalizedQuery.length >=
      2,

    staleTime: CACHE.NORMAL,

    gcTime: CACHE.GC,
  });
};

// ======================================================
// PREFETCH DETAIL
// ======================================================

export const prefetchDocument = (
  queryClient,
  id
) => {
  const normalizedId =
    normalizeId(
      id
    );

  if (
    !normalizedId
  ) {
    return Promise.resolve();
  }

  return queryClient.prefetchQuery({
    queryKey:
      DOCUMENT_QUERY_KEYS.detail(
        normalizedId
      ),

    queryFn: () =>
      documentApi.getOne(
        normalizedId
      ),

    staleTime: CACHE.NORMAL,
  });
};

// ======================================================
// PREFETCH LIST
// ======================================================

export const prefetchDocuments = (
  queryClient,
  params = {}
) => {
  return queryClient.prefetchQuery({
    queryKey:
      DOCUMENT_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      documentApi.getAll(params),

    staleTime: CACHE.NORMAL,
  });
};