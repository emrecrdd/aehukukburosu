import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  Bell,
  CheckCheck,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  useTheme,
} from '../../app/providers/theme.provider.jsx';

import {
  useUnreadCount,
  useNotifications,
  useMarkAllAsRead,
} from '../../features/notification/notification.hook.js';

import {
  useSocket,
} from '../../hooks/useSocket.js';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/tr';

import toast from 'react-hot-toast';

dayjs.extend(
  relativeTime
);

dayjs.locale(
  'tr'
);

// ======================================================
// PAGE META
// ======================================================

const PAGE_TITLES = {
  '/dashboard': 'Genel Bakış',
  '/clients': 'Müvekkiller',
  '/cases': 'Davalar',
  '/consultations': 'Danışmanlıklar',
  '/documents': 'Belgeler',
  '/templates': 'Şablonlar',
  '/meetings': 'Toplantılar',
  '/tasks': 'Görevler',
  '/calendar': 'Takvim',
  '/finance': 'Finans',
  '/ai': 'AI Asistan',
  '/search': 'Global Arama',
  '/settings': 'Ayarlar',
  '/users': 'Kullanıcılar',
  '/audit-logs': 'Denetim Logları',
  '/notifications': 'Bildirimler',
  '/chat': 'Sohbetler',
  '/profile': 'Profil',
};

const BREADCRUMBS = {
  '/dashboard': 'Çalışma Alanı / Genel Bakış',

  '/clients':
    'Müvekkiller / Listeleme',

  '/clients/create':
    'Müvekkiller / Yeni Müvekkil',

  '/cases':
    'Davalar / Listeleme',

  '/cases/create':
    'Davalar / Yeni Dava',

  '/consultations':
    'Danışmanlıklar / Listeleme',

  '/consultations/create':
    'Danışmanlıklar / Yeni Danışmanlık',

  '/documents':
    'Belgeler / Listeleme',

  '/documents/create':
    'Belgeler / Yeni Belge',

  '/templates':
    'Şablonlar / Listeleme',

  '/templates/create':
    'Şablonlar / Yeni Şablon',

  '/meetings':
    'Toplantılar / Listeleme',

  '/meetings/create':
    'Toplantılar / Yeni Toplantı',

  '/tasks':
    'Görevler / Listeleme',

  '/tasks/create':
    'Görevler / Yeni Görev',

  '/calendar':
    'Takvim / Genel Görünüm',

  '/finance':
    'Finans / Özet',

  '/ai':
    'AI Asistan / Çalışma Alanı',

  '/search':
    'Global Arama / Sonuçlar',

  '/settings':
    'Ayarlar / Genel',

  '/users':
    'Yönetim / Kullanıcılar',

  '/audit-logs':
    'Yönetim / Denetim Logları',

  '/notifications':
    'Bildirimler / Tümü',

  '/chat':
    'Sohbetler / Ofis İletişimi',

  '/profile':
    'Profil / Bilgilerim',
};

// ======================================================
// HELPERS
// ======================================================

const getPageInfo = (
  path
) => {
  if (
    PAGE_TITLES[
      path
    ]
  ) {
    return {
      title:
        PAGE_TITLES[
          path
        ],

      breadcrumb:
        BREADCRUMBS[
          path
        ] ||
        PAGE_TITLES[
          path
        ],
    };
  }

  const segments =
    path
      .split('/')
      .filter(
        Boolean
      );

  const basePath =
    segments.length >
    0
      ? `/${segments[0]}`
      : '/dashboard';

  if (
    PAGE_TITLES[
      basePath
    ]
  ) {
    const isCreate =
      segments.includes(
        'create'
      );

    const isEdit =
      segments.includes(
        'edit'
      );

    const suffix =
      isCreate
        ? 'Yeni Kayıt'
        : isEdit
          ? 'Düzenleme'
          : 'Detay';

    return {
      title:
        PAGE_TITLES[
          basePath
        ],

      breadcrumb:
        `${PAGE_TITLES[basePath]} / ${suffix}`,
    };
  }

  return {
    title:
      'Çalışma Alanı',

    breadcrumb:
      'Derkenar',
  };
};

const getRoleLabel = (
  role
) => {
  const labels = {
    admin:
      'Yönetici',

    lawyer:
      'Avukat',

    secretary:
      'Sekreter',

    intern:
      'Stajyer',
  };

  return (
    labels[role] ||
    'Kullanıcı'
  );
};

