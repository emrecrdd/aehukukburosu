import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import caseApi from '../../features/cases/case.api.js';

import {
  useCreateCase,
} from '../../features/cases/case.query.js';

import clientApi from '../../features/clients/client.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  AlertTriangle,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  Gavel,
  Plus,
  Save,
  Scale,
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
  return (
    STATUS_OPTIONS.find(
      (item) =>
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
      (item) =>
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

  return normalized || null;
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

const getCreatedCaseId = (
  response
) => {
  const payload =
    response?.data?.data ??
    response?.data ??
    response ??
    null;

  return normalizeId(
    payload?.id
  );
};

const isLikelyTechnicalMessage = (
  value
) => {
  const message =
    String(
      value || ''
    ).trim();

  if (!message) {
    return false;
  }

  return /(?:validation failed|sequelize|constraint|foreign key|unique constraint|duplicate key|invalid input syntax|syntax error|stack trace|internal server error|network error|failed to fetch|econn|socket|timeout|request failed with status code|cannot read propert|undefined is not|null value in column|not-null violation|2350\d|22p02)/i.test(
    message
  );
};

const getCaseCreateErrorMessage = (
  error,
  fallback = 'Dava oluşturulamadı'
) => {
  const status =
    error?.response?.status;

  const rawMessage =
    error?.response?.data?.message ||
    error?.message ||
    '';

  if (status === 401) {
    return 'Oturumunuz sona ermiş olabilir. Lütfen yeniden giriş yapın.';
  }

  if (status === 403) {
    return 'Bu işlem için yetkiniz bulunmuyor.';
  }

  if (status === 404) {
    return 'İstenen kayıt veya yardımcı veri bulunamadı.';
  }

  if (status === 409) {
    return 'Bu bilgiler mevcut bir kayıtla çakışıyor. Alanları kontrol edip tekrar deneyin.';
  }

  if (status === 422) {
    return 'Formdaki bilgileri kontrol edip tekrar deneyin.';
  }

  if (Number(status) >= 500) {
    return 'Sunucuda geçici bir sorun oluştu. Lütfen tekrar deneyin.';
  }

  if (
    !error?.response &&
    /network|fetch|timeout|econn|socket/i.test(
      rawMessage
    )
  ) {
    return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  }

  if (
    rawMessage &&
    !isLikelyTechnicalMessage(
      rawMessage
    )
  ) {
    return rawMessage;
  }

  return fallback;
};

const getCaseFieldErrorMessage = (
  field,
  rawMessage
) => {
  const message =
    String(
      rawMessage || ''
    ).trim();

  if (
    message &&
    !isLikelyTechnicalMessage(
      message
    )
  ) {
    return message;
  }

  const fallbacks = {
    judiciary_type: 'Yargı türünü kontrol edin',
    judiciary_unit: 'Yargı birimini kontrol edin',
    court_name: 'Mahkeme bilgisini kontrol edin',
    case_number: 'Dosya / esas numarasını kontrol edin',
    client_ids: 'Müvekkil seçimini kontrol edin',
    assigned_to: 'Atanan avukatı kontrol edin',
    status: 'Dava durumunu kontrol edin',
    priority: 'Öncelik bilgisini kontrol edin',
    subject: 'Dava konusunu kontrol edin',
    description: 'Açıklamayı kontrol edin',
    opening_date: 'Dava açılış tarihini kontrol edin',
  };

  return (
    fallbacks[field] ||
    'Bu alanı kontrol edin'
  );
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
              field,
              item?.msg ||
              item?.message
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
              field,
              value
                .filter(Boolean)
                .join(', ')
            );
        } else if (
          value
        ) {
          nextErrors[field] =
            getCaseFieldErrorMessage(
              field,
              String(
                value
              )
            );
        }
      }
    );
  }

  return nextErrors;
};

