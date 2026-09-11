import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  useClient,
  useDeleteClient,
  useUpdateClient,
} from '../../features/clients/client.query.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Save,
  Trash2,
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
  postalCode: 5,
  notes: 5000,
  tagsText: 1000,
  tag: 50,
  tagCount: 30,
};

// ======================================================
// HELPERS
// ======================================================

const normalizeId = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  if (
    typeof value ===
    'object'
  ) {
    const objectId =
      value?.id ??
      value?._id;

    if (
      objectId === null ||
      objectId === undefined ||
      objectId === ''
    ) {
      return '';
    }

    return String(
      objectId
    );
  }

  return String(
    value
  );
};

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
  const raw =
    String(
      value ??
      ''
    ).trim();

  if (!raw) {
    return '';
  }

  const hasLeadingPlus =
    raw.startsWith(
      '+'
    );

  const digits =
    raw.replace(
      /\D/g,
      ''
    );

  return hasLeadingPlus
    ? `+${digits}`
    : digits;
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

const normalizeNullable = (
  value
) => {
  const normalized =
    String(
      value ??
      ''
    ).trim();

  return normalized || null;
};

const validateEmail = (
  value
) => {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
};

const isValidTCKN = (
  value
) => {
  const tckn =
    String(
      value ||
      ''
    ).trim();

  if (
    !/^[1-9]\d{10}$/.test(
      tckn
    )
  ) {
    return false;
  }

  const digits =
    tckn
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

  const digit10 =
    (
      (
        (
          oddSum * 7
        ) -
        evenSum
      ) % 10 +
      10
    ) % 10;

  if (
    digit10 !==
    digits[9]
  ) {
    return false;
  }

  const digit11 =
    digits
      .slice(
        0,
        10
      )
      .reduce(
        (
          sum,
          digit
        ) =>
          sum + digit,
        0
      ) % 10;

  return (
    digit11 ===
    digits[10]
  );
};

const formFromClient = (
  client
) => ({
  name:
    String(
      client?.name ??
      ''
    ),

  identification_number:
    String(
      client?.identification_number ??
      ''
    ).replace(
      /\D/g,
      ''
    ),

  email:
    String(
      client?.email ??
      ''
    ),

  phone:
    String(
      client?.phone ??
      ''
    ),

  address:
    String(
      client?.address ??
      ''
    ),

  city:
    String(
      client?.city ??
      ''
    ),

  district:
    String(
      client?.district ??
      ''
    ),

  postal_code:
    String(
      client?.postal_code ??
      ''
    ).replace(
      /\D/g,
      ''
    ),

  notes:
    String(
      client?.notes ??
      ''
    ),

  tags:
    Array.isArray(
      client?.tags
    )
      ? client.tags.join(
          ', '
        )
      : String(
          client?.tags ??
          ''
        ),

  client_type:
    CLIENT_TYPE_OPTIONS.includes(
      client?.client_type
    )
      ? client.client_type
      : 'individual',

  status:
    STATUS_OPTIONS.includes(
      client?.status
    )
      ? client.status
      : 'active',
});

const normalizeFormForComparison = (
  form
) => ({
  name:
    String(
      form.name ??
      ''
    ).trim(),

  identification_number:
    normalizeNullable(
      String(
        form.identification_number ||
        ''
      ).replace(
        /\D/g,
        ''
      )
    ),

  email:
    normalizeNullable(
      String(
        form.email ||
        ''
      )
        .trim()
        .toLowerCase()
    ),

  phone:
    normalizeNullable(
      normalizePhone(
        form.phone
      )
    ),

  address:
    normalizeNullable(
      form.address
    ),

  city:
    normalizeNullable(
      form.city
    ),

  district:
    normalizeNullable(
      form.district
    ),

  postal_code:
    normalizeNullable(
      String(
        form.postal_code ||
        ''
      ).replace(
        /\D/g,
        ''
      )
    ),

  notes:
    normalizeNullable(
      form.notes
    ),

  tags:
    normalizeTags(
      form.tags
    ),

  client_type:
    form.client_type,

  status:
    form.status,
});

