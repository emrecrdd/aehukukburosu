import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  useTheme,
} from '../../app/providers/theme.provider.jsx';

import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import authApi from '../../features/auth/auth.api.js';

import calendarIntegrationApi
  from '../../features/calendar-integrations/calendar-integration.api.js';

import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  LogOut,
  Moon,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Sun,
  Unlink2,
  UserRound,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const TABS = [
  {
    id: 'profile',
    label: 'Profil',
    description: 'Kişisel bilgiler',
    icon: UserRound,
  },
  {
    id: 'security',
    label: 'Güvenlik',
    description: 'Şifre ve erişim',
    icon: ShieldCheck,
  },
  {
    id: 'preferences',
    label: 'Tercihler',
    description: 'Görünüm ve hesap',
    icon: Settings2,
  },
  {
    id: 'calendar',
    label: 'Takvim',
    description: 'Google Calendar',
    icon: CalendarDays,
  },
];

const EMPTY_PROFILE = {
  first_name: '',
  last_name: '',
  phone: '',
  title: '',
  bio: '',
};

// ======================================================
// HELPERS
// ======================================================

const getRoleLabel = (
  role
) => {
  const labels = {
    admin: 'Yönetici',
    lawyer: 'Avukat',
    intern: 'Stajyer',
    secretary: 'Sekreter',
  };

  return (
    labels[role] ||
    role ||
    '-'
  );
};

const getApiData = (
  response
) => {
  return (
    response?.data?.data ??
    response?.data ??
    null
  );
};

const normalizePhone = (
  value
) => {
  return String(
    value || ''
  )
    .replace(
      /[^\d+]/g,
      ''
    )
    .trim();
};

const normalizeProfile = (
  profile
) => ({
  first_name:
    String(
      profile?.first_name ||
      ''
    ).trim(),

  last_name:
    String(
      profile?.last_name ||
      ''
    ).trim(),

  phone:
    normalizePhone(
      profile?.phone
    ),

  title:
    String(
      profile?.title ||
      ''
    ).trim(),

  bio:
    String(
      profile?.bio ||
      ''
    ).trim(),
});

const validatePasswordStrength = (
  value
) => {
  if (
    value.length <
    12
  ) {
    return 'Yeni şifre en az 12 karakter olmalıdır';
  }

  return '';
};

const getSettingsErrorMessage = (
  error,
  fallback
) => {
  const rawMessage =
    String(
      error?.response?.data?.message ||
      error?.message ||
      ''
    ).trim();

  if (!rawMessage) {
    return fallback;
  }

  if (
    /network|fetch|timeout|err_network|econn|socket/i.test(
      rawMessage
    )
  ) {
    return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  }

  if (
    /unauthorized|forbidden|permission|not authorized|access denied/i.test(
      rawMessage
    )
  ) {
    return 'Bu işlem için yetkiniz bulunmuyor.';
  }

  if (
    /validation failed|sequelize|notnull|null violation|invalid value/i.test(
      rawMessage
    )
  ) {
    return fallback;
  }

  if (
    /[çğıöşüİĞÜŞÖÇ]/.test(
      rawMessage
    ) ||
    /\b(gerekli|geçersiz|bulunamadı|şifre|bağlantı|yetki|kullanıcı|profil|takvim|google|hata)\b/i.test(
      rawMessage
    )
  ) {
    return rawMessage;
  }

  return fallback;
};

const getSettingsFieldErrorMessage = (
  field,
  message
) => {
  const rawMessage =
    String(
      message || ''
    ).trim();

  if (
    rawMessage &&
    (
      /[çğıöşüİĞÜŞÖÇ]/.test(
        rawMessage
      ) ||
      /\b(gerekli|geçersiz|yanlış|eşleşmiyor|olmalıdır)\b/i.test(
        rawMessage
      )
    )
  ) {
    return rawMessage;
  }

  const fallbacks = {
    first_name:
      'Ad alanını kontrol edin',
    last_name:
      'Soyad alanını kontrol edin',
    phone:
      'Telefon numarasını kontrol edin',
    title:
      'Ünvan alanını kontrol edin',
    bio:
      'Biyografi alanını kontrol edin',
    currentPassword:
      'Mevcut şifrenizi kontrol edin',
    newPassword:
      'Yeni şifrenizi kontrol edin',
  };

  return (
    fallbacks[field] ||
    'Geçersiz değer'
  );
};

