import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import consultationApi from './consultation.api.js';
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

const normalizeMutationData = (
  data
) => {
  if (
    !data ||
    typeof data !==
      'object'
  ) {
    return {};
  }

  return data;
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

const getConsultationItem = (
  response
) => {
  const item =
    getResponseItem(
      response
    );

  return (
    item?.consultation ??
    item ??
    null
  );
};

const getConsultationIdFromResponse = (
  response
) => {
  return normalizeId(
    getConsultationItem(
      response
    )?.id
  );
};

const getConsultationClientId = (
  source
) => {
  const item =
    getConsultationItem(
      source
    );

  return normalizeId(
    item?.client_id ??
    item?.client?.id
  );
};

const getConvertedCaseId = (
  source
) => {
  const payload =
    getResponseItem(
      source
    );

  return normalizeId(
    payload?.case_id ??
    payload?.consultation
      ?.converted_case_id ??
    payload?.converted_case_id
  );
};

const getConvertedClientId = (
  source
) => {
  const payload =
    getResponseItem(
      source
    );

  return normalizeId(
    payload?.client_id ??
    payload?.consultation
      ?.client_id
  );
};

const replaceResponseItem = (
  current,
  nextItem
) => {
  if (
    !current
  ) {
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

const mergeConsultationDetailCache =
  (
    queryClient,
    consultationId,
    response,
    submittedData = {}
  ) => {
    const normalizedId =
      normalizeId(
        consultationId
      );

    if (
      !normalizedId
    ) {
      return;
    }

    const responseItem =
      getConsultationItem(
        response
      );

    queryClient.setQueryData(
      CONSULTATION_QUERY_KEYS.detail(
        normalizedId
      ),
      (
        current
      ) => {
        const currentItem =
          getConsultationItem(
            current
          );

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
          Object.keys(
            nextItem
          ).length > 0
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

const syncConsultationDetailFromServer =
  async (
    queryClient,
    consultationId
  ) => {
    const normalizedId =
      normalizeId(
        consultationId
      );

    if (
      !normalizedId
    ) {
      return null;
    }

    try {
      const response =
        await consultationApi.getOne(
          normalizedId
        );

      queryClient.setQueryData(
        CONSULTATION_QUERY_KEYS.detail(
          normalizedId
        ),
        response
      );

      return response;
    } catch {
      return null;
    }
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

// ======================================================
// QUERY KEYS
// ======================================================

export const CONSULTATION_QUERY_KEYS = {
  all: [
    'consultations',
  ],

  lists: () => [
    'consultations',
  ],

  list: (
    params = {}
  ) => [
    ...CONSULTATION_QUERY_KEYS
      .lists(),
    params,
  ],

  detail: (
    id
  ) => [
    'consultation',
    normalizeId(
      id
    ),
  ],

  statistics: () => [
    'consultation-statistics',
  ],

  assignableUsers: () => [
    'consultation-assignable-users',
  ],

  tasks: (
    id
  ) => [
    'consultation-tasks',
    normalizeId(
      id
    ),
  ],

  meetings: (
    id
  ) => [
    'consultation-meetings',
    normalizeId(
      id
    ),
  ],

  documents: (
    id
  ) => [
    'consultation-documents',
    normalizeId(
      id
    ),
  ],

  notes: (
    id
  ) => [
    'consultation-notes',
    normalizeId(
      id
    ),
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
// INVALIDATION HELPERS
// ======================================================

const invalidateConsultationCollections =
  async (
    queryClient
  ) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey:
          CONSULTATION_QUERY_KEYS
            .all,
      }),

      queryClient.invalidateQueries({
        queryKey:
          CONSULTATION_QUERY_KEYS
            .statistics(),
      }),
    ]);
  };

const invalidateConsultationRelations =
  async (
    queryClient,
    consultationId
  ) => {
    const normalizedId =
      normalizeId(
        consultationId
      );

    if (
      !normalizedId
    ) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey:
          CONSULTATION_QUERY_KEYS
            .tasks(
              normalizedId
            ),
      }),

      queryClient.invalidateQueries({
        queryKey:
          CONSULTATION_QUERY_KEYS
            .meetings(
              normalizedId
            ),
      }),

      queryClient.invalidateQueries({
        queryKey:
          CONSULTATION_QUERY_KEYS
            .documents(
              normalizedId
            ),
      }),

      queryClient.invalidateQueries({
        queryKey:
          CONSULTATION_QUERY_KEYS
            .notes(
              normalizedId
            ),
      }),
    ]);
  };

