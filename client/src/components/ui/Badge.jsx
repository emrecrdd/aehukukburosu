const Badge = ({
  children,
  variant = 'default',
  className = '',
  dot = false,
  ...props
}) => {
  const variants = {
    default:
      'border-gray-200 bg-gray-50 text-gray-700 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-slate-300',

    primary:
      'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/15 dark:bg-blue-500/[0.08] dark:text-blue-300',

    success:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/15 dark:bg-emerald-500/[0.08] dark:text-emerald-300',

    danger:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-500/15 dark:bg-red-500/[0.08] dark:text-red-300',

    warning:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/15 dark:bg-amber-500/[0.08] dark:text-amber-300',

    info:
      'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/15 dark:bg-violet-500/[0.08] dark:text-violet-300',
  };

  const dotColors = {
    default:
      'bg-gray-400',

    primary:
      'bg-blue-500',

    success:
      'bg-emerald-500',

    danger:
      'bg-red-500',

    warning:
      'bg-amber-500',

    info:
      'bg-violet-500',
  };

  return (
    <span
      className={`
        inline-flex
        w-fit
        items-center
        gap-1.5
        rounded-md
        border
        px-2
        py-1
        text-[11px]
        font-semibold
        leading-none
        whitespace-nowrap
        ${variants[variant] || variants.default}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span
          className={`
            h-1.5
            w-1.5
            shrink-0
            rounded-full
            ${dotColors[variant] || dotColors.default}
          `}
        />
      )}

      {children}
    </span>
  );
};

export default Badge;