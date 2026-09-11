import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import casePartyApi from '../../features/case-parties/case-party.api.js';

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
  Users,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const PARTY_TYPES = [
  { value: 'davaci', label: 'Davacı' },
  { value: 'davali', label: 'Davalı' },
  { value: 'supheli', label: 'Şüpheli' },
  { value: 'sanik', label: 'Sanık' },
  { value: 'musteki', label: 'Müşteki' },
  { value: 'katilan', label: 'Katılan' },
  { value: 'magdur', label: 'Mağdur' },
  { value: 'maktul', label: 'Maktul' },
  { value: 'alacakli', label: 'Alacaklı' },
  { value: 'borclu', label: 'Borçlu' },
  { value: 'ucuncu_kisi', label: 'Üçüncü Kişi' },
];

const INITIAL_FORM = {
  party_type: 'davali',
  entity_type: 'person',

  name: '',
  identification_number: '',
  tax_office: '',

  phone: '',
  email: '',
  address: '',

  lawyer_name: '',
  lawyer_phone: '',
  lawyer_email: '',
  lawyer_registry_number: '',

  notes: '',
};

// ======================================================
// HELPERS
// ======================================================

const normalizeNullable = (
  value
) => {
  const normalized =
    String(
      value ?? ''
    ).trim();

  return (
    normalized ||
    null
  );
};

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
      value?.id;

    return objectId === null ||
      objectId === undefined ||
      objectId === ''
      ? ''
      : String(
          objectId
        );
  }

  return String(
    value
  );
};

const normalizeEmail = (
  value
) => {
  const normalized =
    String(
      value || ''
    )
      .trim()
      .toLowerCase();

  return (
    normalized ||
    null
  );
};

const onlyDigits = (
  value
) => {
  return String(
    value || ''
  ).replace(
    /\D/g,
    ''
  );
};

const normalizePhone = (
  value
) => {
  return String(
    value || ''
  )
    .replace(
      /[^\d+\s()-]/g,
      ''
    )
    .slice(
      0,
      25
    );
};

const validateEmail = (
  value
) => {
  if (
    !value
  ) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
};

const validatePhone = (
  value
) => {
  if (
    !value
  ) {
    return true;
  }

  const digits =
    String(
      value
    ).replace(
      /\D/g,
      ''
    );

  return (
    digits.length >= 10 &&
    digits.length <= 15
  );
};

// ======================================================
// TCKN VALIDATION
// ======================================================

const isValidTCKN = (
  value
) => {
  const tckn =
    String(
      value || ''
    ).trim();

  /*
   * 11 hane olmalı.
   * İlk rakam 0 olamaz.
   */
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

  /*
   * TCKN son rakamı çift olmalıdır.
   */
  if (
    digits[10] % 2 !==
    0
  ) {
    return false;
  }

  /*
   * Tek indeksli basamaklar:
   * 1, 3, 5, 7, 9
   */
  const oddSum =
    digits[0] +
    digits[2] +
    digits[4] +
    digits[6] +
    digits[8];

  /*
   * Çift indeksli basamaklar:
   * 2, 4, 6, 8
   */
  const evenSum =
    digits[1] +
    digits[3] +
    digits[5] +
    digits[7];

  /*
   * 10. basamak kontrolü
   */
  const digit10 =
    (
      (
        oddSum * 7
      ) -
      evenSum
    ) % 10;

  if (
    digit10 !==
    digits[9]
  ) {
    return false;
  }

  /*
   * 11. basamak kontrolü
   */
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

const normalizeForm = (
  form
) => ({
  party_type:
    form.party_type,

  entity_type:
    form.entity_type,

  name:
    String(
      form.name || ''
    ).trim(),

  identification_number:
    onlyDigits(
      form.identification_number
    ),

  tax_office:
    String(
      form.tax_office || ''
    ).trim(),

  phone:
    normalizePhone(
      form.phone
    ).trim(),

  email:
    String(
      form.email || ''
    )
      .trim()
      .toLowerCase(),

  address:
    String(
      form.address || ''
    ).trim(),

  lawyer_name:
    String(
      form.lawyer_name || ''
    ).trim(),

  lawyer_phone:
    normalizePhone(
      form.lawyer_phone
    ).trim(),

  lawyer_email:
    String(
      form.lawyer_email || ''
    )
      .trim()
      .toLowerCase(),

  lawyer_registry_number:
    String(
      form.lawyer_registry_number || ''
    ).trim(),

  notes:
    String(
      form.notes || ''
    ).trim(),
});

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

  return /validation|invalid|required|must be|not found|forbidden|unauthorized|permission|network error|failed to fetch|timeout|sequelize|constraint|foreign key|internal server|request failed|status code|unexpected/i.test(
    message
  );
};