const invalidateClientViews =
  async (
    queryClient,
    clientIds = []
  ) => {
    const normalizedIds = [
      ...new Set(
        (
          Array.isArray(
            clientIds
          )
            ? clientIds
            : [
                clientIds,
              ]
        )
          .flatMap(
            (
              value
            ) =>
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

    const invalidations = [
      queryClient.invalidateQueries({
        queryKey: [
          'clients',
        ],
      }),
    ];

    normalizedIds.forEach(
      (
        clientId
      ) => {
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

const invalidateCaseViews =
  async (
    queryClient,
    caseId = ''
  ) => {
    const normalizedCaseId =
      normalizeId(
        caseId
      );

    const invalidations = [
      queryClient.invalidateQueries({
        queryKey: [
          'cases',
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          'case-statistics',
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          'dashboard-cases',
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          'dashboard-stats',
        ],
      }),
    ];

    if (
      normalizedCaseId
    ) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: [
            'case',
            normalizedCaseId,
          ],
        })
      );
    }

    await Promise.all(
      invalidations
    );
  };

const invalidateConvertedChildViews =
  async (
    queryClient,
    caseId = ''
  ) => {
    const normalizedCaseId =
      normalizeId(
        caseId
      );

    const invalidations = [
      queryClient.invalidateQueries({
        queryKey: [
          'tasks',
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          'meetings',
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          'documents',
        ],
      }),
    ];

    if (
      normalizedCaseId
    ) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: [
            'case-tasks',
            normalizedCaseId,
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            'case-documents',
            normalizedCaseId,
          ],
        })
      );
    }

    await Promise.all(
      invalidations
    );
  };

// ======================================================
// QUERIES
// ======================================================

