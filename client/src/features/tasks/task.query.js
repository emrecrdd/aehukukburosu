import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';

import taskApi from './task.api.js';
import toast from 'react-hot-toast';

// ======================================================
// QUERY KEYS
// ======================================================

export const TASK_QUERY_KEYS = {
  all: [
    'tasks',
  ],

  list: (
    params = {}
  ) => [
    'tasks',
    params,
  ],

  detail: (
    id
  ) => [
    'task',
    id,
  ],

  myTasks: (
    params = {}
  ) => [
    'my-tasks',
    params,
  ],

  overdue: () => [
    'my-overdue-tasks',
  ],

  upcoming: () => [
    'my-upcoming-tasks',
  ],

  statistics: () => [
    'task-statistics',
  ],

  assignableUsers: () => [
    'task-assignable-users',
  ],

  notes: (
    id
  ) => [
    'task-notes',
    id,
  ],

  byClient: (
    clientId,
    params = {}
  ) => [
    'client-tasks',
    clientId,
    params,
  ],

  clientOverview: (
    clientId,
    params = {}
  ) => [
    'client-task-overview',
    clientId,
    params,
  ],

  infinite: (
    params = {}
  ) => [
    'tasks-infinite',
    params,
  ],

  search: (
    query,
    params = {}
  ) => [
    'tasks-search',
    query,
    params,
  ],
};

// ======================================================
// CACHE
// ======================================================

const CACHE = {
  SHORT:
    60 * 1000,

  NORMAL:
    5 * 60 * 1000,

  LONG:
    10 * 60 * 1000,

  GC:
    10 * 60 * 1000,
};

// ======================================================
// INVALIDATE HELPERS
// ======================================================