// ======================================================
// COMPONENT
// ======================================================

const Settings = () => {
  const {
    user,
    logout,
    setUser,
  } =
    useAuth();

  const {
    theme,
    toggleTheme,
  } =
    useTheme();

  const googlePopupRef =
    useRef(
      null
    );

  const [
    activeTab,
    setActiveTab,
  ] =
    useState(
      'profile'
    );

  const [
    isGoogleConnecting,
    setIsGoogleConnecting,
  ] =
    useState(
      false
    );

  const [
    googleDisconnectDialogOpen,
    setGoogleDisconnectDialogOpen,
  ] =
    useState(
      false
    );

  const [
    logoutDialogOpen,
    setLogoutDialogOpen,
  ] =
    useState(
      false
    );

  const [
    profileForm,
    setProfileForm,
  ] =
    useState(
      EMPTY_PROFILE
    );

  const [
    initialProfileForm,
    setInitialProfileForm,
  ] =
    useState(
      EMPTY_PROFILE
    );

  const [
    passwordForm,
    setPasswordForm,
  ] =
    useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

  const [
    errors,
    setErrors,
  ] =
    useState({});

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] =
    useState(
      false
    );

  const [
    showNewPassword,
    setShowNewPassword,
  ] =
    useState(
      false
    );

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(
      false
    );

  // ====================================================
  // SYNC USER
  // ====================================================

  useEffect(() => {
    const nextProfile =
      normalizeProfile({
        first_name:
          user?.first_name,

        last_name:
          user?.last_name,

        phone:
          user?.phone,

        title:
          user?.title,

        bio:
          user?.bio,
      });

    setProfileForm(
      nextProfile
    );

    setInitialProfileForm(
      nextProfile
    );
  }, [
    user,
  ]);

  // ====================================================
  // DERIVED
  // ====================================================

  const normalizedProfile =
    useMemo(() => {
      return normalizeProfile(
        profileForm
      );
    }, [
      profileForm,
    ]);

  const normalizedInitialProfile =
    useMemo(() => {
      return normalizeProfile(
        initialProfileForm
      );
    }, [
      initialProfileForm,
    ]);

  const isProfileDirty =
    useMemo(() => {
      return (
        JSON.stringify(
          normalizedProfile
        ) !==
        JSON.stringify(
          normalizedInitialProfile
        )
      );
    }, [
      normalizedProfile,
      normalizedInitialProfile,
    ]);

  const passwordStrengthError =
    useMemo(() => {
      if (
        !passwordForm.newPassword
      ) {
        return '';
      }

      return validatePasswordStrength(
        passwordForm.newPassword
      );
    }, [
      passwordForm.newPassword,
    ]);

  // ====================================================
  // GOOGLE CALENDAR STATUS
  // ====================================================

  const googleCalendarStatus =
    useQuery({
      queryKey: [
        'calendar-integration',
        'google',
      ],

      queryFn: async () => {
        const response =
          await calendarIntegrationApi
            .getGoogleStatus();

        return getApiData(
          response
        );
      },

      retry:
        false,

      refetchOnWindowFocus:
        true,

      refetchInterval:
        isGoogleConnecting
          ? 1500
          : false,
    });

  const googleIntegration =
    googleCalendarStatus
      .data;

  const googleConnected =
    Boolean(
      googleIntegration
        ?.connected &&
      googleIntegration
        ?.is_active !==
        false
    );

  // ====================================================
  // GOOGLE CONNECTION COMPLETED
  // ====================================================

  useEffect(() => {
    if (
      !isGoogleConnecting ||
      !googleConnected
    ) {
      return;
    }

    setIsGoogleConnecting(
      false
    );

    if (
      googlePopupRef
        .current &&
      !googlePopupRef
        .current
        .closed
    ) {
      googlePopupRef
        .current
        .close();
    }

    googlePopupRef.current =
      null;

    toast.success(
      'Google Calendar başarıyla bağlandı'
    );
  }, [
    isGoogleConnecting,
    googleConnected,
  ]);

  // ====================================================
  // GOOGLE POPUP CLOSED
  // ====================================================

  useEffect(() => {
    if (
      !isGoogleConnecting
    ) {
      return undefined;
    }

    const interval =
      window.setInterval(
        () => {
          const popup =
            googlePopupRef
              .current;

          if (
            popup &&
            popup.closed
          ) {
            window.clearInterval(
              interval
            );

            googlePopupRef.current =
              null;

            setIsGoogleConnecting(
              false
            );

            googleCalendarStatus
              .refetch();
          }
        },
        500
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    isGoogleConnecting,
  ]);

  // ====================================================
  // PROFILE UPDATE
  // ====================================================

  const updateProfile =
    useMutation({
      mutationFn: (
        data
      ) =>
        authApi.updateProfile(
          data
        ),

      onSuccess: (
        response
      ) => {
        const updated =
          getApiData(
            response
          );

        const nextProfile =
          normalizeProfile(
            updated ||
            normalizedProfile
          );

        /*
         * AuthProvider ortak kullanıcı state'ini de
         * aynı anda güncelle. Böylece Topbar ve
         * useAuth() kullanan diğer alanlar sayfa
         * yenilenmeden yeni profil bilgisini görür.
         */
        setUser({
          ...(user &&
          typeof user ===
            'object'
            ? user
            : {}),

          ...(updated &&
          typeof updated ===
            'object'
            ? updated
            : {}),

          ...nextProfile,
        });

        setProfileForm(
          nextProfile
        );

        setInitialProfileForm(
          nextProfile
        );

        setErrors(
          {}
        );

        toast.success(
          'Profil bilgileri güncellendi'
        );
      },

      onError: (
        error
      ) => {
        const backendErrors =
          error?.response
            ?.data?.errors;

        const message =
          error?.response
            ?.data?.message ||
          'Profil güncellenemedi';

        const nextErrors =
          {};

        if (
          Array.isArray(
            backendErrors
          )
        ) {
          backendErrors.forEach(
            (
              item
            ) => {
              const field =
                item?.path ||
                item?.param;

              if (
                field
              ) {
                nextErrors[field] =
                  getSettingsFieldErrorMessage(
                    field,
                    item?.msg
                  );
              }
            }
          );
        }

        if (
          Object.keys(
            nextErrors
          ).length >
          0
        ) {
          setErrors(
            nextErrors
          );

          toast.error(
            'Profildeki hatalı alanları kontrol edin'
          );

          return;
        }

        toast.error(
          getSettingsErrorMessage(
            error,
            'Profil güncellenemedi'
          )
        );
      },
    });

  // ====================================================
  // PASSWORD UPDATE
  // ====================================================

  const changePassword =
    useMutation({
      mutationFn: (
        data
      ) =>
        authApi.changePassword(
          data
        ),

      onSuccess: () => {
        toast.success(
          'Şifreniz başarıyla değiştirildi'
        );

        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });

        setErrors(
          {}
        );
      },

      onError: (
        error
      ) => {
        const backendErrors =
          error?.response
            ?.data?.errors;

        const message =
          error?.response
            ?.data?.message ||
          error?.message ||
          'Şifre değiştirilemedi';

        const nextErrors =
          {};

        if (
          Array.isArray(
            backendErrors
          )
        ) {
          backendErrors.forEach(
            (
              item
            ) => {
              const field =
                item?.path ||
                item?.param;

              const fieldMessage =
                getSettingsFieldErrorMessage(
                  field,
                  item?.msg
                );

              if (
                field ===
                'currentPassword'
              ) {
                nextErrors.currentPassword =
                  fieldMessage;
              }

              if (
                field ===
                'newPassword'
              ) {
                nextErrors.newPassword =
                  fieldMessage;
              }
            }
          );
        }

        if (
          /mevcut şifre yanlış/i.test(
            message
          )
        ) {
          nextErrors.currentPassword =
            'Mevcut şifreniz yanlış';
        }

        if (
          /mevcut şifre gereklidir/i.test(
            message
          )
        ) {
          nextErrors.currentPassword =
            'Mevcut şifre gereklidir';
        }

        if (
          /aynı olamaz/i.test(
            message
          )
        ) {
          nextErrors.newPassword =
            'Yeni şifre mevcut şifrenizle aynı olamaz';
        }

        if (
          /en az 12 karakter/i.test(
            message
          )
        ) {
          nextErrors.newPassword =
            'Yeni şifre en az 12 karakter olmalıdır';
        }

        if (
          Object.keys(
            nextErrors
          ).length >
          0
        ) {
          setErrors(
            (
              current
            ) => ({
              ...current,
              ...nextErrors,
            })
          );

          toast.error(
            'Şifre bilgilerinizi kontrol edin'
          );

          return;
        }

        toast.error(
          getSettingsErrorMessage(
            error,
            'Şifre değiştirilemedi'
          )
        );
      },
    });

  // ====================================================
  // GOOGLE CONNECT
  // ====================================================

  const connectGoogle =
    useMutation({
      mutationFn: () =>
        calendarIntegrationApi
          .getGoogleConnectUrl(),

      onSuccess: (
        response
      ) => {
        const data =
          getApiData(
            response
          );

        const url =
          data?.url;

        if (!url) {
          toast.error(
            'Google bağlantı adresi alınamadı'
          );

          return;
        }

        const width =
          520;

        const height =
          720;

        const left =
          Math.max(
            0,
            window.screenX +
              (
                window.outerWidth -
                width
              ) /
                2
          );

        const top =
          Math.max(
            0,
            window.screenY +
              (
                window.outerHeight -
                height
              ) /
                2
          );

        const popup =
          window.open(
            url,
            'derkenar-google-calendar',
            [
              `width=${width}`,
              `height=${height}`,
              `left=${Math.round(
                left
              )}`,
              `top=${Math.round(
                top
              )}`,
              'resizable=yes',
              'scrollbars=yes',
            ].join(',')
          );

        if (!popup) {
          toast.error(
            'Google bağlantı penceresi açılamadı. Tarayıcınızın açılır pencere engelini kontrol edin.'
          );

          return;
        }

        googlePopupRef.current =
          popup;

        setIsGoogleConnecting(
          true
        );

        try {
          popup.focus();
        } catch {
          // noop
        }
      },

      onError: (
        error
      ) => {
        toast.error(
          getSettingsErrorMessage(
            error,
            'Google Calendar bağlantısı başlatılamadı'
          )
        );
      },
    });

  // ====================================================
  // GOOGLE DISCONNECT
  // ====================================================

  const disconnectGoogle =
    useMutation({
      mutationFn: () =>
        calendarIntegrationApi
          .disconnectGoogle(),

      onSuccess: async () => {
        setGoogleDisconnectDialogOpen(
          false
        );

        setIsGoogleConnecting(
          false
        );

        if (
          googlePopupRef
            .current &&
          !googlePopupRef
            .current
            .closed
        ) {
          googlePopupRef
            .current
            .close();
        }

        googlePopupRef.current =
          null;

        await googleCalendarStatus
          .refetch();

        toast.success(
          'Google Calendar bağlantısı kaldırıldı'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getSettingsErrorMessage(
            error,
            'Google Calendar bağlantısı kaldırılamadı'
          )
        );
      },
    });

  useEffect(() => {
    const handleBeforeUnload =
      (
        event
      ) => {
        if (
          !isProfileDirty ||
          updateProfile.isPending
        ) {
          return;
        }

        event.preventDefault();
        event.returnValue =
          '';
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
    isProfileDirty,
    updateProfile.isPending,
  ]);

  // ====================================================
  // PROFILE CHANGE
  // ====================================================

  const handleProfileChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } =
        event.target;

      let nextValue =
        value;

      if (
        name ===
        'phone'
      ) {
        nextValue =
          value
            .replace(
              /[^\d+\s()-]/g,
              ''
            )
            .slice(
              0,
              25
            );
      }

      setProfileForm(
        (
          current
        ) => ({
          ...current,
          [name]:
            nextValue,
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

  // ====================================================
  // PROFILE CANCEL
  // ====================================================

  const handleProfileCancel =
    () => {
      if (
        updateProfile.isPending ||
        !isProfileDirty
      ) {
        return;
      }

      setProfileForm({
        ...initialProfileForm,
      });

      setErrors(
        (current) => {
          const next = {
            ...current,
          };

          [
            'first_name',
            'last_name',
            'phone',
            'title',
            'bio',
          ].forEach(
            (field) => {
              delete next[field];
            }
          );

          return next;
        }
      );
    };

  // ====================================================
  // PASSWORD CHANGE
  // ====================================================

  const handlePasswordChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } =
        event.target;

      setPasswordForm(
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

  // ====================================================
  // PROFILE SUBMIT
  // ====================================================

  const handleProfileSubmit =
    (
      event
    ) => {
      event.preventDefault();

      if (
        updateProfile.isPending
      ) {
        return;
      }

      const newErrors =
        {};

      if (
        !normalizedProfile
          .first_name
      ) {
        newErrors.first_name =
          'Ad gereklidir';
      } else if (
        normalizedProfile
          .first_name
          .length <
        2
      ) {
        newErrors.first_name =
          'Ad en az 2 karakter olmalıdır';
      } else if (
        normalizedProfile
          .first_name
          .length >
        100
      ) {
        newErrors.first_name =
          'Ad en fazla 100 karakter olabilir';
      }

      if (
        !normalizedProfile
          .last_name
      ) {
        newErrors.last_name =
          'Soyad gereklidir';
      } else if (
        normalizedProfile
          .last_name
          .length <
        2
      ) {
        newErrors.last_name =
          'Soyad en az 2 karakter olmalıdır';
      } else if (
        normalizedProfile
          .last_name
          .length >
        100
      ) {
        newErrors.last_name =
          'Soyad en fazla 100 karakter olabilir';
      }

      if (
        normalizedProfile
          .phone
      ) {
        const digits =
          normalizedProfile
            .phone
            .replace(
              /\D/g,
              ''
            );

        if (
          digits.length <
            10 ||
          digits.length >
            15
        ) {
          newErrors.phone =
            'Geçerli bir telefon numarası giriniz';
        }
      }

      if (
        normalizedProfile
          .title
          .length >
        150
      ) {
        newErrors.title =
          'Ünvan en fazla 150 karakter olabilir';
      }

      if (
        normalizedProfile
          .bio
          .length >
        1000
      ) {
        newErrors.bio =
          'Biyografi en fazla 1000 karakter olabilir';
      }

      if (
        Object.keys(
          newErrors
        ).length >
        0
      ) {
        setErrors(
          newErrors
        );

        toast.error(
          'Profildeki hatalı alanları kontrol edin'
        );

        return;
      }

      if (
        !isProfileDirty
      ) {
        toast(
          'Kaydedilecek bir değişiklik bulunmuyor'
        );

        return;
      }

      updateProfile.mutate(
        normalizedProfile
      );
    };

  // ====================================================
  // PASSWORD SUBMIT
  // ====================================================

  const handlePasswordSubmit =
    (
      event
    ) => {
      event.preventDefault();

      if (
        changePassword.isPending
      ) {
        return;
      }

      const newErrors =
        {};

      if (
        !passwordForm
          .currentPassword
      ) {
        newErrors.currentPassword =
          'Mevcut şifre gereklidir';
      }

      if (
        !passwordForm
          .newPassword
      ) {
        newErrors.newPassword =
          'Yeni şifre gereklidir';
      } else {
        const strengthError =
          validatePasswordStrength(
            passwordForm.newPassword
          );

        if (
          strengthError
        ) {
          newErrors.newPassword =
            strengthError;
        }
      }

      if (
        passwordForm
          .currentPassword &&
        passwordForm
          .newPassword &&
        passwordForm
          .currentPassword ===
        passwordForm
          .newPassword
      ) {
        newErrors.newPassword =
          'Yeni şifre mevcut şifrenizle aynı olamaz';
      }

      if (
        !passwordForm
          .confirmPassword
      ) {
        newErrors.confirmPassword =
          'Yeni şifreyi tekrar girin';
      } else if (
        passwordForm
          .newPassword !==
        passwordForm
          .confirmPassword
      ) {
        newErrors.confirmPassword =
          'Şifreler eşleşmiyor';
      }

      if (
        Object.keys(
          newErrors
        ).length >
        0
      ) {
        setErrors(
          newErrors
        );

        toast.error(
          'Şifre bilgilerinizi kontrol edin'
        );

        return;
      }

      changePassword.mutate({
        currentPassword:
          passwordForm.currentPassword,

        newPassword:
          passwordForm.newPassword,
      });
    };

  // ====================================================
  // GOOGLE DISCONNECT
  // ====================================================

  const handleGoogleDisconnect =
    () => {
      if (
        disconnectGoogle.isPending
      ) {
        return;
      }

      setGoogleDisconnectDialogOpen(
        true
      );
    };

  const handleCloseGoogleDisconnectDialog =
    () => {
      if (
        disconnectGoogle.isPending
      ) {
        return;
      }

      setGoogleDisconnectDialogOpen(
        false
      );
    };

  const handleConfirmGoogleDisconnect =
    () => {
      if (
        !googleDisconnectDialogOpen ||
        disconnectGoogle.isPending
      ) {
        return;
      }

      disconnectGoogle.mutate();
    };

  // ====================================================
  // LOGOUT
  // ====================================================

  const handleLogout =
    () => {
      if (
        isProfileDirty
      ) {
        setLogoutDialogOpen(
          true
        );

        return;
      }

      logout();
    };

  const handleCloseLogoutDialog =
    () => {
      setLogoutDialogOpen(
        false
      );
    };

  const handleConfirmLogout =
    () => {
      setLogoutDialogOpen(
        false
      );

      logout();
    };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      <div className="flex items-start gap-3">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/[0.05] dark:text-slate-300">
          <Settings2 size={21} />
        </div>

        <div>

          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
            Ayarlar
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-slate-400">
            Profil bilgilerinizi, güvenlik ayarlarınızı, görünüm tercihlerinizi ve takvim bağlantılarınızı yönetin.
          </p>

        </div>

      </div>

      <Card>

        <Card.Body className="p-2">

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">

            {TABS.map(
              (
                tab
              ) => {
                const Icon =
                  tab.icon;

                const isActive =
                  activeTab ===
                  tab.id;

                return (
                  <button
                    key={
                      tab.id
                    }
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        tab.id
                      )
                    }
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/[0.08] dark:text-blue-300'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-white/[0.03] dark:hover:text-white'
                    }`}
                  >

                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isActive
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/[0.12] dark:text-blue-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-white/[0.04] dark:text-slate-500'
                      }`}
                    >
                      <Icon size={17} />
                    </div>

                    <div className="min-w-0">

                      <p className="text-sm font-semibold">
                        {tab.label}
                      </p>

                      <p className="mt-0.5 truncate text-[10px]">
                        {tab.description}
                      </p>

                    </div>

                  </button>
                );
              }
            )}

          </div>

        </Card.Body>

      </Card>

      {activeTab ===
        'profile' && (
        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <UserRound size={18} />

              <div>

                <div className="flex items-center gap-2">

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Profil Bilgileri
                  </h2>

                  {isProfileDirty && (
                    <Badge
                      variant="warning"
                    >
                      Kaydedilmemiş değişiklik
                    </Badge>
                  )}

                </div>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <form
              onSubmit={
                handleProfileSubmit
              }
              className="space-y-5"
            >

              <div className="grid gap-4 md:grid-cols-2">

                <Input
                  label="Ad *"
                  name="first_name"
                  value={
                    profileForm.first_name
                  }
                  onChange={
                    handleProfileChange
                  }
                  error={
                    errors.first_name
                  }
                  maxLength={100}
                />

                <Input
                  label="Soyad *"
                  name="last_name"
                  value={
                    profileForm.last_name
                  }
                  onChange={
                    handleProfileChange
                  }
                  error={
                    errors.last_name
                  }
                  maxLength={100}
                />

              </div>

              <div className="grid gap-4 md:grid-cols-2">

                <Input
                  label="Telefon"
                  name="phone"
                  type="tel"
                  value={
                    profileForm.phone
                  }
                  onChange={
                    handleProfileChange
                  }
                  error={
                    errors.phone
                  }
                  placeholder="05XX XXX XX XX"
                />

                <Input
                  label="Ünvan"
                  name="title"
                  value={
                    profileForm.title
                  }
                  onChange={
                    handleProfileChange
                  }
                  error={
                    errors.title
                  }
                  maxLength={150}
                  placeholder="Örn: Avukat"
                />

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium">
                  Biyografi
                </label>

                <textarea
                  name="bio"
                  value={
                    profileForm.bio
                  }
                  onChange={
                    handleProfileChange
                  }
                  rows={5}
                  maxLength={1000}
                  className="w-full rounded-lg border px-3 py-2"
                />

                <p className="mt-1 text-right text-xs text-gray-400">
                  {profileForm.bio.length}/1000
                </p>

              </div>

              <div className="flex justify-end gap-2">

                <Button
                  type="button"
                  variant="secondary"
                  onClick={
                    handleProfileCancel
                  }
                  disabled={
                    updateProfile.isPending ||
                    !isProfileDirty
                  }
                >
                  Vazgeç
                </Button>

                <Button
                  type="submit"
                  loading={
                    updateProfile.isPending
                  }
                  disabled={
                    updateProfile.isPending ||
                    !isProfileDirty
                  }
                >
                  <Save className="h-4 w-4" />
                  Değişiklikleri Kaydet
                </Button>

              </div>

            </form>

          </Card.Body>

        </Card>
      )}

      {activeTab ===
        'security' && (
        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <KeyRound size={18} />

              <h2 className="font-semibold">
                Şifre ve Güvenlik
              </h2>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

              <form
                onSubmit={
                  handlePasswordSubmit
                }
                className="space-y-4"
              >

                <div className="relative">

                  <Input
                    label="Mevcut Şifre"
                    name="currentPassword"
                    type={
                      showCurrentPassword
                        ? 'text'
                        : 'password'
                    }
                    value={
                      passwordForm.currentPassword
                    }
                    onChange={
                      handlePasswordChange
                    }
                    error={
                      errors.currentPassword
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowCurrentPassword(
                        (value) =>
                          !value
                      )
                    }
                    className="absolute right-3 top-[38px]"
                  >
                    {showCurrentPassword
                      ? <EyeOff size={17} />
                      : <Eye size={17} />}
                  </button>

                </div>

                <div className="relative">

                  <Input
                    label="Yeni Şifre"
                    name="newPassword"
                    type={
                      showNewPassword
                        ? 'text'
                        : 'password'
                    }
                    value={
                      passwordForm.newPassword
                    }
                    onChange={
                      handlePasswordChange
                    }
                    error={
                      errors.newPassword
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewPassword(
                        (value) =>
                          !value
                      )
                    }
                    className="absolute right-3 top-[38px]"
                  >
                    {showNewPassword
                      ? <EyeOff size={17} />
                      : <Eye size={17} />}
                  </button>

                </div>

                {passwordForm.newPassword &&
                  !errors.newPassword && (
                  <p
                    className={`text-xs ${
                      passwordStrengthError
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {passwordStrengthError ||
                      'Şifre uzunluğu uygun'}
                  </p>
                )}

                <div className="relative">

                  <Input
                    label="Yeni Şifre Tekrar"
                    name="confirmPassword"
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    value={
                      passwordForm.confirmPassword
                    }
                    onChange={
                      handlePasswordChange
                    }
                    error={
                      errors.confirmPassword
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) =>
                          !value
                      )
                    }
                    className="absolute right-3 top-[38px]"
                  >
                    {showConfirmPassword
                      ? <EyeOff size={17} />
                      : <Eye size={17} />}
                  </button>

                </div>

                <div className="flex justify-end">

                  <Button
                    type="submit"
                    loading={
                      changePassword.isPending
                    }
                  >
                    <KeyRound className="h-4 w-4" />
                    Şifreyi Değiştir
                  </Button>

                </div>

              </form>

              <div className="rounded-xl border p-4">

                <CheckCircle2 className="h-5 w-5 text-emerald-600" />

                <p className="mt-2 text-sm font-semibold">
                  Güvenli şifre
                </p>

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Şifreniz en az 12 karakter olmalıdır. Güvenlik için büyük/küçük harf, rakam ve özel karakter kullanmanız önerilir.
                </p>

              </div>

            </div>

          </Card.Body>

        </Card>
      )}

      {activeTab ===
        'preferences' && (
        <div className="space-y-4">

          <Card>

            <Card.Header>
              <h2 className="font-semibold">
                Görünüm
              </h2>
            </Card.Header>

            <Card.Body>

              <div className="flex justify-between gap-4">

                <div>

                  <p className="font-medium">
                    Tema
                  </p>

                  <p className="text-xs text-gray-500">
                    {theme === 'dark'
                      ? 'Koyu tema kullanılıyor'
                      : 'Açık tema kullanılıyor'}
                  </p>

                </div>

                <Button
                  variant="secondary"
                  onClick={
                    toggleTheme
                  }
                >
                  {theme === 'dark'
                    ? <Sun />
                    : <Moon />}
                  Temayı Değiştir
                </Button>

              </div>

            </Card.Body>

          </Card>

          <Card>

            <Card.Header>
              <h2 className="font-semibold">
                Hesap
              </h2>
            </Card.Header>

            <Card.Body>

              <div className="flex justify-end">

                <Button
                  variant="danger"
                  onClick={
                    handleLogout
                  }
                >
                  <LogOut />
                  Çıkış Yap
                </Button>

              </div>

            </Card.Body>

          </Card>

        </div>
      )}

      {activeTab ===
        'calendar' && (
        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <CalendarDays />

              <h2 className="font-semibold">
                Google Calendar
              </h2>

            </div>

          </Card.Header>

          <Card.Body>

            {googleCalendarStatus
              .isLoading ? (
              <p>
                Bağlantı kontrol ediliyor...
              </p>
            ) : googleCalendarStatus
                .isError ? (
              <Button
                onClick={() =>
                  googleCalendarStatus
                    .refetch()
                }
              >
                <RefreshCw />
                Tekrar Dene
              </Button>
            ) : googleConnected ? (
              <div className="space-y-4">

                <div className="rounded-xl border border-emerald-200 p-4">

                  <div className="flex items-center gap-2">

                    <CheckCircle2 className="text-emerald-600" />

                    <strong>
                      Google Calendar bağlı
                    </strong>

                    <Badge
                      variant="success"
                    >
                      Senkronizasyon Aktif
                    </Badge>

                  </div>

                  <p className="mt-2 text-sm text-gray-500">
                    Görev, toplantı ve duruşmalarınız Google Calendar ile otomatik senkronize edilir.
                  </p>

                  {googleIntegration
                    ?.last_synced_at && (
                    <p className="mt-2 text-xs text-gray-400">
                      Son senkronizasyon:{' '}
                      {new Date(
                        googleIntegration
                          .last_synced_at
                      ).toLocaleString(
                        'tr-TR'
                      )}
                    </p>
                  )}

                </div>

                <Button
                  variant="danger"
                  onClick={
                    handleGoogleDisconnect
                  }
                  loading={
                    disconnectGoogle
                      .isPending
                  }
                >
                  <Unlink2 />
                  Bağlantıyı Kes
                </Button>

              </div>
            ) : (
              <Button
                onClick={() =>
                  connectGoogle
                    .mutate()
                }
                loading={
                  connectGoogle
                    .isPending ||
                  isGoogleConnecting
                }
              >
                <Link2 />

                {isGoogleConnecting
                  ? 'Google hesabınızda onaylayın...'
                  : 'Google Takvimimi Bağla'}
              </Button>
            )}

          </Card.Body>

        </Card>
      )}

      <Modal
        isOpen={
          googleDisconnectDialogOpen
        }
        onClose={
          handleCloseGoogleDisconnectDialog
        }
        title="Google Calendar Bağlantısını Kes"
        size="md"
        closeOnBackdrop={
          !disconnectGoogle.isPending
        }
      >
        <div className="space-y-5">

          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.07]">

            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />

            <div>

              <p className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                Takvim senkronizasyonu durdurulacak
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-900/80 dark:text-amber-200/80">
                Google Calendar bağlantısı kaldırıldığında Derkenar ile Google Takvim arasındaki otomatik senkronizasyon durur.
              </p>

            </div>

          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.06] sm:flex-row sm:justify-end">

            <Button
              type="button"
              variant="secondary"
              disabled={
                disconnectGoogle.isPending
              }
              onClick={
                handleCloseGoogleDisconnectDialog
              }
            >
              Vazgeç
            </Button>

            <Button
              type="button"
              variant="danger"
              loading={
                disconnectGoogle.isPending
              }
              disabled={
                disconnectGoogle.isPending
              }
              onClick={
                handleConfirmGoogleDisconnect
              }
            >
              <Unlink2 className="h-4 w-4" />
              Bağlantıyı Kes
            </Button>

          </div>

        </div>
      </Modal>

      <Modal
        isOpen={
          logoutDialogOpen
        }
        onClose={
          handleCloseLogoutDialog
        }
        title="Kaydedilmemiş Değişiklik"
        size="md"
      >
        <div className="space-y-5">

          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.07]">

            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />

            <div>

              <p className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                Profil değişiklikleri kaydedilmedi
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-900/80 dark:text-amber-200/80">
                Çıkış yaparsanız profil formundaki kaydedilmemiş değişiklikler silinir.
              </p>

            </div>

          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.06] sm:flex-row sm:justify-end">

            <Button
              type="button"
              variant="secondary"
              onClick={
                handleCloseLogoutDialog
              }
            >
              Düzenlemeye Devam Et
            </Button>

            <Button
              type="button"
              variant="danger"
              onClick={
                handleConfirmLogout
              }
            >
              <LogOut className="h-4 w-4" />
              Değişiklikleri At ve Çık
            </Button>

          </div>

        </div>
      </Modal>

    </div>
  );
};

export default Settings;