export const useConsultations = (
  params = {}
) => {
  return useQuery({
    queryKey:
      CONSULTATION_QUERY_KEYS
        .list(
          params
        ),

    queryFn: () =>
      consultationApi.getAll(
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

export const useConsultation = (
  id
) => {
  const normalizedId =
    normalizeId(
      id
    );

  return useQuery({
    queryKey:
      CONSULTATION_QUERY_KEYS
        .detail(
          normalizedId
        ),

    queryFn: () =>
      consultationApi.getOne(
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

    refetchOnMount:
      true,

    refetchOnWindowFocus:
      true,
  });
};

export const useConsultationStatistics =
  () => {
    return useQuery({
      queryKey:
        CONSULTATION_QUERY_KEYS
          .statistics(),

      queryFn: () =>
        consultationApi
          .getStatistics(),

      staleTime:
        CACHE.LONG,

      gcTime:
        CACHE.GC_LONG,
    });
  };

export const useConsultationAssignableUsers = (
  enabled = true
) => {
  return useQuery({
    queryKey:
      CONSULTATION_QUERY_KEYS
        .assignableUsers(),

    queryFn: () =>
      consultationApi
        .getAssignableUsers(),

    enabled:
      Boolean(
        enabled
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

export const useConsultationTasks = (
  consultationId
) => {
  const normalizedId =
    normalizeId(
      consultationId
    );

  return useQuery({
    queryKey:
      CONSULTATION_QUERY_KEYS
        .tasks(
          normalizedId
        ),

    queryFn: () =>
      consultationApi.getTasks(
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
  });
};

export const useConsultationMeetings = (
  consultationId
) => {
  const normalizedId =
    normalizeId(
      consultationId
    );

  return useQuery({
    queryKey:
      CONSULTATION_QUERY_KEYS
        .meetings(
          normalizedId
        ),

    queryFn: () =>
      consultationApi.getMeetings(
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
  });
};

export const useConsultationDocuments = (
  consultationId
) => {
  const normalizedId =
    normalizeId(
      consultationId
    );

  return useQuery({
    queryKey:
      CONSULTATION_QUERY_KEYS
        .documents(
          normalizedId
        ),

    queryFn: () =>
      consultationApi.getDocuments(
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
  });
};

export const useConsultationNotes = (
  consultationId
) => {
  const normalizedId =
    normalizeId(
      consultationId
    );

  return useQuery({
    queryKey:
      CONSULTATION_QUERY_KEYS
        .notes(
          normalizedId
        ),

    queryFn: () =>
      consultationApi.getNotes(
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
  });
};

// ======================================================
// MUTATIONS
// ======================================================

export const useCreateConsultation =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        data
      ) =>
        consultationApi.create(
          data
        ),

      onSuccess: async (
        response
      ) => {
        const createdId =
          getConsultationIdFromResponse(
            response
          );

        if (
          createdId
        ) {
          queryClient.setQueryData(
            CONSULTATION_QUERY_KEYS
              .detail(
                createdId
              ),
            response
          );
        }

        await invalidateConsultationCollections(
          queryClient
        );

        toast.success(
          'Danışmanlık başarıyla oluşturuldu'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Danışmanlık oluşturulamadı'
          )
        );
      },
    });
  };

export const useUpdateConsultation =
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
            'Geçerli danışmanlık kaydı bulunamadı'
          );
        }

        return consultationApi.update(
          normalizedId,
          data
        );
      },

      onMutate: async (
        variables
      ) => {
        const consultationId =
          normalizeId(
            variables?.id
          );

        if (
          !consultationId
        ) {
          return {
            consultationId:
              '',
            oldClientId:
              '',
          };
        }

        await queryClient.cancelQueries({
          queryKey:
            CONSULTATION_QUERY_KEYS
              .detail(
                consultationId
              ),
        });

        let previousDetail =
          queryClient.getQueryData(
            CONSULTATION_QUERY_KEYS
              .detail(
                consultationId
              )
          );

        if (
          !previousDetail
        ) {
          try {
            previousDetail =
              await consultationApi.getOne(
                consultationId
              );
          } catch {
            // Update yine devam eder; yalnız eski client cache bilgisi eksik kalabilir.
          }
        }

        return {
          consultationId,

          oldClientId:
            getConsultationClientId(
              previousDetail
            ),
        };
      },

      onSuccess: async (
        response,
        variables,
        context
      ) => {
        const consultationId =
          normalizeId(
            variables?.id ??
            context
              ?.consultationId
          );

        const submittedData =
          normalizeMutationData(
            variables?.data
          );

        const syncedResponse =
          await syncConsultationDetailFromServer(
            queryClient,
            consultationId
          );

        if (
          !syncedResponse
        ) {
          mergeConsultationDetailCache(
            queryClient,
            consultationId,
            response,
            submittedData
          );
        }

        const currentClientId =
          getConsultationClientId(
            syncedResponse ??
            response
          );

        await Promise.all([
          invalidateConsultationCollections(
            queryClient
          ),

          invalidateClientViews(
            queryClient,
            [
              context?.oldClientId,
              submittedData
                ?.client_id,
              currentClientId,
            ]
          ),
        ]);

        if (
          !variables?.silent
        ) {
          toast.success(
            'Danışmanlık başarıyla güncellendi'
          );
        }
      },

      onError: (
        error,
        variables
      ) => {
        if (
          !variables?.silent
        ) {
          toast.error(
            getErrorMessage(
              error,
              'Danışmanlık güncellenemedi'
            )
          );
        }
      },
    });
  };

export const useDeleteConsultation =
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

        if (
          !normalizedId
        ) {
          throw new Error(
            'Geçerli danışmanlık kaydı bulunamadı'
          );
        }

        return consultationApi.delete(
          normalizedId
        );
      },

      onMutate: async (
        id
      ) => {
        const consultationId =
          normalizeId(
            id
          );

        await queryClient.cancelQueries({
          queryKey:
            CONSULTATION_QUERY_KEYS
              .detail(
                consultationId
              ),
        });

        let previousDetail =
          queryClient.getQueryData(
            CONSULTATION_QUERY_KEYS
              .detail(
                consultationId
              )
          );

        if (
          !previousDetail
        ) {
          try {
            previousDetail =
              await consultationApi.getOne(
                consultationId
              );
          } catch {
            // Silme yine devam eder; relation cache bilgisi eksik kalabilir.
          }
        }

        return {
          consultationId,

          clientId:
            getConsultationClientId(
              previousDetail
            ),
        };
      },

      onSuccess: async (
        _response,
        id,
        context
      ) => {
        const consultationId =
          normalizeId(
            id ??
            context
              ?.consultationId
          );

        queryClient.removeQueries({
          queryKey:
            CONSULTATION_QUERY_KEYS
              .detail(
                consultationId
              ),
          exact:
            true,
        });

        [
          CONSULTATION_QUERY_KEYS
            .tasks(
              consultationId
            ),

          CONSULTATION_QUERY_KEYS
            .meetings(
              consultationId
            ),

          CONSULTATION_QUERY_KEYS
            .documents(
              consultationId
            ),
        ].forEach(
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

        await Promise.all([
          invalidateConsultationCollections(
            queryClient
          ),

          invalidateClientViews(
            queryClient,
            context?.clientId
          ),
        ]);

        toast.success(
          'Danışmanlık başarıyla silindi'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Danışmanlık silinemedi'
          )
        );
      },
    });
  };