const invalidateTaskLists = (
  queryClient
) => {
  queryClient.invalidateQueries({
    queryKey: [
      'tasks',
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [
      'my-tasks',
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [
      'my-overdue-tasks',
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [
      'my-upcoming-tasks',
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [
      'tasks-infinite',
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [
      'tasks-search',
    ],
  });
};

const invalidateTask = (
  queryClient,
  id
) => {
  if (!id) {
    return;
  }

  queryClient.invalidateQueries({
    queryKey:
      TASK_QUERY_KEYS.detail(
        id
      ),
  });
};

const invalidateTaskNotes = (
  queryClient,
  id
) => {
  if (!id) {
    return;
  }

  queryClient.invalidateQueries({
    queryKey:
      TASK_QUERY_KEYS.notes(
        id
      ),
  });
};

const invalidateTaskStatistics = (
  queryClient
) => {
  queryClient.invalidateQueries({
    queryKey:
      TASK_QUERY_KEYS.statistics(),
  });
};

const invalidateTaskCrossViews = (
  queryClient
) => {
  // Takvimde görevler calendar-events sorgusundan geliyor.
  queryClient.invalidateQueries({
    queryKey: [
      'calendar-events',
    ],
  });

  // Dashboard görev kartı ve sayaçları.
  queryClient.invalidateQueries({
    queryKey: [
      'dashboard-tasks',
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [
      'dashboard-stats',
    ],
  });

  /*
   * İlişki değişikliklerinde eski müvekkil/dava ID'si mutation
   * payload'ında olmayabilir. Prefix invalidation hem eski hem yeni
   * ilişki ekranının F5'siz yenilenmesini sağlar.
   */
  queryClient.invalidateQueries({
    queryKey: [
      'client-tasks',
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [
      'client-task-overview',
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [
      'client',
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [
      'case',
    ],
  });
};

const invalidateClientTasks = (
  queryClient,
  clientId
) => {
  if (
    clientId
  ) {
    queryClient.invalidateQueries({
      queryKey: [
        'client-tasks',
        clientId,
      ],
    });

    queryClient.invalidateQueries({
      queryKey: [
        'client-task-overview',
        clientId,
      ],
    });

    queryClient.invalidateQueries({
      queryKey: [
        'client',
        clientId,
      ],
    });

    return;
  }

  queryClient.invalidateQueries({
    queryKey: [
      'client-tasks',
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [
      'client-task-overview',
    ],
  });
};

const invalidateCaseTasks = (
  queryClient,
  caseId
) => {
  if (
    !caseId
  ) {
    return;
  }

  queryClient.invalidateQueries({
    queryKey: [
      'case',
      caseId,
    ],
  });
};

// ======================================================
// TOAST
// ======================================================

const success = (
  message
) => {
  toast.success(
    message
  );
};

const failure = (
  error,
  fallback
) => {
  toast.error(
    error?.response
      ?.data
      ?.message ||
      error?.message ||
      fallback
  );
};


const invalidateConsultationTasks = (
  queryClient,
  consultationId
) => {
  if (
    !consultationId
  ) {
    return;
  }

  const normalizedId =
    String(
      consultationId
    );

  queryClient.invalidateQueries({
    queryKey: [
      'consultation-tasks',
      normalizedId,
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [
      'consultation',
      normalizedId,
    ],
  });
};

const unwrapTaskPayload = (
  value
) => {
  return (
    value?.data?.data ??
    value?.data ??
    value ??
    null
  );
};

const getTaskConsultationId = (
  value
) => {
  const task =
    unwrapTaskPayload(
      value
    );

  const consultationId =
    task?.consultation_id ??
    task?.consultation?.id ??
    '';

  return consultationId
    ? String(
        consultationId
      )
    : '';
};

const getTaskRows = (
  value
) => {
  const payload =
    unwrapTaskPayload(
      value
    );

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

  return [];
};

const getConsultationIdsForTaskIds =
  (
    queryClient,
    taskIds = []
  ) => {
    const normalizedTaskIds =
      new Set(
        (
          Array.isArray(
            taskIds
          )
            ? taskIds
            : [
                taskIds,
              ]
        )
          .map(
            (id) =>
              id
                ? String(
                    id
                  )
                : ''
          )
          .filter(
            Boolean
          )
      );

    if (
      normalizedTaskIds.size ===
      0
    ) {
      return [];
    }

    const consultationIds =
      new Set();

    normalizedTaskIds.forEach(
      (taskId) => {
        const cachedTask =
          queryClient.getQueryData(
            TASK_QUERY_KEYS.detail(
              taskId
            )
          );

        const consultationId =
          getTaskConsultationId(
            cachedTask
          );

        if (
          consultationId
        ) {
          consultationIds.add(
            consultationId
          );
        }
      }
    );

    /*
     * Danışmanlık detayındaki görev listesi açıkken task detail cache'i
     * bulunmayabilir. Bu yüzden consultation-tasks cache'lerini de tarıyoruz.
     * Delete sonrası "1 kayıt" sayısının F5 beklemeden düşmesi için kritik.
     */
    queryClient
      .getQueriesData({
        queryKey: [
          'consultation-tasks',
        ],
      })
      .forEach(
        ([
          queryKey,
          cachedValue,
        ]) => {
          const consultationId =
            queryKey?.[1]
              ? String(
                  queryKey[1]
                )
              : '';

          if (
            !consultationId
          ) {
            return;
          }

          const rows =
            getTaskRows(
              cachedValue
            );

          const containsTask =
            rows.some(
              (task) =>
                normalizedTaskIds.has(
                  String(
                    task?.id ??
                    ''
                  )
                )
            );

          if (
            containsTask
          ) {
            consultationIds.add(
              consultationId
            );
          }
        }
      );

    return [
      ...consultationIds,
    ];
  };

const invalidateConsultationTaskViews =
  (
    queryClient,
    {
      taskIds = [],
      sources = [],
      consultationIds = [],
    } = {}
  ) => {
    const ids =
      new Set(
        getConsultationIdsForTaskIds(
          queryClient,
          taskIds
        )
      );

    (
      Array.isArray(
        sources
      )
        ? sources
        : [
            sources,
          ]
    ).forEach(
      (source) => {
        const consultationId =
          getTaskConsultationId(
            source
          );

        if (
          consultationId
        ) {
          ids.add(
            consultationId
          );
        }
      }
    );

    (
      Array.isArray(
        consultationIds
      )
        ? consultationIds
        : [
            consultationIds,
          ]
    )
      .filter(
        Boolean
      )
      .forEach(
        (consultationId) =>
          ids.add(
            String(
              consultationId
            )
          )
      );

    ids.forEach(
      (consultationId) =>
        invalidateConsultationTasks(
          queryClient,
          consultationId
        )
    );

    return [
      ...ids,
    ];
  };

// ======================================================
// QUERIES
// ======================================================

export const useTasks = (
  params = {}
) => {
  return useQuery({
    queryKey:
      TASK_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      taskApi.getAll(
        params
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,

    placeholderData:
      (
        previousData
      ) =>
        previousData,
  });
};

export const useTask = (
  id
) => {
  return useQuery({
    queryKey:
      TASK_QUERY_KEYS.detail(
        id
      ),

    queryFn: () =>
      taskApi.getOne(
        id
      ),

    enabled:
      Boolean(
        id
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

export const useMyTasks = (
  params = {}
) => {
  return useQuery({
    queryKey:
      TASK_QUERY_KEYS.myTasks(
        params
      ),

    queryFn: () =>
      taskApi.getMyTasks(
        params
      ),

    staleTime:
      CACHE.SHORT,

    gcTime:
      CACHE.GC,

    placeholderData:
      (
        previousData
      ) =>
        previousData,
  });
};

export const useMyOverdueTasks =
  () => {
    return useQuery({
      queryKey:
        TASK_QUERY_KEYS.overdue(),

      queryFn: () =>
        taskApi.getMyOverdue(),

      staleTime:
        CACHE.SHORT,

      gcTime:
        CACHE.GC,
    });
  };

export const useMyUpcomingTasks =
  () => {
    return useQuery({
      queryKey:
        TASK_QUERY_KEYS.upcoming(),

      queryFn: () =>
        taskApi.getMyUpcoming(),

      staleTime:
        CACHE.SHORT,

      gcTime:
        CACHE.GC,
    });
  };

export const useTaskStatistics =
  () => {
    return useQuery({
      queryKey:
        TASK_QUERY_KEYS.statistics(),

      queryFn: () =>
        taskApi.getStatistics(),

      staleTime:
        CACHE.LONG,

      gcTime:
        CACHE.GC,
    });
  };

// ======================================================
// ASSIGNABLE USERS
// ======================================================

export const useAssignableUsers = (
  enabled = true
) => {
  return useQuery({
    queryKey:
      TASK_QUERY_KEYS.assignableUsers(),

    queryFn: () =>
      taskApi.getAssignableUsers(),

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

// ======================================================
// TASK NOTES
// ======================================================

export const useTaskNotes = (
  taskId
) => {
  return useQuery({
    queryKey:
      TASK_QUERY_KEYS.notes(
        taskId
      ),

    queryFn: () =>
      taskApi.getNotes(
        taskId
      ),

    enabled:
      Boolean(
        taskId
      ),

    staleTime:
      CACHE.SHORT,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// CLIENT TASKS
// ======================================================

export const useClientTasks = (
  clientId,
  params = {}
) => {
  return useQuery({
    queryKey:
      TASK_QUERY_KEYS.byClient(
        clientId,
        params
      ),

    queryFn: () =>
      taskApi.getByClient(
        clientId,
        params
      ),

    enabled:
      Boolean(
        clientId
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,

    placeholderData:
      (
        previousData
      ) =>
        previousData,
  });
};

// ======================================================
// CLIENT COCKPIT OVERVIEW
// ======================================================

export const useClientTaskOverview = (
  clientId,
  params = {
    active_limit: 5,
    recent_limit: 5,
  }
) => {
  return useQuery({
    queryKey:
      TASK_QUERY_KEYS.clientOverview(
        clientId,
        params
      ),

    queryFn: () =>
      taskApi.getClientOverview(
        clientId,
        params
      ),

    enabled:
      Boolean(
        clientId
      ),

    staleTime:
      CACHE.SHORT,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// CREATE
// ======================================================

export const useCreateTask =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        data
      ) =>
        taskApi.create(
          data
        ),

      onSuccess: (
        _,
        variables
      ) => {
        invalidateTaskLists(
          queryClient
        );

        invalidateClientTasks(
          queryClient,
          variables
            ?.client_id
        );

        invalidateCaseTasks(
          queryClient,
          variables
            ?.case_id
        );

        invalidateConsultationTasks(
          queryClient,
          variables
            ?.consultation_id
        );

        invalidateTaskStatistics(
          queryClient
        );

        invalidateTaskCrossViews(
          queryClient
        );

        success(
          'Görev başarıyla oluşturuldu'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Görev oluşturulamadı'
        );
      },
    });
  };

// ======================================================
// UPDATE
// ======================================================

export const useUpdateTask =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          data,
        }) =>
          taskApi.update(
            id,
            data
          ),

      onSuccess: (
        response,
        variables
      ) => {
        invalidateConsultationTaskViews(
          queryClient,
          {
            taskIds: [
              variables?.id,
            ],
            sources: [
              response,
              variables?.data,
            ],
            consultationIds: [
              variables?.data
                ?.consultation_id,
            ],
          }
        );

        invalidateTaskLists(
          queryClient
        );

        invalidateTask(
          queryClient,
          variables.id
        );

        invalidateClientTasks(
          queryClient,
          variables
            ?.data
            ?.client_id
        );

        invalidateCaseTasks(
          queryClient,
          variables
            ?.data
            ?.case_id
        );

        invalidateTaskStatistics(
          queryClient
        );

        invalidateTaskCrossViews(
          queryClient
        );

        success(
          'Görev başarıyla güncellendi'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Görev güncellenemedi'
        );
      },
    });
  };

// ======================================================
// DELETE
// ======================================================

export const useDeleteTask =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        id
      ) =>
        taskApi.delete(
          id
        ),

      onSuccess: (
        response,
        id
      ) => {
        invalidateConsultationTaskViews(
          queryClient,
          {
            taskIds: [
              id,
            ],
            sources: [
              response,
            ],
          }
        );

        invalidateTaskLists(
          queryClient
        );

        invalidateClientTasks(
          queryClient
        );

        queryClient.removeQueries({
          queryKey:
            TASK_QUERY_KEYS.detail(
              id
            ),
          exact: true,
        });

        invalidateTaskStatistics(
          queryClient
        );

        invalidateTaskCrossViews(
          queryClient
        );

        success(
          'Görev başarıyla silindi'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Görev silinemedi'
        );
      },
    });
  };

// ======================================================
// STATUS
// ======================================================

export const useUpdateTaskStatus =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          status,
        }) =>
          taskApi.updateStatus(
            id,
            status
          ),

      onSuccess: (
        response,
        variables
      ) => {
        invalidateConsultationTaskViews(
          queryClient,
          {
            taskIds: [
              variables?.id,
            ],
            sources: [
              response,
            ],
          }
        );

        invalidateTaskLists(
          queryClient
        );

        invalidateTask(
          queryClient,
          variables.id
        );

        invalidateClientTasks(
          queryClient
        );

        invalidateTaskStatistics(
          queryClient
        );

        invalidateTaskCrossViews(
          queryClient
        );

        success(
          'Görev durumu güncellendi'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Durum güncellenemedi'
        );
      },
    });
  };

// ======================================================
// ASSIGN MULTIPLE USERS
// ======================================================

export const useAssignTask =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          assignee_ids,
        }) =>
          taskApi.assignTask(
            id,
            assignee_ids
          ),

      onSuccess: (
        response,
        variables
      ) => {
        invalidateConsultationTaskViews(
          queryClient,
          {
            taskIds: [
              variables?.id,
            ],
            sources: [
              response,
            ],
          }
        );

        invalidateTaskLists(
          queryClient
        );

        invalidateTask(
          queryClient,
          variables.id
        );

        invalidateClientTasks(
          queryClient
        );

        /*
         * Atama değiştiğinde kullanıcının:
         *
         * - benim görevlerim
         * - geciken görevler
         * - yaklaşan görevler
         * - görev istatistikleri
         *
         * değerleri değişebilir.
         */
        invalidateTaskStatistics(
          queryClient
        );

        invalidateTaskCrossViews(
          queryClient
        );

        success(
          'Görev sorumluları başarıyla güncellendi'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Görev sorumluları güncellenemedi'
        );
      },
    });
  };

// ======================================================
// START
// ======================================================

export const useStartTask =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        id
      ) =>
        taskApi.startTask(
          id
        ),

      onSuccess: (
        response,
        id
      ) => {
        invalidateConsultationTaskViews(
          queryClient,
          {
            taskIds: [
              id,
            ],
            sources: [
              response,
            ],
          }
        );

        invalidateTaskLists(
          queryClient
        );

        invalidateTask(
          queryClient,
          id
        );

        invalidateTaskNotes(
          queryClient,
          id
        );

        invalidateClientTasks(
          queryClient
        );

        invalidateTaskStatistics(
          queryClient
        );

        invalidateTaskCrossViews(
          queryClient
        );

        success(
          'Görev başlatıldı'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Görev başlatılamadı'
        );
      },
    });
  };

