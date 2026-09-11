// Error.jsx
import {
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

import Button from '../ui/Button.jsx';

const Error = ({
  title = 'Bir hata oluştu',
  message = 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
  error = null,
  onRetry,
  className = '',
}) => {
  const isDev =
    import.meta.env.DEV;

  return (
    <div
      className={`rounded-2xl border border-red-200/70 bg-red-50/50 px-6 py-12 text-center dark:border-red-500/15 dark:bg-red-500/[0.04] ${className}`}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
        <AlertTriangle size={22} />
      </div>

      <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>

      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-gray-500 dark:text-slate-400">
        {message}
      </p>

      {error && isDev && (
        <div className="mx-auto mt-5 max-w-2xl rounded-xl border border-red-200 bg-white p-4 text-left dark:border-red-500/15 dark:bg-black/10">
          <p className="break-words font-mono text-xs leading-5 text-red-600 dark:text-red-400">
            {typeof error === 'string'
              ? error
              : error?.message ||
                JSON.stringify(
                  error,
                  null,
                  2
                )}
          </p>
        </div>
      )}

      {onRetry && (
        <div className="mt-5">
          <Button
            type="button"
            onClick={onRetry}
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tekrar Dene
          </Button>
        </div>
      )}
    </div>
  );
};

export default Error;