const CLIENT_FIELD_ERROR_MESSAGES = {
  name: 'Geçerli bir müvekkil adı giriniz',
  identification_number: 'Geçerli bir kimlik numarası giriniz',
  email: 'Geçerli bir e-posta adresi giriniz',
  phone: 'Geçerli bir telefon numarası giriniz',
  address: 'Adres bilgisini kontrol edin',
  city: 'Şehir bilgisini kontrol edin',
  district: 'İlçe bilgisini kontrol edin',
  postal_code: 'Posta kodunu kontrol edin',
  tags: 'Etiket bilgilerini kontrol edin',
  status: 'Geçersiz müvekkil durumu',
  client_type: 'Geçersiz müvekkil türü',
  notes: 'Genel not alanını kontrol edin',
};

const looksTurkish = (
  value
) =>
  /[çğıöşüÇĞİÖŞÜ]|müvekkil|geçersiz|zorunlu|bulunamadı|yetki|kayıt|telefon|adres|şehir|ilçe|posta|etiket|durum|not|kimlik|e-posta/i.test(
    String(
      value ||
      ''
    )
  );

const isTechnicalValidationMessage = (
  value
) =>
  /validation failed|validation error|sequelizevalidationerror|notnull violation|cannot be null|must not be null|invalid input syntax|invalid value|constraint|violates|typeerror|referenceerror/i.test(
    String(
      value ||
      ''
    )
  );

const getClientFieldErrorMessage = (
  field,
  value
) => {
  const fallback =
    CLIENT_FIELD_ERROR_MESSAGES[
      field
    ] ||
    'Geçersiz değer';

  const message =
    String(
      value ||
      ''
    ).trim();

  if (!message) {
    return fallback;
  }

  if (
    isTechnicalValidationMessage(
      message
    )
  ) {
    return fallback;
  }

  if (
    field ===
      'identification_number'
  ) {
    if (
      /already|exists|unique|duplicate/i.test(
        message
      )
    ) {
      return 'Bu kimlik numarası başka bir müvekkil kaydında kullanılıyor';
    }

    if (
      /vkn|tax/i.test(
        message
      )
    ) {
      return 'Geçerli bir Vergi Kimlik Numarası giriniz';
    }

    if (
      /tckn|tc kimlik|identity/i.test(
        message
      )
    ) {
      return 'Geçerli bir T.C. Kimlik Numarası giriniz';
    }
  }

  if (
    field === 'email' &&
    /already|exists|unique|duplicate/i.test(
      message
    )
  ) {
    return 'Bu e-posta adresi başka bir müvekkil kaydında kullanılıyor';
  }

  if (
    looksTurkish(
      message
    )
  ) {
    return message;
  }

  return fallback;
};

const getClientErrorMessage = (
  errorOrMessage,
  fallback =
    'İşlem tamamlanamadı. Lütfen tekrar deneyin.'
) => {
  const responseData =
    errorOrMessage?.response?.data;

  const messages = [];

  if (
    typeof errorOrMessage ===
    'string'
  ) {
    messages.push(
      errorOrMessage
    );
  }

  if (
    responseData?.message
  ) {
    messages.push(
      responseData.message
    );
  }

  if (
    errorOrMessage?.message
  ) {
    messages.push(
      errorOrMessage.message
    );
  }

  if (
    Array.isArray(
      responseData?.errors
    )
  ) {
    responseData.errors.forEach(
      (item) => {
        const itemMessage =
          item?.msg ||
          item?.message;

        if (itemMessage) {
          messages.push(
            itemMessage
          );
        }
      }
    );
  }

  const message =
    messages
      .map((item) =>
        String(
          item ||
          ''
        ).trim()
      )
      .filter(Boolean)
      .join(' · ');

  if (!message) {
    return fallback;
  }

  if (
    /client not found|müvekkil.*bulunamadı/i.test(
      message
    )
  ) {
    return 'Müvekkil kaydı bulunamadı.';
  }

  if (
    /unauthorized|forbidden|permission|access denied|not allowed/i.test(
      message
    )
  ) {
    return 'Bu işlem için yetkiniz bulunmuyor.';
  }

  if (
    /network|failed to fetch|timeout|econnrefused|enotfound/i.test(
      message
    )
  ) {
    return 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.';
  }

  if (
    isTechnicalValidationMessage(
      message
    )
  ) {
    return 'Müvekkil bilgileri doğrulanamadı. Form alanlarını kontrol edin.';
  }

  if (
    looksTurkish(
      message
    )
  ) {
    return message;
  }

  return fallback;
};

