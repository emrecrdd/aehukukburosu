import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  useTask,
  useStartTask,
  useCompleteTask,
  useApproveTask,
  useAddNote,
  useTaskNotes,
  useUpdateProgress,
} from '../../features/tasks/task.query.js';

import {
  useConsultation,
} from '../../features/consultations/consultation.query.js';

import taskApi from '../../features/tasks/task.api.js';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';
import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit2,
  FileCheck2,
  Link2,
  MessageSquarePlus,
  Play,
  ShieldCheck,
  Timer,
  User,
  Users,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const STATUS_LABELS = {
  pending: 'Bekliyor',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

const PRIORITY_LABELS = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  critical: 'Kritik',
};

const MAX_MANUAL_PROGRESS =
  99;

// ======================================================
// BADGE HELPERS
// ======================================================

const getStatusVariant = ({
  status,
  approvedAt,
}) => {
  if (
    status === 'completed' &&
    !approvedAt
  ) {
    return 'warning';
  }

  switch (status) {
    case 'pending':
      return 'warning';

    case 'in_progress':
      return 'info';

    case 'completed':
      return 'success';

    case 'cancelled':
      return 'danger';

    default:
      return 'default';
  }
};

const getStatusLabel = ({
  status,
  approvedAt,
}) => {
  if (
    status === 'completed' &&
    !approvedAt
  ) {
    return 'Onay Bekliyor';
  }

  return (
    STATUS_LABELS[status] ||
    status ||
    'Bilinmiyor'
  );
};

const getPriorityVariant = (
  priority
) => {
  switch (priority) {
    case 'critical':
      return 'danger';

    case 'high':
      return 'warning';

    default:
      return 'default';
  }
};

// ======================================================
// DATE
// ======================================================

const formatDateTime = (
  date
) => {
  if (!date) {
    return '-';
  }

  try {
    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      'tr-TR',
      {
        timeZone:
          'Europe/Istanbul',

        day: '2-digit',
        month: '2-digit',
        year: 'numeric',

        hour: '2-digit',
        minute: '2-digit',

        hour12: false,
      }
    ).format(parsed);
  } catch {
    return '-';
  }
};

// ======================================================
// USER
// ======================================================

const getUserName = (
  person,
  fallback = '-'
) => {
  if (!person) {
    return fallback;
  }

  const name = [
    person.first_name,
    person.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    name ||
    fallback
  );
};

const getAssignmentData = (
  person
) => {
  if (!person) {
    return null;
  }

  return (
    person.TaskAssignee ||
    person.taskAssignee ||
    person.task_assignee ||
    person.task_assignees ||
    null
  );
};

const getCaseDisplayName = (
  caseItem
) => {
  if (!caseItem) {
    return 'Dava';
  }

  const courtName = String(
    caseItem.court_name || ''
  ).trim();

  const caseNumber = String(
    caseItem.case_number || ''
  ).trim();

  if (courtName && caseNumber) {
    return `${courtName} · ${caseNumber}`;
  }

  return (
    courtName ||
    caseNumber ||
    caseItem.title ||
    'Dava'
  );
};

const getConsultationDisplayName = (
  consultation
) => {
  if (!consultation) {
    return 'Danışmanlık';
  }

  const number = String(
    consultation.consultation_number ||
      ''
  ).trim();

  const title = String(
    consultation.title ||
      ''
  ).trim();

  if (number && title) {
    return `${number} · ${title}`;
  }

  return (
    number ||
    title ||
    'Danışmanlık'
  );
};

const getConsultationItem = (
  response
) => {
  return (
    response?.data?.data ??
    response?.data ??
    response ??
    null
  );
};

const getNumericProgress = (
  value
) => {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      parsed
    )
  );
};

// ======================================================
// COMPONENT
// ======================================================

