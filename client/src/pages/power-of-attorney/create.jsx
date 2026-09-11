import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import {
  powerOfAttorneyApi,
} from '../../features/power-of-attorney/powerOfAttorney.api.js';

import clientApi from '../../features/clients/client.api.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  AlertTriangle,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  FileText,
  FileUp,
  Plus,
  Scale,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_MIME_TYPES =
  new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',

    // UYAP UDF
    'application/udf',
    'application/x-udf',
    'application/octet-stream',
  ]);

const STATUS_OPTIONS = [
  {
    value: 'active',
    label: 'Aktif',
  },
  {
    value: 'expired',
    label: 'Süresi Doldu',
  },
  {
    value: 'cancelled',
    label: 'İptal',
  },
];

// ======================================================
// HELPERS
// ======================================================

const getFileExtension = (
  fileName = ''
) => {
  const normalized =
    String(
      fileName
    )
      .trim()
      .toLowerCase();

  const lastDotIndex =
    normalized.lastIndexOf(
      '.'
    );

  if (
    lastDotIndex === -1
  ) {
    return '';
  }

  return normalized.slice(
    lastDotIndex
  );
};

const isUdfFile = (
  file
) => {
  return (
    getFileExtension(
      file?.name
    ) ===
    '.udf'
  );
};

const formatFileSize = (
  bytes
) => {
  const size =
    Number(bytes) || 0;

  if (
    size <= 0
  ) {
    return '0 B';
  }

  const units = [
    'B',
    'KB',
    'MB',
    'GB',
  ];

  const index =
    Math.min(
      Math.floor(
        Math.log(size) /
          Math.log(1024)
      ),
      units.length - 1
    );

  const value =
    size /
    1024 ** index;

  return `${Number(
    value.toFixed(1)
  )} ${units[index]}`;
};

