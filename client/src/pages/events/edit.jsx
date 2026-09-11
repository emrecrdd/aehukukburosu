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
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import eventApi from '../../features/events/event.api.js';
import caseApi from '../../features/cases/case.api.js';

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
  Eye,
  Gavel,
  Languages,
  MapPin,
  MessageCircle,
  Microscope,
  Plus,
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

const HEARING_TYPES = [
  { value: 'preliminary', label: 'Ön İnceleme' },
  { value: 'investigation', label: 'Tahkikat' },
  { value: 'expert_examination', label: 'Bilirkişi İncelemesi' },
  { value: 'witness_hearing', label: 'Tanık Dinlenmesi' },
  { value: 'final_decision', label: 'Karar Duruşması' },
  { value: 'other', label: 'Diğer' },
];

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Planlandı' },
  { value: 'ongoing', label: 'Devam Ediyor' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'cancelled', label: 'İptal' },
];

const EXPENSE_OPTIONS = [
  { value: 'pending', label: 'Bekliyor' },
  { value: 'paid', label: 'Ödendi' },
  { value: 'not_applicable', label: 'Yok' },
];

const ROLE_OPTIONS = [
  { value: 'avukat', label: 'Avukat' },
  { value: 'karsi_taraf_avukati', label: 'Karşı Taraf Avukatı' },
  { value: 'müvekkil', label: 'Müvekkil' },
  { value: 'davaci', label: 'Davacı' },
  { value: 'davali', label: 'Davalı' },
  { value: 'tanik', label: 'Tanık' },
  { value: 'bilirkişi', label: 'Bilirkişi' },
  { value: 'uzman', label: 'Uzman' },
  { value: 'tercüman', label: 'Tercüman' },
  { value: 'gözlemci', label: 'Gözlemci' },
  { value: 'diger', label: 'Diğer' },
];

const INITIAL_FORM = {
  title: '',
  description: '',
  hearing_type: 'other',
  last_hearing_result: '',
  opposing_counsel: '',
  expense_status: 'pending',
  start_date: '',
  end_date: '',
  location: '',
  court_room: '',
  judge_name: '',
  status: 'scheduled',
  case_id: '',
  assigned_to: '',
  is_all_day: false,
};

// ======================================================
// HELPERS
// ======================================================

const normalizeNullable = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized || null;
};

const normalizeId = (value) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'object') {
    return value.id === null ||
      value.id === undefined ||
      value.id === ''
      ? ''
      : String(value.id);
  }

  return String(value);
};

const toLocalDateTimeInput = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (number) =>
    String(number).padStart(2, '0');

  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('');
};

const localDateTimeToIso = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

const getRoleLabel = (role) =>
  ROLE_OPTIONS.find((item) => item.value === role)?.label ||
  role ||
  'Katılımcı';

