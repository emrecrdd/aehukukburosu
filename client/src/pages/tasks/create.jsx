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
  useCases,
} from '../../features/cases/case.query.js';

import {
  useClients,
  useClientCaseHistory,
} from '../../features/clients/client.query.js';

import consultationApi from '../../features/consultations/consultation.api.js';

import {
  useCreateTask,
  useAssignableUsers,
} from '../../features/tasks/task.query.js';

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
  CheckSquare2,
  Clock3,
  FileText,
  Save,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const INITIAL_FORM = {
  title: '',
  description: '',
  priority: 'normal',
  due_date: '',

  /*
   * Çoklu görev atama.
   *
   * Eski:
   * assigned_to: ''
   *
   * Yeni:
   * assignee_ids: []
   */
  assignee_ids: [],

  case_id: '',
  client_id: '',
  consultation_id: '',
  estimated_hours: '',
  note: '',
};

const VALID_PRIORITIES = new Set([
  'low',
  'normal',
  'high',
  'critical',
]);

const PRIORITY_OPTIONS = [
  {
    value: 'low',
    label: 'Düşük',
  },
  {
    value: 'normal',
    label: 'Normal',
  },
  {
    value: 'high',
    label: 'Yüksek',
  },
  {
    value: 'critical',
    label: 'Kritik',
  },
];

// ======================================================
// HELPERS
// ======================================================

const normalizeDateTimeLocal = (
  value
) => {
  if (!value) {
    return '';
  }

  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(
      value
    )
  ) {
    return value.slice(
      0,
      16
    );
  }

  return value;
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

const getPriorityVariant = (
  priority
) => {
  const variants = {
    low: 'default',
    normal: 'primary',
    high: 'warning',
    critical: 'danger',
  };

  return (
    variants[priority] ||
    'default'
  );
};

const getInitials = (
  person
) => {
  const first =
    person
      ?.first_name
      ?.[0] ||
    '';

  const last =
    person
      ?.last_name
      ?.[0] ||
    '';

  return `${first}${last}`.toUpperCase();
};