const getInitials = (
  user
) => {
  const first =
    user
      ?.first_name
      ?.trim()
      ?.[0] ||
    '';

  const last =
    user
      ?.last_name
      ?.trim()
      ?.[0] ||
    '';

  return (
    `${first}${last}`.toUpperCase() ||
    'DK'
  );
};

// ======================================================
// COMPONENT
// ======================================================

const Topbar = ({
  onMenuClick,
}) => {
  const {
    user,
    logout,
  } =
    useAuth();

  const {
    theme,
    toggleTheme,
  } =
    useTheme();

  const location =
    useLocation();

  const navigate =
    useNavigate();

  const [
    showUserMenu,
    setShowUserMenu,
  ] =
    useState(
      false
    );

  const [
    showNotifications,
    setShowNotifications,
  ] =
    useState(
      false
    );

  const [
    searchValue,
    setSearchValue,
  ] =
    useState('');

  const notificationRef =
    useRef(
      null
    );

  const userMenuRef =
    useRef(
      null
    );

  const {
    on,
    off,
    isConnected,
  } =
    useSocket();

  const {
    data:
      unreadCount = 0,

    refetch:
      refetchUnread,
  } =
    useUnreadCount();

  const {
    data:
      notificationsData,

    refetch:
      refetchNotifications,
  } =
    useNotifications({
      limit: 5,
    });

  const markAllAsRead =
    useMarkAllAsRead();

  const notifications =
    Array.isArray(
      notificationsData
        ?.data
        ?.data
    )
      ? notificationsData
          .data
          .data
      : [];

  const {
    title:
      pageTitle,

    breadcrumb,
  } =
    getPageInfo(
      location.pathname
    );

  // ======================================================
  // SOCKET
  // ======================================================

  useEffect(() => {
    const handleNotification =
      (
        data
      ) => {
        refetchUnread();
        refetchNotifications();

        toast.success(
          data?.title ||
          'Yeni bildirim'
        );
      };

    on(
      'notification',
      handleNotification
    );

    return () => {
      off(
        'notification',
        handleNotification
      );
    };
  }, [
    on,
    off,
    refetchUnread,
    refetchNotifications,
  ]);

  // ======================================================
  // CLICK OUTSIDE
  // ======================================================

  useEffect(() => {
    const handleClickOutside =
      (
        event
      ) => {
        if (
          notificationRef.current &&
          !notificationRef.current.contains(
            event.target
          )
        ) {
          setShowNotifications(
            false
          );
        }

        if (
          userMenuRef.current &&
          !userMenuRef.current.contains(
            event.target
          )
        ) {
          setShowUserMenu(
            false
          );
        }
      };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
  }, []);

  // ======================================================
  // SEARCH
  // ======================================================

  const handleSearchSubmit =
    (
      event
    ) => {
      event.preventDefault();

      const query =
        searchValue.trim();

      if (!query) {
        navigate(
          '/search'
        );

        return;
      }

      navigate(
        `/search?q=${encodeURIComponent(
          query
        )}`
      );
    };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <header
      className="
        sticky top-0 z-20
        border-b border-gray-200/70
        bg-white/90
        backdrop-blur-xl
        dark:border-white/[0.06]
        dark:bg-[#08162b]/90
      "
    >
      <div
        className="
          flex h-16 items-center justify-between
          gap-3 px-3
          md:h-[76px] md:px-6
          xl:px-8
        "
      >

        {/* ==================================================
            LEFT
        ================================================== */}

        <div className="flex min-w-0 items-center gap-3">

          <button
            type="button"
            onClick={
              onMenuClick
            }
            className="
              inline-flex h-9 w-9 shrink-0
              items-center justify-center
              rounded-lg
              text-gray-500
              transition
              hover:bg-gray-100
              hover:text-gray-900
              dark:text-slate-400
              dark:hover:bg-white/[0.05]
              dark:hover:text-white
              lg:hidden
            "
            aria-label="Menüyü aç"
          >
            <Menu size={19} />
          </button>

          <div className="min-w-0">

            <h1
              className="
                truncate text-[15px] font-semibold
                tracking-[-0.02em]
                text-gray-900
                dark:text-white
                md:text-xl
              "
            >
              {pageTitle}
            </h1>

            <p
             className="
  mt-0.5 hidden truncate
  text-[11px]
  font-semibold
  tracking-[0.02em]
  text-gray-400
  dark:text-slate-500
  md:block
"
            >
              {breadcrumb}
            </p>

          </div>

        </div>

        {/* ==================================================
            CENTER / SEARCH
        ================================================== */}

        <form
          data-onboarding="topbar-search"
          onSubmit={
            handleSearchSubmit
          }
          className="
            mx-auto hidden w-full max-w-[430px]
            lg:block
          "
        >
          <div
            className="
              group flex h-10 items-center gap-2.5
              rounded-xl
              border border-gray-200
              bg-gray-50/80
              px-3.5
              transition-all
              focus-within:border-amber-300
focus-within:bg-white
focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.08)]
              dark:border-white/[0.07]
              dark:bg-white/[0.035]
              dark:focus-within:border-amber-400/35
              dark:focus-within:bg-white/[0.05]
            "
          >

            <Search
              size={17}
              className="
                shrink-0 text-gray-400
                transition-colors
                group-focus-within:text-amber-500
                dark:text-slate-500
              "
            />

            <input
              type="search"
              value={
                searchValue
              }
              onChange={(
                event
              ) =>
                setSearchValue(
                  event.target.value
                )
              }
              placeholder="Dava, müvekkil, belge veya dosya no ara..."
              className="
                min-w-0 flex-1
                bg-transparent
                text-sm
                text-gray-900
                outline-none
                placeholder:text-gray-400
                dark:text-white
                dark:placeholder:text-slate-500
              "
            />

            <button
              type="submit"
              className="
                hidden rounded-md
                border border-gray-200
                bg-white px-2 py-1
                text-[10px] font-semibold
                text-gray-400
                shadow-sm
                transition
                hover:text-gray-600
                dark:border-white/[0.08]
                dark:bg-white/[0.04]
                dark:text-slate-500
                xl:inline-flex
              "
            >
              Ara
            </button>

          </div>
        </form>

        {/* ==================================================
            RIGHT
        ================================================== */}

        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">

          {/* MOBILE SEARCH */}

          <Link
            to="/search"
            className="
              inline-flex h-9 w-9
              items-center justify-center
              rounded-lg
              text-gray-500
              transition
              hover:bg-gray-100
              hover:text-gray-900
              dark:text-slate-400
              dark:hover:bg-white/[0.05]
              dark:hover:text-white
              lg:hidden
            "
            aria-label="Ara"
          >
            <Search size={18} />
          </Link>

          {/* CONNECTION */}

          <div
            data-onboarding="topbar-connection"
            className={`
              hidden h-8 items-center gap-2
              rounded-lg border px-2.5
              text-[10px] font-semibold
              sm:flex
              ${
                isConnected
                  ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/15 dark:bg-emerald-500/[0.07] dark:text-emerald-400'
                  : 'border-red-200/70 bg-red-50 text-red-600 dark:border-red-500/15 dark:bg-red-500/[0.07] dark:text-red-400'
              }
            `}
          >
            {isConnected ? (
              <Wifi size={13} />
            ) : (
              <WifiOff size={13} />
            )}

            <span className="hidden xl:inline">
              {isConnected
                ? 'Sistem Aktif'
                : 'Bağlantı Yok'}
            </span>

          </div>

          {/* THEME */}

          <button
            data-onboarding="topbar-theme"
            type="button"
            onClick={
              toggleTheme
            }
            className="
              inline-flex h-9 w-9
              items-center justify-center
              rounded-lg
              border border-transparent
              text-gray-500
              transition
              hover:border-gray-200
              hover:bg-gray-50
              hover:text-gray-900
              dark:text-slate-400
              dark:hover:border-white/[0.06]
              dark:hover:bg-white/[0.04]
              dark:hover:text-white
            "
            aria-label="Temayı değiştir"
          >
            {theme ===
            'dark' ? (
              <Moon
                size={18}
              />
            ) : (
              <Sun
                size={18}
              />
            )}
          </button>

          {/* NOTIFICATIONS */}

          <div
            className="relative"
            ref={
              notificationRef
            }
          >
            <button
              data-onboarding="topbar-notifications"
              type="button"
              onClick={() => {
                setShowNotifications(
                  (
                    current
                  ) =>
                    !current
                );

                setShowUserMenu(
                  false
                );

                refetchUnread();
              }}
              className="
                relative inline-flex
                h-9 w-9
                items-center justify-center
                rounded-lg
                text-gray-500
                transition
                hover:bg-gray-100
                hover:text-gray-900
                dark:text-slate-400
                dark:hover:bg-white/[0.05]
                dark:hover:text-white
              "
              aria-label="Bildirimler"
            >
              <Bell size={18} />

              {Number(
                unreadCount
              ) >
                0 && (
                <span
                  className="
                    absolute right-0.5 top-0.5
                    flex min-h-[15px] min-w-[15px]
                    items-center justify-center
                    rounded-full
                    border-2 border-white
                    bg-red-500
                    px-[3px]
                    text-[8px] font-bold
                    leading-none text-white
                    dark:border-[#08162b]
                  "
                >
                  {Number(
                    unreadCount
                  ) >
                  99
                    ? '99+'
                    : unreadCount}
                </span>
              )}

            </button>

            {showNotifications && (
              <div
                className="
                  absolute right-0 mt-2
                  w-[340px]
                  max-w-[calc(100vw-16px)]
                  overflow-hidden
                  rounded-2xl
                  border border-gray-200
                  bg-white
                  shadow-[0_20px_60px_rgba(15,23,42,0.15)]
                  dark:border-white/[0.08]
                  dark:bg-[#0b1b33]
                "
              >

                {/* HEADER */}

                <div
                  className="
                    flex items-center justify-between
                    border-b border-gray-100
                    px-4 py-3
                    dark:border-white/[0.06]
                  "
                >

                  <div>

                    <h3
                      className="
                        text-sm font-semibold
                        text-gray-900
                        dark:text-white
                      "
                    >
                      Bildirimler
                    </h3>

                    <p className="mt-0.5 text-[10px] text-gray-400 dark:text-slate-500">
                      {Number(
                        unreadCount
                      ) >
                      0
                        ? `${unreadCount} okunmamış bildirim`
                        : 'Yeni bildiriminiz yok'}
                    </p>

                  </div>

                  {Number(
                    unreadCount
                  ) >
                    0 && (
                    <button
                      type="button"
                      onClick={() =>
                        markAllAsRead.mutate()
                      }
                      disabled={
                        markAllAsRead.isPending
                      }
                      className="
                        inline-flex items-center gap-1
                        rounded-lg px-2 py-1.5
                        text-[10px] font-semibold
                        text-blue-600
                        transition
                        hover:bg-blue-50
                        disabled:opacity-50
                        dark:text-blue-400
                        dark:hover:bg-blue-500/[0.08]
                      "
                    >
                      <CheckCheck size={13} />
                      Tümünü Okundu Yap
                    </button>
                  )}

                </div>

                {/* LIST */}

                <div className="max-h-[360px] overflow-y-auto">

                  {notifications.length ===
                  0 ? (
                    <div className="px-5 py-10 text-center">

                      <div
                        className="
                          mx-auto flex h-10 w-10
                          items-center justify-center
                          rounded-full
                          bg-gray-100
                          text-gray-400
                          dark:bg-white/[0.05]
                          dark:text-slate-500
                        "
                      >
                        <Bell size={18} />
                      </div>

                      <p
                        className="
                          mt-3 text-sm font-medium
                          text-gray-700
                          dark:text-slate-300
                        "
                      >
                        Bildirim yok
                      </p>

                      <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                        Yeni gelişmeler burada görünecek.
                      </p>

                    </div>
                  ) : (
                    notifications.map(
                      (
                        notification
                      ) => (
                        <Link
                          key={
                            notification.id
                          }
                          to={
                            notification.link ||
                            '/notifications'
                          }
                          onClick={() => {
                            setShowNotifications(
                              false
                            );

                            refetchUnread();
                          }}
                          className={`
                            block border-b
                            border-gray-100
                            px-4 py-3
                            transition
                            last:border-b-0
                            hover:bg-gray-50
                            dark:border-white/[0.05]
                            dark:hover:bg-white/[0.035]
                            ${
                              !notification.read
                                ? 'bg-blue-50/50 dark:bg-blue-500/[0.035]'
                                : ''
                            }
                          `}
                        >
                          <div className="flex gap-3">

                            <span
                              className={`
                                mt-1 h-2 w-2 shrink-0
                                rounded-full
                                ${
                                  !notification.read
                                    ? 'bg-blue-500'
                                    : 'bg-gray-200 dark:bg-slate-700'
                                }
                              `}
                            />

                            <div className="min-w-0 flex-1">

                              <p
                                className="
                                  truncate text-sm
                                  font-semibold
                                  text-gray-900
                                  dark:text-white
                                "
                              >
                                {notification.title}
                              </p>

                              <p
                                className="
                                  mt-1 line-clamp-2
                                  text-xs leading-5
                                  text-gray-500
                                  dark:text-slate-400
                                "
                              >
                                {notification.message}
                              </p>

                              <p
                                className="
                                  mt-1.5 text-[10px]
                                  font-medium
                                  text-gray-400
                                  dark:text-slate-600
                                "
                              >
                                {dayjs(
                                  notification.created_at
                                ).fromNow()}
                              </p>

                            </div>

                          </div>
                        </Link>
                      )
                    )
                  )}

                </div>

                {/* FOOTER */}

                <div
                  className="
                    border-t border-gray-100
                    bg-gray-50/70
                    px-3 py-2
                    dark:border-white/[0.06]
                    dark:bg-white/[0.02]
                  "
                >
                  <Link
                    to="/notifications"
                    onClick={() =>
                      setShowNotifications(
                        false
                      )
                    }
                    className="
                      block rounded-lg
                      py-2 text-center
                      text-xs font-semibold
                      text-blue-600
                      transition
                      hover:bg-blue-50
                      dark:text-blue-400
                      dark:hover:bg-blue-500/[0.08]
                    "
                  >
                    Tüm Bildirimleri Gör
                  </Link>
                </div>

              </div>
            )}

          </div>

          {/* DIVIDER */}

          <div className="mx-0.5 hidden h-6 w-px bg-gray-200 dark:bg-white/[0.06] md:block" />

          {/* USER */}

          <div
            className="relative"
            ref={
              userMenuRef
            }
          >
            <button
              data-onboarding="topbar-user"
              type="button"
              onClick={() => {
                setShowUserMenu(
                  (
                    current
                  ) =>
                    !current
                );

                setShowNotifications(
                  false
                );
              }}
              className="
                flex items-center gap-2
                rounded-xl
                p-1
                pr-1.5
                transition
                hover:bg-gray-100
                dark:hover:bg-white/[0.04]
              "
            >

              <div
                className="
  flex h-8 w-8
  items-center justify-center
  rounded-lg
  border
  border-amber-400/20
  bg-[#0c2858]
  text-[10px] font-bold
  tracking-wide
  text-amber-100
  shadow-sm
  dark:bg-[#0c2858]
  md:h-9 md:w-9
  md:text-xs
"
              >
                {getInitials(
                  user
                )}
              </div>

              <div className="hidden max-w-[150px] text-left xl:block">

                <p
                  className="
                    truncate text-xs
                    font-semibold
                    text-gray-900
                    dark:text-white
                  "
                >
                  {user?.first_name}{' '}
                  {user?.last_name}
                </p>

                <p
                  className="
                    mt-0.5 text-[9px]
                    font-medium
                    uppercase
                    tracking-[0.1em]
                    text-gray-400
                    dark:text-slate-500
                  "
                >
                  {getRoleLabel(
                    user?.role
                  )}
                </p>

              </div>

              <ChevronDown
                size={13}
                className="hidden text-gray-400 xl:block"
              />

            </button>

            {showUserMenu && (
              <div
                className="
                  absolute right-0 mt-2
                  w-56 overflow-hidden
                  rounded-2xl
                  border border-gray-200
                  bg-white
                  p-1.5
                  shadow-[0_20px_50px_rgba(15,23,42,0.14)]
                  dark:border-white/[0.08]
                  dark:bg-[#0b1b33]
                "
              >

                <div
                  className="
                    border-b border-gray-100
                    px-3 py-3
                    dark:border-white/[0.06]
                  "
                >
                  <p
                    className="
                      text-sm font-semibold
                      text-gray-900
                      dark:text-white
                    "
                  >
                    {user?.first_name}{' '}
                    {user?.last_name}
                  </p>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    {user?.email ||
                      getRoleLabel(
                        user?.role
                      )}
                  </p>
                </div>

                <div className="py-1">

                  <Link
                    to="/settings"
                    onClick={() =>
                      setShowUserMenu(
                        false
                      )
                    }
                    className="
                      flex items-center gap-3
                      rounded-lg
                      px-3 py-2.5
                      text-sm font-medium
                      text-gray-700
                      transition
                      hover:bg-gray-50
                      hover:text-gray-900
                      dark:text-slate-300
                      dark:hover:bg-white/[0.04]
                      dark:hover:text-white
                    "
                  >
                    <User size={16} />

                    Profil ve Ayarlar
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(
                        false
                      );

                      logout();
                    }}
                    className="
                      flex w-full items-center gap-3
                      rounded-lg
                      px-3 py-2.5
                      text-sm font-medium
                      text-red-500
                      transition
                      hover:bg-red-50
                      dark:text-red-400
                      dark:hover:bg-red-500/[0.08]
                    "
                  >
                    <LogOut size={16} />

                    Çıkış Yap
                  </button>

                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </header>
  );
};

export default Topbar;