// ======================================================
// COMPLETE
// ======================================================

export const useCompleteTask =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          note,
          actual_hours,
        }) =>
          taskApi.completeTask(
            id,
            {
              note,
              actual_hours,
            }
          ),

      onSuccess: (
        response,
        variables
      ) => {
        invalidateConsultationTaskViews(
          queryClient,
          {
            taskIds: [
              variables?.id,
            ],
            sources: [
              response,
            ],
          }
        );

        invalidateTaskLists(
          queryClient
        );

        invalidateTask(
          queryClient,
          variables.id
        );

        invalidateTaskNotes(
          queryClient,
          variables.id
        );

        invalidateClientTasks(
          queryClient
        );

        invalidateTaskStatistics(
          queryClient
        );

        invalidateTaskCrossViews(
          queryClient
        );

        success(
          'Görev tamamlandı. Onay bekleniyor.'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Görev tamamlanamadı'
        );
      },
    });
  };

// ======================================================
// APPROVE
// ======================================================

export const useApproveTask =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        id
      ) =>
        taskApi.approveTask(
          id
        ),

      onSuccess: (
        response,
        id
      ) => {
        invalidateConsultationTaskViews(
          queryClient,
          {
            taskIds: [
              id,
            ],
            sources: [
              response,
            ],
          }
        );

        invalidateTaskLists(
          queryClient
        );

        invalidateTask(
          queryClient,
          id
        );

        invalidateTaskNotes(
          queryClient,
          id
        );

        invalidateClientTasks(
          queryClient
        );

        invalidateTaskStatistics(
          queryClient
        );

        invalidateTaskCrossViews(
          queryClient
        );

        success(
          'Görev onaylandı'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Görev onaylanamadı'
        );
      },
    });
  };

