import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import meetingApi from './meeting.api.js';

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

const getMeetingRelationIds = (
  source
) => {
  const item =
    getResponseItem(
      source
    );

  return {
    clientId:
      normalizeId(
        item?.client_id ??
        item?.client?.id
      ),

    caseId:
      normalizeId(
        item?.case_id ??
        item?.case?.id
      ),

    consultationId:
      normalizeId(
        item?.consultation_id ??
        item?.consultation?.id
      ),
  };
};

const getExistingMeetingRelations =
  async (
    queryClient,
    id
  ) => {
    const cached =
      queryClient.getQueryData(
        MEETING_QUERY_KEYS.detail(
          id
        )
      );

    if (cached) {
      return getMeetingRelationIds(
        cached
      );
    }

    try {
      const response =
        await meetingApi.getOne(
          id
        );

      return getMeetingRelationIds(
        response
      );
    } catch {
      /*
       * Eski ilişki okunamazsa mutation'ı engellemiyoruz.
       * Yeni ilişki yine onSuccess içinde invalidate edilir.
       */
      return {
        clientId:
          '',
        caseId:
          '',
        consultationId:
          '',
      };
    }
  };

const invalidateMeetingRelations =
  async (
    queryClient,
    {
      clientIds = [],
      caseIds = [],
      consultationIds = [],
    } = {}
  ) => {
    const normalizedClientIds = [
      ...new Set(
        clientIds
          .map(
            normalizeId
          )
          .filter(
            Boolean
          )
      ),
    ];

    const normalizedCaseIds = [
      ...new Set(
        caseIds
          .map(
            normalizeId
          )
          .filter(
            Boolean
          )
      ),
    ];

    const normalizedConsultationIds = [
      ...new Set(
        consultationIds
          .map(
            normalizeId
          )
          .filter(
            Boolean
          )
      ),
    ];

    const invalidations =
      [];

    normalizedClientIds.forEach(
      (
        clientId
      ) => {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              'client-meetings',
              clientId,
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'client-meeting-timeline',
              clientId,
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'client',
              clientId,
            ],
          })
        );
      }
    );

    normalizedCaseIds.forEach(
      (
        caseId
      ) => {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              'case-meetings',
              caseId,
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'case',
              caseId,
            ],
          })
        );
      }
    );

    normalizedConsultationIds.forEach(
      (
        consultationId
      ) => {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              'consultation-meetings',
              consultationId,
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'consultation',
              consultationId,
            ],
          })
        );
      }
    );

    await Promise.all(
      invalidations
    );
  };

// ======================================================
// QUERY KEYS
// ======================================================