const getBackendFieldErrors = (
  mutationError
) => {
  const responseErrors =
    mutationError?.response
      ?.data?.errors;

  const result =
    {};

  if (
    Array.isArray(
      responseErrors
    )
  ) {
    responseErrors.forEach(
      (
        item
      ) => {
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
    responseErrors &&
    typeof responseErrors ===
      'object'
  ) {
    Object.entries(
      responseErrors
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
              value
            );
        }
      }
    );
  }

  return result;
};

// ======================================================
// COMPONENT
// ======================================================

const ClientEdit = () => {
  const {
    id: idParam,
  } =
    useParams();

  const id =
    normalizeId(
      idParam
    );

  const navigate =
    useNavigate();

  const {
    user,
  } =
    useAuth();

  const initializedClientIdRef =
    useRef('');

  // ======================================================
  // QUERIES
  // ======================================================

  const {
    data,
    isLoading,
    error,
  } =
    useClient(
      id
    );

  const updateMutation =
    useUpdateClient();

  const deleteMutation =
    useDeleteClient();

  // ======================================================
  // STATE
  // ======================================================

  const [
    formData,
    setFormData,
  ] =
    useState(
      INITIAL_FORM
    );

  const [
    initialFormData,
    setInitialFormData,
  ] =
    useState(
      INITIAL_FORM
    );

  const [
    errors,
    setErrors,
  ] =
    useState({});

  const [
    deleteDialogOpen,
    setDeleteDialogOpen,
  ] =
    useState(false);

  const [
    leaveDialogOpen,
    setLeaveDialogOpen,
  ] =
    useState(false);

  const [
    pendingNavigationTarget,
    setPendingNavigationTarget,
  ] =
    useState('');

  const deleteDialogRef =
    useRef(null);

  const leaveDialogRef =
    useRef(null);

  // ======================================================
  // DATA
  // ======================================================

  const client =
    data?.data?.data ??
    data?.data ??
    data ??
    null;

  // ======================================================
  // PERMISSIONS
  // ======================================================

  const canEdit =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_CLIENTS
    );

  const canDelete =
    hasPermission(
      user,
      PERMISSION_KEYS.DELETE_CLIENTS
    );

  const isPending =
    updateMutation.isPending ||
    deleteMutation.isPending;

  const deleteCaseCount =
    Number(
      client?.summary?.case_count ??
      client?.case_count ??
      client?.cases?.length ??
      0
    ) || 0;

  const deleteClientName =
    String(
      client?.name ||
      'Seçili müvekkil'
    );

  useEffect(() => {
    const activeDialogRef =
      leaveDialogOpen
        ? leaveDialogRef
        : deleteDialogOpen
          ? deleteDialogRef
          : null;

    if (!activeDialogRef) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    const previousActiveElement =
      document.activeElement;

    const getFocusableElements =
      () => {
        const dialog =
          activeDialogRef.current;

        if (!dialog) {
          return [];
        }

        return Array.from(
          dialog.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
      };

    const focusDialog =
      window.requestAnimationFrame(
        () => {
          const focusableElements =
            getFocusableElements();

          if (
            focusableElements.length >
            0
          ) {
            focusableElements[0].focus();
          } else {
            activeDialogRef.current?.focus();
          }
        }
      );

    const handleKeyDown =
      (event) => {
        if (
          event.key === 'Escape'
        ) {
          if (
            deleteDialogOpen &&
            deleteMutation.isPending
          ) {
            return;
          }

          if (leaveDialogOpen) {
            setLeaveDialogOpen(
              false
            );

            setPendingNavigationTarget(
              ''
            );
          } else {
            setDeleteDialogOpen(
              false
            );
          }

          return;
        }

        if (
          event.key !== 'Tab'
        ) {
          return;
        }

        const focusableElements =
          getFocusableElements();

        if (
          focusableElements.length ===
          0
        ) {
          event.preventDefault();
          return;
        }

        const firstElement =
          focusableElements[0];

        const lastElement =
          focusableElements[
            focusableElements.length - 1
          ];

        if (
          event.shiftKey &&
          document.activeElement ===
            firstElement
        ) {
          event.preventDefault();
          lastElement.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement ===
            lastElement
        ) {
          event.preventDefault();
          firstElement.focus();
        }
      };

    document.body.style.overflow =
      'hidden';

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.cancelAnimationFrame(
        focusDialog
      );

      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

      if (
        previousActiveElement instanceof
          HTMLElement &&
        document.contains(
          previousActiveElement
        )
      ) {
        previousActiveElement.focus();
      }
    };
  }, [
    deleteDialogOpen,
    leaveDialogOpen,
    deleteMutation.isPending,
  ]);

  // ======================================================
  // FORM INITIALIZATION
  // ======================================================

  useEffect(() => {
    if (
      !client ||
      !id
    ) {
      return;
    }

    /*
     * Client detail artık relation değişiklikleri sebebiyle sık refetch
     * edebilir. Her refetch'te formu yeniden doldurursak kullanıcının
     * kaydetmediği değişiklikler silinir. Aynı route id'si için form
     * yalnızca ilk server cevabında initialize edilir.
     */
    if (
      initializedClientIdRef.current ===
      id
    ) {
      return;
    }

    const nextForm =
      formFromClient(
        client
      );

    setFormData(
      nextForm
    );

    setInitialFormData(
      nextForm
    );

    setErrors({});

    initializedClientIdRef.current =
      id;
  }, [
    client,
    id,
  ]);

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

  const normalizedPayload =
    normalizeFormForComparison(
      formData
    );

  const initialNormalizedPayload =
    normalizeFormForComparison(
      initialFormData
    );

  const isDirty =
    JSON.stringify(
      normalizedPayload
    ) !==
    JSON.stringify(
      initialNormalizedPayload
    );


  useEffect(() => {
    if (
      !isDirty ||
      isPending
    ) {
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
    isPending,
  ]);

  // ======================================================
  // CHANGE
  // ======================================================

  const handleChange = (
    event
  ) => {
    if (
      isPending ||
      !canEdit
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
      nextValue =
        String(
          value
        )
          .replace(
            /\D/g,
            ''
          )
          .slice(
            0,
            isCorporate
              ? 10
              : 11
          );
    }

    if (
      name ===
      'postal_code'
    ) {
      nextValue =
        String(
          value
        )
          .replace(
            /\D/g,
            ''
          )
          .slice(
            0,
            MAX_LENGTHS.postalCode
          );
    }

    if (
      name ===
      'phone'
    ) {
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
          MAX_LENGTHS.tagsText
        );
    }

    setFormData(
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

  // ======================================================
  // CLIENT TYPE
  // ======================================================

  const handleClientTypeChange =
    (
      type
    ) => {
      if (
        isPending ||
        !canEdit ||
        !CLIENT_TYPE_OPTIONS.includes(
          type
        )
      ) {
        return;
      }

      if (
        formData.client_type ===
        type
      ) {
        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          client_type:
            type,

          /*
           * TCKN ve VKN farklı veri tipleridir.
           * Tür değişince eski değer tutulmaz.
           */
          identification_number:
            '',
        })
      );

      setErrors(
        (
          current
        ) => ({
          ...current,

          client_type:
            '',

          identification_number:
            '',
        })
      );
    };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      const name =
        String(
          formData.name ??
          ''
        ).trim();

      const identificationNumber =
        String(
          formData.identification_number ||
          ''
        )
          .replace(
            /\D/g,
            ''
          )
          .trim();

      const email =
        String(
          formData.email ||
          ''
        )
          .trim()
          .toLowerCase();

      const phone =
        normalizePhone(
          formData.phone
        );

      const postalCode =
        String(
          formData.postal_code ||
          ''
        )
          .replace(
            /\D/g,
            ''
          )
          .trim();

      if (
        !name
      ) {
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
        MAX_LENGTHS.name
      ) {
        nextErrors.name =
          `Müvekkil adı en fazla ${MAX_LENGTHS.name} karakter olabilir`;
      }

      if (
        identificationNumber
      ) {
        if (
          isCorporate
        ) {
          if (
            !/^\d{10}$/.test(
              identificationNumber
            )
          ) {
            nextErrors.identification_number =
              'Vergi Kimlik Numarası 10 haneli olmalıdır';
          }
        } else if (
          !isValidTCKN(
            identificationNumber
          )
        ) {
          nextErrors.identification_number =
            'Geçerli bir T.C. Kimlik Numarası giriniz';
        }
      }

      if (
        phone
      ) {
        const digits =
          phone.replace(
            /\D/g,
            ''
          );

        if (
          digits.length <
            10 ||
          digits.length >
            MAX_LENGTHS.phoneDigits
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
        postalCode &&
        !/^\d{5}$/.test(
          postalCode
        )
      ) {
        nextErrors.postal_code =
          'Posta kodu 5 haneli olmalıdır';
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
          `Genel not en fazla ${MAX_LENGTHS.notes} karakter olabilir`;
      }

      if (
        formData.tags.length >
        MAX_LENGTHS.tagsText
      ) {
        nextErrors.tags =
          `Etiket alanı en fazla ${MAX_LENGTHS.tagsText} karakter olabilir`;
      }

      const tags =
        normalizeTags(
          formData.tags
        );

      if (
        tags.length >
        MAX_LENGTHS.tagCount
      ) {
        nextErrors.tags =
          `En fazla ${MAX_LENGTHS.tagCount} etiket eklenebilir`;
      }

      if (
        tags.some(
          (
            tag
          ) =>
            tag.length >
            MAX_LENGTHS.tag
        )
      ) {
        nextErrors.tags =
          `Etiketler en fazla ${MAX_LENGTHS.tag} karakter olabilir`;
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

      setErrors(
        nextErrors
      );

      return (
        Object.keys(
          nextErrors
        ).length ===
        0
      );
    };

  // ======================================================
  // BACKEND ERROR MAPPING
  // ======================================================

  const mapBackendError =
    (
      mutationError
    ) => {
      const rawMessage =
        mutationError?.response
          ?.data?.message ||
        mutationError?.message ||
        '';

      const nextErrors =
        getBackendFieldErrors(
          mutationError
        );

      const setMappedFieldError =
        (field) => {
          nextErrors[field] =
            getClientFieldErrorMessage(
              field,
              rawMessage
            );
        };

      if (
        /TCKNO|T\.C\.|VKN|kimlik|identification_number/i.test(
          rawMessage
        )
      ) {
        setMappedFieldError(
          'identification_number'
        );
      }

      if (
        /email|e-posta/i.test(
          rawMessage
        )
      ) {
        setMappedFieldError(
          'email'
        );
      }

      if (
        /phone|telefon/i.test(
          rawMessage
        )
      ) {
        setMappedFieldError(
          'phone'
        );
      }

      if (
        /name|ad soyad|unvan|müvekkil adı/i.test(
          rawMessage
        )
      ) {
        setMappedFieldError(
          'name'
        );
      }

      if (
        /posta kodu|postal/i.test(
          rawMessage
        )
      ) {
        setMappedFieldError(
          'postal_code'
        );
      }

      if (
        /address|adres/i.test(
          rawMessage
        )
      ) {
        setMappedFieldError(
          'address'
        );
      }

      if (
        /city|şehir|sehir/i.test(
          rawMessage
        )
      ) {
        setMappedFieldError(
          'city'
        );
      }

      if (
        /district|ilçe|ilce/i.test(
          rawMessage
        )
      ) {
        setMappedFieldError(
          'district'
        );
      }

      if (
        /tag|etiket/i.test(
          rawMessage
        )
      ) {
        setMappedFieldError(
          'tags'
        );
      }

      if (
        /status|durum/i.test(
          rawMessage
        )
      ) {
        setMappedFieldError(
          'status'
        );
      }

      if (
        /client_type|müvekkil türü|müvekkil tipi/i.test(
          rawMessage
        )
      ) {
        setMappedFieldError(
          'client_type'
        );
      }

      if (
        /note|not/i.test(
          rawMessage
        )
      ) {
        setMappedFieldError(
          'notes'
        );
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
      }
    };

  // ======================================================
  // UPDATE
  // ======================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (
      !canEdit
    ) {
      toast.error(
        'Müvekkil düzenleme yetkiniz bulunmuyor'
      );

      return;
    }

    if (
      isPending
    ) {
      return;
    }

    if (!id) {
      toast.error(
        'Geçerli müvekkil kaydı bulunamadı'
      );

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

    if (
      !isDirty
    ) {
      toast(
        'Kaydedilecek bir değişiklik bulunmuyor'
      );

      return;
    }

    updateMutation.mutate(
      {
        id,

        data:
          normalizedPayload,
      },
      {
        /*
         * Merkezi useUpdateClient hook'u cache'i senkronlayıp
         * toast'ı gösterdikten sonra detail'e dönülür.
         */
        onSuccess: () => {
          navigate(
            `/clients/${id}`
          );
        },

        /*
         * Merkezi hook genel hata toast'ını gösterir.
         * Bu sayfa yalnız alan bazlı hataları forma yerleştirir;
         * ikinci bir toast üretmez.
         */
        onError: (
          mutationError
        ) => {
          mapBackendError(
            mutationError
          );
        },
      }
    );
  };

  // ======================================================
  // CANCEL
  // ======================================================

  const requestNavigation =
    (
      target
    ) => {
      if (
        isPending
      ) {
        return;
      }

      if (
        isDirty
      ) {
        setPendingNavigationTarget(
          target
        );

        setLeaveDialogOpen(
          true
        );

        return;
      }

      navigate(
        target
      );
    };

  const handleCancel =
    () => {
      requestNavigation(
        id
          ? `/clients/${id}`
          : '/clients'
      );
    };

  const handleGuardedDetailLink =
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      if (
        isPending ||
        isDirty
      ) {
        event.preventDefault();

        requestNavigation(
          id
            ? `/clients/${id}`
            : '/clients'
        );
      }
    };

  const handleCloseLeaveDialog =
    () => {
      setLeaveDialogOpen(
        false
      );

      setPendingNavigationTarget(
        ''
      );
    };

  const handleConfirmLeave =
    () => {
      const target =
        pendingNavigationTarget ||
        (id
          ? `/clients/${id}`
          : '/clients');

      setLeaveDialogOpen(
        false
      );

      setPendingNavigationTarget(
        ''
      );

      navigate(
        target
      );
    };

  // ======================================================
  // DELETE
  // ======================================================

  const handleDelete =
    () => {
      if (
        !canDelete
      ) {
        toast.error(
          'Müvekkil kaydını kaldırma yetkiniz bulunmuyor'
        );

        return;
      }

      if (
        isPending
      ) {
        return;
      }

      if (!id) {
        toast.error(
          'Geçerli müvekkil kaydı bulunamadı'
        );

        return;
      }

      setDeleteDialogOpen(
        true
      );
    };

  const handleCloseDeleteDialog =
    () => {
      if (
        deleteMutation.isPending
      ) {
        return;
      }

      setDeleteDialogOpen(
        false
      );
    };

  const handleConfirmDelete =
    () => {
      if (
        !canDelete ||
        deleteMutation.isPending
      ) {
        return;
      }

      if (!id) {
        toast.error(
          'Geçerli müvekkil kaydı bulunamadı'
        );

        return;
      }

      deleteMutation.mutate(
        id,
        {
          /*
           * Merkezi hook cache temizliği ve toast'ı tamamladıktan
           * sonra listeye dönülür.
           */
          onSuccess: () => {
            setDeleteDialogOpen(
              false
            );

            navigate(
              '/clients'
            );
          },
        }
      );
    };

  // ======================================================
  // LOADING
  // ======================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Müvekkil bilgileri yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    error ||
    !client
  ) {
    return (
      <div className="py-16 text-center">
        <div className="mb-4 text-5xl">
          👤
        </div>

        <h2 className="text-xl font-semibold text-red-600">
          Müvekkil bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {getClientErrorMessage(
            error,
            'Bu kayıt silinmiş olabilir veya görüntüleme yetkiniz bulunmayabilir.'
          )}
        </p>

        <Link
          to="/clients"
          className="mt-4 inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Müvekkillere Dön
        </Link>
      </div>
    );
  }

  // ======================================================
  // PERMISSION ERROR
  // ======================================================

  if (
    !canEdit
  ) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900/50 dark:bg-amber-900/10">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />

          <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
            Düzenleme yetkiniz bulunmuyor
          </h2>

          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Bu müvekkilin bilgilerini görüntüleyebilirsiniz ancak değiştiremezsiniz.
          </p>

          <Link
            to={
              id
                ? `/clients/${id}`
                : '/clients'
            }
          >
            <Button
              className="mt-4"
              variant="secondary"
            >
              Müvekkil Detayına Dön
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* HEADER */}

      <div>
        <Link
          to={
            id
              ? `/clients/${id}`
              : '/clients'
          }
          onClick={
            handleGuardedDetailLink
          }
          aria-disabled={
            isPending
          }
          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Müvekkil Detayı
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Müvekkil Bilgilerini Düzenle
          </h1>

          {isDirty && (
            <Badge
              variant="warning"
            >
              Kaydedilmemiş değişiklik
            </Badge>
          )}
        </div>

        <p className="mt-1 text-sm text-gray-500">
          Kimlik, iletişim, adres ve sınıflandırma bilgilerini güncelleyin.
        </p>
      </div>

      <Card>
        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6 p-6"
        >
          {/* CLIENT TYPE */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Müvekkil Türü
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={
                  isPending
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
                  isPending
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
              <p className="mt-2 text-xs text-red-600">
                {errors.client_type}
              </p>
            )}
          </div>

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
              isPending
            }
            maxLength={
              MAX_LENGTHS.name
            }
            placeholder={
              isCorporate
                ? 'Örn: ABC Teknoloji A.Ş.'
                : 'Örn: Ahmet Yılmaz'
            }
          />

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
              isPending
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Telefon"
              name="phone"
              type="tel"
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
                isPending
              }
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
                isPending
              }
              maxLength={
                MAX_LENGTHS.email
              }
              placeholder="ornek@domain.com"
            />
          </div>

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
                isPending
              }
              maxLength={
                MAX_LENGTHS.address
              }
              rows={3}
              className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-white ${
                errors.address
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Açık adres..."
            />

            {errors.address && (
              <p className="mt-1 text-xs text-red-600">
                {errors.address}
              </p>
            )}
          </div>

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
              error={
                errors.city
              }
              disabled={
                isPending
              }
              maxLength={
                MAX_LENGTHS.city
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
              error={
                errors.district
              }
              disabled={
                isPending
              }
              maxLength={
                MAX_LENGTHS.district
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
                isPending
              }
              inputMode="numeric"
              maxLength={
                MAX_LENGTHS.postalCode
              }
              placeholder="34000"
            />
          </div>

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
                isPending
              }
              className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-white ${
                errors.status
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
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
              <p className="mt-1 text-xs text-red-600">
                {errors.status}
              </p>
            )}

            {formData.status ===
              'archived' && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                <p>
                  Arşiv durumu müvekkili silmez. Kayıt sistemde kalır ve ilişkili kayıtlarla bağlantısını korur.
                </p>
              </div>
            )}
          </div>

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
              error={
                errors.tags
              }
              disabled={
                isPending
              }
              maxLength={
                MAX_LENGTHS.tagsText
              }
              placeholder="VIP, şirket, ceza, icra"
            />

            <p className="mt-1 text-xs text-gray-500">
              Birden fazla etiketi virgülle ayırın. En fazla {MAX_LENGTHS.tagCount} etiket eklenebilir.
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
                        tag.toLocaleLowerCase(
                          'tr-TR'
                        )
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
                isPending
              }
              maxLength={
                MAX_LENGTHS.notes
              }
              rows={5}
              className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-white ${
                errors.notes
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Müvekkille ilgili önemli genel bilgiler..."
            />

            <div className="mt-1 flex justify-between gap-3">
              {errors.notes ? (
                <p className="text-xs text-red-600">
                  {errors.notes}
                </p>
              ) : (
                <span />
              )}

              <p className="text-xs text-gray-400">
                {formData.notes.length}/{MAX_LENGTHS.notes}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
            <Button
              type="submit"
              loading={
                updateMutation.isPending
              }
              disabled={
                isPending ||
                !isDirty
              }
            >
              <Save className="mr-2 h-4 w-4" />

              Değişiklikleri Kaydet
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={
                isPending
              }
              onClick={
                handleCancel
              }
            >
              Vazgeç
            </Button>

            {canDelete && (
              <Button
                type="button"
                variant="danger"
                loading={
                  deleteMutation.isPending
                }
                disabled={
                  isPending
                }
                onClick={
                  handleDelete
                }
                className="sm:ml-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />

                Kaydı Kaldır
              </Button>
            )}
          </div>
        </form>
      </Card>

      {leaveDialogOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Kaydedilmemiş değişiklik penceresini kapat"
            onClick={
              handleCloseLeaveDialog
            }
          />

          <div
            ref={
              leaveDialogRef
            }
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-leave-dialog-title"
            aria-describedby="client-leave-dialog-description"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]"
          >
            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/[0.10] dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                    Kaydedilmemiş değişiklik
                  </p>

                  <h2
                    id="client-leave-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Değişiklikleri kaydetmeden çıkmak üzeresiniz
                  </h2>

                  <p
                    id="client-leave-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    Formda henüz kaydedilmemiş değişiklikler var. Çıkarsanız bu değişiklikler uygulanmayacaktır.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.07]">
                <p className="text-sm leading-6 text-amber-950 dark:text-amber-200">
                  Düzenlemeye devam ederek formdaki bilgileri kontrol edebilir veya değişiklikleri atıp müvekkil detayına dönebilirsiniz.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.015] sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={
                  handleCloseLeaveDialog
                }
              >
                Düzenlemeye Devam Et
              </Button>

              <Button
                type="button"
                variant="danger"
                onClick={
                  handleConfirmLeave
                }
              >
                Değişiklikleri At ve Çık
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Kayıt kaldırma penceresini kapat"
            disabled={
              deleteMutation.isPending
            }
            onClick={
              handleCloseDeleteDialog
            }
          />

          <div
            ref={
              deleteDialogRef
            }
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-delete-dialog-title"
            aria-describedby="client-delete-dialog-description"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]"
          >
            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/[0.10] dark:text-red-400">
                  <Trash2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                    Kayıt kaldırma onayı
                  </p>

                  <h2
                    id="client-delete-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Müvekkil kaydını kaldır
                  </h2>

                  <p
                    id="client-delete-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    <span className="font-medium text-gray-700 dark:text-slate-200">
                      {deleteClientName}
                    </span>{' '}
                    için bu işlemi onaylayın.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-6 py-5">
              {deleteCaseCount > 0 ? (
                <>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.07]">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />

                      <div>
                        <p className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                          {deleteCaseCount} dava dosyasına bağlı
                        </p>

                        <p className="mt-1 text-sm leading-6 text-amber-900/80 dark:text-amber-200/80">
                          Müvekkil kaldırıldığında aktif müvekkili kalmayan dava dosyaları{' '}
                          <span className="font-semibold">Durduruldu</span>{' '}
                          durumuna alınır.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">
                    <p className="text-sm leading-6 text-gray-600 dark:text-slate-300">
                      Dava kayıtları ve geçmiş veriler silinmez. Müvekkilin başka aktif müvekkille birlikte bağlı olduğu dava dosyalarının durumu değişmez.
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  <p className="text-sm leading-6 text-gray-600 dark:text-slate-300">
                    Bu müvekkil kaydı sistemden kaldırılacaktır. İşlem tamamlandıktan sonra kayıt normal ekranlardan erişilebilir olmayacaktır.
                  </p>
                </div>
              )}

              <p className="text-xs leading-5 text-gray-400 dark:text-slate-500">
                Devam etmeden önce doğru müvekkil kaydını seçtiğinizden emin olun.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.015] sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={
                  deleteMutation.isPending
                }
                onClick={
                  handleCloseDeleteDialog
                }
              >
                Vazgeç
              </Button>

              <Button
                type="button"
                variant="danger"
                loading={
                  deleteMutation.isPending
                }
                disabled={
                  deleteMutation.isPending
                }
                onClick={
                  handleConfirmDelete
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />

                Kaydı Kaldır
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientEdit;
