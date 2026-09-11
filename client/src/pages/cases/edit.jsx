import {
  useEffect,
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

import caseApi from '../../features/cases/case.api.js';

import {
  useCase,
  useDeleteCase,
  useUpdateCase,
} from '../../features/cases/case.query.js';

import clientApi from '../../features/clients/client.api.js';

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
  CalendarDays,
  Gavel,
  Plus,
  Save,
  Scale,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const INITIAL_FORM = {
  judiciary_type: '',
  judiciary_unit: '',
  court_name: '',
  case_number: '',
  client_ids: [],
  assigned_to: '',
  status: 'preparation',
  priority: 'normal',
  subject: '',
  description: '',
  opening_date: '',
};

const STATUS_OPTIONS = [
  {
    value: 'preparation',
    label: 'Hazırlık',
  },
  {
    value: 'active',
    label: 'Devam Ediyor',
  },
  {
    value: 'hearing',
    label: 'Duruşmada',
  },
  {
    value: 'appeal',
    label: 'İstinaf',
  },
  {
    value: 'cassation',
    label: 'Temyiz',
  },
  {
    value: 'concluded',
    label: 'Sonuçlandı',
  },
  {
    value: 'archived',
    label: 'Arşivlendi',
  },
];

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

const getStatusVariant = (
  status
) => {
  const variants = {
    preparation: 'warning',
    active: 'success',
    hearing: 'info',
    appeal: 'warning',
    cassation: 'default',
    suspended: 'warning',
    concluded: 'default',
    archived: 'danger',
  };

  return (
    variants[status] ||
    'default'
  );
};

const getStatusLabel = (
  status
) => {
  if (
    status ===
    'suspended'
  ) {
    return 'Durduruldu';
  }

  return (
    STATUS_OPTIONS.find(
      (
        item
      ) =>
        item.value ===
        status
    )?.label ||
    status
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

const getPriorityLabel = (
  priority
) => {
  return (
    PRIORITY_OPTIONS.find(
      (
        item
      ) =>
        item.value ===
        priority
    )?.label ||
    priority
  );
};

const normalizeText = (
  value
) => {
  return String(
    value || ''
  )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
};

const normalizeNullable = (
  value
) => {
  const normalized =
    normalizeText(
      value
    );

  return (
    normalized ||
    null
  );
};

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

const getArrayPayload = (
  response
) => {
  const payload =
    response?.data?.data ??
    response?.data ??
    response ??
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

const getCaseClientIds = (
  caseItem
) => {
  if (
    Array.isArray(
      caseItem?.clients
    )
  ) {
    return normalizeIds(
      caseItem.clients.map(
        (client) =>
          client?.id ??
          client
      )
    );
  }

  if (
    Array.isArray(
      caseItem?.client_ids
    )
  ) {
    return normalizeIds(
      caseItem.client_ids
    );
  }

  const singleClientId =
    normalizeId(
      caseItem?.client_id ??
      caseItem?.client?.id
    );

  return singleClientId
    ? [
        singleClientId,
      ]
    : [];
};

const getIstanbulTodayDateOnly =
  () => {
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
        }
      ).formatToParts(
        new Date()
      );

    const getPart =
      (
        type
      ) =>
        parts.find(
          (
            part
          ) =>
            part.type ===
            type
        )?.value;

    return `${getPart(
      'year'
    )}-${getPart(
      'month'
    )}-${getPart(
      'day'
    )}`;
  };

const isFutureDate =
  (
    value
  ) => {
    if (!value) {
      return false;
    }

    const normalized =
      String(
        value
      ).trim();

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        normalized
      )
    ) {
      return false;
    }

    return (
      normalized >
      getIstanbulTodayDateOnly()
    );
  };

const formatDateInput = (
  value
) => {
  if (
    !value
  ) {
    return '';
  }

  const normalized =
    String(
      value
    ).trim();

  const match =
    normalized.match(
      /^(\d{4}-\d{2}-\d{2})/
    );

  return (
    match?.[1] ||
    ''
  );
};

