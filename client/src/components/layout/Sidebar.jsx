import {
  NavLink,
} from 'react-router-dom';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import DerkenarOnboarding from '../onboarding/DerkenarOnboarding.jsx';

import {
  ROLES,
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import {
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare2,
  ClipboardList,
  FileText,
  Files,
  FolderKanban,
  Gavel,
  LayoutDashboard,
  MessageCircle,
  Search,
  Settings,
  Info,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from 'lucide-react';

// ======================================================
// NAVIGATION
// ======================================================

const navigationGroups = [
  {
  label: 'Genel',

  items: [
    {
      path:
        '/dashboard',

      label:
        'Genel Bakış',

      icon:
        LayoutDashboard,

      permission:
        null,
    },

    {
      path:
        '/chat',

      label:
        'Sohbetler',

      icon:
        MessageCircle,

      permission:
        null,
    },
  ],
},
  


  {
    label:
      'Dosya Yönetimi',

    items: [
      {
        path:
          '/clients',

        label:
          'Müvekkiller',

        icon:
          Users,

        permission:
          PERMISSION_KEYS.VIEW_CLIENTS,
      },

      {
        path:
          '/cases',

        label:
          'Davalar',

        icon:
          FolderKanban,

        permission:
          PERMISSION_KEYS.VIEW_CASES,
      },

      {
        path:
          '/consultations',

        label:
          'Danışmanlıklar',

        icon:
          BriefcaseBusiness,

        permission:
          PERMISSION_KEYS.VIEW_CONSULTATIONS,
      },

      {
        path:
          '/documents',

        label:
          'Belgeler',

        icon:
          FileText,

        permission:
          PERMISSION_KEYS.VIEW_DOCUMENTS,
      },

      {
        path:
          '/templates',

        label:
          'Şablonlar',

        icon:
          Files,

        permission:
          PERMISSION_KEYS.VIEW_TEMPLATES,
      },
    ],
  },

  {
    label:
      'Operasyon',

    items: [
      {
        path:
          '/tasks',

        label:
          'Görevler',

        icon:
          CheckSquare2,

        permission:
          PERMISSION_KEYS.VIEW_TASKS,
      },
{
      path:
        '/performance',

      label:
        'Performans',

      icon:
        TrendingUp,

      permission:
        PERMISSION_KEYS.VIEW_OWN_PERFORMANCE,
    },

      {
        path:
          '/calendar',

        label:
          'Takvim',

        icon:
          CalendarDays,

        permission:
          PERMISSION_KEYS.VIEW_CALENDAR,
      },

      {
        path:
          '/meetings',

        label:
          'Toplantılar',

        icon:
          Gavel,

        permission:
          PERMISSION_KEYS.VIEW_MEETINGS,
      },

      {
        path:
          '/finance',

        label:
          'Finans',

        icon:
          WalletCards,

        permission:
          PERMISSION_KEYS.VIEW_FINANCE,
      },
    ],
  },

  {
    label:
      'Araçlar',

    items: [
      {
        path:
          '/ai',

        label:
          'AI Asistan',

        icon:
          Sparkles,

        permission:
          PERMISSION_KEYS.USE_AI,
      },

      {
        path:
          '/search',

        label:
          'Global Arama',

        icon:
          Search,

        permission:
          PERMISSION_KEYS.USE_SEARCH,
      },

      {
        path:
          '/settings',

        label:
          'Ayarlar',

        icon:
          Settings,

        permission:
          PERMISSION_KEYS.VIEW_SETTINGS,
      },

      {
        path:
          '/system-info',

        label:
          'Sistem Bilgileri',

        icon:
          Info,

        permission:
          null,
      },
    ],
  },
];

// ======================================================
// ADMIN NAVIGATION
// ======================================================

const adminItems = [
  {
    path:
      '/users',

    label:
      'Kullanıcılar',

    icon:
      ShieldCheck,
  },

  {
    path:
      '/audit-logs',

    label:
      'Denetim Logları',

    icon:
      ClipboardList,
  },
];

// ======================================================
// NAV ITEM
// ======================================================

const SidebarLink = ({
  item,
  onClick,
}) => {
  const Icon =
    item.icon;

  return (
    <NavLink
      to={
        item.path
      }
      onClick={
        onClick
      }
      data-onboarding={`nav-${item.path
        .replace(/^\//, '')
        .replace(/\//g, '-')}`}
      className="block"
    >
      {({
        isActive,
      }) => (
        <div
          className={`
            group
            relative
            mx-2
            flex
            h-10
            items-center
            gap-3
            rounded-lg
            px-3
            text-sm
            transition-all
            duration-150

            ${
              isActive
                ? 'bg-white/[0.09] text-white'
                : 'text-slate-300/75 hover:bg-white/[0.05] hover:text-white'
            }
          `}
        >
          {isActive && (
            <span
              className="
                absolute
                -left-2
                h-5
                w-[3px]
                rounded-r-full
                bg-amber-400
              "
            />
          )}

          <Icon
            size={18}
            strokeWidth={
              isActive
                ? 2.2
                : 1.8
            }
            className={
              isActive
                ? 'text-amber-300'
                : 'text-slate-400 transition-colors group-hover:text-slate-200'
            }
          />

          <span
            className={
              isActive
                ? 'font-semibold'
                : 'font-medium'
            }
          >
            {item.label}
          </span>
        </div>
      )}
    </NavLink>
  );
};

// ======================================================
// CONTENT
// ======================================================

const SidebarContent = ({
  user,
  onNavigate,
  mobile = false,
  onClose,
}) => {
  const isAdmin =
    user?.role ===
    ROLES.ADMIN;

  // ====================================================
  // PERMISSION FILTER
  // ====================================================

  const visibleGroups =
    navigationGroups
      .map(
        (
          group
        ) => {
          const visibleItems =
            group.items.filter(
              (
                item
              ) => {
                /*
                 * permission === null ise
                 * authenticated kullanıcıya açık.
                 */
                if (
                  !item.permission
                ) {
                  return Boolean(
                    user
                  );
                }

                return hasPermission(
                  user,
                  item.permission
                );
              }
            );

          return {
            ...group,

            items:
              visibleItems,
          };
        }
      )
      .filter(
        (
          group
        ) =>
          group.items.length >
          0
      );

  return (
    <div className="flex h-full flex-col">

      {/* ==================================================
          LOGO
      ================================================== */}

      <div className="flex h-[76px] shrink-0 items-center justify-between px-5">

       <div className="flex items-center gap-3">

  <img
    src="/favicon.svg"
    alt=""
    className="
      h-10
      w-10
      shrink-0
    "
  />

  <div>
    <h2
      className="
        text-[18px]
        font-bold
        uppercase
        tracking-[0.08em]
        text-white
      "
    >
      Derkenar
    </h2>

    <p
      className="
        mt-0.5
        text-[9px]
        font-semibold
        uppercase
        tracking-[0.16em]
        text-amber-300/75
      "
    >
      Hukuk Büro Yönetimi
    </p>
  </div>

</div>

        {mobile && (
          <button
            type="button"
            onClick={
              onClose
            }
            className="
              rounded-lg
              p-2
              text-slate-400
              transition
              hover:bg-white/[0.06]
              hover:text-white
            "
            aria-label="Menüyü kapat"
          >
            <X
              size={18}
            />
          </button>
        )}

      </div>

      <div className="mx-5 border-t border-white/[0.06]" />

      {/* ==================================================
          NAVIGATION
      ================================================== */}

      <nav className="flex-1 overflow-y-auto px-1 py-4">

        {visibleGroups.map(
          (
            group,
            groupIndex
          ) => (
            <div
              key={
                group.label
              }
              className={
                groupIndex ===
                0
                  ? ''
                  : 'mt-5'
              }
            >

              <p
                className="
                  mb-1.5
                  px-5
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.16em]
                  text-slate-500
                "
              >
                {group.label}
              </p>

              <div className="space-y-0.5">

                {group.items.map(
                  (
                    item
                  ) => (
                    <SidebarLink
                      key={
                        item.path
                      }
                      item={
                        item
                      }
                      onClick={
                        onNavigate
                      }
                    />
                  )
                )}

              </div>

            </div>
          )
        )}

        {/* ==================================================
            ADMIN
        ================================================== */}

        {isAdmin && (
          <div className="mt-5">

            <p
              className="
                mb-1.5
                px-5
                text-[9px]
                font-bold
                uppercase
                tracking-[0.16em]
                text-slate-500
              "
            >
              Yönetim
            </p>

            <div className="space-y-0.5">

              {adminItems.map(
                (
                  item
                ) => (
                  <SidebarLink
                    key={
                      item.path
                    }
                    item={
                      item
                    }
                    onClick={
                      onNavigate
                    }
                  />
                )
              )}

            </div>

          </div>
        )}

      </nav>

    </div>
  );
};

// ======================================================
// COMPONENT
// ======================================================

const Sidebar = ({
  open,
  onClose,
}) => {
  const {
    user,
  } =
    useAuth();

  return (
    <>

      {/* ==================================================
          DESKTOP
      ================================================== */}

      <aside
        className="
          fixed
          inset-y-0
          left-0
          z-30
          hidden
          w-64
          border-r
          border-white/[0.06]
          bg-[#081b3d]
          shadow-[8px_0_30px_rgba(2,12,27,0.08)]
          lg:block
        "
      >

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.13),transparent_34%),radial-gradient(circle_at_bottom,rgba(245,158,11,0.04),transparent_30%)]
          "
        />

        <div className="relative h-full">

          <SidebarContent
            user={
              user
            }
          />

        </div>

      </aside>

      {/* ==================================================
          MOBILE OVERLAY
      ================================================== */}

      <div
        onClick={
          onClose
        }
        className={`
          fixed
          inset-0
          z-40
          bg-slate-950/55
          backdrop-blur-[2px]
          transition-opacity
          duration-200
          lg:hidden

          ${
            open
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0'
          }
        `}
      />

      {/* ==================================================
          MOBILE SIDEBAR
      ================================================== */}

      <aside
        className={`
          fixed
          inset-y-0
          left-0
          z-50
          w-[286px]
          border-r
          border-white/[0.06]
          bg-[#081b3d]
          shadow-2xl
          transition-transform
          duration-300
          ease-out
          lg:hidden

          ${
            open
              ? 'translate-x-0'
              : '-translate-x-full'
          }
        `}
      >

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_35%)]
          "
        />

        <div className="relative h-full">

          <SidebarContent
            user={
              user
            }
            mobile
            onClose={
              onClose
            }
            onNavigate={
              onClose
            }
          />

        </div>

      </aside>

      <DerkenarOnboarding />

    </>
  );
};

export default Sidebar;