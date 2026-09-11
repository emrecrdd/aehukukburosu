// Empty.jsx
import {
  Inbox,
} from 'lucide-react';

const Empty = ({
  title = 'Veri bulunamadı',
  description = 'Henüz kayıt eklenmemiş',
  icon: Icon = Inbox,
  action,
  className = '',
}) => {
  return (
    <div
      className={`rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-12 text-center dark:border-white/[0.07] dark:bg-white/[0.02] ${className}`}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm ring-1 ring-gray-200 dark:bg-white/[0.04] dark:text-slate-500 dark:ring-white/[0.06]">
        <Icon size={22} />
      </div>

      <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>

      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-gray-500 dark:text-slate-400">
        {description}
      </p>

      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  );
};

export default Empty;