// ======================================================
// NOTES
// ======================================================

export const useAddNote =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          content,
        }) =>
          taskApi.addNote(
            id,
            content
          ),

      onSuccess: (
        _,
        variables
      ) => {
        invalidateTaskNotes(
          queryClient,
          variables.id
        );

        invalidateTask(
          queryClient,
          variables.id
        );

        success(
          'Not eklendi'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Not eklenemedi'
        );
      },
    });
  };

// ======================================================
// PROGRESS
// ======================================================

export const useUpdateProgress =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          progress,
        }) =>
          taskApi.updateProgress(
            id,
            progress
          ),

      onSuccess: (
        response,
        variables
      ) => {
        invalidateConsultationTaskViews(
          queryClient,
          {
            taskIds: [
              variables?.id,
            ],
            sources: [
              response,
            ],
          }
        );

        invalidateTask(
          queryClient,
          variables.id
        );

        invalidateTaskLists(
          queryClient
        );

        invalidateClientTasks(
          queryClient
        );

        invalidateTaskStatistics(
          queryClient
        );

        invalidateTaskCrossViews(
          queryClient
        );

        success(
          'İlerleme güncellendi'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'İlerleme güncellenemedi'
        );
      },
    });
  };

// ======================================================
// BULK STATUS
// ======================================================