const getRoleIcon = (role) => {
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

const normalizeFormForComparison = (
  form
) => ({
  title:
    String(
      form?.title ??
      ''
    ).trim(),

  description:
    normalizeNullable(
      form?.description
    ),

  hearing_type:
    String(
      form?.hearing_type ||
      'other'
    ),

  last_hearing_result:
    normalizeNullable(
      form?.last_hearing_result
    ),

  opposing_counsel:
    normalizeNullable(
      form?.opposing_counsel
    ),

  expense_status:
    String(
      form?.expense_status ||
      'pending'
    ),

  start_date:
    String(
      form?.start_date ||
      ''
    ),

  end_date:
    String(
      form?.end_date ||
      ''
    ),

  location:
    normalizeNullable(
      form?.location
    ),

  court_room:
    normalizeNullable(
      form?.court_room
    ),

  judge_name:
    normalizeNullable(
      form?.judge_name
    ),

  status:
    String(
      form?.status ||
      'scheduled'
    ),

  case_id:
    normalizeId(
      form?.case_id
    ) || null,

  assigned_to:
    normalizeId(
      form?.assigned_to
    ) || null,

  is_all_day:
    Boolean(
      form?.is_all_day
    ),
});

const normalizeAttendeesForComparison = (
  values
) => {
  if (
    !Array.isArray(
      values
    )
  ) {
    return [];
  }

  return values
    .map(
      (item) => ({
        name:
          String(
            item?.name ||
            ''
          ).trim(),

        role:
          String(
            item?.role ||
            'diger'
          ),
      })
    )
    .filter(
      (item) =>
        Boolean(
          item.name
        )
    )
    .sort(
      (a, b) =>
        `${a.role}|${a.name.toLocaleLowerCase('tr-TR')}`.localeCompare(
          `${b.role}|${b.name.toLocaleLowerCase('tr-TR')}`,
          'tr-TR'
        )
    );
};

const getEventErrorMessage = (
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

  if (
    !technicalMessage
  ) {
    return fallback;
  }

  if (
    /validation failed|validation error|sequelizevalidationerror|notnull violation|cannot be null|must not be null|invalid input syntax|invalid date/i.test(
      technicalMessage
    )
  ) {
    return 'Duruşma bilgileri doğrulanamadı. Zorunlu ve geçerli alanları kontrol edin.';
  }

  if (
    /event.*not found|hearing.*not found/i.test(
      technicalMessage
    )
  ) {
    return 'Duruşma kaydı bulunamadı.';
  }

  if (
    /case.*not found/i.test(
      technicalMessage
    )
  ) {
    return 'İlişkili dava bulunamadı veya bu kayda erişim yetkiniz yok.';
  }

  if (
    /forbidden|permission denied|not authorized|unauthorized|access denied/i.test(
      technicalMessage
    )
  ) {
    return 'Bu işlem için yetkiniz bulunmuyor.';
  }

  if (
    /network error|failed to fetch|timeout|econnrefused|enotfound/i.test(
      technicalMessage
    )
  ) {
    return 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.';
  }

  const looksTurkish =
    /[çğıöşüÇĞİÖŞÜ]|bulunamadı|geçersiz|zorunlu|yetkiniz|başarısız|güncellenemedi|silinemedi|hata/i.test(
      rawMessage
    );

  return looksTurkish
    ? rawMessage
    : fallback;
};

// ======================================================
// CACHE INVALIDATION
// ======================================================

const invalidateEventViews = async (
  queryClient,
  {
    eventId = null,
    caseIds = [],
  } = {}
) => {
  const normalizedCaseIds = [
    ...new Set(
      caseIds
        .map((caseId) => normalizeId(caseId))
        .filter(Boolean)
    ),
  ];

  const invalidations = [
    // Genel event listeleri
    queryClient.invalidateQueries({
      queryKey: ['events'],
    }),

    // Kullanıcının event listesi
    queryClient.invalidateQueries({
      queryKey: ['my-events'],
    }),

    // Takvim + dashboard aylık görünümü
    queryClient.invalidateQueries({
      queryKey: ['calendar-events'],
    }),

    // Dashboard "Bugünkü Duruşmalar"
    queryClient.invalidateQueries({
      queryKey: ['dashboard-hearings'],
    }),

    // Davaya bağlı duruşma listeleri
    queryClient.invalidateQueries({
      queryKey: ['case-events'],
    }),
  ];

  if (eventId) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: ['event', normalizeId(eventId)],
      })
    );
  }

  normalizedCaseIds.forEach((caseId) => {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: ['case', caseId],
      })
    );
  });

  await Promise.all(invalidations);
};

// ======================================================
// COMPONENT
// ======================================================

