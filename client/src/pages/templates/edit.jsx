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
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  templateApi,
} from '../../features/templates/template.api.js';

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
  FileText,
  FolderOpen,
  RefreshCw,
  Save,
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
  255;

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

// ======================================================
// HELPERS
// ======================================================

const formatFileSize = (bytes) => {
  const size =
    Number(bytes) || 0;

  if (size <= 0) {
    return '0 B';
  }

  const units = [
    'B',
    'KB',
    'MB',
    'GB',
  ];

  const index = Math.min(
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
    value.toFixed(2)
  )} ${units[index]}`;
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

const replaceResponseItem = (
  current,
  nextItem
) => {
  if (!current) {
    return nextItem;
  }

  if (
    current?.data?.data !==
    undefined
  ) {
    return {
      ...current,
      data: {
        ...current.data,
        data:
          nextItem,
      },
    };
  }

  if (
    current?.data !==
    undefined
  ) {
    return {
      ...current,
      data:
        nextItem,
    };
  }

  return nextItem;
};

const getFileExtension = (
  fileName = ''
) => {
  const lastDot =
    String(
      fileName
    ).lastIndexOf('.');

  if (
    lastDot === -1
  ) {
    return '';
  }

  return String(
    fileName
  )
    .slice(
      lastDot
    )
    .toLowerCase();
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
          result[field] =
            getErrorMessage(
              {
                response: {
                  data: {
                    message:
                      String(
                        message
                      ),
                  },
                },
              },
              'Geçersiz değer'
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
          result[field] =
            getErrorMessage(
              {
                response: {
                  data: {
                    message:
                      String(
                        message
                      ),
                  },
                },
              },
              'Geçersiz değer'
            );
        }

        return result;
      },
      {}
    );
  }

  return {};
};

const getErrorMessage = (
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
    /validation failed|validation error|sequelizevalidationerror|notnull violation|cannot be null|must not be null|invalid input syntax/i.test(
      rawMessage
    )
  ) {
    return 'Şablon bilgileri doğrulanamadı. Zorunlu ve geçerli alanları kontrol edin.';
  }

  if (
    /template.*not found|not found.*template/i.test(
      rawMessage
    )
  ) {
    return 'Şablon kaydı bulunamadı.';
  }

  if (
    /forbidden|permission denied|not authorized|unauthorized|access denied/i.test(
      rawMessage
    )
  ) {
    return 'Bu işlem için yetkiniz bulunmuyor.';
  }

  if (
    /file.*too large|payload too large/i.test(
      rawMessage
    )
  ) {
    return 'Dosya boyutu izin verilen sınırı aşıyor.';
  }

  if (
    /unsupported.*file|invalid.*file|file type|mime type/i.test(
      rawMessage
    )
  ) {
    return 'Desteklenmeyen dosya türü.';
  }

  if (
    /network error|failed to fetch|timeout|econnrefused|enotfound/i.test(
      rawMessage
    )
  ) {
    return 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.';
  }

  const looksTurkish =
    /[çğıöşüÇĞİÖŞÜ]|bulunamadı|geçersiz|zorunlu|yetkiniz|başarısız|yüklenemedi|güncellenemedi|silinemedi|hata/i.test(
      rawMessage
    );

  return looksTurkish
    ? rawMessage
    : fallback;
};

const isAllowedOption = (
  options,
  value
) => {
  return options.some(
    (item) =>
      item.value ===
      value
  );
};

const normalizeTemplateForm = (
  value
) => {
  return {
    title:
      String(
        value?.title ??
        ''
      ).trim(),

    description:
      String(
        value?.description ??
        ''
      ).trim(),

    category:
      String(
        value?.category ??
        ''
      ),

    law_area:
      String(
        value?.law_area ??
        ''
      ),
  };
};

const getCategoryLabel = (value) => {
  return (
    CATEGORY_OPTIONS.find(
      (item) =>
        item.value === value
    )?.label ||
    value ||
    '-'
  );
};

const getLawAreaLabel = (value) => {
  return (
    LAW_AREA_OPTIONS.find(
      (item) =>
        item.value === value
    )?.label ||
    value ||
    '-'
  );
};

// ======================================================
// COMPONENT
// ======================================================

const TemplateEdit = () => {
  const navigate =
    useNavigate();

  const {
    id: idParam,
  } =
    useParams();

  const id =
    normalizeId(
      idParam
    );

  const queryClient =
    useQueryClient();

  const {
    user,
  } = useAuth();

  const canDelete =
    hasPermission(
      user,
      PERMISSION_KEYS.DELETE_TEMPLATES
    );

  const fileInputRef =
    useRef(null);

  const [
    formData,
    setFormData,
  ] = useState({
    title: '',
    description: '',
    category: 'dilekce',
    law_area: 'ozel_hukuk',
  });

  const [
    initialFormData,
    setInitialFormData,
  ] = useState({
    title: '',
    description: '',
    category: 'dilekce',
    law_area: 'ozel_hukuk',
  });

  const [
    file,
    setFile,
  ] = useState(null);

  const [
    fileError,
    setFileError,
  ] = useState('');

  const [
    errors,
    setErrors,
  ] = useState({});

  const [
    deleteDialogOpen,
    setDeleteDialogOpen,
  ] = useState(false);

  const [
    leaveDialogOpen,
    setLeaveDialogOpen,
  ] = useState(false);

  const [
    pendingNavigationPath,
    setPendingNavigationPath,
  ] = useState('');

  const initializedTemplateIdRef =
    useRef('');

  const leaveDialogRef =
    useRef(null);

  const deleteDialogRef =
    useRef(null);

  const dialogReturnFocusRef =
    useRef(null);

  // ======================================================
  // TEMPLATE QUERY
  // ======================================================

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      'template',
      id,
    ],

    queryFn: () =>
      templateApi.getOne(
        id
      ),

    enabled:
      Boolean(
        id
      ),

    staleTime:
      0,

    refetchOnMount:
      'always',

    refetchOnWindowFocus:
      'always',

    refetchOnReconnect:
      'always',
  });

  const template =
    getResponseItem(
      data
    );

  // ======================================================
  // FORM INITIALIZATION
  // ======================================================

  useEffect(() => {
    if (
      !template ||
      !id ||
      initializedTemplateIdRef.current ===
        id
    ) {
      return;
    }

    const nextForm = {
      title:
        String(
          template.title ??
          ''
        ),

      description:
        String(
          template.description ??
          ''
        ),

      category:
        isAllowedOption(
          CATEGORY_OPTIONS,
          template.category
        )
          ? template.category
          : 'dilekce',

      law_area:
        isAllowedOption(
          LAW_AREA_OPTIONS,
          template.law_area
        )
          ? template.law_area
          : 'ozel_hukuk',
    };

    setFormData(
      nextForm
    );

    setInitialFormData(
      nextForm
    );

    setFile(
      null
    );

    setFileError(
      ''
    );

    setErrors(
      {}
    );

    initializedTemplateIdRef.current =
      id;
  }, [
    template,
    id,
  ]);

  const normalizedForm =
    normalizeTemplateForm(
      formData
    );

  const initialForm =
    normalizeTemplateForm(
      initialFormData
    );

  const isDirty =
    Boolean(
      file ||
      normalizedForm.title !==
        initialForm.title ||
      normalizedForm.description !==
        initialForm.description ||
      normalizedForm.category !==
        initialForm.category ||
      normalizedForm.law_area !==
        initialForm.law_area
    );

  useEffect(() => {
    const handleBeforeUnload =
      (
        event
      ) => {
        if (
          !isDirty
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
  ]);

  const invalidateTemplateCollections =
    async () => {
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
    };

  // ======================================================
  // UPDATE
  // ======================================================

  const updateMutation =
    useMutation({
      mutationFn: (
        payload
      ) => {
        if (!id) {
          throw new Error(
            'Geçerli şablon kaydı bulunamadı'
          );
        }

        return templateApi.update(
          id,
          payload
        );
      },

      onMutate: async () => {
        if (!id) {
          return;
        }

        await queryClient.cancelQueries({
          queryKey: [
            'template',
            id,
          ],
          exact:
            true,
        });
      },

      onSuccess: async (
        response
      ) => {
        const responseItem =
          getResponseItem(
            response
          );

        queryClient.setQueryData(
          [
            'template',
            id,
          ],
          (
            current
          ) => {
            const currentItem =
              getResponseItem(
                current
              );

            const nextItem = {
              ...(currentItem &&
              typeof currentItem ===
                'object'
                ? currentItem
                : {}),

              ...normalizedForm,

              ...(responseItem &&
              typeof responseItem ===
                'object'
                ? responseItem
                : {}),
            };

            return replaceResponseItem(
              current ??
              response,
              nextItem
            );
          }
        );

        queryClient.setQueryData(
          [
            'templates',
            'detail',
            id,
          ],
          response
        );

        await invalidateTemplateCollections();

        toast.success(
          'Şablon başarıyla güncellendi'
        );

        navigate(
          `/templates/${id}`
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
          getErrorMessage(
            error,
            'Şablon güncellenemedi'
          )
        );
      },
    });

  // ======================================================
  // DELETE
  // ======================================================

  const deleteMutation =
    useMutation({
      mutationFn: () => {
        if (!id) {
          throw new Error(
            'Geçerli şablon kaydı bulunamadı'
          );
        }

        return templateApi.delete(
          id
        );
      },

      onMutate: async () => {
        if (!id) {
          return;
        }

        await queryClient.cancelQueries({
          queryKey: [
            'template',
            id,
          ],
          exact:
            true,
        });
      },

      onSuccess: async () => {
        queryClient.removeQueries({
          queryKey: [
            'template',
            id,
          ],
          exact:
            true,
        });

        queryClient.removeQueries({
          queryKey: [
            'templates',
            'detail',
            id,
          ],
          exact:
            true,
        });

        await invalidateTemplateCollections();

        toast.success(
          'Şablon silindi'
        );

        navigate(
          '/templates'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Şablon silinemedi'
          )
        );
      },
    });

  // ======================================================
  // CHANGE
  // ======================================================

  const handleChange = (
    event
  ) => {
    if (
      updateMutation.isPending ||
      deleteMutation.isPending
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

  // ======================================================
  // FILE
  // ======================================================

  const handleFileChange = (
    event
  ) => {
    if (
      updateMutation.isPending ||
      deleteMutation.isPending
    ) {
      return;
    }

    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const clearInput =
      () => {
        event.target.value =
          '';
      };

    if (
      selectedFile.size <=
      0
    ) {
      setFileError(
        'Boş dosya yüklenemez.'
      );

      setFile(
        null
      );

      clearInput();

      return;
    }

    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {
      setFileError(
        'Dosya boyutu 10 MB’dan büyük olamaz.'
      );

      setFile(
        null
      );

      clearInput();

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

    const isAllowedExtension =
      ALLOWED_EXTENSIONS.has(
        extension
      );

    const isAllowedMime =
      ALLOWED_MIME_TYPES.has(
        mimeType
      );

    const isUdf =
      extension ===
      '.udf';

    const hasAcceptableMime =
      isUdf ||
      !mimeType ||
      isAllowedMime;

    if (
      !isAllowedExtension ||
      !hasAcceptableMime
    ) {
      setFileError(
        'PDF, Word, Excel, görsel, TXT veya UYAP UDF dosyası yükleyebilirsiniz.'
      );

      setFile(
        null
      );

      clearInput();

      return;
    }

    setFileError(
      ''
    );

    setFile(
      selectedFile
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

  const handleRemoveNewFile =
    () => {
      if (
        updateMutation.isPending ||
        deleteMutation.isPending
      ) {
        return;
      }

      setFile(null);
      setFileError('');

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          '';
      }
    };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm = () => {
    const nextErrors =
      {};

    if (
      !normalizedForm.title
    ) {
      nextErrors.title =
        'Başlık gereklidir';
    } else if (
      normalizedForm.title.length >
      MAX_TITLE_LENGTH
    ) {
      nextErrors.title =
        `Başlık en fazla ${MAX_TITLE_LENGTH} karakter olabilir`;
    }

    if (
      normalizedForm.description.length >
      MAX_DESCRIPTION_LENGTH
    ) {
      nextErrors.description =
        `Açıklama en fazla ${MAX_DESCRIPTION_LENGTH} karakter olabilir`;
    }

    if (
      !isAllowedOption(
        CATEGORY_OPTIONS,
        normalizedForm.category
      )
    ) {
      nextErrors.category =
        'Geçerli bir kategori seçin';
    }

    if (
      !isAllowedOption(
        LAW_AREA_OPTIONS,
        normalizedForm.law_area
      )
    ) {
      nextErrors.law_area =
        'Geçerli bir hukuk alanı seçin';
    }

    if (
      file &&
      (
        file.size <=
          0 ||
        file.size >
          MAX_FILE_SIZE
      )
    ) {
      nextErrors.file =
        file.size <= 0
          ? 'Boş dosya yüklenemez'
          : 'Dosya boyutu 10 MB’dan büyük olamaz';
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
  // SUBMIT
  // ======================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (
      updateMutation.isPending ||
      deleteMutation.isPending ||
      !id
    ) {
      return;
    }

    if (
      !validateForm()
    ) {
      toast.error(
        'Formdaki hataları kontrol edin'
      );

      return;
    }

    if (
      !isDirty
    ) {
      toast(
        'Kaydedilecek bir değişiklik yok',
        {
          icon:
            'ℹ️',
        }
      );

      return;
    }

    const submitData =
      new FormData();

    submitData.append(
      'title',
      normalizedForm.title
    );

    submitData.append(
      'description',
      normalizedForm.description
    );

    submitData.append(
      'category',
      normalizedForm.category
    );

    submitData.append(
      'law_area',
      normalizedForm.law_area
    );

    if (file) {
      submitData.append(
        'file',
        file
      );
    }

    updateMutation.mutate(
      submitData
    );
  };

  // ======================================================
  // UNSAVED CHANGES
  // ======================================================

  const handleAttemptLeave =
    (
      path,
      event = null
    ) => {
      if (
        updateMutation.isPending ||
        deleteMutation.isPending
      ) {
        event?.preventDefault?.();
        return;
      }

      if (!isDirty) {
        if (event) {
          return;
        }

        navigate(path);
        return;
      }

      event?.preventDefault?.();

      dialogReturnFocusRef.current =
        document.activeElement;

      setPendingNavigationPath(
        path
      );

      setLeaveDialogOpen(
        true
      );
    };

  const handleContinueEditing =
    () => {
      setLeaveDialogOpen(
        false
      );

      setPendingNavigationPath(
        ''
      );

      requestAnimationFrame(
        () => {
          dialogReturnFocusRef.current?.focus?.();
        }
      );
    };

  const handleDiscardAndLeave =
    () => {
      const targetPath =
        pendingNavigationPath ||
        `/templates/${id}`;

      setLeaveDialogOpen(
        false
      );

      setPendingNavigationPath(
        ''
      );

      navigate(
        targetPath
      );
    };

  // ======================================================
  // DELETE HANDLER
  // ======================================================

  const handleDelete = () => {
    if (
      updateMutation.isPending ||
      deleteMutation.isPending
    ) {
      return;
    }

    if (!canDelete) {
      toast.error(
        'Bu şablonu silme yetkiniz bulunmuyor'
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
        deleteMutation.isPending ||
        !deleteDialogOpen
      ) {
        return;
      }

      deleteMutation.mutate();
    };

  useEffect(() => {
    if (
      !leaveDialogOpen
    ) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    const dialog =
      leaveDialogRef.current;

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusableElements =
      dialog
        ? Array.from(
            dialog.querySelectorAll(
              focusableSelector
            )
          )
        : [];

    focusableElements[0]?.focus?.();

    const handleKeyDown =
      (
        event
      ) => {
        if (
          event.key ===
          'Escape'
        ) {
          event.preventDefault();
          handleContinueEditing();
          return;
        }

        if (
          event.key !==
            'Tab' ||
          focusableElements.length ===
            0
        ) {
          return;
        }

        const firstElement =
          focusableElements[0];

        const lastElement =
          focusableElements[
            focusableElements.length -
              1
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

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    leaveDialogOpen,
  ]);

  useEffect(() => {
    if (
      !deleteDialogOpen
    ) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    dialogReturnFocusRef.current =
      document.activeElement;

    document.body.style.overflow =
      'hidden';

    const dialog =
      deleteDialogRef.current;

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusableElements =
      dialog
        ? Array.from(
            dialog.querySelectorAll(
              focusableSelector
            )
          )
        : [];

    focusableElements[0]?.focus?.();

    const handleKeyDown =
      (
        event
      ) => {
        if (
          event.key ===
            'Escape' &&
          !deleteMutation.isPending
        ) {
          event.preventDefault();
          setDeleteDialogOpen(
            false
          );
          return;
        }

        if (
          event.key !==
            'Tab' ||
          focusableElements.length ===
            0
        ) {
          return;
        }

        const firstElement =
          focusableElements[0];

        const lastElement =
          focusableElements[
            focusableElements.length -
              1
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

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;

      requestAnimationFrame(
        () => {
          dialogReturnFocusRef.current?.focus?.();
        }
      );
    };
  }, [
    deleteDialogOpen,
    deleteMutation.isPending,
  ]);

  // ======================================================
  // LOADING
  // ======================================================

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Şablon bilgileri yükleniyor...
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
    !template
  ) {
    return (
      <div className="py-12 text-center">

        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800">
          <FileText className="h-6 w-6" />
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Şablon Bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {getErrorMessage(
            error,
            'Şablon bilgileri yüklenemedi'
          )}
        </p>

        <Link
          to="/templates"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Şablonlara Dön
        </Link>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div>

        <Link
          to={`/templates/${id}`}
          onClick={(
            event
          ) =>
            handleAttemptLeave(
              `/templates/${id}`,
              event
            )
          }
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

          Şablon Detayı
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
              bg-blue-50
              text-blue-600
              dark:bg-blue-500/[0.08]
              dark:text-blue-400
            "
          >
            <FileText size={21} />
          </div>

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-3">
              <h1
                className="
                  text-2xl
                  font-semibold
                  tracking-[-0.035em]
                  text-gray-900
                  dark:text-white
                "
              >
                Şablon Düzenle
              </h1>

              {isDirty && (
                <Badge variant="warning">
                  Kaydedilmemiş değişiklik
                </Badge>
              )}
            </div>

            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400">
              Şablonun sınıflandırmasını, açıklamasını ve gerektiğinde dosyasını güncelleyin.
            </p>

            <p className="mt-1 truncate text-xs text-gray-400 dark:text-slate-500">
              {template.title}
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

        {/* ==================================================
            TEMPLATE INFO
        ================================================== */}

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
                  Başlık ve açıklama bilgileri
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
              placeholder="Örn: İcra Takibi Dilekçesi"
              disabled={
                updateMutation.isPending ||
                deleteMutation.isPending
              }
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
                  updateMutation.isPending ||
                  deleteMutation.isPending
                }
                rows={4}
                maxLength={
                  MAX_DESCRIPTION_LENGTH
                }
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
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                  dark:placeholder:text-slate-500
                "
                placeholder="Şablon hakkında kısa açıklama..."
              />

              {errors.description && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                  {errors.description}
                </p>
              )}

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            CLASSIFICATION
        ================================================== */}

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
                <FolderOpen size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Sınıflandırma
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Kategori ve hukuk alanını belirleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid gap-4 md:grid-cols-2">

              {/* CATEGORY */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Kategori
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
                    updateMutation.isPending ||
                    deleteMutation.isPending
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
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >

                  {CATEGORY_OPTIONS.map(
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {item.label}
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
                  Hukuk Alanı
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
                    updateMutation.isPending ||
                    deleteMutation.isPending
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
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >

                  {LAW_AREA_OPTIONS.map(
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {item.label}
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

        {/* ==================================================
            CURRENT FILE
        ================================================== */}

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
                <FileText size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Mevcut Dosya
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Yeni dosya seçmezseniz bu dosya korunur
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div
              className="
                flex
                flex-col
                gap-4
                rounded-xl
                border
                border-gray-100
                bg-gray-50/70
                p-4
                dark:border-white/[0.05]
                dark:bg-white/[0.02]
                sm:flex-row
                sm:items-center
              "
            >

              <div
                className="
                  flex
                  h-14
                  w-14
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-white
                  text-3xl
                  shadow-sm
                  dark:bg-white/[0.04]
                "
              >
                <FileText className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">

                <p className="truncate font-semibold text-gray-900 dark:text-white">
                  {template.file_name ||
                    'Dosya adı bulunamadı'}
                </p>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-500">

                  <span>
                    {template.file_type ||
                      'Dosya'}
                  </span>

                  <span>
                    •
                  </span>

                  <span>
                    {formatFileSize(
                      template.file_size
                    )}
                  </span>

                  <span>
                    •
                  </span>

                  <span>
                    v
                    {template.version ||
                      1}
                  </span>

                </div>

              </div>

              <Badge variant="success">
                Korunacak
              </Badge>

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            REPLACE FILE
        ================================================== */}

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
                <RefreshCw size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Dosyayı Değiştir
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  İsteğe bağlı — yeni PDF, Word, Excel, görsel, TXT veya UYAP UDF dosyası yükleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-4">

            {file ? (
              <div
                className="
                  flex
                  flex-col
                  gap-4
                  rounded-xl
                  border
                  border-emerald-200
                  bg-emerald-50/50
                  p-4
                  dark:border-emerald-500/20
                  dark:bg-emerald-500/[0.05]
                  sm:flex-row
                  sm:items-center
                "
              >

                <div
                  className="
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-white
                    text-2xl
                    dark:bg-white/[0.04]
                  "
                >
                  <FileText className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">

                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {file.name}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {formatFileSize(
                      file.size
                    )}
                  </p>

                  <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Kaydedildiğinde mevcut dosyanın yerine kullanılacak
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    handleRemoveNewFile
                  }
                  disabled={
                    updateMutation.isPending ||
                    deleteMutation.isPending
                  }
                  className="
                    inline-flex
                    h-9
                    items-center
                    justify-center
                    gap-1.5
                    rounded-lg
                    px-3
                    text-xs
                    font-medium
                    text-red-600
                    transition
                    hover:bg-red-50
                    disabled:opacity-50
                    dark:text-red-400
                    dark:hover:bg-red-500/[0.08]
                  "
                >
                  <X className="h-4 w-4" />

                  Seçimi Kaldır
                </button>

              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (
                    updateMutation.isPending ||
                    deleteMutation.isPending
                  ) {
                    return;
                  }

                  fileInputRef.current?.click();
                }}
                onKeyDown={(event) => {
                  if (
                    !updateMutation.isPending &&
                    !deleteMutation.isPending &&
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
                className="
                  cursor-pointer
                  rounded-xl
                  border-2
                  border-dashed
                  border-gray-200
                  p-8
                  text-center
                  transition
                  hover:border-blue-400
                  hover:bg-blue-50/40
                  dark:border-white/[0.08]
                  dark:hover:border-blue-500/40
                  dark:hover:bg-blue-500/[0.03]
                "
              >

                <UploadCloud className="mx-auto h-10 w-10 text-gray-300 dark:text-slate-600" />

                <p className="mt-3 text-sm font-medium text-gray-700 dark:text-slate-300">
                  Yeni dosya seçmek için tıklayın
                </p>

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  PDF, Word, Excel, görsel, TXT veya UYAP UDF · Maksimum 10 MB
                </p>

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
                updateMutation.isPending ||
                deleteMutation.isPending
              }
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt,.udf"
            />

            {fileError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {fileError}
              </p>
            )}

            <div
              className="
                flex
                items-start
                gap-2
                rounded-lg
                bg-amber-50
                p-3
                text-sm
                text-amber-900
                dark:bg-amber-500/[0.06]
                dark:text-amber-200
              "
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

              <p>
                Yeni dosya seçerseniz kaydetme sırasında mevcut şablon dosyası güncellenecektir.
                Dosya seçmezseniz mevcut dosya aynen korunur.
              </p>

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            SUMMARY
        ================================================== */}

        <div
          className="
            grid
            gap-3
            rounded-xl
            border
            border-gray-200
            bg-gray-50/50
            p-4
            dark:border-white/[0.07]
            dark:bg-white/[0.015]
            sm:grid-cols-3
          "
        >

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Kategori
            </p>

            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {getCategoryLabel(
                formData.category
              )}
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Hukuk Alanı
            </p>

            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {getLawAreaLabel(
                formData.law_area
              )}
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Dosya
            </p>

            <p
              className={`mt-1 text-sm font-medium ${
                file
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-700 dark:text-slate-300'
              }`}
            >
              {file
                ? 'Yeni dosya seçildi'
                : 'Mevcut dosya korunacak'}
            </p>

          </div>

        </div>

        {/* ==================================================
            ACTIONS
        ================================================== */}

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
            onClick={() =>
              handleAttemptLeave(
                `/templates/${id}`
              )
            }
            disabled={
              updateMutation.isPending
            }
          >
            İptal
          </Button>

          <Button
            type="submit"
            loading={
              updateMutation.isPending
            }
            disabled={
              updateMutation.isPending ||
              deleteMutation.isPending ||
              !isDirty
            }
          >
            <Save className="h-4 w-4" />

            Değişiklikleri Kaydet
          </Button>

        </div>

      </form>

      {/* ==================================================
          DANGER ZONE
      ================================================== */}

      {canDelete && (
        <Card className="border border-red-200 shadow-none dark:border-red-500/20">

          <Card.Body>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <Trash2 className="h-5 w-5 text-red-500" />

                  <h2 className="font-semibold text-red-600 dark:text-red-400">
                    Tehlikeli Bölge
                  </h2>

                </div>

                <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-slate-400">
                  Şablon kaydı normal şablon ekranlarından kaldırılacaktır. Devam etmeden önce doğru kaydı seçtiğinizden emin olun.
                </p>

              </div>

              <Button
                type="button"
                variant="danger"
                onClick={
                  handleDelete
                }
                loading={
                  deleteMutation.isPending
                }
                disabled={
                  updateMutation.isPending ||
                  deleteMutation.isPending
                }
              >
                <Trash2 className="h-4 w-4" />

                Şablonu Sil
              </Button>

            </div>

          </Card.Body>

        </Card>
      )}


      {leaveDialogOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Kaydedilmemiş değişiklik penceresini kapat"
            onClick={
              handleContinueEditing
            }
          />

          <div
            ref={
              leaveDialogRef
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-leave-dialog-title"
            aria-describedby="template-leave-dialog-description"
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
                    id="template-leave-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Değişiklikler kaydedilmedi
                  </h2>

                  <p
                    id="template-leave-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    Bu sayfadan ayrılırsanız şablonda yaptığınız kaydedilmemiş değişiklikler silinecek.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.07]">
                <p className="text-sm leading-6 text-amber-900 dark:text-amber-200">
                  Düzenlemeye devam edebilir veya değişiklikleri kaydetmeden şablon detayına dönebilirsiniz.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.015] sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={
                  handleContinueEditing
                }
              >
                Düzenlemeye Devam Et
              </Button>

              <Button
                type="button"
                variant="danger"
                onClick={
                  handleDiscardAndLeave
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
            aria-label="Silme penceresini kapat"
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-delete-dialog-title"
            aria-describedby="template-delete-dialog-description"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]"
          >
            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/[0.10] dark:text-red-400">
                  <Trash2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">

                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                    Şablon silme onayı
                  </p>

                  <h2
                    id="template-delete-dialog-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white"
                  >
                    Şablon kaydını sil
                  </h2>

                  <p
                    id="template-delete-dialog-description"
                    className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400"
                  >
                    <span className="font-medium text-gray-700 dark:text-slate-200">
                      {template?.title ||
                        'Seçili şablon'}
                    </span>{' '}
                    için bu işlemi onaylayın.
                  </p>

                </div>

              </div>

            </div>

            <div className="space-y-4 px-6 py-5">

              <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-500/20 dark:bg-red-500/[0.07]">

                <div className="flex items-start gap-3">

                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

                  <div>

                    <p className="text-sm font-semibold text-red-950 dark:text-red-200">
                      Şablon kaydı silinecek
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-900/80 dark:text-red-200/80">
                      Bu işlem tamamlandığında şablon artık sistemde kullanılamaz.
                    </p>

                  </div>

                </div>

              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.07] dark:bg-white/[0.025]">

                <p className="text-sm leading-6 text-gray-600 dark:text-slate-300">
                  Devam etmeden önce doğru şablonu seçtiğinizden ve silme işlemini gerçekten yapmak istediğinizden emin olun.
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

                Şablonu Sil
              </Button>

            </div>

          </div>

        </div>
      )}


    </div>
  );
};

export default TemplateEdit;