import {
  NavLink,
} from 'react-router-dom';

import {
  CalendarDays,
  CheckSquare2,
  FolderKanban,
  LayoutDashboard,
  Users,
} from 'lucide-react';

const items = [
  {
    path: '/dashboard',
    icon: LayoutDashboard,
    label: 'Ana Sayfa',
  },
  {
    path: '/cases',
    icon: FolderKanban,
    label: 'Davalar',
  },
  {
    path: '/clients',
    icon: Users,
    label: 'Müvekkiller',
  },
  {
    path: '/tasks',
    icon: CheckSquare2,
    label: 'Görevler',
  },
  {
    path: '/calendar',
    icon: CalendarDays,
    label: 'Takvim',
  },
];

const MobileNav = () => {
  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-30
        border-t border-gray-200/80
        bg-white/95
        pb-[env(safe-area-inset-bottom)]
        shadow-[0_-8px_30px_rgba(15,23,42,0.06)]
        backdrop-blur-xl
        dark:border-white/[0.06]
        dark:bg-[#08162b]/95
        lg:hidden
      "
    >
      <div className="grid h-[62px] grid-cols-5">

        {items.map(
          (
            item
          ) => {
            const Icon =
              item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="relative flex items-center justify-center"
              >
                {({
                  isActive,
                }) => (
                  <div
                    className={`
                      relative flex h-full w-full flex-col
                      items-center justify-center gap-1
                      transition-colors
                      ${
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-300'
                      }
                    `}
                  >

                    {isActive && (
                      <span className="absolute top-0 h-[2px] w-8 rounded-b-full bg-blue-600 dark:bg-blue-400" />
                    )}

                    <Icon
                      size={19}
                      strokeWidth={
                        isActive
                          ? 2.3
                          : 1.8
                      }
                    />

                    <span
                      className={`
                        text-[9px] leading-none
                        ${
                          isActive
                            ? 'font-semibold'
                            : 'font-medium'
                        }
                      `}
                    >
                      {item.label}
                    </span>

                  </div>
                )}
              </NavLink>
            );
          }
        )}

      </div>
    </nav>
  );
};

export default MobileNav;