export const MEETING_QUERY_KEYS = {
  all: [
    'meetings',
  ],

  list: (
    params = {}
  ) => [
    'meetings',
    params,
  ],

  detail: (
    id
  ) => [
    'meeting',
    id,
  ],

  my: (
    params = {}
  ) => [
    'my-meetings',
    params,
  ],

  upcoming: (
    params = {}
  ) => [
    'upcoming-meetings',
    params,
  ],

  byCase: (
    caseId,
    params = {}
  ) => [
    'case-meetings',
    caseId,
    params,
  ],

  byClient: (
    clientId,
    params = {}
  ) => [
    'client-meetings',
    clientId,
    params,
  ],

  clientTimeline: (
    clientId,
    params = {}
  ) => [
    'client-meeting-timeline',
    clientId,
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

  GC:
    10 * 60 * 1000,
};

// ======================================================
// QUERIES
// ======================================================

export const useMeetings = (
  params = {}
) => {
  return useQuery({
    queryKey:
      MEETING_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      meetingApi.getAll(
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

export const useMeeting = (
  id
) => {
  return useQuery({
    queryKey:
      MEETING_QUERY_KEYS.detail(
        id
      ),

    queryFn: () =>
      meetingApi.getOne(
        id
      ),

    enabled:
      Boolean(id),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

export const useMyMeetings = (
  params = {}
) => {
  return useQuery({
    queryKey:
      MEETING_QUERY_KEYS.my(
        params
      ),

    queryFn: () =>
      meetingApi.getMyMeetings(
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

export const useUpcomingMeetings = (
  params = {}
) => {
  return useQuery({
    queryKey:
      MEETING_QUERY_KEYS.upcoming(
        params
      ),

    queryFn: () =>
      meetingApi.getUpcoming(
        params
      ),

    staleTime:
      CACHE.SHORT,

    gcTime:
      CACHE.GC,
  });
};

export const useCaseMeetings = (
  caseId,
  params = {}
) => {
  return useQuery({
    queryKey:
      MEETING_QUERY_KEYS.byCase(
        caseId,
        params
      ),

    queryFn: () =>
      meetingApi.getByCase(
        caseId,
        params
      ),

    enabled:
      Boolean(
        caseId
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

export const useClientMeetings = (
  clientId,
  params = {}
) => {
  return useQuery({
    queryKey:
      MEETING_QUERY_KEYS.byClient(
        clientId,
        params
      ),

    queryFn: () =>
      meetingApi.getByClient(
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
// CLIENT COCKPIT TIMELINE
// ======================================================

export const useClientMeetingTimeline = (
  clientId,
  params = {
    upcoming_limit: 5,
    recent_limit: 5,
  }
) => {
  return useQuery({
    queryKey:
      MEETING_QUERY_KEYS.clientTimeline(
        clientId,
        params
      ),

    queryFn: () =>
      meetingApi.getClientTimeline(
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

export const useCreateMeeting =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        data
      ) =>
        meetingApi.create(
          data
        ),

      onSuccess: async (
        response,
        variables
      ) => {
        const responseRelations =
          getMeetingRelationIds(
            response
          );

        const clientId =
          normalizeId(
            responseRelations.clientId ||
            variables?.client_id
          );

        const caseId =
          normalizeId(
            responseRelations.caseId ||
            variables?.case_id
          );

        const consultationId =
          normalizeId(
            responseRelations.consultationId ||
            variables?.consultation_id
          );

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              MEETING_QUERY_KEYS.all,
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'my-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'upcoming-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'calendar-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-monthly-meetings',
            ],
          }),

          invalidateMeetingRelations(
            queryClient,
            {
              clientIds: [
                clientId,
              ],

              caseIds: [
                caseId,
              ],

              consultationIds: [
                consultationId,
              ],
            }
          ),
        ]);

        toast.success(
          'Toplantı başarıyla oluşturuldu'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          error?.response
            ?.data?.message ||
            'Toplantı oluşturulamadı'
        );
      },
    });
  };

// ======================================================
// UPDATE
// ======================================================

export const useUpdateMeeting =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          data,
        }) =>
          meetingApi.update(
            id,
            data
          ),

      onMutate: async (
        variables
      ) => {
        const id =
          normalizeId(
            variables?.id
          );

        if (!id) {
          return {
            oldClientId:
              '',
            oldCaseId:
              '',
            oldConsultationId:
              '',
          };
        }

        await queryClient.cancelQueries({
          queryKey:
            MEETING_QUERY_KEYS.detail(
              id
            ),
          exact:
            true,
        });

        const {
          clientId,
          caseId,
          consultationId,
        } =
          await getExistingMeetingRelations(
            queryClient,
            id
          );

        return {
          oldClientId:
            clientId,
          oldCaseId:
            caseId,
          oldConsultationId:
            consultationId,
        };
      },

      onSuccess: async (
        response,
        variables,
        context
      ) => {
        const id =
          normalizeId(
            variables?.id
          );

        const responseRelations =
          getMeetingRelationIds(
            response
          );

        const newClientId =
          normalizeId(
            responseRelations.clientId ||
            variables?.data?.client_id
          );

        const newCaseId =
          normalizeId(
            responseRelations.caseId ||
            variables?.data?.case_id
          );

        const newConsultationId =
          normalizeId(
            responseRelations.consultationId ||
            variables?.data?.consultation_id
          );

        const oldClientId =
          normalizeId(
            context?.oldClientId
          );

        const oldCaseId =
          normalizeId(
            context?.oldCaseId
          );

        const oldConsultationId =
          normalizeId(
            context?.oldConsultationId
          );

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              MEETING_QUERY_KEYS.all,
          }),

          queryClient.invalidateQueries({
            queryKey:
              MEETING_QUERY_KEYS.detail(
                id
              ),
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'my-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'upcoming-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'calendar-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-monthly-meetings',
            ],
          }),

          invalidateMeetingRelations(
            queryClient,
            {
              clientIds: [
                oldClientId,
                newClientId,
              ],

              caseIds: [
                oldCaseId,
                newCaseId,
              ],

              consultationIds: [
                oldConsultationId,
                newConsultationId,
              ],
            }
          ),
        ]);

        toast.success(
          'Toplantı güncellendi'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          error?.response
            ?.data?.message ||
          error?.message ||
          'Toplantı güncellenemedi'
        );
      },
    });
  };

// ======================================================
// STATUS
// ======================================================

export const useUpdateMeetingStatus =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          status,
        }) =>
          meetingApi.updateStatus(
            id,
            status
          ),

      onMutate: async (
        variables
      ) => {
        const id =
          normalizeId(
            variables?.id
          );

        if (!id) {
          return {
            clientId:
              '',
            caseId:
              '',
            consultationId:
              '',
          };
        }

        await queryClient.cancelQueries({
          queryKey:
            MEETING_QUERY_KEYS.detail(
              id
            ),
          exact:
            true,
        });

        return getExistingMeetingRelations(
          queryClient,
          id
        );
      },

      onSuccess: async (
        _response,
        variables,
        context
      ) => {
        const id =
          normalizeId(
            variables?.id
          );

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              MEETING_QUERY_KEYS.all,
          }),

          queryClient.invalidateQueries({
            queryKey:
              MEETING_QUERY_KEYS.detail(
                id
              ),
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'my-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'upcoming-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'calendar-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-monthly-meetings',
            ],
          }),

          invalidateMeetingRelations(
            queryClient,
            {
              clientIds: [
                context?.clientId,
              ],

              caseIds: [
                context?.caseId,
              ],

              consultationIds: [
                context?.consultationId,
              ],
            }
          ),
        ]);

        toast.success(
          'Toplantı durumu güncellendi'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          error?.response
            ?.data?.message ||
          error?.message ||
          'Toplantı durumu güncellenemedi'
        );
      },
    });
  };

