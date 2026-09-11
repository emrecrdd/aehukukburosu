import {
  useMemo,
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
import auditLogApi from '../../features/audit-log/auditLog.api.js';

import {
  useConsultation,
  useConsultationDocuments,
  useConsultationMeetings,
  useConsultationNotes,
  useConsultationTasks,
  useAddConsultationNote,
  useConvertConsultationToCase,
  useConvertConsultationToClient,
  useUpdateConsultationStatus,
} from '../../features/consultations/consultation.query.js';

import {
  CONSULTATION_PRIORITY_OPTIONS,
  CONSULTATION_STATUS_OPTIONS,
  formatConsultationMoney,
  getConsultationBillingTypeLabel,
  getConsultationModeLabel,
  getConsultationPriorityLabel,
  getConsultationPriorityVariant,
  getConsultationServiceModelLabel,
  getConsultationSourceLabel,
  getConsultationStatusLabel,
  getConsultationStatusVariant,
  getConsultationTypeLabel,
} from '../../features/consultations/consultation.constants.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';
import FinanceContextSummary from '../../components/finance/FinanceContextSummary.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit2,
  FileText,
  FolderOpen,
  ListTodo,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  Scale,
  UserRound,
  Users,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const TABS = [
  {
    key:
      'overview',

    label:
      'Genel Bakış',
  },
  {
    key:
      'meetings',

    label:
      'Görüşmeler',
  },
  {
    key:
      'tasks',

    label:
      'Görevler',
  },
  {
    key:
      'documents',

    label:
      'Belgeler',
  },
  {
    key:
      'activity',

    label:
      'Aktivite',
  },
];

const MANUAL_STATUS_OPTIONS =
  CONSULTATION_STATUS_OPTIONS.filter(
    (
      option
    ) =>
      option.value !==
      'converted_to_case'
  );

const CLIENT_TYPE_OPTIONS = [
  {
    value:
      'individual',

    label:
      'Bireysel',
  },
  {
    value:
      'corporate',

    label:
      'Kurumsal',
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

const getResponseItem = (
  response
) => {
  return (
    response?.data?.data ??
    response?.data ??
    null
  );
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

const getSortedAssignees = (
  consultation
) => {
  const assignees =
    Array.isArray(
      consultation
        ?.assignees
    )
      ? consultation.assignees
      : [];

  return [
    ...assignees,
  ].sort(
    (
      first,
      second
    ) =>
      Number(
        isPrimaryAssignee(
          second
        )
      ) -
      Number(
        isPrimaryAssignee(
          first
        )
      )
  );
};

const formatDateTime = (
  value
) => {
  if (
    !value
  ) {
    return '-';
  }

  try {
    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      'tr-TR',
      {
        timeZone:
          'Europe/Istanbul',

        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit',

        hour12:
          false,
      }
    ).format(
      date
    );
  } catch {
    return '-';
  }
};

const formatDate = (
  value
) => {
  if (
    !value
  ) {
    return '-';
  }

  try {
    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      'tr-TR',
      {
        timeZone:
          'Europe/Istanbul',

        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',
      }
    ).format(
      date
    );
  } catch {
    return '-';
  }
};

const getAuditActionLabel = (
  action
) => {
  const labels = {
    create:
      'Oluşturuldu',

    update:
      'Güncellendi',

    delete:
      'Silindi',

    view:
      'Görüntülendi',
  };

  return (
    labels[action] ||
    action ||
    'İşlem'
  );
};

const getAuditActionVariant = (
  action
) => {
  const variants = {
    create:
      'success',

    update:
      'warning',

    delete:
      'danger',

    view:
      'info',
  };

  return (
    variants[action] ||
    'default'
  );
};

const getAuditUserName = (
  log
) => {
  const fullName = [
    log?.user?.first_name,
    log?.user?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    fullName ||
    log?.user?.email ||
    'Sistem'
  );
};

const getApiErrorMessage = (
  error,
  fallback
) => {
  const message =
    error?.response
      ?.data?.message ||
    error?.message ||
    '';

  if (
    error?.response
      ?.status ===
    401
  ) {
    return 'Oturumunuz sona ermiş olabilir. Lütfen yeniden giriş yapın.';
  }

  if (
    error?.response
      ?.status ===
    403
  ) {
    return 'Bu işlem için yetkiniz bulunmuyor.';
  }

  if (
    error?.response
      ?.status ===
    404
  ) {
    return 'Danışmanlık kaydı bulunamadı veya bu kayda erişiminiz yok.';
  }

  return (
    message ||
    fallback
  );
};

const getTaskStatusLabel = (
  status
) => {
  const labels = {
    pending:
      'Bekliyor',

    in_progress:
      'Devam Ediyor',

    completed:
      'Tamamlandı',

    cancelled:
      'İptal',

    approved:
      'Onaylandı',
  };

  return (
    labels[
      status
    ] ||
    status ||
    '-'
  );
};

const getTaskStatusVariant = (
  status
) => {
  const variants = {
    pending:
      'warning',

    in_progress:
      'info',

    completed:
      'success',

    cancelled:
      'danger',

    approved:
      'success',
  };

  return (
    variants[
      status
    ] ||
    'default'
  );
};

const getMeetingStatusLabel = (
  status
) => {
  const labels = {
    scheduled:
      'Planlandı',

    ongoing:
      'Devam Ediyor',

    completed:
      'Tamamlandı',

    cancelled:
      'İptal',
  };

  return (
    labels[
      status
    ] ||
    status ||
    '-'
  );
};

const getMeetingStatusVariant = (
  status
) => {
  const variants = {
    scheduled:
      'warning',

    ongoing:
      'info',

    completed:
      'success',

    cancelled:
      'danger',
  };

  return (
    variants[
      status
    ] ||
    'default'
  );
};

const getDocumentName = (
  document
) => {
  return (
    document?.name ||
    document?.original_name ||
    document?.filename ||
    'Belge'
  );
};

const getDocumentSize = (
  document
) => {
  const bytes =
    Number(
      document?.file_size ||
      document?.size ||
      0
    );

  if (
    !Number.isFinite(
      bytes
    ) ||
    bytes <=
      0
  ) {
    return null;
  }

  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(
      1
    )} KB`;
  }

  return `${(
    bytes /
    (
      1024 *
      1024
    )
  ).toFixed(
    1
  )} MB`;
};

const getNextMeeting = (
  meetings
) => {
  const now =
    Date.now();

  return [
    ...meetings,
  ]
    .filter(
      (
        meeting
      ) => {
        if (
          !meeting
            ?.start_date
        ) {
          return false;
        }

        const date =
          new Date(
            meeting.start_date
          );

        return (
          !Number.isNaN(
            date.getTime()
          ) &&
          date.getTime() >=
            now &&
          meeting.status !==
            'cancelled'
        );
      }
    )
    .sort(
      (
        first,
        second
      ) =>
        new Date(
          first.start_date
        ).getTime() -
        new Date(
          second.start_date
        ).getTime()
    )[
      0
    ] ||
    null;
};

const getActiveTasks = (
  tasks
) => {
  return tasks.filter(
    (
      task
    ) =>
      ![
        'completed',
        'cancelled',
        'approved',
      ].includes(
        task?.status
      )
  );
};

const getIstanbulTodayDateInput = (
  date = new Date()
) => {
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
      date
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

const isFutureDateInput = (
  value
) => {
  const normalized =
    String(
      value ||
      ''
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
    getIstanbulTodayDateInput()
  );
};

const getConvertedCaseId = (
  consultation
) => {
  return normalizeId(
    consultation
      ?.converted_case_id ??
    consultation
      ?.convertedCase
      ?.id
  );
};

// ======================================================
// MODAL
// ======================================================

const ActionModal = ({
  open,
  title,
  description,
  children,
  onClose,
  footer,
}) => {
  if (
    !open
  ) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

      <button
        type="button"
        aria-label="Pencereyi kapat"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        onClick={
          onClose
        }
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-slate-900">

        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-white/[0.06]">

          <div>

            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}

          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.06] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

        </div>

        <div className="space-y-4 px-5 py-5">
          {children}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 dark:border-white/[0.06] sm:flex-row sm:justify-end">
          {footer}
        </div>

      </div>

    </div>
  );
};

// ======================================================
// COMPONENT
// ======================================================

const ConsultationDetail = () => {
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
    activeTab,
    setActiveTab,
  ] =
    useState(
      'overview'
    );

  const [
    clientModalOpen,
    setClientModalOpen,
  ] =
    useState(
      false
    );

  const [
    caseModalOpen,
    setCaseModalOpen,
  ] =
    useState(
      false
    );

  const [
    clientForm,
    setClientForm,
  ] =
    useState({
      name:
        '',

      client_type:
        'individual',

      email:
        '',

      phone:
        '',
    });

  const [
    caseForm,
    setCaseForm,
  ] =
    useState({
      judiciary_type:
        '',

      judiciary_unit:
        '',

      court_name:
        '',

      case_number:
        '',

      subject:
        '',

      description:
        '',

      priority:
        'normal',

      assigned_to:
        '',

      opening_date:
        '',
    });

  const [
    conversionErrors,
    setConversionErrors,
  ] =
    useState({});

  const [
    noteContent,
    setNoteContent,
  ] =
    useState('');

  // ====================================================
  // PERMISSIONS
  // ====================================================

  const canEditConsultation =
    hasPermission(
      user,
      PERMISSION_KEYS
        .EDIT_CONSULTATIONS
    );

  const canConvertConsultation =
    hasPermission(
      user,
      PERMISSION_KEYS
        .CONVERT_CONSULTATIONS
    );

  const canCreateClients =
    hasPermission(
      user,
      PERMISSION_KEYS
        .CREATE_CLIENTS
    );

  const canCreateCases =
    hasPermission(
      user,
      PERMISSION_KEYS
        .CREATE_CASES
    );

  const canViewClients =
    hasPermission(
      user,
      PERMISSION_KEYS
        .VIEW_CLIENTS
    );

  const canViewTasks =
    hasPermission(
      user,
      PERMISSION_KEYS
        .VIEW_TASKS
    );

  const canCreateTasks =
    hasPermission(
      user,
      PERMISSION_KEYS
        .CREATE_TASKS
    );

  const canViewMeetings =
    hasPermission(
      user,
      PERMISSION_KEYS
        .VIEW_MEETINGS
    );

  const canCreateMeetings =
    hasPermission(
      user,
      PERMISSION_KEYS
        .CREATE_MEETINGS
    );

  const canViewDocuments =
    hasPermission(
      user,
      PERMISSION_KEYS
        .VIEW_DOCUMENTS
    );

  const canUploadDocuments =
    hasPermission(
      user,
      PERMISSION_KEYS
        .UPLOAD_DOCUMENTS
    );

  const canViewNotes =
    hasPermission(
      user,
      PERMISSION_KEYS
        .VIEW_NOTES
    );

  const canCreateNotes =
    hasPermission(
      user,
      PERMISSION_KEYS
        .CREATE_NOTES
    );

  const canViewAuditLogs =
    hasPermission(
      user,
      PERMISSION_KEYS
        .VIEW_AUDIT_LOGS
    );

  const canViewFinance =
    hasPermission(
      user,
      PERMISSION_KEYS
        .VIEW_FINANCE
    );

  // ====================================================
  // QUERIES
  // ====================================================

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

  const consultation =
    getResponseItem(
      consultationData
    );

  const {
    data:
      tasksData,
    isLoading:
      tasksLoading,
    error:
      tasksError,
  } =
    useConsultationTasks(
      canViewTasks
        ? id
        : null
    );

  const {
    data:
      meetingsData,
    isLoading:
      meetingsLoading,
    error:
      meetingsError,
  } =
    useConsultationMeetings(
      canViewMeetings
        ? id
        : null
    );

  const {
    data:
      documentsData,
    isLoading:
      documentsLoading,
    error:
      documentsError,
  } =
    useConsultationDocuments(
      canViewDocuments
        ? id
        : null
    );

  const {
    data:
      notesData,
    isLoading:
      notesLoading,
    error:
      notesError,
  } =
    useConsultationNotes(
      activeTab ===
        'notes' &&
      canViewNotes
        ? id
        : null
    );

  const {
    data:
      activityData,
    isLoading:
      activityLoading,
    isFetching:
      activityFetching,
    error:
      activityError,
    refetch:
      refetchActivity,
  } =
    useQuery({
      queryKey: [
        'consultation-audit-logs',
        id,
      ],

      queryFn: () =>
        auditLogApi.getAll({
          entity_type:
            'consultation',

          entity_id:
            id,

          page:
            1,

          limit:
            50,
        }),

      enabled:
        Boolean(
          activeTab ===
            'activity' &&
          canViewAuditLogs &&
          id
        ),

      staleTime:
        0,

      refetchOnMount:
        'always',
    });

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
        'consultation-convert',
      ],

      queryFn: () =>
        caseApi
          .getAssignableLawyers(),

      enabled:
        Boolean(
          consultation
            ?.client_id &&
          canConvertConsultation &&
          canCreateCases &&
          !getConvertedCaseId(
            consultation
          )
        ),
    });

  // ====================================================
  // DATA
  // ====================================================

  const tasks =
    getArrayPayload(
      tasksData
    );

  const meetings =
    getArrayPayload(
      meetingsData
    );

  const documents =
    getArrayPayload(
      documentsData
    );

  const notes =
    getArrayPayload(
      notesData
    );

  const activityLogs =
    getArrayPayload(
      activityData
    );

  const baseLawyers =
    getArrayPayload(
      lawyersData
    );

  const currentUserId =
    normalizeId(
      user?.id
    );

  const caseAssignableLawyers =
    currentUserId &&
    !baseLawyers.some(
      (
        lawyer
      ) =>
        normalizeId(
          lawyer?.id
        ) ===
        currentUserId
    ) &&
    [
      'admin',
      'lawyer',
    ].includes(
      user?.role
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
          ...baseLawyers,
        ]
      : baseLawyers;

  const assignees =
    getSortedAssignees(
      consultation
    );

  const primaryAssignee =
    assignees.find(
      isPrimaryAssignee
    ) ||
    assignees[
      0
    ] ||
    null;

  const nextMeeting =
    getNextMeeting(
      meetings
    );

  const activeTasks =
    getActiveTasks(
      tasks
    );

  const convertedCaseId =
    getConvertedCaseId(
      consultation
    );

  const createTaskUrl =
    consultation
      ?.id
      ? `/tasks/create?consultation_id=${encodeURIComponent(
          consultation.id
        )}${
          consultation.client_id
            ? `&client_id=${encodeURIComponent(
                consultation.client_id
              )}`
            : ''
        }`
      : '/tasks/create';

  const createMeetingUrl =
    consultation
      ?.id
      ? `/meetings/create?consultation_id=${encodeURIComponent(
          consultation.id
        )}${
          consultation.client_id
            ? `&client_id=${encodeURIComponent(
                consultation.client_id
              )}`
            : ''
        }`
      : '/meetings/create';

  const createDocumentUrl =
    consultation
      ?.id
      ? `/documents/upload?consultation_id=${encodeURIComponent(
          consultation.id
        )}`
      : '/documents/upload';

  const partyName =
    consultation
      ?.client
      ?.name ||
    consultation
      ?.prospect_name ||
    'Talep sahibi belirtilmemiş';

  const canConvertToClient =
    Boolean(
      canConvertConsultation &&
      canCreateClients &&
      !consultation
        ?.client_id &&
      !convertedCaseId
    );

  const canConvertToCase =
    Boolean(
      canConvertConsultation &&
      canCreateCases &&
      consultation
        ?.client_id &&
      !convertedCaseId &&
      consultation
        ?.status !==
        'converted_to_case'
    );

  const visibleTabs =
    useMemo(
      () =>
        TABS.filter(
          (
            tab
          ) => {
            if (
              tab.key ===
              'meetings'
            ) {
              return canViewMeetings;
            }

            if (
              tab.key ===
              'tasks'
            ) {
              return canViewTasks;
            }

            if (
              tab.key ===
              'documents'
            ) {
              return canViewDocuments;
            }

            if (
              tab.key ===
              'notes'
            ) {
              return canViewNotes;
            }

            if (
              tab.key ===
              'activity'
            ) {
              return canViewAuditLogs;
            }

            return true;
          }
        ),
      [
        canViewAuditLogs,
        canViewDocuments,
        canViewMeetings,
        canViewNotes,
        canViewTasks,
      ]
    );

  // ====================================================
  // MUTATIONS
  // ====================================================

  const statusMutation =
    useUpdateConsultationStatus();

  const convertClientMutation =
    useConvertConsultationToClient();

  const convertCaseMutation =
    useConvertConsultationToCase();

  const addNoteMutation =
    useAddConsultationNote();

  // ====================================================
  // STATUS
  // ====================================================

  const handleStatusChange =
    (
      event
    ) => {
      const status =
        event.target.value;

      if (
        !canEditConsultation ||
        statusMutation.isPending ||
        status ===
          consultation
            ?.status
      ) {
        return;
      }

      statusMutation.mutate({
        id,
        status,
      });
    };

  // ====================================================
  // NOTES
  // ====================================================

  const handleAddNote =
    () => {
      if (
        !canCreateNotes ||
        addNoteMutation.isPending
      ) {
        return;
      }

      const content =
        String(
          noteContent ||
          ''
        ).trim();

      if (
        !content
      ) {
        toast.error(
          'Not içeriği gereklidir'
        );

        return;
      }

      addNoteMutation.mutate(
        {
          id,
          data: {
            content,
          },
        },
        {
          onSuccess: () => {
            setNoteContent(
              ''
            );
          },
        }
      );
    };

  // ====================================================
  // CONVERT TO CLIENT
  // ====================================================

  const openClientModal =
    () => {
      if (
        !canConvertToClient
      ) {
        return;
      }

      setConversionErrors(
        {}
      );

      setClientForm({
        name:
          consultation
            ?.prospect_name ||
          '',

        client_type:
          'individual',

        email:
          consultation
            ?.prospect_email ||
          '',

        phone:
          consultation
            ?.prospect_phone ||
          '',
      });

      setClientModalOpen(
        true
      );
    };

  const handleClientFormChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } =
        event.target;

      setClientForm(
        (
          current
        ) => ({
          ...current,

          [
            name
          ]:
            value,
        })
      );

      if (
        conversionErrors[
          name
        ]
      ) {
        setConversionErrors(
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
      }
    };

  const handleConvertToClient =
    () => {
      const nextErrors =
        {};

      const name =
        String(
          clientForm.name ||
          ''
        ).trim();

      const email =
        String(
          clientForm.email ||
          ''
        ).trim();

      const phone =
        String(
          clientForm.phone ||
          ''
        ).trim();

      if (
        name.length <
        2
      ) {
        nextErrors.name =
          'Müvekkil adı en az 2 karakter olmalıdır';
      }

      if (
        email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        nextErrors.email =
          'Geçerli bir e-posta adresi girin';
      }

      if (
        Object.keys(
          nextErrors
        ).length >
        0
      ) {
        setConversionErrors(
          nextErrors
        );

        return;
      }

      convertClientMutation.mutate(
        {
          id,

          data: {
            name,

            client_type:
              clientForm.client_type,

            email:
              email ||
              null,

            phone:
              phone ||
              null,
          },
        },
        {
          onSuccess:
            () => {
              setClientModalOpen(
                false
              );

              setConversionErrors(
                {}
              );
            },
        }
      );
    };

  // ====================================================
  // CONVERT TO CASE
  // ====================================================

  const openCaseModal =
    () => {
      if (
        !canConvertToCase
      ) {
        return;
      }

      setConversionErrors(
        {}
      );

      setCaseForm({
        judiciary_type:
          '',

        judiciary_unit:
          '',

        court_name:
          '',

        case_number:
          '',

        subject:
          consultation
            ?.title ||
          '',

        description:
          consultation
            ?.description ||
          '',

        priority:
          consultation
            ?.priority ||
          'normal',

        assigned_to:
          normalizeId(
            primaryAssignee
              ?.id
          ),

        opening_date:
          '',
      });

      setCaseModalOpen(
        true
      );
    };

  const handleCaseFormChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } =
        event.target;

      setCaseForm(
        (
          current
        ) => ({
          ...current,

          [
            name
          ]:
            value,
        })
      );

      if (
        conversionErrors[
          name
        ]
      ) {
        setConversionErrors(
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
      }
    };

  const handleConvertToCase =
    () => {
      const nextErrors =
        {};

      const assignedTo =
        normalizeId(
          caseForm.assigned_to
        );

      const judiciaryType =
        String(
          caseForm.judiciary_type ||
          ''
        ).trim();

      const judiciaryUnit =
        String(
          caseForm.judiciary_unit ||
          ''
        ).trim();

      const courtName =
        String(
          caseForm.court_name ||
          ''
        ).trim();

      const caseNumber =
        String(
          caseForm.case_number ||
          ''
        ).trim();

      const subject =
        String(
          caseForm.subject ||
          ''
        ).trim();

      const description =
        String(
          caseForm.description ||
          ''
        ).trim();

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

      if (
        !courtName
      ) {
        nextErrors.court_name =
          'Mahkeme adı gereklidir';
      } else if (
        courtName.length >
        200
      ) {
        nextErrors.court_name =
          'Mahkeme adı en fazla 200 karakter olabilir';
      }

      if (
        !caseNumber
      ) {
        nextErrors.case_number =
          'Dosya / esas numarası gereklidir';
      } else if (
        caseNumber.length >
        100
      ) {
        nextErrors.case_number =
          'Dosya / esas numarası en fazla 100 karakter olabilir';
      }

      if (
        subject.length >
        255
      ) {
        nextErrors.subject =
          'Dava konusu en fazla 255 karakter olabilir';
      }

      if (
        description.length >
        5000
      ) {
        nextErrors.description =
          'Açıklama en fazla 5000 karakter olabilir';
      }

      if (
        caseForm.opening_date &&
        isFutureDateInput(
          caseForm.opening_date
        )
      ) {
        nextErrors.opening_date =
          'Dava açılış tarihi bugünden ileri bir tarih olamaz';
      }

      if (
        !assignedTo
      ) {
        nextErrors.assigned_to =
          'Davaya atanacak avukat seçilmelidir';
      } else if (
        !caseAssignableLawyers.some(
          (
            lawyer
          ) =>
            normalizeId(
              lawyer?.id
            ) ===
            assignedTo
        )
      ) {
        nextErrors.assigned_to =
          'Seçilen avukat artık atanabilir değil';
      }

      if (
        !CONSULTATION_PRIORITY_OPTIONS.some(
          (
            option
          ) =>
            option.value ===
            caseForm.priority
        )
      ) {
        nextErrors.priority =
          'Geçerli bir öncelik seçin';
      }

      if (
        Object.keys(
          nextErrors
        ).length >
        0
      ) {
        setConversionErrors(
          nextErrors
        );

        return;
      }

      convertCaseMutation.mutate(
        {
          id,

          data: {
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

            priority:
              caseForm.priority,

            assigned_to:
              assignedTo,

            opening_date:
              caseForm.opening_date ||
              null,
          },
        },
        {
          onSuccess:
            (
              response
            ) => {
              setCaseModalOpen(
                false
              );

              setConversionErrors(
                {}
              );

              const payload =
                getResponseItem(
                  response
                );

              const caseId =
                normalizeId(
                  payload
                    ?.case_id ??
                  payload
                    ?.consultation
                    ?.converted_case_id
                );

              if (
                caseId
              ) {
                navigate(
                  `/cases/${caseId}`
                );
              }
            },
        }
      );
    };

  // ====================================================
  // LOADING / ERROR
  // ====================================================

  if (
    consultationLoading
  ) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600 dark:border-gray-700 dark:border-b-blue-400" />

          <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">
            Danışmanlık dosyası yükleniyor...
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
      <div className="py-14 text-center">

        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />

        <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
          Danışmanlık dosyası açılamadı
        </h2>

        <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500 dark:text-slate-400">
          {getApiErrorMessage(
            consultationError,
            'Danışmanlık kaydı bulunamadı veya bu kaydı görüntüleme yetkiniz bulunmuyor.'
          )}
        </p>

        <Link
          to="/consultations"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Danışmanlıklara Dön
        </Link>

      </div>
    );
  }

  // ====================================================
  // TAB HELPERS
  // ====================================================

  const relationErrorMessage =
    (
      error,
      fallback
    ) => {
      if (
        !error
      ) {
        return null;
      }

      return getApiErrorMessage(
        error,
        fallback
      );
    };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div>

        <Link
          to="/consultations"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Danışmanlıklar
        </Link>

        <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">

          <div className="flex min-w-0 items-start gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
              <BriefcaseBusiness size={22} />
            </div>

            <div className="min-w-0">

              <p className="font-mono text-xs font-semibold tracking-wide text-blue-600 dark:text-blue-400">
                {consultation.consultation_number ||
                  'Danışmanlık'}
              </p>

              <h1 className="mt-1 truncate text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
                {consultation.title ||
                  'Danışmanlık Dosyası'}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">

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

                <Badge
                  variant={
                    getConsultationPriorityVariant(
                      consultation.priority
                    )
                  }
                >
                  {getConsultationPriorityLabel(
                    consultation.priority
                  )}
                </Badge>

                {consultation.service_model && (
                  <Badge variant="default">
                    {getConsultationServiceModelLabel(
                      consultation.service_model
                    )}
                  </Badge>
                )}

              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-slate-400">

                <span>
                  {partyName}
                </span>

                <span>
                  {consultation.legal_area ||
                    'Hukuk alanı belirtilmemiş'}
                </span>

                <span>
                  {primaryAssignee
                    ? `${getFullName(
                        primaryAssignee
                      )}${
                        assignees.length >
                        1
                          ? ` +${assignees.length - 1}`
                          : ''
                      }`
                    : 'Sorumlu belirtilmemiş'}
                </span>

                <span>
                  {formatDate(
                    consultation.opened_at ||
                    consultation.created_at
                  )}
                </span>

              </div>

            </div>

          </div>

          <div className="flex flex-wrap items-center gap-2">

            {canEditConsultation &&
              consultation.status !==
                'converted_to_case' && (
              <div>

                <select
                  value={
                    consultation.status
                  }
                  onChange={
                    handleStatusChange
                  }
                  disabled={
                    statusMutation.isPending
                  }
                  className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
                >
                  {MANUAL_STATUS_OPTIONS.map(
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
            )}

            {canEditConsultation && (
              <Link
                to={`/consultations/${consultation.id}/edit`}
              >
                <Button
                  variant="outline"
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Düzenle
                </Button>
              </Link>
            )}

          </div>

        </div>

      </div>

      {/* ==================================================
          TABS
      ================================================== */}

      <div className="overflow-x-auto border-b border-gray-200 dark:border-white/[0.07]">

        <div className="flex min-w-max gap-6">

          {visibleTabs.map(
            (
              tab
            ) => (
              <button
                key={
                  tab.key
                }
                type="button"
                onClick={() =>
                  setActiveTab(
                    tab.key
                  )
                }
                className={`border-b-2 px-0.5 pb-3 text-sm font-medium transition ${
                  activeTab ===
                  tab.key
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            )
          )}

        </div>

      </div>

      {canViewFinance && (
        <FinanceContextSummary type="consultation" id={id} title="Danışmanlık Finans Özeti" />
      )}

      {/* ==================================================
          OVERVIEW
      ================================================== */}

      {activeTab ===
        'overview' && (
        <div className="space-y-6">

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">

            <div className="space-y-6">

              {/* CONSULTATION INFO */}

              <Card>

                <Card.Header>

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
                      <Scale size={17} />
                    </div>

                    <div>

                      <h2 className="font-semibold text-gray-900 dark:text-white">
                        Danışmanlık Bilgileri
                      </h2>

                      <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                        Talebin kapsamı ve hizmet modeli
                      </p>

                    </div>

                  </div>

                </Card.Header>

                <Card.Body>

                  <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

                    <div className="grid gap-2 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">

                      <span className="text-sm text-gray-500">
                        Danışmanlık Türü
                      </span>

                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getConsultationTypeLabel(
                          consultation.consultation_type
                        )}
                      </span>

                    </div>

                    <div className="grid gap-2 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">

                      <span className="text-sm text-gray-500">
                        Hukuk Alanı
                      </span>

                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {consultation.legal_area ||
                          '-'}
                      </span>

                    </div>

                    <div className="grid gap-2 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">

                      <span className="text-sm text-gray-500">
                        Hizmet Modeli
                      </span>

                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getConsultationServiceModelLabel(
                          consultation.service_model
                        )}
                      </span>

                    </div>

                    <div className="grid gap-2 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">

                      <span className="text-sm text-gray-500">
                        Görüşme Şekli
                      </span>

                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getConsultationModeLabel(
                          consultation.consultation_mode
                        )}
                      </span>

                    </div>

                    <div className="grid gap-2 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">

                      <span className="text-sm text-gray-500">
                        Talep Kaynağı
                      </span>

                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getConsultationSourceLabel(
                          consultation.source
                        )}
                      </span>

                    </div>

                    <div className="grid gap-2 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">

                      <span className="text-sm text-gray-500">
                        Açılış
                      </span>

                      <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                        <CalendarDays className="h-4 w-4 text-gray-400" />

                        {formatDateTime(
                          consultation.opened_at ||
                          consultation.created_at
                        )}
                      </span>

                    </div>

                    <div className="grid gap-2 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">

                      <span className="text-sm text-gray-500">
                        Son Güncelleme
                      </span>

                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDateTime(
                          consultation.updated_at
                        )}
                      </span>

                    </div>

                    {consultation.completed_at && (
                      <div className="grid gap-2 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">

                        <span className="text-sm text-gray-500">
                          Tamamlanma
                        </span>

                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDateTime(
                            consultation.completed_at
                          )}
                        </span>

                      </div>
                    )}

                  </div>

                </Card.Body>

              </Card>

              {/* CLIENT */}

              <Card>

                <Card.Header>

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400">
                      {consultation
                        ?.client ? (
                        <Building2 size={17} />
                      ) : (
                        <UserRound size={17} />
                      )}
                    </div>

                    <div>

                      <h2 className="font-semibold text-gray-900 dark:text-white">
                        Müvekkil / Talep Sahibi
                      </h2>

                      <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                        Danışmanlık kaydının ilişkili kişi bilgileri
                      </p>

                    </div>

                  </div>

                </Card.Header>

                <Card.Body>

                  {consultation.client ? (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div className="flex min-w-0 items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-white/[0.04] dark:text-slate-400">
                          <UserRound size={17} />
                        </div>

                        <div className="min-w-0">

                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {consultation.client.name}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-500">

                            {consultation.client.phone && (
                              <span className="inline-flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" />
                                {consultation.client.phone}
                              </span>
                            )}

                            {consultation.client.email && (
                              <span className="inline-flex min-w-0 items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" />
                                <span className="truncate">
                                  {consultation.client.email}
                                </span>
                              </span>
                            )}

                          </div>

                        </div>

                      </div>

                      {canViewClients && (
                        <Link
                          to={`/clients/${consultation.client.id}`}
                          className="text-xs font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400"
                        >
                          Müvekkili Görüntüle
                        </Link>
                      )}

                    </div>
                  ) : (
                    <div className="space-y-4">

                      <div className="flex min-w-0 items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-white/[0.04] dark:text-slate-400">
                          <UserRound size={17} />
                        </div>

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {consultation.prospect_name ||
                                'Talep sahibi'}
                            </p>

                            <Badge variant="warning">
                              Henüz Müvekkil Değil
                            </Badge>

                          </div>

                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-500">

                            {consultation.prospect_phone && (
                              <span className="inline-flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" />
                                {consultation.prospect_phone}
                              </span>
                            )}

                            {consultation.prospect_email && (
                              <span className="inline-flex min-w-0 items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" />
                                <span className="truncate">
                                  {consultation.prospect_email}
                                </span>
                              </span>
                            )}

                          </div>

                        </div>

                      </div>

                    </div>
                  )}

                </Card.Body>

              </Card>

              {/* ASSIGNEES */}

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
                        Danışmanlık dosyasına atanmış kullanıcılar
                      </p>

                    </div>

                  </div>

                </Card.Header>

                <Card.Body>

                  {assignees.length ===
                  0 ? (
                    <div className="py-8 text-center">

                      <Users className="mx-auto h-7 w-7 text-gray-300 dark:text-slate-600" />

                      <p className="mt-3 text-sm text-gray-500">
                        Sorumlu kullanıcı bulunmuyor.
                      </p>

                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">

                      {assignees.map(
                        (
                          assignee
                        ) => (
                          <div
                            key={
                              assignee.id
                            }
                            className="rounded-xl border border-gray-100 p-4 dark:border-white/[0.05]"
                          >

                            <div className="flex items-start gap-3">

                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/[0.04] dark:text-slate-400">
                                <UserRound size={16} />
                              </div>

                              <div className="min-w-0">

                                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                  {getFullName(
                                    assignee
                                  )}
                                  {normalizeId(
                                    assignee.id
                                  ) ===
                                  currentUserId
                                    ? ' (Ben)'
                                    : ''}
                                </p>

                                <div className="mt-2 flex flex-wrap gap-1.5">

                                  <Badge variant="default">
                                    {getRoleLabel(
                                      assignee.role
                                    )}
                                  </Badge>

                                  {isPrimaryAssignee(
                                    assignee
                                  ) && (
                                    <Badge variant="primary">
                                      Ana Sorumlu
                                    </Badge>
                                  )}

                                </div>

                              </div>

                            </div>

                          </div>
                        )
                      )}

                    </div>
                  )}

                </Card.Body>

              </Card>

              {/* DESCRIPTION */}

              {consultation.description && (
                <Card>

                  <Card.Header>

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400">
                        <FileText size={17} />
                      </div>

                      <div>

                        <h2 className="font-semibold text-gray-900 dark:text-white">
                          Açıklama
                        </h2>

                        <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                          Danışmanlık dosyasına girilmiş açıklamalar
                        </p>

                      </div>

                    </div>

                  </Card.Header>

                  <Card.Body>

                    <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-slate-300">
                      {consultation.description}
                    </p>

                  </Card.Body>

                </Card>
              )}

            </div>

            {/* RIGHT SIDE */}

            <div className="space-y-6">

              {/* FINANCE */}

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

                    </div>

                  </div>

                </Card.Header>

                <Card.Body>

                  <div className="space-y-4">

                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-600">
                        Ücretlendirme
                      </p>

                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                        {getConsultationBillingTypeLabel(
                          consultation.billing_type
                        )}
                      </p>

                    </div>

                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-600">
                        Kararlaştırılan Ücret
                      </p>

                      <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                        {consultation.billing_type ===
                        'free'
                          ? 'Ücretsiz'
                          : formatConsultationMoney(
                              consultation.agreed_fee,
                              consultation.currency
                            )}
                      </p>

                    </div>

                  </div>

                </Card.Body>

              </Card>

              {/* NEXT MEETING */}

              {canViewMeetings && (
                <Card>

                  <Card.Header>

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
                        <CalendarDays size={17} />
                      </div>

                      <div>

                        <h2 className="font-semibold text-gray-900 dark:text-white">
                          Sonraki Görüşme
                        </h2>

                      </div>

                    </div>

                  </Card.Header>

                  <Card.Body>

                    {meetingsLoading ? (
                      <p className="text-sm text-gray-500">
                        Görüşmeler yükleniyor...
                      </p>
                    ) : meetingsError ? (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {relationErrorMessage(
                          meetingsError,
                          'Görüşmeler yüklenemedi'
                        )}
                      </p>
                    ) : nextMeeting ? (
                      <Link
                        to={`/meetings/${nextMeeting.id}`}
                        className="block rounded-xl border border-gray-100 p-4 transition hover:border-blue-200 hover:bg-blue-50/20 dark:border-white/[0.05] dark:hover:border-blue-500/20"
                      >

                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {nextMeeting.title ||
                            'Görüşme'}
                        </p>

                        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDateTime(
                            nextMeeting.start_date
                          )}
                        </p>

                      </Link>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-slate-500">
                        Planlanmış gelecek görüşme bulunmuyor.
                      </p>
                    )}

                  </Card.Body>

                </Card>
              )}

              {/* ACTIVE TASKS */}

              {canViewTasks && (
                <Card>

                  <Card.Header>

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/[0.08] dark:text-violet-400">
                        <ListTodo size={17} />
                      </div>

                      <div>

                        <h2 className="font-semibold text-gray-900 dark:text-white">
                          Aktif Görevler
                        </h2>

                      </div>

                    </div>

                  </Card.Header>

                  <Card.Body>

                    {tasksLoading ? (
                      <p className="text-sm text-gray-500">
                        Görevler yükleniyor...
                      </p>
                    ) : tasksError ? (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {relationErrorMessage(
                          tasksError,
                          'Görevler yüklenemedi'
                        )}
                      </p>
                    ) : (
                      <div>

                        <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                          {activeTasks.length}
                        </p>

                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                          Tamamlanmamış görev
                        </p>

                      </div>
                    )}

                  </Card.Body>

                </Card>
              )}

              {/* DOCUMENTS */}

              {canViewDocuments && (
                <Card>

                  <Card.Header>

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400">
                        <FolderOpen size={17} />
                      </div>

                      <div>

                        <h2 className="font-semibold text-gray-900 dark:text-white">
                          Belgeler
                        </h2>

                      </div>

                    </div>

                  </Card.Header>

                  <Card.Body>

                    {documentsLoading ? (
                      <p className="text-sm text-gray-500">
                        Belgeler yükleniyor...
                      </p>
                    ) : documentsError ? (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {relationErrorMessage(
                          documentsError,
                          'Belgeler yüklenemedi'
                        )}
                      </p>
                    ) : (
                      <div>

                        <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                          {documents.length}
                        </p>

                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                          Danışmanlığa bağlı belge
                        </p>

                      </div>
                    )}

                  </Card.Body>

                </Card>
              )}

              {/* CONVERSION */}

              {(canConvertToClient ||
                canConvertToCase ||
                convertedCaseId) && (
                <Card>

                  <Card.Header>

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
                        <CheckCircle2 size={17} />
                      </div>

                      <div>

                        <h2 className="font-semibold text-gray-900 dark:text-white">
                          Dönüşüm
                        </h2>

                        <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                          Danışmanlık sonucunu kalıcı kayda dönüştürün
                        </p>

                      </div>

                    </div>

                  </Card.Header>

                  <Card.Body className="space-y-3">

                    {convertedCaseId ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]">

                        <Badge variant="success">
                          Davaya Dönüştürüldü
                        </Badge>

                        <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                          {consultation
                            ?.convertedCase
                            ?.case_number ||
                            consultation
                              ?.convertedCase
                              ?.title ||
                            'Bağlı dava'}
                        </p>

                        <Link
                          to={`/cases/${convertedCaseId}`}
                          className="mt-3 inline-flex text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Davayı Görüntüle
                        </Link>

                      </div>
                    ) : canConvertToClient ? (
                      <Button
                        type="button"
                        className="w-full justify-center"
                        onClick={
                          openClientModal
                        }
                      >
                        <UserRound className="mr-2 h-4 w-4" />
                        Müvekkile Dönüştür
                      </Button>
                    ) : canConvertToCase ? (
                      <Button
                        type="button"
                        className="w-full justify-center"
                        onClick={
                          openCaseModal
                        }
                      >
                        <BriefcaseBusiness className="mr-2 h-4 w-4" />
                        Davaya Dönüştür
                      </Button>
                    ) : null}

                  </Card.Body>

                </Card>
              )}

            </div>

          </div>

        </div>
      )}

      {/* ==================================================
          MEETINGS
      ================================================== */}

      {activeTab ===
        'meetings' &&
        canViewMeetings && (
        <Card>

          <Card.Header>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
                  <CalendarDays size={17} />
                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Görüşmeler
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    {meetings.length} kayıt
                  </p>

                </div>

              </div>

              {canCreateMeetings && (
                <Link
                  to={
                    createMeetingUrl
                  }
                >
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    Yeni Görüşme
                  </Button>
                </Link>
              )}

            </div>

          </Card.Header>

          <Card.Body>

            {meetingsLoading ? (
              <div className="py-10 text-center text-sm text-gray-500">
                Görüşmeler yükleniyor...
              </div>
            ) : meetingsError ? (
              <div className="py-10 text-center text-sm text-red-600 dark:text-red-400">
                {relationErrorMessage(
                  meetingsError,
                  'Görüşmeler yüklenemedi'
                )}
              </div>
            ) : meetings.length ===
              0 ? (
              <div className="py-10 text-center">

                <CalendarDays className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600" />

                <p className="mt-3 text-sm text-gray-500">
                  Bu danışmanlık için henüz görüşme bulunmuyor.
                </p>

              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">

                {meetings.map(
                  (
                    meeting
                  ) => (
                    <Link
                      key={
                        meeting.id
                      }
                      to={`/meetings/${meeting.id}`}
                      className="rounded-xl border border-gray-100 p-4 transition hover:border-blue-200 hover:bg-blue-50/20 dark:border-white/[0.05] dark:hover:border-blue-500/20 dark:hover:bg-blue-500/[0.02]"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {meeting.title ||
                              'Görüşme'}
                          </p>

                          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-500">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDateTime(
                              meeting.start_date
                            )}
                          </p>

                          {meeting.location && (
                            <p className="mt-1 truncate text-xs text-gray-400 dark:text-slate-600">
                              {meeting.location}
                            </p>
                          )}

                        </div>

                        <Badge
                          variant={
                            getMeetingStatusVariant(
                              meeting.status
                            )
                          }
                        >
                          {getMeetingStatusLabel(
                            meeting.status
                          )}
                        </Badge>

                      </div>

                    </Link>
                  )
                )}

              </div>
            )}

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          TASKS
      ================================================== */}

      {activeTab ===
        'tasks' &&
        canViewTasks && (
        <Card>

          <Card.Header>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/[0.08] dark:text-violet-400">
                  <ListTodo size={17} />
                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Görevler
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    {tasks.length} kayıt
                  </p>

                </div>

              </div>

              {canCreateTasks && (
                <Link
                  to={
                    createTaskUrl
                  }
                >
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    Yeni Görev
                  </Button>
                </Link>
              )}

            </div>

          </Card.Header>

          <Card.Body>

            {tasksLoading ? (
              <div className="py-10 text-center text-sm text-gray-500">
                Görevler yükleniyor...
              </div>
            ) : tasksError ? (
              <div className="py-10 text-center text-sm text-red-600 dark:text-red-400">
                {relationErrorMessage(
                  tasksError,
                  'Görevler yüklenemedi'
                )}
              </div>
            ) : tasks.length ===
              0 ? (
              <div className="py-10 text-center">

                <ListTodo className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600" />

                <p className="mt-3 text-sm text-gray-500">
                  Bu danışmanlık için henüz görev bulunmuyor.
                </p>

              </div>
            ) : (
              <div className="space-y-2">

                {tasks.map(
                  (
                    task
                  ) => (
                    <Link
                      key={
                        task.id
                      }
                      to={`/tasks/${task.id}`}
                      className="block rounded-xl border border-gray-100 p-4 transition hover:border-blue-200 dark:border-white/[0.05] dark:hover:border-blue-500/20"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {task.title ||
                              'Görev'}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-slate-500">

                            {task.assignee && (
                              <span>
                                {getFullName(
                                  task.assignee
                                )}
                              </span>
                            )}

                            {task.due_date && (
                              <span>
                                Son tarih: {formatDate(
                                  task.due_date
                                )}
                              </span>
                            )}

                          </div>

                        </div>

                        <Badge
                          variant={
                            getTaskStatusVariant(
                              task.status
                            )
                          }
                        >
                          {getTaskStatusLabel(
                            task.status
                          )}
                        </Badge>

                      </div>

                    </Link>
                  )
                )}

              </div>
            )}

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          DOCUMENTS
      ================================================== */}

      {activeTab ===
        'documents' &&
        canViewDocuments && (
        <Card>

          <Card.Header>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400">
                  <FolderOpen size={17} />
                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Belgeler
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    {documents.length} kayıt
                  </p>

                </div>

              </div>

              {canUploadDocuments && (
                <Link
                  to={
                    createDocumentUrl
                  }
                >
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    Belge Yükle
                  </Button>
                </Link>
              )}

            </div>

          </Card.Header>

          <Card.Body>

            {documentsLoading ? (
              <div className="py-10 text-center text-sm text-gray-500">
                Belgeler yükleniyor...
              </div>
            ) : documentsError ? (
              <div className="py-10 text-center text-sm text-red-600 dark:text-red-400">
                {relationErrorMessage(
                  documentsError,
                  'Belgeler yüklenemedi'
                )}
              </div>
            ) : documents.length ===
              0 ? (
              <div className="py-10 text-center">

                <FileText className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600" />

                <p className="mt-3 text-sm text-gray-500">
                  Bu danışmanlığa henüz belge bağlanmamış.
                </p>

              </div>
            ) : (
              <div className="space-y-2">

                {documents.map(
                  (
                    document
                  ) => {
                    const size =
                      getDocumentSize(
                        document
                      );

                    return (
                      <Link
                        key={
                          document.id
                        }
                        to={`/documents/${document.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-4 transition hover:border-blue-200 dark:border-white/[0.05] dark:hover:border-blue-500/20"
                      >

                        <div className="min-w-0">

                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {getDocumentName(
                              document
                            )}
                          </p>

                          <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                            {formatDate(
                              document.created_at
                            )}
                            {size
                              ? ` · ${size}`
                              : ''}
                          </p>

                        </div>

                        <FolderOpen className="h-4 w-4 shrink-0 text-gray-400" />

                      </Link>
                    );
                  }
                )}

              </div>
            )}

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          NOTES
      ================================================== */}

      {activeTab ===
        'notes' &&
        canViewNotes && (
        <Card>

          <Card.Header>

            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400">
                  <MessageSquareText size={17} />
                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Notlar
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    Danışmanlık dosyasına ait notlar
                  </p>

                </div>

              </div>

              {!notesLoading &&
                !notesError && (
                <Badge variant="default">
                  {notes.length} not
                </Badge>
              )}

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            {canCreateNotes && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">

                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Yeni Not
                </label>

                <textarea
                  value={
                    noteContent
                  }
                  onChange={(
                    event
                  ) =>
                    setNoteContent(
                      event.target.value
                    )
                  }
                  disabled={
                    addNoteMutation.isPending
                  }
                  rows={4}
                  placeholder="Danışmanlıkla ilgili notunuzu yazın..."
                  className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-white dark:placeholder:text-slate-500"
                />

                <div className="mt-3 flex justify-end">

                  <Button
                    type="button"
                    onClick={
                      handleAddNote
                    }
                    loading={
                      addNoteMutation.isPending
                    }
                    disabled={
                      addNoteMutation.isPending ||
                      !String(
                        noteContent ||
                        ''
                      ).trim()
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Not Ekle
                  </Button>

                </div>

              </div>
            )}

            {notesLoading ? (
              <div className="py-10 text-center text-sm text-gray-500">
                Notlar yükleniyor...
              </div>
            ) : notesError ? (
              <div className="py-10 text-center text-sm text-red-600 dark:text-red-400">
                {relationErrorMessage(
                  notesError,
                  'Notlar yüklenemedi'
                )}
              </div>
            ) : notes.length ===
              0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-5 py-10 text-center dark:border-white/[0.07]">

                <MessageSquareText className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600" />

                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Henüz not eklenmemiş.
                </p>

                <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-gray-500 dark:text-slate-500">
                  Bu danışmanlık dosyasına ait notlar burada görüntülenecek.
                </p>

              </div>
            ) : (
              <div className="space-y-3">

                {notes.map(
                  (
                    note
                  ) => (
                    <div
                      key={
                        note.id
                      }
                      className="rounded-xl border border-gray-100 p-4 dark:border-white/[0.06]"
                    >

                      <div className="flex flex-wrap items-center justify-between gap-2">

                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {getFullName(
                            note.creator
                          )}
                        </p>

                        <span className="text-xs text-gray-400 dark:text-slate-500">
                          {formatDateTime(
                            note.created_at
                          )}
                        </span>

                      </div>

                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600 dark:text-slate-300">
                        {note.content}
                      </p>

                    </div>
                  )
                )}

              </div>
            )}

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          ACTIVITY
      ================================================== */}

      {activeTab ===
        'activity' &&
        canViewAuditLogs && (
        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-white/[0.05] dark:text-slate-400">
                <Activity size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Aktivite
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Danışmanlığa ait Audit Log geçmişi
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            {activityLoading ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-5 py-10 text-center dark:border-white/[0.07]">

                <Activity className="mx-auto h-8 w-8 animate-pulse text-gray-300 dark:text-slate-600" />

                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Aktivite geçmişi yükleniyor...
                </p>

              </div>
            ) : activityError ? (
              <div className="rounded-xl border border-red-100 bg-red-50/50 px-5 py-8 text-center dark:border-red-500/15 dark:bg-red-500/[0.04]">

                <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />

                <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">
                  Aktivite geçmişi yüklenemedi
                </p>

                <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-red-600/80 dark:text-red-300/70">
                  {getApiErrorMessage(
                    activityError,
                    'Audit Log kayıtları alınamadı'
                  )}
                </p>

                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={
                      activityFetching
                    }
                    onClick={() =>
                      refetchActivity()
                    }
                  >
                    Tekrar Dene
                  </Button>
                </div>

              </div>
            ) : activityLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-5 py-10 text-center dark:border-white/[0.07]">

                <Activity className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600" />

                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Henüz aktivite kaydı yok
                </p>

                <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-gray-500 dark:text-slate-500">
                  Bu danışmanlık üzerinde yapılan işlemler Audit Log kaydı oluştukça burada gösterilir.
                </p>

              </div>
            ) : (
              <div className="space-y-3">

                {activityLogs.map(
                  (
                    log
                  ) => (
                    <div
                      key={
                        log.id
                      }
                      className="rounded-xl border border-gray-100 bg-gray-50/45 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]"
                    >

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <Badge
                              variant={
                                getAuditActionVariant(
                                  log.action
                                )
                              }
                            >
                              {getAuditActionLabel(
                                log.action
                              )}
                            </Badge>

                            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                              {getAuditUserName(
                                log
                              )}
                            </span>

                          </div>

                          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                            {log.description ||
                              'Danışmanlık üzerinde işlem yapıldı'}
                          </p>

                          {log.metadata?.event && (
                            <p className="mt-1 text-xs text-gray-400 dark:text-slate-600">
                              {log.metadata.event}
                            </p>
                          )}

                        </div>

                        <span className="shrink-0 text-xs text-gray-400 dark:text-slate-600">
                          {formatDateTime(
                            log.created_at
                          )}
                        </span>

                      </div>

                    </div>
                  )
                )}

                {activityLogs.length >=
                  50 && (
                  <p className="pt-1 text-center text-xs text-gray-400 dark:text-slate-600">
                    Son 50 aktivite gösteriliyor.
                  </p>
                )}

              </div>
            )}

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          CLIENT CONVERSION MODAL
      ================================================== */}

      <ActionModal
        open={
          clientModalOpen
        }
        title="Müvekkile Dönüştür"
        description="Potansiyel talep sahibinden yeni müvekkil kaydı oluşturulur; danışmanlıktaki geçmiş iletişim bilgileri korunur."
        onClose={() => {
          if (
            !convertClientMutation.isPending
          ) {
            setClientModalOpen(
              false
            );
          }
        }}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={
                convertClientMutation.isPending
              }
              onClick={() =>
                setClientModalOpen(
                  false
                )
              }
            >
              Vazgeç
            </Button>

            <Button
              type="button"
              loading={
                convertClientMutation.isPending
              }
              disabled={
                convertClientMutation.isPending
              }
              onClick={
                handleConvertToClient
              }
            >
              Müvekkil Oluştur
            </Button>
          </>
        }
      >

        <Input
          label="Ad / Unvan *"
          name="name"
          value={
            clientForm.name
          }
          onChange={
            handleClientFormChange
          }
          error={
            conversionErrors.name
          }
          disabled={
            convertClientMutation.isPending
          }
          maxLength={255}
        />

        <div>

          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Müvekkil Türü
          </label>

          <select
            name="client_type"
            value={
              clientForm.client_type
            }
            onChange={
              handleClientFormChange
            }
            disabled={
              convertClientMutation.isPending
            }
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
          >
            {CLIENT_TYPE_OPTIONS.map(
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

        <div className="grid gap-4 md:grid-cols-2">

          <Input
            label="Telefon"
            name="phone"
            value={
              clientForm.phone
            }
            onChange={
              handleClientFormChange
            }
            error={
              conversionErrors.phone
            }
            disabled={
              convertClientMutation.isPending
            }
          />

          <Input
            label="E-posta"
            name="email"
            type="email"
            value={
              clientForm.email
            }
            onChange={
              handleClientFormChange
            }
            error={
              conversionErrors.email
            }
            disabled={
              convertClientMutation.isPending
            }
          />

        </div>

      </ActionModal>

      {/* ==================================================
          CASE CONVERSION MODAL
      ================================================== */}

      <ActionModal
        open={
          caseModalOpen
        }
        title="Davaya Dönüştür"
        description="Danışmanlık kaydı korunur; bağlı görev, toplantı ve belgeler alanları yeni davaya bağlanır."
        onClose={() => {
          if (
            !convertCaseMutation.isPending
          ) {
            setCaseModalOpen(
              false
            );
          }
        }}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={
                convertCaseMutation.isPending
              }
              onClick={() =>
                setCaseModalOpen(
                  false
                )
              }
            >
              Vazgeç
            </Button>

            <Button
              type="button"
              loading={
                convertCaseMutation.isPending
              }
              disabled={
                convertCaseMutation.isPending ||
                lawyersLoading
              }
              onClick={
                handleConvertToCase
              }
            >
              Davayı Oluştur
            </Button>
          </>
        }
      >

        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-500/15 dark:bg-blue-500/[0.04]">

          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            Dönüştürülecek danışmanlık
          </p>

          <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
            {consultation.title}
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-400">

            <span>
              Müvekkil: {consultation.client?.name || '-'}
            </span>

            <span>
              Hukuk Alanı: {consultation.legal_area || '-'}
            </span>

          </div>

        </div>

        <div className="grid gap-4 md:grid-cols-2">

          <Input
            label="Yargı Türü *"
            name="judiciary_type"
            value={
              caseForm.judiciary_type
            }
            onChange={
              handleCaseFormChange
            }
            error={
              conversionErrors.judiciary_type
            }
            disabled={
              convertCaseMutation.isPending
            }
            maxLength={100}
            placeholder="Örn: Hukuk"
          />

          <Input
            label="Yargı Birimi *"
            name="judiciary_unit"
            value={
              caseForm.judiciary_unit
            }
            onChange={
              handleCaseFormChange
            }
            error={
              conversionErrors.judiciary_unit
            }
            disabled={
              convertCaseMutation.isPending
            }
            maxLength={150}
            placeholder="Örn: İş Mahkemesi"
          />

        </div>

        <div className="grid gap-4 md:grid-cols-2">

          <Input
            label="Mahkeme *"
            name="court_name"
            value={
              caseForm.court_name
            }
            onChange={
              handleCaseFormChange
            }
            error={
              conversionErrors.court_name
            }
            disabled={
              convertCaseMutation.isPending
            }
            maxLength={200}
            placeholder="Örn: İstanbul 12. İş Mahkemesi"
          />

          <Input
            label="Dosya / Esas No *"
            name="case_number"
            value={
              caseForm.case_number
            }
            onChange={
              handleCaseFormChange
            }
            error={
              conversionErrors.case_number
            }
            disabled={
              convertCaseMutation.isPending
            }
            maxLength={100}
            placeholder="Örn: 2026/123"
          />

        </div>

        {caseForm.court_name &&
          caseForm.case_number && (
          <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5 dark:border-white/[0.05] dark:bg-white/[0.02]">

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Oluşacak Dava Başlığı
            </p>

            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              {`${caseForm.court_name.trim()} · ${caseForm.case_number.trim()}`}
            </p>

          </div>
        )}

        <Input
          label="Dava Konusu"
          name="subject"
          value={
            caseForm.subject
          }
          onChange={
            handleCaseFormChange
          }
          error={
            conversionErrors.subject
          }
          disabled={
            convertCaseMutation.isPending
          }
          maxLength={255}
        />

        <div>

          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Atanan Avukat *
          </label>

          <select
            name="assigned_to"
            value={
              caseForm.assigned_to
            }
            onChange={
              handleCaseFormChange
            }
            disabled={
              lawyersLoading ||
              convertCaseMutation.isPending
            }
            className={`h-10 w-full rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 dark:bg-white/[0.035] dark:text-slate-300 ${
              conversionErrors.assigned_to
                ? 'border-red-400 focus:border-red-500'
                : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
            }`}
          >
            <option value="">
              {lawyersLoading
                ? 'Avukatlar yükleniyor...'
                : lawyersError
                  ? 'Avukat listesi yüklenemedi'
                  : 'Avukat seçin'}
            </option>

            {caseAssignableLawyers.map(
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
                  {getFullName(
                    lawyer
                  )}
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

          {conversionErrors.assigned_to && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {conversionErrors.assigned_to}
            </p>
          )}

          {lawyersError && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-700 dark:text-amber-300">

              <span>
                {getApiErrorMessage(
                  lawyersError,
                  'Atanabilir avukat listesi yüklenemedi.'
                )}
              </span>

              <button
                type="button"
                onClick={() =>
                  refetchLawyers?.()
                }
                className="font-semibold underline underline-offset-2"
              >
                Tekrar Dene
              </button>

            </div>
          )}

        </div>

        <div>

          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Öncelik
          </label>

          <select
            name="priority"
            value={
              caseForm.priority
            }
            onChange={
              handleCaseFormChange
            }
            disabled={
              convertCaseMutation.isPending
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

        </div>

        <Input
          label="Dava Açılış Tarihi"
          name="opening_date"
          type="date"
          value={
            caseForm.opening_date
          }
          max={
            getIstanbulTodayDateInput()
          }
          onChange={
            handleCaseFormChange
          }
          error={
            conversionErrors.opening_date
          }
          disabled={
            convertCaseMutation.isPending
          }
        />

        <div>

          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Açıklama
          </label>

          <textarea
            name="description"
            value={
              caseForm.description
            }
            onChange={
              handleCaseFormChange
            }
            disabled={
              convertCaseMutation.isPending
            }
            rows={5}
            maxLength={5000}
            className={`w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-sm leading-6 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 dark:bg-white/[0.035] dark:text-white ${
              conversionErrors.description
                ? 'border-red-400 focus:border-red-500'
                : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
            }`}
          />

          {conversionErrors.description && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {conversionErrors.description}
            </p>
          )}

          <p className="mt-1 text-right text-xs text-gray-400 dark:text-slate-600">
            {caseForm.description.length}/5000
          </p>

        </div>

      </ActionModal>

    </div>
  );
};

export default ConsultationDetail;
