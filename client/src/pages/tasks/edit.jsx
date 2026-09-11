import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  useTask,
  useUpdateTask,
  useDeleteTask,
  useAssignableUsers,
  useAssignTask,
} from '../../features/tasks/task.query.js';

import {
  useCases,
} from '../../features/cases/case.query.js';

import caseApi from '../../features/cases/case.api.js';

import {
  useClients,
  useClientCaseHistory,
} from '../../features/clients/client.query.js';

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
  CalendarDays,
  Check,
  CheckCircle2,
  FileLock2,
  Save,
  Trash2,
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
   * Eski:
   *
   * assigned_to: ''
   *
   * Yeni:
   *
   * assignee_ids: []
   */
  assignee_ids: [],

  case_id: '',
  client_id: '',
  estimated_hours: '',
};

const PRIORITY_LABELS = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  critical: 'Kritik',
};

// ======================================================
// HELPERS
// ======================================================

const normalizeId = (
  value
) => {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return '';
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
          (
            value
          ) =>
            normalizeId(
              value
            )
        )
        .filter(
          Boolean
        )
    ),
  ];
};

const getTaskAssigneeIds = (
  task
) => {
  if (
    Array.isArray(
      task?.assignees
    )
  ) {
    return normalizeIds(
      task.assignees.map(
        (
          person
        ) =>
          person?.id
      )
    );
  }

  /*
   * Geçiş dönemi fallback.
   *
   * Yeni backend assignees[] döndürür.
   */
  if (
    task?.assignee?.id
  ) {
    return [
      normalizeId(
        task.assignee.id
      ),
    ];
  }

  return [];
};

const arraysHaveSameValues = (
  first,
  second
) => {
  const a =
    normalizeIds(
      first
    ).sort();

  const b =
    normalizeIds(
      second
    ).sort();

  if (
    a.length !==
    b.length
  ) {
    return false;
  }

  return a.every(
    (
      value,
      index
    ) =>
      value ===
      b[index]
  );
};

const getUserName = (
  person,
  fallback = 'Kullanıcı'
) => {
  if (!person) {
    return fallback;
  }

  const name = [
    person.first_name,
    person.last_name,
  ]
    .filter(
      Boolean
    )
    .join(' ')
    .trim();

  return (
    name ||
    fallback
  );
};

const getUserInitials = (
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

  return (
    `${first}${last}`
      .toUpperCase() ||
    '?'
  );
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

const getRoleLabel = (
  role
) => {
  const labels = {
    admin:
      'Yönetici',

    lawyer:
      'Avukat',

    intern:
      'Stajyer',

    secretary:
      'Sekreter',
  };

  return (
    labels[
      role
    ] ||
    role ||
    'Kullanıcı'
  );
};

// ======================================================
// DATE
// ======================================================

const formatForDateTimeLocal = (
  date
) => {
  if (!date) {
    return '';
  }

  try {
    const parsed =
      new Date(
        date
      );

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return '';
    }

    const parts =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'Europe/Istanbul',

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit',

          hour:
            '2-digit',

          minute:
            '2-digit',

          hour12:
            false,
        }
      ).formatToParts(
        parsed
      );

    const map =
      {};

    for (
      const part
      of parts
    ) {
      if (
        part.type !==
        'literal'
      ) {
        map[
          part.type
        ] =
          part.value;
      }
    }

    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
  } catch {
    return '';
  }
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
// ======================================================
// STATUS
// ======================================================

const getDisplayStatus = (
  task
) => {
  if (
    task?.status ===
      'completed' &&
    !task?.approved_at
  ) {
    return {
      label:
        'Onay Bekliyor',

      variant:
        'warning',
    };
  }

  if (
    task?.approved_at
  ) {
    return {
      label:
        'Tamamlandı',

      variant:
        'success',
    };
  }

  switch (
    task?.status
  ) {
    case 'pending':
      return {
        label:
          'Bekliyor',

        variant:
          'warning',
      };

    case 'in_progress':
      return {
        label:
          'Devam Ediyor',

        variant:
          'info',
      };

    case 'completed':
      return {
        label:
          'Tamamlandı',

        variant:
          'success',
      };

    case 'cancelled':
      return {
        label:
          'İptal',

        variant:
          'danger',
      };

    default:
      return {
        label:
          task?.status ||
          'Bilinmiyor',

        variant:
          'default',
      };
  }
};

const getPriorityVariant = (
  priority
) => {
  switch (
    priority
  ) {
    case 'critical':
      return 'danger';

    case 'high':
      return 'warning';

    default:
      return 'default';
  }
};


const normalizeTaskFormForComparison = (
  value
) => {
  const estimatedHoursRaw =
    value?.estimated_hours;

  let estimatedHours =
    null;

  if (
    estimatedHoursRaw !== '' &&
    estimatedHoursRaw !== null &&
    estimatedHoursRaw !== undefined
  ) {
    const numericValue =
      Number(
        estimatedHoursRaw
      );

    estimatedHours =
      Number.isFinite(
        numericValue
      )
        ? numericValue
        : String(
            estimatedHoursRaw
          ).trim();
  }

  return {
    title:
      String(
        value?.title ||
        ''
      ).trim(),

    description:
      String(
        value?.description ||
        ''
      ).trim(),

    priority:
      value?.priority ||
      'normal',

    due_date:
      value?.due_date ||
      '',

    assignee_ids:
      normalizeIds(
        value?.assignee_ids
      ).sort(),

    case_id:
      normalizeId(
        value?.case_id
      ),

    client_id:
      normalizeId(
        value?.client_id
      ),

    estimated_hours:
      estimatedHours,
  };
};

