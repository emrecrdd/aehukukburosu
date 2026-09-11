import {
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  Mail,
} from 'lucide-react';

import {
  useLogin,
} from '../../features/auth/auth.hook.js';

import Button from '../../components/ui/Button.jsx';

// ======================================================
// COMPONENT
// ======================================================

const Login = () => {
  const navigate =
    useNavigate();

  const login =
    useLogin();

  const emailInputRef =
    useRef(null);

  const passwordInputRef =
    useRef(null);

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    formData,
    setFormData,
  ] =
    useState({
      email: '',
      password: '',
    });

  const [
    errors,
    setErrors,
  ] =
    useState({});

  // ======================================================
  // CHANGE
  // ======================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } =
      event.target;

    setFormData(
      (
        current
      ) => ({
        ...current,

        [name]:
          value,
      })
    );

    if (
      errors[name]
    ) {
      setErrors(
        (
          current
        ) => ({
          ...current,

          [name]:
            '',
        })
      );
    }
  };

  const focusFirstInvalidField = (
    nextErrors
  ) => {
    window.requestAnimationFrame(
      () => {
        if (
          nextErrors.email
        ) {
          emailInputRef.current
            ?.focus?.();
          return;
        }

        if (
          nextErrors.password
        ) {
          passwordInputRef.current
            ?.focus?.();
        }
      }
    );
  };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      const email =
        formData.email
          .trim()
          .toLowerCase();

      if (!email) {
        nextErrors.email =
          'E-posta adresi gereklidir';
      } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        nextErrors.email =
          'Geçerli bir e-posta adresi girin';
      }

      if (
        !formData.password
      ) {
        nextErrors.password =
          'Şifre gereklidir';
      }

      setErrors(
        nextErrors
      );

      if (
        Object.keys(
          nextErrors
        ).length >
        0
      ) {
        focusFirstInvalidField(
          nextErrors
        );
      }

      return (
        Object.keys(
          nextErrors
        ).length ===
        0
      );
    };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        login.isPending
      ) {
        return;
      }

      if (
        !validateForm()
      ) {
        return;
      }

      try {
        await login.mutateAsync({
          email:
            formData.email
              .trim()
              .toLowerCase(),

          password:
            formData.password,
        });

        navigate(
          '/dashboard',
          {
            replace:
              true,
          }
        );
      } catch (
        error
      ) {
        /*
         * Toast / genel API hata mesajını auth hook yönetir.
         * Burada yalnızca kullanıcıya düzeltilebilir alan hatasını
         * form üzerinde görünür hale getiriyoruz.
         */
        const message =
          String(
            error?.response
              ?.data?.message ||
            error?.message ||
            ''
          ).trim();

        if (
          /e-posta veya şifre hatalı/i.test(
            message
          )
        ) {
          const nextErrors = {
            password:
              'E-posta veya şifre hatalı',
          };

          setErrors(
            nextErrors
          );

          focusFirstInvalidField(
            nextErrors
          );
        }
      }
    };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="w-full">

      {/* HEADER */}

     <div className="mb-8">

  {/* BRAND */}

<div className="mb-7">
  <img
    src="/derkenar-logo.png"
    alt="Derkenar"
    className="
      h-auto
      w-full
      max-w-[300px]
      object-contain
      object-left
    "
  />
</div>

  <p
    className="
      text-[10px]
      font-bold
      uppercase
      tracking-[0.16em]
      text-blue-600
      dark:text-blue-400
    "
  >
    Güvenli Giriş
  </p>

        <h2
          className="
            mt-2
            text-2xl
            font-semibold
            tracking-[-0.035em]
            text-gray-900
            dark:text-white
            sm:text-[28px]
          "
        >
          Çalışma alanınıza giriş yapın
        </h2>

        <p
          className="
            mt-2
            text-sm
            leading-6
            text-gray-500
            dark:text-slate-400
          "
        >
          Derkenar hesabınızla devam edin.
        </p>

      </div>

      {/* FORM */}

      <form
        onSubmit={
          handleSubmit
        }
        noValidate
        className="space-y-5"
      >

        {/* EMAIL */}

        <div>

          <label
            htmlFor="login-email"
            className="
              mb-1.5
              block
              text-sm
              font-medium
              text-gray-700
              dark:text-slate-300
            "
          >
            E-posta Adresi
          </label>

          <div className="relative">

            <Mail
              size={17}
              className="
                pointer-events-none
                absolute
                left-3.5
                top-1/2
                -translate-y-1/2
                text-gray-400
                dark:text-slate-500
              "
            />

            <input
              ref={
                emailInputRef
              }
              id="login-email"
              type="email"
              name="email"
              value={
                formData.email
              }
              onChange={
                handleChange
              }
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              disabled={
                login.isPending
              }
              placeholder="adiniz@hukuk.com"
              aria-invalid={
                Boolean(
                  errors.email
                )
              }
              aria-describedby={
                errors.email
                  ? 'login-email-error'
                  : undefined
              }
              className={`
                h-11
                w-full
                rounded-lg
                border
                bg-white
                pl-10
                pr-3.5
                text-sm
                text-gray-900
                shadow-sm
                outline-none
                transition-all
                placeholder:text-gray-400

                dark:bg-white/[0.035]
                dark:text-white
                dark:placeholder:text-slate-500

                ${
                  errors.email
                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-red-500/50'
                    : 'border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.08] dark:hover:border-white/[0.14] dark:focus:border-blue-500/60'
                }

                disabled:cursor-not-allowed
                disabled:opacity-60
              `}
            />

          </div>

          {errors.email && (
            <p
              id="login-email-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400"
            >
              {errors.email}
            </p>
          )}

        </div>

        {/* PASSWORD */}

        <div>

          <div className="mb-1.5 flex items-center justify-between">

            <label
              htmlFor="login-password"
              className="
                text-sm
                font-medium
                text-gray-700
                dark:text-slate-300
              "
            >
              Şifre
            </label>

            <Link
              to="/forgot-password"
              className="
                text-xs
                font-semibold
                text-blue-600
                transition
                hover:text-blue-700
                dark:text-blue-400
                dark:hover:text-blue-300
              "
            >
              Şifremi unuttum
            </Link>

          </div>

          <div className="relative">

            <LockKeyhole
              size={17}
              className="
                pointer-events-none
                absolute
                left-3.5
                top-1/2
                -translate-y-1/2
                text-gray-400
                dark:text-slate-500
              "
            />

            <input
              ref={
                passwordInputRef
              }
              id="login-password"
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              name="password"
              value={
                formData.password
              }
              onChange={
                handleChange
              }
              autoComplete="current-password"
              disabled={
                login.isPending
              }
              placeholder="Şifrenizi girin"
              aria-invalid={
                Boolean(
                  errors.password
                )
              }
              aria-describedby={
                errors.password
                  ? 'login-password-error'
                  : undefined
              }
              className={`
                h-11
                w-full
                rounded-lg
                border
                bg-white
                pl-10
                pr-11
                text-sm
                text-gray-900
                shadow-sm
                outline-none
                transition-all
                placeholder:text-gray-400

                dark:bg-white/[0.035]
                dark:text-white
                dark:placeholder:text-slate-500

                ${
                  errors.password
                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-red-500/50'
                    : 'border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.08] dark:hover:border-white/[0.14] dark:focus:border-blue-500/60'
                }

                disabled:cursor-not-allowed
                disabled:opacity-60
              `}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (
                    current
                  ) =>
                    !current
                )
              }
              disabled={
                login.isPending
              }
              className="
                absolute
                right-2
                top-1/2
                inline-flex
                h-8
                w-8
                -translate-y-1/2
                items-center
                justify-center
                rounded-lg
                text-gray-400
                transition
                hover:bg-gray-100
                hover:text-gray-700
                disabled:opacity-50
                dark:text-slate-500
                dark:hover:bg-white/[0.05]
                dark:hover:text-white
              "
              aria-label={
                showPassword
                  ? 'Şifreyi gizle'
                  : 'Şifreyi göster'
              }
            >
              {showPassword ? (
                <EyeOff
                  size={17}
                />
              ) : (
                <Eye
                  size={17}
                />
              )}
            </button>

          </div>

          {errors.password && (
            <p
              id="login-password-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400"
            >
              {errors.password}
            </p>
          )}

        </div>

        {/* SUBMIT */}

        <div className="pt-1">

          <Button
            type="submit"
            loading={
              login.isPending
            }
            disabled={
              login.isPending
            }
            className="w-full"
          >
            {!login.isPending && (
              <LogIn className="h-4 w-4" />
            )}

            {login.isPending
              ? 'Giriş yapılıyor'
              : 'Giriş Yap'}
          </Button>

        </div>

      </form>

      {/* FOOTER */}

      <div
        className="
          mt-8
          border-t
          border-gray-200
          pt-6
          dark:border-white/[0.07]
        "
      >
        <p
          className="
            text-center
            text-xs
            leading-5
            text-gray-500
            dark:text-slate-500
          "
        >
          Hesabınızla ilgili sorun yaşıyorsanız
          büro yöneticinizle iletişime geçin.
        </p>
      </div>

    </div>
  );
};

export default Login;