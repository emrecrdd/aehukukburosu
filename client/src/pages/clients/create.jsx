import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  useCreateClient,
} from '../../features/clients/client.query.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Save,
  UserRound,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const INITIAL_FORM = {
  name: '',
  identification_number: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  district: '',
  postal_code: '',
  notes: '',
  tags: '',
  client_type: 'individual',
  status: 'active',
};

const CLIENT_TYPE_OPTIONS = [
  'individual',
  'corporate',
];

const STATUS_OPTIONS = [
  'active',
  'passive',
  'archived',
];

const MAX_LENGTHS = {
  name: 255,
  email: 254,
  phoneDigits: 15,
  address: 1000,
  city: 100,
  district: 100,
  postal_code: 5,
  notes: 5000,
  tags: 1000,
};

// ======================================================
// HELPERS
// ======================================================

const normalizeTags = (
  value
) => {
  if (!value) {
    return [];
  }

  const seen =
    new Set();

  return String(
    value
  )
    .split(',')
    .map(
      (tag) =>
        tag.trim()
    )
    .filter(Boolean)
    .filter(
      (tag) => {
        const key =
          tag.toLocaleLowerCase(
            'tr-TR'
          );

        if (
          seen.has(
            key
          )
        ) {
          return false;
        }

        seen.add(
          key
        );

        return true;
      }
    );
};

const normalizePhone = (
  value
) => {
  return String(
    value || ''
  )
    .replace(/[^\d+]/g, '')
    .trim();
};

const normalizeNullable = (
  value
) => {
  const normalized =
    String(
      value ?? ''
    ).trim();

  return normalized || null;
};

const validateEmail = (
  email
) => {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
};

const validateTCKN = (
  value
) => {
  if (!/^[1-9]\d{10}$/.test(value)) {
    return false;
  }

  const digits =
    value
      .split('')
      .map(Number);

  const oddSum =
    digits[0] +
    digits[2] +
    digits[4] +
    digits[6] +
    digits[8];

  const evenSum =
    digits[1] +
    digits[3] +
    digits[5] +
    digits[7];

  const tenthDigit =
    (((oddSum * 7) - evenSum) % 10 + 10) % 10;

  if (tenthDigit !== digits[9]) {
    return false;
  }

  const eleventhDigit =
    digits
      .slice(0, 10)
      .reduce(
        (sum, digit) => sum + digit,
        0
      ) % 10;

  return eleventhDigit === digits[10];
};

const sanitizeDigits = (
  value,
  maxLength
) => {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, maxLength);
};

const sanitizePhoneInput = (
  value
) => {
  const raw =
    String(
      value ??
      ''
    );

  const hasLeadingPlus =
    raw
      .trim()
      .startsWith(
        '+'
      );

  const digits =
    raw
      .replace(
        /\D/g,
        ''
      )
      .slice(
        0,
        MAX_LENGTHS.phoneDigits
      );

  return hasLeadingPlus
    ? `+${digits}`
    : digits;
};

const isLikelyTechnicalMessage = (
  value
) => {
  const message =
    String(
      value || ''
    ).trim();

  if (!message) {
    return false;
  }

  return /(?:validation failed|sequelize|constraint|foreign key|unique constraint|duplicate key|invalid input syntax|syntax error|stack trace|internal server error|network error|failed to fetch|econn|socket|timeout|request failed with status code|cannot read propert|undefined is not|null value in column|not-null violation|2350\d|22p02)/i.test(
    message
  );
};

