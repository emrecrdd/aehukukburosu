import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import notificationApi from '../../features/notification/notification.api.js';

import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import Loader from '../../components/shared/Loader.jsx';
import Error from '../../components/shared/Error.jsx';
import Empty from '../../components/shared/Empty.jsx';

import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  BellOff,
  BellRing,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  ListTodo,
  Scale,
  ShieldCheck,
  Trash2,
  UsersRound,
} from 'lucide-react';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/tr';

import toast from 'react-hot-toast';

dayjs.extend(relativeTime);
dayjs.locale('tr');

// ======================================================
// CONSTANTS
// ======================================================

const TYPE_CONFIG = {
  task: {
    label: 'Görev',
    variant: 'primary',
    icon: ListTodo,
    iconClass:
      'bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400',
  },

  case: {
    label: 'Dava',
    variant: 'success',
    icon: Scale,
    iconClass:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400',
  },

  event: {
    label: 'Etkinlik',
    variant: 'info',
    icon: CalendarDays,
    iconClass:
      'bg-violet-50 text-violet-600 dark:bg-violet-500/[0.08] dark:text-violet-400',
  },

  meeting: {
    label: 'Toplantı',
    variant: 'info',
    icon: UsersRound,
    iconClass:
      'bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400',
  },

  consultation: {
    label: 'Danışmanlık',
    variant: 'info',
    icon: BriefcaseBusiness,
    iconClass:
      'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/[0.08] dark:text-cyan-400',
  },

  system: {
    label: 'Sistem',
    variant: 'default',
    icon: ShieldCheck,
    iconClass:
      'bg-gray-100 text-gray-600 dark:bg-white/[0.05] dark:text-slate-400',
  },

  default: {
    label: 'Bildirim',
    variant: 'default',
    icon: Bell,
    iconClass:
      'bg-gray-100 text-gray-600 dark:bg-white/[0.05] dark:text-slate-400',
  },
};

// ======================================================
// HELPERS
// ======================================================

const getTypeConfig = (
  notification
) => {
  if (
    notification?.metadata?.entityType ===
      'consultation' ||
    notification?.metadata?.consultationId
  ) {
    return TYPE_CONFIG.consultation;
  }

  if (
    notification?.type === 'event' &&
    notification?.metadata?.eventType === 'hearing'
  ) {
    return {
      ...TYPE_CONFIG.event,
      label: 'Duruşma',
      icon: Scale,
    };
  }

  return (
    TYPE_CONFIG[
      notification?.type
    ] ||
    TYPE_CONFIG.default
  );
};

const formatDateTime = (
  date
) => {
  if (!date) {
    return '-';
  }

  const parsed =
    dayjs(date);

  if (
    !parsed.isValid()
  ) {
    return '-';
  }

  return parsed.format(
    'DD.MM.YYYY HH:mm'
  );
};

const cleanNotificationTitle = (
  title
) => {
  const normalizedTitle =
    typeof title === 'string'
      ? title.trim()
      : '';

  if (!normalizedTitle) {
    return 'Bildirim';
  }

  return normalizedTitle.replace(
    /^(?:📋|⚖️|👤|📄|📁|🔔)\s*/u,
    ''
  );
};

// ======================================================
// COMPONENT
// ======================================================

