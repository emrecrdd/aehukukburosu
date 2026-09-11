import {
  useMemo,
  useState,
} from 'react';

import {
  Search,
  X,
} from 'lucide-react';

const initials = (
  user
) =>
  [
    user?.first_name?.[0],
    user?.last_name?.[0],
  ]
    .filter(Boolean)
    .join('')
    .toUpperCase() ||
  'K';

const NewDirectChatModal = ({
  open,
  users,
  loading,
  opening,
  onClose,
  onSelect,
}) => {
  const [
    search,
    setSearch,
  ] =
    useState('');

  const filteredUsers =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLocaleLowerCase(
              'tr-TR'
            );

        if (!query) {
          return users;
        }

        return users.filter(
          (
            user
          ) => {
            const haystack =
              [
                user
                  ?.first_name,
                user
                  ?.last_name,
                user?.title,
              ]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase(
                  'tr-TR'
                );

            return haystack.includes(
              query
            );
          }
        );
      },
      [
        users,
        search,
      ]
    );

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Yeni Sohbet
            </h3>

            <p className="mt-0.5 text-[10px] text-gray-400 dark:text-slate-500">
              Aktif bir ofis çalışanı seç.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:text-slate-500 dark:hover:bg-white/[0.05] dark:hover:text-white"
            aria-label="Kapat"
          >
            <X
              size={17}
            />
          </button>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
            />

            <input
              type="search"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Çalışan ara..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100 dark:border-white/[0.07] dark:bg-white/[0.035] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-amber-400/30 dark:focus:ring-amber-500/10"
            />
          </div>
        </div>

        <div className="max-h-[360px] overflow-y-auto px-2 pb-3">
          {loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map(
                (
                  item
                ) => (
                  <div
                    key={
                      item
                    }
                    className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.04]"
                  />
                )
              )}
            </div>
          ) : filteredUsers.length ===
            0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400 dark:text-slate-500">
              Kullanıcı bulunamadı.
            </div>
          ) : (
            filteredUsers.map(
              (
                user
              ) => (
                <button
                  key={
                    user.id
                  }
                  type="button"
                  disabled={
                    opening
                  }
                  onClick={() =>
                    onSelect(
                      user
                    )
                  }
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/[0.04]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700 dark:bg-white/[0.06] dark:text-slate-300">
                    {initials(
                      user
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {user
                        .first_name}{' '}
                      {user
                        .last_name}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-slate-500">
                      {user
                        .title ||
                        'Ofis kullanıcısı'}
                    </p>
                  </div>
                </button>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default NewDirectChatModal;