const getTaskErrorMessage = (
  error,
  fallback
) => {
  const rawMessage =
    String(
      error?.response?.data?.message ||
      error?.message ||
      ''
    ).trim();

  if (!rawMessage) {
    return fallback;
  }

  if (
    /task.*not found|not found.*task/i.test(
      rawMessage
    )
  ) {
    return 'Görev kaydı bulunamadı.';
  }

  if (
    /forbidden|permission denied|not authorized|unauthorized|access denied/i.test(
      rawMessage
    )
  ) {
    return 'Bu görev için erişim yetkiniz bulunmuyor.';
  }

  if (
    /validation failed|validation error|sequelizevalidationerror|invalid input|cannot be null|must not be null/i.test(
      rawMessage
    )
  ) {
    return 'Görev bilgileri doğrulanamadı. Alanları kontrol edin.';
  }

  if (
    /network error|failed to fetch|timeout|econnrefused|enotfound/i.test(
      rawMessage
    )
  ) {
    return 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.';
  }

  const looksTurkish =
    /[çğıöşüÇĞİÖŞÜ]|bulunamadı|geçersiz|zorunlu|yetkiniz|başarısız|yüklenemedi|güncellenemedi|silinemedi|hata/i.test(
      rawMessage
    );

  return looksTurkish
    ? rawMessage
    : fallback;
};

const getFocusableElements = (
  container
) => {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    (element) =>
      !element.hasAttribute(
        'aria-hidden'
      )
  );
};

// ======================================================
// COMPONENT
// ======================================================