export const useBulkUpdateTaskStatus =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          ids,
          status,
        }) =>
          Promise.allSettled(
            ids.map(
              (
                id
              ) =>
                taskApi.updateStatus(
                  id,
                  status
                )
            )
          ),

      onSuccess: (
        results,
        variables
      ) => {
        invalidateConsultationTaskViews(
          queryClient,
          {
            taskIds:
              variables?.ids ||
              [],
            sources:
              results
                .filter(
                  (result) =>
                    result.status ===
                    'fulfilled'
                )
                .map(
                  (result) =>
                    result.value
                ),
          }
        );

        invalidateTaskLists(
          queryClient
        );

        invalidateClientTasks(
          queryClient
        );

        invalidateTaskStatistics(
          queryClient
        );

        invalidateTaskCrossViews(
          queryClient
        );

        const successful =
          results.filter(
            (
              result
            ) =>
              result.status ===
              'fulfilled'
          ).length;

        const failed =
          results.length -
          successful;

        if (
          failed === 0
        ) {
          success(
            `${successful} görevin durumu güncellendi`
          );

          return;
        }

        if (
          successful >
          0
        ) {
          toast(
            `${successful} görev güncellendi, ${failed} görev güncellenemedi`,
            {
              icon:
                '⚠️',
            }
          );

          return;
        }

        toast.error(
          'Toplu güncelleme başarısız'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Toplu güncelleme başarısız'
        );
      },
    });
  };

