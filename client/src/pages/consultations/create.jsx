import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  useConsultationAssignableUsers,
  useCreateConsultation,
} from '../../features/consultations/consultation.query.js';

import {
  CONSULTATION_BILLING_TYPE_OPTIONS,
  CONSULTATION_CURRENCY_OPTIONS,
  CONSULTATION_MODE_OPTIONS,
  CONSULTATION_PRIORITY_OPTIONS,
  CONSULTATION_SERVICE_MODEL_OPTIONS,
  CONSULTATION_SOURCE_OPTIONS,
  CONSULTATION_TYPE_OPTIONS,
  getConsultationBillingTypeLabel,
  getConsultationPriorityLabel,
  getConsultationPriorityVariant,
  getConsultationServiceModelLabel,
  getConsultationFeeValidationError,
  normalizeConsultationFeeAmount,
  isConsultationCurrency,
} from '../../features/consultations/consultation.constants.js';

import {
  CONSULTATION_PERMISSION_KEYS,
} from '../../features/consultations/consultation.permissions.js';

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
  Banknote,
  BriefcaseBusiness,
  FileText,
  Plus,
  Save,
  UserRound,
  Users,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const INITIAL_FORM = {
  party_mode:
    'client',

  client_id:
    '',

  prospect_name:
    '',

  prospect_phone:
    '',

  prospect_email:
    '',

  title:
    '',

  legal_area:
    '',

  consultation_type:
    'oral',

  consultation_mode:
    '',

  service_model:
    'one_time',

  description:
    '',

  assignee_ids:
    [],

  primary_assignee_id:
    '',

  billing_type:
    'fixed',

  agreed_fee:
    '',

  currency:
    'TRY',

  priority:
    'normal',

  source:
    '',
};

// ======================================================
// HELPERS
// ======================================================