export const useUpdateConsultationStatus =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        status,
      }) => {
        const normalizedId =
          normalizeId(
            id
          );

        if (
          !normalizedId
        ) {
          throw new Error(
            'Geçerli danışmanlık kaydı bulunamadı'
          );
        }

        return consultationApi.updateStatus(
          normalizedId,
          status
        );
      },

      onSuccess: async (
        response,
        variables
      ) => {
        const consultationId =
          normalizeId(
            variables?.id
          );

        const syncedResponse =
          await syncConsultationDetailFromServer(
            queryClient,
            consultationId
          );

        if (
          !syncedResponse
        ) {
          mergeConsultationDetailCache(
            queryClient,
            consultationId,
            response,
            {
              status:
                variables?.status,
            }
          );
        }

        await invalidateConsultationCollections(
          queryClient
        );

        if (
          !variables?.silent
        ) {
          toast.success(
            'Danışmanlık durumu güncellendi'
          );
        }
      },

      onError: (
        error,
        variables
      ) => {
        if (
          !variables?.silent
        ) {
          toast.error(
            getErrorMessage(
              error,
              'Danışmanlık durumu güncellenemedi'
            )
          );
        }
      },
    });
  };

// ======================================================
// ASSIGNEE MUTATIONS
// ======================================================

export const useAddConsultationAssignee =
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
            'Geçerli danışmanlık kaydı bulunamadı'
          );
        }

        return consultationApi.addAssignee(
          normalizedId,
          data
        );
      },

      onSuccess: async (
        response,
        variables
      ) => {
        const consultationId =
          normalizeId(
            variables?.id
          );

        mergeConsultationDetailCache(
          queryClient,
          consultationId,
          response
        );

        await invalidateConsultationCollections(
          queryClient
        );

        toast.success(
          'Sorumlu başarıyla eklendi'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Sorumlu eklenemedi'
          )
        );
      },
    });
  };

export const useRemoveConsultationAssignee =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        userId,
      }) => {
        const normalizedId =
          normalizeId(
            id
          );

        const normalizedUserId =
          normalizeId(
            userId
          );

        if (
          !normalizedId ||
          !normalizedUserId
        ) {
          throw new Error(
            'Geçerli danışmanlık veya sorumlu kaydı bulunamadı'
          );
        }

        return consultationApi.removeAssignee(
          normalizedId,
          normalizedUserId
        );
      },

      onSuccess: async (
        response,
        variables
      ) => {
        const consultationId =
          normalizeId(
            variables?.id
          );

        mergeConsultationDetailCache(
          queryClient,
          consultationId,
          response
        );

        await invalidateConsultationCollections(
          queryClient
        );

        toast.success(
          'Sorumlu başarıyla kaldırıldı'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Sorumlu kaldırılamadı'
          )
        );
      },
    });
  };

// ======================================================
// CONVERSION MUTATIONS
// ======================================================

export const useAddConsultationNote =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        data,
      }) =>
        consultationApi.addNote(
          normalizeId(
            id
          ),
          normalizeMutationData(
            data
          )
        ),

      onSuccess: async (
        _response,
        variables
      ) => {
        const consultationId =
          normalizeId(
            variables?.id
          );

        if (
          consultationId
        ) {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey:
                CONSULTATION_QUERY_KEYS
                  .notes(
                    consultationId
                  ),
            }),

            queryClient.invalidateQueries({
              queryKey: [
                'consultation-audit-logs',
                consultationId,
              ],
            }),
          ]);
        }

        toast.success(
          'Not eklendi'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Not eklenemedi'
          )
        );
      },
    });
  };

