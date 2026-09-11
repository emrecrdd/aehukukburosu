import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import eventApi from '../../features/events/event.api.js';
import caseApi from '../../features/cases/case.api.js';

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
  CalendarDays,
  Eye,
  Gavel,
  Languages,
  MapPin,
  MessageCircle,
  Microscope,
  Plus,
  RefreshCw,
  Save,
  Scale,
  Target,
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

  hearing_type:
    'preliminary',

  status:
    'scheduled',

  start_date: '',
  end_date: '',

  location: '',
  court_room: '',
  judge_name: '',

  assigned_to: '',
  opposing_counsel: '',

  last_hearing_result: '',

  expense_status:
    'pending',

  is_all_day:
    false,
};

const HEARING_TYPES = [
  {
    value: 'preliminary',
    label: 'Ön İnceleme',
  },
  {
    value: 'investigation',
    label: 'Tahkikat',
  },
  {
    value: 'expert_examination',
    label: 'Bilirkişi İncelemesi',
  },
  {
    value: 'witness_hearing',
    label: 'Tanık Dinlenmesi',
  },
  {
    value: 'final_decision',
    label: 'Karar Duruşması',
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

const EXPENSE_OPTIONS = [
  {
    value: 'pending',
    label: 'Bekliyor',
  },
  {
    value: 'paid',
    label: 'Ödendi',
  },
  {
    value: 'not_applicable',
    label: 'Yok',
  },
];

const ROLE_OPTIONS = [
  {
    value: 'avukat',
    label: 'Avukat',
  },
  {
    value: 'karsi_taraf_avukati',
    label: 'Karşı Taraf Avukatı',
  },
  {
    value: 'müvekkil',
    label: 'Müvekkil',
  },
  {
    value: 'davaci',
    label: 'Davacı',
  },
  {
    value: 'davali',
    label: 'Davalı',
  },
  {
    value: 'tanik',
    label: 'Tanık',
  },
  {
    value: 'bilirkişi',
    label: 'Bilirkişi',
  },
  {
    value: 'uzman',
    label: 'Uzman',
  },
  {
    value: 'tercüman',
    label: 'Tercüman',
  },
  {
    value: 'gözlemci',
    label: 'Gözlemci',
  },
  {
    value: 'diger',
    label: 'Diğer',
  },
];

// ======================================================
// HELPERS
// ======================================================

const normalizeNullable = (
  value
) => {
  const normalized =
    String(
      value ?? ''
    ).trim();

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
      value?.id;

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

const normalizeEventCreateForm = (
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

  hearing_type:
    form?.hearing_type || '',

  status:
    form?.status || '',

  start_date:
    String(
      form?.start_date || ''
    ).trim(),

  end_date:
    String(
      form?.end_date || ''
    ).trim(),

  location:
    String(
      form?.location || ''
    ).trim(),

  court_room:
    String(
      form?.court_room || ''
    ).trim(),

  judge_name:
    String(
      form?.judge_name || ''
    ).trim(),

  assigned_to:
    normalizeId(
      form?.assigned_to
    ),

  opposing_counsel:
    String(
      form?.opposing_counsel || ''
    ).trim(),

  last_hearing_result:
    String(
      form?.last_hearing_result || ''
    ).trim(),

  expense_status:
    form?.expense_status || '',

  is_all_day:
    Boolean(
      form?.is_all_day
    ),

  case_id:
    normalizeId(
      form?.case_id
    ),
});

const normalizeEventAttendees = (
  items
) => {
  if (
    !Array.isArray(
      items
    )
  ) {
    return [];
  }

  return items
    .map(
      (item) => ({
        name:
          String(
            item?.name || ''
          ).trim(),

        role:
          item?.role ||
          'diger',
      })
    )
    .filter(
      (item) =>
        Boolean(
          item.name
        )
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

  return /sequelize|validation failed|constraint|foreign key|notnull|not null|invalid input syntax|uuid|sql|database|query failed|network error|failed to fetch|econn|timeout|stack|syntaxerror|typeerror|internal server error/i.test(
    message
  );
};

const getEventErrorMessage = (
  error,
  fallback =
    'İşlem tamamlanamadı'
) => {
  const status =
    error?.response?.status;

  const rawMessage =
    error?.response?.data
      ?.message ||
    error?.message ||
    '';

  if (status === 401) {
    return 'Oturumunuz sona ermiş olabilir. Lütfen yeniden giriş yapın.';
  }

  if (status === 403) {
    return 'Bu işlem için yetkiniz bulunmuyor.';
  }

  if (status === 404) {
    return 'İlgili kayıt bulunamadı veya artık erişilemiyor.';
  }

  if (status === 409) {
    return 'Bu işlem mevcut kayıtlarla çakışıyor. Bilgileri kontrol edip tekrar deneyin.';
  }

  if (status === 422) {
    return 'Girilen bilgiler doğrulanamadı. Form alanlarını kontrol edin.';
  }

  if (
    Number(status) >= 500
  ) {
    return 'Sunucu tarafında geçici bir sorun oluştu. Lütfen tekrar deneyin.';
  }

  if (
    /network|failed to fetch|econn|timeout/i.test(
      rawMessage
    )
  ) {
    return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
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

const getEventFieldErrorMessage = (
  field,
  rawMessage
) => {
  const labels = {
    title: 'Başlık',
    description: 'Açıklama',
    hearing_type: 'Duruşma türü',
    status: 'Durum',
    start_date: 'Başlangıç tarihi',
    end_date: 'Bitiş tarihi',
    location: 'Mahkeme / yer',
    court_room: 'Salon',
    judge_name: 'Hakim',
    assigned_to: 'Atanan avukat',
    opposing_counsel: 'Karşı taraf avukatı',
    last_hearing_result: 'Son duruşma sonucu',
    expense_status: 'Masraf / harç durumu',
    case_id: 'Dava',
    attendees: 'Katılımcılar',
  };

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

  return `${
    labels[field] ||
    'Bu alan'
  } bilgisini kontrol edin`;
};

/*
 * datetime-local timezone bilgisi taşımaz.
 *
 * Browser kullanıcının yerel saatini bildiği için
 * burada gerçek ISO zamana dönüştürüyoruz.
 *
 * Örn:
 * kullanıcı 18.08.2026 09:00 seçerse
 * Europe/Istanbul için doğru UTC karşılığı backend'e gider.
 */
const localDateTimeToIso = (
  value
) => {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
};


const getCurrentLocalDateTimeMinute = () => {
  const now =
    new Date();

  now.setSeconds(
    0,
    0
  );

  const localTime =
    new Date(
      now.getTime() -
      now.getTimezoneOffset() *
      60 *
      1000
    );

  return localTime
    .toISOString()
    .slice(
      0,
      16
    );
};

const isPastCreateDateTime = (
  value
) => {
  if (!value) {
    return false;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return false;
  }

  /*
   * datetime-local dakika hassasiyetinde çalıştığı için,
   * aynı dakika içinde saniye farkından kaynaklanan
   * yanlış "geçmiş tarih" hatasını önlüyoruz.
   */
  return (
    date.getTime() <
    Date.now() -
      60 * 1000
  );
};

const getRoleLabel = (
  role
) => {
  return (
    ROLE_OPTIONS.find(
      (
        item
      ) =>
        item.value ===
        role
    )?.label ||
    role ||
    'Katılımcı'
  );
};

const getRoleIcon = (
  role
) => {
  switch (role) {
    case 'avukat':
    case 'karsi_taraf_avukati':
      return (
        <Scale className="h-4 w-4" />
      );

    case 'tanik':
      return (
        <MessageCircle className="h-4 w-4" />
      );

    case 'bilirkişi':
      return (
        <Microscope className="h-4 w-4" />
      );

    case 'uzman':
      return (
        <Target className="h-4 w-4" />
      );

    case 'tercüman':
      return (
        <Languages className="h-4 w-4" />
      );

    case 'gözlemci':
      return (
        <Eye className="h-4 w-4" />
      );

    default:
      return (
        <UserRound className="h-4 w-4" />
      );
  }
};

// ======================================================
// CACHE INVALIDATION
// ======================================================

const invalidateEventViews = async (
  queryClient,
  {
    caseIds = [],
  } = {}
) => {
  const normalizedCaseIds = [
    ...new Set(
      caseIds
        .map(
          (caseId) =>
            normalizeId(
              caseId
            )
        )
        .filter(Boolean)
    ),
  ];

  const invalidations = [
    // Genel etkinlik / duruşma listeleri
    queryClient.invalidateQueries({
      queryKey: [
        'events',
      ],
    }),

    // Kullanıcının etkinlikleri
    queryClient.invalidateQueries({
      queryKey: [
        'my-events',
      ],
    }),

    // Takvim ve dashboard aylık özet
    queryClient.invalidateQueries({
      queryKey: [
        'calendar-events',
      ],
    }),

    // Dashboard "Bugünkü Duruşmalar"
    queryClient.invalidateQueries({
      queryKey: [
        'dashboard-hearings',
      ],
    }),

    // Davaya bağlı duruşma listeleri
    queryClient.invalidateQueries({
      queryKey: [
        'case-events',
      ],
    }),
  ];

  normalizedCaseIds.forEach(
    (caseId) => {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: [
            'case',
            caseId,
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
// COMPONENT
// ======================================================

const EventCreate = () => {
  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const {
    user,
  } =
    useAuth();

  const [
    searchParams,
  ] =
    useSearchParams();

  const caseIdFromUrl =
    normalizeId(
      searchParams.get(
        'case'
      )
    );

  const [
    formData,
    setFormData,
  ] =
    useState({
      ...INITIAL_FORM,

      case_id:
        caseIdFromUrl ||
        '',
    });

  const [
    errors,
    setErrors,
  ] =
    useState({});

  const [
    attendeeName,
    setAttendeeName,
  ] =
    useState('');

  const [
    attendeeRole,
    setAttendeeRole,
  ] =
    useState(
      'diger'
    );

  const [
    attendees,
    setAttendees,
  ] =
    useState([]);

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

  const unsavedDialogRef =
    useRef(null);

  const previousFocusRef =
    useRef(null);

  const defaultAssignedToRef =
    useRef('');

  const defaultLocationRef =
    useRef('');

  // ======================================================
  // CURRENT CASE
  // ======================================================

  const {
    data:
      caseData,

    isLoading:
      caseLoading,

    error:
      caseError,

    refetch:
      refetchCase,
  } =
    useQuery({
      queryKey: [
        'case',
        'event-create',
        caseIdFromUrl,
      ],

      queryFn: () =>
        caseApi.getOne(
          caseIdFromUrl
        ),

      enabled:
        Boolean(
          caseIdFromUrl
        ),

      staleTime:
        5 * 60 * 1000,
    });

  const caseItem =
    caseData?.data?.data ||
    null;

  // ======================================================
  // ASSIGNABLE LAWYERS
  // ======================================================

  const {
    data:
      lawyersData,

    isLoading:
      lawyersLoading,

    error:
      lawyersError,

    refetch:
      refetchLawyers,
  } =
    useQuery({
      queryKey: [
        'case-assignable-lawyers',
        'event-create',
      ],

      queryFn: () =>
        caseApi.getAssignableLawyers(),

      staleTime:
        5 * 60 * 1000,
    });

  const assignableUsers =
    Array.isArray(
      lawyersData?.data?.data
    )
      ? lawyersData.data.data
      : [];

  const assignableUsersWithCurrent =
    (() => {
      if (
        !user?.id ||
        ![
          'lawyer',
          'admin',
        ].includes(
          user.role
        )
      ) {
        return assignableUsers;
      }

      const currentUserExists =
        assignableUsers.some(
          (person) =>
            normalizeId(
              person?.id
            ) ===
            normalizeId(
              user.id
            )
        );

      return currentUserExists
        ? assignableUsers
        : [
            user,
            ...assignableUsers,
          ];
    })();

  const initialCreateForm = {
    ...INITIAL_FORM,

    case_id:
      caseIdFromUrl ||
      '',

    assigned_to:
      defaultAssignedToRef
        .current,

    location:
      defaultLocationRef
        .current,
  };

  const isDirty =
    JSON.stringify(
      normalizeEventCreateForm(
        formData
      )
    ) !==
      JSON.stringify(
        normalizeEventCreateForm(
          initialCreateForm
        )
      ) ||
    normalizeEventAttendees(
      attendees
    ).length > 0 ||
    Boolean(
      attendeeName.trim()
    );

  const exitPath =
    caseIdFromUrl
      ? `/cases/${caseIdFromUrl}`
      : '/calendar';

  // ======================================================
  // DEFAULT ASSIGNEE
  // ======================================================

  useEffect(() => {
    if (
      !user?.id
    ) {
      return;
    }

    /*
     * Avukat kendi oluşturduğu duruşmada varsayılan
     * olarak seçili gelir.
     *
     * Kullanıcı isterse listeden başka bir avukat
     * seçebilir.
     */
    if (
      user.role ===
      'lawyer'
    ) {
      const nextDefault =
        normalizeId(
          user.id
        );

      defaultAssignedToRef.current =
        nextDefault;

      setFormData(
        (
          current
        ) => ({
          ...current,

          assigned_to:
            current.assigned_to ||
            nextDefault,
        })
      );
    }
  }, [
    user,
  ]);

  // ======================================================
  // CASE DEFAULTS
  // ======================================================

  useEffect(() => {
    if (
      !caseItem
    ) {
      return;
    }

    /*
     * Davada mahkeme bilgisi zaten varsa duruşma formuna
     * otomatik öneriyoruz.
     *
     * Kullanıcı isterse değiştirebilir.
     */
    setFormData(
      (
        current
      ) => {
        if (
          current.location
        ) {
          return current;
        }

        const nextDefault =
          caseItem.court_name ||
          '';

        defaultLocationRef.current =
          nextDefault;

        return {
          ...current,
          location:
            nextDefault,
        };
      }
    );
  }, [
    caseItem,
  ]);

  // ======================================================
  // MUTATION
  // ======================================================

  const mutation =
    useMutation({
      mutationFn: (
        payload
      ) =>
        eventApi.create(
          payload
        ),

      onSuccess: async (
        response
      ) => {
        const event =
          response?.data?.data ??
          response?.data ??
          null;

        const caseId =
          normalizeId(
            event?.case_id ??
            event?.case?.id ??
            formData.case_id ??
            caseIdFromUrl
          );

        await invalidateEventViews(
          queryClient,
          {
            caseIds: [
              caseId,
            ],
          }
        );

        toast.success(
          'Duruşma başarıyla oluşturuldu'
        );

        const eventId =
          normalizeId(
            event?.id
          );

        if (
          eventId
        ) {
          navigate(
            `/events/${eventId}`
          );

          return;
        }

        if (
          caseId
        ) {
          navigate(
            `/cases/${caseId}`
          );

          return;
        }

        navigate(
          '/calendar'
        );
      },

      onError: (
        error
      ) => {
        const backendErrors =
          error?.response?.data
            ?.errors;

        const nextErrors =
          {};

        if (
          Array.isArray(
            backendErrors
          )
        ) {
          backendErrors.forEach(
            (item) => {
              const rawField =
                item?.path ||
                item?.param ||
                item?.field;

              const field =
                Array.isArray(
                  rawField
                )
                  ? rawField[
                      rawField.length -
                        1
                    ]
                  : String(
                      rawField || ''
                    )
                      .split('.')
                      .filter(Boolean)
                      .pop();

              if (
                field &&
                (
                  Object.prototype
                    .hasOwnProperty.call(
                      INITIAL_FORM,
                      field
                    ) ||
                  field ===
                    'case_id' ||
                  field ===
                    'attendees'
                )
              ) {
                nextErrors[field] =
                  getEventFieldErrorMessage(
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
                Object.prototype
                  .hasOwnProperty.call(
                    INITIAL_FORM,
                    field
                  ) ||
                field ===
                  'case_id' ||
                field ===
                  'attendees'
              ) {
                const raw =
                  Array.isArray(
                    value
                  )
                    ? value
                        .filter(Boolean)
                        .join(', ')
                    : value;

                nextErrors[field] =
                  getEventFieldErrorMessage(
                    field,
                    raw
                  );
              }
            }
          );
        }

        const message =
          error?.response?.data
            ?.message ||
          error?.message ||
          '';

        const fieldMatchers = [
          [
            /başlık|title/i,
            'title',
          ],
          [
            /başlangıç|start_date/i,
            'start_date',
          ],
          [
            /bitiş|end_date/i,
            'end_date',
          ],
          [
            /duruşma türü|hearing_type/i,
            'hearing_type',
          ],
          [
            /durum|status/i,
            'status',
          ],
          [
            /karşı taraf avukatı|opposing_counsel/i,
            'opposing_counsel',
          ],
          [
            /atanan|assigned_to/i,
            'assigned_to',
          ],
          [
            /dava|case_id/i,
            'case_id',
          ],
          [
            /katılımcı|attendee/i,
            'attendees',
          ],
        ];

        fieldMatchers.forEach(
          ([
            pattern,
            field,
          ]) => {
            if (
              pattern.test(
                message
              ) &&
              !nextErrors[field]
            ) {
              nextErrors[field] =
                getEventFieldErrorMessage(
                  field,
                  message
                );
            }
          }
        );

        if (
          Object.keys(
            nextErrors
          ).length > 0
        ) {
          setErrors(
            (current) => ({
              ...current,
              ...nextErrors,
            })
          );

          toast.error(
            'Formdaki hatalı alanları kontrol edin'
          );

          return;
        }

        toast.error(
          getEventErrorMessage(
            error,
            'Duruşma oluşturulamadı'
          )
        );
      },
    });

  const isPending =
    mutation.isPending;

  // ======================================================
  // CHANGE
  // ======================================================

  const handleChange = (
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
      type,
      checked,
    } =
      event.target;

    setFormData(
      (
        current
      ) => ({
        ...current,

        [name]:
          type ===
          'checkbox'
            ? checked
            : value,
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
  // ATTENDEES
  // ======================================================

  const addAttendee =
    () => {
      if (
        isPending
      ) {
        return;
      }

      const name =
        attendeeName.trim();

      if (!name) {
        return;
      }

      const alreadyExists =
        attendees.some(
          (
            item
          ) =>
            item.name
              ?.trim()
              .toLocaleLowerCase(
                'tr-TR'
              ) ===
              name.toLocaleLowerCase(
                'tr-TR'
              ) &&
            item.role ===
              attendeeRole
        );

      if (
        alreadyExists
      ) {
        toast.error(
          'Bu katılımcı zaten eklenmiş'
        );

        return;
      }

      setAttendees(
        (
          current
        ) => [
          ...current,

          {
            name,
            role:
              attendeeRole,
          },
        ]
      );

      setAttendeeName('');
    };

  const removeAttendee = (
    index
  ) => {
    if (
      isPending
    ) {
      return;
    }

    setAttendees(
      (
        current
      ) =>
        current.filter(
          (
            _,
            currentIndex
          ) =>
            currentIndex !==
            index
        )
    );
  };

  const handleAttendeeKeyDown =
    (
      event
    ) => {
      if (
        event.key !==
        'Enter'
      ) {
        return;
      }

      event.preventDefault();

      addAttendee();
    };

  // ======================================================
  // UNSAVED CHANGE PROTECTION
  // ======================================================

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

  useEffect(() => {
    if (
      !unsavedDialogOpen
    ) {
      return undefined;
    }

    previousFocusRef.current =
      document.activeElement;

    const dialog =
      unsavedDialogRef.current;

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      'hidden';

    const frame =
      window.requestAnimationFrame(
        () => {
          const firstFocusable =
            dialog?.querySelector(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );

          (
            firstFocusable ||
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
          setPendingExitPath('');
          return;
        }

        if (
          event.key !==
            'Tab' ||
          !dialog
        ) {
          return;
        }

        const focusable =
          Array.from(
            dialog.querySelectorAll(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          );

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

  const requestExit = (
    path,
    event
  ) => {
    event?.preventDefault?.();

    if (
      isPending
    ) {
      return;
    }

    if (
      isDirty
    ) {
      setPendingExitPath(
        path
      );

      setUnsavedDialogOpen(
        true
      );

      return;
    }

    navigate(path);
  };

  const closeUnsavedDialog =
    () => {
      setUnsavedDialogOpen(
        false
      );

      setPendingExitPath('');
    };

  const discardAndExit =
    () => {
      const path =
        pendingExitPath ||
        exitPath;

      setUnsavedDialogOpen(
        false
      );

      setPendingExitPath('');

      navigate(path);
    };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      const title =
        formData.title.trim();

      if (
        title.length <
        2
      ) {
        nextErrors.title =
          'Duruşma başlığı gereklidir';
      }

      if (
        !formData.start_date
      ) {
        nextErrors.start_date =
          'Başlangıç tarihi gereklidir';
      }

      if (
        formData.start_date &&
        !localDateTimeToIso(
          formData.start_date
        )
      ) {
        nextErrors.start_date =
          'Geçerli bir başlangıç tarihi girin';
      } else if (
        formData.start_date &&
        isPastCreateDateTime(
          formData.start_date
        )
      ) {
        nextErrors.start_date =
          'Duruşma başlangıç tarihi geçmiş bir tarih olamaz';
      }

      if (
        formData.end_date &&
        !localDateTimeToIso(
          formData.end_date
        )
      ) {
        nextErrors.end_date =
          'Geçerli bir bitiş tarihi girin';
      }

      if (
        formData.start_date &&
        formData.end_date
      ) {
        const start =
          new Date(
            formData.start_date
          );

        const end =
          new Date(
            formData.end_date
          );

        if (
          end <
          start
        ) {
          nextErrors.end_date =
            'Bitiş tarihi başlangıç tarihinden önce olamaz';
        }
      }

      if (
        !HEARING_TYPES.some(
          (option) =>
            option.value ===
            formData.hearing_type
        )
      ) {
        nextErrors.hearing_type =
          'Geçersiz duruşma türü';
      }

      if (
        !STATUS_OPTIONS.some(
          (option) =>
            option.value ===
            formData.status
        )
      ) {
        nextErrors.status =
          'Geçersiz duruşma durumu';
      }

      if (
        !EXPENSE_OPTIONS.some(
          (option) =>
            option.value ===
            formData.expense_status
        )
      ) {
        nextErrors.expense_status =
          'Geçersiz masraf / harç durumu';
      }

      const assignedTo =
        normalizeId(
          formData.assigned_to
        );

      if (
        !assignedTo
      ) {
        nextErrors.assigned_to =
          'Duruşma için sorumlu avukat seçilmelidir';
      } else if (
        !lawyersLoading &&
        !lawyersError &&
        !assignableUsersWithCurrent.some(
          (person) =>
            normalizeId(
              person?.id
            ) ===
            assignedTo
        )
      ) {
        nextErrors.assigned_to =
          'Seçilen avukat artık atanabilir değil';
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

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (
      isPending
    ) {
      return;
    }

    if (
      caseIdFromUrl &&
      (
        caseLoading ||
        caseError ||
        !caseItem
      )
    ) {
      toast.error(
        'İlişkili dava doğrulanamadı. Dava bilgilerini yeniden yükleyip tekrar deneyin.'
      );

      return;
    }

    if (
      !validateForm()
    ) {
      toast.error(
        'Formdaki eksik veya hatalı alanları kontrol edin'
      );

      return;
    }

    const assignedTo =
      formData.assigned_to ||
      null;

    const payload = {
      title:
        formData.title.trim(),

      description:
        normalizeNullable(
          formData.description
        ),

      event_type:
        'hearing',

      hearing_type:
        formData.hearing_type,

      status:
        formData.status,

      start_date:
        localDateTimeToIso(
          formData.start_date
        ),

      end_date:
        formData.end_date
          ? localDateTimeToIso(
              formData.end_date
            )
          : null,

      location:
        normalizeNullable(
          formData.location
        ),

      court_room:
        normalizeNullable(
          formData.court_room
        ),

      judge_name:
        normalizeNullable(
          formData.judge_name
        ),

      last_hearing_result:
        normalizeNullable(
          formData.last_hearing_result
        ),

      opposing_counsel:
        normalizeNullable(
          formData.opposing_counsel
        ),

      expense_status:
        formData.expense_status,

      case_id:
        normalizeId(
          formData.case_id ||
          caseIdFromUrl
        ) ||
        null,

      assigned_to:
        assignedTo,

      is_all_day:
        Boolean(
          formData.is_all_day
        ),

      attendees:
        attendees
          .map(
            (
              attendee
            ) => ({
              name:
                String(
                  attendee.name ||
                  ''
                ).trim(),

              role:
                attendee.role ||
                'diger',
            })
          )
          .filter(
            (attendee) =>
              Boolean(
                attendee.name
              )
          ),
    };

    mutation.mutate(
      payload
    );
  };

  // ======================================================
  // CANCEL
  // ======================================================

  const handleCancel =
    () => {
      requestExit(
        exitPath
      );
    };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div>

        <Link
          to={
            exitPath
          }
          onClick={(
            event
          ) =>
            requestExit(
              exitPath,
              event
            )
          }
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />

          {caseIdFromUrl
            ? 'Davaya Dön'
            : 'Takvime Dön'}
        </Link>

        <div className="mt-4 flex items-start gap-3">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">

            <Gavel className="h-6 w-6 text-blue-600" />

          </div>

          <div>

            <div className="flex flex-wrap items-center gap-2">

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Yeni Duruşma
              </h1>

              {isDirty && (
                <Badge
                  variant="warning"
                >
                  Kaydedilmemiş değişiklik
                </Badge>
              )}

            </div>

            <p className="mt-1 text-sm text-gray-500">
              Duruşma tarihini, görevlendirilen avukatı ve katılımcıları oluşturun.
            </p>

          </div>

        </div>

      </div>

      {/* ==================================================
          CASE SUMMARY
      ================================================== */}

      {caseIdFromUrl && (
        <Card>

          <Card.Body>

            {caseLoading ? (
              <p className="text-sm text-gray-500">
                Dava bilgileri yükleniyor...
              </p>
            ) : caseError ? (
              <div className="space-y-3">

                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Dava bilgileri yüklenemedi
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                    {getEventErrorMessage(
                      caseError,
                      'İlişkili dava bilgileri yüklenemedi'
                    )}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    refetchCase()
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                  Tekrar Dene
                </Button>

              </div>
            ) : caseItem ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-start gap-3">

                  <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-800">

                    <Scale className="h-5 w-5 text-gray-600 dark:text-gray-300" />

                  </div>

                  <div>

                    <p className="font-semibold text-gray-900 dark:text-white">
                      {caseItem.title}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {caseItem.case_number ||
                        'Dosya numarası yok'}

                      {caseItem.court_name
                        ? ` · ${caseItem.court_name}`
                        : ''}
                    </p>

                  </div>

                </div>

                <Badge variant="default">
                  Davaya Bağlı
                </Badge>

              </div>
            ) : (
              <p className="text-sm text-red-600">
                İlişkili dava yüklenemedi.
              </p>
            )}

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          FORM
      ================================================== */}

      <Card>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-8 p-6"
        >

          {/* ==================================================
              BASIC INFORMATION
          ================================================== */}

          <section className="space-y-4">

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Duruşma Bilgileri
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Duruşmanın temel bilgilerini belirleyin.
              </p>

            </div>

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
              placeholder="Örn: Ön İnceleme Duruşması"
            />

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                rows="3"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Duruşmaya ilişkin genel not..."
              />

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Duruşma Türü
                </label>

                <select
                  name="hearing_type"
                  value={
                    formData.hearing_type
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    isPending
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >

                  {HEARING_TYPES.map(
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

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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

              </div>

            </div>

          </section>

          {/* ==================================================
              DATE
          ================================================== */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-start gap-3">

              <CalendarDays className="mt-0.5 h-5 w-5 text-blue-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Tarih ve Saat
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Duruşmanın başlangıç ve varsa bitiş zamanını belirleyin.
                </p>

              </div>

            </div>

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
                min={
                  getCurrentLocalDateTimeMinute()
                }
                disabled={
                  isPending
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
                  getCurrentLocalDateTimeMinute()
                }
                disabled={
                  isPending
                }
              />

            </div>

            <label className="inline-flex cursor-pointer items-center gap-2">

              <input
                type="checkbox"
                name="is_all_day"
                checked={
                  formData.is_all_day
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />

              <span className="text-sm text-gray-700 dark:text-gray-300">
                Tüm gün etkinlik
              </span>

            </label>

          </section>

          {/* ==================================================
              LOCATION
          ================================================== */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-start gap-3">

              <MapPin className="mt-0.5 h-5 w-5 text-emerald-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Mahkeme ve Yer Bilgileri
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Duruşmanın gerçekleştirileceği mahkeme, salon ve hakim bilgileri.
                </p>

              </div>

            </div>

            <div className="grid gap-4 md:grid-cols-3">

              <Input
                label="Mahkeme / Yer"
                name="location"
                value={
                  formData.location
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                placeholder="Örn: İstanbul 3. Sulh Hukuk Mahkemesi"
              />

              <Input
                label="Salon"
                name="court_room"
                value={
                  formData.court_room
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                placeholder="Örn: Salon 8"
              />

              <Input
                label="Hakim"
                name="judge_name"
                value={
                  formData.judge_name
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                placeholder="Hakim adı"
              />

            </div>

          </section>

          {/* ==================================================
              LAWYERS
          ================================================== */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-start gap-3">

              <UserRound className="mt-0.5 h-5 w-5 text-purple-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Avukat Bilgileri
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Duruşmadan sorumlu avukatı ve karşı taraf vekilini belirleyin.
                </p>

              </div>

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Atanan Avukat *
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
                    isPending ||
                    lawyersLoading
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >

                  <option value="">
                    {lawyersLoading
                      ? 'Avukatlar yükleniyor...'
                      : 'Avukat seçin'}
                  </option>

                  {assignableUsersWithCurrent.map(
                    (
                      person
                    ) => (
                      <option
                        key={
                          person.id
                        }
                        value={
                          normalizeId(
                            person.id
                          )
                        }
                      >
                        {person.first_name}{' '}
                        {person.last_name}
                        {user?.id !==
                          null &&
                        user?.id !==
                          undefined &&
                        normalizeId(
                          person.id
                        ) ===
                          normalizeId(
                            user.id
                          )
                          ? ' (Kendiniz)'
                          : person.role ===
                            'admin'
                            ? ' (Yönetici)'
                            : ' (Avukat)'}
                      </option>
                    )
                  )}

                </select>

                {errors.assigned_to && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {errors.assigned_to}
                  </p>
                )}

                {lawyersError && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {getEventErrorMessage(
                        lawyersError,
                        'Atanabilir avukatlar yüklenemedi'
                      )}
                    </p>

                    <button
                      type="button"
                      disabled={
                        isPending ||
                        lawyersLoading
                      }
                      onClick={() =>
                        refetchLawyers()
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Tekrar Dene
                    </button>
                  </div>
                )}

              </div>

              <Input
                label="Karşı Taraf Avukatı"
                name="opposing_counsel"
                value={
                  formData.opposing_counsel
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                placeholder="Örn: Av. Ahmet Yılmaz"
              />

            </div>

          </section>

          {/* ==================================================
              ATTENDEES
          ================================================== */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-start gap-3">

              <Users className="mt-0.5 h-5 w-5 text-indigo-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Katılımcılar
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Tanık, bilirkişi, taraf veya diğer katılımcıları ekleyin.
                </p>

              </div>

            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]">

              <input
                type="text"
                value={
                  attendeeName
                }
                onChange={(
                  event
                ) =>
                  setAttendeeName(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleAttendeeKeyDown
                }
                disabled={
                  isPending
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Katılımcı adı"
              />

              <select
                value={
                  attendeeRole
                }
                onChange={(
                  event
                ) =>
                  setAttendeeRole(
                    event.target.value
                  )
                }
                disabled={
                  isPending
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                {ROLE_OPTIONS.map(
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

              <Button
                type="button"
                variant="outline"
                disabled={
                  isPending ||
                  !attendeeName.trim()
                }
                onClick={
                  addAttendee
                }
              >
                <Plus className="mr-1 h-4 w-4" />

                Ekle
              </Button>

            </div>

            {attendees.length ===
            0 ? (
              <p className="text-xs text-gray-400">
                Henüz ek katılımcı bulunmuyor.
              </p>
            ) : (
              <div className="space-y-2">

                {attendees.map(
                  (
                    attendee,
                    index
                  ) => (
                    <div
                      key={`${attendee.name}-${attendee.role}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                    >

                      <div className="flex min-w-0 items-center gap-3">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                          {getRoleIcon(
                            attendee.role
                          )}
                        </div>

                        <div className="min-w-0">

                          <p className="truncate font-medium text-gray-900 dark:text-white">
                            {attendee.name}
                          </p>

                          <p className="text-xs text-gray-500">
                            {getRoleLabel(
                              attendee.role
                            )}
                          </p>

                        </div>

                      </div>

                      <button
                        type="button"
                        disabled={
                          isPending
                        }
                        onClick={() =>
                          removeAttendee(
                            index
                          )
                        }
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20"
                        aria-label={`${attendee.name} katılımcısını kaldır`}
                        title="Katılımcıyı kaldır"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </div>
                  )
                )}

              </div>
            )}

          </section>

          {/* ==================================================
              RESULT / EXPENSE
          ================================================== */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Duruşma Sonucu ve Masraf
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Gerekliyse mevcut sonucu ve harç durumunu kaydedin.
              </p>

            </div>

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Son Duruşma Sonucu
              </label>

              <textarea
                name="last_hearing_result"
                value={
                  formData.last_hearing_result
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                rows="3"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Örn: Bilirkişi raporunun beklenmesine karar verildi."
              />

            </div>

            <div className="max-w-sm">

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Masraf / Harç Durumu
              </label>

              <select
                name="expense_status"
                value={
                  formData.expense_status
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                {EXPENSE_OPTIONS.map(
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

          </section>

          {/* ==================================================
              ACTIONS
          ================================================== */}

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">

            <Button
              type="submit"
              loading={
                isPending
              }
              disabled={
                isPending ||
                lawyersLoading ||
                (
                  Boolean(
                    caseIdFromUrl
                  ) &&
                  (
                    caseLoading ||
                    !caseItem
                  )
                )
              }
            >
              <Save className="mr-2 h-4 w-4" />

              Duruşmayı Oluştur
            </Button>

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
              Vazgeç
            </Button>

          </div>

        </form>

      </Card>

      {unsavedDialogOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-create-unsaved-title"
            tabIndex={-1}
            className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl outline-none dark:border-white/[0.08] dark:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/[0.1] dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div>
                <h2
                  id="event-create-unsaved-title"
                  className="font-semibold text-gray-900 dark:text-white"
                >
                  Kaydedilmemiş değişiklikler
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400">
                  Duruşma oluşturma formunda kaydedilmemiş bilgiler var. Çıkarsanız bu bilgiler kaybolacak.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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

export default EventCreate;