const getCaseErrorMessage = (
  error,
  fallback
) => {
  const responseData =
    error?.response?.data;

  const rawMessage =
    String(
      responseData?.message ||
      error?.message ||
      ''
    ).trim();

  const validationMessages =
    Array.isArray(
      responseData?.errors
    )
      ? responseData.errors
          .map(
            (item) =>
              String(
                item?.message ||
                item?.msg ||
                ''
              ).trim()
          )
          .filter(Boolean)
      : [];

  const technicalMessage =
    [
      rawMessage,
      ...validationMessages,
    ]
      .filter(Boolean)
      .join(' ');

  if (!technicalMessage) {
    return fallback;
  }

  if (
    /validation failed|validation error|sequelizevalidationerror|notnull violation|cannot be null|must not be null|invalid input syntax|invalid date/i.test(
      technicalMessage
    )
  ) {
    return 'Dava bilgileri doğrulanamadı. Zorunlu ve geçerli alanları kontrol edin.';
  }

  if (
    /case.*not found|dava.*bulunamadı/i.test(
      technicalMessage
    )
  ) {
    return 'Dava kaydı bulunamadı.';
  }

  if (
    /client.*not found/i.test(
      technicalMessage
    )
  ) {
    return 'Seçilen müvekkil bulunamadı veya bu kayda erişim yetkiniz yok.';
  }

  if (
    /lawyer.*not found|assignee.*not found|assigned.*not found/i.test(
      technicalMessage
    )
  ) {
    return 'Seçilen avukat bulunamadı veya artık atanabilir değil.';
  }

  if (
    /forbidden|permission denied|not authorized|unauthorized|access denied/i.test(
      technicalMessage
    )
  ) {
    return 'Bu işlem için yetkiniz bulunmuyor.';
  }

  if (
    /invalid.*status/i.test(
      technicalMessage
    )
  ) {
    return 'Geçersiz dava durumu.';
  }

  if (
    /invalid.*priority/i.test(
      technicalMessage
    )
  ) {
    return 'Geçersiz öncelik değeri.';
  }

  if (
    /network error|failed to fetch|timeout|econnrefused|enotfound/i.test(
      technicalMessage
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

const getCaseFieldErrorMessage = (
  value,
  field
) => {
  const rawMessage =
    String(
      value ||
      ''
    ).trim();

  const fallbackByField = {
    judiciary_type:
      'Yargı türünü kontrol edin',
    judiciary_unit:
      'Yargı birimini kontrol edin',
    court_name:
      'Mahkeme bilgisini kontrol edin',
    case_number:
      'Dosya / esas numarasını kontrol edin',
    client_ids:
      'Müvekkil seçimini kontrol edin',
    assigned_to:
      'Atanan avukat seçimini kontrol edin',
    status:
      'Geçersiz dava durumu',
    priority:
      'Geçersiz öncelik değeri',
    subject:
      'Dava konusunu kontrol edin',
    description:
      'Açıklama alanını kontrol edin',
    opening_date:
      'Açılış tarihini kontrol edin',
  };

  const fallback =
    fallbackByField[field] ||
    'Geçersiz değer';

  if (!rawMessage) {
    return fallback;
  }

  const looksTurkish =
    /[çğıöşüÇĞİÖŞÜ]|geçersiz|zorunlu|olmalıdır|olamaz|bulunamadı|erişilebilir|atanabilir|kontrol/i.test(
      rawMessage
    );

  return looksTurkish
    ? rawMessage
    : fallback;
};

const getBackendFieldErrors = (
  error
) => {
  const backendErrors =
    error?.response
      ?.data?.errors;

  const nextErrors =
    {};

  if (
    Array.isArray(
      backendErrors
    )
  ) {
    backendErrors.forEach(
      (item) => {
        const field =
          item?.path ||
          item?.param ||
          item?.field;

        if (
          field
        ) {
          nextErrors[field] =
            getCaseFieldErrorMessage(
              item?.msg ||
                item?.message,
              field
            );
        }
      }
    );
  } else if (
    backendErrors &&
    typeof backendErrors ===
      'object'
  ) {
    Object.entries(
      backendErrors
    ).forEach(
      ([
        field,
        value,
      ]) => {
        if (
          Array.isArray(
            value
          )
        ) {
          nextErrors[field] =
            getCaseFieldErrorMessage(
              value
                .filter(Boolean)
                .join(', '),
              field
            );
        } else if (
          value
        ) {
          nextErrors[field] =
            getCaseFieldErrorMessage(
              value,
              field
            );
        }
      }
    );
  }

  return nextErrors;
};

const normalizeFormForComparison = (
  form
) => ({
  judiciary_type:
    normalizeText(
      form.judiciary_type
    ),

  judiciary_unit:
    normalizeText(
      form.judiciary_unit
    ),

  court_name:
    normalizeNullable(
      form.court_name
    ),

  case_number:
    normalizeNullable(
      form.case_number
    ),

  client_ids:
    normalizeIds(
      form.client_ids
    ).sort(),

  assigned_to:
    normalizeId(
      form.assigned_to
    ) ||
    null,

  status:
    form.status,

  priority:
    form.priority,

  subject:
    normalizeNullable(
      form.subject
    ),

  description:
    normalizeNullable(
      form.description
    ),

  opening_date:
    form.opening_date ||
    null,
});

// ======================================================
// COMPONENT
// ======================================================

const CaseEdit = () => {
  const navigate =
    useNavigate();

  const {
    id: idParam,
  } =
    useParams();

  const id =
    normalizeId(
      idParam
    );

  const {
    user,
  } =
    useAuth();

  const initializedCaseIdRef =
    useRef('');

  const canDelete =
    hasPermission(
      user,
      PERMISSION_KEYS.DELETE_CASES
    );

  // ======================================================
  // STATE
  // ======================================================

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

  const [
    errors,
    setErrors,
  ] =
    useState({});

  const [
    clientToAdd,
    setClientToAdd,
  ] =
    useState('');

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

  const [
    pendingNavigationTarget,
    setPendingNavigationTarget,
  ] =
    useState('');

  const deleteDialogRef =
    useRef(null);

  const leaveDialogRef =
    useRef(null);

  // ======================================================
  // CASE QUERY
  // ======================================================

  const {
    data:
      caseData,

    isLoading:
      caseLoading,

    error:
      caseError,
  } =
    useCase(
      id
    );

  // ======================================================
  // RELATED QUERIES
  // ======================================================

  const {
    data:
      clientsData,

    isLoading:
      clientsLoading,
  } =
    useQuery({
      queryKey: [
        'clients',
        {
          limit:
            100,
        },
      ],

      queryFn: () =>
        clientApi.getAll({
          limit:
            100,
        }),
    });

  const {
    data:
      lawyersData,

    isLoading:
      lawyersLoading,
  } =
    useQuery({
      queryKey: [
        'case-assignable-lawyers',
        'case-edit',
      ],

      queryFn: () =>
        caseApi
          .getAssignableLawyers(),
    });

  // ======================================================
  // DATA
  // ======================================================

  const caseItem =
    caseData?.data?.data ??
    caseData?.data ??
    null;

  const clients =
    getArrayPayload(
      clientsData
    );

  const assignableLawyers =
    getArrayPayload(
      lawyersData
    );

  const currentUserId =
    normalizeId(
      user?.id
    );

  const lawyers =
    currentUserId &&
    !assignableLawyers.some(
      (lawyer) =>
        normalizeId(
          lawyer?.id
        ) ===
        currentUserId
    )
      ? [
          {
            id:
              currentUserId,

            first_name:
              user?.first_name ||
              '',

            last_name:
              user?.last_name ||
              '',

            name:
              user?.name ||
              user?.full_name ||
              '',
          },
          ...assignableLawyers,
        ]
      : assignableLawyers;

  // ======================================================
  // FILL FORM
  // ======================================================

  useEffect(() => {
    if (
      !caseItem ||
      !id
    ) {
      return;
    }

    if (
      initializedCaseIdRef.current ===
      id
    ) {
      return;
    }

    const nextForm = {
      judiciary_type:
        caseItem.judiciary_type ||
        '',

      judiciary_unit:
        caseItem.judiciary_unit ||
        '',

      court_name:
        caseItem.court_name ||
        '',

      case_number:
        caseItem.case_number ||
        '',

      client_ids:
        getCaseClientIds(
          caseItem
        ),

      assigned_to:
        normalizeId(
          caseItem.assigned_to ??
          caseItem.assignee?.id
        ),

      status:
        caseItem.status ||
        'preparation',

      priority:
        caseItem.priority ||
        'normal',

      subject:
        caseItem.subject ||
        '',

      description:
        caseItem.description ||
        '',

      opening_date:
        formatDateInput(
          caseItem.opening_date
        ),
    };

    setFormData(
      nextForm
    );

    setInitialFormData(
      nextForm
    );

    setErrors(
      {}
    );

    initializedCaseIdRef.current =
      id;
  }, [
    caseItem,
    id,
  ]);

  // ======================================================
  // DERIVED
  // ======================================================

  const selectedClientIds =
    normalizeIds(
      formData.client_ids
    );

  const selectedClients =
    clients.filter(
      (client) =>
        selectedClientIds.includes(
          normalizeId(
            client?.id
          )
        )
    );

  const availableClients =
    clients.filter(
      (client) =>
        !selectedClientIds.includes(
          normalizeId(
            client?.id
          )
        )
    );

  const normalizedPayload =
    normalizeFormForComparison(
      formData
    );

  const initialNormalizedPayload =
    normalizeFormForComparison(
      initialFormData
    );

  const isDirty =
    JSON.stringify(
      normalizedPayload
    ) !==
    JSON.stringify(
      initialNormalizedPayload
    );

  // ======================================================
  // UPDATE
  // ======================================================

  const mutation =
    useUpdateCase();

  const handleMutationError =
    (
      error
    ) => {
      const rawFieldMessage =
        String(
          error?.response?.data?.message ||
          error?.message ||
          ''
        );

      const nextErrors =
        getBackendFieldErrors(
          error
        );

      if (
        /yargı türü|judiciary_type/i.test(
          rawFieldMessage
        )
      ) {
        nextErrors.judiciary_type =
          getCaseFieldErrorMessage(
            rawFieldMessage,
            'judiciary_type'
          );
      }

      if (
        /yargı birimi|judiciary_unit/i.test(
          rawFieldMessage
        )
      ) {
        nextErrors.judiciary_unit =
          getCaseFieldErrorMessage(
            rawFieldMessage,
            'judiciary_unit'
          );
      }

      if (
        /mahkeme|court_name/i.test(
          rawFieldMessage
        )
      ) {
        nextErrors.court_name =
          getCaseFieldErrorMessage(
            rawFieldMessage,
            'court_name'
          );
      }

      if (
        /dosya|esas|case_number/i.test(
          rawFieldMessage
        )
      ) {
        nextErrors.case_number =
          getCaseFieldErrorMessage(
            rawFieldMessage,
            'case_number'
          );
      }

      if (
        /müvekkil|client_ids/i.test(
          rawFieldMessage
        )
      ) {
        nextErrors.client_ids =
          getCaseFieldErrorMessage(
            rawFieldMessage,
            'client_ids'
          );
      }

      if (
        /atanan|avukat|assigned_to/i.test(
          rawFieldMessage
        )
      ) {
        nextErrors.assigned_to =
          getCaseFieldErrorMessage(
            rawFieldMessage,
            'assigned_to'
          );
      }

      if (
        /durum|status/i.test(
          rawFieldMessage
        )
      ) {
        nextErrors.status =
          getCaseFieldErrorMessage(
            rawFieldMessage,
            'status'
          );
      }

      if (
        /öncelik|priority/i.test(
          rawFieldMessage
        )
      ) {
        nextErrors.priority =
          getCaseFieldErrorMessage(
            rawFieldMessage,
            'priority'
          );
      }

      if (
        /konu|subject/i.test(
          rawFieldMessage
        )
      ) {
        nextErrors.subject =
          getCaseFieldErrorMessage(
            rawFieldMessage,
            'subject'
          );
      }

      if (
        /açıklama|description/i.test(
          rawFieldMessage
        )
      ) {
        nextErrors.description =
          getCaseFieldErrorMessage(
            rawFieldMessage,
            'description'
          );
      }

      if (
        /açılış|opening_date/i.test(
          rawFieldMessage
        )
      ) {
        nextErrors.opening_date =
          getCaseFieldErrorMessage(
            rawFieldMessage,
            'opening_date'
          );
      }

      if (
        Object.keys(
          nextErrors
        ).length >
        0
      ) {
        setErrors(
          (
            current
          ) => ({
            ...current,
            ...nextErrors,
          })
        );
      }
    };

  // ======================================================
  // DELETE
  // ======================================================

  const deleteMutation =
    useDeleteCase();

  const isPending =
    mutation.isPending ||
    deleteMutation.isPending;

  useEffect(() => {
    if (
      !isDirty ||
      isPending
    ) {
      return undefined;
    }

    const handleBeforeUnload =
      (event) => {
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
    isPending,
  ]);

  const deleteCaseName =
    [
      caseItem?.court_name,
      caseItem?.case_number,
    ]
      .filter(
        Boolean
      )
      .join(
        ' · '
      ) ||
    caseItem?.title ||
    'Seçili dava';

  useEffect(() => {
    const activeDialogRef =
      leaveDialogOpen
        ? leaveDialogRef
        : deleteDialogOpen
          ? deleteDialogRef
          : null;

    if (!activeDialogRef) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    const previousActiveElement =
      document.activeElement;

    const getFocusableElements =
      () => {
        const dialog =
          activeDialogRef.current;

        if (!dialog) {
          return [];
        }

        return Array.from(
          dialog.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
      };

    const focusDialog =
      window.requestAnimationFrame(
        () => {
          const focusableElements =
            getFocusableElements();

          if (
            focusableElements.length >
            0
          ) {
            focusableElements[0].focus();
          } else {
            activeDialogRef.current?.focus();
          }
        }
      );

    const handleKeyDown =
      (event) => {
        if (
          event.key === 'Escape'
        ) {
          if (
            deleteDialogOpen &&
            deleteMutation.isPending
          ) {
            return;
          }

          if (leaveDialogOpen) {
            setLeaveDialogOpen(
              false
            );

            setPendingNavigationTarget(
              ''
            );
          } else {
            setDeleteDialogOpen(
              false
            );
          }

          return;
        }

        if (
          event.key !== 'Tab'
        ) {
          return;
        }

        const focusableElements =
          getFocusableElements();

        if (
          focusableElements.length ===
          0
        ) {
          event.preventDefault();
          return;
        }

        const firstElement =
          focusableElements[0];

        const lastElement =
          focusableElements[
            focusableElements.length - 1
          ];

        if (
          event.shiftKey &&
          document.activeElement ===
            firstElement
        ) {
          event.preventDefault();
          lastElement.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement ===
            lastElement
        ) {
          event.preventDefault();
          firstElement.focus();
        }
      };

    document.body.style.overflow =
      'hidden';

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.cancelAnimationFrame(
        focusDialog
      );

      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

      if (
        previousActiveElement instanceof
          HTMLElement &&
        document.contains(
          previousActiveElement
        )
      ) {
        previousActiveElement.focus();
      }
    };
  }, [
    deleteDialogOpen,
    leaveDialogOpen,
    deleteMutation.isPending,
  ]);

  // ======================================================
  // CHANGE
  // ======================================================

  const handleChange =
    (
      event
    ) => {
      if (
        isPending
      ) {
        return;
      }

      const {
        name,
        value,
      } =
        event.target;

      let nextValue =
        name ===
          'assigned_to'
          ? normalizeId(
              value
            )
          : value;

      if (
        name ===
        'judiciary_type'
      ) {
        nextValue =
          value.slice(
            0,
            100
          );
      }

      if (
        name ===
        'judiciary_unit'
      ) {
        nextValue =
          value.slice(
            0,
            150
          );
      }

      if (
        name ===
        'court_name'
      ) {
        nextValue =
          value.slice(
            0,
            200
          );
      }

      if (
        name ===
        'case_number'
      ) {
        nextValue =
          value.slice(
            0,
            100
          );
      }

      if (
        name ===
        'subject'
      ) {
        nextValue =
          value.slice(
            0,
            255
          );
      }

      if (
        name ===
        'description'
      ) {
        nextValue =
          value.slice(
            0,
            5000
          );
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          [name]:
            nextValue,
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

  // ======================================================
  // CLIENT ADD
  // ======================================================

  const handleAddClient =
    () => {
      if (
        !clientToAdd ||
        isPending
      ) {
        return;
      }

      const normalizedClientId =
        normalizeId(
          clientToAdd
        );

      if (
        !normalizedClientId ||
        normalizeIds(
          formData.client_ids
        ).includes(
          normalizedClientId
        )
      ) {
        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          client_ids:
            normalizeIds([
              ...current.client_ids,
              normalizedClientId,
            ]),
        })
      );

      setClientToAdd(
        ''
      );

      if (
        errors.client_ids
      ) {
        setErrors(
          (
            current
          ) => ({
            ...current,

            client_ids:
              '',
          })
        );
      }
    };

  // ======================================================
  // CLIENT REMOVE
  // ======================================================

  const handleRemoveClient =
    (
      clientId
    ) => {
      if (
        isPending
      ) {
        return;
      }

      const normalizedClientId =
        normalizeId(
          clientId
        );

      setFormData(
        (
          current
        ) => ({
          ...current,

          client_ids:
            normalizeIds(
              current.client_ids
            ).filter(
              (currentId) =>
                currentId !==
                normalizedClientId
            ),
        })
      );

      if (
        errors.client_ids
      ) {
        setErrors(
          (
            current
          ) => ({
            ...current,
            client_ids:
              '',
          })
        );
      }
    };

  // ======================================================
  // NAVIGATION GUARD
  // ======================================================

  const requestNavigation =
    (
      target
    ) => {
      if (
        isPending
      ) {
        return;
      }

      if (
        isDirty
      ) {
        setPendingNavigationTarget(
          target
        );

        setLeaveDialogOpen(
          true
        );

        return;
      }

      navigate(
        target
      );
    };

  const handleCancel =
    () => {
      requestNavigation(
        `/cases/${id}`
      );
    };

  const handleGuardedDetailLink =
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      if (
        isPending ||
        isDirty
      ) {
        event.preventDefault();

        requestNavigation(
          `/cases/${id}`
        );
      }
    };

  const handleCloseLeaveDialog =
    () => {
      setLeaveDialogOpen(
        false
      );

      setPendingNavigationTarget(
        ''
      );
    };

  const handleConfirmLeave =
    () => {
      const target =
        pendingNavigationTarget ||
        `/cases/${id}`;

      setLeaveDialogOpen(
        false
      );

      setPendingNavigationTarget(
        ''
      );

      navigate(
        target
      );
    };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit =
    (
      event
    ) => {
      event.preventDefault();

      if (
        isPending
      ) {
        return;
      }

      if (
        !id
      ) {
        toast.error(
          'Geçerli dava kaydı bulunamadı'
        );

        return;
      }

      const nextErrors =
        {};

      const judiciaryType =
        normalizeText(
          formData.judiciary_type
        );

      const judiciaryUnit =
        normalizeText(
          formData.judiciary_unit
        );

      const courtName =
        normalizeText(
          formData.court_name
        );

      const caseNumber =
        normalizeText(
          formData.case_number
        );

      const subject =
        normalizeText(
          formData.subject
        );

      const description =
        String(
          formData.description ||
          ''
        ).trim();

      // ==================================================
      // JUDICIARY TYPE
      // ==================================================

      if (
        !judiciaryType
      ) {
        nextErrors.judiciary_type =
          'Yargı türü gereklidir';
      } else if (
        judiciaryType.length >
        100
      ) {
        nextErrors.judiciary_type =
          'Yargı türü en fazla 100 karakter olabilir';
      }

      // ==================================================
      // JUDICIARY UNIT
      // ==================================================

      if (
        !judiciaryUnit
      ) {
        nextErrors.judiciary_unit =
          'Yargı birimi gereklidir';
      } else if (
        judiciaryUnit.length >
        150
      ) {
        nextErrors.judiciary_unit =
          'Yargı birimi en fazla 150 karakter olabilir';
      }

      // ==================================================
      // COURT
      // ==================================================

      if (
        courtName.length >
        200
      ) {
        nextErrors.court_name =
          'Mahkeme adı en fazla 200 karakter olabilir';
      }

      // ==================================================
      // CASE NUMBER
      // ==================================================

      if (
        caseNumber.length >
        100
      ) {
        nextErrors.case_number =
          'Dosya / esas numarası en fazla 100 karakter olabilir';
      }

      // ==================================================
      // CLIENTS
      // ==================================================

      const normalizedClientIds =
        normalizeIds(
          formData.client_ids
        );

      if (
        normalizedClientIds.length ===
        0
      ) {
        nextErrors.client_ids =
          'En az bir müvekkil seçilmelidir';
      } else {
        const availableClientIds =
          new Set(
            clients.map(
              (client) =>
                normalizeId(
                  client?.id
                )
            )
          );

        const hasInvalidClient =
          normalizedClientIds.some(
            (clientId) =>
              !availableClientIds.has(
                clientId
              )
          );

        if (
          hasInvalidClient
        ) {
          nextErrors.client_ids =
            'Seçili müvekkillerden biri artık erişilebilir değil';
        }
      }

      // ==================================================
      // OPENING DATE
      // ==================================================

      if (
        formData.opening_date &&
        isFutureDate(
          formData.opening_date
        )
      ) {
        nextErrors.opening_date =
          'Dava açılış tarihi bugünden ileri bir tarih olamaz';
      }

      const assignedTo =
        normalizeId(
          formData.assigned_to
        );

      if (
        assignedTo &&
        !lawyers.some(
          (lawyer) =>
            normalizeId(
              lawyer?.id
            ) ===
            assignedTo
        )
      ) {
        nextErrors.assigned_to =
          'Seçilen avukat artık atanabilir değil';
      }

      const isCurrentSuspendedStatus =
        formData.status ===
          'suspended' &&
        caseItem.status ===
          'suspended';

      if (
        !STATUS_OPTIONS.some(
          (option) =>
            option.value ===
            formData.status
        ) &&
        !isCurrentSuspendedStatus
      ) {
        nextErrors.status =
          'Geçersiz dava durumu';
      }

      if (
        !PRIORITY_OPTIONS.some(
          (option) =>
            option.value ===
            formData.priority
        )
      ) {
        nextErrors.priority =
          'Geçersiz öncelik değeri';
      }

      // ==================================================
      // SUBJECT
      // ==================================================

      if (
        subject.length >
        255
      ) {
        nextErrors.subject =
          'Dava konusu en fazla 255 karakter olabilir';
      }

      // ==================================================
      // DESCRIPTION
      // ==================================================

      if (
        description.length >
        5000
      ) {
        nextErrors.description =
          'Açıklama en fazla 5000 karakter olabilir';
      }

      // ==================================================
      // ERRORS
      // ==================================================

      if (
        Object.keys(
          nextErrors
        ).length >
        0
      ) {
        setErrors(
          nextErrors
        );

        toast.error(
          'Formdaki eksik veya hatalı alanları kontrol edin'
        );

        return;
      }

      if (
        !isDirty
      ) {
        toast(
          'Kaydedilecek bir değişiklik bulunmuyor'
        );

        return;
      }

      // ==================================================
      // PAYLOAD
      // ==================================================

      const submitData = {
        ...formData,

        client_ids:
          normalizeIds(
            formData.client_ids
          ),

        title:
          `${judiciaryType} - ${judiciaryUnit}`,

        judiciary_type:
          judiciaryType,

        judiciary_unit:
          judiciaryUnit,

        court_name:
          courtName ||
          null,

        case_number:
          caseNumber ||
          null,

        subject:
          subject ||
          null,

        description:
          description ||
          null,

        assigned_to:
          normalizeId(
            formData.assigned_to
          ) ||
          null,

        opening_date:
          formData.opening_date ||
          null,
      };

      mutation.mutate(
        {
          id,
          data:
            submitData,
        },
        {
          onSuccess: () => {
            navigate(
              `/cases/${id}`
            );
          },

          onError:
            handleMutationError,
        }
      );
    };

  // ======================================================
  // DELETE HANDLER
  // ======================================================

  const handleDelete =
    () => {
      if (
        !canDelete
      ) {
        toast.error(
          'Bu davayı silme yetkiniz bulunmuyor.'
        );

        return;
      }

      if (
        isPending
      ) {
        return;
      }

      if (
        !id
      ) {
        toast.error(
          'Geçerli dava kaydı bulunamadı'
        );

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
        !canDelete ||
        deleteMutation.isPending
      ) {
        return;
      }

      if (
        !id
      ) {
        toast.error(
          'Geçerli dava kaydı bulunamadı'
        );

        return;
      }

      deleteMutation.mutate(
        id,
        {
          onSuccess: () => {
            setDeleteDialogOpen(
              false
            );

            navigate(
              '/cases'
            );
          },
        }
      );
    };

  // ======================================================
  // LOADING
  // ======================================================

  if (
    caseLoading
  ) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Dava bilgileri yükleniyor...
          </p>

        </div>

      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    caseError ||
    !caseItem
  ) {
    return (
      <div className="py-12 text-center">

        <div className="mb-4 text-4xl">
          ⚠️
        </div>

        <h2 className="text-xl font-semibold text-red-600">
          Dava yüklenemedi
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {getCaseErrorMessage(
            caseError,
            'Dava kaydı bulunamadı'
          )}
        </p>

        <Button
          className="mt-4"
          onClick={() =>
            navigate(
              '/cases'
            )
          }
        >
          Davalara Dön
        </Button>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to={`/cases/${id}`}
          onClick={
            handleGuardedDetailLink
          }
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />

          Davaya Dön
        </Link>

        <div className="mt-3 flex items-start gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
            <Gavel size={21} />
          </div>

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-3">

              <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
                Davayı Düzenle
              </h1>

              {isDirty && (
                <Badge
                  variant="warning"
                >
                  Kaydedilmemiş değişiklik
                </Badge>
              )}

            </div>

            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400">
              Dava dosyasının yargı bilgilerini, müvekkillerini ve sorumlu avukatını güncelleyin.
            </p>

            <p className="mt-1 truncate text-xs text-gray-400 dark:text-slate-500">
              {caseItem.title ||
                caseItem.case_number ||
                `Dava #${id}`}
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

        {/* YARGI */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
                <Scale size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Yargı Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Bilgileri dosyada yer aldığı şekliyle elle güncelleyebilirsiniz.
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label="Yargı Türü *"
                name="judiciary_type"
                value={
                  formData.judiciary_type
                }
                onChange={
                  handleChange
                }
                error={
                  errors.judiciary_type
                }
                disabled={
                  isPending
                }
                maxLength={100}
                placeholder="Örn: Hukuk, Ceza, İdare, CBS"
              />

              <Input
                label="Yargı Birimi *"
                name="judiciary_unit"
                value={
                  formData.judiciary_unit
                }
                onChange={
                  handleChange
                }
                error={
                  errors.judiciary_unit
                }
                disabled={
                  isPending
                }
                maxLength={150}
                placeholder="Örn: Asliye Hukuk Mahkemesi"
              />

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label="Mahkeme"
                name="court_name"
                value={
                  formData.court_name
                }
                onChange={
                  handleChange
                }
                error={
                  errors.court_name
                }
                disabled={
                  isPending
                }
                maxLength={200}
                placeholder="Örn: İstanbul 5. Asliye Hukuk Mahkemesi"
              />

              <Input
                label="Dosya / Esas No"
                name="case_number"
                value={
                  formData.case_number
                }
                onChange={
                  handleChange
                }
                error={
                  errors.case_number
                }
                disabled={
                  isPending
                }
                maxLength={100}
                placeholder="Örn: 2026/123 E."
              />

            </div>

            <Input
              label="Dava Açılış Tarihi"
              name="opening_date"
              type="date"
              max={
                getIstanbulTodayDateOnly()
              }
              value={
                formData.opening_date
              }
              onChange={
                handleChange
              }
              error={
                errors.opening_date
              }
              disabled={
                isPending
              }
            />

          </Card.Body>

        </Card>

        {/* CLIENTS */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400">
                <Users size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Müvekkiller
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Dosyaya bağlı müvekkilleri ekleyin veya kaldırın.
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-4">

            <div className="flex flex-col gap-2 sm:flex-row">

              <select
                value={
                  clientToAdd
                }
                onChange={(
                  event
                ) => {
                  if (
                    isPending
                  ) {
                    return;
                  }

                  setClientToAdd(
                    normalizeId(
                      event.target.value
                    )
                  );
                }}
                disabled={
                  clientsLoading ||
                  isPending
                }
                className={`h-10 flex-1 rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.035] dark:text-slate-300 ${
                  errors.client_ids
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                }`}
              >

                <option value="">
                  {clientsLoading
                    ? 'Müvekkiller yükleniyor...'
                    : availableClients.length ===
                        0
                      ? 'Eklenebilecek müvekkil yok'
                      : 'Müvekkil seçin'}
                </option>

                {availableClients.map(
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
                      {client.client_type ===
                        'corporate'
                        ? ' · Kurumsal'
                        : ' · Bireysel'}
                    </option>
                  )
                )}

              </select>

              <Button
                type="button"
                variant="secondary"
                onClick={
                  handleAddClient
                }
                disabled={
                  !clientToAdd ||
                  isPending
                }
              >
                <Plus className="h-4 w-4" />

                Ekle
              </Button>

            </div>

            {errors.client_ids && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.client_ids}
              </p>
            )}

            {selectedClients.length >
              0 ? (
              <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.05]">

                <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

                  {selectedClients.map(
                    (
                      client
                    ) => (
                      <div
                        key={
                          client.id
                        }
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/[0.04] dark:text-slate-400">
                            <UserRound size={16} />
                          </div>

                          <div className="min-w-0">

                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                              {client.name}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-2">

                              <Badge
                                variant="default"
                              >
                                {client.client_type ===
                                'corporate'
                                  ? 'Kurumsal'
                                  : 'Bireysel'}
                              </Badge>

                              {client.identification_number && (
                                <span className="text-xs text-gray-400 dark:text-slate-500">
                                  ••••
                                  {String(
                                    client.identification_number
                                  ).slice(
                                    -4
                                  )}
                                </span>
                              )}

                            </div>

                          </div>

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveClient(
                              client.id
                            )
                          }
                          disabled={
                            isPending
                          }
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-500/[0.08] dark:hover:text-red-400"
                          title="Müvekkili kaldır"
                          aria-label={`${client.name} müvekkilini davadan kaldır`}
                        >
                          <X className="h-4 w-4" />
                        </button>

                      </div>
                    )
                  )}

                </div>

              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-7 text-center dark:border-white/[0.07]">

                <Users className="mx-auto h-7 w-7 text-gray-300 dark:text-slate-600" />

                <p className="mt-2 text-sm text-gray-500 dark:text-slate-500">
                  Bu davaya bağlı müvekkil bulunmuyor.
                </p>

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-600">
                  Kaydedebilmek için en az bir müvekkil ekleyin.
                </p>

              </div>
            )}

            <p className="text-xs text-gray-400 dark:text-slate-500">
              {selectedClients.length} müvekkil seçili
            </p>

          </Card.Body>

        </Card>

        {/* MANAGEMENT */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/[0.08] dark:text-violet-400">
                <BriefcaseBusiness size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Dosya Yönetimi
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Sorumlu avukat, durum ve öncelik bilgileri
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Atanan Avukat
              </label>

              <select
                name="assigned_to"
                value={
                  formData.assigned_to
                }
                onChange={
                  handleChange
                }
                disabled={
                  lawyersLoading ||
                  isPending
                }
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
              >

                <option value="">
                  {lawyersLoading
                    ? 'Avukatlar yükleniyor...'
                    : 'Avukat seçin'}
                </option>

                {lawyers.map(
                  (
                    lawyer
                  ) => (
                    <option
                      key={
                        lawyer.id
                      }
                      value={
                        normalizeId(
                          lawyer.id
                        )
                      }
                    >
                      {[
                        lawyer.first_name,
                        lawyer.last_name,
                      ]
                        .filter(Boolean)
                        .join(' ') ||
                        lawyer.name ||
                        lawyer.email ||
                        'Avukat'}

                      {normalizeId(
                        lawyer.id
                      ) ===
                      currentUserId
                        ? ' (Ben)'
                        : ''}
                    </option>
                  )
                )}

              </select>

              {errors.assigned_to && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {errors.assigned_to}
                </p>
              )}

            </div>

            <div className="grid gap-4 md:grid-cols-2">

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
                    isPending
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
                >

                  {formData.status ===
                    'suspended' && (
                    <option
                      value="suspended"
                      disabled
                    >
                      Durduruldu
                    </option>
                  )}

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
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {errors.status}
                  </p>
                )}

              </div>

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
                    isPending
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
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

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* DETAILS */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400">
                <CalendarDays size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Dava Detayları
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Konu ve dosya açıklamalarını düzenleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <Input
              label="Konu"
              name="subject"
              value={
                formData.subject
              }
              onChange={
                handleChange
              }
              error={
                errors.subject
              }
              disabled={
                isPending
              }
              maxLength={255}
              placeholder="Örn: Tapu iptali ve tescil"
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
                disabled={
                  isPending
                }
                maxLength={5000}
                rows={5}
                placeholder="Dava hakkında detaylı açıklama..."
                className={`w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-sm leading-6 text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.035] dark:text-white dark:placeholder:text-slate-500 ${
                  errors.description
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                }`}
              />

              <div className="mt-1 flex justify-between gap-3">

                {errors.description ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {errors.description}
                  </p>
                ) : (
                  <span />
                )}

                <p className="text-xs text-gray-400 dark:text-slate-600">
                  {formData.description.length}/5000
                </p>

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* SUMMARY */}

        <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-white/[0.07] dark:bg-white/[0.015] sm:grid-cols-4">

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Müvekkil
            </p>

            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {formData.client_ids.length} kişi
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
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

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Öncelik
            </p>

            <div className="mt-1">

              <Badge
                variant={
                  getPriorityVariant(
                    formData.priority
                  )
                }
              >
                {getPriorityLabel(
                  formData.priority
                )}
              </Badge>

            </div>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Açılış
            </p>

            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {formData.opening_date ||
                'Belirtilmedi'}
            </p>

          </div>

        </div>

        {/* SAVE ACTIONS */}

        <div className="flex flex-col-reverse gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33] sm:flex-row sm:items-center sm:justify-end">

          <Button
            type="button"
            variant="secondary"
            disabled={
              isPending
            }
            onClick={
              handleCancel
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
              isPending ||
              !isDirty
            }
          >
            <Save className="h-4 w-4" />

            Değişiklikleri Kaydet
          </Button>

        </div>

      </form>

      {/* DANGER ZONE */}

      {canDelete && (
        <Card className="border border-red-200 shadow-none dark:border-red-500/20">

          <Card.Body>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <Trash2 className="h-5 w-5 text-red-500" />

                  <h2 className="font-semibold text-red-600 dark:text-red-400">
                    Tehlikeli Bölge
                  </h2>

                </div>

                <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-slate-400">
                  Bu dava kaydı normal dava ekranlarından kaldırılacaktır. İşleme devam etmeden önce doğru dava kaydını seçtiğinizden emin olun.
                </p>

              </div>

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
                <Trash2 className="h-4 w-4" />

                Davayı Sil
              </Button>

            </div>

          </Card.Body>

        </Card>
      )}


      {leaveDialogOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Kaydedilmemiş değişiklik penceresini kapat"
            onClick={
              handleCloseLeaveDialog
            }
          />

          <div
            ref={
              leaveDialogRef
            }
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-leave-dialog-title"
            aria-describedby="case-leave-dialog-description"
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
                    id="case-leave-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Değişiklikleri kaydetmeden çıkmak üzeresiniz
                  </h2>

                  <p
                    id="case-leave-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    Dava formunda henüz kaydedilmemiş değişiklikler var. Çıkarsanız bu değişiklikler uygulanmayacaktır.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.07]">
                <p className="text-sm leading-6 text-amber-950 dark:text-amber-200">
                  Düzenlemeye devam ederek dava bilgilerini kontrol edebilir veya değişiklikleri atıp dava detayına dönebilirsiniz.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.015] sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={
                  handleCloseLeaveDialog
                }
              >
                Düzenlemeye Devam Et
              </Button>

              <Button
                type="button"
                variant="danger"
                onClick={
                  handleConfirmLeave
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
            aria-label="Dava silme penceresini kapat"
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
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-delete-dialog-title"
            aria-describedby="case-delete-dialog-description"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]"
          >
            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/[0.10] dark:text-red-400">
                  <Trash2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                    Dava silme onayı
                  </p>

                  <h2
                    id="case-delete-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Dava kaydını sil
                  </h2>

                  <p
                    id="case-delete-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    <span className="font-medium text-gray-700 dark:text-slate-200">
                      {deleteCaseName}
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
                      Bu dava kaydı silinecek
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-900/80 dark:text-red-200/80">
                      İşlem tamamlandıktan sonra dava kaydı normal ekranlardan erişilebilir olmayacaktır.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">
                <p className="text-sm leading-6 text-gray-600 dark:text-slate-300">
                  Devam etmeden önce dosya numarası, mahkeme ve dava bilgilerini kontrol ederek doğru kaydı seçtiğinizden emin olun.
                </p>
              </div>

              <p className="text-xs leading-5 text-gray-400 dark:text-slate-500">
                Silme işlemi yalnızca yetkili kullanıcı tarafından onaylanmalıdır. Devam etmeden önce doğru dava kaydını seçtiğinizden emin olun.
              </p>
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

                Davayı Sil
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CaseEdit;