import {
  useEffect,
  useRef,
} from 'react';

import {
  X,
} from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = '',
  closeOnBackdrop = true,
}) => {
  const modalRef =
    useRef(null);

  useEffect(() => {
    const handleEscape = (
      event
    ) => {
      if (
        event.key ===
        'Escape'
      ) {
        onClose?.();
      }
    };

    if (
      isOpen
    ) {
      document.addEventListener(
        'keydown',
        handleEscape
      );

      document.body.style.overflow =
        'hidden';
    }

    return () => {
      document.removeEventListener(
        'keydown',
        handleEscape
      );

      document.body.style.overflow =
        '';
    };
  }, [
    isOpen,
    onClose,
  ]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  if (
    !isOpen
  ) {
    return null;
  }

  const handleBackdropClick = (
    event
  ) => {
    if (
      !closeOnBackdrop
    ) {
      return;
    }

    if (
      event.target ===
      event.currentTarget
    ) {
      onClose?.();
    }
  };

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        overflow-y-auto
      "
    >
      <div
        className="
          flex
          min-h-full
          items-center
          justify-center
          p-4
          sm:p-6
        "
        onMouseDown={
          handleBackdropClick
        }
      >
        {/* BACKDROP */}
        <div
          className="
            fixed
            inset-0
            bg-slate-950/55
            backdrop-blur-[3px]
          "
          aria-hidden="true"
        />

        {/* MODAL */}
        <div
          ref={
            modalRef
          }
          role="dialog"
          aria-modal="true"
          className={`
            relative
            z-10
            w-full
            ${sizes[size] || sizes.md}
            overflow-hidden
            rounded-2xl
            border
            border-gray-200
            bg-white
            shadow-[0_24px_80px_rgba(15,23,42,0.25)]
            dark:border-white/[0.08]
            dark:bg-[#0b1b33]
            ${className}
          `}
        >
          {/* HEADER */}
          {(title || onClose) && (
            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                border-b
                border-gray-100
                px-5
                py-4
                dark:border-white/[0.06]
                md:px-6
              "
            >
              <div className="min-w-0">
                {title && (
                  <h3
                    className="
                      truncate
                      text-base
                      font-semibold
                      tracking-[-0.01em]
                      text-gray-900
                      dark:text-white
                    "
                  >
                    {title}
                  </h3>
                )}
              </div>

              <button
                type="button"
                onClick={
                  onClose
                }
                className="
                  inline-flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  text-gray-400
                  transition
                  hover:bg-gray-100
                  hover:text-gray-700
                  dark:text-slate-500
                  dark:hover:bg-white/[0.05]
                  dark:hover:text-white
                "
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* BODY */}
          <div
            className="
              max-h-[calc(100vh-12rem)]
              overflow-y-auto
              px-5
              py-5
              md:px-6
            "
          >
            {children}
          </div>

          {/* FOOTER */}
          {footer && (
            <div
              className="
                flex
                flex-wrap
                items-center
                justify-end
                gap-2
                border-t
                border-gray-100
                bg-gray-50/60
                px-5
                py-4
                dark:border-white/[0.06]
                dark:bg-white/[0.015]
                md:px-6
              "
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;