const getClientCreateErrorMessage = (
  error,
  fallback = 'Müvekkil oluşturulamadı'
) => {
  const status =
    error?.response?.status;

  const rawMessage =
    error?.response?.data?.message ||
    error?.message ||
    '';

  if (status === 401) {
    return 'Oturumunuz sona ermiş olabilir. Lütfen yeniden giriş yapın.';
  }

  if (status === 403) {
    return 'Müvekkil oluşturmak için yetkiniz bulunmuyor.';
  }

  if (status === 409) {
    return 'Bu bilgilerle çakışan mevcut bir müvekkil kaydı bulunuyor.';
  }

  if (status === 422) {
    return 'Formdaki bilgileri kontrol edip tekrar deneyin.';
  }

  if (
    Number(status) >= 500
  ) {
    return 'Sunucuda geçici bir sorun oluştu. Lütfen tekrar deneyin.';
  }

  if (
    !error?.response &&
    /network|fetch|timeout|econn|socket/i.test(
      rawMessage
    )
  ) {
    return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  }

  if (
    rawMessage &&
    !isLikelyTechnicalMessage(
      rawMessage
    )
  ) {
    return rawMessage;
  }

  return fallback;
};

const getClientFieldErrorMessage = (
  field,
  rawMessage
) => {
  const message =
    String(
      rawMessage || ''
    ).trim();

  if (
    message &&
    !isLikelyTechnicalMessage(
      message
    )
  ) {
    return message;
  }

  const fallbacks = {
    name: 'Müvekkil adını kontrol edin',
    identification_number: 'Kimlik numarasını kontrol edin',
    email: 'E-posta adresini kontrol edin',
    phone: 'Telefon numarasını kontrol edin',
    address: 'Adres bilgisini kontrol edin',
    city: 'Şehir bilgisini kontrol edin',
    district: 'İlçe bilgisini kontrol edin',
    postal_code: 'Posta kodunu kontrol edin',
    notes: 'Not bilgisini kontrol edin',
    tags: 'Etiketleri kontrol edin',
    client_type: 'Müvekkil türünü kontrol edin',
    status: 'Müvekkil durumunu kontrol edin',
  };

  return (
    fallbacks[field] ||
    'Bu alanı kontrol edin'
  );
};

const getBackendFieldErrors = (
  error
) => {
  const backendErrors =
    error?.response
      ?.data?.errors;

  const result =
    {};

  if (
    Array.isArray(
      backendErrors
    )
  ) {
    backendErrors.forEach(
      (item) => {
        const field =
          item?.path ||
          item?.param ||
          item?.field;

        if (
          field
        ) {
          result[field] =
            getClientFieldErrorMessage(
              field,
              item?.msg ||
              item?.message
            );
        }
      }
    );

    return result;
  }

  if (
    backendErrors &&
    typeof backendErrors ===
      'object'
  ) {
    Object.entries(
      backendErrors
    ).forEach(
      ([
        field,
        value,
      ]) => {
        if (
          Array.isArray(
            value
          )
        ) {
          result[field] =
            getClientFieldErrorMessage(
              field,
              value
                .filter(Boolean)
                .join(', ')
            );

          return;
        }

        if (
          value
        ) {
          result[field] =
            getClientFieldErrorMessage(
              field,
              String(
                value
              )
            );
        }
      }
    );
  }

  return result;
};

const getCreatedClientId = (
  response
) => {
  const payload =
    response?.data?.data ??
    response?.data ??
    response ??
    null;

  const value =
    payload?.id ??
    payload?._id;

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  return String(
    value
  );
};

const normalizeFormForComparison = (
  formData
) => {
  return JSON.stringify({
    ...buildPayload(
      formData
    ),

    tags:
      normalizeTags(
        formData.tags
      ),
  });
};

const buildPayload = (
  formData
) => {
  return {
    name:
      formData.name.trim(),

    identification_number:
      normalizeNullable(
        String(
          formData.identification_number ||
          ''
        ).replace(
          /\s+/g,
          ''
        )
      ),

    email:
      normalizeNullable(
        String(
          formData.email ||
          ''
        )
          .trim()
          .toLowerCase()
      ),

    phone:
      normalizeNullable(
        normalizePhone(
          formData.phone
        )
      ),

    address:
      normalizeNullable(
        formData.address
      ),

    city:
      normalizeNullable(
        formData.city
      ),

    district:
      normalizeNullable(
        formData.district
      ),

    postal_code:
      normalizeNullable(
        formData.postal_code
      ),

    notes:
      normalizeNullable(
        formData.notes
      ),

    tags:
      normalizeTags(
        formData.tags
      ),

    client_type:
      formData.client_type,

    status:
      formData.status,
  };
};