const TaskDetail = () => {
  const { id } =
    useParams();

  const { user } =
    useAuth();

  // ======================================================
  // STATE
  // ======================================================

  const [
    noteContent,
    setNoteContent,
  ] = useState('');

  const [
    completionNote,
    setCompletionNote,
  ] = useState('');

  const [
    actualHours,
    setActualHours,
  ] = useState('');

  const [
    showCompleteModal,
    setShowCompleteModal,
  ] = useState(false);

  const [
    progressValue,
    setProgressValue,
  ] = useState(0);

  const [
    isCalendarDownloading,
    setIsCalendarDownloading,
  ] = useState(false);

  // ======================================================
  // QUERIES
  // ======================================================

  const {
    data,
    isLoading,
    error,
  } = useTask(id);

  const task =
    data?.data?.data;

  const consultationId =
    task?.consultation_id ||
    task?.consultation?.id ||
    null;

  const canViewConsultations =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_CONSULTATIONS
    );

  const {
    data:
      consultationData,
  } = useConsultation(
    canViewConsultations
      ? consultationId
      : null
  );

  const {
    data:
      notesData,
  } = useTaskNotes(id);

  // ======================================================
  // MUTATIONS
  // ======================================================

  const startMutation =
    useStartTask();

  const completeMutation =
    useCompleteTask();

  const approveMutation =
    useApproveTask();

  const addNoteMutation =
    useAddNote();

  const updateProgressMutation =
    useUpdateProgress();

  // ======================================================
  // DATA
  // ======================================================

  const consultation =
    getConsultationItem(
      consultationData
    );

  const notes =
    notesData?.data?.data ||
    [];

  // ======================================================
  // PERSONAL ASSIGNMENT
  // ======================================================

  const myAssignee =
    useMemo(() => {
      if (
        !task ||
        !user ||
        !Array.isArray(
          task.assignees
        )
      ) {
        return null;
      }

      return (
        task.assignees.find(
          (person) =>
            person?.id ===
            user.id
        ) ||
        null
      );
    }, [
      task,
      user,
    ]);

  const myAssignment =
    useMemo(
      () => {
        /*
         * Kişisel workflow için ana kaynak, assignees dizisinde
         * giriş yapan kullanıcıya ait junction kaydıdır.
         *
         * current_user_assignment kullanıcı değişiminde query
         * cache'inden eski hesaba ait kalabileceği için yalnızca
         * user_id gerçekten giriş yapan kullanıcıyla eşleşiyorsa
         * fallback olarak kullanılır.
         */
        const assignmentFromAssignee =
          getAssignmentData(
            myAssignee
          );

        if (
          assignmentFromAssignee
        ) {
          return assignmentFromAssignee;
        }

        const currentAssignment =
          task?.current_user_assignment;

        if (
          currentAssignment &&
          user?.id &&
          String(
            currentAssignment.user_id
          ) ===
            String(user.id)
        ) {
          return currentAssignment;
        }

        return null;
      },
      [
        task,
        myAssignee,
        user,
      ]
    );

  const myStatus =
    myAssignee
      ? (
          myAssignment?.status ||
          'pending'
        )
      : null;

  const myProgress =
    myAssignee
      ? getNumericProgress(
          myAssignment?.progress
        )
      : null;

  const displayProgress =
    myAssignee
      ? myProgress
      : getNumericProgress(
          task?.progress
        );

  const displayStartedAt =
    myAssignee
      ? myAssignment?.started_at
      : task?.started_at;

  const displayCompletedAt =
    myAssignee
      ? myAssignment?.completed_at
      : task?.completed_at;

  const displayActualHours =
    myAssignee
      ? myAssignment?.actual_hours
      : task?.actual_hours;

  // ======================================================
  // PERMISSIONS
  // ======================================================

  const permissions =
    useMemo(() => {
      if (
        !task ||
        !user
      ) {
        return {
          isAssignee: false,
          isCreator: false,

          canStart: false,
          canComplete: false,
          canApprove: false,
          canUpdateProgress: false,
          canAddNote: false,
          canEdit: false,

          canViewCase: false,
          canViewClient: false,
        };
      }

      const isAssignee =
        Boolean(
          myAssignee
        );

      const isCreator =
        task.created_by ===
        user.id;

      // ================================================
      // SYSTEM PERMISSIONS
      // ================================================

      const canWorkOnTasks =
        hasPermission(
          user,
          PERMISSION_KEYS.WORK_ON_TASKS
        );

      const canApproveTasks =
        hasPermission(
          user,
          PERMISSION_KEYS.APPROVE_TASKS
        );

      const canEditTasks =
        hasPermission(
          user,
          PERMISSION_KEYS.EDIT_TASKS
        );

      const canViewCase =
        hasPermission(
          user,
          PERMISSION_KEYS.VIEW_CASES
        );

      const canViewClient =
        hasPermission(
          user,
          PERMISSION_KEYS.VIEW_CLIENTS
        );

      const taskCanBeWorked =
        ![
          'completed',
          'cancelled',
        ].includes(
          task.status
        );

      return {
        isAssignee,
        isCreator,

        /*
         * Çoklu atamada workflow artık ana task.status
         * üzerinden değil, giriş yapan kullanıcının
         * TaskAssignee.status kaydı üzerinden ilerler.
         */
        canStart:
          canWorkOnTasks &&
          isAssignee &&
          taskCanBeWorked &&
          myStatus ===
            'pending',

        canComplete:
          canWorkOnTasks &&
          isAssignee &&
          taskCanBeWorked &&
          myStatus ===
            'in_progress',

        canUpdateProgress:
          canWorkOnTasks &&
          isAssignee &&
          taskCanBeWorked &&
          myStatus ===
            'in_progress',

        /*
         * Onay, ekipteki herkes tamamladıktan sonra
         * ana görev completed olduğunda yapılır.
         */
        canApprove:
          canApproveTasks &&
          task.status ===
            'completed' &&
          !task.approved_at,

        canAddNote:
          canWorkOnTasks &&
          isAssignee,

        canEdit:
          canEditTasks,

        canViewCase,
        canViewClient,
      };
    }, [
      task,
      user,
      myAssignee,
      myStatus,
    ]);

  const {
    isAssignee,
    canStart,
    canComplete,
    canApprove,
    canUpdateProgress,
    canAddNote,
    canEdit,
    canViewCase,
    canViewClient,
  } = permissions;


  // ======================================================
  // WORKFLOW
  // ======================================================

  const workflow =
    useMemo(() => {
      if (!task) {
        return null;
      }

      const awaitingApproval =
        task.status ===
          'completed' &&
        !task.approved_at;

      const approved =
        Boolean(
          task.approved_at
        );

      const waitingForTeam =
        Boolean(
          isAssignee
        ) &&
        myStatus ===
          'completed' &&
        task.status !==
          'completed' &&
        task.status !==
          'cancelled';

      const displayStatus =
        task.status ===
          'cancelled'
          ? 'cancelled'
          : isAssignee
            ? (
                myStatus ||
                'pending'
              )
            : task.status;

      let statusLabel;

      if (
        waitingForTeam
      ) {
        statusLabel =
          'Sen Tamamladın';
      } else if (
        isAssignee &&
        displayStatus ===
          'completed' &&
        task.status !==
          'completed'
      ) {
        statusLabel =
          'Tamamlandı';
      } else if (
        isAssignee &&
        displayStatus !==
          'completed'
      ) {
        statusLabel =
          STATUS_LABELS[
            displayStatus
          ] ||
          displayStatus ||
          'Bilinmiyor';
      } else {
        statusLabel =
          getStatusLabel({
            status:
              displayStatus,

            approvedAt:
              task.approved_at,
          });
      }

      return {
        awaitingApproval,
        approved,
        waitingForTeam,
        displayStatus,

        statusLabel,

        statusVariant:
          getStatusVariant({
            status:
              displayStatus,

            approvedAt:
              isAssignee &&
              displayStatus ===
                'completed' &&
              task.status !==
                'completed'
                ? true
                : task.approved_at,
          }),
      };
    }, [
      task,
      isAssignee,
      myStatus,
    ]);

  // ======================================================
  // OVERDUE
  // ======================================================

  const isOverdue =
    Boolean(
      task?.due_date
    ) &&
    new Date(
      task.due_date
    ) <
      new Date() &&
    ![
      'completed',
      'cancelled',
    ].includes(
      task?.status
    );

  // ======================================================
  // PROGRESS SYNC
  // ======================================================

  useEffect(() => {
    if (!task) {
      return;
    }

    setProgressValue(
      Math.min(
        MAX_MANUAL_PROGRESS,
        displayProgress
      )
    );
  }, [
    task,
    displayProgress,
  ]);

  // ======================================================
  // PROGRESS
  // ======================================================

  const handleProgressChange =
    (event) => {
      const rawValue =
        Number.parseInt(
          event.target.value,
          10
        );

      const safeValue =
        Number.isFinite(
          rawValue
        )
          ? rawValue
          : 0;

      setProgressValue(
        Math.min(
          MAX_MANUAL_PROGRESS,
          Math.max(
            0,
            safeValue
          )
        )
      );
    };

  const handleUpdateProgress =
    () => {
      if (
        progressValue <
          0 ||
        progressValue >
          MAX_MANUAL_PROGRESS
      ) {
        toast.error(
          `İlerleme 0-${MAX_MANUAL_PROGRESS} arasında olmalıdır`
        );

        return;
      }

      updateProgressMutation.mutate({
        id,
        progress:
          progressValue,
      });
    };

  // ======================================================
  // START
  // ======================================================

  const handleStart = () => {
    if (!task) {
      return;
    }

    const confirmed =
      window.confirm(
        `"${task.title}" görevini başlatmak istediğinize emin misiniz?`
      );

    if (!confirmed) {
      return;
    }

    startMutation.mutate(
      id
    );
  };

  // ======================================================
  // COMPLETE
  // ======================================================

  const handleOpenCompleteModal =
    () => {
      setCompletionNote('');
      setActualHours('');
      setShowCompleteModal(
        true
      );
    };

  const handleCloseCompleteModal =
    () => {
      if (
        completeMutation.isPending
      ) {
        return;
      }

      setShowCompleteModal(
        false
      );

      setCompletionNote('');
      setActualHours('');
    };

  const handleComplete =
    () => {
      const cleanNote =
        completionNote.trim();

      if (!cleanNote) {
        toast.error(
          'Tamamlama notu girmelisiniz'
        );

        return;
      }

      let parsedHours;

      if (
        actualHours !==
        ''
      ) {
        parsedHours =
          Number.parseFloat(
            actualHours
          );

        if (
          !Number.isFinite(
            parsedHours
          ) ||
          parsedHours <
            0
        ) {
          toast.error(
            'Gerçek süre geçerli bir sayı olmalıdır'
          );

          return;
        }
      }

      completeMutation.mutate(
        {
          id,
          note:
            cleanNote,

          actual_hours:
            actualHours !==
            ''
              ? parsedHours
              : undefined,
        },
        {
          onSuccess:
            () => {
              setShowCompleteModal(
                false
              );

              setCompletionNote(
                ''
              );

              setActualHours(
                ''
              );
            },
        }
      );
    };

  // ======================================================
  // APPROVE
  // ======================================================

  const handleApprove = () => {
    if (!task) {
      return;
    }

    const confirmed =
      window.confirm(
        `"${task.title}" görevini onaylayarak tamamen kapatmak istediğinize emin misiniz?`
      );

    if (!confirmed) {
      return;
    }

    approveMutation.mutate(
      id
    );
  };

  // ======================================================
  // CALENDAR / ICS
  // ======================================================

  const handleAddToCalendar =
    async () => {
      if (
        !task?.id
      ) {
        return;
      }

      if (
        !task.due_date
      ) {
        toast.error(
          'Takvime eklemek için görev son tarihi gereklidir'
        );

        return;
      }

      try {
        setIsCalendarDownloading(
          true
        );

        const response =
          await taskApi.downloadCalendar(
            task.id
          );

        const blob =
          response.data instanceof Blob
            ? response.data
            : new Blob(
                [
                  response.data,
                ],
                {
                  type:
                    'text/calendar;charset=utf-8',
                }
              );

        const objectUrl =
          window.URL.createObjectURL(
            blob
          );

        const safeTitle =
          String(
            task.title ||
              'gorev'
          )
            .toLocaleLowerCase(
              'tr-TR'
            )
            .replace(
              /ı/g,
              'i'
            )
            .replace(
              /ğ/g,
              'g'
            )
            .replace(
              /ü/g,
              'u'
            )
            .replace(
              /ş/g,
              's'
            )
            .replace(
              /ö/g,
              'o'
            )
            .replace(
              /ç/g,
              'c'
            )
            .replace(
              /[^a-z0-9]+/g,
              '-'
            )
            .replace(
              /^-+|-+$/g,
              ''
            );

        const anchor =
          document.createElement(
            'a'
          );

        anchor.href =
          objectUrl;

        anchor.download =
          `derkenar-gorev-${
            safeTitle ||
            task.id
          }.ics`;

        document.body.appendChild(
          anchor
        );

        anchor.click();

        anchor.remove();

        window.setTimeout(
          () => {
            window.URL.revokeObjectURL(
              objectUrl
            );
          },
          1000
        );

        toast.success(
          'Takvim dosyası hazırlandı'
        );
      } catch (calendarError) {
        console.error(
          'Task calendar download error:',
          calendarError
        );

        toast.error(
          calendarError
            ?.response
            ?.data
            ?.message ||
            'Takvim dosyası oluşturulamadı'
        );
      } finally {
        setIsCalendarDownloading(
          false
        );
      }
    };

  // ======================================================
  // NOTE
  // ======================================================

  const handleAddNote =
    () => {
      const content =
        noteContent.trim();

      if (!content) {
        toast.error(
          'Not içeriği boş olamaz'
        );

        return;
      }

      addNoteMutation.mutate(
        {
          id,
          content,
        },
        {
          onSuccess:
            () => {
              setNoteContent('');
            },
        }
      );
    };

  // ======================================================
  // LOADING
  // ======================================================

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Görev yükleniyor...
          </p>

        </div>

      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    error ||
    !task
  ) {
    return (
      <div className="py-12 text-center">

        <div className="mb-4 text-5xl">
          ✅
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Görev Bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {error
            ?.response
            ?.data
            ?.message ||
            error
              ?.message ||
            'Görev bilgileri yüklenemedi'}
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

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div>

        <Link
          to="/tasks"
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

        <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">

          {/* LEFT */}

          <div className="min-w-0">

            <h1
              className="
                text-2xl
                font-semibold
                tracking-[-0.035em]
                text-gray-900
                dark:text-white
              "
            >
              {task.title}
            </h1>

            {task.description && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-slate-400">
                {task.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">

              <Badge
                variant={
                  workflow.statusVariant
                }
              >
                {
                  workflow.statusLabel
                }
              </Badge>

              <Badge
                variant={getPriorityVariant(
                  task.priority
                )}
              >
                {PRIORITY_LABELS[
                  task.priority
                ] ||
                  task.priority}
              </Badge>

              {isOverdue && (
                <Badge variant="danger">
                  ⚠️ Gecikti
                </Badge>
              )}

              {workflow.approved && (
                <Badge variant="success">
                  Onaylandı
                </Badge>
              )}

            </div>

          </div>

          {/* ACTIONS */}

          <div className="flex flex-wrap items-center gap-2">

            {canStart && (
              <Button
                variant="primary"
                size="sm"
                onClick={
                  handleStart
                }
                loading={
                  startMutation.isPending
                }
              >
                <Play className="mr-2 h-4 w-4" />

                Görevi Başlat
              </Button>
            )}

            {canComplete && (
              <Button
                variant="success"
                size="sm"
                onClick={
                  handleOpenCompleteModal
                }
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />

                Tamamlamaya Gönder
              </Button>
            )}

            {canApprove && (
              <Button
                variant="primary"
                size="sm"
                onClick={
                  handleApprove
                }
                loading={
                  approveMutation.isPending
                }
              >
                <ShieldCheck className="mr-2 h-4 w-4" />

                Onayla
              </Button>
            )}

            {task.due_date && (
              <Button
                variant="outline"
                size="sm"
                onClick={
                  handleAddToCalendar
                }
                loading={
                  isCalendarDownloading
                }
                disabled={
                  isCalendarDownloading
                }
              >
                <CalendarDays className="mr-2 h-4 w-4" />

                Takvime Ekle
              </Button>
            )}

          {canEdit && (
  <Link
    to={`/tasks/${task.id}/edit`}
  >
    <Button
      variant="outline"
      size="sm"
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
          WORKFLOW ALERTS
      ================================================== */}

      {workflow.waitingForTeam && (
        <div
          className="
            rounded-xl
            border
            border-blue-200
            bg-blue-50
            p-4
            dark:border-blue-500/20
            dark:bg-blue-500/[0.06]
          "
        >
          <div className="flex items-start gap-3">

            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />

            <div>

              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                Senin çalışman tamamlandı
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
                Diğer sorumluların çalışmasını tamamlaması bekleniyor. Tüm sorumlular tamamladığında görev yönetici onayına geçecek.
              </p>

            </div>

          </div>

        </div>
      )}

      {workflow.awaitingApproval && (
        <div
          className="
            rounded-xl
            border
            border-amber-200
            bg-amber-50
            p-4
            dark:border-amber-500/20
            dark:bg-amber-500/[0.06]
          "
        >

          <div className="flex items-start gap-3">

            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />

            <div>

              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Yönetici onayı bekleniyor
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-300">
                Çalışma tamamlandı. Yönetici inceleyip onayladıktan sonra görev nihai olarak kapanacak.
              </p>

            </div>

          </div>

        </div>
      )}

      {workflow.approved && (
        <div
          className="
            rounded-xl
            border
            border-emerald-200
            bg-emerald-50
            p-4
            dark:border-emerald-500/20
            dark:bg-emerald-500/[0.06]
          "
        >

          <div className="flex items-start gap-3">

            <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />

            <div>

              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Görev onaylandı
              </p>

              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
                {task.approver
                  ? `${getUserName(
                      task.approver
                    )} tarafından`
                  : 'Yönetici tarafından'}

                {task.approved_at
                  ? ` ${formatDateTime(
                      task.approved_at
                    )} tarihinde onaylandı.`
                  : ' onaylandı.'}
              </p>

            </div>

          </div>

        </div>
      )}

      {/* ==================================================
          QUICK STATS
      ================================================== */}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

        {/* STATUS */}

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.06] dark:bg-gray-800">

          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {isAssignee
              ? 'Benim Durumum'
              : 'Durum'}
          </p>

          <div className="mt-3">
            <Badge
              variant={
                workflow.statusVariant
              }
            >
              {
                workflow.statusLabel
              }
            </Badge>
          </div>

        </div>

        {/* PRIORITY */}

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.06] dark:bg-gray-800">

          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Öncelik
          </p>

          <div className="mt-3">
            <Badge
              variant={getPriorityVariant(
                task.priority
              )}
            >
              {PRIORITY_LABELS[
                task.priority
              ] ||
                task.priority}
            </Badge>
          </div>

        </div>

        {/* DUE */}

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.06] dark:bg-gray-800">

          <div className="flex items-center gap-2 text-gray-400">
            <CalendarDays className="h-4 w-4" />

            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Son Tarih
            </span>
          </div>

          <p
            className={`mt-3 text-sm font-semibold ${
              isOverdue
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {task.due_date
              ? formatDateTime(
                  task.due_date
                )
              : 'Belirtilmedi'}
          </p>

        </div>

        {/* PROGRESS */}

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.06] dark:bg-gray-800">

          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            İlerleme
          </p>

          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {displayProgress}
            %
          </p>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">

            <div
              className="h-full rounded-full bg-blue-600"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    displayProgress
                  )
                )}%`,
              }}
            />

          </div>

        </div>

      </div>

      {/* ==================================================
          MAIN GRID
      ================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">

        {/* LEFT */}

        <div className="space-y-6">

          {/* ==================================================
              TASK INFO
          ================================================== */}

          <Card>

            <Card.Header>

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">

                  <Users size={17} />

                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Görev Bilgileri
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400">
                    Sorumlu kişiler ve temel görev bilgileri
                  </p>

                </div>

              </div>

            </Card.Header>

            <Card.Body>

              <div className="grid gap-4 md:grid-cols-2">

                {/* ASSIGNEES */}

                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">

                  <div className="flex items-center justify-between gap-3">

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Users className="h-4 w-4" />

                      Atanan Kişiler
                    </div>

                    {Array.isArray(
                      task.assignees
                    ) &&
                      task.assignees.length >
                        0 && (
                        <Badge variant="primary">
                          {task.assignees.length}{' '}
                          kişi
                        </Badge>
                      )}

                  </div>

                  {Array.isArray(
                    task.assignees
                  ) &&
                  task.assignees.length >
                    0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">

                      {task.assignees.map(
                        (person) => {
                          const assignment =
                            getAssignmentData(
                              person
                            );

                          const personStatus =
                            assignment?.status ||
                            'pending';

                          const personProgress =
                            getNumericProgress(
                              assignment?.progress
                            );

                          return (
                            <div
                              key={
                                person.id
                              }
                              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
                            >
                              <User className="h-3.5 w-3.5 text-gray-400" />

                              <span>
                                {getUserName(
                                  person
                                )}
                              </span>

                              <span className="text-gray-400">
                                ·
                              </span>

                              <span>
                                {STATUS_LABELS[
                                  personStatus
                                ] ||
                                  personStatus}
                                {' '}
                                %{personProgress}
                              </span>
                            </div>
                          );
                        }
                      )}

                    </div>
                  ) : (
                    <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                      Atanmadı
                    </p>
                  )}

                </div>

                {/* CREATOR */}

                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <User className="h-4 w-4" />

                    Oluşturan
                  </div>

                  <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                    {getUserName(
                      task.creator,
                      'Bilinmiyor'
                    )}
                  </p>

                </div>

              </div>

              <div className="mt-5 grid gap-5 border-t border-gray-100 pt-5 dark:border-white/[0.05] sm:grid-cols-2">

                <div>

                  <p className="text-xs text-gray-400">
                    Tahmini Süre
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    {task.estimated_hours !=
                    null
                      ? `${task.estimated_hours} saat`
                      : 'Belirtilmemiş'}
                  </p>

                </div>

                <div>

                  <p className="text-xs text-gray-400">
                    Son Tarih
                  </p>

                  <p
                    className={`mt-1 text-sm font-medium ${
                      isOverdue
                        ? 'text-red-600'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {task.due_date
                      ? formatDateTime(
                          task.due_date
                        )
                      : 'Belirtilmemiş'}
                  </p>

                </div>

              </div>

            </Card.Body>

          </Card>

          {/* ==================================================
              DESCRIPTION
          ================================================== */}

          {task.description && (
            <Card>

              <Card.Header>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Açıklama
                </h2>

              </Card.Header>

              <Card.Body>

                <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-slate-300">
                  {task.description}
                </p>

              </Card.Body>

            </Card>
          )}

          {/* ==================================================
              PROGRESS
          ================================================== */}

          <Card>

            <Card.Header>

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/[0.08] dark:text-violet-400">

                  <Timer size={17} />

                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {isAssignee
                      ? 'Benim İlerlemem ve Sürem'
                      : 'İlerleme ve Süre'}
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400">
                    {isAssignee
                      ? 'Kendi ilerlemeniz ve çalışma süreniz'
                      : 'Ekibin toplam ilerleme durumu ve çalışma süresi'}
                  </p>

                </div>

              </div>

            </Card.Header>

            <Card.Body className="space-y-6">

              {/* PROGRESS */}

              <div>

                <div className="flex items-center justify-between">

                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    İlerleme
                  </span>

                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {displayProgress}
                    %
                  </span>

                </div>

                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">

                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          displayProgress
                        )
                      )}%`,
                    }}
                  />

                </div>

              </div>

              {canUpdateProgress && (
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

                    <input
                      type="range"
                      min="0"
                      max={
                        MAX_MANUAL_PROGRESS
                      }
                      value={
                        progressValue
                      }
                      onChange={
                        handleProgressChange
                      }
                      className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600 dark:bg-gray-700"
                    />

                    <div className="flex items-center gap-2">

                      <input
                        type="number"
                        min="0"
                        max={
                          MAX_MANUAL_PROGRESS
                        }
                        value={
                          progressValue
                        }
                        onChange={
                          handleProgressChange
                        }
                        className="h-9 w-20 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-white"
                      />

                      <Button
                        size="sm"
                        onClick={
                          handleUpdateProgress
                        }
                        loading={
                          updateProgressMutation.isPending
                        }
                      >
                        Güncelle
                      </Button>

                    </div>

                  </div>

                  <p className="mt-3 text-xs text-gray-400">
                    %100 değeri görev tamamlanmaya gönderildiğinde otomatik atanır.
                  </p>

                </div>
              )}

              {/* TIME */}

              {(displayStartedAt ||
                displayCompletedAt ||
                displayActualHours !=
                  null) && (
                <div className="grid gap-4 border-t border-gray-100 pt-5 dark:border-white/[0.05] sm:grid-cols-3">

                  <div>

                    <p className="text-xs text-gray-400">
                      Başlangıç
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {displayStartedAt
                        ? formatDateTime(
                            displayStartedAt
                          )
                        : '-'}
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-gray-400">
                      Bitiş
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {displayCompletedAt
                        ? formatDateTime(
                            displayCompletedAt
                          )
                        : '-'}
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-gray-400">
                      Gerçek Süre
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {displayActualHours !=
                      null
                        ? `${displayActualHours} saat`
                        : 'Otomatik'}
                    </p>

                  </div>

                </div>
              )}

            </Card.Body>

          </Card>

          {/* ==================================================
              RELATED
          ================================================== */}

          {(task.case ||
            task.client ||
            consultation) && (
            <Card>

              <Card.Header>

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400">

                    <Link2 size={17} />

                  </div>

                  <div>

                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      İlişkili Kayıtlar
                    </h2>

                    <p className="mt-0.5 text-xs text-gray-400">
                      Görevin bağlı olduğu dava, müvekkil veya danışmanlık
                    </p>

                  </div>

                </div>

              </Card.Header>

              <Card.Body>

                <div className="grid gap-3 md:grid-cols-2">

                  {task.case && (
  canViewCase ? (
    <Link
      to={`/cases/${task.case.id}`}
      className="rounded-xl border border-gray-100 p-4 transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-white/[0.05] dark:hover:border-blue-500/20 dark:hover:bg-blue-500/[0.03]"
    >
      <p className="text-xs text-gray-400">
        Dava
      </p>

      <p className="mt-1 font-medium text-blue-600 dark:text-blue-400">
        {getCaseDisplayName(task.case)}
      </p>
    </Link>
  ) : (
    <div className="rounded-xl border border-gray-100 p-4 dark:border-white/[0.05]">

      <p className="text-xs text-gray-400">
        Dava
      </p>

      <p className="mt-1 font-medium text-gray-700 dark:text-slate-300">
        {getCaseDisplayName(task.case)}
      </p>

    </div>
  )
)}

                  {task.client && (
  canViewClient ? (
    <Link
      to={`/clients/${task.client.id}`}
      className="rounded-xl border border-gray-100 p-4 transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-white/[0.05] dark:hover:border-blue-500/20 dark:hover:bg-blue-500/[0.03]"
    >
      <p className="text-xs text-gray-400">
        Müvekkil
      </p>

      <p className="mt-1 font-medium text-blue-600 dark:text-blue-400">
        {task.client.name}
      </p>
    </Link>
  ) : (
    <div className="rounded-xl border border-gray-100 p-4 dark:border-white/[0.05]">

      <p className="text-xs text-gray-400">
        Müvekkil
      </p>

      <p className="mt-1 font-medium text-gray-700 dark:text-slate-300">
        {task.client.name}
      </p>

    </div>
  )
)}

                  {consultation && (
                    <Link
                      to={`/consultations/${consultation.id}`}
                      className="rounded-xl border border-gray-100 p-4 transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-white/[0.05] dark:hover:border-blue-500/20 dark:hover:bg-blue-500/[0.03]"
                    >
                      <p className="text-xs text-gray-400">
                        Danışmanlık
                      </p>

                      <p className="mt-1 font-medium text-blue-600 dark:text-blue-400">
                        {getConsultationDisplayName(
                          consultation
                        )}
                      </p>
                    </Link>
                  )}

                </div>

              </Card.Body>

            </Card>
          )}

        </div>

        {/* ==================================================
            NOTES
        ================================================== */}

        <div>

          <Card>

            <Card.Header>

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400">

                  <MessageSquarePlus size={17} />

                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Görev Notları
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400">
                    {notes.length} not
                  </p>

                </div>

              </div>

            </Card.Header>

            <Card.Body className="space-y-4">

              {canAddNote && (
                <div className="space-y-3">

                  <textarea
                    value={
                      noteContent
                    }
                    onChange={(event) =>
                      setNoteContent(
                        event.target
                          .value
                      )
                    }
                    placeholder="Çalışma notu ekleyin..."
                    rows="4"
                    className="
                      w-full
                      resize-none
                      rounded-lg
                      border
                      border-gray-200
                      bg-white
                      px-3
                      py-2.5
                      text-sm
                      text-gray-900
                      outline-none
                      placeholder:text-gray-400
                      focus:border-blue-500
                      focus:ring-2
                      focus:ring-blue-500/10
                      dark:border-white/[0.08]
                      dark:bg-white/[0.035]
                      dark:text-white
                    "
                  />

                  <Button
                    size="sm"
                    onClick={
                      handleAddNote
                    }
                    loading={
                      addNoteMutation.isPending
                    }
                    className="w-full"
                  >
                    <MessageSquarePlus className="mr-2 h-4 w-4" />

                    Not Ekle
                  </Button>

                </div>
              )}

              <div className="max-h-[40rem] space-y-3 overflow-y-auto pr-1">

                {notes.length ===
                0 ? (
                  <div className="py-10 text-center">

                    <MessageSquarePlus className="mx-auto h-8 w-8 text-gray-300" />

                    <p className="mt-3 text-sm text-gray-500">
                      Henüz görev notu yok
                    </p>

                  </div>
                ) : (
                  notes.map(
                    (
                      note
                    ) => (
                      <div
                        key={
                          note.id
                        }
                        className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-white/[0.05] dark:bg-white/[0.02]"
                      >

                        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-slate-300">
                          {
                            note.content
                          }
                        </p>

                        <div className="mt-3 border-t border-gray-100 pt-2 text-[11px] text-gray-400 dark:border-white/[0.05]">

                          <p className="font-medium text-gray-500 dark:text-slate-400">
                            {getUserName(
                              note.creator,
                              'Sistem'
                            )}
                          </p>

                          <p className="mt-0.5">
                            {formatDateTime(
                              note.created_at
                            )}
                          </p>

                        </div>

                      </div>
                    )
                  )
                )}

              </div>

            </Card.Body>

          </Card>

        </div>

      </div>

      {/* ==================================================
          COMPLETE MODAL
      ================================================== */}

      {showCompleteModal && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/60
            p-4
            backdrop-blur-sm
          "
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCloseCompleteModal();
            }
          }}
        >

          <div
            className="
              w-full
              max-w-lg
              overflow-hidden
              rounded-2xl
              border
              border-gray-200
              bg-white
              shadow-2xl
              dark:border-white/[0.08]
              dark:bg-[#0b1b33]
            "
          >

            {/* MODAL HEADER */}

            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-white/[0.05]">

              <div>

                <div className="flex items-center gap-2">

                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />

                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Çalışmamı Tamamla
                  </h3>

                </div>

                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-slate-400">
                  Kendi çalışmanızı tamamlayacaksınız. Tüm sorumlular tamamlandığında görev yönetici onayına geçecek.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  handleCloseCompleteModal
                }
                disabled={
                  completeMutation.isPending
                }
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            {/* BODY */}

            <div className="space-y-5 px-6 py-5">

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Tamamlama Notu *
                </label>

                <textarea
                  value={
                    completionNote
                  }
                  onChange={(event) =>
                    setCompletionNote(
                      event.target
                        .value
                    )
                  }
                  rows="5"
                  placeholder="Yapılan işlemleri ve sonucu kısaca açıklayın..."
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
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-white
                  "
                />

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Gerçek Süre
                </label>

                <div className="relative">

                  <Timer className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="number"
                    value={
                      actualHours
                    }
                    onChange={(event) =>
                      setActualHours(
                        event.target
                          .value
                      )
                    }
                    min="0"
                    step="0.25"
                    placeholder="Saat"
                    className="
                      h-10
                      w-full
                      rounded-lg
                      border
                      border-gray-200
                      bg-white
                      pl-9
                      pr-3
                      text-sm
                      text-gray-900
                      outline-none
                      focus:border-blue-500
                      focus:ring-2
                      focus:ring-blue-500/10
                      dark:border-white/[0.08]
                      dark:bg-white/[0.035]
                      dark:text-white
                    "
                  />

                </div>

                <p className="mt-1.5 text-xs text-gray-400">
                  Boş bırakırsanız başlangıç ve bitiş zamanından otomatik hesaplanır.
                </p>

              </div>

              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/[0.06] dark:text-amber-200">

                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                <p>
                  Bu işlem yalnızca sizin ilerlemenizi %100 yapar. Diğer sorumluların durumu değişmez.
                </p>

              </div>

            </div>

            {/* FOOTER */}

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-6 py-4 dark:border-white/[0.05] sm:flex-row sm:justify-end">

              <Button
                variant="secondary"
                onClick={
                  handleCloseCompleteModal
                }
                disabled={
                  completeMutation.isPending
                }
              >
                Vazgeç
              </Button>

              <Button
                variant="success"
                onClick={
                  handleComplete
                }
                loading={
                  completeMutation.isPending
                }
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />

                Çalışmamı Tamamla
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default TaskDetail;   