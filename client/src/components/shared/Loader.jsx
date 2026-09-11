// Loader.jsx
const Loader = ({
  size = 'md',
  fullScreen = false,
  text = 'Yükleniyor...',
  className = '',
}) => {
  const sizes = {
    sm: 'h-5 w-5',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const content = (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
    >
      <div
        className={`relative ${sizes[size]}`}
      >
        <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-white/[0.08]" />

        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-600 dark:border-t-blue-400" />
      </div>

      {text && (
        <p className="mt-3 text-sm font-medium text-gray-500 dark:text-slate-400">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-[#071426]/80">
        {content}
      </div>
    );
  }

  return content;
};

export default Loader;