// ======================================================
// INFINITE QUERY
// ======================================================

export const useInfiniteTasks = (
  params = {}
) => {
  return useInfiniteQuery({
    queryKey:
      TASK_QUERY_KEYS.infinite(
        params
      ),

    queryFn: ({
      pageParam = 1,
    }) =>
      taskApi.getAll({
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
        lastPage?.data
          ?.pagination;

      if (
        !pagination
      ) {
        return undefined;
      }

      return pagination.page <
        pagination.totalPages
        ? pagination.page +
            1
        : undefined;
    },

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// PREFETCH
// ======================================================

export const prefetchTask = (
  queryClient,
  id
) => {
  return queryClient.prefetchQuery({
    queryKey:
      TASK_QUERY_KEYS.detail(
        id
      ),

    queryFn: () =>
      taskApi.getOne(
        id
      ),

    staleTime:
      CACHE.NORMAL,
  });
};

export const prefetchTasks = (
  queryClient,
  params = {}
) => {
  return queryClient.prefetchQuery({
    queryKey:
      TASK_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      taskApi.getAll(
        params
      ),

    staleTime:
      CACHE.NORMAL,
  });
};

// ======================================================
// SEARCH
// ======================================================

export const useSearchTasks = (
  query,
  params = {}
) => {
  const normalizedQuery =
    typeof query ===
    'string'
      ? query.trim()
      : '';

  return useQuery({
    queryKey:
      TASK_QUERY_KEYS.search(
        normalizedQuery,
        params
      ),

    queryFn: () =>
      taskApi.getAll({
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
  useTasks,
  useTask,

  useMyTasks,
  useMyOverdueTasks,
  useMyUpcomingTasks,

  useTaskStatistics,
  useAssignableUsers,
  useTaskNotes,

  useClientTasks,
  useClientTaskOverview,

  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useUpdateTaskStatus,
  useAssignTask,

  useStartTask,
  useCompleteTask,
  useApproveTask,

  useAddNote,
  useUpdateProgress,
  useBulkUpdateTaskStatus,

  useInfiniteTasks,
  useSearchTasks,

  prefetchTask,
  prefetchTasks,
};