const normalizeText = (
  value
) => {
  return String(
    value ||
    ''
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

const getCreatedConsultationId = (
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

const getFullName = (
  user
) => {
  return (
    [
      user?.first_name,
      user?.last_name,
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      )
      .trim() ||
    user?.name ||
    user?.full_name ||
    user?.email ||
    'Kullanıcı'
  );
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
  };

  return (
    labels[
      role
    ] ||
    role ||
    'Kullanıcı'
  );
};

const isAllowedOption = (
  options,
  value
) => {
  return options.some(
    (
      option
    ) =>
      option.value ===
      value
  );
};

const isLikelyTechnicalMessage = (
  value
) => {
  const message =
    String(
      value ||
      ''
    ).trim();

  if (
    !message
  ) {
    return false;
  }

  return /(?:validation failed|sequelize|constraint|foreign key|unique constraint|duplicate key|invalid input syntax|syntax error|stack trace|internal server error|network error|failed to fetch|econn|socket|timeout|request failed with status code|cannot read propert|undefined is not|null value in column|not-null violation|2350\d|22p02)/i.test(
    message
  );
};

const getConsultationCreateErrorMessage = (
  error,
  fallback =
    'Danışmanlık oluşturulamadı'
) => {
  const status =
    error?.response
      ?.status;

  const rawMessage =
    error?.response
      ?.data?.message ||
    error?.message ||
    '';

  if (
    status ===
    401
  ) {
    return 'Oturumunuz sona ermiş olabilir. Lütfen yeniden giriş yapın.';
  }

  if (
    status ===
    403
  ) {
    return 'Bu işlem için yetkiniz bulunmuyor.';
  }

  if (
    status ===
    404
  ) {
    return 'Seçilen müvekkil veya sorumlu artık erişilebilir değil.';
  }

  if (
    status ===
    409
  ) {
    return 'Bu bilgiler mevcut bir kayıtla çakışıyor. Alanları kontrol edip tekrar deneyin.';
  }

  if (
    Number(
      status
    ) >=
    500
  ) {
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

const FIELD_FALLBACKS = {
  client_id:
    'Müvekkil seçimini kontrol edin',

  prospect_name:
    'Talep sahibi adını kontrol edin',

  prospect_phone:
    'Telefon bilgisini kontrol edin',

  prospect_email:
    'E-posta bilgisini kontrol edin',

  title:
    'Danışmanlık başlığını kontrol edin',

  legal_area:
    'Hukuk alanını kontrol edin',

  consultation_type:
    'Danışmanlık türünü kontrol edin',

  consultation_mode:
    'Görüşme şeklini kontrol edin',

  service_model:
    'Hizmet modelini kontrol edin',

  description:
    'Açıklamayı kontrol edin',

  assignees:
    'Sorumlu seçimini kontrol edin',

  billing_type:
    'Ücretlendirme türünü kontrol edin',

  agreed_fee:
    'Ücret bilgisini kontrol edin',

  currency:
    'Para birimini kontrol edin',

  priority:
    'Öncelik bilgisini kontrol edin',

  source:
    'Talep kaynağını kontrol edin',
};

const getFieldErrorMessage = (
  field,
  rawMessage
) => {
  const message =
    String(
      rawMessage ||
      ''
    ).trim();

  if (
    message &&
    !isLikelyTechnicalMessage(
      message
    )
  ) {
    return message;
  }

  return (
    FIELD_FALLBACKS[
      field
    ] ||
    'Bu alanı kontrol edin'
  );
};

const getBackendFieldErrors = (
  error
) => {
  const responseData =
    error?.response
      ?.data;

  const nextErrors =
    {};

  const directField =
    responseData
      ?.field;

  if (
    directField
  ) {
    nextErrors[
      directField
    ] =
      getFieldErrorMessage(
        directField,
        responseData
          ?.message
      );
  }

  const backendErrors =
    responseData
      ?.errors;

  if (
    Array.isArray(
      backendErrors
    )
  ) {
    backendErrors.forEach(
      (
        item
      ) => {
        const field =
          item?.path ||
          item?.param ||
          item?.field;

        if (
          field
        ) {
          nextErrors[
            field
          ] =
            getFieldErrorMessage(
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
          !value
        ) {
          return;
        }

        nextErrors[
          field
        ] =
          getFieldErrorMessage(
            field,
            Array.isArray(
              value
            )
              ? value
                  .filter(
                    Boolean
                  )
                  .join(
                    ', '
                  )
              : String(
                  value
                )
          );
      }
    );
  }

  return nextErrors;
};

const normalizeFormForComparison = (
  value
) => {
  return {
    party_mode:
      value.party_mode,

    client_id:
      normalizeId(
        value.client_id
      ),

    prospect_name:
      normalizeText(
        value.prospect_name
      ),

    prospect_phone:
      normalizeText(
        value.prospect_phone
      ),

    prospect_email:
      normalizeText(
        value.prospect_email
      ),

    title:
      normalizeText(
        value.title
      ),

    legal_area:
      normalizeText(
        value.legal_area
      ),

    consultation_type:
      value.consultation_type,

    consultation_mode:
      value.consultation_mode,

    service_model:
      value.service_model,

    description:
      String(
        value.description ||
        ''
      ).trim(),

    assignee_ids:
      normalizeIds(
        value.assignee_ids
      ),

    primary_assignee_id:
      normalizeId(
        value.primary_assignee_id
      ),

    billing_type:
      value.billing_type,

    agreed_fee:
      String(
        value.agreed_fee ??
        ''
      ).trim(),

    currency:
      String(
        value.currency ||
        ''
      )
        .trim()
        .toUpperCase(),

    priority:
      value.priority,

    source:
      value.source,
  };
};

// ======================================================
// COMPONENT
// ======================================================

const ConsultationCreate = () => {
  const navigate =
    useNavigate();

  const {
    user,
  } =
    useAuth();

  const canCreateConsultation =
    hasPermission(
      user,
      CONSULTATION_PERMISSION_KEYS.CREATE
    );

  const canViewClients =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_CLIENTS
    );

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
    assigneeToAdd,
    setAssigneeToAdd,
  ] =
    useState('');

  const [
    unsavedDialogOpen,
    setUnsavedDialogOpen,
  ] =
    useState(
      false
    );

  const [
    pendingExitPath,
    setPendingExitPath,
  ] =
    useState('');

  const unsavedDialogRef =
    useRef(
      null
    );

  const previousFocusRef =
    useRef(
      null
    );

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
          limit:
            100,
        },
      ],

      queryFn: () =>
        clientApi.getAll({
          limit:
            100,
        }),

      enabled:
        canViewClients,
    });

  const {
    data:
      assigneesData,
    isLoading:
      assigneesLoading,
    error:
      assigneesQueryError,
    refetch:
      refetchAssignees,
  } =
    useConsultationAssignableUsers();

  useEffect(() => {
    if (
      user &&
      !canViewClients
    ) {
      setFormData((current) =>
        current.party_mode === 'client'
          ? {
              ...current,
              party_mode: 'prospect',
              client_id: '',
            }
          : current
      );
    }
  }, [
    user,
    canViewClients,
  ]);

  // ======================================================
  // DATA
  // ======================================================

  const clients =
    getArrayPayload(
      clientsData
    );

  const assignableUsers =
    getArrayPayload(
      assigneesData
    );

  const currentUserId =
    normalizeId(
      user?.id
    );

  const selectedAssigneeIds =
    normalizeIds(
      formData.assignee_ids
    );

  const selectedAssignees =
    selectedAssigneeIds
      .map(
        (
          id
        ) =>
          assignableUsers.find(
            (
              item
            ) =>
              normalizeId(
                item?.id
              ) ===
              id
          )
      )
      .filter(
        Boolean
      );

  const availableAssignees =
    assignableUsers.filter(
      (
        item
      ) =>
        !selectedAssigneeIds.includes(
          normalizeId(
            item?.id
          )
        )
    );

  const selectedClient =
    clients.find(
      (
        client
      ) =>
        normalizeId(
          client?.id
        ) ===
        normalizeId(
          formData.client_id
        )
    ) ||
    null;

  const initialNormalizedForm =
    useMemo(
      () =>
        normalizeFormForComparison(
          INITIAL_FORM
        ),
      []
    );

  const normalizedForm =
    normalizeFormForComparison(
      formData
    );

  const isDirty =
    JSON.stringify(
      normalizedForm
    ) !==
    JSON.stringify(
      initialNormalizedForm
    );

  // ======================================================
  // UNSAVED CHANGES / DIALOG ACCESSIBILITY
  // ======================================================

  useEffect(() => {
    if (
      !isDirty
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
  ]);

  useEffect(() => {
    const dialog =
      unsavedDialogOpen
        ? unsavedDialogRef
            .current
        : null;

    if (
      !dialog
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

    const getFocusableElements =
      () =>
        Array.from(
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
            focusable[
              0
            ] ||
            dialog
          )?.focus?.();
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
          focusable[
            0
          ];

        const last =
          focusable[
            focusable.length -
            1
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
    useCreateConsultation();

  const handleMutationError =
    (
      error
    ) => {
      const nextErrors =
        getBackendFieldErrors(
          error
        );

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
  // HANDLERS
  // ======================================================

  const clearFieldError =
    (
      name
    ) => {
      if (
        !errors[
          name
        ]
      ) {
        return;
      }

      setErrors(
        (
          current
        ) => ({
          ...current,
          [
            name
          ]:
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

      let nextValue =
        value;

      if (
        name ===
        'title'
      ) {
        nextValue =
          value.slice(
            0,
            240
          );
      }

      if (
        name ===
        'legal_area'
      ) {
        nextValue =
          value.slice(
            0,
            120
          );
      }

      if (
        name ===
        'prospect_name'
      ) {
        nextValue =
          value.slice(
            0,
            200
          );
      }

      if (
        name ===
        'prospect_phone'
      ) {
        nextValue =
          value.slice(
            0,
            50
          );
      }

      if (
        name ===
        'prospect_email'
      ) {
        nextValue =
          value.slice(
            0,
            254
          );
      }

      if (
        name ===
        'currency'
      ) {
        nextValue =
          value
            .replace(
              /[^A-Za-z]/g,
              ''
            )
            .slice(
              0,
              3
            )
            .toUpperCase();
      }

      setFormData(
        (
          current
        ) => ({
          ...current,
          [
            name
          ]:
            nextValue,
        })
      );

      clearFieldError(
        name
      );
    };

  const handlePartyModeChange =
    (
      mode
    ) => {
      if (
        mutation.isPending ||
        ![
          'client',
          'prospect',
        ].includes(
          mode
        )
      ) {
        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,
          party_mode:
            mode,
        })
      );

      setErrors(
        (
          current
        ) => ({
          ...current,

          client_id:
            '',

          prospect_name:
            '',

          prospect_phone:
            '',

          prospect_email:
            '',
        })
      );
    };

  // ======================================================
  // ASSIGNEES
  // ======================================================

  const handleAddAssignee =
    () => {
      if (
        mutation.isPending
      ) {
        return;
      }

      const normalizedUserId =
        normalizeId(
          assigneeToAdd
        );

      if (
        !normalizedUserId
      ) {
        return;
      }

      const exists =
        assignableUsers.some(
          (
            item
          ) =>
            normalizeId(
              item?.id
            ) ===
            normalizedUserId
        );

      if (
        !exists
      ) {
        setErrors(
          (
            current
          ) => ({
            ...current,

            assignees:
              'Seçilen sorumlu artık atanabilir değil',
          })
        );

        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          assignee_ids:
            normalizeIds([
              ...current.assignee_ids,
              normalizedUserId,
            ]),
        })
      );

      setAssigneeToAdd(
        ''
      );

      clearFieldError(
        'assignees'
      );
    };

  const handleRemoveAssignee =
    (
      id
    ) => {
      if (
        mutation.isPending
      ) {
        return;
      }

      const normalizedUserId =
        normalizeId(
          id
        );

      setFormData(
        (
          current
        ) => ({
          ...current,

          assignee_ids:
            normalizeIds(
              current.assignee_ids
            ).filter(
              (
                userId
              ) =>
                userId !==
                normalizedUserId
            ),

          primary_assignee_id:
            normalizeId(
              current.primary_assignee_id
            ) ===
            normalizedUserId
              ? ''
              : current.primary_assignee_id,
        })
      );

      clearFieldError(
        'assignees'
      );
    };

  const handlePrimaryAssignee =
    (
      id
    ) => {
      if (
        mutation.isPending
      ) {
        return;
      }

      const normalizedUserId =
        normalizeId(
          id
        );

      if (
        !selectedAssigneeIds.includes(
          normalizedUserId
        )
      ) {
        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          primary_assignee_id:
            normalizedUserId,
        })
      );

      clearFieldError(
        'assignees'
      );
    };

  const clearPrimaryAssignee =
    () => {
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

          primary_assignee_id:
            '',
        })
      );
    };

  // ======================================================
  // CANCEL / UNSAVED EXIT
  // ======================================================

  const requestExit =
    (
      path,
      event
    ) => {
      event
        ?.preventDefault?.();

      if (
        mutation.isPending
      ) {
        return;
      }

      if (
        !isDirty
      ) {
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
        '/consultations';

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
        '/consultations'
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

      if (
        !canCreateConsultation
      ) {
        toast.error(
          'Danışmanlık oluşturma yetkiniz bulunmuyor'
        );
        return;
      }

      const nextErrors =
        {};

      const title =
        normalizeText(
          formData.title
        );

      const legalArea =
        normalizeText(
          formData.legal_area
        );

      const prospectName =
        normalizeText(
          formData.prospect_name
        );

      const prospectPhone =
        normalizeText(
          formData.prospect_phone
        );

      const prospectEmail =
        normalizeText(
          formData.prospect_email
        );

      const description =
        String(
          formData.description ||
          ''
        ).trim();

      const clientId =
        normalizeId(
          formData.client_id
        );

      const primaryAssigneeId =
        normalizeId(
          formData.primary_assignee_id
        );

      // PARTY

      if (
        formData.party_mode ===
        'client'
      ) {
        if (
          clientsQueryError
        ) {
          nextErrors.client_id =
            'Müvekkil listesi yüklenemedi. Listeyi yenileyip tekrar deneyin.';
        } else if (
          !clientId
        ) {
          nextErrors.client_id =
            'Müvekkil seçilmelidir';
        } else if (
          !clients.some(
            (
              client
            ) =>
              normalizeId(
                client?.id
              ) ===
              clientId
          )
        ) {
          nextErrors.client_id =
            'Seçilen müvekkil artık erişilebilir değil';
        }
      } else {
        if (
          prospectName.length <
            2 ||
          prospectName.length >
            200
        ) {
          nextErrors.prospect_name =
            'Ad soyad 2-200 karakter arasında olmalıdır';
        }

        if (
          prospectPhone.length >
          50
        ) {
          nextErrors.prospect_phone =
            'Telefon en fazla 50 karakter olabilir';
        }

        if (
          prospectEmail &&
          (
            prospectEmail.length >
              254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
              prospectEmail
            )
          )
        ) {
          nextErrors.prospect_email =
            'Geçerli bir e-posta adresi girin';
        }
      }

      // CONSULTATION

      if (
        title.length <
          2 ||
        title.length >
          240
      ) {
        nextErrors.title =
          'Başlık 2-240 karakter arasında olmalıdır';
      }

      if (
        legalArea.length <
          2 ||
        legalArea.length >
          120
      ) {
        nextErrors.legal_area =
          'Hukuk alanı 2-120 karakter arasında olmalıdır';
      }

      if (
        !isAllowedOption(
          CONSULTATION_TYPE_OPTIONS,
          formData.consultation_type
        )
      ) {
        nextErrors.consultation_type =
          'Geçerli bir danışmanlık türü seçin';
      }

      if (
        !isAllowedOption(
          CONSULTATION_SERVICE_MODEL_OPTIONS,
          formData.service_model
        )
      ) {
        nextErrors.service_model =
          'Geçerli bir hizmet modeli seçin';
      }

      if (
        formData.consultation_mode &&
        !isAllowedOption(
          CONSULTATION_MODE_OPTIONS,
          formData.consultation_mode
        )
      ) {
        nextErrors.consultation_mode =
          'Geçerli bir görüşme şekli seçin';
      }

      // ASSIGNEES

      if (
        assigneesQueryError
      ) {
        nextErrors.assignees =
          'Sorumlu listesi yüklenemedi. Listeyi yenileyip tekrar deneyin.';
      } else if (
        selectedAssigneeIds.length ===
        0
      ) {
        nextErrors.assignees =
          'En az bir sorumlu seçilmelidir';
      } else {
        const assignableIds =
          new Set(
            assignableUsers.map(
              (
                item
              ) =>
                normalizeId(
                  item?.id
                )
            )
          );

        if (
          selectedAssigneeIds.some(
            (
              id
            ) =>
              !assignableIds.has(
                id
              )
          )
        ) {
          nextErrors.assignees =
            'Seçili sorumlulardan biri artık atanabilir değil';
        }

        if (
          primaryAssigneeId &&
          !selectedAssigneeIds.includes(
            primaryAssigneeId
          )
        ) {
          nextErrors.assignees =
            'Ana sorumlu seçili sorumlular arasında olmalıdır';
        }
      }

      // FINANCE / META

      if (
        !isAllowedOption(
          CONSULTATION_BILLING_TYPE_OPTIONS,
          formData.billing_type
        )
      ) {
        nextErrors.billing_type =
          'Geçerli bir ücretlendirme türü seçin';
      }

      const feeError =
        getConsultationFeeValidationError(
          formData.agreed_fee,
          formData.billing_type
        );

      if (
        feeError
      ) {
        nextErrors.agreed_fee =
          feeError;
      }

      const currency =
        String(
          formData.currency ||
          ''
        )
          .trim()
          .toUpperCase();

      if (
        !isConsultationCurrency(
          currency
        )
      ) {
        nextErrors.currency =
          'Para birimi TRY, USD, EUR veya GBP olmalıdır';
      }

      if (
        !isAllowedOption(
          CONSULTATION_PRIORITY_OPTIONS,
          formData.priority
        )
      ) {
        nextErrors.priority =
          'Geçerli bir öncelik seçin';
      }

      if (
        formData.source &&
        !isAllowedOption(
          CONSULTATION_SOURCE_OPTIONS,
          formData.source
        )
      ) {
        nextErrors.source =
          'Geçerli bir talep kaynağı seçin';
      }

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

      const submitData = {
        title,

        description:
          description ||
          null,

        client_id:
          formData.party_mode ===
          'client'
            ? clientId
            : null,

        prospect_name:
          formData.party_mode ===
          'prospect'
            ? prospectName
            : null,

        prospect_phone:
          formData.party_mode ===
          'prospect'
            ? normalizeNullable(
                prospectPhone
              )
            : null,

        prospect_email:
          formData.party_mode ===
          'prospect'
            ? normalizeNullable(
                prospectEmail
              )
            : null,

        legal_area:
          legalArea,

        consultation_type:
          formData.consultation_type,

        consultation_mode:
          formData.consultation_mode ||
          null,

        service_model:
          formData.service_model,

        priority:
          formData.priority,

        billing_type:
          formData.billing_type,

        agreed_fee:
          formData.billing_type ===
          'free' ||
          formData.agreed_fee ===
          ''
            ? null
            : normalizeConsultationFeeAmount(
                formData.agreed_fee
              ),

        currency,

        source:
          formData.source ||
          null,

        assignees:
          selectedAssigneeIds.map(
            (
              userId
            ) => ({
              user_id:
                userId,

              is_primary:
                primaryAssigneeId ===
                userId,
            })
          ),
      };

      mutation.mutate(
        submitData,
        {
          onSuccess:
            (
              response
            ) => {
              const createdId =
                getCreatedConsultationId(
                  response
                );

              if (
                createdId
              ) {
                navigate(
                  `/consultations/${createdId}`
                );

                return;
              }

              navigate(
                '/consultations'
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
          to="/consultations"
          onClick={(
            event
          ) =>
            requestExit(
              '/consultations',
              event
            )
          }
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Danışmanlıklar
        </Link>

        <div className="mt-3 flex items-start gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
            <BriefcaseBusiness size={21} />
          </div>

          <div>

            <div className="flex flex-wrap items-center gap-2">

              <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
                Yeni Danışmanlık
              </h1>

              {isDirty && (
                <Badge variant="warning">
                  Kaydedilmemiş değişiklik
                </Badge>
              )}

            </div>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-slate-400">
              Talep sahibini, danışmanlık kapsamını, sorumlu ekibi ve ücret bilgisini belirleyin.
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

        {/* TALEP SAHİBİ */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400">
                <UserRound size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Talep Sahibi
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Mevcut bir müvekkil veya henüz müvekkil olmayan potansiyel kişi seçin.
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div className="grid gap-3 sm:grid-cols-2">

              <button
                type="button"
                disabled={
                  mutation.isPending
                }
                onClick={() =>
                  handlePartyModeChange(
                    'client'
                  )
                }
                className={`rounded-xl border p-4 text-left transition ${
                  formData.party_mode ===
                  'client'
                    ? 'border-blue-300 bg-blue-50/70 ring-2 ring-blue-500/10 dark:border-blue-500/30 dark:bg-blue-500/[0.07]'
                    : 'border-gray-200 bg-white hover:border-gray-300 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/[0.14]'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Mevcut Müvekkil
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-400">
                  Sistemde kayıtlı bir müvekkile bağlanır.
                </p>
              </button>

              <button
                type="button"
                disabled={
                  mutation.isPending
                }
                onClick={() =>
                  handlePartyModeChange(
                    'prospect'
                  )
                }
                className={`rounded-xl border p-4 text-left transition ${
                  formData.party_mode ===
                  'prospect'
                    ? 'border-blue-300 bg-blue-50/70 ring-2 ring-blue-500/10 dark:border-blue-500/30 dark:bg-blue-500/[0.07]'
                    : 'border-gray-200 bg-white hover:border-gray-300 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/[0.14]'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Yeni / Potansiyel Kişi
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-400">
                  Kişi müvekkil kaydına dönüştürülmeden danışmanlık açılır.
                </p>
              </button>

            </div>

            {formData.party_mode ===
            'client' ? (
              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Müvekkil *
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
                    mutation.isPending
                  }
                  className={`h-10 w-full rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/[0.035] dark:text-slate-300 ${
                    errors.client_id
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                  }`}
                >
                  <option value="">
                    {clientsLoading
                      ? 'Müvekkiller yükleniyor...'
                      : clientsQueryError
                        ? 'Müvekkiller yüklenemedi'
                        : 'Müvekkil seçin'}
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

                {errors.client_id && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {errors.client_id}
                  </p>
                )}

                {clientsQueryError && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/[0.07] dark:text-amber-200">

                    <span>
                      {getConsultationCreateErrorMessage(
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

                {selectedClient && (
                  <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3 dark:border-white/[0.05] dark:bg-white/[0.02]">

                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedClient.name}
                    </p>

                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      {selectedClient.email ||
                        selectedClient.phone ||
                        'İletişim bilgisi bulunmuyor'}
                    </p>

                  </div>
                )}

              </div>
            ) : (
              <div className="space-y-4">

                <Input
                  label="Ad Soyad *"
                  name="prospect_name"
                  value={
                    formData.prospect_name
                  }
                  onChange={
                    handleChange
                  }
                  error={
                    errors.prospect_name
                  }
                  disabled={
                    mutation.isPending
                  }
                  maxLength={200}
                  placeholder="Örn: Ahmet Yılmaz"
                  autoFocus
                />

                <div className="grid gap-4 md:grid-cols-2">

                  <Input
                    label="Telefon"
                    name="prospect_phone"
                    value={
                      formData.prospect_phone
                    }
                    onChange={
                      handleChange
                    }
                    error={
                      errors.prospect_phone
                    }
                    disabled={
                      mutation.isPending
                    }
                    maxLength={50}
                    placeholder="Örn: +90 5..."
                  />

                  <Input
                    label="E-posta"
                    name="prospect_email"
                    type="email"
                    value={
                      formData.prospect_email
                    }
                    onChange={
                      handleChange
                    }
                    error={
                      errors.prospect_email
                    }
                    disabled={
                      mutation.isPending
                    }
                    maxLength={254}
                    placeholder="ornek@eposta.com"
                  />

                </div>

              </div>
            )}

          </Card.Body>

        </Card>

        {/* DANIŞMANLIK BİLGİLERİ */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
                <FileText size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Danışmanlık Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Hukuki talebin kapsamını ve hizmet modelini tanımlayın.
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <Input
              label="Başlık *"
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
              maxLength={240}
              placeholder="Örn: İş sözleşmesinin feshi hakkında danışmanlık"
            />

            <Input
              label="Hukuk Alanı *"
              name="legal_area"
              value={
                formData.legal_area
              }
              onChange={
                handleChange
              }
              error={
                errors.legal_area
              }
              disabled={
                mutation.isPending
              }
              maxLength={120}
              placeholder="Örn: İş Hukuku"
            />

            <div className="grid gap-4 md:grid-cols-2">

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Danışmanlık Türü *
                </label>

                <select
                  name="consultation_type"
                  value={
                    formData.consultation_type
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    mutation.isPending
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
                >
                  {CONSULTATION_TYPE_OPTIONS.map(
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

                {errors.consultation_type && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {errors.consultation_type}
                  </p>
                )}

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Hizmet Modeli *
                </label>

                <select
                  name="service_model"
                  value={
                    formData.service_model
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    mutation.isPending
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
                >
                  {CONSULTATION_SERVICE_MODEL_OPTIONS.map(
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

                {errors.service_model && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {errors.service_model}
                  </p>
                )}

              </div>

            </div>

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Görüşme Şekli
              </label>

              <select
                name="consultation_mode"
                value={
                  formData.consultation_mode
                }
                onChange={
                  handleChange
                }
                disabled={
                  mutation.isPending
                }
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
              >
                {CONSULTATION_MODE_OPTIONS.map(
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

              {errors.consultation_mode && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {errors.consultation_mode}
                </p>
              )}

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
                    rows={6}
                placeholder="Talebin özeti, incelenecek hususlar, müvekkilin beklentisi ve önemli notlar..."
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
                  {formData.description.length} karakter
                </p>

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* SORUMLULAR */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/[0.08] dark:text-violet-400">
                <Users size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Sorumlu Ekip
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  En az bir sorumlu seçin. Ana sorumlu belirlemek zorunlu değildir.
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-4">

            <div className="flex flex-col gap-2 sm:flex-row">

              <select
                value={
                  assigneeToAdd
                }
                onChange={(
                  event
                ) => {
                  if (
                    mutation.isPending
                  ) {
                    return;
                  }

                  setAssigneeToAdd(
                    normalizeId(
                      event.target.value
                    )
                  );
                }}
                disabled={
                  assigneesLoading ||
                  mutation.isPending
                }
                className={`h-10 flex-1 rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/[0.035] dark:text-slate-300 ${
                  errors.assignees
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                }`}
              >
                <option value="">
                  {assigneesLoading
                    ? 'Sorumlular yükleniyor...'
                    : assigneesQueryError
                      ? 'Sorumlu listesi yüklenemedi'
                      : availableAssignees.length ===
                          0
                        ? 'Eklenebilecek sorumlu yok'
                        : 'Sorumlu seçin'}
                </option>

                {availableAssignees.map(
                  (
                    assignee
                  ) => (
                    <option
                      key={
                        assignee.id
                      }
                      value={
                        normalizeId(
                          assignee.id
                        )
                      }
                    >
                      {getFullName(
                        assignee
                      )}
                      {' · '}
                      {getRoleLabel(
                        assignee.role
                      )}
                      {normalizeId(
                        assignee.id
                      ) ===
                      currentUserId
                        ? ' (Ben)'
                        : ''}
                    </option>
                  )
                )}
              </select>

              <Button
                type="button"
                variant="secondary"
                onClick={
                  handleAddAssignee
                }
                disabled={
                  !assigneeToAdd ||
                  mutation.isPending
                }
              >
                <Plus className="h-4 w-4" />
                Ekle
              </Button>

            </div>

            {errors.assignees && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.assignees}
              </p>
            )}

            {assigneesQueryError && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/[0.07] dark:text-amber-200">

                <span>
                  {getConsultationCreateErrorMessage(
                    assigneesQueryError,
                    'Sorumlu listesi yüklenemedi.'
                  )}
                </span>

                <button
                  type="button"
                  disabled={
                    assigneesLoading ||
                    mutation.isPending
                  }
                  onClick={() =>
                    refetchAssignees?.()
                  }
                  className="font-semibold underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tekrar Dene
                </button>

              </div>
            )}

            {selectedAssignees.length >
            0 ? (
              <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.05]">

                <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

                  {selectedAssignees.map(
                    (
                      assignee
                    ) => {
                      const assigneeId =
                        normalizeId(
                          assignee.id
                        );

                      const isPrimary =
                        normalizeId(
                          formData.primary_assignee_id
                        ) ===
                        assigneeId;

                      return (
                        <div
                          key={
                            assignee.id
                          }
                          className="flex flex-col gap-3 bg-white px-4 py-3 dark:bg-transparent sm:flex-row sm:items-center sm:justify-between"
                        >

                          <div className="flex min-w-0 items-center gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/[0.04] dark:text-slate-400">
                              <UserRound size={16} />
                            </div>

                            <div className="min-w-0">

                              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                {getFullName(
                                  assignee
                                )}
                                {assigneeId ===
                                currentUserId
                                  ? ' (Ben)'
                                  : ''}
                              </p>

                              <div className="mt-1 flex flex-wrap items-center gap-2">

                                <Badge variant="default">
                                  {getRoleLabel(
                                    assignee.role
                                  )}
                                </Badge>

                                {isPrimary && (
                                  <Badge variant="primary">
                                    Ana Sorumlu
                                  </Badge>
                                )}

                              </div>

                            </div>

                          </div>

                          <div className="flex items-center gap-2 sm:justify-end">

                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-blue-200 hover:text-blue-600 dark:border-white/[0.08] dark:text-slate-400 dark:hover:border-blue-500/30 dark:hover:text-blue-400">

                              <input
                                type="radio"
                                name="primary_assignee"
                                checked={
                                  isPrimary
                                }
                                disabled={
                                  mutation.isPending
                                }
                                onChange={() =>
                                  handlePrimaryAssignee(
                                    assigneeId
                                  )
                                }
                                className="h-3.5 w-3.5"
                              />

                              Ana Sorumlu

                            </label>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveAssignee(
                                  assigneeId
                                )
                              }
                              disabled={
                                mutation.isPending
                              }
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/[0.08] dark:hover:text-red-400"
                              title="Sorumluyu kaldır"
                            >
                              <X className="h-4 w-4" />
                            </button>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center dark:border-white/[0.07]">

                <Users className="mx-auto h-6 w-6 text-gray-300 dark:text-slate-600" />

                <p className="mt-2 text-sm text-gray-500 dark:text-slate-500">
                  Henüz sorumlu eklenmedi.
                </p>

              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">

              <p className="text-xs text-gray-400 dark:text-slate-500">
                {selectedAssignees.length} sorumlu seçildi
              </p>

              {formData.primary_assignee_id && (
                <button
                  type="button"
                  disabled={
                    mutation.isPending
                  }
                  onClick={
                    clearPrimaryAssignee
                  }
                  className="text-xs font-semibold text-gray-500 underline underline-offset-2 transition hover:text-blue-600 disabled:opacity-50 dark:text-slate-400 dark:hover:text-blue-400"
                >
                  Ana sorumluyu kaldır
                </button>
              )}

            </div>

          </Card.Body>

        </Card>

        {/* ÜCRET */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400">
                <Banknote size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Ücret Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  V1 kapsamında danışmanlık üzerindeki temel ücret bilgisini kaydedin.
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Ücretlendirme *
              </label>

              <select
                name="billing_type"
                value={
                  formData.billing_type
                }
                onChange={(
                  event
                ) => {
                  handleChange(
                    event
                  );

                  if (
                    event.target.value ===
                    'free'
                  ) {
                    setFormData(
                      (
                        current
                      ) => ({
                        ...current,
                        agreed_fee:
                          '',
                      })
                    );

                    clearFieldError(
                      'agreed_fee'
                    );
                  }
                }}
                disabled={
                  mutation.isPending
                }
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
              >
                {CONSULTATION_BILLING_TYPE_OPTIONS.map(
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

              {errors.billing_type && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {errors.billing_type}
                </p>
              )}

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label="Kararlaştırılan Ücret"
                name="agreed_fee"
                type="number"
                min="0.01"
                max="999999999999.99"
                step="0.01"
                value={
                  formData.agreed_fee
                }
                onChange={
                  handleChange
                }
                error={
                  errors.agreed_fee
                }
                disabled={
                  mutation.isPending ||
                  formData.billing_type ===
                    'free'
                }
                placeholder={
                  formData.billing_type ===
                  'free'
                    ? 'Ücretsiz danışmanlık'
                    : 'Örn: 7500'
                }
              />

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Para Birimi *
                </label>

                <select
                  name="currency"
                  value={
                    formData.currency
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    mutation.isPending
                  }
                  className={`h-10 w-full rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 dark:bg-white/[0.035] dark:text-slate-300 ${
                    errors.currency
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                  }`}
                >
                  {CONSULTATION_CURRENCY_OPTIONS.map(
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

                {errors.currency && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {errors.currency}
                  </p>
                )}

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* SON */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/[0.05] dark:text-slate-400">
                <BriefcaseBusiness size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Kayıt Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Öncelik ve talebin büroya geliş kaynağını belirleyin.
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

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
                  disabled={
                    mutation.isPending
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
                >
                  {CONSULTATION_PRIORITY_OPTIONS.map(
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

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Talep Kaynağı
                </label>

                <select
                  name="source"
                  value={
                    formData.source
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    mutation.isPending
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
                >
                  {CONSULTATION_SOURCE_OPTIONS.map(
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

                {errors.source && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {errors.source}
                  </p>
                )}

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* SUMMARY */}

        <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-white/[0.07] dark:bg-white/[0.015] sm:grid-cols-4">

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Talep Sahibi
            </p>

            <p className="mt-1 truncate text-sm font-medium text-gray-700 dark:text-slate-300">
              {formData.party_mode ===
              'client'
                ? selectedClient
                    ?.name ||
                  'Seçilmedi'
                : normalizeText(
                    formData.prospect_name
                  ) ||
                  'Girilecek'}
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Sorumlu
            </p>

            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {selectedAssigneeIds.length} kişi
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Hizmet
            </p>

            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {getConsultationServiceModelLabel(
                formData.service_model
              )}
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Öncelik
            </p>

            <div className="mt-1">

              <Badge
                variant={
                  getConsultationPriorityVariant(
                    formData.priority
                  )
                }
              >
                {getConsultationPriorityLabel(
                  formData.priority
                )}
              </Badge>

            </div>

          </div>

          <div className="sm:col-span-4">

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Ücret
            </p>

            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {getConsultationBillingTypeLabel(
                formData.billing_type
              )}
              {formData.billing_type !==
                'free' &&
              formData.agreed_fee
                ? ` · ${formData.agreed_fee} ${formData.currency}`
                : ''}
            </p>

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
              mutation.isPending ||
              !canCreateConsultation
            }
          >
            <Save className="h-4 w-4" />
            Danışmanlığı Oluştur
          </Button>

        </div>

      </form>

      {unsavedDialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          aria-labelledby="consultation-create-unsaved-title"
          aria-describedby="consultation-create-unsaved-description"
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
                  id="consultation-create-unsaved-title"
                  className="text-base font-semibold text-slate-900 dark:text-white"
                >
                  Kaydedilmemiş değişiklikler
                </h2>

                <p
                  id="consultation-create-unsaved-description"
                  className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300"
                >
                  Yeni danışmanlık formunda henüz kaydetmediğiniz bilgiler var. Çıkarsanız bu bilgiler kaybolacaktır.
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

export default ConsultationCreate;
