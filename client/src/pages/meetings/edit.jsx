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

import meetingApi from '../../features/meetings/meeting.api.js';

import {
  useDeleteMeeting,
  useUpdateMeeting,
} from '../../features/meetings/meeting.query.js';
import caseApi from '../../features/cases/case.api.js';
import clientApi from '../../features/clients/client.api.js';
import userApi from '../../features/users/user.api.js';

import { useAuth } from '../../app/providers/auth.provider.jsx';

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
  Link2,
  MapPin,
  Plus,
  Save,
  Trash2,
  Users,
  UsersRound,
  Video,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const INITIAL_FORM = {
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  location: '',
  meeting_type: 'other',
  case_id: '',
  client_id: '',

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

// ======================================================
// HELPERS
// ======================================================

const getStatusVariant = (status) => {
  switch (status) {
    case 'scheduled':
      return 'warning';

    case 'ongoing':
      return 'info';

    case 'completed':
      return 'success';

    case 'cancelled':
      return 'danger';

    default:
      return 'default';
  }
};

const getStatusLabel = (status) => {
  return (
    STATUS_OPTIONS.find(
      (item) =>
        item.value === status
    )?.label ||
    status ||
    'Bilinmiyor'
  );
};

const getMeetingTypeLabel = (type) => {
  return (
    MEETING_TYPE_OPTIONS.find(
      (item) =>
        item.value === type
    )?.label ||
    'Diğer'
  );
};

// ======================================================
// API DATE -> DATETIME LOCAL
// Europe/Istanbul saatine çevir
// ======================================================

const formatForDateTimeLocal = (date) => {
  if (!date) {
    return '';
  }

  try {
    const parsed =
      new Date(date);

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
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }
      ).formatToParts(parsed);

    const map = {};

    parts.forEach(
      (part) => {
        if (
          part.type !==
          'literal'
        ) {
          map[part.type] =
            part.value;
        }
      }
    );

    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
  } catch {
    return '';
  }
};

// ======================================================
// DATETIME LOCAL -> ISO
// Türkiye saati kabul ederek UTC gönder
// ======================================================

const localToUTC = (dateTime) => {
  if (!dateTime) {
    return null;
  }

  try {
    const [date, time] =
      dateTime.split('T');

    if (!date || !time) {
      return null;
    }

    const parsed =
      new Date(
        `${date}T${time}:00+03:00`
      );

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return null;
    }

    return parsed.toISOString();
  } catch {
    return null;
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

const normalizeId = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  if (typeof value === 'object') {
    return value?.id === null ||
      value?.id === undefined ||
      value?.id === ''
      ? ''
      : String(value.id);
  }

  return String(value);
};

const normalizeText = (value) =>
  String(value ?? '').trim();

const normalizeAttendees = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((attendee) => {
      if (typeof attendee === 'string') {
        return {
          name: attendee.trim(),
          role: 'Katılımcı',
        };
      }

      return {
        name: normalizeText(
          attendee?.name
        ),
        role:
          normalizeText(
            attendee?.role
          ) || 'Katılımcı',
      };
    })
    .filter((attendee) =>
      Boolean(attendee.name)
    );
};

const normalizeMeetingForm = (form) => ({
  title: normalizeText(form?.title),
  description: normalizeText(
    form?.description
  ),
  start_date: form?.start_date || '',
  end_date: form?.end_date || '',
  location: normalizeText(
    form?.location
  ),
  meeting_type:
    form?.meeting_type || 'other',
  case_id: normalizeId(
    form?.case_id
  ),
  client_id: normalizeId(
    form?.client_id
  ),
  attendee_ids: [
    ...new Set(
      Array.isArray(
        form?.attendee_ids
      )
        ? form.attendee_ids
            .map(
              (participantId) =>
                normalizeId(
                  participantId
                )
            )
            .filter(Boolean)
        : []
    ),
  ].sort(),
  status: form?.status || 'scheduled',
  attendees: normalizeAttendees(
    form?.attendees
  ),
  meeting_link: normalizeText(
    form?.meeting_link
  ),
  notes: normalizeText(form?.notes),
});

const getMeetingErrorMessage = (
  error,
  fallback
) => {
  const status =
    error?.response?.status;

  const rawMessage =
    error?.response?.data?.message ||
    error?.message ||
    '';

  if (status === 401) {
    return 'Oturumunuzun süresi dolmuş olabilir. Lütfen yeniden giriş yapın.';
  }

  if (status === 403) {
    return 'Bu toplantı kaydını görüntüleme yetkiniz bulunmuyor.';
  }

  if (status === 404) {
    return 'Toplantı kaydı bulunamadı veya artık erişilebilir değil.';
  }

  if (
    /network error|failed to fetch|timeout/i.test(
      rawMessage
    )
  ) {
    return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  }

  if (
    /validation failed|validation error/i.test(
      rawMessage
    )
  ) {
    return 'Toplantı bilgilerinde doğrulanamayan alanlar var.';
  }

  if (
    rawMessage &&
    /[çğıöşüÇĞİÖŞÜ]/.test(
      rawMessage
    )
  ) {
    return rawMessage;
  }

  return fallback;
};

// ======================================================
// COMPONENT
// ======================================================

const MeetingEdit = () => {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const { user } =
    useAuth();

  const [
    formData,
    setFormData,
  ] = useState(
    INITIAL_FORM
  );

  const [
    initialFormData,
    setInitialFormData,
  ] = useState(
    INITIAL_FORM
  );

  const [
    attendeeName,
    setAttendeeName,
  ] = useState('');

  const [
    attendeeRole,
    setAttendeeRole,
  ] = useState('');

  const [
    errors,
    setErrors,
  ] = useState({});

  const [
    deleteDialogOpen,
    setDeleteDialogOpen,
  ] = useState(false);

  const [
    leaveDialogOpen,
    setLeaveDialogOpen,
  ] = useState(false);

  const [
    pendingExitPath,
    setPendingExitPath,
  ] = useState('');

  const initializedMeetingIdRef =
    useRef('');

  const leaveDialogRef =
    useRef(null);

  const leaveTriggerRef =
    useRef(null);

  const deleteDialogRef =
    useRef(null);

  const deleteTriggerRef =
    useRef(null);

  // ======================================================
  // MEETING
  // ======================================================

  const {
    data: meetingData,
    isLoading:
      meetingLoading,
    error:
      meetingError,
  } = useQuery({
    queryKey: [
      'meeting',
      id,
    ],

    queryFn: () =>
      meetingApi.getOne(id),

    enabled:
      Boolean(id),
  });

  // ======================================================
  // RELATED DATA
  // ======================================================

  const {
    data: casesData,
    isLoading:
      casesLoading,
  } = useQuery({
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
    data: clientsData,
    isLoading:
      clientsLoading,
  } = useQuery({
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
      clientCasesData,

    isLoading:
      clientCasesLoading,
  } = useQuery({
    queryKey: [
      'clients',
      formData.client_id,
      'meeting-edit-cases',
    ],

    queryFn: () =>
      clientApi.getCaseHistory(
        formData.client_id
      ),

    enabled:
      Boolean(
        formData.client_id
      ),

    staleTime:
      3 * 60 * 1000,
  });

  const {
    data:
      selectedCaseData,

    isLoading:
      selectedCaseLoading,
  } = useQuery({
    queryKey: [
      'case',
      formData.case_id,
      'meeting-edit-relation',
    ],

    queryFn: () =>
      caseApi.getOne(
        formData.case_id
      ),

    enabled:
      Boolean(
        formData.case_id
      ),

    staleTime:
      3 * 60 * 1000,
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
  } = useQuery({
    queryKey: [
      'users',
    ],

    queryFn: () =>
      userApi.getAll(),
  });

  // ======================================================
  // DATA
  // ======================================================

  const meeting =
    meetingData?.data?.data ??
    meetingData?.data ??
    null;

  const cases =
    casesData?.data?.data ||
    [];

  const clients =
    clientsData?.data?.data ||
    [];

  const users =
    usersData?.data?.data ||
    [];


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
            String(
              item.id
            ) ===
            String(
              formData.case_id
            )
        ) ||
        (
          selectedCaseDetail &&
          String(
            selectedCaseDetail.id
          ) ===
          String(
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
    ]);

  // ======================================================
  // PERMISSIONS
  // ======================================================

  const isAdmin =
    user?.role ===
    'admin';

  const canEdit =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_MEETINGS
    );

  const canDelete =
    hasPermission(
      user,
      PERMISSION_KEYS.DELETE_MEETINGS
    );

  const assignableUsers =
    useMemo(() => {
      if (!isAdmin) {
        return [];
      }

      return users.filter(
        (person) =>
          person?.is_active !==
          false
      );
    }, [
      users,
      isAdmin,
    ]);

  const selectedParticipantUsers =
    useMemo(() => {
      const selectedIds =
        Array.isArray(
          formData.attendee_ids
        )
          ? formData.attendee_ids
              .map(
                (participantId) =>
                  normalizeId(
                    participantId
                  )
              )
              .filter(Boolean)
          : [];

      if (
        selectedIds.length ===
        0
      ) {
        return [];
      }

      const meetingParticipants =
        Array.isArray(
          meeting?.participantUsers
        )
          ? meeting.participantUsers
          : [];

      const candidates = [
        ...users,
        ...meetingParticipants,
      ];

      const byId =
        new Map();

      candidates.forEach(
        (person) => {
          const personId =
            normalizeId(
              person?.id
            );

          if (
            personId &&
            !byId.has(
              personId
            )
          ) {
            byId.set(
              personId,
              person
            );
          }
        }
      );

      return selectedIds.map(
        (participantId) =>
          byId.get(
            participantId
          ) || {
            id:
              participantId,

            first_name:
              'Kullanıcı',

            last_name:
              '',
          }
      );
    }, [
      formData.attendee_ids,
      users,
      meeting,
    ]);

  // ======================================================
  // FORM INITIALIZATION
  // ======================================================

  useEffect(() => {
    const meetingId =
      normalizeId(meeting?.id || id);

    if (
      !meeting ||
      !meetingId ||
      initializedMeetingIdRef.current ===
        meetingId
    ) {
      return;
    }

    const nextForm = {
      title:
        meeting.title ||
        '',

      description:
        meeting.description ||
        '',

      start_date:
        formatForDateTimeLocal(
          meeting.start_date
        ),

      end_date:
        formatForDateTimeLocal(
          meeting.end_date
        ),

      location:
        meeting.location ||
        '',

      meeting_type:
        meeting.meeting_type ||
        'other',

      case_id:
        normalizeId(
          meeting.case_id ??
          meeting.case?.id
        ),

      client_id:
        normalizeId(
          meeting.client_id ??
          meeting.client?.id
        ),

      attendee_ids: [
        ...new Set(
          (
            Array.isArray(
              meeting.participantUsers
            ) &&
            meeting.participantUsers.length >
              0
              ? meeting.participantUsers.map(
                  (person) =>
                    normalizeId(
                      person?.id
                    )
                )
              : [
                  normalizeId(
                    meeting.assigned_to ??
                    meeting.assignee?.id
                  ),
                ]
          ).filter(Boolean)
        ),
      ],

      status:
        meeting.status ||
        'scheduled',

      attendees:
        normalizeAttendees(
          meeting.attendees
        ),

      meeting_link:
        meeting.meeting_link ||
        '',

      notes:
        meeting.notes ||
        '',
    };

    setFormData(nextForm);
    setInitialFormData(nextForm);
    setErrors({});

    initializedMeetingIdRef.current =
      meetingId;
  }, [
    meeting,
    id,
  ]);

  const normalizedForm =
    useMemo(
      () =>
        normalizeMeetingForm(
          formData
        ),
      [formData]
    );

  const initialNormalizedForm =
    useMemo(
      () =>
        normalizeMeetingForm(
          initialFormData
        ),
      [initialFormData]
    );

  const isDirty =
    JSON.stringify(
      normalizedForm
    ) !==
    JSON.stringify(
      initialNormalizedForm
    );

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
  }, [isDirty]);

  // ======================================================
  // MUTATIONS
  // ======================================================

  const updateMeeting =
    useUpdateMeeting();

  const deleteMeeting =
    useDeleteMeeting();

  const updateMutation = {
    ...updateMeeting,

    mutate: (
      data
    ) =>
      updateMeeting.mutate(
        {
          id,
          data,
        },
        {
          onSuccess: () => {
            setInitialFormData(
              formData
            );

            navigate(
              `/meetings/${id}`
            );
          },
        }
      ),
  };

  const deleteMutation = {
    ...deleteMeeting,

    mutate: () =>
      deleteMeeting.mutate(
        id,
        {
          onSuccess: () => {
            navigate(
              '/meetings'
            );
          },
        }
      ),
  };

  const isPending =
    updateMutation.isPending ||
    deleteMutation.isPending;

  const handleCloseLeaveDialog = () => {
    if (isPending) {
      return;
    }

    setLeaveDialogOpen(false);
    setPendingExitPath('');
  };

  const requestExit = (path) => {
    if (isPending) {
      return;
    }

    if (!isDirty) {
      navigate(path);
      return;
    }

    leaveTriggerRef.current =
      document.activeElement;

    setPendingExitPath(path);
    setLeaveDialogOpen(true);
  };

  const handleConfirmLeave = () => {
    if (isPending) {
      return;
    }

    const path =
      pendingExitPath ||
      `/meetings/${id}`;

    leaveTriggerRef.current = null;
    setLeaveDialogOpen(false);
    setPendingExitPath('');
    navigate(path);
  };

  useEffect(() => {
    if (!leaveDialogOpen) {
      return undefined;
    }

    const dialog =
      leaveDialogRef.current;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusFirst = () => {
      const focusable =
        dialog?.querySelectorAll(
          focusableSelector
        );

      focusable?.[0]?.focus();
    };

    const frame =
      window.requestAnimationFrame(
        focusFirst
      );

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCloseLeaveDialog();
        return;
      }

      if (
        event.key !== 'Tab' ||
        !dialog
      ) {
        return;
      }

      const focusable =
        Array.from(
          dialog.querySelectorAll(
            focusableSelector
          )
        ).filter((element) =>
          !element.hasAttribute(
            'disabled'
          )
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
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
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

      const trigger =
        leaveTriggerRef.current;

      if (
        trigger &&
        document.contains(trigger)
      ) {
        trigger.focus?.();
      }

      leaveTriggerRef.current = null;
    };
  }, [
    leaveDialogOpen,
    isPending,
  ]);

  // ======================================================
  // HANDLERS
  // ======================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (
        current
      ) => {
        /*
         * Müvekkil değişirse mevcut dava yeni müvekkile
         * ait değilse temizlenir.
         */
        if (
          name ===
          'client_id'
        ) {
          const currentCaseStillValid =
            !current.case_id ||
            clientCases.some(
              (
                caseItem
              ) =>
                String(
                  caseItem.id
                ) ===
                String(
                  current.case_id
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

        /*
         * Dava değişirse mevcut müvekkil yeni davaya
         * bağlı değilse temizlenir.
         */
        if (
          name ===
          'case_id'
        ) {
          const currentClientStillValid =
            !current.client_id ||
            caseClients.some(
              (
                client
              ) =>
                String(
                  client.id
                ) ===
                String(
                  current.client_id
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

    if (errors[name]) {
      setErrors(
        (current) => ({
          ...current,
          [name]: '',
        })
      );
    }
  };

  const handleParticipantToggle =
    (
      participantId
    ) => {
      if (
        !isAdmin ||
        isPending
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
        !isAdmin ||
        isPending
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
          (participantId) =>
            selectedIds.includes(
              participantId
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

  const handleAddAttendee =
    () => {
      const name =
        attendeeName.trim();

      const role =
        attendeeRole.trim();

      if (!name) {
        return;
      }

      setFormData(
        (current) => ({
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

      setAttendeeName('');
      setAttendeeRole('');
    };

  const handleRemoveAttendee =
    (index) => {
      setFormData(
        (current) => ({
          ...current,

          attendees:
            current.attendees.filter(
              (
                _attendee,
                attendeeIndex
              ) =>
                attendeeIndex !==
                index
            ),
        })
      );
    };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      if (
        !formData.title.trim()
      ) {
        nextErrors.title =
          'Toplantı başlığı gereklidir';
      }

      if (
        !formData.start_date
      ) {
        nextErrors.start_date =
          'Başlangıç tarihi gereklidir';
      }

      if (
        formData.end_date &&
        formData.start_date &&
        new Date(
          formData.end_date
        ) <
          new Date(
            formData.start_date
          )
      ) {
        nextErrors.end_date =
          'Bitiş tarihi başlangıç tarihinden önce olamaz';
      }

      if (
        isAdmin
      ) {
        const participantIds =
          Array.isArray(
            formData.attendee_ids
          )
            ? formData.attendee_ids
                .map(
                  (participantId) =>
                    normalizeId(
                      participantId
                    )
                )
                .filter(Boolean)
            : [];

        if (
          participantIds.length ===
          0
        ) {
          nextErrors.attendee_ids =
            'Toplantı en az 1 kişiye atanmalıdır';
        } else if (
          usersError
        ) {
          nextErrors.attendee_ids =
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
            participantIds.some(
              (participantId) =>
                !validIds.has(
                  participantId
                )
            );

          if (
            hasInvalidParticipant
          ) {
            nextErrors.attendee_ids =
              'Seçilen katılımcılardan biri artık atanabilir değil';
          }
        }
      }

      setErrors(
        nextErrors
      );

      return (
        Object.keys(
          nextErrors
        ).length === 0
      );
    };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (!canEdit) {
      toast.error(
        'Bu toplantıyı düzenleme yetkiniz bulunmuyor'
      );

      return;
    }

    if (
      updateMutation.isPending
    ) {
      return;
    }

    if (!isDirty) {
      toast(
        'Kaydedilecek bir değişiklik bulunmuyor'
      );

      return;
    }

    if (!validateForm()) {
      toast.error(
        'Formdaki eksik veya hatalı alanları kontrol edin'
      );

      return;
    }

    const submitData = {
      title:
        formData.title.trim(),

      description:
        formData.description
          .trim() ||
        null,

      start_date:
        localToUTC(
          formData.start_date
        ),

      end_date:
        localToUTC(
          formData.end_date
        ),

      location:
        formData.location
          .trim() ||
        null,

      meeting_type:
        formData.meeting_type,

      case_id:
        normalizeId(
          formData.case_id
        ) || null,

      client_id:
        normalizeId(
          formData.client_id
        ) || null,

      status:
        formData.status,

      attendees:
        normalizeAttendees(
          formData.attendees
        ),

      meeting_link:
        formData.meeting_link
          .trim() ||
        null,

      notes:
        formData.notes
          .trim() ||
        null,
    };

    /*
     * İç kullanıcı katılımcıları yalnızca admin tarafından
     * değiştirilsin.
     *
     * Non-admin kullanıcı toplantının katılımcı ilişkisini
     * yanlışlıkla değiştirmesin.
     */
    if (isAdmin) {
      submitData.attendee_ids = [
        ...new Set(
          (
            Array.isArray(
              formData.attendee_ids
            )
              ? formData.attendee_ids
              : []
          )
            .map(
              (participantId) =>
                normalizeId(
                  participantId
                )
            )
            .filter(Boolean)
        ),
      ];
    }

    updateMutation.mutate(
      submitData
    );
  };

  // ======================================================
  // DELETE
  // ======================================================

  const handleDelete =
    () => {
      if (!canDelete) {
        toast.error(
          'Bu toplantıyı silme yetkiniz bulunmuyor'
        );

        return;
      }

      if (
        updateMutation.isPending ||
        deleteMutation.isPending
      ) {
        return;
      }

      deleteTriggerRef.current =
        document.activeElement;

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
    if (!deleteDialogOpen) {
      return undefined;
    }

    const dialog =
      deleteDialogRef.current;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const frame =
      window.requestAnimationFrame(
        () => {
          dialog
            ?.querySelector(
              focusableSelector
            )
            ?.focus();
        }
      );

    const handleKeyDown = (event) => {
      if (
        event.key === 'Escape' &&
        !deleteMutation.isPending
      ) {
        event.preventDefault();
        setDeleteDialogOpen(false);
        return;
      }

      if (
        event.key !== 'Tab' ||
        !dialog
      ) {
        return;
      }

      const focusable =
        Array.from(
          dialog.querySelectorAll(
            focusableSelector
          )
        ).filter((element) =>
          !element.hasAttribute(
            'disabled'
          )
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
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
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

      const trigger =
        deleteTriggerRef.current;

      if (
        trigger &&
        document.contains(trigger)
      ) {
        trigger.focus?.();
      }

      deleteTriggerRef.current = null;
    };
  }, [
    deleteDialogOpen,
    deleteMutation.isPending,
  ]);

  // ======================================================
  // LOADING
  // ======================================================

  if (meetingLoading) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Toplantı bilgileri yükleniyor...
          </p>

        </div>

      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    meetingError ||
    !meeting
  ) {
    return (
      <div className="py-12 text-center">

        <div className="mb-4 text-5xl">
          🤝
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Toplantı Bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {getMeetingErrorMessage(
            meetingError,
            'Toplantı bilgileri yüklenemedi'
          )}
        </p>

        <Link
          to="/meetings"
          className="mt-4 inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Toplantılara Dön
        </Link>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to={`/meetings/${id}`}
          onClick={(event) => {
            if (isPending) {
              event.preventDefault();
              return;
            }

            if (isDirty) {
              event.preventDefault();
              requestExit(
                `/meetings/${id}`
              );
            }
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

          Toplantı Detayı
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">

          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
            Toplantı Düzenle
          </h1>

          <Badge
            variant={getStatusVariant(
              formData.status
            )}
          >
            {getStatusLabel(
              formData.status
            )}
          </Badge>

          {isDirty && (
            <Badge variant="warning">
              Kaydedilmemiş değişiklik
            </Badge>
          )}

        </div>

        <p className="mt-1 text-sm text-gray-500">
          Toplantı bilgilerini, katılımcıları ve ilişkili kayıtları güncelleyin.
        </p>

      </div>

      {/* INFO */}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">

        <div className="flex items-start gap-3">

          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />

          <div>

            <p className="font-medium text-blue-900 dark:text-blue-200">
              Toplantı takvimde otomatik güncellenir
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
              Tarih, durum veya ilişkili dava değiştirildiğinde toplantı takvim ve dashboard verilerine de yansır.
            </p>

          </div>

        </div>

      </div>

      {/* FORM */}

      <Card
        className="
          overflow-hidden
          border
          border-gray-200
          shadow-sm
          dark:border-white/[0.06]
        "
      >

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6 p-6"
        >

          {/* TITLE */}

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
              updateMutation.isPending
            }
            placeholder="Toplantı başlığı..."
          />

          {/* DESCRIPTION */}

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
                updateMutation.isPending
              }
              rows="4"
              className="
                w-full
                rounded-md
                border
                border-gray-300
                bg-white
                px-3
                py-2
                text-gray-900
                outline-none
                focus:ring-2
                focus:ring-blue-500
                disabled:cursor-not-allowed
                disabled:opacity-60
                dark:border-gray-600
                dark:bg-gray-700
                dark:text-white
              "
              placeholder="Toplantı ile ilgili açıklama..."
            />

          </div>

          {/* DATES */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

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
                updateMutation.isPending
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
              disabled={
                updateMutation.isPending
              }
            />

          </div>

          {/* LOCATION */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />

                Yer
              </span>
            </label>

            <input
              type="text"
              name="location"
              value={
                formData.location
              }
              onChange={
                handleChange
              }
              disabled={
                updateMutation.isPending
              }
              placeholder="Toplantı yeri..."
              className="
                w-full
                rounded-md
                border
                border-gray-300
                bg-white
                px-3
                py-2
                text-gray-900
                outline-none
                focus:ring-2
                focus:ring-blue-500
                dark:border-gray-600
                dark:bg-gray-700
                dark:text-white
              "
            />

          </div>

          {/* MEETING LINK */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">

              <span className="inline-flex items-center gap-1.5">
                <Video className="h-4 w-4" />

                Toplantı Linki
              </span>

            </label>

            <input
              type="url"
              name="meeting_link"
              value={
                formData.meeting_link
              }
              onChange={
                handleChange
              }
              disabled={
                updateMutation.isPending
              }
              placeholder="https://zoom.us/..."
              className="
                w-full
                rounded-md
                border
                border-gray-300
                bg-white
                px-3
                py-2
                text-gray-900
                outline-none
                focus:ring-2
                focus:ring-blue-500
                dark:border-gray-600
                dark:bg-gray-700
                dark:text-white
              "
            />

          </div>

          {/* TYPE + STATUS */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  updateMutation.isPending
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                {MEETING_TYPE_OPTIONS.map(
                  (type) => (
                    <option
                      key={
                        type.value
                      }
                      value={
                        type.value
                      }
                    >
                      {
                        type.label
                      }
                    </option>
                  )
                )}

              </select>

              <p className="mt-1 text-xs text-gray-400">
                {getMeetingTypeLabel(
                  formData.meeting_type
                )}
              </p>

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
                  updateMutation.isPending
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                {STATUS_OPTIONS.map(
                  (status) => (
                    <option
                      key={
                        status.value
                      }
                      value={
                        status.value
                      }
                    >
                      {
                        status.label
                      }
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

          {/* RELATED */}

          <div>

            <div className="mb-3 flex items-center gap-2">

              <Link2 className="h-4 w-4 text-blue-600" />

              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                İlişkili Kayıtlar
              </p>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              {/* CASE */}

              <div>

                <label className="mb-1 block text-sm text-gray-500">
                  Dava
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
                    updateMutation.isPending ||
                    relationCasesLoading
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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

                  {relationCases.map(
                    (caseItem) => (
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

              </div>

              {/* CLIENT */}

              <div>

                <label className="mb-1 block text-sm text-gray-500">
                  Müvekkil
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
                    updateMutation.isPending ||
                    relationClientsLoading
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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

                  {relationClients.map(
                    (client) => (
                      <option
                        key={
                          client.id
                        }
                        value={
                          client.id
                        }
                      >
                        {
                          client.name
                        }

                        {client.company_name &&
                          ` (${client.company_name})`}
                      </option>
                    )
                  )}

                </select>

                {selectedClient && (
                  <p className="mt-2 truncate text-xs text-gray-400 dark:text-slate-500">
                    Seçili: {selectedClient.name}
                  </p>
                )}

              </div>

            </div>

          </div>

          {/* INTERNAL PARTICIPANTS */}

          <div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">

              <div className="flex items-center gap-2">

                <Users className="h-4 w-4 text-blue-600" />

                <div>

                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Toplantı Katılımcıları
                  </p>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    Toplantıya atanmış Derkenar kullanıcıları
                  </p>

                </div>

              </div>

              {isAdmin &&
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

            {isAdmin ? (
              <div className="space-y-3">

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Bir veya birden fazla kullanıcı seçebilirsiniz.
                  </p>

                  {assignableUsers.length >
                    0 && (
                    <button
                      type="button"
                      onClick={
                        handleSelectAllParticipants
                      }
                      disabled={
                        isPending
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
                      {assignableUsers.length >
                        0 &&
                      assignableUsers.every(
                        (person) =>
                          formData.attendee_ids
                            .map(
                              (participantId) =>
                                normalizeId(
                                  participantId
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
                          const personId =
                            normalizeId(
                              person?.id
                            );

                          const selected =
                            formData.attendee_ids
                              .map(
                                (participantId) =>
                                  normalizeId(
                                    participantId
                                  )
                              )
                              .includes(
                                personId
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
                                isPending
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
                                  {person.role ===
                                    'admin'
                                    ? 'Yönetici'
                                    : person.role ===
                                        'lawyer'
                                      ? 'Avukat'
                                      : person.role ===
                                          'intern'
                                        ? 'Stajyer'
                                        : person.role ===
                                            'secretary'
                                          ? 'Sekreter'
                                          : person.role ||
                                            'Kullanıcı'}
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

              </div>
            ) : (
              <div className="space-y-2">

                {selectedParticipantUsers.length >
                  0 ? (
                  selectedParticipantUsers.map(
                    (
                      person
                    ) => (
                      <div
                        key={
                          normalizeId(
                            person?.id
                          )
                        }
                        className="
                          flex
                          items-center
                          justify-between
                          gap-3
                          rounded-xl
                          border
                          border-gray-100
                          bg-gray-50
                          p-3
                          dark:border-white/[0.06]
                          dark:bg-white/[0.025]
                        "
                      >

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-500/[0.1] dark:text-blue-400">
                            {person?.first_name?.[0] ||
                              ''}
                            {person?.last_name?.[0] ||
                              ''}
                          </div>

                          <div className="min-w-0">

                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                              {person?.first_name}{' '}
                              {person?.last_name}
                            </p>

                            <p className="mt-0.5 text-xs text-gray-400">
                              Toplantı katılımcısı
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
                    )
                  )
                ) : (
                  <div className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-slate-400">
                    Atanmış kullanıcı bulunamadı.
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  Katılımcı ataması yalnızca yönetici tarafından değiştirilebilir.
                </p>

              </div>
            )}

          </div>

          {/* EXTERNAL ATTENDEES */}

          <div>

            <div className="mb-2 flex items-center gap-2">

              <UsersRound className="h-4 w-4 text-emerald-600" />

              <div>

                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Harici Katılımcılar
                </label>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Derkenar kullanıcısı olmayan kişileri isteğe bağlı ekleyin
                </p>

              </div>

            </div>

            <div className="flex flex-col gap-2 sm:flex-row">

              <input
                type="text"
                value={
                  attendeeName
                }
                onChange={(event) =>
                  setAttendeeName(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    event.preventDefault();

                    handleAddAttendee();
                  }
                }}
                placeholder="Katılımcı adı"
                className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />

              <input
                type="text"
                value={
                  attendeeRole
                }
                onChange={(event) =>
                  setAttendeeRole(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    event.preventDefault();

                    handleAddAttendee();
                  }
                }}
                placeholder="Rol"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:w-40"
              />

              <Button
                type="button"
                variant="secondary"
                onClick={
                  handleAddAttendee
                }
              >
                <Plus className="mr-1 h-4 w-4" />

                Ekle
              </Button>

            </div>

            {formData.attendees.length >
              0 && (
              <div className="mt-3 flex flex-wrap gap-2">

                {formData.attendees.map(
                  (
                    attendee,
                    index
                  ) => {
                    const name =
                      typeof attendee ===
                      'string'
                        ? attendee
                        : attendee?.name;

                    const role =
                      typeof attendee ===
                      'object'
                        ? attendee?.role
                        : null;

                    return (
                      <span
                        key={`${name}-${index}`}
                        className="
                          inline-flex
                          items-center
                          gap-2
                          rounded-full
                          bg-gray-100
                          px-3
                          py-1.5
                          text-sm
                          text-gray-700
                          dark:bg-gray-700
                          dark:text-gray-200
                        "
                      >

                        <span>
                          {name ||
                            'Katılımcı'}

                          {role &&
                            ` · ${role}`}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveAttendee(
                              index
                            )
                          }
                          className="text-gray-400 transition hover:text-red-500"
                          aria-label="Katılımcıyı kaldır"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>

                      </span>
                    );
                  }
                )}

              </div>
            )}

          </div>

          {/* NOTES */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notlar
            </label>

            <textarea
              name="notes"
              value={
                formData.notes
              }
              onChange={
                handleChange
              }
              rows="4"
              disabled={
                updateMutation.isPending
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Toplantıyla ilgili iç notlar..."
            />

          </div>

          {/* WARNING */}

          {formData.status ===
            'cancelled' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">

              <div className="flex items-start gap-3">

                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <p className="text-sm leading-6 text-red-800 dark:text-red-300">
                  Toplantı iptal durumunda. Kaydettiğinizde takvim ve ilgili ekranlarda iptal edilmiş olarak görünecektir.
                </p>

              </div>

            </div>
          )}

          {/* ACTIONS */}

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">

            {canEdit && (
              <Button
                type="submit"
                loading={
                  updateMutation.isPending
                }
                disabled={
                  updateMutation.isPending ||
                  deleteMutation.isPending ||
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
              onClick={() =>
                requestExit(
                  `/meetings/${id}`
                )
              }
              disabled={
                updateMutation.isPending ||
                deleteMutation.isPending
              }
            >
              Vazgeç
            </Button>

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
                  updateMutation.isPending ||
                  deleteMutation.isPending
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />

                Toplantıyı Sil
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
            aria-label="Kaydedilmemiş değişiklikler penceresini kapat"
            disabled={isPending}
            onClick={
              handleCloseLeaveDialog
            }
          />

          <div
            ref={leaveDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="meeting-leave-dialog-title"
            aria-describedby="meeting-leave-dialog-description"
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
                    id="meeting-leave-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Düzenleme ekranından çıkılsın mı?
                  </h2>

                  <p
                    id="meeting-leave-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    Toplantı üzerinde yaptığınız değişiklikler henüz kaydedilmedi. Çıkarsanız bu değişiklikler kaybolacaktır.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.07]">
                <p className="text-sm leading-6 text-amber-900 dark:text-amber-200">
                  Düzenlemeye devam ederek bilgileri kaydedebilir veya değişiklikleri atarak toplantı detayına dönebilirsiniz.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.015] sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={
                  handleCloseLeaveDialog
                }
              >
                Düzenlemeye Devam Et
              </Button>

              <Button
                type="button"
                variant="danger"
                disabled={isPending}
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
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="meeting-delete-dialog-title"
            aria-describedby="meeting-delete-dialog-description"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]"
          >
            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/[0.10] dark:text-red-400">
                  <Trash2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">

                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                    Toplantı silme onayı
                  </p>

                  <h2
                    id="meeting-delete-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Toplantı kaydını sil
                  </h2>

                  <p
                    id="meeting-delete-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    <span className="font-medium text-gray-700 dark:text-slate-200">
                      {meeting?.title ||
                        'Seçili toplantı'}
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
                      Toplantı kaydı silinecek
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-900/80 dark:text-red-200/80">
                      Bu toplantı takvimden ve ilgili toplantı listelerinden kaldırılacaktır.
                    </p>

                  </div>

                </div>

              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">

                <p className="text-sm leading-6 text-gray-600 dark:text-slate-300">
                  Devam etmeden önce doğru toplantı kaydını seçtiğinizden emin olun. Silme işlemi yalnızca yetkili kullanıcı tarafından onaylanmalıdır.
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

                Toplantıyı Sil
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default MeetingEdit;