const getTodayInputValue =
  () => {
    const today =
      new Date();

    const year =
      today.getFullYear();

    const month =
      String(
        today.getMonth() + 1
      ).padStart(
        2,
        '0'
      );

    const day =
      String(
        today.getDate()
      ).padStart(
        2,
        '0'
      );

    return `${year}-${month}-${day}`;
};

const isFutureDate = (
  value
) => {
  if (
    !value
  ) {
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
    getTodayInputValue()
  );
};

// ======================================================
// COMPONENT
// ======================================================

const CaseCreate = () => {
  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const {
    user,
  } = useAuth();

  const [
    formData,
    setFormData,
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
    unsavedDialogOpen,
    setUnsavedDialogOpen,
  ] = useState(false);

  const [
    pendingExitPath,
    setPendingExitPath,
  ] = useState('');

  const unsavedDialogRef =
    useRef(null);

  const previousFocusRef =
    useRef(null);

  // ======================================================
  // QUERIES
  // ======================================================

  const {
    data:
      clientsData,
    isLoading:
      clientsLoading,
    error:
      clientsQueryError,
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
      lawyersData,
    isLoading:
      lawyersLoading,
    error:
      lawyersQueryError,
    refetch:
      refetchLawyers,
  } =
    useQuery({
      queryKey: [
        'case-assignable-lawyers',
      ],

      queryFn: () =>
        caseApi.getAssignableLawyers(),
    });

  // ======================================================
  // DATA
  // ======================================================

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

            email:
              user?.email ||
              '',
          },
          ...assignableLawyers,
        ]
      : assignableLawyers;

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

  const isDirty =
    (
      normalizeText(
        formData.judiciary_type
      ) !== '' ||
      normalizeText(
        formData.judiciary_unit
      ) !== '' ||
      normalizeText(
        formData.court_name
      ) !== '' ||
      normalizeText(
        formData.case_number
      ) !== '' ||
      selectedClientIds.length >
        0 ||
      normalizeId(
        formData.assigned_to
      ) !== '' ||
      formData.status !==
        'preparation' ||
      formData.priority !==
        'normal' ||
      normalizeText(
        formData.subject
      ) !== '' ||
      normalizeText(
        formData.description
      ) !== '' ||
      formData.opening_date !==
        ''
    );

  // ======================================================
  // UNSAVED CHANGES / DIALOG ACCESSIBILITY
  // ======================================================

  useEffect(() => {
    if (!isDirty) {
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
  ]);

  useEffect(() => {
    const dialog =
      unsavedDialogOpen
        ? unsavedDialogRef.current
        : null;

    if (!dialog) {
      return undefined;
    }

    previousFocusRef.current =
      document.activeElement;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    const getFocusableElements =
      () => Array.from(
        dialog.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    const frame =
      window.requestAnimationFrame(
        () => {
          const focusable =
            getFocusableElements();

          (
            focusable[0] ||
            dialog
          )?.focus?.();
        }
      );

    const handleKeyDown =
      (event) => {
        if (
          event.key ===
          'Escape'
        ) {
          event.preventDefault();

          setUnsavedDialogOpen(
            false
          );

          setPendingExitPath(
            ''
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
          getFocusableElements();

        if (
          focusable.length ===
          0
        ) {
          event.preventDefault();
          dialog.focus();
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
  ]);

  // ======================================================
  // MUTATION
  // ======================================================

  const mutation =
    useCreateCase();

  const handleMutationError =
    (
      error
    ) => {
      const message =
        error?.response
          ?.data?.message ||
        error?.message ||
        'Dava oluşturulamadı';

      const nextErrors =
        getBackendFieldErrors(
          error
        );

      if (
        /yargı türü|judiciary_type/i.test(
          message
        )
      ) {
        nextErrors.judiciary_type =
          getCaseFieldErrorMessage(
            'judiciary_type',
            message
          );
      }

      if (
        /yargı birimi|judiciary_unit/i.test(
          message
        )
      ) {
        nextErrors.judiciary_unit =
          getCaseFieldErrorMessage(
            'judiciary_unit',
            message
          );
      }

      if (
        /mahkeme|court_name/i.test(
          message
        )
      ) {
        nextErrors.court_name =
          getCaseFieldErrorMessage(
            'court_name',
            message
          );
      }

      if (
        /dosya|esas|case_number/i.test(
          message
        )
      ) {
        nextErrors.case_number =
          getCaseFieldErrorMessage(
            'case_number',
            message
          );
      }

      if (
        /müvekkil|client_ids/i.test(
          message
        )
      ) {
        nextErrors.client_ids =
          getCaseFieldErrorMessage(
            'client_ids',
            message
          );
      }

      if (
        /atanan|avukat|assigned_to/i.test(
          message
        )
      ) {
        nextErrors.assigned_to =
          getCaseFieldErrorMessage(
            'assigned_to',
            message
          );
      }

      if (
        /durum|status/i.test(
          message
        )
      ) {
        nextErrors.status =
          getCaseFieldErrorMessage(
            'status',
            message
          );
      }

      if (
        /öncelik|priority/i.test(
          message
        )
      ) {
        nextErrors.priority =
          getCaseFieldErrorMessage(
            'priority',
            message
          );
      }

      if (
        /konu|subject/i.test(
          message
        )
      ) {
        nextErrors.subject =
          getCaseFieldErrorMessage(
            'subject',
            message
          );
      }

      if (
        /açıklama|description/i.test(
          message
        )
      ) {
        nextErrors.description =
          getCaseFieldErrorMessage(
            'description',
            message
          );
      }

      if (
        /açılış|opening_date/i.test(
          message
        )
      ) {
        nextErrors.opening_date =
          getCaseFieldErrorMessage(
            'opening_date',
            message
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

  const refreshCreatedCaseClientViews =
    async (
      clientIds
    ) => {
      const normalizedIds =
        normalizeIds(
          clientIds
        );

      if (
        normalizedIds.length ===
        0
      ) {
        return;
      }

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

  // ======================================================
  // HANDLERS
  // ======================================================

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
  // CLIENTS
  // ======================================================

  const handleAddClient =
    () => {
      if (
        mutation.isPending
      ) {
        return;
      }

      const normalizedClientId =
        normalizeId(
          clientToAdd
        );

      if (
        !normalizedClientId
      ) {
        return;
      }

      if (
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

  const handleRemoveClient =
    (
      id
    ) => {
      if (
        mutation.isPending
      ) {
        return;
      }

      const normalizedClientId =
        normalizeId(
          id
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
              (clientId) =>
                clientId !==
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
  // CANCEL / UNSAVED EXIT
  // ======================================================

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
        '/cases';

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

  const handleCancel =
    () => {
      requestExit(
        '/cases'
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
        mutation.isPending
      ) {
        return;
      }

      const newErrors =
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
        newErrors.judiciary_type =
          'Yargı türü gereklidir';
      } else if (
        judiciaryType.length >
        100
      ) {
        newErrors.judiciary_type =
          'Yargı türü en fazla 100 karakter olabilir';
      }

      // ==================================================
      // JUDICIARY UNIT
      // ==================================================

      if (
        !judiciaryUnit
      ) {
        newErrors.judiciary_unit =
          'Yargı birimi gereklidir';
      } else if (
        judiciaryUnit.length >
        150
      ) {
        newErrors.judiciary_unit =
          'Yargı birimi en fazla 150 karakter olabilir';
      }

      // ==================================================
      // COURT
      // ==================================================

      if (
        courtName.length >
        200
      ) {
        newErrors.court_name =
          'Mahkeme adı en fazla 200 karakter olabilir';
      }

      // ==================================================
      // CASE NUMBER
      // ==================================================

      if (
        caseNumber.length >
        100
      ) {
        newErrors.case_number =
          'Dosya / esas numarası en fazla 100 karakter olabilir';
      }

      // ==================================================
      // CLIENT
      // ==================================================

      const normalizedClientIds =
        normalizeIds(
          formData.client_ids
        );

      if (
        clientsQueryError
      ) {
        newErrors.client_ids =
          'Müvekkil listesi yüklenemedi. Listeyi yenileyip tekrar deneyin.';
      } else if (
        normalizedClientIds.length ===
        0
      ) {
        newErrors.client_ids =
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
          newErrors.client_ids =
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
        newErrors.opening_date =
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
        newErrors.assigned_to =
          'Seçilen avukat artık atanabilir değil';
      }

      if (
        !STATUS_OPTIONS.some(
          (option) =>
            option.value ===
            formData.status
        )
      ) {
        newErrors.status =
          'Geçersiz dava durumu';
      }

      if (
        !PRIORITY_OPTIONS.some(
          (option) =>
            option.value ===
            formData.priority
        )
      ) {
        newErrors.priority =
          'Geçersiz öncelik değeri';
      }

      // ==================================================
      // SUBJECT
      // ==================================================

      if (
        subject.length >
        255
      ) {
        newErrors.subject =
          'Dava konusu en fazla 255 karakter olabilir';
      }

      // ==================================================
      // DESCRIPTION
      // ==================================================

      if (
        description.length >
        5000
      ) {
        newErrors.description =
          'Açıklama en fazla 5000 karakter olabilir';
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

      const title =
        `${judiciaryType} - ${judiciaryUnit}`;

      const submitData = {
        ...formData,

        client_ids:
          normalizeIds(
            formData.client_ids
          ),

        title,

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
        submitData,
        {
          onSuccess:
            async (
              response
            ) => {
              await refreshCreatedCaseClientViews(
                submitData.client_ids
              );

              const createdId =
                getCreatedCaseId(
                  response
                );

              if (
                createdId
              ) {
                navigate(
                  `/cases/${createdId}`
                );

                return;
              }

              navigate(
                '/cases'
              );
            },

          onError:
            handleMutationError,
        }
      );
    };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to="/cases"
          onClick={(event) =>
            requestExit(
              '/cases',
              event
            )
          }
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Davalar
        </Link>

        <div className="mt-3 flex items-start gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
            <Gavel size={21} />
          </div>

          <div>

            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
                Yeni Dava
              </h1>

              {isDirty && (
                <Badge variant="warning">
                  Kaydedilmemiş değişiklik
                </Badge>
              )}
            </div>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-slate-400">
              Dava dosyasının yargı bilgilerini, müvekkillerini ve sorumlu avukatı belirleyin.
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
                  Bilgileri dosyada yer aldığı şekliyle elle girebilirsiniz.
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
                  mutation.isPending
                }
                maxLength={100}
                placeholder="Örn: Hukuk, Ceza, İdare, CBS"
                autoFocus
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
                  mutation.isPending
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
                  mutation.isPending
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
                  mutation.isPending
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
                getTodayInputValue()
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
                mutation.isPending
              }
            />

          </Card.Body>

        </Card>

        {/* MÜVEKKİLLER */}

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
                  Davaya en az bir müvekkil bağlayın.
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
                    mutation.isPending
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
                  mutation.isPending
                }
                className={`h-10 flex-1 rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 dark:bg-white/[0.035] dark:text-slate-300 ${
                  errors.client_ids
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                }`}
              >

                <option value="">
                  {clientsLoading
                    ? 'Müvekkiller yükleniyor...'
                    : clientsQueryError
                      ? 'Müvekkiller yüklenemedi'
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
                  mutation.isPending
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

            {clientsQueryError && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/[0.07] dark:text-amber-200">
                <span>
                  {getCaseCreateErrorMessage(
                    clientsQueryError,
                    'Müvekkil listesi yüklenemedi.'
                  )}
                </span>

                <button
                  type="button"
                  disabled={
                    clientsLoading ||
                    mutation.isPending
                  }
                  onClick={() =>
                    refetchClients?.()
                  }
                  className="font-semibold underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tekrar Dene
                </button>
              </div>
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
                        className="flex items-center justify-between gap-3 bg-white px-4 py-3 dark:bg-transparent"
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
                            mutation.isPending
                          }
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/[0.08] dark:hover:text-red-400"
                          title="Müvekkili kaldır"
                        >
                          <X className="h-4 w-4" />
                        </button>

                      </div>
                    )
                  )}

                </div>

              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center dark:border-white/[0.07]">

                <Users className="mx-auto h-6 w-6 text-gray-300 dark:text-slate-600" />

                <p className="mt-2 text-sm text-gray-500 dark:text-slate-500">
                  Henüz müvekkil eklenmedi.
                </p>

              </div>
            )}

            <p className="text-xs text-gray-400 dark:text-slate-500">
              {selectedClients.length} müvekkil seçildi
            </p>

          </Card.Body>

        </Card>

        {/* DOSYA YÖNETİMİ */}

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
                  Sorumlu avukat, dosya durumu ve öncelik
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
                  mutation.isPending
                }
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
              >

                <option value="">
                  {lawyersLoading
                    ? 'Avukatlar yükleniyor...'
                    : lawyersQueryError
                      ? 'Avukat listesi yüklenemedi'
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

              {lawyersQueryError && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                  <span>
                    {getCaseCreateErrorMessage(
                      lawyersQueryError,
                      'Atanabilir avukat listesi yüklenemedi.'
                    )}
                  </span>

                  <button
                    type="button"
                    disabled={
                      lawyersLoading ||
                      mutation.isPending
                    }
                    onClick={() =>
                      refetchLawyers?.()
                    }
                    className="font-semibold underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Tekrar Dene
                  </button>
                </div>
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
                    mutation.isPending
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
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
                    mutation.isPending
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
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

        {/* DAVA DETAY */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400">
                <FileText size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Dava Detayları
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Dava konusu ve büro içi açıklamalar
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
                mutation.isPending
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
                  mutation.isPending
                }
                maxLength={5000}
                rows={5}
                placeholder="Davanın özeti, önemli hususlar ve dosya hakkında açıklamalar..."
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
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Müvekkil
            </p>
            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {formData.client_ids.length} kişi
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

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
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
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Açılış
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-slate-300">
              <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
              {formData.opening_date ||
                'Belirtilmedi'}
            </div>
          </div>

        </div>

        {/* ACTIONS */}

        <div className="flex flex-col-reverse gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33] sm:flex-row sm:items-center sm:justify-end">

          <Button
            type="button"
            variant="secondary"
            disabled={
              mutation.isPending
            }
            onClick={
              handleCancel
            }
          >
            Vazgeç
          </Button>

          <Button
            type="submit"
            loading={
              mutation.isPending
            }
            disabled={
              mutation.isPending
            }
          >
            <Save className="h-4 w-4" />
            Dava Oluştur
          </Button>

        </div>

      </form>

      {unsavedDialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          aria-labelledby="case-create-unsaved-title"
          aria-describedby="case-create-unsaved-description"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Uyarıyı kapat"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
            onClick={
              closeUnsavedDialog
            }
          />

          <div
            ref={
              unsavedDialogRef
            }
            tabIndex={-1}
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-white/[0.08] dark:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/[0.1] dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2
                  id="case-create-unsaved-title"
                  className="text-base font-semibold text-slate-900 dark:text-white"
                >
                  Kaydedilmemiş değişiklikler
                </h2>

                <p
                  id="case-create-unsaved-description"
                  className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300"
                >
                  Yeni dava formunda henüz kaydetmediğiniz bilgiler var. Çıkarsanız bu bilgiler kaybolacaktır.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-white/[0.06] sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={
                  closeUnsavedDialog
                }
              >
                Düzenlemeye Devam Et
              </Button>

              <Button
                type="button"
                variant="danger"
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

    </div>
  );
};

export default CaseCreate;