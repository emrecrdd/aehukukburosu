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
  useConsultation,
  useConsultationAssignableUsers,
  useDeleteConsultation,
  useUpdateConsultation,
  useUpdateConsultationStatus,
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
  getConsultationFeeValidationError,
  getConsultationPriorityLabel,
  getConsultationPriorityVariant,
  getConsultationServiceModelLabel,
  getConsultationStatusLabel,
  getConsultationStatusVariant,
  canTransitionConsultationStatus,
  getConsultationStatusTransitionOptions,
  isConsultationCurrency,
  isConsultationTerminalStatus,
  normalizeConsultationFeeAmount,
} from '../../features/consultations/consultation.constants.js';

import clientApi from '../../features/clients/client.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import {
  CONSULTATION_PERMISSION_KEYS,
} from '../../features/consultations/consultation.permissions.js';

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

  status:
    'new',
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

const getConsultationItem = (
  response
) => {
  return (
    response?.data?.data ??
    response?.data ??
    null
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

const isPrimaryAssignee = (
  user
) => {
  return Boolean(
    user?.ConsultationAssignee
      ?.is_primary ??
    user?.consultation_assignee
      ?.is_primary ??
    user?.through
      ?.is_primary ??
    user?.is_primary
  );
};

const getPrimaryAssigneeId = (
  consultation
) => {
  const assignees =
    Array.isArray(
      consultation
        ?.assignees
    )
      ? consultation.assignees
      : [];

  const primary =
    assignees.find(
      isPrimaryAssignee
    );

  return normalizeId(
    primary?.id
  );
};

const mergeById = (
  primary,
  secondary
) => {
  const map =
    new Map();

  [
    ...(Array.isArray(primary)
      ? primary
      : []),
    ...(Array.isArray(secondary)
      ? secondary
      : []),
  ].forEach(
    (
      item
    ) => {
      const id =
        normalizeId(
          item?.id
        );

      if (
        !id
      ) {
        return;
      }

      if (
        !map.has(
          id
        )
      ) {
        map.set(
          id,
          item
        );
      }
    }
  );

  return [
    ...map.values(),
  ];
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

const normalizeAssigneeSelection = (
  form
) => {
  const ids =
    normalizeIds(
      form.assignee_ids
    ).sort();

  const primaryId =
    normalizeId(
      form.primary_assignee_id
    );

  return {
    assignee_ids:
      ids,

    primary_assignee_id:
      primaryId &&
      ids.includes(
        primaryId
      )
        ? primaryId
        : '',
  };
};

const normalizeCoreForm = (
  form
) => {
  const partyMode =
    form.party_mode ===
    'prospect'
      ? 'prospect'
      : 'client';

  const assignees =
    normalizeAssigneeSelection(
      form
    );

  return {
    party_mode:
      partyMode,

    client_id:
      partyMode ===
      'client'
        ? normalizeId(
            form.client_id
          )
        : '',

    /*
     * Müvekkile dönüştürülmüş danışmanlıklarda prospect alanları
     * tarihçe olarak korunur. Edit compare bunları client modunda da
     * saklar; submit sırasında sıfırlanmaz.
     */
    prospect_name:
      normalizeNullable(
        form.prospect_name
      ),

    prospect_phone:
      normalizeNullable(
        form.prospect_phone
      ),

    prospect_email:
      normalizeNullable(
        form.prospect_email
      ),

    title:
      normalizeText(
        form.title
      ),

    legal_area:
      normalizeText(
        form.legal_area
      ),

    consultation_type:
      form.consultation_type,

    consultation_mode:
      form.consultation_mode ||
      '',

    service_model:
      form.service_model,

    description:
      String(
        form.description ||
        ''
      ).trim(),

    assignee_ids:
      assignees.assignee_ids,

    primary_assignee_id:
      assignees.primary_assignee_id,

    billing_type:
      form.billing_type,

    agreed_fee:
      form.billing_type ===
      'free' ||
      form.agreed_fee ===
      ''
        ? null
        : normalizeConsultationFeeAmount(
            form.agreed_fee
          ),

    currency:
      String(
        form.currency ||
        ''
      )
        .trim()
        .toUpperCase(),

    priority:
      form.priority,

    source:
      form.source ||
      '',
  };
};

const toConsultationMutablePayload = (
  normalizedForm
) => {
  return {
    title:
      normalizedForm.title,

    description:
      normalizedForm.description ||
      null,

    client_id:
      normalizedForm.party_mode ===
      'client'
        ? normalizedForm.client_id
        : null,

    prospect_name:
      normalizedForm.prospect_name,

    prospect_phone:
      normalizedForm.prospect_phone,

    prospect_email:
      normalizedForm.prospect_email,

    legal_area:
      normalizedForm.legal_area,

    consultation_type:
      normalizedForm.consultation_type,

    consultation_mode:
      normalizedForm.consultation_mode ||
      null,

    service_model:
      normalizedForm.service_model,

    priority:
      normalizedForm.priority,

    billing_type:
      normalizedForm.billing_type,

    agreed_fee:
      normalizedForm.billing_type ===
      'free'
        ? null
        : normalizedForm.agreed_fee,

    currency:
      normalizedForm.currency,

    source:
      normalizedForm.source ||
      null,
  };
};

const buildChangedConsultationPayload = (
  currentNormalizedForm,
  initialNormalizedForm
) => {
  const current =
    toConsultationMutablePayload(
      currentNormalizedForm
    );

  const initial =
    toConsultationMutablePayload(
      initialNormalizedForm
    );

  return Object.fromEntries(
    Object.keys(
      current
    )
      .filter(
        (
          key
        ) =>
          JSON.stringify(
            current[key]
          ) !==
          JSON.stringify(
            initial[key]
          )
      )
      .map(
        (
          key
        ) => [
          key,
          current[key],
        ]
      )
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

const getConsultationEditErrorMessage = (
  error,
  fallback =
    'Danışmanlık güncellenemedi'
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
    return 'Danışmanlık, seçilen müvekkil veya sorumlu bulunamadı ya da erişim yetkiniz yok.';
  }

  if (
    status ===
    409
  ) {
    return 'İşlem mevcut kayıt durumu ile çakışıyor. Sayfayı yenileyip tekrar deneyin.';
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

  status:
    'Danışmanlık durumunu kontrol edin',
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
          !field
        ) {
          return;
        }

        nextErrors[
          field
        ] =
          getFieldErrorMessage(
            field,
            item?.message ||
              item?.msg
          );
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
              : value
          );
      }
    );
  }

  return nextErrors;
};