// ======================================================
// COMPONENT
// ======================================================

const ClientCreate = () => {
  const navigate =
    useNavigate();

  const createMutation =
    useCreateClient();

  const [
    formData,
    setFormData,
  ] = useState(
    INITIAL_FORM
  );

  const [
    errors,
    setErrors,
  ] = useState({});


  const [
    unsavedDialogOpen,
    setUnsavedDialogOpen,
  ] = useState(false);

  const [
    pendingExitPath,
    setPendingExitPath,
  ] = useState('');

  const [
    typeDialogOpen,
    setTypeDialogOpen,
  ] = useState(false);

  const [
    pendingClientType,
    setPendingClientType,
  ] = useState('');

  const unsavedDialogRef =
    useRef(null);

  const typeDialogRef =
    useRef(null);

  const previousFocusRef =
    useRef(null);

  // ======================================================
  // DERIVED
  // ======================================================

  const isCorporate =
    formData.client_type ===
    'corporate';

  const tagsPreview =
    normalizeTags(
      formData.tags
    );

  const isDirty =
    normalizeFormForComparison(
      formData
    ) !==
    normalizeFormForComparison(
      INITIAL_FORM
    );

  // ======================================================
  // CHANGE
  // ======================================================

  const handleChange = (
    event
  ) => {
    if (
      createMutation.isPending
    ) {
      return;
    }

    const {
      name,
      value,
    } =
      event.target;

    let nextValue =
      value;

    if (
      name ===
      'identification_number'
    ) {
      nextValue = sanitizeDigits(
        value,
        isCorporate
          ? 10
          : 11
      );
    }

    if (name === 'postal_code') {
      nextValue = sanitizeDigits(
        value,
        5
      );
    }

    if (name === 'phone') {
      nextValue =
        sanitizePhoneInput(
          value
        );
    }

    if (
      name ===
      'name'
    ) {
      nextValue =
        String(
          value
        ).slice(
          0,
          MAX_LENGTHS.name
        );
    }

    if (
      name ===
      'email'
    ) {
      nextValue =
        String(
          value
        ).slice(
          0,
          MAX_LENGTHS.email
        );
    }

    if (
      name ===
      'address'
    ) {
      nextValue =
        String(
          value
        ).slice(
          0,
          MAX_LENGTHS.address
        );
    }

    if (
      name ===
      'city'
    ) {
      nextValue =
        String(
          value
        ).slice(
          0,
          MAX_LENGTHS.city
        );
    }

    if (
      name ===
      'district'
    ) {
      nextValue =
        String(
          value
        ).slice(
          0,
          MAX_LENGTHS.district
        );
    }

    if (
      name ===
      'notes'
    ) {
      nextValue =
        String(
          value
        ).slice(
          0,
          MAX_LENGTHS.notes
        );
    }

    if (
      name ===
      'tags'
    ) {
      nextValue =
        String(
          value
        ).slice(
          0,
          MAX_LENGTHS.tags
        );
    }

    setFormData(
      (current) => ({
        ...current,
        [name]:
          nextValue,
      })
    );

    if (
      errors[name]
    ) {
      setErrors(
        (current) => ({
          ...current,
          [name]:
            '',
        })
      );
    }
  };

  // ======================================================
  // CLIENT TYPE
  // ======================================================

  const applyClientTypeChange =
    (type) => {
      setFormData(
        (current) => ({
          ...current,
          client_type:
            type,
          identification_number:
            '',
        })
      );

      setErrors(
        (current) => ({
          ...current,
          identification_number:
            '',
          client_type:
            '',
        })
      );
    };

  const handleClientTypeChange =
    (type) => {
      if (
        createMutation.isPending ||
        type === formData.client_type
      ) {
        return;
      }

      if (
        !CLIENT_TYPE_OPTIONS.includes(
          type
        )
      ) {
        return;
      }

      if (
        String(
          formData.identification_number ||
          ''
        ).trim()
      ) {
        setPendingClientType(
          type
        );

        setTypeDialogOpen(
          true
        );

        return;
      }

      applyClientTypeChange(
        type
      );
    };

  const closeTypeDialog =
    () => {
      setTypeDialogOpen(
        false
      );

      setPendingClientType(
        ''
      );
    };

  const confirmClientTypeChange =
    () => {
      if (
        !CLIENT_TYPE_OPTIONS.includes(
          pendingClientType
        )
      ) {
        closeTypeDialog();
        return;
      }

      applyClientTypeChange(
        pendingClientType
      );

      closeTypeDialog();
    };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      const name =
        formData.name.trim();

      const identificationNumber =
        String(
          formData.identification_number ||
          ''
        )
          .replace(
            /\s+/g,
            ''
          )
          .trim();

      const phone =
        normalizePhone(
          formData.phone
        );

      const email =
        String(
          formData.email ||
          ''
        )
          .trim()
          .toLowerCase();

      if (!name) {
        nextErrors.name =
          isCorporate
            ? 'Şirket / kurum unvanı gereklidir'
            : 'Ad Soyad gereklidir';
      } else if (
        name.length <
        2
      ) {
        nextErrors.name =
          'Müvekkil adı en az 2 karakter olmalıdır';
      } else if (
        name.length >
        255
      ) {
        nextErrors.name =
          'Müvekkil adı en fazla 255 karakter olabilir';
      }

      if (
        identificationNumber
      ) {
        if (isCorporate) {
          if (
            !/^\d{10}$/.test(
              identificationNumber
            )
          ) {
            nextErrors.identification_number =
              'Vergi Kimlik Numarası 10 haneli olmalıdır';
          }
        } else if (
          identificationNumber.length !==
          11
        ) {
          nextErrors.identification_number =
            'T.C. Kimlik Numarası 11 haneli olmalıdır';
        } else if (
          identificationNumber[0] ===
          '0'
        ) {
          nextErrors.identification_number =
            'T.C. Kimlik Numarası 0 ile başlayamaz';
        } else if (
          Number(
            identificationNumber[10]
          ) % 2 !==
          0
        ) {
          nextErrors.identification_number =
            'T.C. Kimlik Numarasının son hanesi çift olmalıdır';
        } else if (
          !validateTCKN(
            identificationNumber
          )
        ) {
          nextErrors.identification_number =
            'Geçerli bir T.C. Kimlik Numarası giriniz';
        }
      }

      if (phone) {
        const digits =
          phone.replace(
            /\D/g,
            ''
          );

        if (
          digits.length <
            10 ||
          digits.length >
            15
        ) {
          nextErrors.phone =
            'Geçerli bir telefon numarası giriniz';
        }
      }

      if (
        email &&
        !validateEmail(
          email
        )
      ) {
        nextErrors.email =
          'Geçerli bir e-posta adresi giriniz';
      }

      if (
        email.length >
        MAX_LENGTHS.email
      ) {
        nextErrors.email =
          'E-posta adresi çok uzun';
      }

      if (
        formData.address.length >
        MAX_LENGTHS.address
      ) {
        nextErrors.address =
          `Adres en fazla ${MAX_LENGTHS.address} karakter olabilir`;
      }

      if (
        formData.city.length >
        MAX_LENGTHS.city
      ) {
        nextErrors.city =
          `Şehir en fazla ${MAX_LENGTHS.city} karakter olabilir`;
      }

      if (
        formData.district.length >
        MAX_LENGTHS.district
      ) {
        nextErrors.district =
          `İlçe en fazla ${MAX_LENGTHS.district} karakter olabilir`;
      }

      if (
        formData.notes.length >
        MAX_LENGTHS.notes
      ) {
        nextErrors.notes =
          `Notlar en fazla ${MAX_LENGTHS.notes} karakter olabilir`;
      }

      if (
        formData.tags.length >
        MAX_LENGTHS.tags
      ) {
        nextErrors.tags =
          `Etiket alanı en fazla ${MAX_LENGTHS.tags} karakter olabilir`;
      }

      if (
        !CLIENT_TYPE_OPTIONS.includes(
          formData.client_type
        )
      ) {
        nextErrors.client_type =
          'Geçersiz müvekkil türü';
      }

      if (
        !STATUS_OPTIONS.includes(
          formData.status
        )
      ) {
        nextErrors.status =
          'Geçersiz müvekkil durumu';
      }

      if (
        formData.postal_code &&
        !/^\d{5}$/.test(
          formData.postal_code
        )
      ) {
        nextErrors.postal_code =
          'Posta kodu 5 haneli olmalıdır';
      }

      setErrors(
        nextErrors
      );

      return (
        Object.keys(
          nextErrors
        ).length === 0
      );
    };

  // ======================================================
  // BACKEND ERROR MAPPING
  // ======================================================

  const mapBackendError =
    (error) => {
      const message =
        error?.response
          ?.data?.message ||
        error?.message ||
        '';

      const nextErrors =
        getBackendFieldErrors(
          error
        );

      if (
        /TCKNO|VKN|identification_number/i.test(
          message
        )
      ) {
        nextErrors.identification_number =
          getClientFieldErrorMessage(
            'identification_number',
            message
          );
      }

      if (
        /email|e-posta/i.test(
          message
        )
      ) {
        nextErrors.email =
          getClientFieldErrorMessage(
            'email',
            message
          );
      }

      if (
        /phone|telefon/i.test(
          message
        )
      ) {
        nextErrors.phone =
          getClientFieldErrorMessage(
            'phone',
            message
          );
      }

      if (
        /name|ad soyad|unvan/i.test(
          message
        )
      ) {
        nextErrors.name =
          getClientFieldErrorMessage(
            'name',
            message
          );
      }

      if (
        /address|adres/i.test(
          message
        )
      ) {
        nextErrors.address =
          getClientFieldErrorMessage(
            'address',
            message
          );
      }

      if (
        /city|şehir|sehir/i.test(
          message
        )
      ) {
        nextErrors.city =
          getClientFieldErrorMessage(
            'city',
            message
          );
      }

      if (
        /district|ilçe|ilce/i.test(
          message
        )
      ) {
        nextErrors.district =
          getClientFieldErrorMessage(
            'district',
            message
          );
      }

      if (
        /postal|posta/i.test(
          message
        )
      ) {
        nextErrors.postal_code =
          getClientFieldErrorMessage(
            'postal_code',
            message
          );
      }

      if (
        /tag|etiket/i.test(
          message
        )
      ) {
        nextErrors.tags =
          getClientFieldErrorMessage(
            'tags',
            message
          );
      }

      if (
        /status|durum/i.test(
          message
        )
      ) {
        nextErrors.status =
          getClientFieldErrorMessage(
            'status',
            message
          );
      }

      if (
        /client_type|müvekkil türü|müvekkil tipi/i.test(
          message
        )
      ) {
        nextErrors.client_type =
          getClientFieldErrorMessage(
            'client_type',
            message
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

        return true;
      }

      return false;
    };

  // ======================================================
  // UNSAVED CHANGES / DIALOG ACCESSIBILITY
  // ======================================================

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const handleBeforeUnload =
      (event) => {
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
  ]);

  useEffect(() => {
    const dialog =
      unsavedDialogOpen
        ? unsavedDialogRef.current
        : typeDialogOpen
          ? typeDialogRef.current
          : null;

    if (!dialog) {
      return undefined;
    }

    previousFocusRef.current =
      document.activeElement;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    const getFocusableElements =
      () => Array.from(
        dialog.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    const frame =
      window.requestAnimationFrame(
        () => {
          const focusable =
            getFocusableElements();

          (
            focusable[0] ||
            dialog
          )?.focus?.();
        }
      );

    const handleKeyDown =
      (event) => {
        if (
          event.key ===
          'Escape'
        ) {
          event.preventDefault();

          if (unsavedDialogOpen) {
            setUnsavedDialogOpen(
              false
            );

            setPendingExitPath(
              ''
            );
          } else if (typeDialogOpen) {
            closeTypeDialog();
          }

          return;
        }

        if (
          event.key !==
          'Tab'
        ) {
          return;
        }

        const focusable =
          getFocusableElements();

        if (
          focusable.length ===
          0
        ) {
          event.preventDefault();
          dialog.focus();
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
      window.cancelAnimationFrame(
        frame
      );

      document.removeEventListener(
        'keydown',
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;

      previousFocusRef.current
        ?.focus?.();
    };
  }, [
    unsavedDialogOpen,
    typeDialogOpen,
  ]);

  const requestExit =
    (
      path,
      event
    ) => {
      event?.preventDefault?.();

      if (
        createMutation.isPending
      ) {
        return;
      }

      if (!isDirty) {
        navigate(
          path
        );

        return;
      }

      setPendingExitPath(
        path
      );

      setUnsavedDialogOpen(
        true
      );
    };

  const closeUnsavedDialog =
    () => {
      setUnsavedDialogOpen(
        false
      );

      setPendingExitPath(
        ''
      );
    };

  const discardAndExit =
    () => {
      const path =
        pendingExitPath ||
        '/clients';

      setUnsavedDialogOpen(
        false
      );

      setPendingExitPath(
        ''
      );

      navigate(
        path
      );
    };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (
      createMutation.isPending
    ) {
      return;
    }

    if (
      !validateForm()
    ) {
      toast.error(
        'Formdaki eksik veya hatalı alanları kontrol edin'
      );

      return;
    }

    const payload =
      buildPayload(
        formData
      );

    createMutation.mutate(
      payload,
      {
        onSuccess: (
          response
        ) => {
          const createdId =
            getCreatedClientId(
              response
            );

          if (
            createdId
          ) {
            navigate(
              `/clients/${createdId}`
            );

            return;
          }

          navigate(
            '/clients'
          );
        },

        onError: (
          error
        ) => {
          const handled =
            mapBackendError(
              error
            );

          if (!handled) {
            toast.error(
              getClientCreateErrorMessage(
                error
              )
            );
          }
        },
      }
    );
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to="/clients"
          onClick={(event) =>
            requestExit(
              '/clients',
              event
            )
          }
          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Müvekkiller
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Yeni Müvekkil
          </h1>

          {isDirty && (
            <Badge variant="warning">
              Kaydedilmemiş değişiklik
            </Badge>
          )}
        </div>

        <p className="mt-1 text-sm text-gray-500">
          Müvekkilin kimlik, iletişim, adres ve sınıflandırma bilgilerini oluşturun.
        </p>

      </div>

      <Card>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6 p-6"
        >

          {/* TYPE */}

          <div>

            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Müvekkil Türü
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              <button
                type="button"
                disabled={
                  createMutation.isPending
                }
                onClick={() =>
                  handleClientTypeChange(
                    'individual'
                  )
                }
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  !isCorporate
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                }`}
              >

                <UserRound className="h-5 w-5 text-blue-600" />

                <div>

                  <p className="font-medium text-gray-900 dark:text-white">
                    Bireysel
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Gerçek kişi müvekkil
                  </p>

                </div>

              </button>

              <button
                type="button"
                disabled={
                  createMutation.isPending
                }
                onClick={() =>
                  handleClientTypeChange(
                    'corporate'
                  )
                }
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  isCorporate
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                }`}
              >

                <Building2 className="h-5 w-5 text-blue-600" />

                <div>

                  <p className="font-medium text-gray-900 dark:text-white">
                    Kurumsal
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Şirket veya kurum
                  </p>

                </div>

              </button>

            </div>

            {errors.client_type && (
              <p className="mt-2 text-sm text-red-600">
                {errors.client_type}
              </p>
            )}

          </div>

          {/* NAME */}

          <Input
            label={
              isCorporate
                ? 'Şirket / Kurum Unvanı *'
                : 'Ad Soyad *'
            }
            name="name"
            value={
              formData.name
            }
            onChange={
              handleChange
            }
            error={
              errors.name
            }
            disabled={
              createMutation.isPending
            }
            maxLength={255}
            placeholder={
              isCorporate
                ? 'Örn: ABC Teknoloji A.Ş.'
                : 'Örn: Ahmet Yılmaz'
            }
          />

          {/* IDENTIFICATION */}

          <Input
            label={
              isCorporate
                ? 'Vergi Kimlik Numarası'
                : 'T.C. Kimlik Numarası'
            }
            name="identification_number"
            value={
              formData.identification_number
            }
            onChange={
              handleChange
            }
            error={
              errors.identification_number
            }
            disabled={
              createMutation.isPending
            }
            inputMode="numeric"
            maxLength={
              isCorporate
                ? 10
                : 11
            }
            placeholder={
              isCorporate
                ? '10 haneli VKN'
                : '11 haneli TCKNO'
            }
          />

          {/* CONTACT */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <Input
              label="Telefon"
              name="phone"
              value={
                formData.phone
              }
              onChange={
                handleChange
              }
              error={
                errors.phone
              }
              disabled={
                createMutation.isPending
              }
              type="tel"
              inputMode="tel"
              maxLength={
                MAX_LENGTHS.phoneDigits + 1
              }
              placeholder="+905XXXXXXXXX"
            />

            <Input
              label="E-posta"
              name="email"
              type="email"
              value={
                formData.email
              }
              onChange={
                handleChange
              }
              error={
                errors.email
              }
              disabled={
                createMutation.isPending
              }
              maxLength={
                MAX_LENGTHS.email
              }
              placeholder="ornek@domain.com"
            />

          </div>

          {/* ADDRESS */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Adres
            </label>

            <textarea
              name="address"
              value={
                formData.address
              }
              onChange={
                handleChange
              }
              disabled={
                createMutation.isPending
              }
              rows="3"
              maxLength={
                MAX_LENGTHS.address
              }
              className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-white ${
                errors.address
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Açık adres..."
            />

            {errors.address && (
              <p className="mt-1 text-sm text-red-600">
                {errors.address}
              </p>
            )}

          </div>

          {/* LOCATION */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            <Input
              label="Şehir"
              name="city"
              value={
                formData.city
              }
              onChange={
                handleChange
              }
              disabled={
                createMutation.isPending
              }
              maxLength={
                MAX_LENGTHS.city
              }
              error={
                errors.city
              }
            />

            <Input
              label="İlçe"
              name="district"
              value={
                formData.district
              }
              onChange={
                handleChange
              }
              disabled={
                createMutation.isPending
              }
              maxLength={
                MAX_LENGTHS.district
              }
              error={
                errors.district
              }
            />

            <Input
              label="Posta Kodu"
              name="postal_code"
              value={
                formData.postal_code
              }
              onChange={
                handleChange
              }
              error={
                errors.postal_code
              }
              disabled={
                createMutation.isPending
              }
              inputMode="numeric"
              maxLength={5}
              placeholder="5 haneli posta kodu"
            />

          </div>

          {/* STATUS */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Durum
            </label>

            <select
              name="status"
              value={
                formData.status
              }
              onChange={
                handleChange
              }
              disabled={
                createMutation.isPending
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="active">
                Aktif
              </option>

              <option value="passive">
                Pasif
              </option>

              <option value="archived">
                Arşiv
              </option>
            </select>

            {errors.status && (
              <p className="mt-1 text-sm text-red-600">
                {errors.status}
              </p>
            )}

          </div>

          {/* TAGS */}

          <div>

            <Input
              label="Etiketler"
              name="tags"
              value={
                formData.tags
              }
              onChange={
                handleChange
              }
              disabled={
                createMutation.isPending
              }
              maxLength={
                MAX_LENGTHS.tags
              }
              error={
                errors.tags
              }
              placeholder="VIP, şirket, ceza, icra"
            />

            <p className="mt-1 text-xs text-gray-500">
              Birden fazla etiketi virgülle ayırın.
            </p>

            {tagsPreview.length >
              0 && (
              <div className="mt-3 flex flex-wrap gap-2">

                {tagsPreview.map(
                  (
                    tag
                  ) => (
                    <Badge
                      key={
                        tag
                      }
                      variant="default"
                    >
                      #{tag}
                    </Badge>
                  )
                )}

              </div>
            )}

          </div>

          {/* NOTES */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Genel Not
            </label>

            <textarea
              name="notes"
              value={
                formData.notes
              }
              onChange={
                handleChange
              }
              disabled={
                createMutation.isPending
              }
              rows="5"
              maxLength={
                MAX_LENGTHS.notes
              }
              className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-white ${
                errors.notes
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Müvekkille ilgili önemli genel bilgiler..."
            />

            {errors.notes && (
              <p className="mt-1 text-sm text-red-600">
                {errors.notes}
              </p>
            )}

          </div>

          {/* ACTIONS */}

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">

            <Button
              type="submit"
              loading={
                createMutation.isPending
              }
              disabled={
                createMutation.isPending
              }
            >
              <Save className="mr-2 h-4 w-4" />

              Müvekkili Oluştur
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={
                createMutation.isPending
              }
              onClick={() =>
                requestExit(
                  '/clients'
                )
              }
            >
              Vazgeç
            </Button>

          </div>

        </form>

      </Card>

      {unsavedDialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          aria-labelledby="client-create-unsaved-title"
          aria-describedby="client-create-unsaved-description"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Uyarıyı kapat"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
            onClick={
              closeUnsavedDialog
            }
          />

          <div
            ref={
              unsavedDialogRef
            }
            tabIndex={-1}
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-white/[0.08] dark:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/[0.1] dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2
                  id="client-create-unsaved-title"
                  className="text-base font-semibold text-slate-900 dark:text-white"
                >
                  Kaydedilmemiş değişiklikler
                </h2>

                <p
                  id="client-create-unsaved-description"
                  className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300"
                >
                  Yeni müvekkil formunda henüz kaydetmediğiniz bilgiler var. Çıkarsanız bu bilgiler kaybolacaktır.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-white/[0.06] sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={
                  closeUnsavedDialog
                }
              >
                Düzenlemeye Devam Et
              </Button>

              <Button
                type="button"
                variant="danger"
                onClick={
                  discardAndExit
                }
              >
                Değişiklikleri At ve Çık
              </Button>
            </div>
          </div>
        </div>
      )}

      {typeDialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          aria-labelledby="client-create-type-title"
          aria-describedby="client-create-type-description"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Uyarıyı kapat"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
            onClick={
              closeTypeDialog
            }
          />

          <div
            ref={
              typeDialogRef
            }
            tabIndex={-1}
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-white/[0.08] dark:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/[0.1] dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2
                  id="client-create-type-title"
                  className="text-base font-semibold text-slate-900 dark:text-white"
                >
                  Müvekkil türünü değiştir
                </h2>

                <p
                  id="client-create-type-description"
                  className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300"
                >
                  Müvekkil türü değiştirildiğinde girdiğiniz T.C. Kimlik / Vergi Kimlik Numarası temizlenecektir. Devam etmek istiyor musunuz?
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-white/[0.06] sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={
                  closeTypeDialog
                }
              >
                Vazgeç
              </Button>

              <Button
                type="button"
                onClick={
                  confirmClientTypeChange
                }
              >
                Türü Değiştir
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClientCreate;