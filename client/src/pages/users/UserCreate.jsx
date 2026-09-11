import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';

import userApi from '../../features/users/user.api.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import toast from 'react-hot-toast';

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'lawyer',
  password: '',
  confirm_password: '',
  is_active: true,
};

const PASSWORD_MIN_LENGTH = 12;

const ROLE_OPTIONS = [
  {
    value: 'lawyer',
    label: 'Avukat',
  },
  {
    value: 'secretary',
    label: 'Sekreter',
  },
  {
    value: 'intern',
    label: 'Stajyer',
  },
  {
    value: 'admin',
    label: 'Yönetici',
  },
];

const normalizeForm = (
  value = {}
) => ({
  first_name: String(
    value.first_name ?? ''
  ).trim(),

  last_name: String(
    value.last_name ?? ''
  ).trim(),

  email: String(
    value.email ?? ''
  )
    .trim()
    .toLowerCase(),

  phone: String(
    value.phone ?? ''
  ).trim(),

  role: String(
    value.role ?? 'lawyer'
  ),

  password: String(
    value.password ?? ''
  ),

  confirm_password: String(
    value.confirm_password ?? ''
  ),

  is_active:
    Boolean(value.is_active),
});

const isAllowedRole = (
  value
) => {
  return ROLE_OPTIONS.some(
    (option) =>
      option.value === value
  );
};

const getBackendFieldErrors = (
  error
) => {
  const source =
    error?.response?.data?.errors ??
    error?.response?.data?.validation_errors ??
    null;

  if (!source) {
    return {};
  }

  const normalizeField = (
    field
  ) => {
    const raw = Array.isArray(field)
      ? field[0]
      : field;

    const aliases = {
      firstName: 'first_name',
      lastName: 'last_name',
      confirmPassword:
        'confirm_password',
      isActive: 'is_active',
    };

    return aliases[raw] || raw;
  };

  const mapMessage = (
    field,
    message
  ) => {
    const normalizedField =
      normalizeField(field);

    const rawMessage = String(
      message ?? ''
    ).trim();

    if (
      normalizedField === 'email' &&
      /unique|already|exists|duplicate|kullanılıyor|kayıtlı/i.test(
        rawMessage
      )
    ) {
      return 'Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var';
    }

    const safeMessages = {
      first_name:
        'Ad bilgisini kontrol edin',
      last_name:
        'Soyad bilgisini kontrol edin',
      email:
        'Geçerli bir e-posta adresi girin',
      phone:
        'Telefon bilgisini kontrol edin',
      role:
        'Geçerli bir rol seçin',
      password:
        `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalıdır`,
      confirm_password:
        'Şifre tekrarını kontrol edin',
      is_active:
        'Hesap durumunu kontrol edin',
    };

    return (
      safeMessages[normalizedField] ||
      'Bu alanı kontrol edin'
    );
  };

  if (Array.isArray(source)) {
    return source.reduce(
      (
        result,
        item
      ) => {
        const field =
          normalizeField(
            item?.path ??
              item?.param ??
              item?.field
          );

        const message =
          item?.msg ??
          item?.message;

        if (field && message) {
          result[field] =
            mapMessage(
              field,
              message
            );
        }

        return result;
      },
      {}
    );
  }

  if (
    typeof source === 'object'
  ) {
    return Object.entries(
      source
    ).reduce(
      (
        result,
        [field, value]
      ) => {
        const message =
          Array.isArray(value)
            ? value[0]
            : value;

        if (
          message !== null &&
          message !== undefined
        ) {
          const normalizedField =
            normalizeField(field);

          result[normalizedField] =
            mapMessage(
              normalizedField,
              message
            );
        }

        return result;
      },
      {}
    );
  }

  return {};
};


const getTopLevelBackendFieldErrors = (
  error
) => {
  const status =
    error?.response?.status;

  const rawMessage = String(
    error?.response?.data?.message ??
      ''
  ).trim();

  if (!rawMessage) {
    return {};
  }

  if (
    status === 409 ||
    /e-?posta.*(zaten|kullanılıyor|kullanımda|kayıtlı)|duplicate|unique/i.test(
      rawMessage
    )
  ) {
    return {
      email:
        'Bu e-posta adresi zaten kullanımda.',
    };
  }

  if (
    /şifre.*(en az|min(?:imum)?)/i.test(
      rawMessage
    )
  ) {
    return {
      password:
        `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalıdır.`,
    };
  }

  if (
    /şifre.*çok uzun/i.test(
      rawMessage
    )
  ) {
    return {
      password:
        'Şifre çok uzun. Lütfen daha kısa bir şifre kullanın.',
    };
  }

  if (
    /şifre.*boşluk/i.test(
      rawMessage
    )
  ) {
    return {
      password:
        'Şifre yalnızca boşluklardan oluşamaz.',
    };
  }

  if (
    /geçerli.*e-?posta|e-?posta.*geçerli/i.test(
      rawMessage
    )
  ) {
    return {
      email:
        'Geçerli bir e-posta adresi girin.',
    };
  }

  if (
    /^ad (gereklidir|boş olamaz)/i.test(
      rawMessage
    )
  ) {
    return {
      first_name:
        'Ad gereklidir.',
    };
  }

  if (
    /^soyad (gereklidir|boş olamaz)/i.test(
      rawMessage
    )
  ) {
    return {
      last_name:
        'Soyad gereklidir.',
    };
  }

  if (
    /geçersiz kullanıcı rolü|geçerli bir rol/i.test(
      rawMessage
    )
  ) {
    return {
      role:
        'Geçerli bir rol seçin.',
    };
  }

  return {};
};

const getUserCreateErrorMessage = (
  error,
  fallback =
    'Kullanıcı oluşturulamadı'
) => {
  const status =
    error?.response?.status;

  const responseData =
    error?.response?.data;

  const rawMessage = String(
    responseData?.message ||
      error?.message ||
      ''
  ).trim();

  const validationMessages =
    Array.isArray(
      responseData?.errors
    )
      ? responseData.errors
          .map((item) =>
            String(
              item?.message ||
                item?.msg ||
                ''
            ).trim()
          )
          .filter(Boolean)
      : [];

  const technicalMessage = [
    rawMessage,
    ...validationMessages,
  ]
    .filter(Boolean)
    .join(' ');

  if (
    status === 401
  ) {
    return 'Oturumunuz sona ermiş olabilir. Lütfen yeniden giriş yapın.';
  }

  if (
    status === 403
  ) {
    return 'Yeni kullanıcı oluşturmak için yetkiniz bulunmuyor.';
  }

  if (
    status === 409 ||
    /unique|already exists|duplicate|email.*exists|email.*registered|email.*kullanılıyor|email.*kayıtlı/i.test(
      technicalMessage
    )
  ) {
    return 'Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var.';
  }

  if (
    status === 422 ||
    /validation failed|validation error|sequelizevalidationerror|notnull violation|cannot be null|must not be null|invalid input syntax|invalid.*role|invalid.*email/i.test(
      technicalMessage
    )
  ) {
    return 'Kullanıcı bilgileri doğrulanamadı. Zorunlu ve geçerli alanları kontrol edin.';
  }

  if (
    status === 429
  ) {
    return 'Kısa sürede çok fazla istek yapıldı. Lütfen biraz sonra tekrar deneyin.';
  }

  if (
    status >= 500
  ) {
    return 'Kullanıcı şu anda oluşturulamıyor. Lütfen tekrar deneyin.';
  }

  if (
    /network error|failed to fetch|timeout|econnrefused|enotfound/i.test(
      technicalMessage
    )
  ) {
    return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  }

  const looksTechnical =
    /sequelize|constraint|database|sql|stack|syntaxerror|typeerror|referenceerror|axios|request failed|status code|uuid|postgres|column|relation/i.test(
      technicalMessage
    );

  if (looksTechnical) {
    return fallback;
  }

  const looksTurkish =
    /[çğıöşüÇĞİÖŞÜ]|bulunamadı|geçersiz|zorunlu|yetkiniz|başarısız|oluşturulamadı|kayıtlı|kullanılıyor|hata/i.test(
      rawMessage
    );

  return looksTurkish
    ? rawMessage
    : fallback;
};

const UserCreate = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const formRef =
    useRef(null);

  const leaveDialogRef =
    useRef(null);

  const leaveTriggerRef =
    useRef(null);

  const pendingDestinationRef =
    useRef('/users');

  const [formData, setFormData] =
    useState(INITIAL_FORM);

  const [errors, setErrors] =
    useState({});

  const [showPassword, setShowPassword] =
    useState(false);

  const [showLeaveConfirm, setShowLeaveConfirm] =
    useState(false);

  const normalizedForm =
    useMemo(
      () => normalizeForm(formData),
      [formData]
    );

  const normalizedInitial =
    useMemo(
      () => normalizeForm(INITIAL_FORM),
      []
    );

  const isDirty =
    useMemo(
      () =>
        JSON.stringify(
          normalizedForm
        ) !==
        JSON.stringify(
          normalizedInitial
        ),
      [
        normalizedForm,
        normalizedInitial,
      ]
    );

  const focusField = (
    fieldName
  ) => {
    if (!fieldName) {
      return;
    }

    window.requestAnimationFrame(
      () => {
        const element =
          formRef.current
            ?.querySelector(
              `[name="${fieldName}"]`
            );

        if (!element) {
          return;
        }

        element.focus({
          preventScroll: true,
        });

        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    );
  };

  const createMutation =
    useMutation({
      mutationFn: (data) =>
        userApi.create(data),

      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: ['users'],
        });

        toast.success(
          'Kullanıcı başarıyla oluşturuldu'
        );

        navigate('/users');
      },

      onError: (error) => {
        const fieldErrors = {
          ...getBackendFieldErrors(
            error
          ),
          ...getTopLevelBackendFieldErrors(
            error
          ),
        };

        const firstErrorField =
          Object.keys(
            fieldErrors
          )[0];

        if (firstErrorField) {
          setErrors(
            (current) => ({
              ...current,
              ...fieldErrors,
            })
          );

          focusField(
            firstErrorField
          );

          toast.error(
            'Hatalı alanları kontrol edin.'
          );

          return;
        }

        toast.error(
          getUserCreateErrorMessage(
            error,
            'İşlem tamamlanamadı. Lütfen tekrar deneyin.'
          )
        );
      },
    });

  useEffect(() => {
    const handleBeforeUnload =
      (event) => {
        if (
          !isDirty ||
          createMutation.isPending
        ) {
          return;
        }

        event.preventDefault();
        event.returnValue = '';
      };

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      );
    };
  }, [
    isDirty,
    createMutation.isPending,
  ]);

  useEffect(() => {
    if (!showLeaveConfirm) {
      return undefined;
    }

    const dialog =
      leaveDialogRef.current;

    const focusable =
      dialog?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

    focusable?.[0]?.focus();

    const handleKeyDown =
      (event) => {
        if (
          event.key === 'Escape'
        ) {
          event.preventDefault();
          setShowLeaveConfirm(false);
          return;
        }

        if (
          event.key !== 'Tab' ||
          !focusable?.length
        ) {
          return;
        }

        const first =
          focusable[0];

        const last =
          focusable[
            focusable.length - 1
          ];

        if (
          event.shiftKey &&
          document.activeElement ===
            first
        ) {
          event.preventDefault();
          last.focus();
          return;
        }

        if (
          !event.shiftKey &&
          document.activeElement ===
            last
        ) {
          event.preventDefault();
          first.focus();
        }
      };

    document.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      );

      window.requestAnimationFrame(
        () => {
          leaveTriggerRef.current
            ?.focus?.();
        }
      );
    };
  }, [showLeaveConfirm]);

  const requestExit = (
    destination = '/users',
    trigger = null
  ) => {
    if (
      createMutation.isPending
    ) {
      return;
    }

    if (!isDirty) {
      navigate(destination);
      return;
    }

    pendingDestinationRef.current =
      destination;

    leaveTriggerRef.current =
      trigger ||
      document.activeElement;

    setShowLeaveConfirm(true);
  };

  const handleConfirmLeave = () => {
    const destination =
      pendingDestinationRef.current ||
      '/users';

    setShowLeaveConfirm(false);
    navigate(destination);
  };

  const handleChange = (event) => {
    if (
      createMutation.isPending
    ) {
      return;
    }

    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    if (
      name === 'role' &&
      !isAllowedRole(value)
    ) {
      return;
    }

    setFormData((current) => ({
      ...current,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }));

    if (errors[name]) {
      setErrors((current) => ({
        ...current,
        [name]: '',
      }));
    }

    if (
      name === 'password' &&
      errors.confirm_password
    ) {
      setErrors((current) => ({
        ...current,
        confirm_password: '',
      }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    const firstName =
      formData.first_name.trim();

    const lastName =
      formData.last_name.trim();

    const email =
      formData.email
        .trim()
        .toLowerCase();

    if (!firstName) {
      nextErrors.first_name =
        'Ad gereklidir';
    }

    if (!lastName) {
      nextErrors.last_name =
        'Soyad gereklidir';
    }

    if (!email) {
      nextErrors.email =
        'E-posta gereklidir';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      nextErrors.email =
        'Geçerli bir e-posta girin';
    }

    if (
      !isAllowedRole(
        formData.role
      )
    ) {
      nextErrors.role =
        'Geçerli bir rol seçin';
    }

    if (!formData.password) {
      nextErrors.password =
        'Şifre gereklidir';
    } else if (
      formData.password.trim().length ===
      0
    ) {
      nextErrors.password =
        'Şifre yalnızca boşluklardan oluşamaz';
    } else if (
      formData.password.length <
      PASSWORD_MIN_LENGTH
    ) {
      nextErrors.password =
        `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalıdır`;
    }

    if (
      !formData.confirm_password
    ) {
      nextErrors.confirm_password =
        'Şifre tekrarı gereklidir';
    } else if (
      formData.password !==
      formData.confirm_password
    ) {
      nextErrors.confirm_password =
        'Şifreler eşleşmiyor';
    }

    setErrors(nextErrors);

    if (
      Object.keys(
        nextErrors
      ).length > 0
    ) {
      focusField(
        Object.keys(
          nextErrors
        )[0]
      );

      toast.error(
        'Hatalı alanları kontrol edin.'
      );

      return false;
    }

    return true;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (
      createMutation.isPending ||
      !validateForm()
    ) {
      return;
    }

    createMutation.mutate({
      first_name:
        formData.first_name.trim(),

      last_name:
        formData.last_name.trim(),

      email:
        formData.email
          .trim()
          .toLowerCase(),

      phone:
        formData.phone.trim() || null,

      role:
        formData.role,

      password:
        formData.password,

      is_active:
        Boolean(formData.is_active),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      <div>
        <Link
          to="/users"
          onClick={(event) => {
            if (
              createMutation.isPending
            ) {
              event.preventDefault();
              return;
            }

            if (isDirty) {
              event.preventDefault();

              requestExit(
                '/users',
                event.currentTarget
              );
            }
          }}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kullanıcılar
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white">
              <UserPlus className="h-6 w-6" />
              Yeni Kullanıcı
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Büro sistemine yeni kullanıcı ekleyin ve rolünü belirleyin.
            </p>
          </div>

          {isDirty && (
            <Badge
              variant="warning"
              dot
            >
              Kaydedilmemiş değişiklik
            </Badge>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/15 dark:bg-blue-500/[0.05]">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />

          <div>
            <p className="font-medium text-blue-900 dark:text-blue-200">
              Yönetici işlemi
            </p>

            <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
              Kullanıcı hesapları yalnızca yönetici tarafından oluşturulur.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          className="space-y-6 p-6"
        >

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <Input
              label="Ad *"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              error={errors.first_name}
              disabled={createMutation.isPending}
              placeholder="Ad"
            />

            <Input
              label="Soyad *"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              error={errors.last_name}
              disabled={createMutation.isPending}
              placeholder="Soyad"
            />

          </div>

          <Input
            label="E-posta *"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            disabled={createMutation.isPending}
            placeholder="kullanici@hukuk.com"
          />

          <Input
            label="Telefon"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            error={errors.phone}
            disabled={createMutation.isPending}
            placeholder="05xx xxx xx xx"
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Rol *
            </label>

            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={createMutation.isPending}
              className={`
                h-10
                w-full
                rounded-lg
                border
                bg-white
                px-3.5
                text-sm
                text-gray-900
                outline-none
                focus:ring-2
                focus:ring-blue-500/10
                disabled:cursor-not-allowed
                disabled:opacity-50
                dark:bg-white/[0.035]
                dark:text-white
                ${
                  errors.role
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                }
              `}
            >
              {ROLE_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>

            {errors.role && (
              <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                {errors.role}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <div>
              <label
                htmlFor="user-create-password"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Geçici Şifre *
              </label>

              <div className="relative">
                <input
                  id="user-create-password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={createMutation.isPending}
                  placeholder="En az 12 karakter"
                  autoComplete="new-password"
                  aria-invalid={
                    Boolean(
                      errors.password
                    )
                  }
                  aria-describedby={
                    errors.password
                      ? 'user-create-password-error'
                      : 'user-create-password-help'
                  }
                  className={`
                    h-10
                    w-full
                    rounded-lg
                    border
                    bg-white
                    px-3.5
                    pr-11
                    text-sm
                    text-gray-900
                    outline-none
                    focus:ring-2
                    focus:ring-blue-500/10
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    dark:bg-white/[0.035]
                    dark:text-white
                    ${
                      errors.password
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                    }
                  `}
                />

                <button
                  type="button"
                  disabled={createMutation.isPending}
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/[0.05]"
                  aria-label={
                    showPassword
                      ? 'Şifreyi gizle'
                      : 'Şifreyi göster'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {errors.password ? (
                <p
                  id="user-create-password-error"
                  className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                >
                  {errors.password}
                </p>
              ) : (
                <p
                  id="user-create-password-help"
                  className="mt-1.5 text-xs text-gray-500 dark:text-slate-400"
                >
                  En az 12 karakter kullanın.
                </p>
              )}
            </div>

            <Input
              label="Şifre Tekrar *"
              name="confirm_password"
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              value={formData.confirm_password}
              onChange={handleChange}
              error={errors.confirm_password}
              disabled={createMutation.isPending}
              placeholder="Şifreyi tekrar girin"
              autoComplete="new-password"
            />

          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.07]">

            <label className="flex cursor-pointer items-start gap-3">

              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                disabled={createMutation.isPending}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              />

              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Hesap aktif
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Aktif kullanıcı oluşturulduktan sonra sisteme giriş yapabilir.
                </p>
              </div>

            </label>

            {errors.is_active && (
              <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                {errors.is_active}
              </p>
            )}

          </div>

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5 dark:border-white/[0.06]">

            <Button
              type="submit"
              loading={createMutation.isPending}
              disabled={createMutation.isPending}
            >
              <UserPlus className="h-4 w-4" />
              Kullanıcı Oluştur
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={createMutation.isPending}
              onClick={(event) =>
                requestExit(
                  '/users',
                  event.currentTarget
                )
              }
            >
              Vazgeç
            </Button>

          </div>

        </form>
      </Card>

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[1px]"
            onClick={() =>
              setShowLeaveConfirm(false)
            }
            aria-label="Ayrılma penceresini kapat"
          />

          <div
            ref={leaveDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-create-leave-title"
            aria-describedby="user-create-leave-description"
            className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/[0.08] dark:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/[0.1] dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2
                  id="user-create-leave-title"
                  className="text-base font-semibold text-gray-900 dark:text-white"
                >
                  Kaydedilmemiş değişiklikler var
                </h2>

                <p
                  id="user-create-leave-description"
                  className="mt-1.5 text-sm leading-6 text-gray-500 dark:text-slate-400"
                >
                  Yeni kullanıcı için girdiğiniz bilgiler henüz kaydedilmedi. Çıkarsanız bu değişiklikler kaybolacak.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setShowLeaveConfirm(false)
                }
              >
                Düzenlemeye Devam Et
              </Button>

              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmLeave}
              >
                Değişiklikleri At ve Çık
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserCreate;