const getFileTypeLabel = (
  file
) => {
  if (!file) {
    return '-';
  }

  if (
    isUdfFile(
      file
    )
  ) {
    return 'UYAP UDF';
  }

  if (
    file.type ===
    'application/pdf'
  ) {
    return 'PDF';
  }

  if (
    [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(
      file.type
    )
  ) {
    return 'Word';
  }

  if (
    file.type.startsWith(
      'image/'
    )
  ) {
    return 'Görsel';
  }

  return 'Dosya';
};

const getPowerOfAttorneyErrorMessage = (
  error,
  fallback
) => {
  const responseData =
    error?.response?.data;

  const rawMessage =
    String(
      responseData?.message ||
      error?.message ||
      ''
    ).trim();

  const validationMessages =
    Array.isArray(
      responseData?.errors
    )
      ? responseData.errors
          .map(
            (item) =>
              String(
                item?.message ||
                item?.msg ||
                ''
              ).trim()
          )
          .filter(Boolean)
      : [];

  const technicalMessage =
    [
      rawMessage,
      ...validationMessages,
    ]
      .filter(Boolean)
      .join(' ');

  if (
    !technicalMessage
  ) {
    return fallback;
  }

  if (
    /validation failed|validation error|sequelizevalidationerror|notnull violation|cannot be null|must not be null|invalid input syntax|invalid date/i.test(
      technicalMessage
    )
  ) {
    return 'Vekaletname bilgileri doğrulanamadı. Zorunlu ve geçerli alanları kontrol edin.';
  }

  if (
    /power[\s_-]*of[\s_-]*attorney.*not found|powerofattorney.*not found/i.test(
      technicalMessage
    )
  ) {
    return 'Vekaletname kaydı bulunamadı.';
  }

  if (
    /client.*not found/i.test(
      technicalMessage
    )
  ) {
    return 'Seçilen müvekkil bulunamadı veya bu kayda erişim yetkiniz yok.';
  }

  if (
    /case.*not found/i.test(
      technicalMessage
    )
  ) {
    return 'Seçilen dava bulunamadı veya bu kayda erişim yetkiniz yok.';
  }

  if (
    /forbidden|permission denied|not authorized|unauthorized|access denied/i.test(
      technicalMessage
    )
  ) {
    return 'Bu işlem için yetkiniz bulunmuyor.';
  }

  if (
    /invalid.*status/i.test(
      technicalMessage
    )
  ) {
    return 'Geçersiz vekaletname durumu.';
  }

  if (
    /document.*not found/i.test(
      technicalMessage
    )
  ) {
    return 'Belge bulunamadı.';
  }

  if (
    /file.*too large|payload too large/i.test(
      technicalMessage
    )
  ) {
    return 'Belge boyutu izin verilen sınırı aşıyor.';
  }

  if (
    /unsupported.*file|invalid.*file|file type|mime type/i.test(
      technicalMessage
    )
  ) {
    return 'Desteklenmeyen belge türü.';
  }

  if (
    /network error|failed to fetch|timeout|econnrefused|enotfound/i.test(
      technicalMessage
    )
  ) {
    return 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.';
  }

  const looksTurkish =
    /[çğıöşüÇĞİÖŞÜ]|bulunamadı|geçersiz|zorunlu|yetkiniz|başarısız|yüklenemedi|güncellenemedi|oluşturulamadı|silinemedi|hata/i.test(
      rawMessage
    );

  return looksTurkish
    ? rawMessage
    : fallback;
};

const appendOptionalFormData = (
  formData,
  key,
  value
) => {
  const normalizedValue =
    typeof value ===
    'string'
      ? value.trim()
      : value;

  if (
    normalizedValue === '' ||
    normalizedValue === null ||
    normalizedValue === undefined
  ) {
    return;
  }

  formData.append(
    key,
    normalizedValue
  );
};

const normalizeFormForComparison = (
  value
) => {
  return JSON.stringify({
    client_id:
      String(
        value?.client_id ||
        ''
      ),

    case_id:
      String(
        value?.case_id ||
        ''
      ),

    title:
      String(
        value?.title ||
        ''
      ).trim(),

    description:
      String(
        value?.description ||
        ''
      ).trim(),

    start_date:
      value?.start_date ||
      '',

    end_date:
      value?.end_date ||
      '',

    status:
      value?.status ||
      'active',

    authorities:
      Array.isArray(
        value?.authorities
      )
        ? value.authorities
            .map(
              (item) =>
                String(
                  item ||
                  ''
                ).trim()
            )
            .filter(Boolean)
        : [],

    notes:
      String(
        value?.notes ||
        ''
      ).trim(),
  });
};

const FIELD_ERROR_MESSAGES = {
  client_id:
    'Müvekkil seçimini kontrol edin.',
  case_id:
    'İlişkili dava seçimini kontrol edin.',
  title:
    'Vekaletname başlığını kontrol edin.',
  description:
    'Açıklama alanını kontrol edin.',
  start_date:
    'Başlangıç tarihini kontrol edin.',
  end_date:
    'Bitiş tarihini kontrol edin.',
  status:
    'Vekaletname durumunu kontrol edin.',
  authorities:
    'Vekaletname yetkilerini kontrol edin.',
  notes:
    'Notlar alanını kontrol edin.',
};

const getPowerOfAttorneyFieldErrors = (
  error
) => {
  const source =
    error?.response?.data?.errors ??
    error?.response?.data?.validation_errors ??
    null;

  if (!source) {
    return {};
  }

  const result = {};

  const setFieldError = (
    rawField,
    rawMessage
  ) => {
    const field =
      Array.isArray(
        rawField
      )
        ? rawField[
            rawField.length - 1
          ]
        : String(
            rawField ||
            ''
          )
            .split('.')
            .filter(Boolean)
            .pop();

    if (
      !field ||
      !Object.prototype.hasOwnProperty.call(
        FIELD_ERROR_MESSAGES,
        field
      )
    ) {
      return;
    }

    const message =
      String(
        rawMessage ||
        ''
      ).trim();

    const looksTurkish =
      /[çğıöşüÇĞİÖŞÜ]|zorunlu|geçersiz|kontrol|bulunamadı|eriş|seç|tarih|başlık|açıklama|not|yetki/i.test(
        message
      );

    result[field] =
      looksTurkish
        ? message
        : FIELD_ERROR_MESSAGES[
            field
          ];
  };

  if (
    Array.isArray(
      source
    )
  ) {
    source.forEach(
      (item) => {
        setFieldError(
          item?.path ??
            item?.param ??
            item?.field,
          item?.message ??
            item?.msg
        );
      }
    );

    return result;
  }

  if (
    typeof source ===
    'object'
  ) {
    Object.entries(
      source
    ).forEach(
      ([field, value]) => {
        setFieldError(
          field,
          Array.isArray(
            value
          )
            ? value[0]
            : value
        );
      }
    );
  }

  return result;
};

// ======================================================
// COMPONENT
// ======================================================

const PowerOfAttorneyCreate = () => {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] =
    useSearchParams();

  const clientIdFromUrl =
    searchParams.get(
      'client_id'
    );

  const fileInputRef =
    useRef(null);

  const initialFormRef =
    useRef({
      client_id:
        clientIdFromUrl ||
        '',

      case_id:
        '',

      title:
        '',

      description:
        '',

      start_date:
        '',

      end_date:
        '',

      status:
        'active',

      authorities:
        [],

      notes:
        '',
    });

  const [
    formData,
    setFormData,
  ] =
    useState(
      () => ({
        ...initialFormRef.current,
        authorities: [],
      })
    );

  const [
    file,
    setFile,
  ] =
    useState(null);

  const [
    fileError,
    setFileError,
  ] =
    useState('');

  const [
    authorityInput,
    setAuthorityInput,
  ] =
    useState('');

  const [
    errors,
    setErrors,
  ] =
    useState({});

  const [
    isDragging,
    setIsDragging,
  ] =
    useState(false);

  const [
    showLeaveModal,
    setShowLeaveModal,
  ] =
    useState(false);

  const [
    showClientChangeModal,
    setShowClientChangeModal,
  ] =
    useState(false);

  const [
    pendingClientId,
    setPendingClientId,
  ] =
    useState('');

  const leaveModalRef =
    useRef(null);

  const clientChangeModalRef =
    useRef(null);

  const lastFocusedRef =
    useRef(null);

  // ====================================================
  // CLIENTS
  // ====================================================

  const {
    data:
      clientsData,
    isLoading:
      clientsLoading,
    isError:
      clientsError,
    refetch:
      refetchClients,
  } =
    useQuery({
      queryKey: [
        'clients',
        {
          limit: 100,
        },
      ],

      queryFn: () =>
        clientApi.getAll({
          limit: 100,
        }),
    });

  // ====================================================
  // CASES
  // ====================================================

  const {
    data:
      casesData,
    isLoading:
      casesLoading,
    isError:
      casesError,
    refetch:
      refetchCases,
  } =
    useQuery({
      queryKey: [
        'clients',
        formData.client_id,
        'power-of-attorney-cases',
      ],

      queryFn: () =>
        clientApi.getCaseHistory(
          formData.client_id
        ),

      enabled:
        Boolean(
          formData.client_id
        ),

      staleTime:
        3 * 60 * 1000,
    });

  const clients =
    Array.isArray(
      clientsData?.data?.data
    )
      ? clientsData.data.data
      : [];

  const cases =
    useMemo(() => {
      const payload =
        casesData
          ?.data
          ?.data ??
        casesData
          ?.data ??
        [];

      if (
        Array.isArray(
          payload
        )
      ) {
        return payload;
      }

      if (
        Array.isArray(
          payload?.data
        )
      ) {
        return payload.data;
      }

      if (
        Array.isArray(
          payload?.cases
        )
      ) {
        return payload.cases;
      }

      return [];
    }, [
      casesData,
    ]);

  // ====================================================
  // SELECTED DATA
  // ====================================================

  const selectedClient =
    useMemo(() => {
      return clients.find(
        (
          client
        ) =>
          String(
            client.id
          ) ===
          String(
            formData.client_id
          )
      );
    }, [
      clients,
      formData.client_id,
    ]);

  const selectedCase =
    useMemo(() => {
      return cases.find(
        (
          caseItem
        ) =>
          String(
            caseItem.id
          ) ===
          String(
            formData.case_id
          )
      );
    }, [
      cases,
      formData.case_id,
    ]);

  const isDirty =
    useMemo(() => {
      return (
        normalizeFormForComparison(
          formData
        ) !==
          normalizeFormForComparison(
            initialFormRef.current
          ) ||
        Boolean(
          file
        ) ||
        Boolean(
          authorityInput.trim()
        )
      );
    }, [
      formData,
      file,
      authorityInput,
    ]);

  // ====================================================
  // MUTATION
  // ====================================================

  const mutation =
    useMutation({
      mutationFn: (
        data
      ) =>
        powerOfAttorneyApi.create(
          data
        ),

      onSuccess: (
        response
      ) => {
        toast.success(
          'Vekaletname başarıyla oluşturuldu'
        );

        const itemId =
          response?.data
            ?.data?.id;

        if (
          itemId
        ) {
          navigate(
            `/power-of-attorney/${itemId}`
          );

          return;
        }

        navigate(
          '/power-of-attorney'
        );
      },

      onError: (
        error
      ) => {
        const fieldErrors =
          getPowerOfAttorneyFieldErrors(
            error
          );

        if (
          Object.keys(
            fieldErrors
          ).length >
          0
        ) {
          setErrors(
            (current) => ({
              ...current,
              ...fieldErrors,
            })
          );
        }

        toast.error(
          getPowerOfAttorneyErrorMessage(
            error,
            'Vekaletname oluşturulamadı'
          )
        );
      },
    });

  // ====================================================
  // FORM HANDLERS
  // ====================================================

  const applyClientChange =
    (nextClientId) => {
      setFormData(
        (current) => ({
          ...current,
          client_id:
            nextClientId,
          case_id:
            '',
        })
      );

      setErrors(
        (current) => ({
          ...current,
          client_id:
            '',
          case_id:
            '',
        })
      );
    };

  const handleChange =
    (
      event
    ) => {
      if (
        mutation.isPending
      ) {
        return;
      }

      const {
        name,
        value,
      } =
        event.target;

      if (
        name ===
          'client_id' &&
        value !==
          formData.client_id
      ) {
        if (
          formData.case_id
        ) {
          lastFocusedRef.current =
            document.activeElement;

          setPendingClientId(
            value
          );

          setShowClientChangeModal(
            true
          );

          return;
        }

        applyClientChange(
          value
        );

        return;
      }

      setFormData(
        (current) => ({
          ...current,
          [name]:
            value,
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

  // ====================================================
  // FILE
  // ====================================================

  const validateAndSetFile =
    (
      selectedFile
    ) => {
      if (
        mutation.isPending ||
        !selectedFile
      ) {
        return;
      }

      if (
        selectedFile.size >
        MAX_FILE_SIZE
      ) {
        setFile(
          null
        );

        setFileError(
          'Dosya boyutu 10 MB’dan büyük olamaz.'
        );

        return;
      }

      const udf =
        isUdfFile(
          selectedFile
        );

      const allowedMime =
        ALLOWED_MIME_TYPES.has(
          selectedFile.type
        );

      const allowed =
        udf ||
        (
          allowedMime &&
          selectedFile.type !==
            'application/octet-stream'
        );

      if (
        !allowed
      ) {
        setFile(
          null
        );

        setFileError(
          'Yalnızca PDF, UDF, Word veya desteklenen görsel dosyaları yüklenebilir.'
        );

        return;
      }

      setFile(
        selectedFile
      );

      setFileError(
        ''
      );
    };

  const handleFileChange =
    (
      event
    ) => {
      const selectedFile =
        event.target.files?.[0];

      validateAndSetFile(
        selectedFile
      );
    };

  const handleRemoveFile =
    () => {
      if (
        mutation.isPending
      ) {
        return;
      }

      setFile(
        null
      );

      setFileError(
        ''
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          '';
      }
    };

  // ====================================================
  // DRAG & DROP
  // ====================================================

  const handleDragOver =
    (
      event
    ) => {
      event.preventDefault();

      if (
        mutation.isPending
      ) {
        return;
      }

      setIsDragging(
        true
      );
    };

  const handleDragLeave =
    (
      event
    ) => {
      event.preventDefault();

      setIsDragging(
        false
      );
    };

  const handleDrop =
    (
      event
    ) => {
      event.preventDefault();

      setIsDragging(
        false
      );

      if (
        mutation.isPending
      ) {
        return;
      }

      const droppedFile =
        event.dataTransfer
          ?.files?.[0];

      validateAndSetFile(
        droppedFile
      );
    };

  // ====================================================
  // AUTHORITIES
  // ====================================================

  const handleAddAuthority =
    () => {
      if (
        mutation.isPending
      ) {
        return;
      }

      const authority =
        authorityInput.trim();

      if (
        !authority
      ) {
        return;
      }

      const alreadyExists =
        formData.authorities.some(
          (
            current
          ) =>
            current.toLocaleLowerCase(
              'tr-TR'
            ) ===
            authority.toLocaleLowerCase(
              'tr-TR'
            )
        );

      if (
        alreadyExists
      ) {
        toast.error(
          'Bu yetki zaten eklenmiş'
        );

        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          authorities: [
            ...current.authorities,
            authority,
          ],
        })
      );

      setAuthorityInput(
        ''
      );
    };

  const handleRemoveAuthority =
    (
      index
    ) => {
      if (
        mutation.isPending
      ) {
        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          authorities:
            current.authorities.filter(
              (
                _,
                currentIndex
              ) =>
                currentIndex !==
                index
            ),
        })
      );
    };

  // ====================================================
  // SUBMIT
  // ====================================================

  const handleSubmit =
    (
      event
    ) => {
      event.preventDefault();

      if (
        mutation.isPending
      ) {
        return;
      }

      const newErrors =
        {};

      if (
        !formData.client_id
      ) {
        newErrors.client_id =
          'Müvekkil seçimi zorunludur';
      } else if (
        clientsError
      ) {
        newErrors.client_id =
          'Müvekkil listesi doğrulanamadı. Lütfen tekrar deneyin.';
      }

      const title =
        String(
          formData.title ||
          ''
        ).trim();

      if (
        title.length >
        255
      ) {
        newErrors.title =
          'Başlık en fazla 255 karakter olabilir';
      }

      if (
        !STATUS_OPTIONS.some(
          (item) =>
            item.value ===
            formData.status
        )
      ) {
        newErrors.status =
          'Geçersiz vekaletname durumu';
      }

      if (
        formData.case_id &&
        casesError
      ) {
        newErrors.case_id =
          'Dava listesi doğrulanamadı. Lütfen tekrar deneyin.';
      } else if (
        formData.case_id &&
        !cases.some(
          (caseItem) =>
            String(
              caseItem?.id ||
              ''
            ) ===
            String(
              formData.case_id
            )
        )
      ) {
        newErrors.case_id =
          'Seçilen dava bu müvekkille ilişkili değil veya artık erişilemiyor';
      }

      if (
        formData.start_date &&
        formData.end_date &&
        formData.end_date <
          formData.start_date
      ) {
        newErrors.end_date =
          'Bitiş tarihi başlangıç tarihinden önce olamaz';
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
          'Formdaki alanları kontrol edin'
        );

        return;
      }

      setErrors(
        {}
      );

      const submitData =
        new FormData();

      submitData.append(
        'client_id',
        formData.client_id
      );

      appendOptionalFormData(
        submitData,
        'case_id',
        formData.case_id
      );

      appendOptionalFormData(
        submitData,
        'title',
        formData.title
      );

      appendOptionalFormData(
        submitData,
        'description',
        formData.description
      );

      appendOptionalFormData(
        submitData,
        'start_date',
        formData.start_date
      );

      appendOptionalFormData(
        submitData,
        'end_date',
        formData.end_date
      );

      submitData.append(
        'status',
        formData.status
      );

      submitData.append(
        'authorities',
        JSON.stringify(
          formData.authorities
        )
      );

      appendOptionalFormData(
        submitData,
        'notes',
        formData.notes
      );

      if (
        file
      ) {
        submitData.append(
          'file',
          file
        );
      }

      mutation.mutate(
        submitData
      );
    };

  const requestExit =
    () => {
      if (
        mutation.isPending
      ) {
        return;
      }

      if (
        isDirty
      ) {
        lastFocusedRef.current =
          document.activeElement;

        setShowLeaveModal(
          true
        );

        return;
      }

      navigate(
        '/power-of-attorney'
      );
    };

  useEffect(() => {
    const handleBeforeUnload =
      (event) => {
        if (
          !isDirty ||
          mutation.isPending
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
    isDirty,
    mutation.isPending,
  ]);

  useEffect(() => {
    const modalOpen =
      showLeaveModal ||
      showClientChangeModal;

    if (
      !modalOpen
    ) {
      return undefined;
    }

    const dialog =
      showLeaveModal
        ? leaveModalRef.current
        : clientChangeModalRef.current;

    const closeActiveModal =
      () => {
        if (
          showLeaveModal
        ) {
          setShowLeaveModal(
            false
          );
        } else {
          setShowClientChangeModal(
            false
          );

          setPendingClientId(
            ''
          );
        }
      };

    requestAnimationFrame(
      () => {
        dialog?.focus();
      }
    );

    const handleKeyDown =
      (event) => {
        if (
          event.key ===
          'Escape'
        ) {
          event.preventDefault();
          closeActiveModal();
          return;
        }

        if (
          event.key !==
          'Tab' ||
          !dialog
        ) {
          return;
        }

        const focusable =
          Array.from(
            dialog.querySelectorAll(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          );

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
        } else if (
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

      requestAnimationFrame(
        () => {
          lastFocusedRef.current
            ?.focus?.();

          lastFocusedRef.current =
            null;
        }
      );
    };
  }, [
    showLeaveModal,
    showClientChangeModal,
  ]);

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to="/power-of-attorney"
          onClick={(event) => {
            event.preventDefault();
            requestExit();
          }}
          className="
            inline-flex
            items-center
            gap-1.5
            text-xs
            font-medium
            text-gray-500
            transition
            hover:text-blue-600
            dark:text-slate-500
            dark:hover:text-blue-400
          "
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Vekaletnameler
        </Link>

        <div className="mt-3 flex items-start gap-3">

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-amber-50
              text-amber-600
              dark:bg-amber-500/[0.08]
              dark:text-amber-400
            "
          >
            <Scale size={21} />
          </div>

          <div>

            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="
                  text-2xl
                  font-semibold
                  tracking-[-0.035em]
                  text-gray-900
                  dark:text-white
                "
              >
                Yeni Vekaletname
              </h1>

              {isDirty && (
                <Badge variant="warning">
                  Kaydedilmemiş değişiklik
                </Badge>
              )}
            </div>

            <p
              className="
                mt-1
                max-w-2xl
                text-sm
                leading-6
                text-gray-500
                dark:text-slate-400
              "
            >
              Müvekkile ait vekalet kaydını, ilişkili davayı, geçerlilik tarihlerini ve verilen yetkileri tanımlayın.
            </p>

          </div>

        </div>

      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
      >

        {/* CLIENT / CASE */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-blue-50
                  text-blue-600
                  dark:bg-blue-500/[0.08]
                  dark:text-blue-400
                "
              >
                <UserRound size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Müvekkil ve Dava
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Vekaletnamenin kime ait olduğunu ve ilgili dava kaydını belirleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid gap-4 md:grid-cols-2">

              {/* CLIENT */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Müvekkil *
                </label>

                <select
                  name="client_id"
                  value={
                    formData.client_id
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    clientsLoading ||
                    mutation.isPending
                  }
                  className={`
                    h-10
                    w-full
                    rounded-lg
                    border
                    bg-white
                    px-3.5
                    text-sm
                    text-gray-700
                    outline-none
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                    ${
                      errors.client_id
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                    }
                  `}
                >
                  <option value="">
                    {clientsLoading
                      ? 'Müvekkiller yükleniyor...'
                      : 'Müvekkil seçin'}
                  </option>

                  {clients.map(
                    (
                      client
                    ) => (
                      <option
                        key={
                          client.id
                        }
                        value={
                          client.id
                        }
                      >
                        {client.name}
                      </option>
                    )
                  )}
                </select>

                {errors.client_id && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {errors.client_id}
                  </p>
                )}

                {clientsError && (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50/60 px-3 py-2 dark:border-red-500/10 dark:bg-red-500/[0.035]">
                    <p className="text-xs text-red-700 dark:text-red-300">
                      Müvekkil listesi yüklenemedi.
                    </p>

                    <button
                      type="button"
                      disabled={
                        mutation.isPending
                      }
                      onClick={() =>
                        refetchClients()
                      }
                      className="shrink-0 text-xs font-semibold text-red-700 hover:underline disabled:opacity-50 dark:text-red-300"
                    >
                      Tekrar Dene
                    </button>
                  </div>
                )}

                {selectedClient && (
                  <div
                    className="
                      mt-3
                      flex
                      items-center
                      gap-3
                      rounded-lg
                      border
                      border-gray-100
                      bg-gray-50
                      p-3
                      dark:border-white/[0.05]
                      dark:bg-white/[0.025]
                    "
                  >

                    <div
                      className="
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        bg-blue-50
                        text-blue-600
                        dark:bg-blue-500/[0.08]
                        dark:text-blue-400
                      "
                    >
                      <UserRound size={15} />
                    </div>

                    <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                      {selectedClient.name}
                    </p>

                  </div>
                )}

              </div>

              {/* CASE */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  İlişkili Dava
                </label>

                <select
                  name="case_id"
                  value={
                    formData.case_id
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    !formData.client_id ||
                    casesLoading ||
                    mutation.isPending
                  }
                  className="
                    h-10
                    w-full
                    rounded-lg
                    border
                    border-gray-200
                    bg-white
                    px-3.5
                    text-sm
                    text-gray-700
                    outline-none
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  <option value="">
                    {!formData.client_id
                      ? 'Önce müvekkil seçin'
                      : casesLoading
                        ? 'Davalar yükleniyor...'
                        : 'Dava seçin (isteğe bağlı)'}
                  </option>

                  {cases.map(
                    (
                      caseItem
                    ) => (
                      <option
                        key={
                          caseItem.id
                        }
                        value={
                          caseItem.id
                        }
                      >
                        {caseItem.title}
                      </option>
                    )
                  )}
                </select>

                {errors.case_id && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {errors.case_id}
                  </p>
                )}

                {casesError &&
                  formData.client_id && (
                    <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50/60 px-3 py-2 dark:border-red-500/10 dark:bg-red-500/[0.035]">
                      <p className="text-xs text-red-700 dark:text-red-300">
                        Müvekkile ait davalar yüklenemedi.
                      </p>

                      <button
                        type="button"
                        disabled={
                          mutation.isPending
                        }
                        onClick={() =>
                          refetchCases()
                        }
                        className="shrink-0 text-xs font-semibold text-red-700 hover:underline disabled:opacity-50 dark:text-red-300"
                      >
                        Tekrar Dene
                      </button>
                    </div>
                  )}

                {selectedCase && (
                  <div
                    className="
                      mt-3
                      flex
                      items-center
                      gap-3
                      rounded-lg
                      border
                      border-gray-100
                      bg-gray-50
                      p-3
                      dark:border-white/[0.05]
                      dark:bg-white/[0.025]
                    "
                  >

                    <BriefcaseBusiness
                      size={15}
                      className="shrink-0 text-gray-400 dark:text-slate-500"
                    />

                    <div className="min-w-0">

                      <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                        {selectedCase.title}
                      </p>

                      {selectedCase.case_number && (
                        <p className="mt-0.5 text-[10px] text-gray-400 dark:text-slate-500">
                          {selectedCase.case_number}
                        </p>
                      )}

                    </div>

                  </div>
                )}

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* BASIC INFO */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-indigo-50
                  text-indigo-600
                  dark:bg-indigo-500/[0.08]
                  dark:text-indigo-400
                "
              >
                <FileText size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Vekalet Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Başlık, açıklama ve genel kayıt bilgileri
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <Input
              label="Vekaletname Başlığı"
              name="title"
              value={
                formData.title
              }
              onChange={
                handleChange
              }
              error={
                errors.title
              }
              disabled={
                mutation.isPending
              }
              placeholder="Örn: Taşınmaz Davası Vekaleti"
            />

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Açıklama
              </label>

              <textarea
                name="description"
                value={
                  formData.description
                }
                onChange={
                  handleChange
                }
                disabled={
                  mutation.isPending
                }
                rows={4}
                placeholder="Vekaletnamenin kapsamı veya kullanım amacı..."
                className="
                  w-full
                  resize-y
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  leading-6
                  text-gray-900
                  outline-none
                  transition
                  placeholder:text-gray-400
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                  dark:placeholder:text-slate-500
                "
              />

            </div>

          </Card.Body>

        </Card>

        {/* DATES / STATUS */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-emerald-50
                  text-emerald-600
                  dark:bg-emerald-500/[0.08]
                  dark:text-emerald-400
                "
              >
                <CalendarDays size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Geçerlilik
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Vekaletnamenin başlangıç, bitiş ve durum bilgileri
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid gap-4 md:grid-cols-3">

              <Input
                label="Başlangıç Tarihi"
                name="start_date"
                type="date"
                value={
                  formData.start_date
                }
                onChange={
                  handleChange
                }
                disabled={
                  mutation.isPending
                }
              />

              <Input
                label="Bitiş Tarihi"
                name="end_date"
                type="date"
                value={
                  formData.end_date
                }
                onChange={
                  handleChange
                }
                error={
                  errors.end_date
                }
                min={
                  formData.start_date ||
                  undefined
                }
                disabled={
                  mutation.isPending
                }
              />

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
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
                    mutation.isPending
                  }
                  className="
                    h-10
                    w-full
                    rounded-lg
                    border
                    border-gray-200
                    bg-white
                    px-3.5
                    text-sm
                    text-gray-700
                    outline-none
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  {STATUS_OPTIONS.map(
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

                {errors.status && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {errors.status}
                  </p>
                )}

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* AUTHORITIES */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-violet-50
                  text-violet-600
                  dark:bg-violet-500/[0.08]
                  dark:text-violet-400
                "
              >
                <Scale size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Yetkiler
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Vekaletname kapsamında verilen özel yetkileri ekleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="flex flex-col gap-2 sm:flex-row">

              <input
                type="text"
                value={
                  authorityInput
                }
                onChange={(
                  event
                ) => {
                  if (
                    mutation.isPending
                  ) {
                    return;
                  }

                  setAuthorityInput(
                    event.target.value
                  );
                }}
                disabled={
                  mutation.isPending
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    event.preventDefault();

                    handleAddAuthority();
                  }
                }}
                placeholder="Örn: Ahzu kabz, sulh, feragat..."
                className="
                  h-10
                  flex-1
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  text-sm
                  text-gray-900
                  outline-none
                  placeholder:text-gray-400
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                  dark:placeholder:text-slate-500
                "
              />

              <Button
                type="button"
                variant="secondary"
                onClick={
                  handleAddAuthority
                }
                disabled={
                  mutation.isPending ||
                  !authorityInput.trim()
                }
              >
                <Plus className="h-4 w-4" />
                Yetki Ekle
              </Button>

            </div>

            {formData.authorities.length >
              0 ? (
              <div className="mt-4 flex flex-wrap gap-2">

                {formData.authorities.map(
                  (
                    authority,
                    index
                  ) => (
                    <div
                      key={`${authority}-${index}`}
                      className="
                        inline-flex
                        items-center
                        gap-2
                        rounded-full
                        border
                        border-gray-200
                        bg-gray-50
                        px-3
                        py-1.5
                        text-xs
                        font-medium
                        text-gray-700
                        dark:border-white/[0.07]
                        dark:bg-white/[0.03]
                        dark:text-slate-300
                      "
                    >
                      {authority}

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveAuthority(
                            index
                          )
                        }
                        disabled={
                          mutation.isPending
                        }
                        className="text-gray-400 transition hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`${authority} yetkisini kaldır`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                    </div>
                  )
                )}

              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
                Henüz özel yetki eklenmedi.
              </p>
            )}

          </Card.Body>

        </Card>

        {/* FILE */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-amber-50
                  text-amber-600
                  dark:bg-amber-500/[0.08]
                  dark:text-amber-400
                "
              >
                <FileUp size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Vekaletname Belgesi
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Taratılmış vekaletname, PDF veya UYAP UDF belgesini kayda ekleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div
              role="button"
              tabIndex={0}
              onClick={() =>
                !mutation.isPending &&
                !file &&
                fileInputRef.current?.click()
              }
              onKeyDown={(
                event
              ) => {
                if (
                  !mutation.isPending &&
                  !file &&
                  (
                    event.key ===
                      'Enter' ||
                    event.key ===
                      ' '
                  )
                ) {
                  event.preventDefault();

                  fileInputRef.current?.click();
                }
              }}
              onDragOver={
                handleDragOver
              }
              onDragLeave={
                handleDragLeave
              }
              onDrop={
                handleDrop
              }
              className={`
                rounded-xl
                border-2
                border-dashed
                p-6
                transition
                ${
                  file
                    ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/[0.025]'
                    : fileError
                      ? 'border-red-300 bg-red-50/50 dark:border-red-500/20 dark:bg-red-500/[0.025]'
                      : isDragging
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/[0.05]'
                        : 'cursor-pointer border-gray-200 bg-gray-50/50 hover:border-blue-400 hover:bg-blue-50/30 dark:border-white/[0.08] dark:bg-white/[0.015] dark:hover:border-blue-500/40'
                }
              `}
            >

              {file ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex min-w-0 items-center gap-3">

                    <div
                      className="
                        flex
                        h-12
                        w-12
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-emerald-100
                        text-emerald-600
                        dark:bg-emerald-500/[0.1]
                        dark:text-emerald-400
                      "
                    >
                      <FileText size={22} />
                    </div>

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <p
                          className="max-w-md truncate text-sm font-semibold text-gray-900 dark:text-white"
                          title={
                            file.name
                          }
                        >
                          {file.name}
                        </p>

                        <Badge
                          variant="success"
                          dot
                        >
                          Hazır
                        </Badge>

                      </div>

                      <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                        {getFileTypeLabel(
                          file
                        )}
                        {' · '}
                        {formatFileSize(
                          file.size
                        )}
                      </p>

                    </div>

                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(
                      event
                    ) => {
                      event.stopPropagation();

                      handleRemoveFile();
                    }}
                    disabled={
                      mutation.isPending
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                    Kaldır
                  </Button>

                </div>
              ) : (
                <div className="py-4 text-center">

                  <div
                    className="
                      mx-auto
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center
                      rounded-xl
                      bg-blue-50
                      text-blue-600
                      dark:bg-blue-500/[0.08]
                      dark:text-blue-400
                    "
                  >
                    <UploadCloud size={22} />
                  </div>

                  <p className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Belgeyi buraya sürükleyin
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                    veya bilgisayarınızdan seçmek için tıklayın
                  </p>

                  <div className="mt-4 flex flex-wrap justify-center gap-2">

                    <Badge variant="default">
                      PDF
                    </Badge>

                    <Badge variant="default">
                      UYAP UDF
                    </Badge>

                    <Badge variant="default">
                      Word
                    </Badge>

                    <Badge variant="default">
                      JPG / PNG / WEBP
                    </Badge>

                    <Badge variant="default">
                      Maks. 10 MB
                    </Badge>

                  </div>

                </div>
              )}

              <input
                ref={
                  fileInputRef
                }
                type="file"
                className="hidden"
                onChange={
                  handleFileChange
                }
                disabled={
                  mutation.isPending
                }
                accept=".pdf,.udf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
              />

            </div>

            {fileError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {fileError}
              </p>
            )}

            {file &&
              !fileError && (
                <div
                  className="
                    mt-4
                    flex
                    items-start
                    gap-2
                    rounded-lg
                    bg-emerald-50
                    px-3
                    py-2
                    text-xs
                    text-emerald-700
                    dark:bg-emerald-500/[0.05]
                    dark:text-emerald-400
                  "
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

                  {isUdfFile(
                    file
                  )
                    ? 'UYAP UDF dosyası doğrulandı ve yüklemeye hazır.'
                    : 'Dosya doğrulandı ve yüklemeye hazır.'}
                </div>
              )}

          </Card.Body>

        </Card>

        {/* NOTES */}

        <Card>

          <Card.Header>

            <h2 className="font-semibold text-gray-900 dark:text-white">
              Notlar
            </h2>

          </Card.Header>

          <Card.Body>

            <textarea
              name="notes"
              value={
                formData.notes
              }
              onChange={
                handleChange
              }
              disabled={
                mutation.isPending
              }
              rows={4}
              placeholder="Vekaletname ile ilgili büro içi notlar..."
              className="
                w-full
                resize-y
                rounded-lg
                border
                border-gray-200
                bg-white
                px-3.5
                py-2.5
                text-sm
                leading-6
                text-gray-900
                outline-none
                placeholder:text-gray-400
                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-500/10
                dark:border-white/[0.08]
                dark:bg-white/[0.035]
                dark:text-white
                dark:placeholder:text-slate-500
              "
            />

          </Card.Body>

        </Card>

        {/* ACTIONS */}

        <div
          className="
            flex
            flex-col-reverse
            gap-3
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.07]
            dark:bg-[#0b1b33]
            sm:flex-row
            sm:items-center
            sm:justify-end
          "
        >

          <Button
            type="button"
            variant="secondary"
            onClick={
              requestExit
            }
            disabled={
              mutation.isPending
            }
          >
            Vazgeç
          </Button>

          <Button
            type="submit"
            loading={
              mutation.isPending
            }
            disabled={
              mutation.isPending ||
              clientsLoading ||
              Boolean(
                formData.client_id &&
                casesLoading
              )
            }
          >
            <Scale className="h-4 w-4" />
            Vekaletname Oluştur
          </Button>

        </div>

      </form>

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Uyarıyı kapat"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() =>
              setShowLeaveModal(
                false
              )
            }
          />

          <div
            ref={
              leaveModalRef
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="poa-create-leave-title"
            tabIndex={-1}
            className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl outline-none dark:border-white/[0.08] dark:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div>
                <h2
                  id="poa-create-leave-title"
                  className="font-semibold text-gray-900 dark:text-white"
                >
                  Kaydedilmemiş değişiklikler
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400">
                  Vekaletname oluşturma ekranında kaydedilmemiş bilgiler var. Çıkarsanız bu bilgiler kaybolacak.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setShowLeaveModal(
                    false
                  )
                }
              >
                Düzenlemeye Devam Et
              </Button>

              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  setShowLeaveModal(
                    false
                  );

                  navigate(
                    '/power-of-attorney'
                  );
                }}
              >
                Değişiklikleri At ve Çık
              </Button>
            </div>
          </div>
        </div>
      )}

      {showClientChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Uyarıyı kapat"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => {
              setShowClientChangeModal(
                false
              );

              setPendingClientId(
                ''
              );
            }}
          />

          <div
            ref={
              clientChangeModalRef
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="poa-create-client-change-title"
            tabIndex={-1}
            className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl outline-none dark:border-white/[0.08] dark:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div>
                <h2
                  id="poa-create-client-change-title"
                  className="font-semibold text-gray-900 dark:text-white"
                >
                  Müvekkil değişikliği
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400">
                  Müvekkili değiştirirseniz seçili dava kaldırılacak. Diğer vekaletname bilgileri korunacak.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowClientChangeModal(
                    false
                  );

                  setPendingClientId(
                    ''
                  );
                }}
              >
                Vazgeç
              </Button>

              <Button
                type="button"
                onClick={() => {
                  applyClientChange(
                    pendingClientId
                  );

                  setShowClientChangeModal(
                    false
                  );

                  setPendingClientId(
                    ''
                  );
                }}
              >
                Müvekkili Değiştir
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PowerOfAttorneyCreate;