export const useConvertConsultationToClient =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        data = {},
      }) => {
        const normalizedId =
          normalizeId(
            id
          );

        if (
          !normalizedId
        ) {
          throw new Error(
            'Geçerli danışmanlık kaydı bulunamadı'
          );
        }

        return consultationApi.convertToClient(
          normalizedId,
          data
        );
      },

      onSuccess: async (
        response,
        variables
      ) => {
        const consultationId =
          normalizeId(
            variables?.id
          );

        const clientId =
          getConvertedClientId(
            response
          );

        const syncedResponse =
          await syncConsultationDetailFromServer(
            queryClient,
            consultationId
          );

        if (
          !syncedResponse
        ) {
          mergeConsultationDetailCache(
            queryClient,
            consultationId,
            response
          );
        }

        await Promise.all([
          invalidateConsultationCollections(
            queryClient
          ),

          invalidateClientViews(
            queryClient,
            clientId
          ),
        ]);

        toast.success(
          'Talep sahibi müvekkile dönüştürüldü'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Müvekkile dönüştürme başarısız'
          )
        );
      },
    });
  };

export const useConvertConsultationToCase =
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
            'Geçerli danışmanlık kaydı bulunamadı'
          );
        }

        return consultationApi.convertToCase(
          normalizedId,
          data
        );
      },

      onSuccess: async (
        response,
        variables
      ) => {
        const consultationId =
          normalizeId(
            variables?.id
          );

        const caseId =
          getConvertedCaseId(
            response
          );

        const clientId =
          getConsultationClientId(
            response
          );

        const syncedResponse =
          await syncConsultationDetailFromServer(
            queryClient,
            consultationId
          );

        if (
          !syncedResponse
        ) {
          mergeConsultationDetailCache(
            queryClient,
            consultationId,
            response
          );
        }

        await Promise.all([
          invalidateConsultationCollections(
            queryClient
          ),

          invalidateConsultationRelations(
            queryClient,
            consultationId
          ),

          invalidateCaseViews(
            queryClient,
            caseId
          ),

          invalidateConvertedChildViews(
            queryClient,
            caseId
          ),

          invalidateClientViews(
            queryClient,
            clientId
          ),
        ]);

        toast.success(
          'Danışmanlık başarıyla davaya dönüştürüldü'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Davaya dönüştürme başarısız'
          )
        );
      },
    });
  };

// ======================================================
// PREFETCHING
// ======================================================

export const prefetchConsultation = (
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
      CONSULTATION_QUERY_KEYS
        .detail(
          normalizedId
        ),

    queryFn: () =>
      consultationApi.getOne(
        normalizedId
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

export const prefetchConsultations = (
  queryClient,
  params = {}
) => {
  return queryClient.prefetchQuery({
    queryKey:
      CONSULTATION_QUERY_KEYS
        .list(
          params
        ),

    queryFn: () =>
      consultationApi.getAll(
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

export const updateConsultationCache = (
  queryClient,
  id,
  updater
) => {
  const normalizedId =
    normalizeId(
      id
    );

  if (
    !normalizedId ||
    typeof updater !==
      'function'
  ) {
    return;
  }

  queryClient.setQueryData(
    CONSULTATION_QUERY_KEYS
      .detail(
        normalizedId
      ),
    (
      oldData
    ) => {
      if (
        !oldData
      ) {
        return oldData;
      }

      const oldItem =
        getConsultationItem(
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

export const removeConsultationFromCache = (
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
    return;
  }

  queryClient.removeQueries({
    queryKey:
      CONSULTATION_QUERY_KEYS
        .detail(
          normalizedId
        ),
    exact:
      true,
  });
};

// ======================================================
// EXPORT
// ======================================================

export default {
  // Queries
  useConsultations,
  useConsultation,
  useConsultationStatistics,
  useConsultationAssignableUsers,
  useConsultationTasks,
  useConsultationMeetings,
  useConsultationDocuments,
  useConsultationNotes,

  // Mutations
  useCreateConsultation,
  useUpdateConsultation,
  useDeleteConsultation,
  useUpdateConsultationStatus,
  useAddConsultationAssignee,
  useRemoveConsultationAssignee,
  useAddConsultationNote,
  useConvertConsultationToClient,
  useConvertConsultationToCase,

  // Helpers
  prefetchConsultation,
  prefetchConsultations,
  updateConsultationCache,
  removeConsultationFromCache,
};
