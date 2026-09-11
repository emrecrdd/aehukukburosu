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
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import {
  templateApi,
} from '../../features/templates/template.api.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  FileUp,
  Plus,
  Scale,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const MAX_TITLE_LENGTH =
  200;

const MAX_DESCRIPTION_LENGTH =
  2000;

const ALLOWED_MIME_TYPES =
  new Set([
    'application/pdf',

    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',

    'text/plain',
  ]);

const ALLOWED_EXTENSIONS =
  new Set([
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.txt',
    '.udf',
  ]);

const CATEGORY_OPTIONS = [
  {
    value: 'dilekce',
    label: 'Dilekçe',
  },
  {
    value: 'ihtar',
    label: 'İhtar',
  },
  {
    value: 'sozlesme',
    label: 'Sözleşme',
  },
];

const LAW_AREA_OPTIONS = [
  {
    value: 'ozel_hukuk',
    label: 'Özel Hukuk',
  },
  {
    value: 'ceza_hukuku',
    label: 'Ceza Hukuku',
  },
  {
    value: 'idare_hukuku',
    label: 'İdare Hukuku',
  },
  {
    value: 'ofis_ici',
    label: 'Ofis İçi',
  },
];

const INITIAL_FORM = {
  title: '',
  description: '',
  category: 'dilekce',
  law_area: 'ozel_hukuk',
};

// ======================================================
// HELPERS
// ======================================================

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