const getCasePartyErrorMessage = (
  error,
  fallback = 'İşlem tamamlanamadı'
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
    return 'Bu işlem için yetkiniz bulunmuyor.';
  }

  if (status === 404) {
    return 'Taraf kaydı bulunamadı veya artık erişilebilir değil.';
  }

  if (status >= 500) {
    return 'Sunucu tarafında beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin.';
  }

  if (
    /network error|failed to fetch|timeout/i.test(
      rawMessage
    )
  ) {
    return 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.';
  }

  if (
    /validation|invalid|required|must be|sequelize|constraint|foreign key/i.test(
      rawMessage
    )
  ) {
    return 'Formdaki bilgileri kontrol edin ve tekrar deneyin.';
  }

  return rawMessage &&
    !isLikelyTechnicalMessage(
      rawMessage
    )
    ? rawMessage
    : fallback;
};

const getCasePartyFieldErrorMessage = (
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

  const fieldMessages = {
    party_type:
      'Geçerli bir taraf türü seçin',
    entity_type:
      'Geçerli bir kişi türü seçin',
    name:
      'Ad / unvan bilgisini kontrol edin',
    identification_number:
      'Kimlik veya vergi numarasını kontrol edin',
    tax_office:
      'Vergi dairesi bilgisini kontrol edin',
    phone:
      'Telefon numarasını kontrol edin',
    email:
      'E-posta adresini kontrol edin',
    address:
      'Adres bilgisini kontrol edin',
    lawyer_name:
      'Avukat adı bilgisini kontrol edin',
    lawyer_phone:
      'Avukat telefon numarasını kontrol edin',
    lawyer_email:
      'Avukat e-posta adresini kontrol edin',
    lawyer_registry_number:
      'Baro sicil numarasını kontrol edin',
    notes:
      'İç not bilgisini kontrol edin',
  };

  return (
    fieldMessages[field] ||
    'Geçersiz değer'
  );
};

// ======================================================
// CACHE INVALIDATION
// ======================================================

const invalidateCasePartyViews = async (
  queryClient,
  {
    caseId,
    partyId = null,
  }
) => {
  const normalizedCaseId =
    normalizeId(
      caseId
    );

  const normalizedPartyId =
    normalizeId(
      partyId
    );

  const invalidations = [
    // Tüm dava listeleri / taraf sayısı gösteren ekranlar
    queryClient.invalidateQueries({
      queryKey: [
        'cases',
      ],
    }),

    // Davaya ait taraf listeleri
    queryClient.invalidateQueries({
      queryKey: [
        'case-parties',
      ],
    }),
  ];

  if (
    normalizedCaseId
  ) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: [
          'case',
          normalizedCaseId,
        ],
      })
    );
  }

  if (
    normalizedPartyId
  ) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: [
          'case-party',
          normalizedPartyId,
        ],
      })
    );
  }

  await Promise.all(
    invalidations
  );
};

// ======================================================
// COMPONENT
// ======================================================