const EventEdit = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const { user } = useAuth();

  const canEdit =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_EVENTS
    );

  const canDelete =
    hasPermission(
      user,
      PERMISSION_KEYS.DELETE_EVENTS
    );

  const [formData, setFormData] =
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

  const [attendeeName, setAttendeeName] =
    useState('');

  const [attendeeRole, setAttendeeRole] =
    useState('diger');

  const [attendees, setAttendees] =
    useState([]);

  const [
    initialAttendees,
    setInitialAttendees,
  ] =
    useState([]);

  const [errors, setErrors] =
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

  const [
    pendingExitTarget,
    setPendingExitTarget,
  ] =
    useState('');

  const initializedEventIdRef =
    useRef('');

  const deleteDialogRef =
    useRef(null);

  const leaveDialogRef =
    useRef(null);

  const previousFocusRef =
    useRef(null);

  // ======================================================
  // EVENT
  // ======================================================

  const {
    data: eventData,
    isLoading: eventLoading,
    error: eventError,
  } = useQuery({
    queryKey: [
      'event',
      id,
    ],

    queryFn: () =>
      eventApi.getOne(id),

    enabled:
      Boolean(id),

    staleTime:
      2 * 60 * 1000,
  });

  const event =
    eventData?.data?.data ||
    null;

  useEffect(() => {
    if (!event) {
      return;
    }

    const eventId =
      normalizeId(
        event?.id ??
        id
      );

    if (
      !eventId ||
      initializedEventIdRef.current ===
        eventId
    ) {
      return;
    }

    const nextForm = {
      title:
        event.title || '',

      description:
        event.description || '',

      hearing_type:
        event.hearing_type || 'other',

      last_hearing_result:
        event.last_hearing_result || '',

      opposing_counsel:
        event.opposing_counsel || '',

      expense_status:
        event.expense_status || 'pending',

      start_date:
        toLocalDateTimeInput(
          event.start_date
        ),

      end_date:
        toLocalDateTimeInput(
          event.end_date
        ),

      location:
        event.location || '',

      court_room:
        event.court_room || '',

      judge_name:
        event.judge_name || '',

      status:
        event.status || 'scheduled',

      case_id:
        normalizeId(
          event.case_id ??
          event.case?.id
        ),

      assigned_to:
        normalizeId(
          event.assigned_to ??
          event.assignee?.id
        ),

      is_all_day:
        Boolean(
          event.is_all_day
        ),
    };

    const nextAttendees =
      Array.isArray(
        event.attendees
      )
        ? event.attendees
        : [];

    setFormData(
      nextForm
    );

    setInitialFormData(
      nextForm
    );

    setAttendees(
      nextAttendees
    );

    setInitialAttendees(
      nextAttendees
    );

    setErrors({});

    initializedEventIdRef.current =
      eventId;
  }, [
    event,
    id,
  ]);

  // ======================================================
  // ASSIGNABLE LAWYERS
  // ======================================================

  const {
    data: lawyersData,
    isLoading: lawyersLoading,
  } = useQuery({
    queryKey: [
      'case-assignable-lawyers',
      'event-edit',
    ],

    queryFn: () =>
      caseApi.getAssignableLawyers(),

    staleTime:
      5 * 60 * 1000,
  });

  const assignableUsersRaw =
    Array.isArray(
      lawyersData?.data?.data
    )
      ? lawyersData.data.data
      : [];

  const currentUserId =
    normalizeId(
      user?.id
    );

  const assignableUsers =
    currentUserId &&
    !assignableUsersRaw.some(
      (person) =>
        normalizeId(
          person?.id
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

            role:
              user?.role ||
              'lawyer',
          },
          ...assignableUsersRaw,
        ]
      : assignableUsersRaw;

  const normalizedForm =
    normalizeFormForComparison(
      formData
    );

  const normalizedInitialForm =
    normalizeFormForComparison(
      initialFormData
    );

  const normalizedAttendees =
    normalizeAttendeesForComparison(
      attendees
    );

  const normalizedInitialAttendees =
    normalizeAttendeesForComparison(
      initialAttendees
    );

  const isDirty =
    JSON.stringify(
      normalizedForm
    ) !==
      JSON.stringify(
        normalizedInitialForm
      ) ||
    JSON.stringify(
      normalizedAttendees
    ) !==
      JSON.stringify(
        normalizedInitialAttendees
      );

  // ======================================================
  // MUTATIONS
  // ======================================================

  const mutation =
    useMutation({
      mutationFn: (payload) =>
        eventApi.update(
          id,
          payload
        ),

      onSuccess: async () => {
        const oldCaseId =
          normalizeId(
            event?.case_id ??
            event?.case?.id
          );

        const newCaseId =
          normalizeId(
            formData.case_id
          );

        await invalidateEventViews(
          queryClient,
          {
            eventId: id,
            caseIds: [
              oldCaseId,
              newCaseId,
            ],
          }
        );

        toast.success(
          'Duruşma başarıyla güncellendi'
        );

        navigate(
          `/events/${id}`
        );
      },

      onError: (error) => {
        toast.error(
          getEventErrorMessage(
            error,
            'Duruşma güncellenemedi'
          )
        );
      },
    });

  const deleteMutation =
    useMutation({
      mutationFn: () =>
        eventApi.remove(id),

      onSuccess: async () => {
        const caseId =
          normalizeId(
            event?.case_id ??
            event?.case?.id
          );

        await queryClient.cancelQueries({
          queryKey: ['event', id],
        });

        queryClient.removeQueries({
          queryKey: ['event', id],
          exact: true,
        });

        await invalidateEventViews(
          queryClient,
          {
            caseIds: [
              caseId,
            ],
          }
        );

        toast.success(
          'Duruşma silindi'
        );

        if (caseId) {
          navigate(
            `/cases/${caseId}`
          );

          return;
        }

        navigate(
          '/calendar'
        );
      },

      onError: (error) => {
        toast.error(
          getEventErrorMessage(
            error,
            'Duruşma silinemedi'
          )
        );
      },
    });

  const isPending =
    mutation.isPending ||
    deleteMutation.isPending;

  // ======================================================
  // CHANGE
  // ======================================================

  const handleChange = (e) => {
    if (
      !canEdit ||
      isPending
    ) {
      return;
    }

    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setFormData(
      (current) => ({
        ...current,
        [name]:
          type === 'checkbox'
            ? checked
            : value,
      })
    );

    if (
      errors[name]
    ) {
      setErrors(
        (current) => ({
          ...current,
          [name]: '',
        })
      );
    }
  };

  // ======================================================
  // ATTENDEES
  // ======================================================

  const addAttendee = () => {
    if (!canEdit || isPending) {
      return;
    }

    const name =
      attendeeName.trim();

    if (!name) {
      return;
    }

    const exists =
      attendees.some(
        (item) =>
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

    if (exists) {
      toast.error(
        'Bu katılımcı zaten eklenmiş'
      );

      return;
    }

    setAttendees(
      (current) => [
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
    if (!canEdit || isPending) {
      return;
    }

    setAttendees(
      (current) =>
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

  const handleAttendeeKeyDown = (
    e
  ) => {
    if (
      e.key !==
      'Enter'
    ) {
      return;
    }

    e.preventDefault();
    addAttendee();
  };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm = () => {
    const nextErrors = {};

    if (
      formData.title
        .trim()
        .length < 2
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
        'Geçersiz masraf durumu';
    }

    const assignedTo =
      normalizeId(
        formData.assigned_to
      );

    if (
      assignedTo &&
      !assignableUsers.some(
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
    e
  ) => {
    e.preventDefault();

    if (
      !canEdit
    ) {
      toast.error(
        'Duruşma düzenleme yetkiniz bulunmuyor.'
      );

      return;
    }

    if (
      isPending
    ) {
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

    if (
      !isDirty
    ) {
      toast(
        'Kaydedilecek bir değişiklik bulunmuyor'
      );

      return;
    }

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
        formData.case_id ||
        null,

      assigned_to:
        formData.assigned_to ||
        null,

      is_all_day:
        Boolean(
          formData.is_all_day
        ),

      attendees:
        attendees
          .map(
            (attendee) => ({
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
  // LEAVE / UNSAVED CHANGES
  // ======================================================

  const handleRequestExit = (
    target
  ) => {
    if (
      isPending
    ) {
      return;
    }

    if (
      !isDirty
    ) {
      navigate(
        target
      );

      return;
    }

    setPendingExitTarget(
      target
    );

    setLeaveDialogOpen(
      true
    );
  };

  const handleCloseLeaveDialog =
    () => {
      if (
        isPending
      ) {
        return;
      }

      setLeaveDialogOpen(
        false
      );

      setPendingExitTarget(
        ''
      );
    };

  const handleConfirmLeave =
    () => {
      if (
        isPending
      ) {
        return;
      }

      const target =
        pendingExitTarget ||
        `/events/${id}`;

      setLeaveDialogOpen(
        false
      );

      setPendingExitTarget(
        ''
      );

      navigate(
        target
      );
    };

  useEffect(() => {
    if (
      !isDirty ||
      mutation.isPending
    ) {
      return undefined;
    }

    const handleBeforeUnload =
      (event) => {
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

  // ======================================================
  // DELETE
  // ======================================================

  const handleDelete = () => {
    if (
      !canDelete
    ) {
      toast.error(
        'Duruşma silme yetkiniz bulunmuyor.'
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

      deleteMutation.mutate();
    };

  useEffect(() => {
    const activeDialog =
      leaveDialogOpen
        ? leaveDialogRef.current
        : deleteDialogOpen
          ? deleteDialogRef.current
          : null;

    if (
      !activeDialog
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

    const focusableSelector =
      [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');

    const focusFirst =
      () => {
        const focusable =
          activeDialog.querySelectorAll(
            focusableSelector
          );

        focusable?.[0]?.focus();
      };

    const timer =
      window.setTimeout(
        focusFirst,
        0
      );

    const handleKeyDown =
      (event) => {
        if (
          event.key ===
          'Escape'
        ) {
          if (
            leaveDialogOpen &&
            !isPending
          ) {
            handleCloseLeaveDialog();
          } else if (
            deleteDialogOpen &&
            !deleteMutation.isPending
          ) {
            handleCloseDeleteDialog();
          }

          return;
        }

        if (
          event.key !==
          'Tab'
        ) {
          return;
        }

        const focusable =
          Array.from(
            activeDialog.querySelectorAll(
              focusableSelector
            )
          );

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

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.clearTimeout(
        timer
      );

      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;

      const previousFocus =
        previousFocusRef.current;

      if (
        previousFocus &&
        typeof previousFocus.focus ===
          'function'
      ) {
        window.setTimeout(
          () =>
            previousFocus.focus(),
          0
        );
      }
    };
  }, [
    leaveDialogOpen,
    deleteDialogOpen,
    deleteMutation.isPending,
    isPending,
  ]);

  // ======================================================
  // LOADING / ERROR
  // ======================================================

  if (
    eventLoading
  ) {
    return (
      <div className="flex min-h-[20rem] flex-col items-center justify-center gap-3">

        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />

        <p className="text-sm text-gray-500">
          Duruşma yükleniyor...
        </p>

      </div>
    );
  }

  if (
    eventError ||
    !event
  ) {
    return (
      <div className="py-16 text-center">

        <Gavel className="mx-auto h-10 w-10 text-gray-300" />

        <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
          Duruşma bulunamadı
        </h2>

        <Link
          to="/calendar"
          className="mt-4 inline-block"
        >
          <Button variant="outline">
            Takvime Dön
          </Button>
        </Link>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      <div>

        <Link
          to={`/events/${id}`}
          onClick={(event) => {
            if (
              isDirty
            ) {
              event.preventDefault();

              handleRequestExit(
                `/events/${id}`
              );
            }
          }}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Duruşmaya Dön
        </Link>

        <div className="mt-4 flex items-start gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <Gavel className="h-6 w-6 text-blue-600" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Duruşmayı Düzenle
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
              Duruşma bilgilerini, sorumlu avukatı ve katılımcıları güncelleyin.
            </p>
          </div>

        </div>

      </div>

      <Card>
        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-8 p-6"
        >

          <section className="space-y-4">

            <h2 className="font-semibold text-gray-900 dark:text-white">
              Duruşma Bilgileri
            </h2>

            <Input
              label="Başlık *"
              name="title"
              value={formData.title}
              onChange={handleChange}
              error={errors.title}
              disabled={isPending || !canEdit}
            />

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={isPending || !canEdit}
              rows="3"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Duruşmaya ilişkin genel not..."
            />

            <div className="grid gap-4 md:grid-cols-2">

              <select
                name="hearing_type"
                value={formData.hearing_type}
                onChange={handleChange}
                disabled={isPending || !canEdit}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {HEARING_TYPES.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={isPending || !canEdit}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

            </div>

          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Tarih ve Saat
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label="Başlangıç Tarihi *"
                name="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={handleChange}
                error={errors.start_date}
                disabled={isPending || !canEdit}
              />

              <Input
                label="Bitiş Tarihi"
                name="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={handleChange}
                error={errors.end_date}
                disabled={isPending || !canEdit}
              />

            </div>

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="is_all_day"
                checked={formData.is_all_day}
                onChange={handleChange}
                disabled={isPending || !canEdit}
                className="h-4 w-4 rounded"
              />

              <span className="text-sm text-gray-700 dark:text-gray-300">
                Tüm gün etkinlik
              </span>
            </label>

          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Mahkeme ve Yer Bilgileri
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">

              <Input
                label="Mahkeme / Yer"
                name="location"
                value={formData.location}
                onChange={handleChange}
                disabled={isPending || !canEdit}
              />

              <Input
                label="Salon"
                name="court_room"
                value={formData.court_room}
                onChange={handleChange}
                disabled={isPending || !canEdit}
              />

              <Input
                label="Hakim"
                name="judge_name"
                value={formData.judge_name}
                onChange={handleChange}
                disabled={isPending || !canEdit}
              />

            </div>

          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-purple-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Avukat Bilgileri
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Atanan Avukat
                </label>

                <select
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                  disabled={
                    isPending ||
                    lawyersLoading ||
                    !canEdit
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">
                    Avukat seçin
                  </option>

                  {assignableUsers.map(
                    (person) => (
                      <option
                        key={person.id}
                        value={normalizeId(person.id)}
                      >
                        {[
                          person.first_name,
                          person.last_name,
                        ]
                          .filter(Boolean)
                          .join(' ') ||
                          person.name ||
                          person.email ||
                          'Avukat'}
                        {user?.id !==
                          null &&
                        user?.id !==
                          undefined &&
                        normalizeId(person.id) ===
                          normalizeId(user.id)
                          ? ' (Kendiniz)'
                          : person.role === 'admin'
                            ? ' (Yönetici)'
                            : ' (Avukat)'}
                      </option>
                    )
                  )}
                </select>
              </div>

              <Input
                label="Karşı Taraf Avukatı"
                name="opposing_counsel"
                value={formData.opposing_counsel}
                onChange={handleChange}
                disabled={isPending || !canEdit}
              />

            </div>

          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Katılımcılar
              </h2>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]">

              <input
                value={attendeeName}
                onChange={(e) =>
                  setAttendeeName(
                    e.target.value
                  )
                }
                onKeyDown={handleAttendeeKeyDown}
                disabled={isPending || !canEdit}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Katılımcı adı"
              />

              <select
                value={attendeeRole}
                onChange={(e) =>
                  setAttendeeRole(
                    e.target.value
                  )
                }
                disabled={isPending || !canEdit}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {ROLE_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
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
                  !canEdit ||
                  !attendeeName.trim()
                }
                onClick={addAttendee}
              >
                <Plus className="mr-1 h-4 w-4" />
                Ekle
              </Button>

            </div>

            <div className="space-y-2">
              {attendees.map(
                (attendee, index) => (
                  <div
                    key={`${attendee.name}-${attendee.role}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
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
                      onClick={() =>
                        removeAttendee(index)
                      }
                      disabled={isPending || !canEdit}
                      className="rounded p-2 text-gray-400 hover:text-red-600"
                      aria-label={`${attendee.name} katılımcısını kaldır`}
                      title="Katılımcıyı kaldır"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              )}
            </div>

          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <textarea
              name="last_hearing_result"
              value={formData.last_hearing_result}
              onChange={handleChange}
              disabled={isPending || !canEdit}
              rows="3"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Son duruşma sonucu..."
            />

            <select
              name="expense_status"
              value={formData.expense_status}
              onChange={handleChange}
              disabled={isPending || !canEdit}
              className="w-full max-w-sm rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {EXPENSE_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>

          </section>

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">

            {canEdit && (
              <Button
                type="submit"
                loading={mutation.isPending}
                disabled={
                  isPending ||
                  !canEdit ||
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
              disabled={isPending}
              onClick={() =>
                handleRequestExit(
                  `/events/${id}`
                )
              }
            >
              Vazgeç
            </Button>

            {canDelete && (
              <Button
                type="button"
                variant="danger"
                loading={deleteMutation.isPending}
                disabled={isPending}
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Duruşmayı Sil
              </Button>
            )}

          </div>

        </form>
      </Card>

      {leaveDialogOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">

          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Kaydedilmemiş değişiklik penceresini kapat"
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
            aria-labelledby="event-leave-dialog-title"
            aria-describedby="event-leave-dialog-description"
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
                    id="event-leave-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Değişiklikleri kaydetmeden çık?
                  </h2>

                  <p
                    id="event-leave-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    Duruşma üzerinde yaptığınız değişiklikler henüz kaydedilmedi.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">
                <p className="text-sm leading-6 text-gray-600 dark:text-slate-300">
                  Düzenlemeye devam edebilir veya kaydedilmemiş değişiklikleri atarak duruşma detayına dönebilirsiniz.
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
            aria-labelledby="event-delete-dialog-title"
            aria-describedby="event-delete-dialog-description"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]"
          >
            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/[0.10] dark:text-red-400">
                  <Trash2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">

                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                    Duruşma silme onayı
                  </p>

                  <h2
                    id="event-delete-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Duruşma kaydını sil
                  </h2>

                  <p
                    id="event-delete-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    <span className="font-medium text-gray-700 dark:text-slate-200">
                      {event?.title ||
                        'Seçili duruşma'}
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
                      Duruşma kaydı silinecek
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-900/80 dark:text-red-200/80">
                      Bu duruşma takvim ve ilgili dava ekranlarından kaldırılacaktır.
                    </p>

                  </div>

                </div>

              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">

                <p className="text-sm leading-6 text-gray-600 dark:text-slate-300">
                  Devam etmeden önce doğru duruşma kaydını seçtiğinizden emin olun.
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

                Duruşmayı Sil
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default EventEdit;