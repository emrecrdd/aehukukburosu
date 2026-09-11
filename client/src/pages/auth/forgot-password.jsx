import {
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  useMutation,
} from '@tanstack/react-query';

import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  Send,
} from 'lucide-react';

import authApi from '../../features/auth/auth.api.js';

import Button from '../../components/ui/Button.jsx';

import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const navigate =
    useNavigate();

  const [
    email,
    setEmail,
  ] =
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    submitted,
    setSubmitted,
  ] =
    useState(false);

  const mutation =
    useMutation({
      mutationFn: (
        emailAddress
      ) =>
        authApi.forgotPassword(
          emailAddress
        ),

      onSuccess: () => {
        setSubmitted(
          true
        );

        toast.success(
          'Şifre sıfırlama bağlantısı gönderildi'
        );
      },

      onError: (
        requestError
      ) => {
        toast.error(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError?.message ||
          'Bağlantı gönderilemedi'
        );
      },
    });

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (
      mutation.isPending
    ) {
      return;
    }

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      setError(
        'E-posta adresi gereklidir'
      );

      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      setError(
        'Geçerli bir e-posta adresi girin'
      );

      return;
    }

    setError('');

    mutation.mutate(
      normalizedEmail
    );
  };

  if (
    submitted
  ) {
    return (
      <div className="w-full">

        <div
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-xl
            bg-emerald-50
            text-emerald-600
            dark:bg-emerald-500/[0.08]
            dark:text-emerald-400
          "
        >
          <CheckCircle2 size={22} />
        </div>

        <p
          className="
            mt-5
            text-[10px]
            font-bold
            uppercase
            tracking-[0.16em]
            text-emerald-600
            dark:text-emerald-400
          "
        >
          Bağlantı Gönderildi
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
          E-posta kutunuzu kontrol edin
        </h2>

        <p
          className="
            mt-3
            text-sm
            leading-6
            text-gray-500
            dark:text-slate-400
          "
        >
          Şifre sıfırlama bağlantısını
          <span className="font-semibold text-gray-700 dark:text-slate-300">
            {' '}
            {email}
          </span>
          {' '}
          adresine gönderdik.
        </p>

        <p
          className="
            mt-2
            text-xs
            leading-5
            text-gray-400
            dark:text-slate-500
          "
        >
          E-posta birkaç dakika içinde görünmezse spam veya gereksiz klasörünü de kontrol edin.
        </p>

        <div className="mt-7">
          <Button
            type="button"
            className="w-full"
            onClick={() =>
              navigate(
                '/login'
              )
            }
          >
            Giriş Ekranına Dön
          </Button>
        </div>

      </div>
    );
  }

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

        <div
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-xl
            border
            border-amber-200/70
            bg-amber-50
            text-amber-700
            dark:border-amber-400/15
            dark:bg-amber-400/[0.07]
            dark:text-amber-300
          "
        >
          <Mail size={20} />
        </div>

        <p
          className="
            mt-5
            text-[10px]
            font-bold
            uppercase
            tracking-[0.16em]
            text-amber-600
            dark:text-amber-300
          "
        >
          Şifre Kurtarma
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
          Şifrenizi mi unuttunuz?
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
          Hesabınıza bağlı e-posta adresini girin. Size güvenli bir şifre sıfırlama bağlantısı göndereceğiz.
        </p>

      </div>

      {/* FORM */}

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
      >

        <div>

          <label
            htmlFor="forgot-password-email"
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
              id="forgot-password-email"
              type="email"
              value={
                email
              }
              onChange={(
                event
              ) => {
                setEmail(
                  event.target.value
                );

                if (
                  error
                ) {
                  setError('');
                }
              }}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              disabled={
                mutation.isPending
              }
              placeholder="adiniz@hukuk.com"
              aria-invalid={
                Boolean(
                  error
                )
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
                  error
                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-red-500/50'
                    : 'border-gray-200 hover:border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 dark:border-white/[0.08] dark:hover:border-white/[0.14] dark:focus:border-amber-400/60'
                }
                disabled:cursor-not-allowed
                disabled:opacity-60
              `}
            />

          </div>

          {error && (
            <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

        </div>

        <div className="pt-1">

          <Button
            type="submit"
            loading={
              mutation.isPending
            }
            disabled={
              mutation.isPending
            }
            className="w-full"
          >
            {!mutation.isPending && (
              <Send className="h-4 w-4" />
            )}

            {mutation.isPending
              ? 'Gönderiliyor'
              : 'Sıfırlama Bağlantısı Gönder'}
          </Button>

        </div>

      </form>

      {/* BACK */}

      <div
        className="
          mt-7
          border-t
          border-gray-200
          pt-5
          dark:border-white/[0.07]
        "
      >

        <Link
          to="/login"
          className="
            inline-flex
            items-center
            gap-1.5
            text-xs
            font-semibold
            text-gray-500
            transition
            hover:text-amber-600
            dark:text-slate-500
            dark:hover:text-amber-300
          "
        >
          <ArrowLeft size={14} />

          Giriş ekranına dön
        </Link>

      </div>

    </div>
  );
};

export default ForgotPassword;