const CasePartyEdit = () => {
  const {
    id: idParam,
    caseId: caseIdParam,
  } =
    useParams();

  const id =
    normalizeId(
      idParam
    );

  const caseId =
    normalizeId(
      caseIdParam
    );

  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

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
    unsavedDialogOpen,
    setUnsavedDialogOpen,
  ] =
    useState(false);

  const [
    pendingExitPath,
    setPendingExitPath,
  ] =
    useState('');

  const [
    entityTypeDialogOpen,
    setEntityTypeDialogOpen,
  ] =
    useState(false);

  const [
    pendingEntityType,
    setPendingEntityType,
  ] =
    useState('');

  const initializedPartyIdRef =
    useRef('');

  const unsavedDialogRef =
    useRef(null);

  const deleteDialogRef =
    useRef(null);

  const entityTypeDialogRef =
    useRef(null);

  const previousFocusRef =
    useRef(null);

  // ======================================================
  // PARTY QUERY
  // ======================================================

  const {
    data,
    isLoading,
    error,
    refetch,
  } =
    useQuery({
      queryKey: [
        'case-party',
        id,
      ],

      queryFn: () =>
        casePartyApi.getOne(
          id
        ),

      enabled:
        Boolean(
          id
        ),

      staleTime:
        2 *
        60 *
        1000,
    });

  const party =
    data
      ?.data
      ?.data ??
    data
      ?.data ??
    null;

  // ======================================================
  // FILL FORM
  // ======================================================

  useEffect(() => {
    if (
      !party ||
      !id ||
      initializedPartyIdRef.current ===
        id
    ) {
      return;
    }

    const nextForm = {
      party_type:
        party.party_type ||
        'davali',

      entity_type:
        party.entity_type ||
        'person',

      name:
        party.name ||
        '',

      identification_number:
        party.identification_number ||
        party.tc_number ||
        '',

      tax_office:
        party.tax_office ||
        '',

      phone:
        party.phone ||
        '',

      email:
        party.email ||
        '',

      address:
        party.address ||
        '',

      lawyer_name:
        party.lawyer_name ||
        '',

      lawyer_phone:
        party.lawyer_phone ||
        '',

      lawyer_email:
        party.lawyer_email ||
        '',

      lawyer_registry_number:
        party.lawyer_registry_number ||
        '',

      notes:
        party.notes ||
        '',
    };

    setFormData(
      nextForm
    );

    setInitialFormData(
      nextForm
    );

    setErrors(
      {}
    );

    initializedPartyIdRef.current =
      id;
  }, [
    party,
    id,
  ]);

  // ======================================================
  // DERIVED
  // ======================================================

  const isCompany =
    formData.entity_type ===
    'company';

  const identityLabel =
    isCompany
      ? 'Vergi Kimlik No'
      : 'T.C. Kimlik No';

  const selectedPartyTypeLabel =
    useMemo(() => {
      return (
        PARTY_TYPES.find(
          (
            item
          ) =>
            item.value ===
            formData.party_type
        )?.label ||
        formData.party_type
      );
    }, [
      formData.party_type,
    ]);

  const normalizedForm =
    useMemo(() => {
      return normalizeForm(
        formData
      );
    }, [
      formData,
    ]);

  const normalizedInitial =
    useMemo(() => {
      return normalizeForm(
        initialFormData
      );
    }, [
      initialFormData,
    ]);

  const isDirty =
    useMemo(() => {
      return (
        JSON.stringify(
          normalizedForm
        ) !==
        JSON.stringify(
          normalizedInitial
        )
      );
    }, [
      normalizedForm,
      normalizedInitial,
    ]);

  // ======================================================
  // UPDATE
  // ======================================================

  const mutation =
    useMutation({
      mutationFn: (
        payload
      ) =>
        casePartyApi.update(
          id,
          payload
        ),

      onSuccess: async () => {
        await invalidateCasePartyViews(
          queryClient,
          {
            caseId,
            partyId:
              id,
          }
        );

        toast.success(
          'Taraf başarıyla güncellendi'
        );

        navigate(
          `/cases/${caseId}/parties/${id}`
        );
      },

      onError: (
        error
      ) => {
        const backendErrors =
          error
            ?.response
            ?.data
            ?.errors;

        const message =
          getCasePartyErrorMessage(
            error,
            'Taraf güncellenemedi'
          );

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
              const rawField =
                item?.path ||
                item?.param;

              const field =
                Array.isArray(
                  rawField
                )
                  ? rawField[
                      rawField.length -
                        1
                    ]
                  : String(
                      rawField ||
                      ''
                    )
                      .split('.')
                      .filter(Boolean)
                      .pop();

              if (
                field &&
                Object.prototype
                  .hasOwnProperty.call(
                    INITIAL_FORM,
                    field
                  )
              ) {
                nextErrors[field] =
                  getCasePartyFieldErrorMessage(
                    field,
                    item?.msg ||
                      item?.message
                  );
              }
            }
          );
        }

        if (
          /kimlik|tckn|tckno|vkn|vergi|identification/i.test(
            message
          )
        ) {
          nextErrors.identification_number =
            getCasePartyFieldErrorMessage(
              'identification_number',
              message
            );
        }

        if (
          /ad soyad|unvan|name/i.test(
            message
          )
        ) {
          nextErrors.name =
            getCasePartyFieldErrorMessage(
              'name',
              message
            );
        }

        if (
          /avukat.*e-posta|lawyer_email/i.test(
            message
          )
        ) {
          nextErrors.lawyer_email =
            getCasePartyFieldErrorMessage(
              'lawyer_email',
              message
            );
        } else if (
          /e-posta|email/i.test(
            message
          )
        ) {
          nextErrors.email =
            getCasePartyFieldErrorMessage(
              'email',
              message
            );
        }

        if (
          /avukat.*telefon|lawyer_phone/i.test(
            message
          )
        ) {
          nextErrors.lawyer_phone =
            getCasePartyFieldErrorMessage(
              'lawyer_phone',
              message
            );
        } else if (
          /telefon|phone/i.test(
            message
          )
        ) {
          nextErrors.phone =
            getCasePartyFieldErrorMessage(
              'phone',
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
            (
              current
            ) => ({
              ...current,
              ...nextErrors,
            })
          );

          toast.error(
            'Formdaki hatalı alanları kontrol edin'
          );

          return;
        }

        toast.error(
          message
        );
      },
    });

  // ======================================================
  // DELETE
  // ======================================================

  const deleteMutation =
    useMutation({
      mutationFn: () =>
        casePartyApi.remove(
          id
        ),

      onSuccess: async () => {
        await queryClient.cancelQueries({
          queryKey: [
            'case-party',
            id,
          ],
        });

        queryClient.removeQueries({
          queryKey: [
            'case-party',
            id,
          ],
          exact: true,
        });

        await invalidateCasePartyViews(
          queryClient,
          {
            caseId,
          }
        );

        toast.success(
          'Taraf kaydı silindi'
        );

        navigate(
          `/cases/${caseId}`
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getCasePartyErrorMessage(
            error,
            'Taraf silinemedi'
          )
        );
      },
    });

  const isPending =
    mutation.isPending ||
    deleteMutation.isPending;

  useEffect(() => {
    const handleBeforeUnload = (
      event
    ) => {
      if (!isDirty) {
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
  ]);

  const focusDialog = (
    dialogRef
  ) => {
    const dialog =
      dialogRef.current;

    if (!dialog) {
      return;
    }

    const focusable =
      dialog.querySelector(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

    if (focusable) {
      focusable.focus();
      return;
    }

    dialog.focus();
  };

  const trapDialogTab = (
    event,
    dialogRef
  ) => {
    if (event.key !== 'Tab') {
      return;
    }

    const dialog =
      dialogRef.current;

    if (!dialog) {
      return;
    }

    const focusable = [
      ...dialog.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
    ];

    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (
      event.shiftKey &&
      document.activeElement === first
    ) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (
      !event.shiftKey &&
      document.activeElement === last
    ) {
      event.preventDefault();
      first.focus();
    }
  };

  const requestExit = (
    path,
    event = null
  ) => {
    event?.preventDefault?.();

    if (isPending) {
      return;
    }

    if (!isDirty) {
      navigate(path);
      return;
    }

    previousFocusRef.current =
      document.activeElement;

    setPendingExitPath(path);
    setUnsavedDialogOpen(true);
  };

  const handleCloseUnsavedDialog =
    () => {
      setUnsavedDialogOpen(false);
      setPendingExitPath('');
    };

  const handleDiscardAndExit =
    () => {
      const nextPath =
        pendingExitPath ||
        `/cases/${caseId}/parties/${id}`;

      setUnsavedDialogOpen(false);
      setPendingExitPath('');
      navigate(nextPath);
    };

  useEffect(() => {
    if (!unsavedDialogOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    const handleKeyDown = (
      event
    ) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCloseUnsavedDialog();
        return;
      }

      trapDialogTab(
        event,
        unsavedDialogRef
      );
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    requestAnimationFrame(() => {
      focusDialog(
        unsavedDialogRef
      );
    });

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;

      const previousFocus =
        previousFocusRef.current;

      if (
        previousFocus &&
        typeof previousFocus.focus === 'function'
      ) {
        requestAnimationFrame(() => {
          previousFocus.focus();
        });
      }
    };
  }, [
    unsavedDialogOpen,
  ]);

  // ======================================================
  // CHANGE
  // ======================================================

  const handleChange = (
    event
  ) => {
    if (
      isPending
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
      /*
       * Kullanıcı harf yazsa bile alınmaz.
       * Gerçek kişi: maksimum 11
       * Tüzel kişi: maksimum 10
       */
      nextValue =
        onlyDigits(
          value
        ).slice(
          0,
          isCompany
            ? 10
            : 11
        );
    }

    if (
      name ===
        'phone' ||
      name ===
        'lawyer_phone'
    ) {
      nextValue =
        normalizePhone(
          value
        );
    }

    if (
      name ===
      'name'
    ) {
      nextValue =
        value.slice(
          0,
          255
        );
    }

    if (
      name ===
      'tax_office'
    ) {
      nextValue =
        value.slice(
          0,
          150
        );
    }

    if (
      name ===
        'email' ||
      name ===
        'lawyer_email'
    ) {
      nextValue =
        value.slice(
          0,
          254
        );
    }

    if (
      name ===
      'address'
    ) {
      nextValue =
        value.slice(
          0,
          1000
        );
    }

    if (
      name ===
      'lawyer_name'
    ) {
      nextValue =
        value.slice(
          0,
          255
        );
    }

    if (
      name ===
      'lawyer_registry_number'
    ) {
      nextValue =
        value.slice(
          0,
          100
        );
    }

    if (
      name ===
      'notes'
    ) {
      nextValue =
        value.slice(
          0,
          3000
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
  // ENTITY TYPE
  // ======================================================

  const applyEntityTypeChange = (
    type
  ) => {
    setFormData(
      (
        current
      ) => ({
        ...current,
        entity_type: type,
        identification_number: '',
        tax_office:
          type === 'company'
            ? current.tax_office
            : '',
      })
    );

    setErrors(
      (
        current
      ) => ({
        ...current,
        identification_number: '',
        tax_office: '',
      })
    );
  };

  const handleEntityTypeChange =
    (
      type
    ) => {
      if (
        isPending ||
        type === formData.entity_type
      ) {
        return;
      }

      if (!formData.identification_number) {
        applyEntityTypeChange(type);
        return;
      }

      previousFocusRef.current =
        document.activeElement;

      setPendingEntityType(type);
      setEntityTypeDialogOpen(true);
    };

  const handleCloseEntityTypeDialog =
    () => {
      setEntityTypeDialogOpen(false);
      setPendingEntityType('');
    };

  const handleConfirmEntityTypeChange =
    () => {
      if (!pendingEntityType) {
        handleCloseEntityTypeDialog();
        return;
      }

      applyEntityTypeChange(
        pendingEntityType
      );

      setEntityTypeDialogOpen(false);
      setPendingEntityType('');
    };

  useEffect(() => {
    if (!entityTypeDialogOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    const handleKeyDown = (
      event
    ) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCloseEntityTypeDialog();
        return;
      }

      trapDialogTab(
        event,
        entityTypeDialogRef
      );
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    requestAnimationFrame(() => {
      focusDialog(
        entityTypeDialogRef
      );
    });

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;

      const previousFocus =
        previousFocusRef.current;

      if (
        previousFocus &&
        typeof previousFocus.focus === 'function'
      ) {
        requestAnimationFrame(() => {
          previousFocus.focus();
        });
      }
    };
  }, [
    entityTypeDialogOpen,
  ]);

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      const name =
        String(
          formData.name ||
          ''
        ).trim();

      const identity =
        onlyDigits(
          formData.identification_number
        );

      const email =
        String(
          formData.email ||
          ''
        )
          .trim()
          .toLowerCase();

      const lawyerEmail =
        String(
          formData.lawyer_email ||
          ''
        )
          .trim()
          .toLowerCase();

      // ==================================================
      // NAME
      // ==================================================

      if (
        !name
      ) {
        nextErrors.name =
          isCompany
            ? 'Kurum / şirket unvanı gereklidir'
            : 'Ad soyad gereklidir';
      } else if (
        name.length <
        2
      ) {
        nextErrors.name =
          'Ad / unvan en az 2 karakter olmalıdır';
      } else if (
        name.length >
        255
      ) {
        nextErrors.name =
          'Ad / unvan en fazla 255 karakter olabilir';
      }

      // ==================================================
      // TCKN / VKN
      // ==================================================

      if (
        identity
      ) {
        if (
          !isCompany
        ) {
          if (
            identity.length !==
            11
          ) {
            nextErrors.identification_number =
              'T.C. Kimlik No 11 haneli olmalıdır';
          } else if (
            identity.startsWith(
              '0'
            )
          ) {
            nextErrors.identification_number =
              'T.C. Kimlik No 0 ile başlayamaz';
          } else if (
            Number(
              identity[10]
            ) %
              2 !==
            0
          ) {
            nextErrors.identification_number =
              'T.C. Kimlik No son hanesi çift olmalıdır';
          } else if (
            !isValidTCKN(
              identity
            )
          ) {
            nextErrors.identification_number =
              'Geçerli bir T.C. Kimlik No giriniz';
          }
        }

        if (
          isCompany &&
          identity.length !==
          10
        ) {
          nextErrors.identification_number =
            'Vergi Kimlik No 10 haneli olmalıdır';
        }
      }

      // ==================================================
      // TAX OFFICE
      // ==================================================

      if (
        isCompany &&
        formData.tax_office
          .trim()
          .length >
        150
      ) {
        nextErrors.tax_office =
          'Vergi dairesi en fazla 150 karakter olabilir';
      }

      // ==================================================
      // PHONE
      // ==================================================

      if (
        !validatePhone(
          formData.phone
        )
      ) {
        nextErrors.phone =
          'Geçerli bir telefon numarası girin';
      }

      // ==================================================
      // EMAIL
      // ==================================================

      if (
        !validateEmail(
          email
        )
      ) {
        nextErrors.email =
          'Geçerli bir e-posta adresi girin';
      }

      // ==================================================
      // ADDRESS
      // ==================================================

      if (
        formData.address.length >
        1000
      ) {
        nextErrors.address =
          'Adres en fazla 1000 karakter olabilir';
      }

      // ==================================================
      // LAWYER
      // ==================================================

      if (
        formData.lawyer_name
          .trim()
          .length >
        255
      ) {
        nextErrors.lawyer_name =
          'Avukat adı en fazla 255 karakter olabilir';
      }

      if (
        !validatePhone(
          formData.lawyer_phone
        )
      ) {
        nextErrors.lawyer_phone =
          'Geçerli bir avukat telefon numarası girin';
      }

      if (
        !validateEmail(
          lawyerEmail
        )
      ) {
        nextErrors.lawyer_email =
          'Geçerli bir avukat e-posta adresi girin';
      }

      if (
        formData
          .lawyer_registry_number
          .trim()
          .length >
        100
      ) {
        nextErrors.lawyer_registry_number =
          'Baro sicil numarası en fazla 100 karakter olabilir';
      }

      // ==================================================
      // NOTES
      // ==================================================

      if (
        formData.notes.length >
        3000
      ) {
        nextErrors.notes =
          'İç not en fazla 3000 karakter olabilir';
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
  // SUBMIT
  // ======================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (
      isPending
    ) {
      return;
    }

    if (
      !id ||
      !caseId
    ) {
      toast.error(
        'Geçerli dava veya taraf kaydı bulunamadı'
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

    const payload = {
      party_type:
        formData.party_type,

      entity_type:
        formData.entity_type,

      name:
        formData.name.trim(),

      identification_number:
        normalizeNullable(
          onlyDigits(
            formData.identification_number
          )
        ),

      tax_office:
        isCompany
          ? normalizeNullable(
              formData.tax_office
            )
          : null,

      phone:
        normalizeNullable(
          normalizePhone(
            formData.phone
          )
        ),

      email:
        normalizeEmail(
          formData.email
        ),

      address:
        normalizeNullable(
          formData.address
        ),

      lawyer_name:
        normalizeNullable(
          formData.lawyer_name
        ),

      lawyer_phone:
        normalizeNullable(
          normalizePhone(
            formData.lawyer_phone
          )
        ),

      lawyer_email:
        normalizeEmail(
          formData.lawyer_email
        ),

      lawyer_registry_number:
        normalizeNullable(
          formData.lawyer_registry_number
        ),

      notes:
        normalizeNullable(
          formData.notes
        ),
    };

    mutation.mutate(
      payload
    );
  };

  // ======================================================
  // CANCEL
  // ======================================================

  const handleCancel =
    () => {
      requestExit(
        `/cases/${caseId}/parties/${id}`
      );
    };

  // ======================================================
  // DELETE
  // ======================================================

  const handleDelete =
    () => {
      if (
        isPending
      ) {
        return;
      }

      if (
        !id ||
        !caseId
      ) {
        toast.error(
          'Geçerli dava veya taraf kaydı bulunamadı'
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
        !deleteDialogOpen ||
        deleteMutation.isPending
      ) {
        return;
      }

      deleteMutation.mutate();
    };

  useEffect(() => {
    if (!deleteDialogOpen) {
      return undefined;
    }

    previousFocusRef.current =
      document.activeElement;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    const handleKeyDown = (
      event
    ) => {
      if (
        event.key === 'Escape' &&
        !deleteMutation.isPending
      ) {
        event.preventDefault();
        setDeleteDialogOpen(false);
        return;
      }

      trapDialogTab(
        event,
        deleteDialogRef
      );
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    requestAnimationFrame(() => {
      focusDialog(
        deleteDialogRef
      );
    });

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;

      const previousFocus =
        previousFocusRef.current;

      if (
        previousFocus &&
        typeof previousFocus.focus === 'function'
      ) {
        requestAnimationFrame(() => {
          previousFocus.focus();
        });
      }
    };
  }, [
    deleteDialogOpen,
    deleteMutation.isPending,
  ]);

  // ======================================================
  // LOADING
  // ======================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3">

        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600 dark:border-white/[0.08] dark:border-b-blue-500" />

        <p className="text-sm text-gray-500 dark:text-slate-400">
          Taraf bilgileri yükleniyor...
        </p>

      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    error ||
    !party
  ) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">

        <Users className="mx-auto h-10 w-10 text-gray-300 dark:text-slate-600" />

        <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
          Taraf bilgisi görüntülenemedi
        </h2>

        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          {getCasePartyErrorMessage(
            error,
            'Taraf kaydı bulunamadı veya erişim yetkiniz bulunmuyor.'
          )}
        </p>

        <div className="mt-4 flex justify-center gap-2">

          <Link
            to={`/cases/${caseId}`}
          >
            <Button
              variant="secondary"
            >
              Davaya Dön
            </Button>
          </Link>

          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              refetch()
            }
          >
            Tekrar Dene
          </Button>

        </div>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to={`/cases/${caseId}/parties/${id}`}
          onClick={(event) =>
            requestExit(
              `/cases/${caseId}/parties/${id}`,
              event
            )
          }
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />

          Tarafa Dön
        </Link>

        <div className="mt-4 flex items-start gap-3">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
            <Users className="h-6 w-6" />
          </div>

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-2">

              <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
                Tarafı Düzenle
              </h1>

              {isDirty && (
                <Badge
                  variant="warning"
                >
                  Kaydedilmemiş değişiklik
                </Badge>
              )}

            </div>

            <p className="mt-1 truncate text-sm text-gray-500 dark:text-slate-400">
              {party.name} · {selectedPartyTypeLabel}
            </p>

          </div>

        </div>

      </div>

      <Card>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-8 p-6"
        >

          {/* PARTY */}

          <section className="space-y-4">

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Taraf Bilgileri
              </h2>

              <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                Tarafın dosyadaki sıfatını ve kişi türünü güncelleyin.
              </p>

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Taraf Türü *
                </label>

                <select
                  name="party_type"
                  value={
                    formData.party_type
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    isPending
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
                >

                  {PARTY_TYPES.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Kişi Türü
                </label>

                <div className="grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    disabled={
                      isPending
                    }
                    onClick={() =>
                      handleEntityTypeChange(
                        'person'
                      )
                    }
                    className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      !isCompany
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/[0.08]'
                        : 'border-gray-200 hover:border-gray-300 dark:border-white/[0.08]'
                    }`}
                  >
                    <UserRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />

                    <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                      Gerçek Kişi
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={
                      isPending
                    }
                    onClick={() =>
                      handleEntityTypeChange(
                        'company'
                      )
                    }
                    className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      isCompany
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/[0.08]'
                        : 'border-gray-200 hover:border-gray-300 dark:border-white/[0.08]'
                    }`}
                  >
                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />

                    <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                      Tüzel Kişi
                    </p>
                  </button>

                </div>

              </div>

            </div>

          </section>

          {/* IDENTITY */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-white/[0.07]">

            <Input
              label={
                isCompany
                  ? 'Unvan *'
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
              maxLength={255}
            />

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label={
                  identityLabel
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
                inputMode="numeric"
                maxLength={
                  isCompany
                    ? 10
                    : 11
                }
                disabled={
                  isPending
                }
                placeholder={
                  isCompany
                    ? '10 haneli VKN'
                    : '11 haneli TCKN'
                }
              />

              {isCompany && (
                <Input
                  label="Vergi Dairesi"
                  name="tax_office"
                  value={
                    formData.tax_office
                  }
                  onChange={
                    handleChange
                  }
                  error={
                    errors.tax_office
                  }
                  maxLength={150}
                  disabled={
                    isPending
                  }
                />
              )}

            </div>

            {!isCompany && (
              <p className="text-xs text-gray-400 dark:text-slate-500">
                T.C. Kimlik No 11 haneli olmalı, 0 ile başlamamalı ve geçerli TCKN kontrolünden geçmelidir.
              </p>
            )}

            {isCompany && (
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Vergi Kimlik No girilecekse 10 haneli olmalıdır.
              </p>
            )}

          </section>

          {/* CONTACT */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-white/[0.07]">

            <h2 className="font-semibold text-gray-900 dark:text-white">
              İletişim Bilgileri
            </h2>

            <div className="grid gap-4 md:grid-cols-2">

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
                maxLength={25}
                disabled={
                  isPending
                }
                placeholder="+90 555 123 45 67"
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
                maxLength={254}
                disabled={
                  isPending
                }
              />

            </div>

            <div>

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
                rows={4}
                maxLength={1000}
                className={`w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-sm leading-6 text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.035] dark:text-white ${
                  errors.address
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                }`}
                placeholder="Adres bilgisi..."
              />

              <div className="mt-1 flex justify-between">

                {errors.address ? (
                  <p className="text-xs text-red-600">
                    {errors.address}
                  </p>
                ) : (
                  <span />
                )}

                <p className="text-[11px] text-gray-400">
                  {formData.address.length}/1000
                </p>

              </div>

            </div>

          </section>

          {/* LAWYER */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-white/[0.07]">

            <h2 className="font-semibold text-gray-900 dark:text-white">
              Vekil Bilgileri
            </h2>

            <Input
              label="Avukat Adı"
              name="lawyer_name"
              value={
                formData.lawyer_name
              }
              onChange={
                handleChange
              }
              error={
                errors.lawyer_name
              }
              maxLength={255}
              disabled={
                isPending
              }
            />

            <div className="grid gap-4 md:grid-cols-3">

              <Input
                label="Telefon"
                name="lawyer_phone"
                type="tel"
                value={
                  formData.lawyer_phone
                }
                onChange={
                  handleChange
                }
                error={
                  errors.lawyer_phone
                }
                maxLength={25}
                disabled={
                  isPending
                }
              />

              <Input
                label="E-posta"
                name="lawyer_email"
                type="email"
                value={
                  formData.lawyer_email
                }
                onChange={
                  handleChange
                }
                error={
                  errors.lawyer_email
                }
                maxLength={254}
                disabled={
                  isPending
                }
              />

              <Input
                label="Baro Sicil No"
                name="lawyer_registry_number"
                value={
                  formData.lawyer_registry_number
                }
                onChange={
                  handleChange
                }
                error={
                  errors.lawyer_registry_number
                }
                maxLength={100}
                disabled={
                  isPending
                }
              />

            </div>

          </section>

          {/* NOTES */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-white/[0.07]">

            <h2 className="font-semibold text-gray-900 dark:text-white">
              İç Not
            </h2>

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
              rows={4}
              maxLength={3000}
              className={`w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-sm leading-6 text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.035] dark:text-white ${
                errors.notes
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
              }`}
            />

            <div className="flex justify-between">

              {errors.notes ? (
                <p className="text-xs text-red-600">
                  {errors.notes}
                </p>
              ) : (
                <span />
              )}

              <p className="text-[11px] text-gray-400">
                {formData.notes.length}/3000
              </p>

            </div>

          </section>

          {/* ACTIONS */}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 dark:border-white/[0.07] sm:flex-row sm:items-center">

            <Button
              type="submit"
              loading={
                mutation.isPending
              }
              disabled={
                isPending ||
                !isDirty
              }
            >
              <Save className="h-4 w-4" />

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
              <Trash2 className="h-4 w-4" />

              Tarafı Sil
            </Button>

          </div>

        </form>

      </Card>

      {unsavedDialogOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">

          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Kaydedilmemiş değişiklik penceresini kapat"
            onClick={handleCloseUnsavedDialog}
          />

          <div
            ref={unsavedDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-party-unsaved-dialog-title"
            aria-describedby="case-party-unsaved-dialog-description"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/[0.08] dark:bg-[#0b1b33]"
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
                    id="case-party-unsaved-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Değişiklikler kaydedilmedi
                  </h2>
                  <p
                    id="case-party-unsaved-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    Bu sayfadan ayrılırsanız taraf üzerinde yaptığınız değişiklikler kaydedilmeyecek.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.07]">
                <p className="text-sm leading-6 text-amber-900 dark:text-amber-200">
                  Düzenlemeye devam ederek bilgileri kaydedebilir veya değişiklikleri atıp taraf detayına dönebilirsiniz.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.015] sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseUnsavedDialog}
              >
                Düzenlemeye Devam Et
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDiscardAndExit}
              >
                Değişiklikleri At ve Çık
              </Button>
            </div>
          </div>
        </div>
      )}

      {entityTypeDialogOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">

          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Kişi türü değişikliği penceresini kapat"
            onClick={handleCloseEntityTypeDialog}
          />

          <div
            ref={entityTypeDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-party-entity-type-dialog-title"
            aria-describedby="case-party-entity-type-dialog-description"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/[0.08] dark:bg-[#0b1b33]"
          >
            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/[0.10] dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                    Kişi türü değişikliği
                  </p>
                  <h2
                    id="case-party-entity-type-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Kimlik bilgisi temizlenecek
                  </h2>
                  <p
                    id="case-party-entity-type-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    Kişi türünü değiştirirseniz mevcut TCKN/VKN bilgisi temizlenecek.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.015] sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseEntityTypeDialog}
              >
                Vazgeç
              </Button>
              <Button
                type="button"
                onClick={handleConfirmEntityTypeChange}
              >
                Kişi Türünü Değiştir
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
            aria-label="Silme penceresini kapat"
            disabled={
              deleteMutation.isPending
            }
            onClick={
              handleCloseDeleteDialog
            }
          />

          <div
            ref={deleteDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-party-delete-dialog-title"
            aria-describedby="case-party-delete-dialog-description"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/[0.08] dark:bg-[#0b1b33]"
          >
            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/[0.10] dark:text-red-400">
                  <Trash2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">

                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                    Taraf silme onayı
                  </p>

                  <h2
                    id="case-party-delete-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Taraf kaydını sil
                  </h2>

                  <p
                    id="case-party-delete-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    <span className="font-medium text-gray-700 dark:text-slate-200">
                      {party?.name ||
                        'Seçili taraf'}
                    </span>{' '}
                    için bu işlemi onaylayın.
                  </p>

                </div>

              </div>

            </div>

            <div className="space-y-4 px-6 py-5">

              <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-500/20 dark:bg-red-500/[0.07]">

                <div className="flex items-start gap-3">

                  <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

                  <div>

                    <p className="text-sm font-semibold text-red-950 dark:text-red-200">
                      Taraf kaydı dava dosyasından kaldırılacak
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-900/80 dark:text-red-200/80">
                      Bu taraf artık dava dosyasındaki aktif taraf kayıtlarında görüntülenmeyecektir.
                    </p>

                  </div>

                </div>

              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">

                <p className="text-sm leading-6 text-gray-600 dark:text-slate-300">
                  Devam etmeden önce doğru taraf kaydını seçtiğinizden emin olun.
                </p>

              </div>

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
                <Trash2 className="h-4 w-4" />

                Tarafı Sil
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default CasePartyEdit;