// ======================================================
// COMPONENT
// ======================================================

const ConsultationEdit = () => {
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

  const initializedIdRef =
    useRef(
      ''
    );

  const deleteDialogRef =
    useRef(
      null
    );

  const leaveDialogRef =
    useRef(
      null
    );

  const canUpdate =
    hasPermission(
      user,
      CONSULTATION_PERMISSION_KEYS.UPDATE
    );

  const canDelete =
    hasPermission(
      user,
      CONSULTATION_PERMISSION_KEYS.DELETE
    );

  const canViewClients =
    hasPermission(
      user,
      PERMISSION_KEYS
        .VIEW_CLIENTS
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
    assigneeToAdd,
    setAssigneeToAdd,
  ] =
    useState('');

  const [
    deleteDialogOpen,
    setDeleteDialogOpen,
  ] =
    useState(
      false
    );

  const [
    leaveDialogOpen,
    setLeaveDialogOpen,
  ] =
    useState(
      false
    );

  const [
    pendingNavigationTarget,
    setPendingNavigationTarget,
  ] =
    useState('');

  // ======================================================
  // QUERIES
  // ======================================================

  const {
    data:
      consultationData,
    isLoading:
      consultationLoading,
    error:
      consultationError,
  } =
    useConsultation(
      id
    );

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
        'consultation-edit',
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

  // ======================================================
  // DATA
  // ======================================================

  const consultation =
    getConsultationItem(
      consultationData
    );

  const baseClients =
    getArrayPayload(
      clientsData
    );

  const currentClient =
    consultation
      ?.client
      ? [
          consultation.client,
        ]
      : [];

  const clients =
    mergeById(
      baseClients,
      currentClient
    );

  const assignableUsers =
    getArrayPayload(
      assigneesData
    );

  const currentAssignees =
    Array.isArray(
      consultation
        ?.assignees
    )
      ? consultation.assignees
      : [];

  const displayAssignees =
    mergeById(
      assignableUsers,
      currentAssignees
    );

  const currentUserId =
    normalizeId(
      user?.id
    );

  // ======================================================
  // FILL FORM
  // ======================================================

  useEffect(() => {
    if (
      !consultation ||
      !id
    ) {
      return;
    }

    if (
      initializedIdRef.current ===
      id
    ) {
      return;
    }

    const assigneeIds =
      normalizeIds(
        currentAssignees.map(
          (
            assignee
          ) =>
            assignee?.id
        )
      );

    const nextForm = {
      party_mode:
        consultation
          .client_id
          ? 'client'
          : 'prospect',

      client_id:
        normalizeId(
          consultation
            .client_id ??
          consultation
            .client
            ?.id
        ),

      /*
       * Prospect bilgileri client varsa da tutulur.
       * Bunlar geçmiş intake verisidir ve edit sırasında silinmez.
       */
      prospect_name:
        consultation
          .prospect_name ||
        '',

      prospect_phone:
        consultation
          .prospect_phone ||
        '',

      prospect_email:
        consultation
          .prospect_email ||
        '',

      title:
        consultation
          .title ||
        '',

      legal_area:
        consultation
          .legal_area ||
        '',

      consultation_type:
        consultation
          .consultation_type ||
        'oral',

      consultation_mode:
        consultation
          .consultation_mode ||
        '',

      service_model:
        consultation
          .service_model ||
        'one_time',

      description:
        consultation
          .description ||
        '',

      assignee_ids:
        assigneeIds,

      primary_assignee_id:
        getPrimaryAssigneeId(
          consultation
        ),

      billing_type:
        consultation
          .billing_type ||
        'fixed',

      agreed_fee:
        consultation
          .agreed_fee ===
          null ||
        consultation
          .agreed_fee ===
          undefined
          ? ''
          : String(
              consultation
                .agreed_fee
            ),

      currency:
        consultation
          .currency ||
        'TRY',

      priority:
        consultation
          .priority ||
        'normal',

      source:
        consultation
          .source ||
        '',

      status:
        consultation
          .status ||
        'new',
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

    initializedIdRef.current =
      id;
  }, [
    consultation,
    id,
    currentAssignees,
  ]);

  // ======================================================
  // DERIVED
  // ======================================================

  const selectedAssigneeIds =
    normalizeIds(
      formData
        .assignee_ids
    );

  const selectedAssignees =
    selectedAssigneeIds
      .map(
        (
          assigneeId
        ) =>
          displayAssignees.find(
            (
              item
            ) =>
              normalizeId(
                item?.id
              ) ===
              assigneeId
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
          formData
            .client_id
        )
    ) ||
    null;

  const normalizedCoreForm =
    normalizeCoreForm(
      formData
    );

  const initialNormalizedCoreForm =
    normalizeCoreForm(
      initialFormData
    );

  const currentAssigneeSelection =
    normalizeAssigneeSelection(
      formData
    );

  const initialAssigneeSelection =
    normalizeAssigneeSelection(
      initialFormData
    );

  const assigneesDirty =
    JSON.stringify(
      currentAssigneeSelection
    ) !==
    JSON.stringify(
      initialAssigneeSelection
    );

  const coreDirty =
    JSON.stringify(
      normalizedCoreForm
    ) !==
    JSON.stringify(
      initialNormalizedCoreForm
    );

  const statusDirty =
    formData.status !==
    initialFormData.status;

  const isDirty =
    coreDirty ||
    statusDirty;

  const isConverted =
    consultation
      ?.status ===
      'converted_to_case';

  const isTerminal =
    isConsultationTerminalStatus(
      consultation?.status
    );

  const canMutate =
    Boolean(
      canUpdate &&
      !isTerminal
    );

  const statusTransitionOptions =
    getConsultationStatusTransitionOptions(
      initialFormData.status,
      {
        includeCurrent:
          true,
      }
    );

  const deleteAllowed =
    canDelete &&
    !isConverted;

  const deleteName =
    [
      consultation
        ?.consultation_number,
      consultation
        ?.title,
    ]
      .filter(
        Boolean
      )
      .join(
        ' · '
      ) ||
    'Seçili danışmanlık';

  // ======================================================
  // MUTATIONS
  // ======================================================

  const updateMutation =
    useUpdateConsultation();

  const statusMutation =
    useUpdateConsultationStatus();

  const deleteMutation =
    useDeleteConsultation();

  const isPending =
    updateMutation.isPending ||
    statusMutation.isPending ||
    deleteMutation.isPending;

  // ======================================================
  // UNSAVED CHANGE GUARD
  // ======================================================

  useEffect(() => {
    if (
      !isDirty ||
      isPending
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
    isPending,
  ]);

  // ======================================================
  // DIALOG ACCESSIBILITY
  // ======================================================

  useEffect(() => {
    const activeDialogRef =
      leaveDialogOpen
        ? leaveDialogRef
        : deleteDialogOpen
          ? deleteDialogRef
          : null;

    if (
      !activeDialogRef
    ) {
      return undefined;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    const previousActiveElement =
      document.activeElement;

    const getFocusableElements =
      () => {
        const dialog =
          activeDialogRef
            .current;

        if (
          !dialog
        ) {
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
            focusableElements[
              0
            ].focus();
          } else {
            activeDialogRef
              .current
              ?.focus();
          }
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
          if (
            deleteDialogOpen &&
            deleteMutation
              .isPending
          ) {
            return;
          }

          if (
            leaveDialogOpen
          ) {
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
          event.key !==
          'Tab'
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
          focusableElements[
            0
          ];

        const lastElement =
          focusableElements[
            focusableElements.length -
            1
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
        isPending ||
        !canMutate
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
            .toUpperCase()
            .replace(
              /[^A-Z]/g,
              ''
            )
            .slice(
              0,
              3
            );
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

  const setPartyMode =
    (
      mode
    ) => {
      if (
        isPending ||
        !canMutate
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

      clearFieldError(
        'client_id'
      );

      clearFieldError(
        'prospect_name'
      );
    };

  const handleAddAssignee =
    () => {
      if (
        !assigneeToAdd ||
        isPending ||
        !canMutate
      ) {
        return;
      }

      const userId =
        normalizeId(
          assigneeToAdd
        );

      if (
        !userId ||
        selectedAssigneeIds.includes(
          userId
        )
      ) {
        return;
      }

      const allowed =
        assignableUsers.some(
          (
            item
          ) =>
            normalizeId(
              item?.id
            ) ===
            userId
        );

      if (
        !allowed
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
              userId,
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
      userId
    ) => {
      if (
        isPending ||
        !canMutate
      ) {
        return;
      }

      const normalizedUserId =
        normalizeId(
          userId
        );

      setFormData(
        (
          current
        ) => ({
          ...current,

          assignee_ids:
            normalizeIds(
              current
                .assignee_ids
            ).filter(
              (
                id
              ) =>
                id !==
                normalizedUserId
            ),

          primary_assignee_id:
            normalizeId(
              current
                .primary_assignee_id
            ) ===
            normalizedUserId
              ? ''
              : current
                  .primary_assignee_id,
        })
      );

      clearFieldError(
        'assignees'
      );
    };

  const handlePrimaryAssignee =
    (
      userId
    ) => {
      if (
        isPending ||
        !canMutate
      ) {
        return;
      }

      const normalizedUserId =
        normalizeId(
          userId
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
        isPending ||
        !canMutate
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

      clearFieldError(
        'assignees'
      );
    };

  // ======================================================
  // NAVIGATION
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
        `/consultations/${id}`
      );
    };

  const handleGuardedDetailLink =
    (
      event
    ) => {
      if (
        event.defaultPrevented ||
        event.button !==
          0 ||
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
          `/consultations/${id}`
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
        `/consultations/${id}`;

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
  // VALIDATE
  // ======================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      const title =
        normalizeText(
          formData.title
        );

      const legalArea =
        normalizeText(
          formData
            .legal_area
        );

      const prospectName =
        normalizeText(
          formData
            .prospect_name
        );

      const prospectPhone =
        normalizeText(
          formData
            .prospect_phone
        );

      const prospectEmail =
        normalizeText(
          formData
            .prospect_email
        );

      const description =
        String(
          formData
            .description ||
          ''
        ).trim();

      const clientId =
        normalizeId(
          formData
            .client_id
        );

      const primaryAssigneeId =
        normalizeId(
          formData
            .primary_assignee_id
        );

      // PARTY

      if (
        formData.party_mode ===
        'client'
      ) {
        if (
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
          formData
            .consultation_type
        )
      ) {
        nextErrors.consultation_type =
          'Geçerli bir danışmanlık türü seçin';
      }

      if (
        !isAllowedOption(
          CONSULTATION_SERVICE_MODEL_OPTIONS,
          formData
            .service_model
        )
      ) {
        nextErrors.service_model =
          'Geçerli bir hizmet modeli seçin';
      }

      if (
        formData.consultation_mode &&
        !isAllowedOption(
          CONSULTATION_MODE_OPTIONS,
          formData
            .consultation_mode
        )
      ) {
        nextErrors.consultation_mode =
          'Geçerli bir görüşme şekli seçin';
      }

      // ASSIGNEES

      if (
        selectedAssigneeIds.length ===
        0
      ) {
        nextErrors.assignees =
          'En az bir sorumlu seçilmelidir';
      } else {
        if (
          assigneesDirty
        ) {
          if (
            assigneesQueryError
          ) {
            nextErrors.assignees =
              'Sorumlu listesi yüklenemedi. Listeyi yenileyip tekrar deneyin.';
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
                  assigneeId
                ) =>
                  !assignableIds.has(
                    assigneeId
                  )
              )
            ) {
              nextErrors.assignees =
                'Seçili sorumlulardan biri artık atanabilir değil. Güncellemeden önce bu kişiyi kaldırın.';
            }
          }
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
          formData
            .billing_type
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
          formData
            .priority
        )
      ) {
        nextErrors.priority =
          'Geçerli bir öncelik seçin';
      }

      if (
        formData.source &&
        !isAllowedOption(
          CONSULTATION_SOURCE_OPTIONS,
          formData
            .source
        )
      ) {
        nextErrors.source =
          'Geçerli bir talep kaynağı seçin';
      }

      // STATUS

      if (
        isTerminal
      ) {
        if (
          formData.status !==
          initialFormData.status
        ) {
          nextErrors.status =
            'Kapanmış danışmanlığın durumu değiştirilemez';
        }
      } else if (
        !canTransitionConsultationStatus(
          initialFormData.status,
          formData.status
        )
      ) {
        nextErrors.status =
          'Bu durum geçişine izin verilmiyor';
      }

      return {
        errors:
          nextErrors,

        normalized: {
          title,
          legalArea,
          prospectName,
          prospectPhone,
          prospectEmail,
          description,
          clientId,
          primaryAssigneeId,
          currency,
        },
      };
    };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        isPending
      ) {
        return;
      }

      if (
        !canMutate
      ) {
        toast.error(
          isTerminal
            ? 'Kapanmış danışmanlıkta normal düzenleme yapılamaz'
            : 'Bu işlem için güncelleme yetkiniz bulunmuyor'
        );

        return;
      }

      if (
        !id
      ) {
        toast.error(
          'Geçerli danışmanlık kaydı bulunamadı'
        );

        return;
      }

      const {
        errors:
          nextErrors,
        normalized,
      } =
        validateForm();

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

      const updateData =
        buildChangedConsultationPayload(
          normalizedCoreForm,
          initialNormalizedCoreForm
        );

      if (
        assigneesDirty
      ) {
        updateData.assignees =
          selectedAssigneeIds.map(
            (
              userId
            ) => ({
              user_id:
                userId,

              is_primary:
                normalized
                  .primaryAssigneeId ===
                userId,
            })
          );
      }

      let coreUpdated =
        false;

      try {
        if (
          coreDirty
        ) {
          await updateMutation.mutateAsync({
            id,

            data:
              updateData,

            silent:
              true,
          });

          coreUpdated =
            true;
        }

        if (
          statusDirty
        ) {
          await statusMutation.mutateAsync({
            id,

            status:
              formData.status,

            silent:
              true,
          });
        }

        toast.success(
          'Danışmanlık başarıyla güncellendi'
        );

        navigate(
          `/consultations/${id}`
        );
      } catch (
        error
      ) {
        const backendFieldErrors =
          getBackendFieldErrors(
            error
          );

        if (
          Object.keys(
            backendFieldErrors
          ).length >
          0
        ) {
          setErrors(
            (
              current
            ) => ({
              ...current,
              ...backendFieldErrors,
            })
          );
        }

        if (
          coreUpdated &&
          statusDirty
        ) {
          toast.error(
            'Danışmanlık bilgileri kaydedildi ancak durum güncellenemedi. Sayfayı yenileyip durumu tekrar deneyin.'
          );

          return;
        }

        toast.error(
          getConsultationEditErrorMessage(
            error
          )
        );
      }
    };

  // ======================================================
  // DELETE
  // ======================================================

  const handleDelete =
    () => {
      if (
        !canDelete
      ) {
        toast.error(
          'Bu danışmanlığı silme yetkiniz bulunmuyor.'
        );

        return;
      }

      if (
        isConverted
      ) {
        toast.error(
          'Davaya dönüştürülmüş danışmanlık bu ekrandan silinemez.'
        );

        return;
      }

      if (
        isPending
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
        deleteMutation
          .isPending
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
        !deleteAllowed ||
        deleteMutation
          .isPending
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
                '/consultations'
              );
            },
        }
      );
    };

  // ======================================================
  // LOADING / ERROR
  // ======================================================

  if (
    consultationLoading
  ) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600 dark:border-gray-700 dark:border-b-blue-400" />

          <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">
            Danışmanlık bilgileri yükleniyor...
          </p>

        </div>

      </div>
    );
  }

  if (
    consultationError ||
    !consultation
  ) {
    return (
      <div className="py-12 text-center">

        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />

        <h2 className="mt-3 text-xl font-semibold text-red-600">
          Danışmanlık yüklenemedi
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {getConsultationEditErrorMessage(
            consultationError,
            'Danışmanlık kaydı bulunamadı'
          )}
        </p>

        <Button
          className="mt-4"
          onClick={() =>
            navigate(
              '/consultations'
            )
          }
        >
          Danışmanlıklara Dön
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
          to={`/consultations/${id}`}
          onClick={
            handleGuardedDetailLink
          }
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Danışmanlığa Dön
        </Link>

        <div className="mt-3 flex items-start gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
            <BriefcaseBusiness size={21} />
          </div>

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-3">

              <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
                {isTerminal
                  ? 'Danışmanlık Bilgileri'
                  : 'Danışmanlığı Düzenle'}
              </h1>

              {isDirty && (
                <Badge variant="warning">
                  Kaydedilmemiş değişiklik
                </Badge>
              )}

              <Badge
                variant={
                  getConsultationStatusVariant(
                    consultation.status
                  )
                }
              >
                {getConsultationStatusLabel(
                  consultation.status
                )}
              </Badge>

            </div>

            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400">
              {isTerminal
                ? 'Danışmanlık bilgilerini salt okunur olarak görüntülüyorsunuz.'
                : 'Talep sahibini, danışmanlık kapsamını, sorumlu ekibi ve ücret bilgisini güncelleyin.'}
            </p>

            <p className="mt-1 truncate font-mono text-xs text-gray-400 dark:text-slate-500">
              {consultation
                .consultation_number ||
                `Danışmanlık #${id}`}
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

        {(!canUpdate || isTerminal) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/[0.08] dark:text-amber-200">
            {isConverted
              ? 'Bu danışmanlık davaya dönüştürüldüğü için artık düzenlenemez.'
              : isTerminal
                ? 'Bu danışmanlık kapandığı için artık düzenlenemez.'
                : 'Bu danışmanlığı güncelleme yetkiniz yok. Alanlar salt okunur gösteriliyor.'}
          </div>
        )}

        <fieldset
          disabled={
            !canMutate ||
            isPending
          }
          className="m-0 space-y-5 border-0 p-0"
        >

        {/* ==================================================
            PARTY
        ================================================== */}

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
                  Mevcut müvekkil veya potansiyel kişi bağlantısını güncelleyin.
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div className="grid gap-3 sm:grid-cols-2">

              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={() =>
                  setPartyMode(
                    'client'
                  )
                }
                className={`rounded-xl border p-4 text-left transition ${
                  formData.party_mode ===
                  'client'
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/10 dark:border-blue-400 dark:bg-blue-500/[0.06]'
                    : 'border-gray-200 hover:border-gray-300 dark:border-white/[0.08] dark:hover:border-white/[0.14]'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Mevcut Müvekkil
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-500">
                  Danışmanlığı kayıtlı bir müvekkile bağlayın.
                </p>
              </button>

              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={() =>
                  setPartyMode(
                    'prospect'
                  )
                }
                className={`rounded-xl border p-4 text-left transition ${
                  formData.party_mode ===
                  'prospect'
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/10 dark:border-blue-400 dark:bg-blue-500/[0.06]'
                    : 'border-gray-200 hover:border-gray-300 dark:border-white/[0.08] dark:hover:border-white/[0.14]'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Yeni / Potansiyel Kişi
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-500">
                  Henüz müvekkil olmayan talep sahibini kayıtta tutun.
                </p>
              </button>

            </div>

            {formData.party_mode ===
            'client' ? (
              <div className="space-y-3">

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
                      isPending ||
                      (
                        canViewClients &&
                        clientsLoading
                      )
                    }
                    className={`h-10 w-full rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.035] dark:text-slate-300 ${
                      errors.client_id
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                    }`}
                  >

                    <option value="">
                      {canViewClients &&
                      clientsLoading
                        ? 'Müvekkiller yükleniyor...'
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

                  {!canViewClients && (
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">
                      Müvekkil görüntüleme yetkiniz olmadığı için yalnız mevcut bağlantı korunabilir veya kayıt potansiyel kişiye çevrilebilir.
                    </p>
                  )}

                  {clientsQueryError &&
                    canViewClients && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-700 dark:text-amber-300">

                      <span>
                        Müvekkil listesi yüklenemedi.
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          refetchClients?.()
                        }
                        className="font-semibold underline underline-offset-2"
                      >
                        Tekrar Dene
                      </button>

                    </div>
                  )}

                </div>

                {selectedClient && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm dark:bg-white/[0.04] dark:text-slate-400">
                        <UserRound size={16} />
                      </div>

                      <div className="min-w-0">

                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedClient.name}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                          {selectedClient.client_type ===
                          'corporate'
                            ? 'Kurumsal Müvekkil'
                            : 'Bireysel Müvekkil'}
                        </p>

                      </div>

                    </div>

                  </div>
                )}

                {(formData.prospect_name ||
                  formData.prospect_phone ||
                  formData.prospect_email) && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-500/15 dark:bg-blue-500/[0.04]">

                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                      Tarihsel intake bilgisi korunuyor
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-500">
                      Bu danışmanlık daha önce potansiyel kişi kaydıyla açıldıysa ad, telefon ve e-posta bilgileri müvekkil bağlantısı değişse bile silinmez.
                    </p>

                  </div>
                )}

              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">

                <div className="md:col-span-2">
                  <Input
                    label="Ad Soyad / Unvan *"
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
                      isPending
                    }
                    maxLength={200}
                  />
                </div>

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
                    isPending
                  }
                  maxLength={50}
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
                    isPending
                  }
                  maxLength={254}
                />

              </div>
            )}

          </Card.Body>

        </Card>

        {/* ==================================================
            CONSULTATION
        ================================================== */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
                <BriefcaseBusiness size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Danışmanlık
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Hukuki talebin kapsamını ve hizmet modelini güncelleyin.
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
                isPending
              }
              maxLength={240}
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
                isPending
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
                    isPending
                  }
                  className={`h-10 w-full rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 dark:bg-white/[0.035] dark:text-slate-300 ${
                    errors.consultation_type
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                  }`}
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
                    isPending
                  }
                  className={`h-10 w-full rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 dark:bg-white/[0.035] dark:text-slate-300 ${
                    errors.service_model
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                  }`}
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

            <div className="grid gap-4 md:grid-cols-2">

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
                    isPending
                  }
                  className={`h-10 w-full rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 dark:bg-white/[0.035] dark:text-slate-300 ${
                    errors.consultation_mode
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                  }`}
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
                    isPending ||
                    !canMutate
                  }
                  className={`h-10 w-full rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.035] dark:text-slate-300 ${
                    errors.status
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                  }`}
                >
                  {statusTransitionOptions.map(
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

                {isTerminal && (
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">
                    Kapanmış danışmanlık salt okunurdur; durum ve normal bilgiler değiştirilemez.
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
                  isPending
                }
                rows={7}
                className={`w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-sm leading-6 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 dark:bg-white/[0.035] dark:text-white ${
                  errors.description
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                }`}
              />

              <div className="mt-1.5 flex items-center justify-between gap-3">

                {errors.description ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {errors.description}
                  </p>
                ) : (
                  <span />
                )}

                <span className="text-xs text-gray-400 dark:text-slate-600">
                  {formData.description.length} karakter
                </span>

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            ASSIGNEES
        ================================================== */}

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
                  {isTerminal
                    ? 'Danışmanlık kapandığı için sorumlu ekip değiştirilemez.'
                    : 'En az bir sorumlu zorunludur; ana sorumlu seçimi opsiyoneldir.'}
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-4">

            {!isTerminal && (
              <div className="flex flex-col gap-2 sm:flex-row">

              <select
                value={
                  assigneeToAdd
                }
                onChange={(
                  event
                ) =>
                  setAssigneeToAdd(
                    normalizeId(
                      event.target
                        .value
                    )
                  )
                }
                disabled={
                  assigneesLoading ||
                  isPending ||
                  Boolean(
                    assigneesQueryError
                  )
                }
                className={`h-10 flex-1 rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.035] dark:text-slate-300 ${
                  errors.assignees
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                }`}
              >

                <option value="">
                  {assigneesLoading
                    ? 'Sorumlular yükleniyor...'
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
                      {normalizeId(
                        assignee.id
                      ) ===
                      currentUserId
                        ? ' (Ben)'
                        : ''}
                      {' · '}
                      {getRoleLabel(
                        assignee.role
                      )}
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
                  isPending ||
                  Boolean(
                    assigneesQueryError
                  )
                }
              >
                <Plus className="h-4 w-4" />
                Ekle
              </Button>

              </div>
            )}

            {!isTerminal && assigneesQueryError && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/[0.06] dark:text-amber-300">

                <span>
                  Atanabilir kullanıcı listesi yüklenemedi. Mevcut ekip gösteriliyor; ekip değişikliği için listeyi yenileyin.
                </span>

                <button
                  type="button"
                  onClick={() =>
                    refetchAssignees?.()
                  }
                  className="font-semibold underline underline-offset-2"
                >
                  Tekrar Dene
                </button>

              </div>
            )}

            {!isTerminal && errors.assignees && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.assignees}
              </p>
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

                      const primary =
                        normalizeId(
                          formData
                            .primary_assignee_id
                        ) ===
                        assigneeId;

                      const currentlyAssignable =
                        assignableUsers.some(
                          (
                            item
                          ) =>
                            normalizeId(
                              item?.id
                            ) ===
                            assigneeId
                        );

                      return (
                        <div
                          key={
                            assignee.id
                          }
                          className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
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

                                {primary && (
                                  <Badge variant="primary">
                                    Ana Sorumlu
                                  </Badge>
                                )}

                                {!currentlyAssignable &&
                                  !assigneesLoading && (
                                  <Badge variant="warning">
                                    Artık Atanabilir Değil
                                  </Badge>
                                )}

                              </div>

                            </div>

                          </div>

                          {!isTerminal && (
                            <div className="flex flex-wrap items-center gap-2">

                              <button
                                type="button"
                                disabled={
                                  isPending
                                }
                                onClick={() =>
                                  primary
                                    ? clearPrimaryAssignee()
                                    : handlePrimaryAssignee(
                                        assigneeId
                                      )
                                }
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                  primary
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/[0.08] dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-blue-500/[0.08] dark:hover:text-blue-300'
                                }`}
                              >
                                {primary
                                  ? 'Ana Sorumluyu Kaldır'
                                  : 'Ana Sorumlu Yap'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveAssignee(
                                    assigneeId
                                  )
                                }
                                disabled={
                                  isPending
                                }
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/[0.08] dark:hover:text-red-400"
                                title="Sorumluyu kaldır"
                                aria-label={`${getFullName(
                                  assignee
                                )} sorumlusunu kaldır`}
                              >
                                <X className="h-4 w-4" />
                              </button>

                            </div>
                          )}

                        </div>
                      );
                    }
                  )}

                </div>

              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-7 text-center dark:border-white/[0.07]">

                <Users className="mx-auto h-7 w-7 text-gray-300 dark:text-slate-600" />

                <p className="mt-2 text-sm text-gray-500 dark:text-slate-500">
                  En az bir sorumlu seçilmelidir.
                </p>

              </div>
            )}

          </Card.Body>

        </Card>

        {/* ==================================================
            FINANCE
        ================================================== */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400">
                <Banknote size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Ücret ve Öncelik
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  V1 danışmanlık ücret bilgileri ve operasyonel öncelik.
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div className="grid gap-4 md:grid-cols-2">

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Ücretlendirme
                </label>

                <select
                  name="billing_type"
                  value={
                    formData.billing_type
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    isPending
                  }
                  className={`h-10 w-full rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 dark:bg-white/[0.035] dark:text-slate-300 ${
                    errors.billing_type
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                  }`}
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

                <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">
                  {getConsultationBillingTypeLabel(
                    formData.billing_type
                  )}
                </p>

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Öncelik
                </label>

                <div className="flex items-center gap-2">

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
                    className={`h-10 min-w-0 flex-1 rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 dark:bg-white/[0.035] dark:text-slate-300 ${
                      errors.priority
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                    }`}
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

            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">

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
                  isPending ||
                  formData.billing_type ===
                    'free'
                }
              />

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Para Birimi
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
                    isPending
                  }
                  className={`h-10 w-full rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 dark:bg-white/[0.035] dark:text-slate-300 ${
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

            <div className="grid gap-4 md:grid-cols-2">

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
                    isPending
                  }
                  className={`h-10 w-full rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 dark:bg-white/[0.035] dark:text-slate-300 ${
                    errors.source
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                  }`}
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

              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">

                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-600">
                  Hizmet Özeti
                </p>

                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {getConsultationServiceModelLabel(
                    formData.service_model
                  )}
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                  {getConsultationBillingTypeLabel(
                    formData.billing_type
                  )}
                </p>

              </div>

            </div>

          </Card.Body>

        </Card>

        </fieldset>

        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">

          <div>

            {canDelete &&
              !isConverted && (
              <Button
                type="button"
                variant="danger"
                onClick={
                  handleDelete
                }
                disabled={
                  isPending
                }
              >
                <Trash2 className="h-4 w-4" />
                Danışmanlığı Sil
              </Button>
            )}

            {isConverted && (
              <p className="max-w-xl text-xs leading-5 text-gray-500 dark:text-slate-500">
                Davaya dönüştürülmüş danışmanlık, hukuki kayıt geçmişinin korunması için silinemez.
              </p>
            )}

          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">

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
              {isTerminal
                ? 'Danışmanlığa Dön'
                : 'Vazgeç'}
            </Button>

            {!isTerminal && (
              <Button
                type="submit"
                loading={
                  updateMutation.isPending ||
                  statusMutation.isPending
                }
                disabled={
                  isPending ||
                  !canMutate ||
                  !isDirty
                }
              >
                <Save className="h-4 w-4" />
                Değişiklikleri Kaydet
              </Button>
            )}

          </div>

        </div>

      </form>

      {/* ==================================================
          LEAVE DIALOG
      ================================================== */}

      {leaveDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
            aria-label="Kaydedilmemiş değişiklikler penceresini kapat"
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
            aria-labelledby="consultation-leave-dialog-title"
            aria-describedby="consultation-leave-dialog-description"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]"
          >

            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/[0.10] dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div>

                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                    Kaydedilmemiş değişiklik
                  </p>

                  <h2
                    id="consultation-leave-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Sayfadan ayrılmak istiyor musunuz?
                  </h2>

                  <p
                    id="consultation-leave-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    Kaydetmeden ayrılırsanız bu formda yaptığınız değişiklikler kaybolacaktır.
                  </p>

                </div>

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
                Kaydetmeden Ayrıl
              </Button>

            </div>

          </div>

        </div>
      )}

      {/* ==================================================
          DELETE DIALOG
      ================================================== */}

      {deleteDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
            aria-label="Danışmanlık silme penceresini kapat"
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
            aria-labelledby="consultation-delete-dialog-title"
            aria-describedby="consultation-delete-dialog-description"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]"
          >

            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/[0.10] dark:text-red-400">
                  <Trash2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">

                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                    Danışmanlık silme onayı
                  </p>

                  <h2
                    id="consultation-delete-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Danışmanlık kaydını sil
                  </h2>

                  <p
                    id="consultation-delete-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    <span className="font-medium text-gray-700 dark:text-slate-200">
                      {deleteName}
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
                      Danışmanlık soft-delete edilecek
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-900/80 dark:text-red-200/80">
                      Müvekkil, görev, toplantı, belge ve dava kayıtları silinmez. Yalnız danışmanlık normal ekranlardan kaldırılır.
                    </p>

                  </div>

                </div>

              </div>

              <p className="text-xs leading-5 text-gray-400 dark:text-slate-500">
                Devam etmeden önce danışmanlık numarası ve başlığı kontrol ederek doğru kaydı seçtiğinizden emin olun.
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
                Danışmanlığı Sil
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default ConsultationEdit;