const getCaseDisplayName = (
  caseItem
) => {
  if (
    !caseItem
  ) {
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
  if (
    !caseItem
  ) {
    return '';
  }

  return [
    caseItem.judiciary_type,
    caseItem.judiciary_unit,
  ]
    .filter(Boolean)
    .join(' · ');
};
const localToUTC = (
  dateTime
) => {
  if (!dateTime) {
    return null;
  }

  const parsed =
    new Date(dateTime);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed.toISOString();
};


const getCurrentDateTimeLocal =
  () => {
    const now =
      new Date();

    now.setSeconds(
      0,
      0
    );

    const pad =
      (value) =>
        String(value).padStart(
          2,
          '0'
        );

    return `${now.getFullYear()}-${pad(
      now.getMonth() + 1
    )}-${pad(
      now.getDate()
    )}T${pad(
      now.getHours()
    )}:${pad(
      now.getMinutes()
    )}`;
  };

const isPastTaskDueDate = (
  value
) => {
  if (!value) {
    return false;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return false;
  }

  const currentMinute =
    new Date();

  currentMinute.setSeconds(
    0,
    0
  );

  return (
    parsed.getTime() <
    currentMinute.getTime()
  );
};


const normalizeTaskCreateForm = (
  form
) => ({
  title:
    String(
      form?.title || ''
    ).trim(),

  description:
    String(
      form?.description || ''
    ).trim(),

  priority:
    VALID_PRIORITIES.has(
      form?.priority
    )
      ? form.priority
      : 'normal',

  due_date:
    normalizeDateTimeLocal(
      form?.due_date || ''
    ),

  assignee_ids:
    [
      ...new Set(
        Array.isArray(
          form?.assignee_ids
        )
          ? form.assignee_ids
              .map(
                (id) =>
                  String(
                    id ?? ''
                  )
              )
              .filter(Boolean)
          : []
      ),
    ].sort(),

  case_id:
    String(
      form?.case_id || ''
    ),

  client_id:
    String(
      form?.client_id || ''
    ),

  consultation_id:
    String(
      form?.consultation_id || ''
    ),

  estimated_hours:
    String(
      form?.estimated_hours ?? ''
    ).trim(),

  note:
    String(
      form?.note || ''
    ).trim(),
});

const TASK_FIELD_FALLBACKS = {
  title:
    'Görev adı geçersiz',
  description:
    'Görev açıklaması geçersiz',
  priority:
    'Geçerli bir öncelik seçin',
  due_date:
    'Geçerli bir son tarih girin',
  assignee_ids:
    'Görev sorumlularını kontrol edin',
  assigned_to:
    'Görev sorumlusunu kontrol edin',
  case_id:
    'İlişkili davayı kontrol edin',
  client_id:
    'İlişkili müvekkili kontrol edin',
  consultation_id:
    'İlişkili danışmanlığı kontrol edin',
  estimated_hours:
    'Tahmini çalışma süresini kontrol edin',
  note:
    'Başlangıç notunu kontrol edin',
};

const getSafeTaskFieldErrors = (
  error
) => {
  const source =
    error?.response?.data?.errors ??
    error?.response?.data?.validation_errors ??
    null;

  if (!source) {
    return {};
  }

  const result = {};

  const addFieldError = (
    rawField,
    rawMessage
  ) => {
    const field =
      String(
        Array.isArray(rawField)
          ? rawField[
              rawField.length - 1
            ]
          : rawField || ''
      )
        .split('.')
        .filter(Boolean)
        .pop();

    const normalizedField =
      field === 'assigned_to'
        ? 'assignee_ids'
        : field;

    if (
      !normalizedField ||
      !Object.prototype
        .hasOwnProperty.call(
          TASK_FIELD_FALLBACKS,
          normalizedField
        )
    ) {
      return;
    }

    const message =
      String(
        rawMessage || ''
      ).trim();

    const looksTechnical =
      /validation|sequelize|constraint|notnull|invalid input syntax|uuid|foreign key|database|sql|must be|is required|cannot be null/i.test(
        message
      );

    const looksTurkish =
      /[çğıöşüÇĞİÖŞÜ]|geçersiz|gerekli|zorunlu|bulunamadı|seçin|kontrol/i.test(
        message
      );

    result[normalizedField] =
      message &&
      looksTurkish &&
      !looksTechnical
        ? message
        : TASK_FIELD_FALLBACKS[
            normalizedField
          ];
  };

  if (
    Array.isArray(
      source
    )
  ) {
    source.forEach(
      (item) => {
        addFieldError(
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
      ([field, value]) => {
        addFieldError(
          field,
          Array.isArray(value)
            ? value[0]
            : value
        );
      }
    );
  }

  return result;
};
// ======================================================
// COMPONENT
// ======================================================

const TaskCreate = () => {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] =
    useSearchParams();

  const {
    user,
  } =
    useAuth();

  const [
    formData,
    setFormData,
  ] =
    useState(
      () => {
        const priority =
          searchParams.get(
            'priority'
          );

        return {
          ...INITIAL_FORM,

          title:
            searchParams.get(
              'title'
            ) || '',

          description:
            searchParams.get(
              'description'
            ) || '',

          priority:
            priority &&
            VALID_PRIORITIES.has(
              priority
            )
              ? priority
              : 'normal',

          due_date:
            normalizeDateTimeLocal(
              searchParams.get(
                'due_date'
              )
            ),

          estimated_hours:
            searchParams.get(
              'estimated_hours'
            ) || '',

          case_id:
            searchParams.get(
              'case_id'
            ) || '',

          client_id:
            searchParams.get(
              'client_id'
            ) || '',

          consultation_id:
            searchParams.get(
              'consultation_id'
            ) || '',

          note:
            searchParams.get(
              'note'
            ) || '',
        };
      }
    );

  const [
    errors,
    setErrors,
  ] =
    useState({});


  const initialFormRef =
    useRef(null);

  if (
    !initialFormRef.current
  ) {
    initialFormRef.current =
      normalizeTaskCreateForm(
        formData
      );
  }

  const leaveDialogRef =
    useRef(null);

  const relationDialogRef =
    useRef(null);

  const previousFocusRef =
    useRef(null);

  const [
    leaveDialogOpen,
    setLeaveDialogOpen,
  ] =
    useState(false);

  const [
    pendingExitDestination,
    setPendingExitDestination,
  ] =
    useState('/tasks');

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

  // ====================================================
  // PERMISSIONS
  // ====================================================

  const canAssignTasks =
    hasPermission(
      user,
      PERMISSION_KEYS.ASSIGN_TASKS
    );

  const canViewCases =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_CASES
    );

  const canViewClients =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_CLIENTS
    );

  const canViewConsultations =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_CONSULTATIONS
    );

  // ====================================================
  // QUERY PARAM PREFILL
  // ====================================================

  const isAiPrefill =
  (searchParams.get('source') || '').startsWith('ai');

  // ====================================================
  // QUERIES
  // ====================================================

  const {
    data:
      assignableUsersData,
    isLoading:
      assignableUsersLoading,
    isError:
      assignableUsersError,
    refetch:
      refetchAssignableUsers,
  } =
    useAssignableUsers(
      canAssignTasks
    );

  const {
    data:
      casesData,
    isLoading:
      casesLoading,
    isError:
      casesError,
    refetch:
      refetchCases,
  } =
    useCases(
      {
        limit: 100,
      },
      {
        enabled:
          canViewCases,
      }
    );

  const {
    data:
      clientsData,
    isLoading:
      clientsLoading,
    isError:
      clientsError,
    refetch:
      refetchClients,
  } =
    useClients(
      {
        limit: 100,
      },
      {
        enabled:
          canViewClients,
      }
    );

  const {
    data:
      consultationsData,
    isLoading:
      consultationsLoading,
    isError:
      consultationsError,
    refetch:
      refetchConsultations,
  } =
    useQuery({
      queryKey: [
        'consultations',
        {
          limit:
            100,
        },
        'task-create',
      ],

      queryFn: () =>
        consultationApi.getAll({
          limit:
            100,
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
    isError:
      selectedConsultationError,
    refetch:
      refetchSelectedConsultation,
  } =
    useQuery({
      queryKey: [
        'consultation',
        String(
          formData.consultation_id ||
          ''
        ),
      ],

      queryFn: () =>
        consultationApi.getOne(
          formData.consultation_id
        ),

      enabled:
        Boolean(
          canViewConsultations &&
          formData.consultation_id
        ),

      staleTime:
        60 * 1000,
    });

  const {
    data:
      clientCasesData,
    isLoading:
      clientCasesLoading,
    isError:
      clientCasesError,
    refetch:
      refetchClientCases,
  } =
    useClientCaseHistory(
      formData.client_id
    );

  const createMutation =
    useCreateTask();

  // ====================================================
  // DATA
  // ====================================================

  const assignableUsers =
    Array.isArray(
      assignableUsersData
        ?.data
        ?.data
    )
      ? assignableUsersData
          .data
          .data
      : [];

  const cases =
    Array.isArray(
      casesData
        ?.data
        ?.data
    )
      ? casesData
          .data
          .data
      : [];

  const clients =
    Array.isArray(
      clientsData
        ?.data
        ?.data
    )
      ? clientsData
          .data
          .data
      : [];

  const consultations =
    Array.isArray(
      consultationsData
        ?.data
        ?.data
    )
      ? consultationsData
          .data
          .data
      : [];

  const selectedConsultationDetail =
    selectedConsultationData
      ?.data
      ?.data ??
    selectedConsultationData
      ?.data ??
    null;

  // ====================================================
  // RELATION CASES
  // ====================================================

  const clientCases =
    useMemo(() => {
      const payload =
        clientCasesData?.data?.data ??
        clientCasesData?.data ??
        [];

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
          payload?.cases
        )
      ) {
        return payload.cases;
      }

      return [];
    }, [
      clientCasesData,
    ]);

  const relationCases =
    formData.client_id
      ? clientCases
      : cases;

  const relationCasesLoading =
    formData.client_id
      ? clientCasesLoading
      : casesLoading;


  const relationCasesError =
    formData.client_id
      ? clientCasesError
      : casesError;

  const refetchRelationCases =
    formData.client_id
      ? refetchClientCases
      : refetchCases;

  // ====================================================
  // SELECTED DATA
  // ====================================================

  const selectedCase =
    useMemo(() => {
      if (
        !canViewCases
      ) {
        return null;
      }

      return relationCases.find(
        (
          item
        ) =>
          String(
            item.id
          ) ===
          String(
            formData.case_id
          )
      );
    }, [
      relationCases,
      formData.case_id,
      canViewCases,
    ]);

  const selectedClient =
    useMemo(() => {
      if (
        !canViewClients
      ) {
        return null;
      }

      return clients.find(
        (
          item
        ) =>
          String(
            item.id
          ) ===
          String(
            formData.client_id
          )
      );
    }, [
      clients,
      formData.client_id,
      canViewClients,
    ]);

  const selectedConsultation =
    useMemo(() => {
      if (
        !canViewConsultations ||
        !formData.consultation_id
      ) {
        return null;
      }

      if (
        selectedConsultationDetail &&
        String(
          selectedConsultationDetail.id
        ) ===
        String(
          formData.consultation_id
        )
      ) {
        return selectedConsultationDetail;
      }

      return consultations.find(
        (
          item
        ) =>
          String(
            item.id
          ) ===
          String(
            formData.consultation_id
          )
      ) || null;
    }, [
      canViewConsultations,
      formData.consultation_id,
      selectedConsultationDetail,
      consultations,
    ]);

  const selectedAssignees =
    useMemo(() => {
      if (
        !canAssignTasks
      ) {
        return user
          ? [
              user,
            ]
          : [];
      }

      return assignableUsers.filter(
        (
          person
        ) =>
          formData.assignee_ids
            .map(String)
            .includes(
              String(
                person.id
              )
            )
      );
    }, [
      assignableUsers,
      formData.assignee_ids,
      canAssignTasks,
      user,
    ]);

  const normalizedCurrentForm =
    useMemo(
      () =>
        normalizeTaskCreateForm(
          formData
        ),
      [
        formData,
      ]
    );

  const isDirty =
    useMemo(
      () =>
        JSON.stringify(
          normalizedCurrentForm
        ) !==
        JSON.stringify(
          initialFormRef.current
        ),
      [
        normalizedCurrentForm,
      ]
    );

  const getCancelDestination =
    () => {
      if (
        canViewConsultations &&
        formData.consultation_id
      ) {
        return `/consultations/${formData.consultation_id}`;
      }

      if (
        canViewCases &&
        formData.case_id
      ) {
        return `/cases/${formData.case_id}`;
      }

      return '/tasks';
    };

  const requestExit =
    (
      destination
    ) => {
      if (
        createMutation.isPending
      ) {
        return;
      }

      if (!isDirty) {
        navigate(
          destination
        );

        return;
      }

      setPendingExitDestination(
        destination
      );

      setLeaveDialogOpen(
        true
      );
    };

  const applyClientChange =
    (
      clientId
    ) => {
      setFormData(
        (
          current
        ) => ({
          ...current,
          client_id:
            clientId,
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

  useEffect(() => {
    const handleBeforeUnload =
      (
        event
      ) => {
        if (
          !isDirty ||
          createMutation.isPending
        ) {
          return;
        }

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
    createMutation.isPending,
  ]);

  useEffect(() => {
    if (
      !leaveDialogOpen
    ) {
      return undefined;
    }

    previousFocusRef.current =
      document.activeElement;

    const dialog =
      leaveDialogRef.current;

    const getFocusable =
      () =>
        Array.from(
          dialog?.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          ) || []
        );

    getFocusable()[0]
      ?.focus();

    const handleKeyDown =
      (
        event
      ) => {
        if (
          event.key ===
          'Escape'
        ) {
          event.preventDefault();
          setLeaveDialogOpen(
            false
          );
          return;
        }

        if (
          event.key !==
          'Tab'
        ) {
          return;
        }

        const focusable =
          getFocusable();

        if (
          focusable.length ===
          0
        ) {
          event.preventDefault();
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
        } else if (
          !event.shiftKey &&
          document.activeElement ===
            last
        ) {
          event.preventDefault();
          first.focus();
        }
      };

    document.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      );

      previousFocusRef.current
        ?.focus?.();
    };
  }, [
    leaveDialogOpen,
  ]);

  useEffect(() => {
    if (
      !relationDialogOpen
    ) {
      return undefined;
    }

    previousFocusRef.current =
      document.activeElement;

    const dialog =
      relationDialogRef.current;

    const getFocusable =
      () =>
        Array.from(
          dialog?.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          ) || []
        );

    getFocusable()[0]
      ?.focus();

    const handleKeyDown =
      (
        event
      ) => {
        if (
          event.key ===
          'Escape'
        ) {
          event.preventDefault();
          setRelationDialogOpen(
            false
          );
          return;
        }

        if (
          event.key !==
          'Tab'
        ) {
          return;
        }

        const focusable =
          getFocusable();

        if (
          focusable.length ===
          0
        ) {
          event.preventDefault();
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
        } else if (
          !event.shiftKey &&
          document.activeElement ===
            last
        ) {
          event.preventDefault();
          first.focus();
        }
      };

    document.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      );

      previousFocusRef.current
        ?.focus?.();
    };
  }, [
    relationDialogOpen,
  ]);

  // ====================================================
  // HANDLERS
  // ====================================================

  const handleChange =
    (
      event
    ) => {
      if (
        createMutation.isPending
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
          'case_id' &&
        !canViewCases
      ) {
        return;
      }

      if (
        name ===
          'consultation_id' &&
        !canViewConsultations
      ) {
        return;
      }

      if (
        name ===
          'client_id' &&
        !canViewClients
      ) {
        return;
      }

      if (
        name ===
          'client_id'
      ) {
        if (
          value ===
          formData.client_id
        ) {
          return;
        }

        if (
          formData.case_id
        ) {
          setPendingClientId(
            value
          );

          setRelationDialogOpen(
            true
          );

          return;
        }

        applyClientChange(
          value
        );

        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,
          [name]:
            value,
        })
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
  // ASSIGNEE TOGGLE
  // ====================================================

  const handleAssigneeToggle =
    (
      userId
    ) => {
      if (
        !canAssignTasks ||
        createMutation.isPending
      ) {
        return;
      }

      setFormData(
        (
          current
        ) => {
          const normalizedUserId =
            String(
              userId
            );

          const exists =
            current.assignee_ids
              .map(String)
              .includes(
                normalizedUserId
              );

          return {
            ...current,

            assignee_ids:
              exists
                ? current.assignee_ids.filter(
                    (
                      id
                    ) =>
                      String(id) !==
                      normalizedUserId
                  )
                : [
                    ...current.assignee_ids,
                    normalizedUserId,
                  ],
          };
        }
      );

      if (
        errors.assignee_ids
      ) {
        setErrors(
          (
            current
          ) => ({
            ...current,

            assignee_ids:
              '',
          })
        );
      }
    };

  // ====================================================
  // SELECT ALL
  // ====================================================

  const handleSelectAllAssignees =
    () => {
      if (
        !canAssignTasks ||
        createMutation.isPending
      ) {
        return;
      }

      const allSelected =
        assignableUsers.length >
          0 &&
        formData.assignee_ids.length ===
          assignableUsers.length;

      setFormData(
        (
          current
        ) => ({
          ...current,

          assignee_ids:
            allSelected
              ? []
              : assignableUsers.map(
                  (
                    person
                  ) =>
                    String(
                      person.id
                    )
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
        createMutation.isPending
      ) {
        return;
      }

      const newErrors =
        {};

      if (
        !formData.title.trim()
      ) {
        newErrors.title =
          'Görev adı gereklidir';
      }


      if (
        !VALID_PRIORITIES.has(
          formData.priority
        )
      ) {
        newErrors.priority =
          'Geçerli bir öncelik seçin';
      }

      if (
        formData.due_date &&
        !localToUTC(
          formData.due_date
        )
      ) {
        newErrors.due_date =
          'Geçerli bir son tarih girin';
      } else if (
        formData.due_date &&
        isPastTaskDueDate(
          formData.due_date
        )
      ) {
        newErrors.due_date =
          'Görevin son tarihi geçmiş bir tarih olamaz';
      }

      if (
        formData.estimated_hours !==
          '' &&
        (
          !Number.isFinite(
            Number(
              formData.estimated_hours
            )
          ) ||
          Number(
            formData.estimated_hours
          ) < 0
        )
      ) {
        newErrors.estimated_hours =
          'Tahmini süre 0 veya daha büyük olmalıdır';
      }

      const clientChangedFromInitial =
        String(
          formData.client_id || ''
        ) !==
        String(
          initialFormRef.current
            ?.client_id || ''
        );

      const caseChangedFromInitial =
        String(
          formData.case_id || ''
        ) !==
        String(
          initialFormRef.current
            ?.case_id || ''
        );

      if (
        canViewClients &&
        formData.client_id &&
        clientChangedFromInitial &&
        (
          clientsError ||
          (
            !clientsLoading &&
            !selectedClient
          )
        )
      ) {
        newErrors.client_id =
          'Seçilen müvekkil artık erişilebilir değil';
      }

      if (
        canViewCases &&
        formData.case_id &&
        caseChangedFromInitial &&
        (
          relationCasesError ||
          (
            !relationCasesLoading &&
            !selectedCase
          )
        )
      ) {
        newErrors.case_id =
          formData.client_id
            ? 'Seçilen dava bu müvekkille ilişkili değil veya artık erişilebilir değil'
            : 'Seçilen dava artık erişilebilir değil';
      }

      const consultationChangedFromInitial =
        String(
          formData.consultation_id ||
          ''
        ) !==
        String(
          initialFormRef.current
            ?.consultation_id ||
          ''
        );

      if (
        formData.consultation_id
      ) {
        if (
          !canViewConsultations
        ) {
          newErrors.consultation_id =
            'Danışmanlık görüntüleme yetkiniz olmadan görev danışmanlığa bağlanamaz';
        } else if (
          selectedConsultationError
        ) {
          newErrors.consultation_id =
            'Seçilen danışmanlık doğrulanamadı';
        } else if (
          !selectedConsultationLoading &&
          !selectedConsultation
        ) {
          newErrors.consultation_id =
            'Seçilen danışmanlık artık erişilebilir değil';
        } else if (
          consultationChangedFromInitial &&
          consultationsError &&
          !selectedConsultation
        ) {
          newErrors.consultation_id =
            'Danışmanlık listesi doğrulanamadı';
        }
      }

      if (
        canAssignTasks &&
        formData.assignee_ids.length ===
          0
      ) {
        newErrors.assignee_ids =
          'Görev en az 1 kişiye atanmalıdır';
      } else if (
        !canAssignTasks &&
        !user?.id
      ) {
        newErrors.assignee_ids =
          'Görev sorumlusu belirlenemedi. Oturumunuzu yenileyip tekrar deneyin.';
      }

      if (
        canAssignTasks &&
        formData.assignee_ids.length >
          0
      ) {
        if (
          assignableUsersError
        ) {
          newErrors.assignee_ids =
            'Görev sorumluları doğrulanamadı. Kullanıcı listesini yeniden yükleyin.';
        } else if (
          !assignableUsersLoading
        ) {
          const validIds =
            new Set(
              assignableUsers.map(
                (person) =>
                  String(
                    person.id
                  )
              )
            );

          const hasInvalidAssignee =
            formData.assignee_ids.some(
              (id) =>
                !validIds.has(
                  String(id)
                )
            );

          if (
            hasInvalidAssignee
          ) {
            newErrors.assignee_ids =
              'Seçilen sorumlulardan biri artık atanabilir değil';
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

      const assigneeIds =
        canAssignTasks
          ? formData.assignee_ids
          : user?.id
            ? [
                user.id,
              ]
            : [];

      const submitData = {
        title:
          formData.title.trim(),

        description:
          formData.description
            ?.trim() ||
          null,

        priority:
          formData.priority,

        note:
          formData.note
            ?.trim() ||
          '',

        /*
         * Çoklu atama.
         */
        assignee_ids:
          assigneeIds,

        case_id:
          canViewCases
            ? (
                formData.case_id ||
                null
              )
            : null,

        client_id:
          canViewClients
            ? (
                formData.client_id ||
                null
              )
            : null,

        consultation_id:
          canViewConsultations
            ? (
                formData.consultation_id ||
                null
              )
            : null,

       due_date:
  localToUTC(
    formData.due_date
  ),

        estimated_hours:
          formData.estimated_hours !==
          ''
            ? Number(
                formData.estimated_hours
              )
            : null,
      };

      createMutation.mutate(
        submitData,
        {
          onSuccess: (
            response
          ) => {
            const taskId =
              response
                ?.data
                ?.data
                ?.id;

            if (
              taskId
            ) {
              navigate(
                `/tasks/${taskId}`
              );

              return;
            }

            navigate(
              '/tasks'
            );
          },

          onError: (
            error
          ) => {
            const fieldErrors =
              getSafeTaskFieldErrors(
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
    };

  // ====================================================
  // CANCEL
  // ====================================================

  const handleCancel =
    () => {
      requestExit(
        getCancelDestination()
      );
    };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div>

        <Link
          to="/tasks"
          onClick={(
            event
          ) => {
            event.preventDefault();

            requestExit(
              '/tasks'
            );
          }}
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

          Görevler
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
              bg-blue-50
              text-blue-600
              dark:bg-blue-500/[0.08]
              dark:text-blue-400
            "
          >
            <CheckSquare2 size={21} />
          </div>

          <div>

            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
                Yeni Görev
              </h1>

              {isDirty && (
                <Badge
                  variant="warning"
                >
                  Kaydedilmemiş değişiklik
                </Badge>
              )}
            </div>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-slate-400">
              Yapılacak işi, sorumlu kişileri, önceliği ve ilişkili dosyaları tanımlayın.
            </p>

          </div>

        </div>

      </div>

      {/* ==================================================
          AI PREFILL
      ================================================== */}

      {isAiPrefill && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/[0.05]">

          <div className="flex items-start gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/[0.1] dark:text-blue-400">
              <Sparkles size={17} />
            </div>

            <div>

              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                AI önerisinden görev oluşturuluyor
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700/80 dark:text-blue-300/70">
                Bazı alanlar dava analizindeki öneriden otomatik dolduruldu.
                Kaydetmeden önce görev içeriğini, sorumlu kişileri ve son tarihi kontrol edin.
              </p>

            </div>

          </div>

        </div>
      )}

      {/* ==================================================
          FORM
      ================================================== */}

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
      >
        <fieldset
          disabled={
            createMutation.isPending
          }
          className="contents"
        >

        {/* ==================================================
            BASIC INFO
        ================================================== */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
                <FileText size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Görev Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Görevin adı, açıklaması ve başlangıç notu
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <Input
              label="Görev Adı *"
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
              placeholder="Örn: Bilirkişi raporuna itiraz dilekçesi hazırla"
              autoFocus
            />

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
                rows={4}
                placeholder="Görevin kapsamını ve yapılması gerekenleri açıklayın..."
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
                  transition
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

            </div>

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Başlangıç Notu
              </label>

              <textarea
                name="note"
                value={
                  formData.note
                }
                onChange={
                  handleChange
                }
                rows={3}
                placeholder="Göreve ilişkin ilk not veya önemli hatırlatma..."
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
                  transition
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

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            PLANNING
        ================================================== */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400">
                <CalendarClock size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Planlama
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Öncelik, son tarih ve tahmini çalışma süresi
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div className="grid gap-4 md:grid-cols-2">

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Öncelik
                </label>

                <select
                  name="priority"
                  value={
                    formData.priority
                  }
                  onChange={
                    handleChange
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
                  {PRIORITY_OPTIONS.map(
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

                {errors.priority && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {errors.priority}
                  </p>
                )}

                <div className="mt-2">

                  <Badge
                    variant={
                      getPriorityVariant(
                        formData.priority
                      )
                    }
                    dot
                  >
                    {PRIORITY_OPTIONS.find(
                      (
                        option
                      ) =>
                        option.value ===
                        formData.priority
                    )?.label ||
                      formData.priority}
                  </Badge>

                </div>

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Son Tarih
                </label>

                <input
                  type="datetime-local"
                  name="due_date"
                  value={
                    formData.due_date
                  }
                  min={
                    getCurrentDateTimeLocal()
                  }
                  onChange={
                    handleChange
                  }
                  className={`
                    h-10
                    w-full
                    rounded-lg
                    border
                    bg-white
                    px-3.5
                    text-sm
                    text-gray-700
                    outline-none
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                    ${
                      errors.due_date
                        ? 'border-red-400 focus:border-red-500 dark:border-red-500/50'
                        : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                    }
                  `}
                />

                {errors.due_date && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {errors.due_date}
                  </p>
                )}

              </div>

            </div>

            <div className="max-w-xs">

              <Input
                label="Tahmini Süre (Saat)"
                name="estimated_hours"
                type="number"
                value={
                  formData.estimated_hours
                }
                onChange={
                  handleChange
                }
                error={
                  errors.estimated_hours
                }
                min="0"
                step="0.5"
                placeholder="Örn: 2.5"
                icon={
                  <Clock3 size={16} />
                }
              />

            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-500 dark:bg-white/[0.025] dark:text-slate-400">
              Yeni görev <strong>Bekliyor</strong> durumunda oluşturulur.
              Durum daha sonra görev iş akışı üzerinden ilerletilir.
            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            MULTIPLE ASSIGNMENT
        ================================================== */}

        <Card>

          <Card.Header>

            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/[0.08] dark:text-violet-400">
                  <Users size={17} />
                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Görev Ataması
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    Görevden sorumlu bir veya birden fazla kullanıcı seçebilirsiniz
                  </p>

                </div>

              </div>

              {canAssignTasks &&
                formData.assignee_ids.length >
                  0 && (
                  <Badge
                    variant="primary"
                  >
                    {formData.assignee_ids.length}{' '}
                    kişi seçildi
                  </Badge>
                )}

            </div>

          </Card.Header>

          <Card.Body className="space-y-4">

            {canAssignTasks ? (
              <>

                {/* SELECT HEADER */}

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <div>

                    <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      Sorumlu Kişiler
                    </p>

                    <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                      Görevi birlikte yürütecek tüm kullanıcıları seçebilirsiniz.
                    </p>

                  </div>

                  {assignableUsers.length >
                    0 && (
                    <button
                      type="button"
                      onClick={
                        handleSelectAllAssignees
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
                        dark:border-white/[0.08]
                        dark:bg-white/[0.025]
                        dark:text-slate-400
                        dark:hover:border-blue-500/20
                        dark:hover:bg-blue-500/[0.06]
                        dark:hover:text-blue-400
                      "
                    >
                      {formData.assignee_ids.length ===
                      assignableUsers.length
                        ? 'Seçimi Temizle'
                        : 'Tümünü Seç'}
                    </button>
                  )}

                </div>

                {/* LOADING */}

                {assignableUsersLoading && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 text-center text-sm text-gray-500 dark:border-white/[0.06] dark:bg-white/[0.025] dark:text-slate-400">
                    Kullanıcılar yükleniyor...
                  </div>
                )}

                {assignableUsersError &&
                  !assignableUsersLoading && (
                    <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-500/20 dark:bg-red-500/[0.04]">
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        Atanabilir kullanıcılar yüklenemedi.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          refetchAssignableUsers()
                        }
                        className="mt-2 text-xs font-semibold text-red-700 underline underline-offset-2 dark:text-red-300"
                      >
                        Tekrar Dene
                      </button>
                    </div>
                  )}

                {/* EMPTY */}

                {!assignableUsersLoading &&
                  !assignableUsersError &&
                  assignableUsers.length ===
                    0 && (
                    <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500 dark:border-white/[0.08] dark:text-slate-400">
                      Görev atanabilecek aktif kullanıcı bulunamadı.
                    </div>
                  )}

                {/* USERS */}

                {!assignableUsersLoading &&
                  !assignableUsersError &&
                  assignableUsers.length >
                    0 && (
                    <div className="grid gap-2 sm:grid-cols-2">

                      {assignableUsers.map(
                        (
                          person
                        ) => {
                          const selected =
                            formData.assignee_ids
                              .map(String)
                              .includes(
                                String(
                                  person.id
                                )
                              );

                          return (
                            <button
                              key={
                                person.id
                              }
                              type="button"
                              onClick={() =>
                                handleAssigneeToggle(
                                  person.id
                                )
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

                              {/* AVATAR */}

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
                                {getInitials(
                                  person
                                )}
                              </div>

                              {/* USER */}

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

                                <div className="mt-1 flex flex-wrap items-center gap-1.5">

                                  <span className="text-xs text-gray-500 dark:text-slate-500">
                                    {getRoleLabel(
                                      person.role
                                    )}
                                  </span>

                                  {person.title && (
                                    <>
                                      <span className="text-gray-300 dark:text-slate-700">
                                        ·
                                      </span>

                                      <span className="truncate text-xs text-gray-400 dark:text-slate-500">
                                        {person.title}
                                      </span>
                                    </>
                                  )}

                                </div>

                              </div>

                              {/* CHECK */}

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

                {/* SELECTED USERS */}

                {selectedAssignees.length >
                  0 && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-500/15 dark:bg-blue-500/[0.04]">

                    <div className="mb-3 flex items-center justify-between gap-3">

                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                        Seçilen Sorumlular
                      </p>

                      <span className="text-xs text-blue-600/70 dark:text-blue-400/70">
                        {selectedAssignees.length}{' '}
                        kişi
                      </span>

                    </div>

                    <div className="flex flex-wrap gap-2">

                      {selectedAssignees.map(
                        (
                          person
                        ) => (
                          <button
                            key={
                              person.id
                            }
                            type="button"
                            onClick={() =>
                              handleAssigneeToggle(
                                person.id
                              )
                            }
                            className="
                              inline-flex
                              items-center
                              gap-2
                              rounded-full
                              border
                              border-blue-200
                              bg-white
                              px-2.5
                              py-1.5
                              text-xs
                              font-medium
                              text-blue-700
                              transition
                              hover:border-red-200
                              hover:bg-red-50
                              hover:text-red-600
                              dark:border-blue-500/20
                              dark:bg-white/[0.04]
                              dark:text-blue-300
                              dark:hover:border-red-500/20
                              dark:hover:bg-red-500/[0.06]
                              dark:hover:text-red-400
                            "
                            title="Seçimi kaldır"
                          >

                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700 dark:bg-blue-500/[0.12] dark:text-blue-300">
                              {getInitials(
                                person
                              )}
                            </span>

                            {person.first_name}{' '}
                            {person.last_name}

                          </button>
                        )
                      )}

                    </div>

                  </div>
                )}

                {formData.assignee_ids.length ===
                  0 &&
                  !assignableUsersLoading &&
                  !assignableUsersError && (
                    <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-700 dark:bg-amber-500/[0.06] dark:text-amber-300">
                      Henüz sorumlu seçilmedi. Görevi oluşturmak için en az 1 sorumlu seçmelisiniz.
                    </div>
                  )}

                {errors.assignee_ids && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.assignee_ids}
                  </p>
                )}

              </>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.025]">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 dark:bg-blue-500/[0.1] dark:text-blue-400">
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

                    <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                      Başka kullanıcıya görev atama yetkiniz olmadığı için görev size atanacaktır.
                    </p>

                  </div>

                </div>

                <Badge
                  variant="primary"
                  dot
                >
                  Kendin
                </Badge>

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

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400">
                <BriefcaseBusiness size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  İlişkili Kayıtlar
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Görevi danışmanlık, dava veya müvekkil kaydıyla ilişkilendirin
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
                  consultationsLoading ||
                  consultationsError ||
                  !canViewConsultations
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
                      : consultationsError
                        ? 'Danışmanlıklar yüklenemedi'
                        : 'Danışmanlık seçin (isteğe bağlı)'}
                </option>

                {canViewConsultations &&
                  consultations.map(
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

              {consultationsError &&
                canViewConsultations && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-red-600 dark:text-red-400">

                  <span>
                    Danışmanlık listesi yüklenemedi.
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      refetchConsultations()
                    }
                    className="font-semibold underline underline-offset-2"
                  >
                    Tekrar Dene
                  </button>

                </div>
              )}

              {errors.consultation_id && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {errors.consultation_id}
                </p>
              )}

              {formData.consultation_id &&
                selectedConsultationLoading && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                    Seçilen danışmanlık doğrulanıyor...
                  </p>
                )}

              {formData.consultation_id &&
                selectedConsultationError && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-red-600 dark:text-red-400">

                    <span>
                      Seçilen danışmanlık yüklenemedi.
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        refetchSelectedConsultation()
                      }
                      className="font-semibold underline underline-offset-2"
                    >
                      Tekrar Dene
                    </button>

                  </div>
                )}

              {selectedConsultation && (
                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-500/15 dark:bg-blue-500/[0.04]">

                  <div className="flex items-start gap-3">

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/[0.10] dark:text-blue-400">
                      <BriefcaseBusiness size={15} />
                    </div>

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
                    relationCasesError ||
                    !canViewCases ||
                    !formData.client_id
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
                    {!canViewCases
                      ? 'Dava görüntüleme yetkiniz yok'
                      : !formData.client_id
                        ? 'Önce müvekkil seçin'
                        : relationCasesLoading
                          ? 'Davalar yükleniyor...'
                          : relationCasesError
                            ? 'Davalar yüklenemedi'
                            : relationCases.length >
                              0
                            ? 'Dava seçin (isteğe bağlı)'
                            : 'Bu müvekkile ait dava bulunamadı'}
                  </option>

                  {canViewCases &&
                    relationCases.map(
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

                {relationCasesError &&
                  canViewCases &&
                  formData.client_id && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                      <span>
                        Müvekkilin dava listesi yüklenemedi.
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          refetchRelationCases()
                        }
                        className="font-semibold underline underline-offset-2"
                      >
                        Tekrar Dene
                      </button>
                    </div>
                  )}

                {errors.case_id && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    {errors.case_id}
                  </p>
                )}

                {!formData.client_id &&
                  canViewClients && (
                    <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                      Dava seçebilmek için önce ilişkili müvekkili seçin.
                    </p>
                  )}

                {isAiPrefill &&
                  canViewCases &&
                  formData.case_id && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">

                      <Sparkles className="h-3.5 w-3.5" />

                      AI önerisinin ilişkili davası otomatik seçildi.

                    </div>
                  )}

                {selectedCase && (
                  <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-white/[0.05] dark:bg-white/[0.025]">

                    <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                      {getCaseDisplayName(
                        selectedCase
                      )}
                    </p>

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
                    clientsLoading ||
                    clientsError ||
                    !canViewClients
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
                    {!canViewClients
                      ? 'Müvekkil görüntüleme yetkiniz yok'
                      : clientsLoading
                        ? 'Müvekkiller yükleniyor...'
                        : clientsError
                          ? 'Müvekkiller yüklenemedi'
                          : 'Müvekkil seçin (isteğe bağlı)'}
                  </option>

                  {canViewClients &&
                    clients.map(
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

                {clientsError &&
                  canViewClients && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                      <span>
                        Müvekkil listesi yüklenemedi.
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          refetchClients()
                        }
                        className="font-semibold underline underline-offset-2"
                      >
                        Tekrar Dene
                      </button>
                    </div>
                  )}

                {errors.client_id && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    {errors.client_id}
                  </p>
                )}

                {selectedClient && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-white/[0.05] dark:bg-white/[0.025]">

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
                      <UserRound size={15} />
                    </div>

                    <div className="min-w-0">

                      <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                        {selectedClient.name}
                      </p>

                      {selectedClient.company_name && (
                        <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-slate-500">
                          {selectedClient.company_name}
                        </p>
                      )}

                    </div>

                  </div>
                )}

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div className="flex flex-col-reverse gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33] sm:flex-row sm:items-center sm:justify-end">

          <Button
            type="button"
            variant="secondary"
            onClick={
              handleCancel
            }
            disabled={
              createMutation.isPending
            }
          >
            İptal
          </Button>

          <Button
            type="submit"
            loading={
              createMutation.isPending
            }
            disabled={
              createMutation.isPending
            }
          >
            <Save className="h-4 w-4" />

            Görevi Oluştur
          </Button>

        </div>

        </fieldset>

      </form>

      {leaveDialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[1px]"
            aria-label="Ayrılma uyarısını kapat"
            onClick={() =>
              setLeaveDialogOpen(
                false
              )
            }
          />

          <div
            ref={
              leaveDialogRef
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-create-leave-title"
            aria-describedby="task-create-leave-description"
            className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-white/[0.08] dark:bg-slate-900"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2
                  id="task-create-leave-title"
                  className="text-base font-semibold text-gray-900 dark:text-white"
                >
                  Kaydedilmemiş değişiklikler var
                </h2>

                <p
                  id="task-create-leave-description"
                  className="mt-2 text-sm leading-6 text-gray-500 dark:text-slate-400"
                >
                  Görev henüz oluşturulmadı. Bu sayfadan çıkarsanız yaptığınız değişiklikler kaybolur.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setLeaveDialogOpen(
                    false
                  )
                }
              >
                Düzenlemeye Devam Et
              </Button>

              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  setLeaveDialogOpen(
                    false
                  );

                  navigate(
                    pendingExitDestination
                  );
                }}
              >
                Değişiklikleri At ve Çık
              </Button>
            </div>
          </div>
        </div>
      )}

      {relationDialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[1px]"
            aria-label="Müvekkil değişikliği uyarısını kapat"
            onClick={() =>
              setRelationDialogOpen(
                false
              )
            }
          />

          <div
            ref={
              relationDialogRef
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-create-relation-title"
            aria-describedby="task-create-relation-description"
            className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-white/[0.08] dark:bg-slate-900"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2
                  id="task-create-relation-title"
                  className="text-base font-semibold text-gray-900 dark:text-white"
                >
                  Müvekkil değişikliği
                </h2>

                <p
                  id="task-create-relation-description"
                  className="mt-2 text-sm leading-6 text-gray-500 dark:text-slate-400"
                >
                  Müvekkili değiştirirseniz seçili dava ilişkisi temizlenecek. Yeni müvekkile geçmek istiyor musunuz?
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setRelationDialogOpen(
                    false
                  )
                }
              >
                Vazgeç
              </Button>

              <Button
                type="button"
                onClick={() => {
                  applyClientChange(
                    pendingClientId
                  );

                  setRelationDialogOpen(
                    false
                  );
                }}
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

export default TaskCreate;