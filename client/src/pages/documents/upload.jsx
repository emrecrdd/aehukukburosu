import {
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
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  useUploadDocument,
  useUploadDocuments,
} from '../../features/documents/document.query.js';

import caseApi from '../../features/cases/case.api.js';
import clientApi from '../../features/clients/client.api.js';

import {
  powerOfAttorneyApi,
} from '../../features/power-of-attorney/powerOfAttorney.api.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  File,
  FilePlus2,
  FileText,
  FolderOpen,
  Link2,
  Plus,
  ShieldCheck,
  Tag,
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

const ALLOWED_EXTENSIONS = [
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
  '.mp4',
  '.webm',
  '.udf',
];

const CATEGORY_OPTIONS = [
  {
    value: 'general',
    label: 'Genel',
  },
  {
    value: 'petition',
    label: 'Dilekçe',
  },
  {
    value: 'expert_report',
    label: 'Bilirkişi Raporu',
  },
  {
    value: 'court_decision',
    label: 'Mahkeme Kararı',
  },
  {
    value: 'notification',
    label: 'Tebligat',
  },
  {
    value: 'evidence',
    label: 'Delil',
  },
  {
    value: 'correspondence',
    label: 'Yazışma',
  },
  {
    value: 'other',
    label: 'Diğer',
  },
];

// ======================================================
// HELPERS
// ======================================================

const getExtension = (
  filename
) => {
  const value =
    filename || '';

  const index =
    value.lastIndexOf('.');

  if (
    index < 0
  ) {
    return '';
  }

  return value
    .slice(index)
    .toLowerCase();
};