const getFileExtension = (
  fileName = ''
) => {
  const lastDot =
    fileName.lastIndexOf('.');

  if (
    lastDot === -1
  ) {
    return '';
  }

  return fileName
    .slice(lastDot)
    .toLowerCase();
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

const getResponseItem = (
  response
) => {
  return (
    response?.data?.data ??
    response?.data ??
    response ??
    null
  );
};

const getTemplateIdFromResponse = (
  response
) => {
  return normalizeId(
    getResponseItem(
      response
    )?.id
  );
};

const looksTurkishMessage = (
  value
) => {
  return /[çğıöşüÇĞİÖŞÜ]|zorunlu|geçersiz|bulunamadı|yetki|başarısız|yüklenemedi|oluşturulamadı|dosya|şablon/i.test(
    String(
      value ||
      ''
    )
  );
};

const getSafeFieldMessage = (
  field,
  message
) => {
  const normalizedField =
    String(
      field ||
      ''
    )
      .replace(
        /\[(\w+)\]/g,
        '.$1'
      )
      .split('.')[0]
      .trim();

  const aliases = {
    lawArea:
      'law_area',
    mime_type:
      'file',
    mimetype:
      'file',
    file_type:
      'file',
  };

  const safeField =
    aliases[normalizedField] ||
    normalizedField;

  const rawMessage =
    String(
      message ||
      ''
    ).trim();

  const technical =
    /validation failed|validation error|sequelize|notnull|cannot be null|must not be null|invalid input syntax|constraint|foreign key|uuid|syntax error|unexpected|stack|trace|sql|database|mime type|multipart|multer/i.test(
      rawMessage
    );

  if (
    rawMessage &&
    !technical &&
    looksTurkishMessage(
      rawMessage
    )
  ) {
    return {
      field:
        safeField,
      message:
        rawMessage,
    };
  }

  const fieldMessages = {
    title:
      'Şablon başlığını kontrol edin.',
    description:
      'Şablon açıklamasını kontrol edin.',
    category:
      'Geçerli bir kategori seçin.',
    law_area:
      'Geçerli bir hukuk alanı seçin.',
    file:
      'Şablon dosyasını kontrol edin.',
  };

  return {
    field:
      safeField,
    message:
      fieldMessages[
        safeField
      ] ||
      'Bu alanı kontrol edin.',
  };
};

const getBackendFieldErrors = (
  error
) => {
  const payload =
    error?.response?.data;

  const source =
    payload?.errors ??
    payload?.validation_errors ??
    null;

  if (!source) {
    return {};
  }

  const assignSafeError = (
    result,
    field,
    message
  ) => {
    const safe =
      getSafeFieldMessage(
        field,
        message
      );

    if (
      safe.field
    ) {
      result[
        safe.field
      ] =
        safe.message;
    }

    return result;
  };

  if (
    Array.isArray(
      source
    )
  ) {
    return source.reduce(
      (
        result,
        item
      ) => {
        const field =
          item?.path ??
          item?.param ??
          item?.field;

        const message =
          item?.msg ??
          item?.message;

        if (
          field &&
          message
        ) {
          assignSafeError(
            result,
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
    typeof source ===
    'object'
  ) {
    return Object.entries(
      source
    ).reduce(
      (
        result,
        [field, value]
      ) => {
        const message =
          Array.isArray(
            value
          )
            ? value[0]
            : value;

        if (
          message !== null &&
          message !== undefined
        ) {
          assignSafeError(
            result,
            field,
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

const getTemplateErrorMessage = (
  error,
  fallback =
    'Şablon oluşturulamadı'
) => {
  const status =
    Number(
      error?.response?.status
    );

  const payload =
    error?.response?.data;

  const rawMessage =
    String(
      payload?.message ||
      error?.message ||
      ''
    ).trim();

  const validationText =
    [
      payload?.errors,
      payload?.validation_errors,
    ]
      .flatMap(
        (value) =>
          Array.isArray(
            value
          )
            ? value
            : (
                value &&
                typeof value ===
                  'object'
                  ? Object.values(
                      value
                    )
                  : []
              )
      )
      .map(
        (value) =>
          String(
            value?.message ??
            value?.msg ??
            (
              Array.isArray(
                value
              )
                ? value[0]
                : value
            ) ??
            ''
          ).trim()
      )
      .filter(Boolean)
      .join(' ');

  const technicalText =
    `${rawMessage} ${validationText}`.trim();

  if (
    status === 401
  ) {
    return 'Oturumunuz sona ermiş olabilir. Lütfen yeniden giriş yapın.';
  }

  if (
    status === 403
  ) {
    return 'Şablon oluşturmak için yetkiniz bulunmuyor.';
  }

  if (
    status === 413 ||
    /payload too large|file too large/i.test(
      technicalText
    )
  ) {
    return 'Dosya boyutu izin verilen sınırı aşıyor.';
  }

  if (
    status === 409
  ) {
    return 'Bu bilgilerle çakışan bir şablon kaydı bulunuyor.';
  }

  if (
    status === 422 ||
    /validation failed|validation error|sequelize|notnull|cannot be null|must not be null|invalid input syntax|constraint|foreign key|uuid/i.test(
      technicalText
    )
  ) {
    return 'Şablon bilgileri doğrulanamadı. Formdaki alanları ve dosyayı kontrol edin.';
  }

  if (
    /unsupported.*file|invalid.*file|file type|mime type|mimetype|multer/i.test(
      technicalText
    )
  ) {
    return 'Dosya türü desteklenmiyor. İzin verilen dosya türlerinden birini seçin.';
  }

  if (
    /network error|failed to fetch|timeout|econnrefused|enotfound|network request failed/i.test(
      technicalText
    )
  ) {
    return 'Sunucuya bağlanılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.';
  }

  if (
    status >= 500
  ) {
    return 'Şablon şu anda oluşturulamıyor. Lütfen biraz sonra tekrar deneyin.';
  }

  const technical =
    /sequelize|constraint|foreign key|uuid|syntax error|unexpected|stack|trace|sql|database/i.test(
      rawMessage
    );

  if (
    rawMessage &&
    !technical &&
    looksTurkishMessage(
      rawMessage
    )
  ) {
    return rawMessage;
  }

  return fallback;
};

const isAllowedOption = (
  options,
  value
) => {
  return options.some(
    (option) =>
      option.value ===
      value
  );
};

const getFileTypeLabel = (
  file
) => {
  if (!file) {
    return '-';
  }

  const extension =
    getFileExtension(
      file.name
    );

  if (
    extension === '.udf'
  ) {
    return 'UYAP UDF';
  }

  if (
    file.type ===
      'application/pdf' ||
    extension === '.pdf'
  ) {
    return 'PDF';
  }

  if (
    file.type ===
      'application/msword' ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === '.doc' ||
    extension === '.docx'
  ) {
    return 'Word';
  }

  if (
    file.type ===
      'application/vnd.ms-excel' ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    extension === '.xls' ||
    extension === '.xlsx'
  ) {
    return 'Excel';
  }

  if (
    file.type?.startsWith(
      'image/'
    )
  ) {
    return 'Görsel';
  }

  if (
    file.type ===
      'text/plain' ||
    extension === '.txt'
  ) {
    return 'Metin';
  }

  return 'Dosya';
};

// ======================================================
// COMPONENT
// ======================================================

const TemplateCreate = () => {
  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const fileInputRef =
    useRef(null);

  const leaveModalRef =
    useRef(null);

  const previousFocusRef =
    useRef(null);

  const [
    formData,
    setFormData,
  ] =
    useState(
      () => ({
        ...INITIAL_FORM,
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

  const normalizedForm = {
    title:
      formData.title.trim(),
    description:
      formData.description.trim(),
    category:
      formData.category,
    law_area:
      formData.law_area,
  };

  const isDirty =
    Boolean(
      file ||
      JSON.stringify(
        normalizedForm
      ) !==
        JSON.stringify(
          INITIAL_FORM
        )
    );

  // ====================================================
  // MUTATION
  // ====================================================

  const mutation =
    useMutation({
      mutationFn: (
        data
      ) =>
        templateApi.create(
          data
        ),

      onSuccess: async (
        response
      ) => {
        const templateId =
          getTemplateIdFromResponse(
            response
          );

        if (
          templateId
        ) {
          queryClient.setQueryData(
            [
              'template',
              templateId,
            ],
            response
          );

          queryClient.setQueryData(
            [
              'templates',
              'detail',
              templateId,
            ],
            response
          );
        }

        /*
         * Şablon liste/detail/sayaçları create sonrası F5 beklemeden
         * güncellensin. ['templates'] prefix'i filtreli listeleri de kapsar.
         */
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              'templates',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'template-statistics',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-stats',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-templates',
            ],
          }),
        ]);

        toast.success(
          'Şablon başarıyla oluşturuldu'
        );

        navigate(
          templateId
            ? `/templates/${templateId}`
            : '/templates'
        );
      },

      onError: (
        error
      ) => {
        const fieldErrors =
          getBackendFieldErrors(
            error
          );

        if (
          Object.keys(
            fieldErrors
          ).length >
          0
        ) {
          setErrors(
            (
              current
            ) => ({
              ...current,
              ...fieldErrors,
            })
          );
        }

        toast.error(
          getTemplateErrorMessage(
            error
          )
        );
      },
    });

  // ====================================================
  // FORM HANDLERS
  // ====================================================

  useEffect(() => {
    const handleBeforeUnload =
      (
        event
      ) => {
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
    if (
      !showLeaveModal
    ) {
      return;
    }

    previousFocusRef.current =
      document.activeElement;

    const modal =
      leaveModalRef.current;

    const getFocusable =
      () =>
        Array.from(
          modal?.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          ) ||
          []
        );

    const focusTimer =
      window.setTimeout(
        () => {
          getFocusable()[0]
            ?.focus();
        },
        0
      );

    const handleKeyDown =
      (
        event
      ) => {
        if (
          event.key ===
          'Escape'
        ) {
          event.preventDefault();

          setShowLeaveModal(
            false
          );

          return;
        }

        if (
          event.key !==
          'Tab'
        ) {
          return;
        }

        const focusable =
          getFocusable();

        if (
          focusable.length ===
          0
        ) {
          event.preventDefault();
          return;
        }

        const first =
          focusable[0];

        const last =
          focusable[
            focusable.length -
              1
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
      window.clearTimeout(
        focusTimer
      );

      document.removeEventListener(
        'keydown',
        handleKeyDown
      );

      previousFocusRef.current
        ?.focus?.();
    };
  }, [
    showLeaveModal,
  ]);

  const requestExit =
    () => {
      if (
        mutation.isPending
      ) {
        return;
      }

      if (
        !isDirty
      ) {
        navigate(
          '/templates'
        );

        return;
      }

      setShowLeaveModal(
        true
      );
    };

  const discardAndExit =
    () => {
      setShowLeaveModal(
        false
      );

      navigate(
        '/templates'
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

      let nextValue =
        value;

      if (
        name ===
        'title'
      ) {
        nextValue =
          String(
            value
          ).slice(
            0,
            MAX_TITLE_LENGTH
          );
      }

      if (
        name ===
        'description'
      ) {
        nextValue =
          String(
            value
          ).slice(
            0,
            MAX_DESCRIPTION_LENGTH
          );
      }

      if (
        name ===
          'category' &&
        !isAllowedOption(
          CATEGORY_OPTIONS,
          nextValue
        )
      ) {
        return;
      }

      if (
        name ===
          'law_area' &&
        !isAllowedOption(
          LAW_AREA_OPTIONS,
          nextValue
        )
      ) {
        return;
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

  // ====================================================
  // FILE VALIDATION
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

      const clearNativeInput =
        () => {
          if (
            fileInputRef.current
          ) {
            fileInputRef.current.value =
              '';
          }
        };

      if (
        selectedFile.size <=
        0
      ) {
        setFile(
          null
        );

        setFileError(
          'Boş dosya yüklenemez.'
        );

        clearNativeInput();

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

        clearNativeInput();

        return;
      }

      const extension =
        getFileExtension(
          selectedFile.name
        );

      const mimeType =
        String(
          selectedFile.type ||
          ''
        ).trim();

      const isAllowedMime =
        ALLOWED_MIME_TYPES.has(
          mimeType
        );

      const isUdf =
        extension === '.udf';

      const isAllowedExtension =
        ALLOWED_EXTENSIONS.has(
          extension
        );

      /*
       * Office/UDF dosyalarında bazı tarayıcılar MIME bilgisini boş bırakır.
       * Uzantı whitelist'teyse boş MIME kabul edilir. MIME dolu fakat izinli
       * değilse UDF hariç reddedilir. Asıl dosya doğrulaması backend'de de
       * yapılmalıdır.
       */
      const hasAcceptableMime =
        isUdf ||
        !mimeType ||
        isAllowedMime;

      if (
        !isAllowedExtension ||
        !hasAcceptableMime
      ) {
        setFile(
          null
        );

        setFileError(
          'PDF, Word, Excel, görsel, TXT veya UYAP UDF dosyası yükleyebilirsiniz.'
        );

        clearNativeInput();

        return;
      }

      setFile(
        selectedFile
      );

      setFileError(
        ''
      );

      setErrors(
        (
          current
        ) => ({
          ...current,
          file:
            '',
        })
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

      setErrors(
        (
          current
        ) => ({
          ...current,
          file:
            '',
        })
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

      const title =
        formData.title.trim();

      const description =
        formData.description.trim();

      const newErrors =
        {};

      if (
        !title
      ) {
        newErrors.title =
          'Şablon başlığı gereklidir';
      } else if (
        title.length >
        MAX_TITLE_LENGTH
      ) {
        newErrors.title =
          `Şablon başlığı en fazla ${MAX_TITLE_LENGTH} karakter olabilir`;
      }

      if (
        description.length >
        MAX_DESCRIPTION_LENGTH
      ) {
        newErrors.description =
          `Açıklama en fazla ${MAX_DESCRIPTION_LENGTH} karakter olabilir`;
      }

      if (
        !isAllowedOption(
          CATEGORY_OPTIONS,
          formData.category
        )
      ) {
        newErrors.category =
          'Geçerli bir kategori seçin';
      }

      if (
        !isAllowedOption(
          LAW_AREA_OPTIONS,
          formData.law_area
        )
      ) {
        newErrors.law_area =
          'Geçerli bir hukuk alanı seçin';
      }

      if (
        !file
      ) {
        newErrors.file =
          'Şablon dosyası seçilmelidir';
      } else if (
        file.size <=
        0
      ) {
        newErrors.file =
          'Boş dosya yüklenemez';
      } else if (
        file.size >
        MAX_FILE_SIZE
      ) {
        newErrors.file =
          'Dosya boyutu 10 MB’dan büyük olamaz';
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

        return;
      }

      const submitData =
        new FormData();

      submitData.append(
        'title',
        title
      );

      submitData.append(
        'description',
        description
      );

      submitData.append(
        'category',
        formData.category
      );

      submitData.append(
        'law_area',
        formData.law_area
      );

      submitData.append(
        'file',
        file
      );

      mutation.mutate(
        submitData
      );
    };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to="/templates"
          onClick={(
            event
          ) => {
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
          Şablonlar
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
              bg-indigo-50
              text-indigo-600
              dark:bg-indigo-500/[0.08]
              dark:text-indigo-400
            "
          >
            <FileText size={21} />
          </div>

          <div>

            <h1
              className="
                text-2xl
                font-semibold
                tracking-[-0.035em]
                text-gray-900
                dark:text-white
              "
            >
              Yeni Şablon
            </h1>

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
              Büro içerisinde tekrar kullanılacak dilekçe, ihtar veya sözleşme şablonunu tanımlayın.
            </p>

            {isDirty && (
              <div className="mt-2">
                <Badge
                  variant="warning"
                  dot
                >
                  Kaydedilmemiş değişiklik
                </Badge>
              </div>
            )}

          </div>

        </div>

      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
      >

        {/* TEMPLATE INFORMATION */}

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
                <FileText size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Şablon Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Şablonun adı, açıklaması ve sınıflandırması
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <Input
              label="Şablon Başlığı *"
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
              maxLength={
                MAX_TITLE_LENGTH
              }
              disabled={
                mutation.isPending
              }
              placeholder="Örn: İcra Takibi İtiraz Dilekçesi"
              autoFocus
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
                rows={4}
                maxLength={
                  MAX_DESCRIPTION_LENGTH
                }
                disabled={
                  mutation.isPending
                }
                placeholder="Şablonun hangi işlemlerde kullanılacağını kısaca açıklayın..."
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

              {errors.description && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                  {errors.description}
                </p>
              )}

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              {/* CATEGORY */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Kategori *
                </label>

                <select
                  name="category"
                  value={
                    formData.category
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
                  {CATEGORY_OPTIONS.map(
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

                {errors.category && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {errors.category}
                  </p>
                )}

              </div>

              {/* LAW AREA */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Hukuk Alanı *
                </label>

                <select
                  name="law_area"
                  value={
                    formData.law_area
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
                  {LAW_AREA_OPTIONS.map(
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

                {errors.law_area && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {errors.law_area}
                  </p>
                )}

              </div>

            </div>

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
                  bg-emerald-50
                  text-emerald-600
                  dark:bg-emerald-500/[0.08]
                  dark:text-emerald-400
                "
              >
                <FileUp size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Şablon Dosyası
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Kullanıcıların daha sonra indireceği ana şablon dosyası
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
                    : fileError ||
                        errors.file
                      ? 'border-red-300 bg-red-50/50 dark:border-red-500/20 dark:bg-red-500/[0.025]'
                      : isDragging
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/[0.05]'
                        : 'cursor-pointer border-gray-200 bg-gray-50/50 hover:border-blue-400 hover:bg-blue-50/30 dark:border-white/[0.08] dark:bg-white/[0.015] dark:hover:border-blue-500/40 dark:hover:bg-blue-500/[0.025]'
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
                          Dosya hazır
                        </Badge>

                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-slate-500">

                        <span>
                          {getFileTypeLabel(
                            file
                          )}
                        </span>

                        <span>
                          ·
                        </span>

                        <span>
                          {formatFileSize(
                            file.size
                          )}
                        </span>

                      </div>

                    </div>

                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    disabled={
                      mutation.isPending
                    }
                    onClick={(
                      event
                    ) => {
                      event.stopPropagation();

                      handleRemoveFile();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Dosyayı Kaldır
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
                    Dosyayı buraya sürükleyin
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                    veya bilgisayarınızdan seçmek için tıklayın
                  </p>

                  <div className="mt-4 flex flex-wrap justify-center gap-2">

                    <Badge variant="default">
                      PDF
                    </Badge>

                    <Badge variant="default">
                      Word
                    </Badge>

                    <Badge variant="default">
                      Excel
                    </Badge>

                    <Badge variant="default">
                      Görsel
                    </Badge>

                    <Badge variant="default">
                      UYAP UDF
                    </Badge>

                    <Badge variant="default">
                      TXT
                    </Badge>

                    <Badge variant="default">
                      En fazla 10 MB
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
                disabled={
                  mutation.isPending
                }
                onChange={
                  handleFileChange
                }
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt,.udf"
              />

            </div>

            {(fileError ||
              errors.file) && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {fileError ||
                  errors.file}
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

                  Dosya doğrulandı ve yüklemeye hazır.
                </div>
              )}

          </Card.Body>

        </Card>

        {/* SUMMARY */}

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
                <Scale size={17} />
              </div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Kayıt Özeti
              </h2>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid gap-3 sm:grid-cols-3">

              <div
                className="
                  rounded-xl
                  border
                  border-gray-100
                  bg-gray-50/50
                  p-3
                  dark:border-white/[0.05]
                  dark:bg-white/[0.02]
                "
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-600">
                  Kategori
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-slate-300">
                  {CATEGORY_OPTIONS.find(
                    (
                      option
                    ) =>
                      option.value ===
                      formData.category
                  )?.label ||
                    '-'}
                </p>

              </div>

              <div
                className="
                  rounded-xl
                  border
                  border-gray-100
                  bg-gray-50/50
                  p-3
                  dark:border-white/[0.05]
                  dark:bg-white/[0.02]
                "
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-600">
                  Hukuk Alanı
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-slate-300">
                  {LAW_AREA_OPTIONS.find(
                    (
                      option
                    ) =>
                      option.value ===
                      formData.law_area
                  )?.label ||
                    '-'}
                </p>

              </div>

              <div
                className="
                  rounded-xl
                  border
                  border-gray-100
                  bg-gray-50/50
                  p-3
                  dark:border-white/[0.05]
                  dark:bg-white/[0.02]
                "
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-600">
                  Dosya
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-gray-700 dark:text-slate-300">
                  {file
                    ? getFileTypeLabel(
                        file
                      )
                    : 'Seçilmedi'}
                </p>

              </div>

            </div>

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
              mutation.isPending
            }
          >
            <Plus className="h-4 w-4" />
            Şablon Oluştur
          </Button>

        </div>

      </form>

      {showLeaveModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Uyarıyı kapat"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[1px]"
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
            aria-labelledby="template-create-leave-title"
            aria-describedby="template-create-leave-description"
            className="
              relative
              z-10
              w-full
              max-w-md
              rounded-2xl
              border
              border-gray-200
              bg-white
              p-5
              shadow-2xl
              dark:border-white/[0.08]
              dark:bg-slate-900
            "
          >
            <div className="flex items-start justify-between gap-4">

              <div className="flex items-start gap-3">

                <div
                  className="
                    flex
                    h-10
                    w-10
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
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                  <h2
                    id="template-create-leave-title"
                    className="text-base font-semibold text-gray-900 dark:text-white"
                  >
                    Kaydedilmemiş değişiklikler
                  </h2>

                  <p
                    id="template-create-leave-description"
                    className="mt-1.5 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    Şablon oluşturulmadan çıkarsanız girdiğiniz bilgiler ve seçtiğiniz dosya kaydedilmeyecek.
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowLeaveModal(
                    false
                  )
                }
                className="
                  rounded-lg
                  p-1.5
                  text-gray-400
                  transition
                  hover:bg-gray-100
                  hover:text-gray-600
                  focus:outline-none
                  focus:ring-2
                  focus:ring-blue-500/20
                  dark:hover:bg-white/[0.06]
                  dark:hover:text-slate-200
                "
                aria-label="Uyarıyı kapat"
              >
                <X className="h-4 w-4" />
              </button>

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

    </div>
  );
};

export default TemplateCreate;