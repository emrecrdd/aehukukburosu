import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  useCreateMeeting,
} from '../../features/meetings/meeting.query.js';
import caseApi from '../../features/cases/case.api.js';
import clientApi from '../../features/clients/client.api.js';
import consultationApi from '../../features/consultations/consultation.api.js';
import userApi from '../../features/users/user.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  AlertTriangle,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  Link2,
  MapPin,
  Plus,
  Save,
  UserRound,
  Users,
  Video,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const MAX_TITLE_LENGTH =
  255;

const MAX_DESCRIPTION_LENGTH =
  5000;

const MAX_LOCATION_LENGTH =
  500;

const MAX_NOTES_LENGTH =
  5000;

const MAX_ATTENDEE_NAME_LENGTH =
  200;

const MAX_ATTENDEE_ROLE_LENGTH =
  150;

const INITIAL_FORM = {
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  location: '',
  meeting_type: 'other',
  case_id: '',
  client_id: '',
  consultation_id: '',

  /*
   * Derkenar iç kullanıcı katılımcıları.
   *
   * meetings.attendees JSONB alanından ayrıdır:
   * - attendee_ids: sistem kullanıcıları
   * - attendees: harici / serbest katılımcılar
   */
  attendee_ids: [],

  status: 'scheduled',
  attendees: [],
  meeting_link: '',
  notes: '',
};

const MEETING_TYPE_OPTIONS = [
  {
    value: 'client',
    label: 'Müvekkil Görüşmesi',
  },
  {
    value: 'internal',
    label: 'İç Toplantı',
  },
  {
    value: 'phone',
    label: 'Telefon Görüşmesi',
  },
  {
    value: 'other',
    label: 'Diğer',
  },
];