const getFileIcon = (
  file
) => {
  const extension =
    getExtension(
      file?.name
    );

  if (
    extension === '.udf'
  ) {
    return '📑';
  }

  const type =
    file?.type || '';

  if (
    type.includes('pdf')
  ) {
    return '📄';
  }

  if (
    type.includes('word') ||
    type.includes('document')
  ) {
    return '📝';
  }

  if (
    type.includes('excel') ||
    type.includes('sheet')
  ) {
    return '📊';
  }

  if (
    type.includes('image')
  ) {
    return '🖼️';
  }

  if (
    type.includes('video')
  ) {
    return '🎬';
  }

  return '📎';
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

const normalizeTags = (
  value
) => {
  if (!value) {
    return [];
  }

  return [
    ...new Set(
      value
        .split(',')
        .map((tag) =>
          tag.trim()
        )
        .filter(Boolean)
    ),
  ];
};

const removeExtension = (
  filename
) => {
  return (
    filename?.replace(
      /\.[^/.]+$/,
      ''
    ) || ''
  );
};

const getCategoryLabel = (
  category
) => {
  return (
    CATEGORY_OPTIONS.find(
      (item) =>
        item.value ===
        category
    )?.label ||
    'Genel'
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

const getArrayPayload = (
  response
) => {
  const payload =
    response?.data?.data ??
    response?.data ??
    response ??
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
      payload?.items
    )
  ) {
    return payload.items;
  }

  if (
    Array.isArray(
      payload?.results
    )
  ) {
    return payload.results;
  }

  return [];
};


const getCaseDisplayName = (
  caseItem
) => {
  if (
    !caseItem
  ) {
    return 'Dava';
  }

  const courtName =
    String(
      caseItem.court_name ||
      ''
    ).trim();

  const caseNumber =
    String(
      caseItem.case_number ||
      ''
    ).trim();

  if (
    courtName &&
    caseNumber
  ) {
    return `${courtName} · ${caseNumber}`;
  }

  return (
    courtName ||
    caseNumber ||
    caseItem.title ||
    'Dava'
  );
};

const getCaseSecondaryInfo = (
  caseItem
) => {
  if (
    !caseItem
  ) {
    return '';
  }

  return [
    caseItem.judiciary_type,
    caseItem.judiciary_unit,
  ]
    .filter(Boolean)
    .join(' · ');
};

// ======================================================
// COMPONENT
// ======================================================

const DocumentUpload = () => {
  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const [
    searchParams,
  ] =
    useSearchParams();

  const fileInputRef =
    useRef(null);

  /*
   * Danışmanlık detayından belge yüklemeye gelindiyse danışmanlık
   * bağlamı birincil ilişkidir. Eski linklerde aynı anda `client`
   * parametresi de bulunabildiği için onu otomatik seçmiyoruz; aksi
   * halde belge danışmanlığa değil yalnızca müvekkile bağlanıyordu.
   */
  const consultationIdFromQuery =
    normalizeId(
      searchParams.get(
        'consultation_id'
      )
    );

  const [
    formData,
    setFormData,
  ] =
    useState({
      name: '',
      description: '',
      category: 'general',
      tags: '',

      consultation_id:
        consultationIdFromQuery,

      case_id:
        normalizeId(
          searchParams.get(
            'case'
          )
        ),

      client_id:
        consultationIdFromQuery
          ? ''
          : normalizeId(
              searchParams.get(
                'client'
              )
            ),

      power_of_attorney_id:
        normalizeId(
          searchParams.get(
            'power_of_attorney_id'
          )
        ),

      is_public: false,
    });

  const [
    files,
    setFiles,
  ] =
    useState([]);

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

  // ======================================================
  // RELATED DATA
  // ======================================================

  const {
    data:
      clientsData,
    isLoading:
      clientsLoading,
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

      staleTime:
        5 * 60 * 1000,
    });

  const {
    data:
      casesData,
    isLoading:
      casesLoading,
  } =
    useQuery({
      queryKey: [
        'cases',
        {
          limit: 100,
        },
      ],

      queryFn: () =>
        caseApi.getAll({
          limit: 100,
        }),

      staleTime:
        5 * 60 * 1000,
    });

  const {
    data:
      clientCasesData,
    isLoading:
      clientCasesLoading,
  } =
    useQuery({
      queryKey: [
        'clients',
        formData.client_id,
        'cases',
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

  const {
    data:
      poaData,
    isLoading:
      poaLoading,
  } =
    useQuery({
      queryKey: [
        'powerOfAttorneys',
        {
          limit: 100,
        },
      ],

      queryFn: () =>
        powerOfAttorneyApi.getAll({
          limit: 100,
        }),

      staleTime:
        5 * 60 * 1000,
    });

  // ======================================================
  // MUTATIONS
  // ======================================================

  const uploadDocumentMutation =
    useUploadDocument();

  const uploadDocumentsMutation =
    useUploadDocuments();

  const isUploading =
    uploadDocumentMutation.isPending ||
    uploadDocumentsMutation.isPending;

  // ======================================================
  // DATA
  // ======================================================

  const cases =
    getArrayPayload(
      casesData
    );

  const clients =
    getArrayPayload(
      clientsData
    );

  const clientCases =
    useMemo(() => {
      const payload =
        clientCasesData?.data?.data ??
        clientCasesData?.data ??
        clientCasesData ??
        [];

      if (
        Array.isArray(
          payload?.cases
        )
      ) {
        return payload.cases;
      }

      return getArrayPayload(
        payload
      );
    }, [
      clientCasesData,
    ]);

  const relationCases =
    formData.client_id
      ? clientCases
      : cases;

  const relationCasesLoading =
    formData.client_id
      ? clientCasesLoading
      : casesLoading;

  const powerOfAttorneys =
    useMemo(() => {
      const raw =
        getArrayPayload(
          poaData
        );

      if (
        !formData.client_id
      ) {
        return raw;
      }

      return raw.filter(
        (
          poa
        ) =>
          normalizeId(
            poa?.client_id ??
            poa?.client?.id
          ) ===
          normalizeId(
            formData.client_id
          )
      );
    }, [
      poaData,
      formData.client_id,
    ]);

  // ======================================================
  // DERIVED
  // ======================================================

  const totalFileSize =
    useMemo(() => {
      return files.reduce(
        (
          total,
          file
        ) =>
          total +
          (
            Number(
              file.size
            ) || 0
          ),
        0
      );
    }, [
      files,
    ]);

  const tagsPreview =
    useMemo(() => {
      return normalizeTags(
        formData.tags
      );
    }, [
      formData.tags,
    ]);

  const selectedClient =
    useMemo(() => {
      return clients.find(
        (
          client
        ) =>
          normalizeId(
            client.id
          ) ===
          normalizeId(
            formData.client_id
          )
      );
    }, [
      clients,
      formData.client_id,
    ]);

  const selectedCase =
    useMemo(() => {
      return relationCases.find(
        (
          caseItem
        ) =>
          normalizeId(
            caseItem.id
          ) ===
          normalizeId(
            formData.case_id
          )
      );
    }, [
      relationCases,
      formData.case_id,
    ]);

  const selectedPowerOfAttorney =
    useMemo(() => {
      return powerOfAttorneys.find(
        (
          poa
        ) =>
          normalizeId(
            poa.id
          ) ===
          normalizeId(
            formData.power_of_attorney_id
          )
      );
    }, [
      powerOfAttorneys,
      formData.power_of_attorney_id,
    ]);

  // ======================================================
  // HANDLERS
  // ======================================================

  const handleChange =
    (
      event
    ) => {
      if (
        isUploading
      ) {
        return;
      }

      const {
        name,
        value,
        type,
        checked,
      } =
        event.target;

      const nextValue =
        type ===
        'checkbox'
          ? checked
          : [
              'client_id',
              'case_id',
              'power_of_attorney_id',
            ].includes(
              name
            )
            ? normalizeId(
                value
              )
            : value;

      setFormData(
        (
          current
        ) => {
          /*
           * Müvekkil değişirse önceki dava ve
           * vekalet ilişkisi geçersiz olabilir.
           */
          if (
            name ===
            'client_id'
          ) {
            return {
              ...current,
              client_id:
                nextValue,
              case_id:
                '',
              power_of_attorney_id:
                '',
            };
          }

          return {
            ...current,
            [name]:
              nextValue,
          };
        }
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
  // FILE VALIDATION
  // ======================================================

  const validateFiles =
    (
      selectedFiles
    ) => {
      const validFiles =
        [];

      for (
        const file of
        selectedFiles
      ) {
        if (
          !file ||
          Number(
            file.size
          ) <= 0
        ) {
          toast.error(
            `${file?.name || 'Dosya'}: boş dosya yüklenemez`
          );

          continue;
        }

        if (
          file.size >
          MAX_FILE_SIZE
        ) {
          toast.error(
            `${file.name}: dosya boyutu 10 MB sınırını aşıyor`
          );

          continue;
        }

        const extension =
          getExtension(
            file.name
          );

        if (
          !ALLOWED_EXTENSIONS.includes(
            extension
          )
        ) {
          toast.error(
            `${file.name}: desteklenmeyen dosya türü`
          );

          continue;
        }

        validFiles.push(
          file
        );
      }

      return validFiles;
    };

  // ======================================================
  // ADD FILES
  // ======================================================

  const addFiles =
    (
      selectedFiles
    ) => {
      if (
        isUploading
      ) {
        return;
      }

      const validFiles =
        validateFiles(
          selectedFiles
        );

      if (
        validFiles.length ===
        0
      ) {
        return;
      }

      const existingSignatures =
        new Set(
          files.map(
            (
              file
            ) =>
              `${file.name}-${file.size}-${file.lastModified}`
          )
        );

      const incomingSignatures =
        new Set();

      const uniqueNewFiles =
        validFiles.filter(
          (
            file
          ) => {
            const signature =
              `${file.name}-${file.size}-${file.lastModified}`;

            if (
              existingSignatures.has(
                signature
              ) ||
              incomingSignatures.has(
                signature
              )
            ) {
              return false;
            }

            incomingSignatures.add(
              signature
            );

            return true;
          }
        );

      if (
        uniqueNewFiles.length ===
        0
      ) {
        toast(
          'Seçilen dosyalar zaten listede'
        );

        return;
      }

      const shouldAutofillName =
        files.length ===
          0 &&
        uniqueNewFiles.length ===
          1 &&
        !formData.name.trim();

      setFiles(
        (
          current
        ) => [
          ...current,
          ...uniqueNewFiles,
        ]
      );

      if (
        shouldAutofillName
      ) {
        setFormData(
          (
            current
          ) => ({
            ...current,

            name:
              removeExtension(
                uniqueNewFiles[0]
                  .name
              ),
          })
        );
      }
    };

  const handleFileChange =
    (
      event
    ) => {
      addFiles(
        Array.from(
          event.target.files ||
            []
        )
      );

      event.target.value =
        '';
    };

  const removeFile =
    (
      index
    ) => {
      if (
        isUploading
      ) {
        return;
      }

      setFiles(
        (
          current
        ) =>
          current.filter(
            (
              _file,
              currentIndex
            ) =>
              currentIndex !==
              index
          )
      );
    };

  const clearFiles =
    () => {
      if (
        isUploading
      ) {
        return;
      }

      setFiles(
        []
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          '';
      }
    };

  // ======================================================
  // DRAG DROP
  // ======================================================

  const handleDragEnter =
    (
      event
    ) => {
      event.preventDefault();
      event.stopPropagation();

      if (
        !isUploading
      ) {
        setIsDragging(
          true
        );
      }
    };

  const handleDragLeave =
    (
      event
    ) => {
      event.preventDefault();
      event.stopPropagation();

      setIsDragging(
        false
      );
    };

  const handleDragOver =
    (
      event
    ) => {
      event.preventDefault();
      event.stopPropagation();

      if (
        !isUploading
      ) {
        setIsDragging(
          true
        );
      }
    };

  const handleDrop =
    (
      event
    ) => {
      event.preventDefault();
      event.stopPropagation();

      setIsDragging(
        false
      );

      if (
        isUploading
      ) {
        return;
      }

      addFiles(
        Array.from(
          event.dataTransfer
            .files ||
            []
        )
      );
    };

  // ======================================================
  // FORM DATA BUILDERS
  // ======================================================

  const appendSharedMetadata =
    (
      payload
    ) => {
      payload.append(
        'description',
        formData.description.trim()
      );

      payload.append(
        'category',
        formData.category
      );

      payload.append(
        'tags',
        normalizeTags(
          formData.tags
        ).join(',')
      );

      if (
        normalizeId(
          formData.consultation_id
        )
      ) {
        payload.append(
          'consultation_id',
          normalizeId(
            formData.consultation_id
          )
        );
      }

      if (
        normalizeId(
          formData.case_id
        )
      ) {
        payload.append(
          'case_id',
          normalizeId(
            formData.case_id
          )
        );
      }

      if (
        normalizeId(
          formData.client_id
        )
      ) {
        payload.append(
          'client_id',
          normalizeId(
            formData.client_id
          )
        );
      }

      if (
        normalizeId(
          formData.power_of_attorney_id
        )
      ) {
        payload.append(
          'power_of_attorney_id',
          normalizeId(
            formData.power_of_attorney_id
          )
        );
      }

      payload.append(
        'is_public',
        String(
          Boolean(
            formData.is_public
          )
        )
      );
    };

  const createSingleUploadData =
    (
      file
    ) => {
      const payload =
        new FormData();

      payload.append(
        'file',
        file
      );

      payload.append(
        'name',
        formData.name.trim() ||
          removeExtension(
            file.name
          )
      );

      appendSharedMetadata(
        payload
      );

      return payload;
    };

  const createBulkUploadData =
    () => {
      const payload =
        new FormData();

      files.forEach(
        (
          file
        ) => {
          payload.append(
            'files',
            file
          );
        }
      );

      appendSharedMetadata(
        payload
      );

      return payload;
    };

  // ======================================================
  // CACHE REFRESH
  // ======================================================

  const refreshRelatedQueries =
    async () => {
      const consultationId =
        normalizeId(
          formData.consultation_id
        );

      const caseId =
        normalizeId(
          formData.case_id
        );

      const clientId =
        normalizeId(
          formData.client_id
        );

      const powerOfAttorneyId =
        normalizeId(
          formData.power_of_attorney_id
        );

      const promises = [
        // Belge listeleri merkezi hook tarafından da yenilenir;
        // ilişkili ekranları burada ayrıca garanti altına alıyoruz.
        queryClient.invalidateQueries({
          queryKey: [
            'case-documents',
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            'client-documents',
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            'powerOfAttorneys',
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            'dashboard-stats',
          ],
        }),
      ];

      if (
        consultationId
      ) {
        promises.push(
          queryClient.invalidateQueries({
            queryKey: [
              'consultation-documents',
              consultationId,
            ],
            exact: true,
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'consultation',
              consultationId,
            ],
            exact: true,
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'consultations',
            ],
          })
        );
      }

      if (
        caseId
      ) {
        promises.push(
          queryClient.invalidateQueries({
            queryKey: [
              'case',
              caseId,
            ],
          })
        );
      }

      if (
        clientId
      ) {
        promises.push(
          queryClient.invalidateQueries({
            queryKey: [
              'client',
              clientId,
            ],
          })
        );
      }

      if (
        powerOfAttorneyId
      ) {
        promises.push(
          queryClient.invalidateQueries({
            queryKey: [
              'powerOfAttorney',
              powerOfAttorneyId,
            ],
          })
        );
      }

      await Promise.all(
        promises
      );
    };

  // ======================================================
  // REDIRECT
  // ======================================================

  const redirectAfterUpload =
    () => {
      const consultationId =
        normalizeId(
          formData.consultation_id
        );

      const caseId =
        normalizeId(
          formData.case_id
        );

      const clientId =
        normalizeId(
          formData.client_id
        );

      if (
        consultationId
      ) {
        navigate(
          `/consultations/${consultationId}`
        );

        return;
      }

      if (
        caseId
      ) {
        navigate(
          `/cases/${caseId}`
        );

        return;
      }

      if (
        clientId
      ) {
        navigate(
          `/clients/${clientId}`
        );

        return;
      }

      navigate(
        '/documents'
      );
    };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit =
    (
      event
    ) => {
      event.preventDefault();

      if (
        isUploading
      ) {
        return;
      }

      if (
        files.length ===
        0
      ) {
        toast.error(
          'Lütfen en az bir dosya seçin'
        );

        return;
      }

      const nextErrors =
        {};

      const trimmedName =
        formData.name.trim();

      if (
        trimmedName.length >
        255
      ) {
        nextErrors.name =
          'Belge adı en fazla 255 karakter olabilir';
      }

      if (
        files.length ===
          1 &&
        !trimmedName &&
        !removeExtension(
          files[0]?.name
        ).trim()
      ) {
        nextErrors.name =
          'Belge adı belirlenemedi';
      }

      const caseId =
        normalizeId(
          formData.case_id
        );

      const clientId =
        normalizeId(
          formData.client_id
        );

      const poaId =
        normalizeId(
          formData.power_of_attorney_id
        );

      if (
        caseId &&
        !selectedCase
      ) {
        nextErrors.case_id =
          clientId
            ? 'Seçilen dava bu müvekkille ilişkili değil veya artık erişilemiyor'
            : 'Seçilen dava artık erişilemiyor';
      }

      if (
        poaId &&
        !selectedPowerOfAttorney
      ) {
        nextErrors.power_of_attorney_id =
          clientId
            ? 'Seçilen vekaletname bu müvekkille ilişkili değil veya artık erişilemiyor'
            : 'Seçilen vekaletname artık erişilemiyor';
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
        toast.error(
          'Belge bilgilerini ve ilişkili kayıtları kontrol edin'
        );

        return;
      }

      // SINGLE

      if (
        files.length ===
        1
      ) {
        uploadDocumentMutation.mutate(
          createSingleUploadData(
            files[0]
          ),
          {
            onSuccess:
              async () => {
                await refreshRelatedQueries();

                redirectAfterUpload();
              },
          }
        );

        return;
      }

      // MULTIPLE

      uploadDocumentsMutation.mutate(
        createBulkUploadData(),
        {
          onSuccess:
            async () => {
              await refreshRelatedQueries();

              redirectAfterUpload();
            },
        }
      );
    };

  // ======================================================
  // CANCEL
  // ======================================================

  const handleCancel =
    () => {
      if (
        isUploading
      ) {
        return;
      }

      const consultationId =
        normalizeId(
          formData.consultation_id
        );

      const caseId =
        normalizeId(
          formData.case_id
        );

      const clientId =
        normalizeId(
          formData.client_id
        );

      if (
        consultationId
      ) {
        navigate(
          `/consultations/${consultationId}`
        );

        return;
      }

      if (
        caseId
      ) {
        navigate(
          `/cases/${caseId}`
        );

        return;
      }

      if (
        clientId
      ) {
        navigate(
          `/clients/${clientId}`
        );

        return;
      }

      navigate(
        '/documents'
      );
    };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to={
            formData.consultation_id
              ? `/consultations/${normalizeId(
                  formData.consultation_id
                )}`
              : formData.case_id
                ? `/cases/${normalizeId(
                    formData.case_id
                  )}`
                : formData.client_id
                  ? `/clients/${normalizeId(
                      formData.client_id
                    )}`
                  : '/documents'
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

          {formData.consultation_id
            ? 'Danışmanlığa Dön'
            : formData.case_id
              ? 'Davaya Dön'
              : formData.client_id
                ? 'Müvekkile Dön'
                : 'Belgeler'}
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
            <FilePlus2 size={21} />
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
              Belge Yükle
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
              Dosyaları sisteme ekleyin, ilişkili dava veya müvekkili belirleyin ve erişim kapsamını yönetin.
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
            FILES
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
                <UploadCloud size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Dosyalar
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Tek veya birden fazla dosyayı aynı işlemde yükleyebilirsiniz
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            {/* DROP AREA */}

            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                if (
                  !isUploading
                ) {
                  fileInputRef.current?.click();
                }
              }}
              onKeyDown={(
                event
              ) => {
                if (
                  !isUploading &&
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
              onDragEnter={
                handleDragEnter
              }
              onDragLeave={
                handleDragLeave
              }
              onDragOver={
                handleDragOver
              }
              onDrop={
                handleDrop
              }
              className={`
                rounded-xl
                border-2
                border-dashed
                transition
                ${
                  isUploading
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer'
                }
                ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/[0.05]'
                    : files.length > 0
                      ? 'border-gray-200 bg-gray-50/50 hover:border-blue-400 dark:border-white/[0.08] dark:bg-white/[0.015]'
                      : 'border-gray-200 bg-gray-50/50 hover:border-blue-400 hover:bg-blue-50/30 dark:border-white/[0.08] dark:bg-white/[0.015] dark:hover:border-blue-500/40'
                }
              `}
            >

              {files.length ===
              0 ? (
                <div className="px-6 py-10 text-center">

                  <div
                    className="
                      mx-auto
                      flex
                      h-14
                      w-14
                      items-center
                      justify-center
                      rounded-2xl
                      bg-blue-50
                      text-blue-600
                      dark:bg-blue-500/[0.08]
                      dark:text-blue-400
                    "
                  >
                    <UploadCloud size={25} />
                  </div>

                  <p className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Dosyaları buraya sürükleyin
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
                      Video
                    </Badge>

                    <Badge variant="info">
                      UDF
                    </Badge>

                    <Badge variant="default">
                      Maks. 10 MB / dosya
                    </Badge>

                  </div>

                </div>
              ) : (
                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-center gap-3">

                    <div
                      className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-emerald-50
                        text-emerald-600
                        dark:bg-emerald-500/[0.08]
                        dark:text-emerald-400
                      "
                    >
                      <CheckCircle2 size={19} />
                    </div>

                    <div>

                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {files.length} dosya hazır
                      </p>

                      <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-500">
                        Toplam {formatFileSize(
                          totalFileSize
                        )}
                      </p>

                    </div>

                  </div>

                  {!isUploading && (
                    <div className="flex items-center gap-2">

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(
                          event
                        ) => {
                          event.stopPropagation();

                          fileInputRef.current?.click();
                        }}
                      >
                        <Plus className="h-4 w-4" />

                        Dosya Ekle
                      </Button>

                    </div>
                  )}

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
                  isUploading
                }
                multiple
                accept={ALLOWED_EXTENSIONS.join(
                  ','
                )}
              />

            </div>

            {/* FILE LIST */}

            {files.length >
              0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.05]">

                <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

                  {files.map(
                    (
                      file,
                      index
                    ) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className="
                          flex
                          items-center
                          justify-between
                          gap-3
                          bg-white
                          px-4
                          py-3
                          transition
                          hover:bg-gray-50/70
                          dark:bg-transparent
                          dark:hover:bg-white/[0.02]
                        "
                      >

                        <div className="flex min-w-0 flex-1 items-center gap-3">

                          <div
                            className="
                              flex
                              h-9
                              w-9
                              shrink-0
                              items-center
                              justify-center
                              rounded-lg
                              bg-gray-100
                              text-lg
                              dark:bg-white/[0.04]
                            "
                          >
                            {getFileIcon(
                              file
                            )}
                          </div>

                          <div className="min-w-0">

                            <p
                              className="truncate text-sm font-medium text-gray-900 dark:text-white"
                              title={
                                file.name
                              }
                            >
                              {file.name}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-slate-500">

                              <span>
                                {formatFileSize(
                                  file.size
                                )}
                              </span>

                              <span>
                                ·
                              </span>

                              <span className="uppercase">
                                {getExtension(
                                  file.name
                                )
                                  .replace(
                                    '.',
                                    ''
                                  ) ||
                                  'dosya'}
                              </span>

                              {getExtension(
                                file.name
                              ) === '.udf' && (
                                <Badge variant="info">
                                  UYAP UDF
                                </Badge>
                              )}

                            </div>

                          </div>

                        </div>

                        <button
                          type="button"
                          disabled={
                            isUploading
                          }
                          onClick={() =>
                            removeFile(
                              index
                            )
                          }
                          className="
                            inline-flex
                            h-8
                            w-8
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            text-gray-400
                            transition
                            hover:bg-red-50
                            hover:text-red-600
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                            dark:hover:bg-red-500/[0.08]
                            dark:hover:text-red-400
                          "
                          aria-label={`${file.name} dosyasını kaldır`}
                          title="Dosyayı kaldır"
                        >
                          <X className="h-4 w-4" />
                        </button>

                      </div>
                    )
                  )}

                </div>

              </div>
            )}

          </Card.Body>

        </Card>

        {/* ==================================================
            DOCUMENT INFO
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
                  Belge Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Belgenin adı, kategorisi, etiketleri ve açıklaması
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            {/* NAME - ONLY SINGLE */}

            {files.length <=
              1 && (
              <Input
                label="Belge Adı"
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
                  isUploading
                }
                placeholder="Boş bırakılırsa dosya adı kullanılır"
              />
            )}

            {files.length >
              1 && (
              <div
                className="
                  flex
                  items-start
                  gap-3
                  rounded-lg
                  border
                  border-blue-100
                  bg-blue-50/60
                  px-3
                  py-3
                  text-sm
                  text-blue-700
                  dark:border-blue-500/10
                  dark:bg-blue-500/[0.035]
                  dark:text-blue-300
                "
              >
                <File className="mt-0.5 h-4 w-4 shrink-0" />

                Çoklu yüklemede her belge kendi dosya adıyla kaydedilir.
              </div>
            )}

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
                  isUploading
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

                {CATEGORY_OPTIONS.map(
                  (
                    category
                  ) => (
                    <option
                      key={
                        category.value
                      }
                      value={
                        category.value
                      }
                    >
                      {category.label}
                    </option>
                  )
                )}

              </select>

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
                  isUploading
                }
                placeholder="acil, ceza, bilirkişi, önemli"
                icon={
                  <Tag size={15} />
                }
              />

              <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
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
                        variant="primary"
                      >
                        #{tag}
                      </Badge>
                    )
                  )}

                </div>
              )}

            </div>

            {/* DESCRIPTION */}

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
                  isUploading
                }
                rows={4}
                placeholder="Belgenin içeriği, amacı veya önemi hakkında kısa açıklama..."
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
                  disabled:opacity-50
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                  dark:placeholder:text-slate-500
                "
              />

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            RELATIONS
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
                <Link2 size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  İlişkili Kayıtlar
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  {formData.consultation_id
                    ? 'Belge bu danışmanlığa bağlanacaktır; diğer ilişkiler isteğe bağlıdır'
                    : 'Belgeyi müvekkil, dava veya vekaletname kaydıyla ilişkilendirin'}
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-4">

            {formData.consultation_id && (
              <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-500/10 dark:bg-blue-500/[0.035]">
                <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />

                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                    Danışmanlık bağlantısı aktif
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-700 dark:text-blue-300">
                    Yüklenecek belge danışmanlık kaydına bağlanacak ve işlem tamamlandığında danışmanlık detayına geri dönülecek.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">

              {/* CLIENT */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Müvekkil
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
                    isUploading
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
                    {clientsLoading
                      ? 'Müvekkiller yükleniyor...'
                      : 'İlişki yok'}
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
                          normalizeId(
                            client.id
                          )
                        }
                      >
                        {client.name}
                        {client.company_name
                          ? ` · ${client.company_name}`
                          : ''}
                      </option>
                    )
                  )}

                </select>

                {errors.client_id && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {errors.client_id}
                  </p>
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

                    <UserRound
                      size={15}
                      className="shrink-0 text-gray-400"
                    />

                    <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                      {selectedClient.name}
                    </p>

                  </div>
                )}

              </div>

              {/* CASE */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Dava
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
                    relationCasesLoading ||
                    isUploading
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
                    {relationCasesLoading
                      ? 'Davalar yükleniyor...'
                      : relationCases.length >
                          0
                        ? 'İlişki yok'
                        : formData.client_id
                          ? 'Bu müvekkile ait dava bulunamadı'
                          : 'Dava bulunamadı'}
                  </option>

                  {relationCases.map(
                    (
                      caseItem
                    ) => (
                      <option
                        key={
                          caseItem.id
                        }
                        value={
                          normalizeId(
                            caseItem.id
                          )
                        }
                      >
                        {getCaseDisplayName(
                          caseItem
                        )}
                      </option>
                    )
                  )}

                </select>

                {errors.case_id && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {errors.case_id}
                  </p>
                )}

                {!formData.client_id && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                    Müvekkil seçmeden de doğrudan bir dava ile ilişkilendirebilirsiniz.
                  </p>
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

                    <FolderOpen
                      size={15}
                      className="shrink-0 text-gray-400"
                    />

                    <div className="min-w-0">

                      <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                        {getCaseDisplayName(
                          selectedCase
                        )}
                      </p>

                      {getCaseSecondaryInfo(
                        selectedCase
                      ) && (
                        <p className="mt-0.5 text-[10px] text-gray-400 dark:text-slate-500">
                          {getCaseSecondaryInfo(
                            selectedCase
                          )}
                        </p>
                      )}

                    </div>

                  </div>
                )}

              </div>

            </div>

            {/* POA */}

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Vekaletname
              </label>

              <select
                name="power_of_attorney_id"
                value={
                  formData.power_of_attorney_id
                }
                onChange={
                  handleChange
                }
                disabled={
                  poaLoading ||
                  isUploading
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
                  {poaLoading
                    ? 'Vekaletnameler yükleniyor...'
                    : powerOfAttorneys.length >
                        0
                      ? 'İlişki yok'
                      : formData.client_id
                        ? 'Bu müvekkile ait vekaletname bulunamadı'
                        : 'Vekaletname bulunamadı'}
                </option>

                {powerOfAttorneys.map(
                  (
                    poa
                  ) => (
                    <option
                      key={
                        poa.id
                      }
                      value={
                        normalizeId(
                          poa.id
                        )
                      }
                    >
                      {poa.title ||
                        'Başlıksız Vekaletname'}

                      {poa.client?.name
                        ? ` · ${poa.client.name}`
                        : ''}
                    </option>
                  )
                )}

              </select>

              {errors.power_of_attorney_id && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.power_of_attorney_id}
                </p>
              )}

              {!formData.client_id && (
                <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                  Müvekkil seçmeden de doğrudan bir vekaletname ile ilişkilendirebilirsiniz.
                </p>
              )}

              {selectedPowerOfAttorney && (
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
                    className="shrink-0 text-gray-400"
                  />

                  <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                    {selectedPowerOfAttorney.title ||
                      'Başlıksız Vekaletname'}
                  </p>

                </div>
              )}

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            ACCESS
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
                <ShieldCheck size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Erişim
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Büro içindeki görünürlük kapsamını belirleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <label
              htmlFor="document-general-access"
              className="
                flex
                cursor-pointer
                items-start
                gap-3
                rounded-xl
                border
                border-gray-100
                bg-gray-50/60
                p-4
                transition
                hover:border-blue-200
                dark:border-white/[0.05]
                dark:bg-white/[0.02]
              "
            >

              <input
                id="document-general-access"
                type="checkbox"
                name="is_public"
                checked={
                  formData.is_public
                }
                onChange={
                  handleChange
                }
                disabled={
                  isUploading
                }
                className="
                  mt-0.5
                  h-4
                  w-4
                  rounded
                  border-gray-300
                  text-blue-600
                  focus:ring-blue-500
                "
              />

              <div>

                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Büro içi genel erişim
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-500">
                  Etkin olduğunda belge, sistemde bu belgeyi görüntüleme yetkisine sahip diğer kullanıcılar tarafından erişilebilir olur. İnternet üzerinde herkese açık hale gelmez.
                </p>

              </div>

            </label>

          </Card.Body>

        </Card>

        {/* ==================================================
            SUMMARY
        ================================================== */}

        {files.length >
          0 && (
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
              sm:grid-cols-4
            "
          >

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
                Dosya
              </p>

              <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
                {files.length} adet
              </p>

            </div>

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
                Boyut
              </p>

              <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
                {formatFileSize(
                  totalFileSize
                )}
              </p>

            </div>

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
                Kategori
              </p>

              <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
                {getCategoryLabel(
                  formData.category
                )}
              </p>

            </div>

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
                İlişki
              </p>

              <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
                {[
                  formData.client_id
                    ? 'Müvekkil'
                    : null,
                  formData.case_id
                    ? 'Dava'
                    : null,
                  formData.power_of_attorney_id
                    ? 'Vekaletname'
                    : null,
                ]
                  .filter(Boolean)
                  .join(' + ') ||
                  'Bağımsız'}
              </p>

            </div>

          </div>
        )}

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
            sm:justify-between
          "
        >

          <div>

            {files.length >
              0 && (
              <Button
                type="button"
                variant="ghost"
                disabled={
                  isUploading
                }
                onClick={
                  clearFiles
                }
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />

                Dosyaları Temizle
              </Button>
            )}

          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">

            <Button
              type="button"
              variant="secondary"
              disabled={
                isUploading
              }
              onClick={
                handleCancel
              }
            >
              Vazgeç
            </Button>

            <Button
              type="submit"
              loading={
                isUploading
              }
              disabled={
                files.length ===
                  0 ||
                isUploading
              }
            >
              <UploadCloud className="h-4 w-4" />

              {files.length ===
              0
                ? 'Dosya Seçin'
                : files.length ===
                    1
                  ? 'Belgeyi Yükle'
                  : `${files.length} Belgeyi Yükle`}
            </Button>

          </div>

        </div>

      </form>

    </div>
  );
};

export default DocumentUpload;