const TaskEdit = () => {
  const {
    id,
  } =
    useParams();

  const navigate =
    useNavigate();

  const {
    user,
  } =
    useAuth();

  const [
    formData,
    setFormData,
  ] =
    useState(
      INITIAL_FORM
    );

  const [
    initialFormData,
    setInitialFormData,
  ] =
    useState(
      INITIAL_FORM
    );

  const initializedTaskIdRef =
    useRef('');

  const [
    errors,
    setErrors,
  ] =
    useState({});

  const [
    deleteDialogOpen,
    setDeleteDialogOpen,
  ] =
    useState(false);

  const [
    leaveDialogOpen,
    setLeaveDialogOpen,
  ] =
    useState(false);

  const deleteDialogRef =
    useRef(null);

  const leaveDialogRef =
    useRef(null);

  const deletePreviousFocusRef =
    useRef(null);

  const leavePreviousFocusRef =
    useRef(null);

  // ====================================================
  // BASE PERMISSIONS
  // ====================================================

  const hasEditPermission =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_TASKS
    );

  const hasAssignPermission =
    hasPermission(
      user,
      PERMISSION_KEYS.ASSIGN_TASKS
    );

  const hasDeletePermission =
    hasPermission(
      user,
      PERMISSION_KEYS.DELETE_TASKS
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

  // ====================================================
  // QUERIES
  // ====================================================

  const {
    data,
    isLoading:
      taskLoading,
    error:
      taskError,
  } =
    useTask(
      id
    );

  const {
    data:
      assignableUsersData,
    isFetching:
      assignableUsersFetching,
  } =
    useAssignableUsers(
      hasAssignPermission
    );

  const {
    data:
      casesData,

    isLoading:
      casesLoading,
  } =
    useCases(
      {
        limit:
          100,
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
  } =
    useClients(
      {
        limit:
          100,
      },
      {
        enabled:
          canViewClients,
      }
    );


  const {
    data:
      clientCasesData,

    isLoading:
      clientCasesLoading,
  } =
    useClientCaseHistory(
      formData.client_id
    );

  const {
    data:
      selectedCaseData,

    isLoading:
      selectedCaseLoading,
  } =
    useQuery({
      queryKey: [
        'case',
        formData.case_id,
        'task-edit-relation',
      ],

      queryFn: () =>
        caseApi.getOne(
          formData.case_id
        ),

      enabled:
        canViewCases &&
        Boolean(
          formData.case_id
        ),

      staleTime:
        3 * 60 * 1000,
    });

  // ====================================================
  // MUTATIONS
  // ====================================================

  const updateMutation =
    useUpdateTask();

  const assignMutation =
    useAssignTask();

  const deleteMutation =
    useDeleteTask();

  // ====================================================
  // DATA
  // ====================================================

  const task =
    data?.data?.data;

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

  const selectedCaseDetail =
    selectedCaseData?.data?.data ??
    selectedCaseData?.data ??
    null;

  const caseClients =
    useMemo(() => {
      if (
        !selectedCaseDetail
      ) {
        return [];
      }

      const candidates = [
        selectedCaseDetail.clients,
        selectedCaseDetail.case_clients,
        selectedCaseDetail.related_clients,
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
          return candidate
            .map(
              (
                item
              ) =>
                item?.client ||
                item
            )
            .filter(
              (
                item
              ) =>
                item?.id
            );
        }
      }

      if (
        selectedCaseDetail.client?.id
      ) {
        return [
          selectedCaseDetail.client,
        ];
      }

      if (
        selectedCaseDetail.client_id
      ) {
        const matched =
          clients.find(
            (
              client
            ) =>
              String(
                client.id
              ) ===
              String(
                selectedCaseDetail.client_id
              )
          );

        return matched
          ? [
              matched,
            ]
          : [];
      }

      return [];
    }, [
      selectedCaseDetail,
      clients,
    ]);

  const relationCases =
    formData.client_id
      ? clientCases
      : cases;

  const relationCasesLoading =
    formData.client_id
      ? clientCasesLoading
      : casesLoading;

  const relationClients =
    formData.case_id
      ? caseClients
      : clients;

  const relationClientsLoading =
    formData.case_id
      ? selectedCaseLoading
      : clientsLoading;

  const selectedCase =
    useMemo(() => {
      return (
        relationCases.find(
          (
            item
          ) =>
            normalizeId(
              item.id
            ) ===
            normalizeId(
              formData.case_id
            )
        ) ||
        (
          selectedCaseDetail &&
          normalizeId(
            selectedCaseDetail.id
          ) ===
          normalizeId(
            formData.case_id
          )
            ? selectedCaseDetail
            : null
        )
      );
    }, [
      relationCases,
      selectedCaseDetail,
      formData.case_id,
    ]);

  const selectedClient =
    useMemo(() => {
      return clients.find(
        (
          item
        ) =>
          normalizeId(
            item.id
          ) ===
          normalizeId(
            formData.client_id
          )
      );
    }, [
      clients,
      formData.client_id,
    ]);

  // ====================================================
  // WORKFLOW + PERMISSIONS
  // ====================================================

  const permissions =
    useMemo(
      () => {
        const awaitingApproval =
          task?.status ===
            'completed' &&
          !task?.approved_at;

        const approved =
          Boolean(
            task?.approved_at
          );

        const cancelled =
          task?.status ===
          'cancelled';

        const workflowLocked =
          awaitingApproval ||
          approved ||
          cancelled;

        return {
          awaitingApproval,
          approved,
          cancelled,
          workflowLocked,

          canEdit:
            hasEditPermission &&
            !workflowLocked,

          canChangeAssignee:
            hasAssignPermission &&
            !workflowLocked,

          canDelete:
            hasDeletePermission &&
            !approved,
        };
      },
      [
        task,
        hasEditPermission,
        hasAssignPermission,
        hasDeletePermission,
      ]
    );

  const {
    awaitingApproval,
    approved,
    cancelled,
    workflowLocked,

    canEdit,
    canChangeAssignee,
    canDelete,
  } =
    permissions;

  // ====================================================
  // STATUS
  // ====================================================

  const displayStatus =
    useMemo(
      () =>
        getDisplayStatus(
          task
        ),
      [
        task,
      ]
    );

  // ====================================================
  // FORM INIT
  // ====================================================

  useEffect(
    () => {
      const taskId =
        normalizeId(
          task?.id ??
          id
        );

      if (
        !task ||
        !taskId ||
        initializedTaskIdRef.current ===
          taskId
      ) {
        return;
      }

      const nextForm = {
        title:
          task.title ||
          '',

        description:
          task.description ||
          '',

        priority:
          task.priority ||
          'normal',

        due_date:
          formatForDateTimeLocal(
            task.due_date
          ),

        assignee_ids:
          getTaskAssigneeIds(
            task
          ),

        case_id:
          normalizeId(
            task.case_id
          ),

        client_id:
          normalizeId(
            task.client_id
          ),

        estimated_hours:
          task.estimated_hours ??
          '',
      };

      setFormData(
        nextForm
      );

      setInitialFormData(
        nextForm
      );

      setErrors({});

      initializedTaskIdRef.current =
        taskId;
    },
    [
      task,
      id,
    ]
  );

  const normalizedForm =
    useMemo(
      () =>
        normalizeTaskFormForComparison(
          formData
        ),
      [
        formData,
      ]
    );

  const initialNormalizedForm =
    useMemo(
      () =>
        normalizeTaskFormForComparison(
          initialFormData
        ),
      [
        initialFormData,
      ]
    );

  const assignmentChanged =
    canChangeAssignee &&
    !arraysHaveSameValues(
      normalizedForm.assignee_ids,
      initialNormalizedForm.assignee_ids
    );

  const generalChanged =
    canEdit &&
    (
      normalizedForm.title !==
        initialNormalizedForm.title ||
      normalizedForm.description !==
        initialNormalizedForm.description ||
      normalizedForm.priority !==
        initialNormalizedForm.priority ||
      normalizedForm.due_date !==
        initialNormalizedForm.due_date ||
      normalizedForm.estimated_hours !==
        initialNormalizedForm.estimated_hours ||
      (
        canViewCases &&
        normalizedForm.case_id !==
          initialNormalizedForm.case_id
      ) ||
      (
        canViewClients &&
        normalizedForm.client_id !==
          initialNormalizedForm.client_id
      )
    );

  const isDirty =
    Boolean(
      generalChanged ||
      assignmentChanged
    );

  const isPending =
    updateMutation.isPending ||
    assignMutation.isPending ||
    deleteMutation.isPending;

  useEffect(() => {
    const handleBeforeUnload =
      (event) => {
        if (!isDirty) {
          return;
        }

        event.preventDefault();
        event.returnValue = '';
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
  ]);

  // ====================================================
  // SELECTED ASSIGNEES
  // ====================================================

  const selectedAssignees =
    useMemo(
      () => {
        /*
         * assignable-users yalnız yetkili kullanıcıya
         * çağrıldığı için izin yoksa task.assignees
         * üzerinden gösteriyoruz.
         */
        if (
          !canChangeAssignee
        ) {
          return Array.isArray(
            task?.assignees
          )
            ? task.assignees
            : task?.assignee
              ? [
                  task.assignee,
                ]
              : [];
        }

        return assignableUsers.filter(
          (
            person
          ) =>
            formData.assignee_ids.includes(
              normalizeId(
                person.id
              )
            )
        );
      },
      [
        task,
        assignableUsers,
        formData.assignee_ids,
        canChangeAssignee,
      ]
    );

  // ====================================================
  // CHANGE
  // ====================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } =
      event.target;

    if (
      !canEdit
    ) {
      return;
    }

    if (
      name ===
        'case_id' &&
      !canViewCases
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

    setFormData(
      (
        current
      ) => {
        if (
          name ===
          'client_id'
        ) {
          const currentCaseStillValid =
            !current.case_id ||
            caseClients.some(
              (
                client
              ) =>
                normalizeId(
                  client.id
                ) ===
                normalizeId(
                  value
                )
            );

          return {
            ...current,

            client_id:
              value,

            case_id:
              currentCaseStillValid
                ? current.case_id
                : '',
          };
        }

        if (
          name ===
          'case_id'
        ) {
          const currentClientStillValid =
            !current.client_id ||
            clientCases.some(
              (
                caseItem
              ) =>
                normalizeId(
                  caseItem.id
                ) ===
                normalizeId(
                  value
                )
            );

          return {
            ...current,

            case_id:
              value,

            client_id:
              currentClientStillValid
                ? current.client_id
                : '',
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
      errors[
        name
      ]
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

  const handleAssigneeToggle = (
    userId
  ) => {
    if (
      !canChangeAssignee
    ) {
      return;
    }

    const normalizedId =
      normalizeId(
        userId
      );

    setFormData(
      (
        current
      ) => {
        const exists =
          current.assignee_ids.includes(
            normalizedId
          );

        return {
          ...current,

          assignee_ids:
            exists
              ? current.assignee_ids.filter(
                  (
                    idValue
                  ) =>
                    idValue !==
                    normalizedId
                )
              : [
                  ...current.assignee_ids,
                  normalizedId,
                ],
        };
      }
    );
  };

  const handleSelectAllAssignees =
    () => {
      if (
        !canChangeAssignee
      ) {
        return;
      }

      const allIds =
        normalizeIds(
          assignableUsers.map(
            (
              person
            ) =>
              person.id
          )
        );

      const allSelected =
        arraysHaveSameValues(
          formData.assignee_ids,
          allIds
        );

      setFormData(
        (
          current
        ) => ({
          ...current,

          assignee_ids:
            allSelected
              ? []
              : allIds,
        })
      );
    };

  // ====================================================
  // LEAVE PROTECTION
  // ====================================================

  const requestLeave =
    () => {
      if (isPending) {
        return;
      }

      if (!isDirty) {
        navigate(
          `/tasks/${id}`
        );

        return;
      }

      setLeaveDialogOpen(
        true
      );
    };

  const handleProtectedDetailLink =
    (event) => {
      if (isPending) {
        event.preventDefault();
        return;
      }

      if (!isDirty) {
        return;
      }

      event.preventDefault();

      setLeaveDialogOpen(
        true
      );
    };

  const handleCloseLeaveDialog =
    () => {
      if (isPending) {
        return;
      }

      setLeaveDialogOpen(
        false
      );
    };

  const handleDiscardAndLeave =
    () => {
      if (isPending) {
        return;
      }

      setLeaveDialogOpen(
        false
      );

      navigate(
        `/tasks/${id}`
      );
    };

  // ====================================================
  // VALIDATION
  // ====================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      if (
        !formData
          .title
          .trim()
      ) {
        nextErrors.title =
          'Görev adı gereklidir';
      }

      if (
        formData
          .estimated_hours !==
        ''
      ) {
        const hours =
          Number(
            formData
              .estimated_hours
          );

        if (
          !Number.isFinite(
            hours
          ) ||
          hours < 0
        ) {
          nextErrors.estimated_hours =
            'Tahmini süre 0 veya daha büyük olmalıdır';
        }
      }

      setErrors(
        nextErrors
      );

      return (
        Object.keys(
          nextErrors
        ).length ===
        0
      );
    };

  // ====================================================
  // SUBMIT
  // ====================================================

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        workflowLocked
      ) {
        toast.error(
          'Bu görev mevcut iş akışı durumunda düzenlenemez.'
        );

        return;
      }

      if (
        !canEdit &&
        !canChangeAssignee
      ) {
        toast.error(
          'Bu görev üzerinde değişiklik yapma yetkiniz bulunmuyor.'
        );

        return;
      }

      if (
        canEdit &&
        !validateForm()
      ) {
        return;
      }

      // ==================================================
      // GENERAL UPDATE
      // ==================================================

      const updateData =
        {};

      if (
        canEdit
      ) {
        updateData.title =
          formData
            .title
            .trim();

        updateData.description =
          formData
            .description
            .trim() ||
          null;

        updateData.priority =
          formData.priority;

        updateData.due_date =
  localToUTC(
    formData.due_date
  );

        updateData.estimated_hours =
          formData
            .estimated_hours !==
          ''
            ? Number(
                formData
                  .estimated_hours
              )
            : null;

        if (
          canViewCases
        ) {
          updateData.case_id =
            formData.case_id ||
            null;
        }

        if (
          canViewClients
        ) {
          updateData.client_id =
            formData.client_id ||
            null;
        }
      }

      // ==================================================
      // MULTIPLE ASSIGNMENT
      // ==================================================

      const requestedAssigneeIds =
        normalizeIds(
          formData.assignee_ids
        );

      /*
       * Controller tarafında assign endpoint'i boş
       * array kabul etmiyor.
       *
       * Bu yüzden düzenleme ekranında son sorumluyu
       * kaldırmaya izin vermiyoruz.
       */
      if (
        assignmentChanged &&
        requestedAssigneeIds.length ===
          0
      ) {
        toast.error(
          'Görevde en az bir sorumlu kullanıcı bulunmalıdır.'
        );

        return;
      }

      const hasGeneralUpdate =
        Boolean(
          canEdit &&
          generalChanged
        );

      if (
        !hasGeneralUpdate &&
        !assignmentChanged
      ) {
        toast(
          'Kaydedilecek bir değişiklik bulunmuyor'
        );

        return;
      }

      try {
        if (
          hasGeneralUpdate
        ) {
          await updateMutation.mutateAsync({
            id,

            data:
              updateData,
          });
        }

        if (
          assignmentChanged
        ) {
          await assignMutation.mutateAsync({
            id,

            assignee_ids:
              requestedAssigneeIds,
          });
        }

        navigate(
          `/tasks/${id}`
        );
      } catch {
        /*
         * Toast mesajları mutation hook'larında
         * gösteriliyor.
         */
      }
    };

  // ====================================================
  // DELETE
  // ====================================================

  const handleDelete =
    () => {
      if (
        !canDelete
      ) {
        toast.error(
          'Bu görevi silme yetkiniz bulunmuyor.'
        );

        return;
      }

      if (
        updateMutation.isPending ||
        assignMutation.isPending ||
        deleteMutation.isPending
      ) {
        return;
      }

      setDeleteDialogOpen(
        true
      );
    };

  const handleCloseDeleteDialog =
    () => {
      if (
        deleteMutation.isPending
      ) {
        return;
      }

      setDeleteDialogOpen(
        false
      );
    };

  const handleConfirmDelete =
    () => {
      if (
        !deleteDialogOpen ||
        deleteMutation.isPending
      ) {
        return;
      }

      deleteMutation.mutate(
        id,
        {
          onSuccess:
            () => {
              setDeleteDialogOpen(
                false
              );

              navigate(
                '/tasks'
              );
            },
        }
      );
    };

  useEffect(() => {
    if (
      !deleteDialogOpen
    ) {
      return undefined;
    }

    deletePreviousFocusRef.current =
      document.activeElement;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    const focusDialog =
      () => {
        const focusable =
          getFocusableElements(
            deleteDialogRef.current
          );

        focusable[0]?.focus();
      };

    const frame =
      window.requestAnimationFrame(
        focusDialog
      );

    const handleKeyDown =
      (event) => {
        if (
          event.key ===
            'Escape' &&
          !deleteMutation.isPending
        ) {
          event.preventDefault();
          setDeleteDialogOpen(false);
          return;
        }

        if (
          event.key !== 'Tab'
        ) {
          return;
        }

        const focusable =
          getFocusableElements(
            deleteDialogRef.current
          );

        if (focusable.length === 0) {
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

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.cancelAnimationFrame(
        frame
      );

      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;

      const previousFocus =
        deletePreviousFocusRef.current;

      if (
        previousFocus &&
        typeof previousFocus.focus ===
          'function'
      ) {
        previousFocus.focus();
      }
    };
  }, [
    deleteDialogOpen,
    deleteMutation.isPending,
  ]);

  useEffect(() => {
    if (!leaveDialogOpen) {
      return undefined;
    }

    leavePreviousFocusRef.current =
      document.activeElement;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    const focusDialog =
      () => {
        const focusable =
          getFocusableElements(
            leaveDialogRef.current
          );

        focusable[0]?.focus();
      };

    const frame =
      window.requestAnimationFrame(
        focusDialog
      );

    const handleKeyDown =
      (event) => {
        if (
          event.key ===
            'Escape' &&
          !isPending
        ) {
          event.preventDefault();
          setLeaveDialogOpen(false);
          return;
        }

        if (
          event.key !== 'Tab'
        ) {
          return;
        }

        const focusable =
          getFocusableElements(
            leaveDialogRef.current
          );

        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusable[0];
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

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.cancelAnimationFrame(
        frame
      );

      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;

      const previousFocus =
        leavePreviousFocusRef.current;

      if (
        previousFocus &&
        typeof previousFocus.focus ===
          'function'
      ) {
        previousFocus.focus();
      }
    };
  }, [
    leaveDialogOpen,
    isPending,
  ]);

  // ====================================================
  // LOADING
  // ====================================================

  if (
    taskLoading
  ) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Görev bilgileri yükleniyor...
          </p>

        </div>

      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (
    taskError ||
    !task
  ) {
    return (
      <div className="py-12 text-center">

        <div className="mb-4 text-5xl">
          📋
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Görev Bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {getTaskErrorMessage(
            taskError,
            'Görev bilgileri yüklenemedi'
          )}
        </p>

        <Link
          to="/tasks"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Görevlere Dön
        </Link>

      </div>
    );
  }

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
          to={`/tasks/${id}`}
          onClick={
            handleProtectedDetailLink
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

          Görev Detayı
        </Link>

        <div className="mt-3">

          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
            Görev Düzenle
          </h1>

          <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-400">
            {task.title}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">

            <Badge
              variant={
                displayStatus.variant
              }
            >
              {displayStatus.label}
            </Badge>

            <Badge
              variant={
                getPriorityVariant(
                  task.priority
                )
              }
            >
              {PRIORITY_LABELS[
                task.priority
              ] ||
                task.priority}
            </Badge>

            {isDirty && (
              <Badge variant="warning">
                Kaydedilmemiş değişiklik
              </Badge>
            )}

            {approved && (
              <Badge variant="success">
                Onaylandı
              </Badge>
            )}

          </div>

        </div>

      </div>

      {/* ==================================================
          WORKFLOW WARNINGS
      ================================================== */}

      {awaitingApproval && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.06]">

          <div className="flex items-start gap-3">

            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />

            <div>

              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Görev onay bekliyor
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-300">
                Çalışma tamamlanmak üzere gönderildi. Onay tamamlanana kadar görev bilgileri değiştirilemez.
              </p>

            </div>

          </div>

        </div>
      )}

      {approved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]">

          <div className="flex items-start gap-3">

            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />

            <div>

              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Görev tamamlandı ve onaylandı
              </p>

              <p className="mt-1 text-sm leading-6 text-emerald-800 dark:text-emerald-300">
                Onaylanan görevlerin bilgileri normal düzenleme ekranından değiştirilemez.
              </p>

            </div>

          </div>

        </div>
      )}

      {cancelled && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/[0.06]">

          <div className="flex items-start gap-3">

            <FileLock2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

            <div>

              <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                Görev iptal edilmiş
              </p>

              <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-300">
                İptal edilen görevlerin içeriği bu ekrandan değiştirilemez.
              </p>

            </div>

          </div>

        </div>
      )}

      {/* ==================================================
          FORM
      ================================================== */}

      <Card className="overflow-hidden border border-gray-200 shadow-sm dark:border-white/[0.06]">

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6 p-5 md:p-6"
        >

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
            disabled={
              !canEdit
            }
            placeholder="Görev başlığı..."
          />

          {/* DESCRIPTION */}

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
              rows={5}
              disabled={
                !canEdit
              }
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
                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-500/10
                disabled:cursor-not-allowed
                disabled:bg-gray-100
                disabled:text-gray-500
                dark:border-white/[0.08]
                dark:bg-white/[0.035]
                dark:text-white
                dark:disabled:bg-white/[0.02]
              "
            />

          </div>

          {/* STATUS */}

          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">

            <div className="flex items-center justify-between gap-4">

              <div>

                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Görev Durumu
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-400">
                  Durum bu ekrandan değiştirilmez. Başlatma, tamamlama ve onay işlemleri görev iş akışı üzerinden yönetilir.
                </p>

              </div>

              <Badge
                variant={
                  displayStatus.variant
                }
              >
                {displayStatus.label}
              </Badge>

            </div>

          </div>

          {/* PRIORITY / DATE */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

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
                disabled={
                  !canEdit
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  text-gray-900
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  disabled:cursor-not-allowed
                  disabled:bg-gray-100
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                "
              >

                <option value="low">
                  Düşük
                </option>

                <option value="normal">
                  Normal
                </option>

                <option value="high">
                  Yüksek
                </option>

                <option value="critical">
                  Kritik
                </option>

              </select>

            </div>

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">

                <span className="inline-flex items-center gap-1.5">

                  <CalendarDays className="h-4 w-4 text-gray-400" />

                  Son Tarih

                </span>

              </label>

              <input
                type="datetime-local"
                name="due_date"
                value={
                  formData.due_date
                }
                onChange={
                  handleChange
                }
                disabled={
                  !canEdit
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  text-gray-900
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  disabled:cursor-not-allowed
                  disabled:bg-gray-100
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                "
              />

            </div>

          </div>

          {/* HOURS */}

          <Input
            label="Tahmini Süre"
            type="number"
            name="estimated_hours"
            value={
              formData.estimated_hours
            }
            onChange={
              handleChange
            }
            min="0"
            step="0.25"
            disabled={
              !canEdit
            }
            error={
              errors.estimated_hours
            }
            placeholder="Örn: 2.5"
          />

          {/* ==================================================
              MULTIPLE ASSIGNEES
          ================================================== */}

          <div className="space-y-3">

            <div className="flex flex-wrap items-start justify-between gap-3">

              <div>

                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">

                  <span className="inline-flex items-center gap-1.5">

                    <Users className="h-4 w-4 text-gray-400" />

                    Atanan Kişiler

                  </span>

                </label>

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  Görevi bir veya birden fazla kullanıcıya atayabilirsiniz.
                </p>

              </div>

              {formData.assignee_ids.length >
                0 && (
                <Badge variant="primary">
                  {formData.assignee_ids.length}{' '}
                  kişi
                </Badge>
              )}

            </div>

            {canChangeAssignee ? (
              <>

                <div className="flex justify-end">

                  {assignableUsers.length >
                    0 && (
                    <button
                      type="button"
                      onClick={
                        handleSelectAllAssignees
                      }
                      disabled={
                        assignableUsersFetching
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
                      {formData.assignee_ids.length ===
                      assignableUsers.length
                        ? 'Seçimi Temizle'
                        : 'Tümünü Seç'}
                    </button>
                  )}

                </div>

                {assignableUsersFetching ? (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 text-center text-sm text-gray-500 dark:border-white/[0.06] dark:bg-white/[0.025] dark:text-slate-400">
                    Kullanıcılar yükleniyor...
                  </div>
                ) : assignableUsers.length ===
                  0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500 dark:border-white/[0.08] dark:text-slate-400">
                    Görev atanabilecek aktif kullanıcı bulunamadı.
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">

                    {assignableUsers.map(
                      (
                        person
                      ) => {
                        const personId =
                          normalizeId(
                            person.id
                          );

                        const selected =
                          formData.assignee_ids.includes(
                            personId
                          );

                        return (
                          <button
                            key={
                              person.id
                            }
                            type="button"
                            onClick={() =>
                              handleAssigneeToggle(
                                personId
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
                              {getUserInitials(
                                person
                              )}
                            </div>

                            <div className="min-w-0 flex-1">

                              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {getUserName(
                                  person
                                )}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-slate-500">
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

                {selectedAssignees.length >
                  0 && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-500/15 dark:bg-blue-500/[0.04]">

                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                      Seçilen Sorumlular
                    </p>

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
                            title="Seçimi kaldır"
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
                          >

                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700 dark:bg-blue-500/[0.12] dark:text-blue-300">
                              {getUserInitials(
                                person
                              )}
                            </span>

                            {getUserName(
                              person
                            )}

                          </button>
                        )
                      )}

                    </div>

                  </div>
                )}

                {formData.assignee_ids.length ===
                  0 &&
                  !assignableUsersFetching && (
                    <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:bg-amber-500/[0.06] dark:text-amber-300">
                      En az bir sorumlu kullanıcı seçmelisiniz.
                    </div>
                  )}

              </>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">

                {selectedAssignees.length ===
                0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Atanmış kullanıcı bulunmuyor.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">

                    {selectedAssignees.map(
                      (
                        person
                      ) => (
                        <div
                          key={
                            person.id
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 dark:border-white/[0.07] dark:bg-white/[0.03]"
                        >

                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[9px] font-bold text-blue-700 dark:bg-blue-500/[0.1] dark:text-blue-300">
                            {getUserInitials(
                              person
                            )}
                          </div>

                          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                            {getUserName(
                              person
                            )}
                          </span>

                        </div>
                      )
                    )}

                  </div>
                )}

                <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                  <UserRound className="h-3.5 w-3.5" />
                  Görev atamasını değiştirme yetkiniz bulunmuyor.
                </p>

              </div>
            )}

          </div>

          {/* RELATED */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

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
                  !canEdit ||
                  !canViewCases ||
                  relationCasesLoading
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  text-gray-900
                  outline-none
                  disabled:cursor-not-allowed
                  disabled:bg-gray-100
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                "
              >

                <option value="">
                  {relationCasesLoading
                    ? 'Davalar yükleniyor...'
                    : formData.client_id &&
                        relationCases.length ===
                          0
                      ? 'Bu müvekkile ait dava bulunamadı'
                      : 'Dava seçin'}
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
                          normalizeId(
                            caseItem.id
                          )
                        }
                      >
                        {getCaseDisplayName(
                          caseItem
                        )}
                      </option>
                    )
                  )}

              </select>

              {selectedCase && (
                <div className="mt-2">

                  <p className="truncate text-xs font-medium text-gray-500 dark:text-slate-400">
                    Seçili: {getCaseDisplayName(
                      selectedCase
                    )}
                  </p>

                  {getCaseSecondaryInfo(
                    selectedCase
                  ) && (
                    <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-slate-500">
                      {getCaseSecondaryInfo(
                        selectedCase
                      )}
                    </p>
                  )}

                </div>
              )}

              {!canViewCases && (
                <p className="mt-1.5 text-xs text-gray-400">
                  Dava kayıtlarını görüntüleme yetkiniz bulunmuyor.
                </p>
              )}

            </div>

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
                  !canEdit ||
                  !canViewClients ||
                  relationClientsLoading
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  text-gray-900
                  outline-none
                  disabled:cursor-not-allowed
                  disabled:bg-gray-100
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                "
              >

                <option value="">
                  {relationClientsLoading
                    ? 'Müvekkiller yükleniyor...'
                    : formData.case_id &&
                        relationClients.length ===
                          0
                      ? 'Bu davaya bağlı müvekkil bulunamadı'
                      : 'Müvekkil seçin'}
                </option>

                {canViewClients &&
                  relationClients.map(
                    (
                      client
                    ) => (
                      <option
                        key={
                          client.id
                        }
                        value={
                          normalizeId(
                            client.id
                          )
                        }
                      >
                        {client.name}
                      </option>
                    )
                  )}

              </select>

              {selectedClient && (
                <p className="mt-2 truncate text-xs text-gray-400 dark:text-slate-500">
                  Seçili: {selectedClient.name}
                </p>
              )}

              {!canViewClients && (
                <p className="mt-1.5 text-xs text-gray-400">
                  Müvekkil kayıtlarını görüntüleme yetkiniz bulunmuyor.
                </p>
              )}

            </div>

          </div>

          {/* ACTIONS */}

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between">

            <div className="flex flex-wrap gap-2">

              {(canEdit ||
                canChangeAssignee) && (
                <Button
                  type="submit"
                  loading={
                    updateMutation.isPending ||
                    assignMutation.isPending
                  }
                  disabled={
                    isPending ||
                    workflowLocked ||
                    !isDirty
                  }
                >
                  <Save className="mr-2 h-4 w-4" />

                  Değişiklikleri Kaydet
                </Button>
              )}

              <Button
                type="button"
                variant="secondary"
                onClick={
                  requestLeave
                }
                disabled={
                  isPending
                }
              >
                Vazgeç
              </Button>

            </div>

            {canDelete && (
              <Button
                type="button"
                variant="danger"
                onClick={
                  handleDelete
                }
                loading={
                  deleteMutation.isPending
                }
                disabled={
                  isPending
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />

                Görevi Sil
              </Button>
            )}

          </div>

          {workflowLocked && (
            <p className="text-xs leading-5 text-gray-400">
              Bu görevin iş akışı tamamlanmış veya kilitli durumda olduğu için normal düzenleme alanları devre dışıdır.
            </p>
          )}

        </form>

      </Card>

      {leaveDialogOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Kaydedilmemiş değişiklikler penceresini kapat"
            disabled={
              isPending
            }
            onClick={
              handleCloseLeaveDialog
            }
          />

          <div
            ref={
              leaveDialogRef
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-leave-dialog-title"
            aria-describedby="task-leave-dialog-description"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]"
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
                    id="task-leave-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Düzenlemeden çıkmak istiyor musunuz?
                  </h2>

                  <p
                    id="task-leave-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    Görev üzerinde kaydedilmemiş değişiklikler var. Çıkarsanız bu değişiklikler kaybolacaktır.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.07]">
                <p className="text-sm leading-6 text-amber-900 dark:text-amber-200">
                  Düzenlemeye devam ederek değişikliklerinizi kaydedebilir veya değişiklikleri atarak görev detayına dönebilirsiniz.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.015] sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={
                  isPending
                }
                onClick={
                  handleCloseLeaveDialog
                }
              >
                Düzenlemeye Devam Et
              </Button>

              <Button
                type="button"
                variant="danger"
                disabled={
                  isPending
                }
                onClick={
                  handleDiscardAndLeave
                }
              >
                Değişiklikleri At ve Çık
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Silme penceresini kapat"
            disabled={
              deleteMutation.isPending
            }
            onClick={
              handleCloseDeleteDialog
            }
          />

          <div
            ref={
              deleteDialogRef
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-delete-dialog-title"
            aria-describedby="task-delete-dialog-description"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]"
          >
            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/[0.10] dark:text-red-400">
                  <Trash2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">

                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                    Görev silme onayı
                  </p>

                  <h2
                    id="task-delete-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Görev kaydını sil
                  </h2>

                  <p
                    id="task-delete-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    <span className="font-medium text-gray-700 dark:text-slate-200">
                      {task?.title ||
                        'Seçili görev'}
                    </span>{' '}
                    için bu işlemi onaylayın.
                  </p>

                </div>

              </div>

            </div>

            <div className="space-y-4 px-6 py-5">

              <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-500/20 dark:bg-red-500/[0.07]">

                <div className="flex items-start gap-3">

                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

                  <div>

                    <p className="text-sm font-semibold text-red-950 dark:text-red-200">
                      Görev kaydı silinecek
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-900/80 dark:text-red-200/80">
                      Bu görev, görev listelerinden ve ilgili iş akışı ekranlarından kaldırılacaktır.
                    </p>

                  </div>

                </div>

              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">

                <p className="text-sm leading-6 text-gray-600 dark:text-slate-300">
                  Devam etmeden önce doğru görev kaydını seçtiğinizden emin olun.
                </p>

              </div>

            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.015] sm:flex-row sm:justify-end">

              <Button
                type="button"
                variant="secondary"
                disabled={
                  deleteMutation.isPending
                }
                onClick={
                  handleCloseDeleteDialog
                }
              >
                Vazgeç
              </Button>

              <Button
                type="button"
                variant="danger"
                loading={
                  deleteMutation.isPending
                }
                disabled={
                  deleteMutation.isPending
                }
                onClick={
                  handleConfirmDelete
                }
              >
                <Trash2 className="h-4 w-4" />

                Görevi Sil
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default TaskEdit;