const NotificationsPage = () => {
  const queryClient =
    useQueryClient();

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    deleteDialog,
    setDeleteDialog,
  ] =
    useState(null);

  // ====================================================
  // QUERY
  // ====================================================

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } =
    useQuery({
      queryKey: [
        'notifications',
        {
          page,
        },
      ],

      queryFn: () =>
        notificationApi.getMyNotifications({
          page,
          limit: 20,
        }),

      staleTime:
        60 * 1000,
    });

  const notifications =
    Array.isArray(
      data?.data?.data
    )
      ? data.data.data
      : [];

  const pagination =
    data?.data?.pagination;

  // ====================================================
  // DERIVED DATA
  // ====================================================

  const unreadCount =
    useMemo(() => {
      return notifications.filter(
        (
          notification
        ) =>
          !notification.read
      ).length;
    }, [
      notifications,
    ]);

  const hasUnread =
    unreadCount > 0;

  // ====================================================
  // CACHE REFRESH
  // ====================================================

  const refreshNotificationQueries =
    async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            'notifications',
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            'notification-unread-count',
          ],
        }),
      ]);
    };

  // ====================================================
  // MARK AS READ
  // ====================================================

  const markAsRead =
    useMutation({
      mutationFn: (
        id
      ) =>
        notificationApi.markAsRead(
          id
        ),

      onSuccess: async () => {
        await refreshNotificationQueries();
      },

      onError: (
        mutationError
      ) => {
        toast.error(
          mutationError
            ?.response
            ?.data
            ?.message ||
            'Bildirim güncellenemedi'
        );
      },
    });

  // ====================================================
  // MARK ALL AS READ
  // ====================================================

  const markAllAsRead =
    useMutation({
      mutationFn: () =>
        notificationApi.markAllAsRead(),

      onSuccess: async () => {
        await refreshNotificationQueries();

        toast.success(
          'Tüm bildirimler okundu olarak işaretlendi'
        );
      },

      onError: (
        mutationError
      ) => {
        toast.error(
          mutationError
            ?.response
            ?.data
            ?.message ||
            'İşlem başarısız'
        );
      },
    });

  // ====================================================
  // DELETE
  // ====================================================

  const deleteNotification =
    useMutation({
      mutationFn: (
        id
      ) =>
        notificationApi.delete(
          id
        ),

      onSuccess: async () => {
        setDeleteDialog(
          null
        );

        await refreshNotificationQueries();

        toast.success(
          'Bildirim silindi'
        );
      },

      onError: (
        mutationError
      ) => {
        toast.error(
          mutationError
            ?.response
            ?.data
            ?.message ||
            'Bildirim silinemedi'
        );
      },
    });

  // ====================================================
  // DELETE ALL
  // ====================================================

  const deleteAll =
    useMutation({
      mutationFn: () =>
        notificationApi.deleteAll(),

      onSuccess: async () => {
        setDeleteDialog(
          null
        );

        await refreshNotificationQueries();

        setPage(1);

        toast.success(
          'Tüm bildirimler silindi'
        );
      },

      onError: (
        mutationError
      ) => {
        toast.error(
          mutationError
            ?.response
            ?.data
            ?.message ||
            'İşlem başarısız'
        );
      },
    });

  // ====================================================
  // PAGINATION SAFETY
  // ====================================================

  useEffect(() => {
    if (
      !pagination
    ) {
      return;
    }

    const totalPages =
      Number(
        pagination.totalPages
      ) || 1;

    if (
      page >
      totalPages
    ) {
      setPage(
        totalPages
      );
    }
  }, [
    pagination,
    page,
  ]);

  // ====================================================
  // HANDLERS
  // ====================================================

  const handleMarkAsRead =
    (
      notification
    ) => {
      if (
        !notification?.id ||
        notification.read
      ) {
        return;
      }

      markAsRead.mutate(
        notification.id
      );
    };

  const handleDelete =
    (
      notification
    ) => {
      if (
        !notification?.id ||
        deleteNotification.isPending ||
        deleteAll.isPending
      ) {
        return;
      }

      setDeleteDialog({
        type:
          'single',

        notification,
      });
    };

  const handleDeleteAll =
    () => {
      if (
        deleteNotification.isPending ||
        deleteAll.isPending
      ) {
        return;
      }

      setDeleteDialog({
        type:
          'all',
      });
    };

  const handleCloseDeleteDialog =
    () => {
      if (
        deleteNotification.isPending ||
        deleteAll.isPending
      ) {
        return;
      }

      setDeleteDialog(
        null
      );
    };

  const handleConfirmDelete =
    () => {
      if (
        !deleteDialog
      ) {
        return;
      }

      if (
        deleteDialog.type ===
        'single'
      ) {
        const notificationId =
          deleteDialog
            .notification
            ?.id;

        if (
          !notificationId ||
          deleteNotification.isPending
        ) {
          return;
        }

        deleteNotification.mutate(
          notificationId
        );

        return;
      }

      if (
        deleteAll.isPending
      ) {
        return;
      }

      deleteAll.mutate();
    };

  useEffect(() => {
    if (
      !deleteDialog
    ) {
      return undefined;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      'hidden';

    const handleKeyDown =
      (
        event
      ) => {
        if (
          event.key ===
            'Escape' &&
          !deleteNotification.isPending &&
          !deleteAll.isPending
        ) {
          setDeleteDialog(
            null
          );
        }
      };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    deleteDialog,
    deleteNotification.isPending,
    deleteAll.isPending,
  ]);

  // ====================================================
  // LOADING
  // ====================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">

        <Loader text="Bildirimler yükleniyor..." />

      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (
    error
  ) {
    return (
      <Error
        title="Bildirimler yüklenemedi"
        message={
          error
            ?.response
            ?.data
            ?.message ||
          error?.message ||
          'Bildirimler alınırken bir hata oluştu.'
        }
        error={
          error
        }
        onRetry={() =>
          refetch()
        }
      />
    );
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <Link
            to="/dashboard"
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

            Dashboard
          </Link>

          <div className="mt-3 flex items-start gap-3">

            <div
              className="
                relative
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-blue-50
                text-blue-600
                dark:bg-blue-500/[0.08]
                dark:text-blue-400
              "
            >
              <BellRing size={21} />

              {hasUnread && (
                <span
                  className="
                    absolute
                    -right-1
                    -top-1
                    flex
                    h-5
                    min-w-5
                    items-center
                    justify-center
                    rounded-full
                    bg-red-500
                    px-1
                    text-[9px]
                    font-bold
                    text-white
                  "
                >
                  {unreadCount >
                  99
                    ? '99+'
                    : unreadCount}
                </span>
              )}

            </div>

            <div>

              <h1
                className="
                  text-2xl
                  font-semibold
                  tracking-[-0.035em]
                  text-gray-900
                  dark:text-white
                "
              >
                Bildirimler
              </h1>

              <p
                className="
                  mt-1
                  max-w-2xl
                  text-sm
                  leading-6
                  text-gray-500
                  dark:text-slate-400
                "
              >
              Görev, dava, danışmanlık, duruşma, toplantı ve sistem bildirimlerinizi takip edin.
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">

                <Badge variant="default">
                  Toplam{' '}
                  {pagination?.total ||
                    0}
                </Badge>

                {hasUnread && (
                  <Badge
                    variant="warning"
                    dot
                  >
                    Bu sayfada {unreadCount} okunmamış
                  </Badge>
                )}

              </div>

            </div>

          </div>

        </div>

        {/* ACTIONS */}

        <div className="flex flex-wrap gap-2 sm:pt-7">

          {hasUnread && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                markAllAsRead.mutate()
              }
              loading={
                markAllAsRead.isPending
              }
              disabled={
                markAllAsRead.isPending ||
                deleteAll.isPending
              }
            >
              <CheckCheck className="h-4 w-4" />

              Tümünü Okundu Yap
            </Button>
          )}

          {notifications.length >
            0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={
                handleDeleteAll
              }
              loading={
                deleteAll.isPending
              }
              disabled={
                deleteAll.isPending ||
                markAllAsRead.isPending
              }
            >
              <Trash2 className="h-4 w-4" />

              Tümünü Sil
            </Button>
          )}

        </div>

      </div>

      {/* ==================================================
          LIST
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="flex items-center justify-between">

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Bildirim Akışı
              </h2>

              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                En yeni bildirimler üstte gösterilir.
              </p>

            </div>

            {isFetching &&
              !isLoading && (
                <span className="text-xs text-blue-500 dark:text-blue-400">
                  Güncelleniyor...
                </span>
              )}

          </div>

        </Card.Header>

        <Card.Body className="p-0">

          {notifications.length ===
          0 ? (
            <div className="py-8">

              <Empty
                icon={BellOff}
                title="Bildirim yok"
                description="Yeni bildirimler geldiğinde burada görüntülenecek."
              />

            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

              {notifications.map(
                (
                  notification
                ) => {
                  const config =
  getTypeConfig(
    notification
  );

                  const TypeIcon =
                    config.icon;

                  return (
                    <div
                      key={
                        notification.id
                      }
                      className={`
                        group
                        relative
                        p-4
                        transition
                        sm:p-5
                        ${
                          notification.read
                            ? 'bg-white hover:bg-gray-50/70 dark:bg-transparent dark:hover:bg-white/[0.02]'
                            : 'bg-blue-50/60 hover:bg-blue-50 dark:bg-blue-500/[0.035] dark:hover:bg-blue-500/[0.05]'
                        }
                      `}
                    >

                      {/* UNREAD INDICATOR */}

                      {!notification.read && (
                        <div
                          className="
                            absolute
                            bottom-0
                            left-0
                            top-0
                            w-[3px]
                            bg-blue-500
                          "
                        />
                      )}

                      <div className="flex items-start gap-3 sm:gap-4">

                        {/* TYPE ICON */}

                        <div
                          className={`
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            ${config.iconClass}
                          `}
                        >
                          <TypeIcon size={18} />
                        </div>

                        {/* CONTENT */}

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                            <div className="min-w-0">

                              <div className="flex flex-wrap items-center gap-2">

                                <p
                                  className={`
                                    text-sm
                                    text-gray-900
                                    dark:text-white
                                    ${
                                      notification.read
                                        ? 'font-medium'
                                        : 'font-semibold'
                                    }
                                  `}
                                >
                                  {cleanNotificationTitle(
                                    notification.title
                                  )}
                                </p>

                                {!notification.read && (
                                  <span
                                    className="
                                      h-2
                                      w-2
                                      shrink-0
                                      rounded-full
                                      bg-blue-500
                                    "
                                    title="Okunmamış"
                                  />
                                )}

                              </div>

                              {notification.message && (
                                <p
                                  className="
                                    mt-1.5
                                    max-w-3xl
                                    text-sm
                                    leading-6
                                    text-gray-600
                                    dark:text-slate-400
                                  "
                                >
                                  {notification.message}
                                </p>
                              )}

                              {/* META */}

                              <div className="mt-3 flex flex-wrap items-center gap-2">

                                <Badge
                                  variant={
                                    config.variant
                                  }
                                >
                                  {config.label}
                                </Badge>

                                {!notification.read && (
                                  <Badge
                                    variant="warning"
                                    dot
                                  >
                                    Yeni
                                  </Badge>
                                )}

                                <span className="text-xs text-gray-400 dark:text-slate-600">
                                  {dayjs(
                                    notification.created_at
                                  ).fromNow()}
                                </span>

                                <span className="hidden text-xs text-gray-300 dark:text-slate-700 sm:inline">
                                  ·
                                </span>

                                <span className="hidden text-xs text-gray-400 dark:text-slate-600 sm:inline">
                                  {formatDateTime(
                                    notification.created_at
                                  )}
                                </span>

                              </div>

                            </div>

                            {/* ACTIONS */}

                            <div className="flex shrink-0 items-center gap-1">

                              {!notification.read && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMarkAsRead(
                                      notification
                                    )
                                  }
                                  disabled={
                                    markAsRead.isPending
                                  }
                                  className="
                                    inline-flex
                                    h-8
                                    w-8
                                    items-center
                                    justify-center
                                    rounded-lg
                                    text-gray-400
                                    transition
                                    hover:bg-blue-50
                                    hover:text-blue-600
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                    dark:hover:bg-blue-500/[0.08]
                                    dark:hover:text-blue-400
                                  "
                                  title="Okundu olarak işaretle"
                                  aria-label="Okundu olarak işaretle"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              )}

                              {notification.link && (
                                <Link
                                  to={
                                    notification.link
                                  }
                                  onClick={() => {
                                    if (
                                      !notification.read
                                    ) {
                                      handleMarkAsRead(
                                        notification
                                      );
                                    }
                                  }}
                                  className="
                                    inline-flex
                                    h-8
                                    w-8
                                    items-center
                                    justify-center
                                    rounded-lg
                                    text-gray-400
                                    transition
                                    hover:bg-gray-100
                                    hover:text-blue-600
                                    dark:hover:bg-white/[0.05]
                                    dark:hover:text-blue-400
                                  "
                                  title="İlgili kaydı aç"
                                  aria-label="İlgili kaydı aç"
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    notification
                                  )
                                }
                                disabled={
                                  deleteNotification.isPending
                                }
                                className="
                                  inline-flex
                                  h-8
                                  w-8
                                  items-center
                                  justify-center
                                  rounded-lg
                                  text-gray-400
                                  transition
                                  hover:bg-red-50
                                  hover:text-red-600
                                  disabled:cursor-not-allowed
                                  disabled:opacity-50
                                  dark:hover:bg-red-500/[0.08]
                                  dark:hover:text-red-400
                                "
                                title="Bildirimi sil"
                                aria-label="Bildirimi sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>

                            </div>

                          </div>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </Card.Body>

        {/* ==================================================
            PAGINATION
        ================================================== */}

        {pagination &&
          pagination.totalPages >
            1 && (
            <Card.Footer>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-sm text-gray-500 dark:text-slate-500">
                  Toplam{' '}
                  <span className="font-medium text-gray-700 dark:text-slate-300">
                    {pagination.total}
                  </span>{' '}
                  bildirim
                </p>

                <div className="flex items-center gap-2">

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      page <= 1 ||
                      isFetching
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          Math.max(
                            1,
                            current - 1
                          )
                      )
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />

                    Önceki
                  </Button>

                  <span className="min-w-20 text-center text-sm text-gray-500 dark:text-slate-400">
                    {page} /{' '}
                    {
                      pagination.totalPages
                    }
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      page >=
                        pagination.totalPages ||
                      isFetching
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          Math.min(
                            pagination.totalPages,
                            current + 1
                          )
                      )
                    }
                  >
                    Sonraki

                    <ChevronRight className="h-4 w-4" />
                  </Button>

                </div>

              </div>

            </Card.Footer>
          )}

      </Card>

      {deleteDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">

          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Silme penceresini kapat"
            disabled={
              deleteNotification.isPending ||
              deleteAll.isPending
            }
            onClick={
              handleCloseDeleteDialog
            }
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-delete-dialog-title"
            aria-describedby="notification-delete-dialog-description"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]"
          >
            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/[0.10] dark:text-red-400">
                  <Trash2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">

                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                    Bildirim silme onayı
                  </p>

                  <h2
                    id="notification-delete-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    {deleteDialog.type ===
                    'all'
                      ? 'Tüm bildirimleri sil'
                      : 'Bildirimi sil'}
                  </h2>

                  <p
                    id="notification-delete-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    {deleteDialog.type ===
                    'all'
                      ? 'Bildirim geçmişinizdeki tüm kayıtlar için bu işlemi onaylayın.'
                      : (
                        <>
                          <span className="font-medium text-gray-700 dark:text-slate-200">
                            {cleanNotificationTitle(
                              deleteDialog
                                .notification
                                ?.title
                            )}
                          </span>{' '}
                          bildirimi için bu işlemi onaylayın.
                        </>
                      )}
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
                      {deleteDialog.type ===
                      'all'
                        ? 'Tüm bildirimler silinecek'
                        : 'Bildirim kaydı silinecek'}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-900/80 dark:text-red-200/80">
                      {deleteDialog.type ===
                      'all'
                        ? 'Mevcut bildirim geçmişiniz temizlenecek ve bu kayıtlar bildirim ekranında artık görüntülenmeyecektir.'
                        : 'Seçili bildirim, bildirim akışınızdan kaldırılacaktır.'}
                    </p>

                  </div>

                </div>

              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">

                <p className="text-sm leading-6 text-gray-600 dark:text-slate-300">
                  {deleteDialog.type ===
                  'all'
                    ? 'Bu işlem tüm bildirimleri etkiler. Devam etmeden önce işlemi kontrol edin.'
                    : 'Devam etmeden önce doğru bildirimi seçtiğinizden emin olun.'}
                </p>

              </div>

            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.015] sm:flex-row sm:justify-end">

              <Button
                type="button"
                variant="secondary"
                disabled={
                  deleteNotification.isPending ||
                  deleteAll.isPending
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
                  deleteNotification.isPending ||
                  deleteAll.isPending
                }
                disabled={
                  deleteNotification.isPending ||
                  deleteAll.isPending
                }
                onClick={
                  handleConfirmDelete
                }
              >
                <Trash2 className="h-4 w-4" />

                {deleteDialog.type ===
                'all'
                  ? 'Tümünü Sil'
                  : 'Bildirimi Sil'}
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default NotificationsPage;