const STATUS_OPTIONS = [
  {
    value: 'scheduled',
    label: 'Planlandı',
  },
  {
    value: 'ongoing',
    label: 'Devam Ediyor',
  },
  {
    value: 'completed',
    label: 'Tamamlandı',
  },
  {
    value: 'cancelled',
    label: 'İptal',
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

    if (
      Array.isArray(
        candidate?.cases
      )
    ) {
      return candidate.cases;
    }
  }

  return [];
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

const normalizeText = (
  value
) => {
  return String(
    value ?? ''
  ).trim();
};

const normalizeAttendees = (
  attendees
) => {
  if (
    !Array.isArray(
      attendees
    )
  ) {
    return [];
  }

  return attendees
    .map(
      (
        attendee
      ) => ({
        name:
          normalizeText(
            attendee?.name
          ),
        role:
          normalizeText(
            attendee?.role
          ) ||
          'Katılımcı',
      })
    )
    .filter(
      (
        attendee
      ) =>
        Boolean(
          attendee.name
        )
    );
};

const normalizeMeetingForm = (
  form
) => ({
  title:
    normalizeText(
      form?.title
    ),

  description:
    normalizeText(
      form?.description
    ),

  start_date:
    form?.start_date ||
    '',

  end_date:
    form?.end_date ||
    '',

  location:
    normalizeText(
      form?.location
    ),

  meeting_type:
    form?.meeting_type ||
    'other',

  case_id:
    normalizeId(
      form?.case_id
    ),

  client_id:
    normalizeId(
      form?.client_id
    ),

  consultation_id:
    normalizeId(
      form?.consultation_id
    ),

  attendee_ids:
    [
      ...new Set(
        Array.isArray(
          form?.attendee_ids
        )
          ? form.attendee_ids
              .map(
                (id) =>
                  normalizeId(
                    id
                  )
              )
              .filter(Boolean)
          : []
      ),
    ].sort(),

  status:
    form?.status ||
    'scheduled',

  attendees:
    normalizeAttendees(
      form?.attendees
    ),

  meeting_link:
    normalizeText(
      form?.meeting_link
    ),

  notes:
    normalizeText(
      form?.notes
    ),
});

const isLikelyTechnicalMessage = (
  value
) => {
  const message =
    normalizeText(
      value
    );

  if (!message) {
    return false;
  }

  return /(?:validation failed|validation error|sequelize|constraint|foreign key|unique constraint|duplicate key|invalid input syntax|syntax error|stack trace|internal server error|network error|failed to fetch|econn|socket|timeout|request failed with status code|cannot read propert|undefined is not|null value in column|not-null violation|2350\d|22p02)/i.test(
    message
  );
};

const getMeetingFieldErrorMessage = (
  field,
  rawMessage
) => {
  const message =
    normalizeText(
      rawMessage
    );

  if (
    message &&
    !isLikelyTechnicalMessage(
      message
    )
  ) {
    return message;
  }

  const fallbacks = {
    title:
      'Toplantı başlığını kontrol edin',
    description:
      'Açıklamayı kontrol edin',
    start_date:
      'Başlangıç tarihini kontrol edin',
    end_date:
      'Bitiş tarihini kontrol edin',
    location:
      'Toplantı yerini kontrol edin',
    meeting_type:
      'Toplantı türünü kontrol edin',
    case_id:
      'İlişkili dava seçimini kontrol edin',
    client_id:
      'İlişkili müvekkil seçimini kontrol edin',
    consultation_id:
      'İlişkili danışmanlık seçimini kontrol edin',
    attendee_ids:
      'Toplantı katılımcılarını kontrol edin',
    status:
      'Toplantı durumunu kontrol edin',
    attendees:
      'Katılımcı bilgilerini kontrol edin',
    meeting_link:
      'Toplantı bağlantısını kontrol edin',
    notes:
      'Notları kontrol edin',
  };

  return (
    fallbacks[field] ||
    'Bu alanı kontrol edin'
  );
};

const getBackendFieldErrors = (
  error
) => {
  const source =
    error?.response?.data?.errors ??
    error?.response?.data?.validation_errors ??
    null;

  if (!source) {
    return {};
  }

  const result =
    {};

  const setFieldError =
    (
      rawField,
      rawMessage
    ) => {
      const fieldValue =
        Array.isArray(
          rawField
        )
          ? rawField[
              rawField.length - 1
            ]
          : String(
              rawField ||
              ''
            )
              .split('.')
              .filter(Boolean)
              .pop();

      const normalizedField =
        fieldValue ===
        'assigned_to'
          ? 'attendee_ids'
          : fieldValue;

      if (
        !normalizedField ||
        !Object.prototype
          .hasOwnProperty.call(
            INITIAL_FORM,
            normalizedField
          )
      ) {
        return;
      }

      result[normalizedField] =
        getMeetingFieldErrorMessage(
          normalizedField,
          rawMessage
        );
    };

  if (
    Array.isArray(
      source
    )
  ) {
    source.forEach(
      (
        item
      ) => {
        setFieldError(
          item?.path ??
          item?.param ??
          item?.field,
          item?.msg ??
          item?.message
        );
      }
    );

    return result;
  }

  if (
    typeof source ===
    'object'
  ) {
    Object.entries(
      source
    ).forEach(
      ([
        field,
        value,
      ]) => {
        const message =
          Array.isArray(
            value
          )
            ? value
                .filter(Boolean)
                .join(', ')
            : value;

        setFieldError(
          field,
          message
        );
      }
    );
  }

  return result;
};

const isAllowedOption = (
  options,
  value
) => {
  return options.some(
    (option) =>
      option.value ===
      value
  );
};

const getRoleLabel = (
  role
) => {
  const labels = {
    admin: 'Yönetici',
    lawyer: 'Avukat',
    intern: 'Stajyer',
    secretary: 'Sekreter',
  };

  return (
    labels[role] ||
    role ||
    'Kullanıcı'
  );
};

const getMeetingTypeLabel = (
  type
) => {
  return (
    MEETING_TYPE_OPTIONS.find(
      (option) =>
        option.value ===
        type
    )?.label ||
    'Diğer'
  );
};

const getStatusVariant = (
  status
) => {
  const variants = {
    scheduled: 'warning',
    ongoing: 'info',
    completed: 'success',
    cancelled: 'danger',
  };

  return (
    variants[status] ||
    'default'
  );
};

const getStatusLabel = (
  status
) => {
  return (
    STATUS_OPTIONS.find(
      (option) =>
        option.value ===
        status
    )?.label ||
    status
  );
};

/*
 * datetime-local kullanıcının ekranda
 * Türkiye saatiyle girdiği değeri temsil ediyor.
 *
 * Backend'e ISO UTC gönderiyoruz.
 *
 * Örn:
 * 2026-08-17T14:30
 * ->
 * 2026-08-17T11:30:00.000Z
 */
const localToUTC = (
  dateTime
) => {
  if (!dateTime) {
    return null;
  }

  try {
    const normalized =
      dateTime.length === 16
        ? `${dateTime}:00`
        : dateTime;

    const date =
      new Date(
        `${normalized}+03:00`
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date.toISOString();
  } catch {
    return null;
  }
};

const isValidHttpUrl = (
  value
) => {
  if (!value) {
    return true;
  }

  try {
    const url =
      new URL(value);

    return [
      'http:',
      'https:',
    ].includes(
      url.protocol
    );
  } catch {
    return false;
  }
};

const getCaseDisplayName = (
  caseItem
) => {
  if (!caseItem) {
    return 'Dava';
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
    'Dava'
  );
};

const getCaseSecondaryInfo = (
  caseItem
) => {
  if (!caseItem) {
    return '';
  }

  return [
    caseItem.judiciary_type,
    caseItem.judiciary_unit,
  ]
    .filter(Boolean)
    .join(' · ');
};

// ======================================================
// COMPONENT
// ======================================================

const MeetingCreate = () => {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] =
    useSearchParams();

  /*
   * ClientDetail şu URL ile gelir:
   *   /meetings/create?client_id=<id>
   *
   * Eski ekran query parametresini hiç okumuyordu.
   * Geriye dönük uyumluluk için client/clientId ve case/caseId
   * alias'larını da kabul ediyoruz.
   */
  const requestedClientId =
    normalizeId(
      searchParams.get(
        'client_id'
      ) ??
      searchParams.get(
        'client'
      ) ??
      searchParams.get(
        'clientId'
      )
    );

  const requestedCaseId =
    normalizeId(
      searchParams.get(
        'case_id'
      ) ??
      searchParams.get(
        'case'
      ) ??
      searchParams.get(
        'caseId'
      )
    );

  const requestedConsultationId =
    normalizeId(
      searchParams.get(
        'consultation_id'
      ) ??
      searchParams.get(
        'consultation'
      ) ??
      searchParams.get(
        'consultationId'
      )
    );

  const {
    user,
  } =
    useAuth();

  const canViewConsultations =
    hasPermission(
      user,
      PERMISSION_KEYS
        .VIEW_CONSULTATIONS
    );

  const prefillAppliedRef =
    useRef(false);

  const initialFormRef =
    useRef({
      ...INITIAL_FORM,

      client_id:
        requestedClientId,

      case_id:
        requestedCaseId,

      consultation_id:
        requestedConsultationId,
    });

  const [
    formData,
    setFormData,
  ] =
    useState(
      () => ({
        ...INITIAL_FORM,

        client_id:
          requestedClientId,

        case_id:
          requestedCaseId,

        consultation_id:
          requestedConsultationId,
      })
    );

  const [
    attendeeName,
    setAttendeeName,
  ] =
    useState('');

  const [
    attendeeRole,
    setAttendeeRole,
  ] =
    useState('');

  const [
    errors,
    setErrors,
  ] =
    useState({});

  const [
    unsavedDialogOpen,
    setUnsavedDialogOpen,
  ] =
    useState(false);

  const [
    pendingExitPath,
    setPendingExitPath,
  ] =
    useState('');

  const [
    relationDialogOpen,
    setRelationDialogOpen,
  ] =
    useState(false);

  const [
    pendingClientId,
    setPendingClientId,
  ] =
    useState('');

  const unsavedDialogRef =
    useRef(null);

  const relationDialogRef =
    useRef(null);

  const previousFocusRef =
    useRef(null);

  // ====================================================
  // QUERIES
  // ====================================================

  const {
    data:
      casesData,
    isLoading:
      casesLoading,
  } =
    useQuery({
      queryKey: [
        'cases',
        {
          limit: 100,
        },
      ],

      queryFn: () =>
        caseApi.getAll({
          limit: 100,
        }),
    });

  const {
    data:
      clientsData,
    isLoading:
      clientsLoading,
    error:
      clientsError,
    refetch:
      refetchClients,
  } =
    useQuery({
      queryKey: [
        'clients',
        {
          limit: 100,
        },
      ],

      queryFn: () =>
        clientApi.getAll({
          limit: 100,
        }),
    });

  const {
    data:
      requestedClientData,
    isLoading:
      requestedClientLoading,
    error:
      requestedClientError,
    refetch:
      refetchRequestedClient,
  } =
    useQuery({
      queryKey: [
        'client',
        requestedClientId,
      ],

      queryFn: () =>
        clientApi.getOne(
          requestedClientId
        ),

      enabled:
        Boolean(
          requestedClientId
        ),

      staleTime:
        0,

      retry:
        false,
    });

  const {
    data:
      clientCasesData,
    isLoading:
      clientCasesLoading,
    error:
      clientCasesError,
    refetch:
      refetchClientCases,
  } =
    useQuery({
      queryKey: [
        'clients',
        formData.client_id,
        'cases',
      ],

      queryFn: () =>
        clientApi.getCaseHistory(
          formData.client_id
        ),

      enabled:
        Boolean(
          formData.client_id
        ),
    });

  const {
    data:
      consultationsData,
    isLoading:
      consultationsLoading,
    error:
      consultationsError,
    refetch:
      refetchConsultations,
  } =
    useQuery({
      queryKey: [
        'consultations',
        {
          limit: 100,
        },
        'meeting-create',
      ],

      queryFn: () =>
        consultationApi.getAll({
          limit: 100,
        }),

      enabled:
        canViewConsultations,

      staleTime:
        60 * 1000,
    });

  const {
    data:
      selectedConsultationData,
    isLoading:
      selectedConsultationLoading,
    error:
      selectedConsultationError,
    refetch:
      refetchSelectedConsultation,
  } =
    useQuery({
      queryKey: [
        'consultation',
        normalizeId(
          formData.consultation_id
        ),
      ],

      queryFn: () =>
        consultationApi.getOne(
          normalizeId(
            formData.consultation_id
          )
        ),

      enabled:
        Boolean(
          canViewConsultations &&
          formData.consultation_id
        ),

      staleTime:
        60 * 1000,

      retry:
        false,
    });

  const {
    data:
      usersData,
    isLoading:
      usersLoading,
    error:
      usersError,
    refetch:
      refetchUsers,
  } =
    useQuery({
      queryKey: [
        'users',
      ],

      queryFn: () =>
        userApi.getAll(),
    });

  // ====================================================
  // DATA
  // ====================================================

  const cases =
    getArrayPayload(
      casesData
    );

  const baseClients =
    getArrayPayload(
      clientsData
    );

  const requestedClient =
    getResponseItem(
      requestedClientData
    );

  const clients =
    useMemo(() => {
      const result = [
        ...baseClients,
      ];

      const requestedId =
        normalizeId(
          requestedClient?.id
        );

      if (
        requestedId &&
        !result.some(
          (client) =>
            normalizeId(
              client?.id
            ) ===
            requestedId
        )
      ) {
        result.unshift(
          requestedClient
        );
      }

      return result;
    }, [
      baseClients,
      requestedClient,
    ]);

  const baseConsultations =
    getArrayPayload(
      consultationsData
    );

  const selectedConsultationDetail =
    getResponseItem(
      selectedConsultationData
    );

  const consultations =
    useMemo(() => {
      const result = [
        ...baseConsultations,
      ];

      const selectedId =
        normalizeId(
          selectedConsultationDetail?.id
        );

      if (
        selectedId &&
        !result.some(
          (
            consultation
          ) =>
            normalizeId(
              consultation?.id
            ) ===
            selectedId
        )
      ) {
        result.unshift(
          selectedConsultationDetail
        );
      }

      return result;
    }, [
      baseConsultations,
      selectedConsultationDetail,
    ]);

  const users =
    getArrayPayload(
      usersData
    );

  const clientCases =
    getArrayPayload(
      clientCasesData
    );

  const relationCases =
    formData.client_id
      ? clientCases
      : cases;

  const relationCasesLoading =
    formData.client_id
      ? clientCasesLoading
      : casesLoading;

  const clientSelectLoading =
    clientsLoading ||
    (
      Boolean(
        requestedClientId
      ) &&
      requestedClientLoading
    );

  const assignableUsers =
    useMemo(() => {
      const normalizedUserId =
        normalizeId(
          user?.id
        );

      if (
        user?.role ===
        'admin'
      ) {
        return users.filter(
          (person) =>
            person?.is_active !==
            false
        );
      }

      const currentUserInList =
        users.find(
          (person) =>
            normalizeId(
              person?.id
            ) ===
            normalizedUserId
        );

      if (
        currentUserInList
      ) {
        return [
          currentUserInList,
        ];
      }

      return normalizedUserId
        ? [
            {
              ...user,
              id:
                normalizedUserId,
            },
          ]
        : [];
    }, [
      users,
      user,
    ]);

  const selectedCase =
    useMemo(() => {
      return relationCases.find(
        (
          item
        ) =>
          normalizeId(
            item?.id
          ) ===
          normalizeId(
            formData.case_id
          )
      );
    }, [
      relationCases,
      formData.case_id,
    ]);

  const selectedClient =
    useMemo(() => {
      return clients.find(
        (
          item
        ) =>
          normalizeId(
            item?.id
          ) ===
          normalizeId(
            formData.client_id
          )
      );
    }, [
      clients,
      formData.client_id,
    ]);

  const selectedConsultation =
    useMemo(() => {
      const selectedId =
        normalizeId(
          formData.consultation_id
        );

      if (
        !selectedId
      ) {
        return null;
      }

      return consultations.find(
        (
          item
        ) =>
          normalizeId(
            item?.id
          ) ===
          selectedId
      ) || null;
    }, [
      consultations,
      formData.consultation_id,
    ]);

  useEffect(() => {
    if (
      prefillAppliedRef.current
    ) {
      return;
    }

    if (
      requestedClientId
    ) {
      if (
        requestedClientLoading
      ) {
        return;
      }

      if (
        requestedClientError ||
        !requestedClient
      ) {
        prefillAppliedRef.current =
          true;

        initialFormRef.current = {
          ...initialFormRef.current,
          client_id:
            '',
          case_id:
            '',
        };

        setFormData(
          (
            current
          ) => ({
            ...current,
            client_id:
              '',
            case_id:
              '',
          })
        );

        toast.error(
          'Bağlantıdaki müvekkil artık erişilebilir değil'
        );

        return;
      }
    }

    if (
      requestedClientId &&
      normalizeId(
        requestedClient?.id
      ) !==
        requestedClientId
    ) {
      return;
    }

    initialFormRef.current = {
      ...initialFormRef.current,

      client_id:
        requestedClientId ||
        initialFormRef.current
          .client_id,

      case_id:
        requestedCaseId ||
        initialFormRef.current
          .case_id,

      consultation_id:
        requestedConsultationId ||
        initialFormRef.current
          .consultation_id,
    };

    setFormData(
      (
        current
      ) => ({
        ...current,

        client_id:
          requestedClientId ||
          current.client_id,

        case_id:
          requestedCaseId ||
          current.case_id,

        consultation_id:
          requestedConsultationId ||
          current.consultation_id,

      })
    );

    prefillAppliedRef.current =
      true;
  }, [
    requestedClientId,
    requestedCaseId,
    requestedConsultationId,
    requestedClient,
    requestedClientLoading,
    requestedClientError,
  ]);

  // ====================================================
  // MUTATION
  // ====================================================

  const createMeeting =
    useCreateMeeting();

  /*
   * Cache invalidation meeting.query.js içinde merkezi olarak yapılıyor.
   * Burada tekrar invalidate/setQueryData yapmıyoruz:
   * - aynı sorguların iki kez refetch edilmesini önler,
   * - create response'u kısmi ise detail cache'inin eksik veriyle
   *   taze kabul edilmesi riskini ortadan kaldırır.
   *
   * Bu component sadece navigation ve backend field-error eşlemesini
   * yönetir.
   */
  const mutation = {
    ...createMeeting,

    mutate: (
      submitData
    ) => {
      if (
        createMeeting.isPending
      ) {
        return;
      }

      createMeeting.mutate(
        submitData,
        {
          onSuccess: (
            response
          ) => {
            const meeting =
              getResponseItem(
                response
              );

            const meetingId =
              normalizeId(
                meeting?.id
              );

            navigate(
              meetingId
                ? `/meetings/${meetingId}`
                : '/meetings'
            );
          },

          onError: (
            error
          ) => {
            const fieldErrors =
              getBackendFieldErrors(
                error
              );

            if (
              Object.keys(
                fieldErrors
              ).length >
              0
            ) {
              setErrors(
                (
                  current
                ) => ({
                  ...current,
                  ...fieldErrors,
                })
              );
            }
          },
        }
      );
    },
  };

  // ====================================================
  // FORM HANDLERS
  // ====================================================

  const applyClientChange =
    (
      nextClientId
    ) => {
      const normalizedClientId =
        normalizeId(
          nextClientId
        );

      setFormData(
        (
          current
        ) => ({
          ...current,

          client_id:
            normalizedClientId,

          case_id:
            '',
        })
      );

      setErrors(
        (
          current
        ) => ({
          ...current,

          client_id:
            '',

          case_id:
            '',
        })
      );
    };

  const handleChange =
    (
      event
    ) => {
      if (
        mutation.isPending
      ) {
        return;
      }

      const {
        name,
        value,
      } =
        event.target;

      if (
        name ===
        'client_id'
      ) {
        const nextClientId =
          normalizeId(
            value
          );

        const currentClientId =
          normalizeId(
            formData.client_id
          );

        if (
          nextClientId ===
          currentClientId
        ) {
          return;
        }

        if (
          normalizeId(
            formData.case_id
          )
        ) {
          setPendingClientId(
            nextClientId
          );

          setRelationDialogOpen(
            true
          );

          return;
        }

        applyClientChange(
          nextClientId
        );

        return;
      }

      setFormData(
        (
          current
        ) => {
          if (
            name ===
            'client_id'
          ) {
            return {
              ...current,

              client_id:
                normalizeId(
                  value
                ),

              case_id:
                '',
            };
          }

          if (
            name ===
            'case_id' ||
            name ===
            'consultation_id'
          ) {
            return {
              ...current,

              [name]:
                normalizeId(
                  value
                ),
            };
          }

          return {
            ...current,

            [name]:
              value,
          };
        }
      );

      if (
        errors[name]
      ) {
        setErrors(
          (
            current
          ) => ({
            ...current,
            [name]:
              '',
          })
        );
      }
    };

  // ====================================================
  // INTERNAL MEETING PARTICIPANTS
  // ====================================================

  const handleParticipantToggle =
    (
      participantId
    ) => {
      if (
        user?.role !==
          'admin' ||
        mutation.isPending
      ) {
        return;
      }

      const normalizedParticipantId =
        normalizeId(
          participantId
        );

      if (
        !normalizedParticipantId
      ) {
        return;
      }

      setFormData(
        (
          current
        ) => {
          const currentIds =
            Array.isArray(
              current.attendee_ids
            )
              ? current.attendee_ids
                  .map(
                    (id) =>
                      normalizeId(
                        id
                      )
                  )
                  .filter(Boolean)
              : [];

          const exists =
            currentIds.includes(
              normalizedParticipantId
            );

          return {
            ...current,

            attendee_ids:
              exists
                ? currentIds.filter(
                    (id) =>
                      id !==
                      normalizedParticipantId
                  )
                : [
                    ...currentIds,
                    normalizedParticipantId,
                  ],
          };
        }
      );

      if (
        errors.attendee_ids
      ) {
        setErrors(
          (
            current
          ) => ({
            ...current,

            attendee_ids:
              '',
          })
        );
      }
    };

  const handleSelectAllParticipants =
    () => {
      if (
        user?.role !==
          'admin' ||
        mutation.isPending
      ) {
        return;
      }

      const allIds =
        assignableUsers
          .map(
            (person) =>
              normalizeId(
                person?.id
              )
          )
          .filter(Boolean);

      const selectedIds =
        Array.isArray(
          formData.attendee_ids
        )
          ? formData.attendee_ids
              .map(
                (id) =>
                  normalizeId(
                    id
                  )
              )
              .filter(Boolean)
          : [];

      const allSelected =
        allIds.length >
          0 &&
        allIds.every(
          (id) =>
            selectedIds.includes(
              id
            )
        );

      setFormData(
        (
          current
        ) => ({
          ...current,

          attendee_ids:
            allSelected
              ? []
              : allIds,
        })
      );

      if (
        errors.attendee_ids
      ) {
        setErrors(
          (
            current
          ) => ({
            ...current,

            attendee_ids:
              '',
          })
        );
      }
    };

  // ====================================================
  // ATTENDEES
  // ====================================================

  const handleAddAttendee =
    () => {
      if (
        mutation.isPending
      ) {
        return;
      }

      const name =
        attendeeName
          .trim()
          .slice(
            0,
            MAX_ATTENDEE_NAME_LENGTH
          );

      const role =
        attendeeRole
          .trim()
          .slice(
            0,
            MAX_ATTENDEE_ROLE_LENGTH
          );

      if (!name) {
        return;
      }

      const alreadyExists =
        formData.attendees.some(
          (
            attendee
          ) =>
            attendee.name
              ?.trim()
              .toLocaleLowerCase(
                'tr-TR'
              ) ===
            name.toLocaleLowerCase(
              'tr-TR'
            )
        );

      if (
        alreadyExists
      ) {
        toast.error(
          'Bu katılımcı zaten eklenmiş'
        );

        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          attendees: [
            ...current.attendees,

            {
              name,
              role:
                role ||
                'Katılımcı',
            },
          ],
        })
      );

      setAttendeeName(
        ''
      );

      setAttendeeRole(
        ''
      );
    };

  const handleRemoveAttendee =
    (
      index
    ) => {
      if (
        mutation.isPending
      ) {
        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          attendees:
            current.attendees.filter(
              (
                _,
                currentIndex
              ) =>
                currentIndex !==
                index
            ),
        })
      );
    };

  // ====================================================
  // SUBMIT
  // ====================================================

  const handleSubmit =
    (
      event
    ) => {
      event.preventDefault();

      if (
        mutation.isPending
      ) {
        return;
      }

      const newErrors =
        {};

      const title =
        formData.title
          .trim();

      const description =
        formData.description
          ?.trim() ||
        '';

      const location =
        formData.location
          ?.trim() ||
        '';

      const meetingLink =
        formData.meeting_link
          ?.trim() ||
        '';

      const notes =
        formData.notes
          ?.trim() ||
        '';

      const clientId =
        normalizeId(
          formData.client_id
        );

      const caseId =
        normalizeId(
          formData.case_id
        );

      const consultationId =
        normalizeId(
          formData.consultation_id
        );

      if (
        !title
      ) {
        newErrors.title =
          'Toplantı başlığı gereklidir';
      } else if (
        title.length >
        MAX_TITLE_LENGTH
      ) {
        newErrors.title =
          `Toplantı başlığı en fazla ${MAX_TITLE_LENGTH} karakter olabilir`;
      }

      if (
        description.length >
        MAX_DESCRIPTION_LENGTH
      ) {
        newErrors.description =
          `Açıklama en fazla ${MAX_DESCRIPTION_LENGTH} karakter olabilir`;
      }

      if (
        location.length >
        MAX_LOCATION_LENGTH
      ) {
        newErrors.location =
          `Toplantı yeri en fazla ${MAX_LOCATION_LENGTH} karakter olabilir`;
      }

      if (
        notes.length >
        MAX_NOTES_LENGTH
      ) {
        newErrors.notes =
          `Notlar en fazla ${MAX_NOTES_LENGTH} karakter olabilir`;
      }

      if (
        !formData.start_date
      ) {
        newErrors.start_date =
          'Başlangıç tarihi gereklidir';
      }

      if (
        formData.start_date &&
        !localToUTC(
          formData.start_date
        )
      ) {
        newErrors.start_date =
          'Geçerli bir başlangıç tarihi girin';
      }

      if (
        formData.end_date &&
        !localToUTC(
          formData.end_date
        )
      ) {
        newErrors.end_date =
          'Geçerli bir bitiş tarihi girin';
      } else if (
        formData.start_date &&
        formData.end_date &&
        formData.end_date <
          formData.start_date
      ) {
        newErrors.end_date =
          'Bitiş tarihi başlangıç tarihinden önce olamaz';
      }

      if (
        meetingLink &&
        !isValidHttpUrl(
          meetingLink
        )
      ) {
        newErrors.meeting_link =
          'Geçerli bir toplantı bağlantısı girin';
      }

      if (
        !isAllowedOption(
          MEETING_TYPE_OPTIONS,
          formData.meeting_type
        )
      ) {
        newErrors.meeting_type =
          'Geçerli bir toplantı türü seçin';
      }

      if (
        !isAllowedOption(
          STATUS_OPTIONS,
          formData.status
        )
      ) {
        newErrors.status =
          'Geçerli bir toplantı durumu seçin';
      }

      /*
       * Query parametresi veya DOM manipülasyonu ile erişilemeyen bir
       * müvekkil ID'sinin submit edilmesini engeller.
       */
      if (
        clientId
      ) {
        const clientExists =
          clients.some(
            (client) =>
              normalizeId(
                client?.id
              ) ===
              clientId
          );

        if (
          clientsError &&
          !clientExists
        ) {
          newErrors.client_id =
            'Müvekkil listesi yüklenemedi. Listeyi yenileyip tekrar deneyin.';
        } else if (
          !clientExists ||
          requestedClientError
        ) {
          newErrors.client_id =
            'Seçilen müvekkil artık erişilebilir değil';
        }
      }

      if (
        caseId
      ) {
        const caseExists =
          clientId &&
          clientCases.some(
            (caseItem) =>
              normalizeId(
                caseItem?.id
              ) ===
              caseId
          );

        if (
          clientCasesError
        ) {
          newErrors.case_id =
            'Müvekkilin dava listesi yüklenemedi. Listeyi yenileyip tekrar deneyin.';
        } else if (
          !caseExists
        ) {
          newErrors.case_id =
            'Seçilen dava bu müvekkile bağlı değil veya artık erişilebilir değil';
        }
      }

      if (
        consultationId
      ) {
        if (
          !canViewConsultations
        ) {
          newErrors.consultation_id =
            'Danışmanlık görüntüleme yetkiniz olmadan toplantı danışmanlığa bağlanamaz';
        } else if (
          selectedConsultationError
        ) {
          newErrors.consultation_id =
            'Seçilen danışmanlık artık erişilebilir değil';
        } else if (
          !selectedConsultationLoading &&
          !selectedConsultation
        ) {
          newErrors.consultation_id =
            'Seçilen danışmanlık doğrulanamadı';
        }
      }

      const attendeeIds =
        user?.role ===
          'admin'
          ? [
              ...new Set(
                (
                  Array.isArray(
                    formData.attendee_ids
                  )
                    ? formData.attendee_ids
                    : []
                )
                  .map(
                    (id) =>
                      normalizeId(
                        id
                      )
                  )
                  .filter(Boolean)
              ),
            ]
          : normalizeId(
              user?.id
            )
            ? [
                normalizeId(
                  user.id
                ),
              ]
            : [];

      if (
        attendeeIds.length ===
        0
      ) {
        newErrors.attendee_ids =
          user?.role ===
            'admin'
            ? 'Toplantı en az 1 kişiye atanmalıdır'
            : 'Toplantı katılımcısı belirlenemedi. Oturumunuzu yenileyip tekrar deneyin.';
      }

      if (
        user?.role ===
          'admin' &&
        attendeeIds.length >
          0
      ) {
        if (
          usersError
        ) {
          newErrors.attendee_ids =
            'Kullanıcı listesi yüklenemedi. Listeyi yenileyip tekrar deneyin.';
        } else if (
          !usersLoading
        ) {
          const validIds =
            new Set(
              assignableUsers
                .map(
                  (person) =>
                    normalizeId(
                      person?.id
                    )
                )
                .filter(Boolean)
            );

          const hasInvalidParticipant =
            attendeeIds.some(
              (id) =>
                !validIds.has(
                  id
                )
            );

          if (
            hasInvalidParticipant
          ) {
            newErrors.attendee_ids =
              'Seçilen katılımcılardan biri artık atanabilir değil';
          }
        }
      }

      if (
        Object.keys(
          newErrors
        ).length >
        0
      ) {
        setErrors(
          newErrors
        );

        toast.error(
          'Formdaki eksik veya hatalı alanları kontrol edin'
        );

        return;
      }

      const submitData = {
        ...formData,

        title,

        description:
          description ||
          null,

        location:
          location ||
          null,

        meeting_link:
          meetingLink ||
          null,

        notes:
          notes ||
          null,

        start_date:
          localToUTC(
            formData.start_date
          ),

        end_date:
          formData.end_date
            ? localToUTC(
                formData.end_date
              )
            : null,

        case_id:
          caseId ||
          null,

        client_id:
          clientId ||
          null,

        consultation_id:
          consultationId ||
          null,

        attendee_ids:
          attendeeIds,

        attendees:
          formData.attendees
            .map(
              (
                attendee
              ) => ({
                name:
                  String(
                    attendee?.name ??
                    ''
                  )
                    .trim()
                    .slice(
                      0,
                      MAX_ATTENDEE_NAME_LENGTH
                    ),

                role:
                  String(
                    attendee?.role ??
                    'Katılımcı'
                  )
                    .trim()
                    .slice(
                      0,
                      MAX_ATTENDEE_ROLE_LENGTH
                    ) ||
                  'Katılımcı',
              })
            )
            .filter(
              (
                attendee
              ) =>
                Boolean(
                  attendee.name
                )
            ),
      };

      mutation.mutate(
        submitData
      );
    };

  const isDirty =
    useMemo(
      () => {
        const current =
          normalizeMeetingForm(
            formData
          );

        const initial =
          normalizeMeetingForm(
            initialFormRef.current
          );

        return (
          JSON.stringify(
            current
          ) !==
            JSON.stringify(
              initial
            ) ||
          Boolean(
            attendeeName.trim() ||
            attendeeRole.trim()
          )
        );
      },
      [
        formData,
        attendeeName,
        attendeeRole,
      ]
    );

  const cancelDestination =
    requestedConsultationId
      ? `/consultations/${requestedConsultationId}`
      : requestedClientId
        ? `/clients/${requestedClientId}`
        : '/meetings';

  // ====================================================
  // NAVIGATION / DIALOGS
  // ====================================================

  const requestExit =
    (
      path,
      event
    ) => {
      event?.preventDefault?.();

      if (
        mutation.isPending
      ) {
        return;
      }

      if (!isDirty) {
        navigate(
          path
        );

        return;
      }

      setPendingExitPath(
        path
      );

      setUnsavedDialogOpen(
        true
      );
    };

  const closeUnsavedDialog =
    () => {
      setUnsavedDialogOpen(
        false
      );

      setPendingExitPath(
        ''
      );
    };

  const discardAndExit =
    () => {
      const path =
        pendingExitPath ||
        cancelDestination;

      setUnsavedDialogOpen(
        false
      );

      setPendingExitPath(
        ''
      );

      navigate(
        path
      );
    };

  const closeRelationDialog =
    () => {
      setRelationDialogOpen(
        false
      );

      setPendingClientId(
        ''
      );
    };

  const confirmClientChange =
    () => {
      const nextClientId =
        pendingClientId;

      setRelationDialogOpen(
        false
      );

      setPendingClientId(
        ''
      );

      applyClientChange(
        nextClientId
      );
    };

  const focusDialog =
    (
      dialogRef
    ) => {
      const dialog =
        dialogRef.current;

      if (!dialog) {
        return;
      }

      const focusable =
        dialog.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

      (
        focusable[0] ||
        dialog
      )?.focus?.();
    };

  const trapDialogTab =
    (
      event,
      dialogRef
    ) => {
      const dialog =
        dialogRef.current;

      if (
        !dialog ||
        event.key !==
          'Tab'
      ) {
        return;
      }

      const focusable = [
        ...dialog.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
      ];

      if (
        focusable.length ===
        0
      ) {
        event.preventDefault();
        dialog.focus?.();

        return;
      }

      const first =
        focusable[0];

      const last =
        focusable[
          focusable.length - 1
        ];

      if (
        event.shiftKey &&
        document.activeElement ===
          first
      ) {
        event.preventDefault();
        last.focus();

        return;
      }

      if (
        !event.shiftKey &&
        document.activeElement ===
          last
      ) {
        event.preventDefault();
        first.focus();
      }
    };

  useEffect(() => {
    if (
      !isDirty ||
      mutation.isPending
    ) {
      return undefined;
    }

    const handleBeforeUnload =
      (
        event
      ) => {
        event.preventDefault();
        event.returnValue =
          '';
      };

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      );
    };
  }, [
    isDirty,
    mutation.isPending,
  ]);

  useEffect(() => {
    const activeDialogRef =
      unsavedDialogOpen
        ? unsavedDialogRef
        : relationDialogOpen
          ? relationDialogRef
          : null;

    if (
      !activeDialogRef
    ) {
      return undefined;
    }

    previousFocusRef.current =
      document.activeElement;

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      'hidden';

    const frame =
      window.requestAnimationFrame(
        () => {
          focusDialog(
            activeDialogRef
          );
        }
      );

    const handleKeyDown =
      (
        event
      ) => {
        if (
          event.key ===
          'Escape'
        ) {
          event.preventDefault();

          if (
            unsavedDialogOpen
          ) {
            closeUnsavedDialog();
          } else if (
            relationDialogOpen
          ) {
            closeRelationDialog();
          }

          return;
        }

        trapDialogTab(
          event,
          activeDialogRef
        );
      };

    document.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.cancelAnimationFrame(
        frame
      );

      document.removeEventListener(
        'keydown',
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;

      previousFocusRef.current
        ?.focus?.();
    };
  }, [
    unsavedDialogOpen,
    relationDialogOpen,
  ]);

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to={
            cancelDestination
          }
          onClick={(
            event
          ) =>
            requestExit(
              cancelDestination,
              event
            )
          }
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

          {requestedConsultationId
            ? 'Danışmanlık Detayı'
            : requestedClientId
              ? 'Müvekkil Detayı'
              : 'Toplantılar'}
        </Link>

        <div className="mt-3 flex items-start gap-3">

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-emerald-50
              text-emerald-600
              dark:bg-emerald-500/[0.08]
              dark:text-emerald-400
            "
          >
            <Users size={21} />
          </div>

          <div>

            <div className="flex flex-wrap items-center gap-2">

              <h1
                className="
                  text-2xl
                  font-semibold
                  tracking-[-0.035em]
                  text-gray-900
                  dark:text-white
                "
              >
                Yeni Toplantı
              </h1>

              {isDirty && (
                <Badge variant="warning">
                  Kaydedilmemiş değişiklik
                </Badge>
              )}

            </div>

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
              Toplantının zamanını, katılımcılarını ve ilişkili danışmanlık, dava veya müvekkil kayıtlarını belirleyin.
            </p>

          </div>

        </div>

      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
      >

        {/* ==================================================
            BASIC INFO
        ================================================== */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-blue-50
                  text-blue-600
                  dark:bg-blue-500/[0.08]
                  dark:text-blue-400
                "
              >
                <BriefcaseBusiness size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Toplantı Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Başlık, toplantı türü ve açıklama
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <Input
              label="Toplantı Başlığı *"
              name="title"
              value={
                formData.title
              }
              onChange={
                handleChange
              }
              error={
                errors.title
              }
              disabled={
                mutation.isPending
              }
              maxLength={
                MAX_TITLE_LENGTH
              }
              placeholder="Örn: Dava stratejisi değerlendirme toplantısı"
              autoFocus
            />

            <div className="grid gap-4 md:grid-cols-2">

              {/* TYPE */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Toplantı Türü
                </label>

                <select
                  name="meeting_type"
                  value={
                    formData.meeting_type
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    mutation.isPending
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
                    outline-none
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  {MEETING_TYPE_OPTIONS.map(
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

                {errors.meeting_type && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {errors.meeting_type}
                  </p>
                )}

              </div>

              {/* STATUS */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Durum
                </label>

                <select
                  name="status"
                  value={
                    formData.status
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    mutation.isPending
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
                    outline-none
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  {STATUS_OPTIONS.map(
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

                {errors.status && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {errors.status}
                  </p>
                )}

              </div>

            </div>

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Açıklama
              </label>

              <textarea
                name="description"
                value={
                  formData.description
                }
                onChange={
                  handleChange
                }
                disabled={
                  mutation.isPending
                }
                rows={4}
                maxLength={
                  MAX_DESCRIPTION_LENGTH
                }
                placeholder="Gündem, görüşülecek konular veya toplantının amacı..."
                className="
                  w-full
                  resize-y
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  leading-6
                  text-gray-900
                  outline-none
                  placeholder:text-gray-400
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                  dark:placeholder:text-slate-500
                "
              />

              {errors.description && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                  {errors.description}
                </p>
              )}

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            DATE & LOCATION
        ================================================== */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-amber-50
                  text-amber-600
                  dark:bg-amber-500/[0.08]
                  dark:text-amber-400
                "
              >
                <CalendarClock size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Tarih ve Konum
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Toplantının ne zaman ve nerede yapılacağını belirleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label="Başlangıç Tarihi *"
                name="start_date"
                type="datetime-local"
                value={
                  formData.start_date
                }
                onChange={
                  handleChange
                }
                error={
                  errors.start_date
                }
              disabled={
                mutation.isPending
              }
              />

              <Input
                label="Bitiş Tarihi"
                name="end_date"
                type="datetime-local"
                value={
                  formData.end_date
                }
                onChange={
                  handleChange
                }
                error={
                  errors.end_date
                }
                min={
                  formData.start_date ||
                  undefined
                }
              disabled={
                mutation.isPending
              }
              />

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label="Toplantı Yeri"
                name="location"
                value={
                  formData.location
                }
                onChange={
                  handleChange
                }
                maxLength={
                  MAX_LOCATION_LENGTH
                }
                error={
                  errors.location
                }
                disabled={
                  mutation.isPending
                }
                placeholder="Örn: Toplantı Odası 1"
                icon={
                  <MapPin size={16} />
                }
              />

              <Input
                label="Online Toplantı Linki"
                name="meeting_link"
                type="url"
                value={
                  formData.meeting_link
                }
                onChange={
                  handleChange
                }
                error={
                  errors.meeting_link
                }
                disabled={
                  mutation.isPending
                }
                placeholder="https://zoom.us/..."
                icon={
                  <Video size={16} />
                }
              />

            </div>

            {formData.meeting_link && (
              <div
                className="
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  bg-blue-50
                  px-3
                  py-2
                  text-xs
                  text-blue-700
                  dark:bg-blue-500/[0.05]
                  dark:text-blue-400
                "
              >
                <Link2 className="h-4 w-4 shrink-0" />

                Online toplantı bağlantısı kayda eklenecek.
              </div>
            )}

          </Card.Body>

        </Card>

        {/* ==================================================
            RELATIONS
        ================================================== */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-violet-50
                  text-violet-600
                  dark:bg-violet-500/[0.08]
                  dark:text-violet-400
                "
              >
                <BriefcaseBusiness size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  İlişkili Kayıtlar
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Toplantıyı danışmanlıkla; gerekirse müvekkil ve dava kaydıyla ilişkilendirin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="mb-5">

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                İlişkili Danışmanlık
              </label>

              <select
                name="consultation_id"
                value={
                  formData.consultation_id
                }
                onChange={
                  handleChange
                }
                disabled={
                  !canViewConsultations ||
                  consultationsLoading ||
                  mutation.isPending
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
                  outline-none
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-slate-300
                "
              >
                <option value="">
                  {!canViewConsultations
                    ? 'Danışmanlık görüntüleme yetkiniz yok'
                    : consultationsLoading
                      ? 'Danışmanlıklar yükleniyor...'
                      : 'Danışmanlık seçin (isteğe bağlı)'}
                </option>

                {consultations.map(
                  (
                    consultation
                  ) => (
                    <option
                      key={
                        consultation.id
                      }
                      value={
                        consultation.id
                      }
                    >
                      {consultation.consultation_number
                        ? `${consultation.consultation_number} · `
                        : ''}
                      {consultation.title ||
                        'Danışmanlık'}
                    </option>
                  )
                )}
              </select>

              {errors.consultation_id && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                  {errors.consultation_id}
                </p>
              )}

              {consultationsError &&
                canViewConsultations && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/[0.06] dark:text-red-300">
                  <span>
                    Danışmanlık listesi yüklenemedi.
                  </span>

                  <button
                    type="button"
                    className="font-semibold underline underline-offset-2"
                    disabled={
                      consultationsLoading
                    }
                    onClick={() =>
                      refetchConsultations?.()
                    }
                  >
                    Tekrar Dene
                  </button>
                </div>
              )}

              {formData.consultation_id &&
                selectedConsultationLoading && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                    Seçilen danışmanlık doğrulanıyor...
                  </p>
                )}

              {formData.consultation_id &&
                selectedConsultationError && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/[0.06] dark:text-amber-300">
                    <span>
                      Seçilen danışmanlık doğrulanamadı.
                    </span>

                    <button
                      type="button"
                      className="font-semibold underline underline-offset-2"
                      disabled={
                        selectedConsultationLoading
                      }
                      onClick={() =>
                        refetchSelectedConsultation?.()
                      }
                    >
                      Tekrar Dene
                    </button>
                  </div>
                )}

              {selectedConsultation && (
                <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50/50 p-3 dark:border-violet-500/15 dark:bg-violet-500/[0.04]">
                  <div className="flex items-start gap-3">
                    <BriefcaseBusiness
                      size={15}
                      className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-400"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-gray-800 dark:text-slate-200">
                        {selectedConsultation.consultation_number
                          ? `${selectedConsultation.consultation_number} · `
                          : ''}
                        {selectedConsultation.title ||
                          'Danışmanlık'}
                      </p>

                      <p className="mt-1 truncate text-[10px] text-gray-500 dark:text-slate-500">
                        {selectedConsultation.client?.name ||
                          selectedConsultation.prospect_name ||
                          selectedConsultation.legal_area ||
                          'Danışmanlık kaydı'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              {/* CLIENT */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  İlişkili Müvekkil
                </label>

                <select
                  name="client_id"
                  value={
                    formData.client_id
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    clientSelectLoading ||
                    mutation.isPending
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
                    outline-none
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  <option value="">
                    {clientSelectLoading
                      ? 'Müvekkiller yükleniyor...'
                      : 'Müvekkil seçin (isteğe bağlı)'}
                  </option>

                  {clients.map(
                    (
                      client
                    ) => (
                      <option
                        key={
                          client.id
                        }
                        value={
                          client.id
                        }
                      >
                        {client.name}
                        {client.company_name
                          ? ` · ${client.company_name}`
                          : ''}
                      </option>
                    )
                  )}
                </select>

                {errors.client_id && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {errors.client_id}
                  </p>
                )}

                {clientsError && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/[0.06] dark:text-red-300">
                    <span>
                      Müvekkil listesi yüklenemedi.
                    </span>

                    <button
                      type="button"
                      className="font-semibold underline underline-offset-2"
                      disabled={
                        clientsLoading
                      }
                      onClick={() =>
                        refetchClients?.()
                      }
                    >
                      Tekrar Dene
                    </button>
                  </div>
                )}

                {requestedClientError &&
                  requestedClientId && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/[0.06] dark:text-amber-300">
                    <span>
                      Bağlantıdaki müvekkil doğrulanamadı.
                    </span>

                    <button
                      type="button"
                      className="font-semibold underline underline-offset-2"
                      disabled={
                        requestedClientLoading
                      }
                      onClick={() => {
                        prefillAppliedRef.current =
                          false;

                        refetchRequestedClient?.();
                      }}
                    >
                      Tekrar Dene
                    </button>
                  </div>
                )}

                {selectedClient && (
                  <div
                    className="
                      mt-3
                      flex
                      items-center
                      gap-3
                      rounded-lg
                      border
                      border-gray-100
                      bg-gray-50
                      p-3
                      dark:border-white/[0.05]
                      dark:bg-white/[0.025]
                    "
                  >

                    <UserRound
                      size={15}
                      className="shrink-0 text-gray-400"
                    />

                    <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                      {selectedClient.name}
                    </p>

                  </div>
                )}

              </div>

              {/* CASE */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  İlişkili Dava
                </label>

                <select
                  name="case_id"
                  value={
                    formData.case_id
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    relationCasesLoading ||
                    !formData.client_id ||
                    mutation.isPending
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
                    outline-none
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  <option value="">
                    {!formData.client_id
                      ? 'Önce müvekkil seçin'
                      : relationCasesLoading
                        ? 'Davalar yükleniyor...'
                        : relationCases.length >
                            0
                          ? 'Dava seçin (isteğe bağlı)'
                          : 'Bu müvekkile ait dava bulunamadı'}
                  </option>

                  {relationCases.map(
                    (
                      caseItem
                    ) => (
                      <option
                        key={
                          caseItem.id
                        }
                        value={
                          caseItem.id
                        }
                      >
                        {getCaseDisplayName(
                          caseItem
                        )}
                      </option>
                    )
                  )}
                </select>

                {errors.case_id && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {errors.case_id}
                  </p>
                )}

                {formData.client_id &&
                  clientCasesError && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/[0.06] dark:text-red-300">
                    <span>
                      Müvekkilin dava listesi yüklenemedi.
                    </span>

                    <button
                      type="button"
                      className="font-semibold underline underline-offset-2"
                      disabled={
                        clientCasesLoading
                      }
                      onClick={() =>
                        refetchClientCases?.()
                      }
                    >
                      Tekrar Dene
                    </button>
                  </div>
                )}

                {!formData.client_id && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                    Dava seçebilmek için önce ilişkili müvekkili seçin.
                  </p>
                )}

                {selectedCase && (
                  <div
                    className="
                      mt-3
                      rounded-lg
                      border
                      border-gray-100
                      bg-gray-50
                      p-3
                      dark:border-white/[0.05]
                      dark:bg-white/[0.025]
                    "
                  >
                    <div className="flex items-center gap-2">

                      <BriefcaseBusiness
                        size={15}
                        className="shrink-0 text-gray-400 dark:text-slate-500"
                      />

                      <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                        {getCaseDisplayName(
                          selectedCase
                        )}
                      </p>

                    </div>

                    {getCaseSecondaryInfo(
                      selectedCase
                    ) && (
                      <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">
                        {getCaseSecondaryInfo(
                          selectedCase
                        )}
                      </p>
                    )}
                  </div>
                )}

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            INTERNAL PARTICIPANTS
        ================================================== */}

        <Card>

          <Card.Header>

            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    bg-blue-50
                    text-blue-600
                    dark:bg-blue-500/[0.08]
                    dark:text-blue-400
                  "
                >
                  <Users size={17} />
                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Toplantı Katılımcıları
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    Toplantıya atanacak Derkenar kullanıcılarını seçin
                  </p>

                </div>

              </div>

              {user?.role ===
                'admin' &&
                formData.attendee_ids.length >
                  0 && (
                  <Badge
                    variant="primary"
                  >
                    {formData.attendee_ids.length}{' '}
                    kişi seçildi
                  </Badge>
                )}

            </div>

          </Card.Header>

          <Card.Body className="space-y-4">

            {user?.role ===
            'admin' ? (
              <>

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <div>

                    <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      Katılımcı Kullanıcılar
                    </p>

                    <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                      Toplantıya bir veya birden fazla kullanıcı atayabilirsiniz.
                    </p>

                  </div>

                  {assignableUsers.length >
                    0 && (
                    <button
                      type="button"
                      onClick={
                        handleSelectAllParticipants
                      }
                      disabled={
                        mutation.isPending
                      }
                      className="
                        rounded-lg
                        border
                        border-gray-200
                        bg-white
                        px-3
                        py-1.5
                        text-xs
                        font-medium
                        text-gray-600
                        transition
                        hover:border-blue-200
                        hover:bg-blue-50
                        hover:text-blue-600
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                        dark:border-white/[0.08]
                        dark:bg-white/[0.025]
                        dark:text-slate-400
                        dark:hover:border-blue-500/20
                        dark:hover:bg-blue-500/[0.06]
                        dark:hover:text-blue-400
                      "
                    >
                      {assignableUsers.every(
                        (person) =>
                          formData.attendee_ids
                            .map(
                              (id) =>
                                normalizeId(
                                  id
                                )
                            )
                            .includes(
                              normalizeId(
                                person?.id
                              )
                            )
                      )
                        ? 'Seçimi Temizle'
                        : 'Tümünü Seç'}
                    </button>
                  )}

                </div>

                {usersLoading && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 text-center text-sm text-gray-500 dark:border-white/[0.06] dark:bg-white/[0.025] dark:text-slate-400">
                    Kullanıcılar yükleniyor...
                  </div>
                )}

                {usersError &&
                  !usersLoading && (
                  <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-500/20 dark:bg-red-500/[0.04]">

                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                      Atanabilir kullanıcılar yüklenemedi.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        refetchUsers?.()
                      }
                      className="mt-2 text-xs font-semibold text-red-700 underline underline-offset-2 dark:text-red-300"
                    >
                      Tekrar Dene
                    </button>

                  </div>
                )}

                {!usersLoading &&
                  !usersError &&
                  assignableUsers.length ===
                    0 && (
                    <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500 dark:border-white/[0.08] dark:text-slate-400">
                      Toplantıya atanabilecek aktif kullanıcı bulunamadı.
                    </div>
                  )}

                {!usersLoading &&
                  !usersError &&
                  assignableUsers.length >
                    0 && (
                    <div className="grid gap-2 sm:grid-cols-2">

                      {assignableUsers.map(
                        (
                          person
                        ) => {
                          const selected =
                            formData.attendee_ids
                              .map(
                                (id) =>
                                  normalizeId(
                                    id
                                  )
                              )
                              .includes(
                                normalizeId(
                                  person?.id
                                )
                              );

                          return (
                            <button
                              key={
                                person.id
                              }
                              type="button"
                              onClick={() =>
                                handleParticipantToggle(
                                  person.id
                                )
                              }
                              disabled={
                                mutation.isPending
                              }
                              className={`
                                flex
                                w-full
                                items-center
                                gap-3
                                rounded-xl
                                border
                                p-3
                                text-left
                                transition
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                                ${
                                  selected
                                    ? `
                                        border-blue-300
                                        bg-blue-50/70
                                        ring-1
                                        ring-blue-500/10
                                        dark:border-blue-500/30
                                        dark:bg-blue-500/[0.07]
                                      `
                                    : `
                                        border-gray-200
                                        bg-white
                                        hover:border-gray-300
                                        hover:bg-gray-50
                                        dark:border-white/[0.07]
                                        dark:bg-white/[0.02]
                                        dark:hover:bg-white/[0.04]
                                      `
                                }
                              `}
                            >

                              <div
                                className={`
                                  flex
                                  h-10
                                  w-10
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-full
                                  text-xs
                                  font-semibold
                                  ${
                                    selected
                                      ? `
                                          bg-blue-100
                                          text-blue-700
                                          dark:bg-blue-500/[0.12]
                                          dark:text-blue-300
                                        `
                                      : `
                                          bg-gray-100
                                          text-gray-600
                                          dark:bg-white/[0.06]
                                          dark:text-slate-300
                                        `
                                  }
                                `}
                              >
                                {person?.first_name?.[0] ||
                                  ''}
                                {person?.last_name?.[0] ||
                                  ''}
                              </div>

                              <div className="min-w-0 flex-1">

                                <p
                                  className={`
                                    truncate
                                    text-sm
                                    font-semibold
                                    ${
                                      selected
                                        ? 'text-blue-900 dark:text-blue-200'
                                        : 'text-gray-900 dark:text-white'
                                    }
                                  `}
                                >
                                  {person.first_name}{' '}
                                  {person.last_name}
                                </p>

                                <p className="mt-1 truncate text-xs text-gray-500 dark:text-slate-500">
                                  {getRoleLabel(
                                    person.role
                                  )}
                                  {person.title
                                    ? ` · ${person.title}`
                                    : ''}
                                </p>

                              </div>

                              <div
                                className={`
                                  flex
                                  h-6
                                  w-6
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-full
                                  border
                                  transition
                                  ${
                                    selected
                                      ? `
                                          border-blue-600
                                          bg-blue-600
                                          text-white
                                        `
                                      : `
                                          border-gray-300
                                          bg-white
                                          text-transparent
                                          dark:border-white/[0.15]
                                          dark:bg-white/[0.03]
                                        `
                                  }
                                `}
                              >
                                <Check size={14} />
                              </div>

                            </button>
                          );
                        }
                      )}

                    </div>
                  )}

                {errors.attendee_ids && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.attendee_ids}
                  </p>
                )}

              </>
            ) : (
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-4
                  rounded-xl
                  border
                  border-gray-100
                  bg-gray-50
                  p-4
                  dark:border-white/[0.06]
                  dark:bg-white/[0.025]
                "
              >

                <div className="flex items-center gap-3">

                  <div
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-full
                      bg-blue-100
                      text-sm
                      font-semibold
                      text-blue-700
                      dark:bg-blue-500/[0.1]
                      dark:text-blue-400
                    "
                  >
                    {user?.first_name?.[0] ||
                      ''}
                    {user?.last_name?.[0] ||
                      ''}
                  </div>

                  <div>

                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {user?.first_name}{' '}
                      {user?.last_name}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-500">
                      {getRoleLabel(
                        user?.role
                      )}
                    </p>

                  </div>

                </div>

                <Badge
                  variant="primary"
                  dot
                >
                  Katılımcı
                </Badge>

              </div>
            )}

            {user?.role !==
              'admin' &&
              errors.attendee_ids && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.attendee_ids}
                </p>
              )}

          </Card.Body>

        </Card>

        {/* ==================================================
            ATTENDEES
        ================================================== */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-emerald-50
                  text-emerald-600
                  dark:bg-emerald-500/[0.08]
                  dark:text-emerald-400
                "
              >
                <Users size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Harici Katılımcılar
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Derkenar kullanıcısı olmayan kişileri isteğe bağlı ekleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="flex flex-col gap-2 md:flex-row">

              <input
                type="text"
                value={
                  attendeeName
                }
                onChange={(
                  event
                ) =>
                  setAttendeeName(
                    event.target.value.slice(
                      0,
                      MAX_ATTENDEE_NAME_LENGTH
                    )
                  )
                }
                maxLength={
                  MAX_ATTENDEE_NAME_LENGTH
                }
                disabled={
                  mutation.isPending
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    event.preventDefault();

                    handleAddAttendee();
                  }
                }}
                placeholder="Ad Soyad"
                className="
                  h-10
                  flex-1
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  text-sm
                  text-gray-900
                  outline-none
                  placeholder:text-gray-400
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                "
              />

              <input
                type="text"
                value={
                  attendeeRole
                }
                onChange={(
                  event
                ) =>
                  setAttendeeRole(
                    event.target.value.slice(
                      0,
                      MAX_ATTENDEE_ROLE_LENGTH
                    )
                  )
                }
                maxLength={
                  MAX_ATTENDEE_ROLE_LENGTH
                }
                disabled={
                  mutation.isPending
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    event.preventDefault();

                    handleAddAttendee();
                  }
                }}
                placeholder="Rol / Unvan"
                className="
                  h-10
                  md:w-48
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  text-sm
                  text-gray-900
                  outline-none
                  placeholder:text-gray-400
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                "
              />

              <Button
                type="button"
                variant="secondary"
                onClick={
                  handleAddAttendee
                }
                disabled={
                  mutation.isPending
                }
              >
                <Plus className="h-4 w-4" />

                Ekle
              </Button>

            </div>

            {formData.attendees.length >
              0 ? (
              <div className="mt-4 flex flex-wrap gap-2">

                {formData.attendees.map(
                  (
                    attendee,
                    index
                  ) => (
                    <div
                      key={`${attendee.name}-${index}`}
                      className="
                        inline-flex
                        items-center
                        gap-2
                        rounded-full
                        border
                        border-gray-200
                        bg-gray-50
                        px-3
                        py-1.5
                        text-xs
                        text-gray-700
                        dark:border-white/[0.07]
                        dark:bg-white/[0.03]
                        dark:text-slate-300
                      "
                    >

                      <UserRound className="h-3.5 w-3.5 text-gray-400" />

                      <span className="font-medium">
                        {attendee.name}
                      </span>

                      {attendee.role && (
                        <span className="text-gray-400 dark:text-slate-500">
                          · {attendee.role}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveAttendee(
                            index
                          )
                        }
                        disabled={
                          mutation.isPending
                        }
                        className="text-gray-400 transition hover:text-red-500"
                        aria-label={`${attendee.name} katılımcısını kaldır`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                    </div>
                  )
                )}

              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
                Henüz ek katılımcı eklenmedi.
              </p>
            )}

          </Card.Body>

        </Card>

        {/* ==================================================
            NOTES
        ================================================== */}

        <Card>

          <Card.Header>

            <h2 className="font-semibold text-gray-900 dark:text-white">
              Notlar
            </h2>

          </Card.Header>

          <Card.Body>

            <textarea
              name="notes"
              value={
                formData.notes
              }
              onChange={
                handleChange
              }
              disabled={
                mutation.isPending
              }
              rows={4}
              maxLength={
                MAX_NOTES_LENGTH
              }
              placeholder="Toplantıyla ilgili büro içi notlar, hazırlık bilgileri veya hatırlatmalar..."
              className="
                w-full
                resize-y
                rounded-lg
                border
                border-gray-200
                bg-white
                px-3.5
                py-2.5
                text-sm
                leading-6
                text-gray-900
                outline-none
                placeholder:text-gray-400
                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-500/10
                dark:border-white/[0.08]
                dark:bg-white/[0.035]
                dark:text-white
                dark:placeholder:text-slate-500
              "
            />

            {errors.notes && (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                {errors.notes}
              </p>
            )}

          </Card.Body>

        </Card>

        {/* ==================================================
            SUMMARY
        ================================================== */}

        <div
          className="
            grid
            gap-3
            rounded-xl
            border
            border-gray-200
            bg-gray-50/50
            p-4
            dark:border-white/[0.07]
            dark:bg-white/[0.015]
            sm:grid-cols-3
          "
        >

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Toplantı Türü
            </p>

            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {getMeetingTypeLabel(
                formData.meeting_type
              )}
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Katılımcı
            </p>

            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {
                formData.attendees
                  .length
              } kişi
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Durum
            </p>

            <div className="mt-1">

              <Badge
                variant={
                  getStatusVariant(
                    formData.status
                  )
                }
                dot
              >
                {getStatusLabel(
                  formData.status
                )}
              </Badge>

            </div>

          </div>

        </div>

        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div
          className="
            flex
            flex-col-reverse
            gap-3
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.07]
            dark:bg-[#0b1b33]
            sm:flex-row
            sm:items-center
            sm:justify-end
          "
        >

          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              requestExit(
                cancelDestination
              )
            }
            disabled={
              mutation.isPending
            }
          >
            İptal
          </Button>

          <Button
            type="submit"
            loading={
              mutation.isPending
            }
            disabled={
              mutation.isPending ||
              clientSelectLoading
            }
          >
            <Save className="h-4 w-4" />

            Toplantı Oluştur
          </Button>

        </div>

      </form>

      {unsavedDialogOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
          aria-live="polite"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Kaydedilmemiş değişiklikler penceresini kapat"
            disabled={
              mutation.isPending
            }
            onClick={
              closeUnsavedDialog
            }
          />

          <div
            ref={
              unsavedDialogRef
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="meeting-create-unsaved-title"
            aria-describedby="meeting-create-unsaved-description"
            tabIndex={-1}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/[0.08] dark:bg-[#0b1b33]"
          >
            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/[0.10] dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div className="min-w-0">

                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                    Kaydedilmemiş değişiklik
                  </p>

                  <h2
                    id="meeting-create-unsaved-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Toplantı oluşturmadan çıkılsın mı?
                  </h2>

                  <p
                    id="meeting-create-unsaved-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    Yeni toplantı formunda henüz kaydetmediğiniz bilgiler var. Çıkarsanız bu bilgiler kaybolacaktır.
                  </p>

                </div>

              </div>

            </div>

            <div className="flex flex-col-reverse gap-2 px-6 py-4 sm:flex-row sm:justify-end">

              <Button
                type="button"
                variant="secondary"
                disabled={
                  mutation.isPending
                }
                onClick={
                  closeUnsavedDialog
                }
              >
                Düzenlemeye Devam Et
              </Button>

              <Button
                type="button"
                variant="danger"
                disabled={
                  mutation.isPending
                }
                onClick={
                  discardAndExit
                }
              >
                Değişiklikleri At ve Çık
              </Button>

            </div>

          </div>
        </div>
      )}

      {relationDialogOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
          aria-live="polite"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="İlişki değişikliği penceresini kapat"
            disabled={
              mutation.isPending
            }
            onClick={
              closeRelationDialog
            }
          />

          <div
            ref={
              relationDialogRef
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="meeting-create-client-change-title"
            aria-describedby="meeting-create-client-change-description"
            tabIndex={-1}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/[0.08] dark:bg-[#0b1b33]"
          >
            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/[0.10] dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div className="min-w-0">

                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                    İlişkili kayıt
                  </p>

                  <h2
                    id="meeting-create-client-change-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Müvekkil değiştirilsin mi?
                  </h2>

                  <p
                    id="meeting-create-client-change-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    Müvekkili değiştirirseniz seçili dava ilişkisi temizlenecek. Devam etmek istiyor musunuz?
                  </p>

                </div>

              </div>

            </div>

            <div className="flex flex-col-reverse gap-2 px-6 py-4 sm:flex-row sm:justify-end">

              <Button
                type="button"
                variant="secondary"
                disabled={
                  mutation.isPending
                }
                onClick={
                  closeRelationDialog
                }
              >
                Vazgeç
              </Button>

              <Button
                type="button"
                disabled={
                  mutation.isPending
                }
                onClick={
                  confirmClientChange
                }
              >
                Müvekkili Değiştir
              </Button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default MeetingCreate;