// ======================================================
// DELETE
// ======================================================

export const useDeleteMeeting =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        id
      ) =>
        meetingApi.delete(
          id
        ),

      onMutate: async (
        rawId
      ) => {
        const id =
          normalizeId(
            rawId
          );

        if (!id) {
          return {
            clientId:
              '',
            caseId:
              '',
            consultationId:
              '',
          };
        }

        await queryClient.cancelQueries({
          queryKey:
            MEETING_QUERY_KEYS.detail(
              id
            ),
          exact:
            true,
        });

        return getExistingMeetingRelations(
          queryClient,
          id
        );
      },

      onSuccess: async (
        _response,
        rawId,
        context
      ) => {
        const id =
          normalizeId(
            rawId
          );

        queryClient.removeQueries({
          queryKey:
            MEETING_QUERY_KEYS.detail(
              id
            ),
          exact:
            true,
        });

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              MEETING_QUERY_KEYS.all,
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'my-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'upcoming-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'calendar-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-monthly-meetings',
            ],
          }),

          invalidateMeetingRelations(
            queryClient,
            {
              clientIds: [
                context?.clientId,
              ],

              caseIds: [
                context?.caseId,
              ],

              consultationIds: [
                context?.consultationId,
              ],
            }
          ),
        ]);

        toast.success(
          'Toplantı kaldırıldı'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          error?.response
            ?.data?.message ||
            'Toplantı kaldırılamadı'
        );
      },
    });
  };

// ======================================================
// PREFETCH
// ======================================================

export const prefetchMeeting = (
  queryClient,
  id
) => {
  return queryClient.prefetchQuery({
    queryKey:
      MEETING_QUERY_KEYS.detail(
        id
      ),

    queryFn: () =>
      meetingApi.getOne(
        id
      ),

    staleTime:
      CACHE.NORMAL,
  });
};