/**
 * OpenAI Structured Outputs şemaları.
 *
 * Kurallar:
 * - Her object içinde additionalProperties: false bulunur.
 * - Strict schema uyumluluğu için bütün property alanları required listesine eklenir.
 * - Opsiyonel değerler null kabul edecek şekilde tanımlanır.
 * - Prompt veya iş mantığı bu dosyada tutulmaz.
 */

const nullableString = {
  anyOf: [
    { type: 'string' },
    { type: 'null' },
  ],
};

const nullableNumber = {
  anyOf: [
    { type: 'number' },
    { type: 'null' },
  ],
};

const stringArray = {
  type: 'array',
  items: {
    type: 'string',
  },
};

const sourceReferenceSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    pageNumber: {
      anyOf: [
        {
          type: 'integer',
          minimum: 1,
        },
        {
          type: 'null',
        },
      ],
    },
    section: nullableString,
    excerpt: {
      type: 'string',
      description:
        'Kaynak metinden kısa ve doğrudan ilgili bölüm. Gereksiz uzun alıntı yapılmaz.',
    },
  },
  required: [
    'pageNumber',
    'section',
    'excerpt',
  ],
};

const partySchema = {
  type: 'object',
  additionalProperties: false,

  properties: {
    name: {
      type: 'string',
    },

    entityType: {
      type: 'string',
      enum: [
        'kişi',
        'kurum',
        'şirket',
        'kamu_kurumu',
        'baro',
        'diğer',
        'belirsiz',
      ],
    },

    role: {
      type: 'string',
      enum: [
        // Hukuk
        'davacı',
        'davalı',
        'başvurucu',
        'karşı_taraf',

        // Ceza
        'müşteki',
        'şikayetçi',
        'mağdur',
        'maktul',
        'katılan',
        'sanık',
        'şüpheli',
        'hükümlü',

        // Temsil
        'vekil',
        'müdafi',
        'katılan_vekili',
        'müşteki_vekili',
        'sanık_müdafii',

        // Diğer
        'tanık',
        'bilirkişi',

        'diğer',
        'belirsiz',
      ],
    },

    identifier: nullableString,

    representative: nullableString,

    description: nullableString,
  },

  required: [
    'name',
    'entityType',
    'role',
    'identifier',
    'representative',
    'description',
  ],
};
const dateSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    date: {
      type: 'string',
      description:
        'Mümkünse ISO 8601 biçiminde YYYY-MM-DD. Belirsizse belgede geçtiği biçim.',
    },
    label: {
      type: 'string',
    },
    importance: {
      type: 'string',
      enum: [
        'low',
        'medium',
        'high',
        'critical',
      ],
    },
    deadline: {
      type: 'boolean',
    },
    explanation: nullableString,
    source: sourceReferenceSchema,
  },
  required: [
    'date',
    'label',
    'importance',
    'deadline',
    'explanation',
    'source',
  ],
};

const amountSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    amount: nullableNumber,
    currency: nullableString,
    originalText: {
      type: 'string',
    },
    description: nullableString,
    source: sourceReferenceSchema,
  },
  required: [
    'amount',
    'currency',
    'originalText',
    'description',
    'source',
  ],
};

const riskSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
    },
    level: {
      type: 'string',
      enum: [
        'low',
        'medium',
        'high',
        'critical',
      ],
    },
    category: {
      type: 'string',
      enum: [
        'procedural',
        'financial',
        'contractual',
        'evidentiary',
        'deadline',
        'compliance',
        'privacy',
        'enforcement',
        'other',
      ],
    },
    description: {
      type: 'string',
    },
    recommendation: {
      type: 'string',
    },
    source: sourceReferenceSchema,
  },
  required: [
    'title',
    'level',
    'category',
    'description',
    'recommendation',
    'source',
  ],
};

export const documentAnalysisSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    documentType: {
  type: 'string',
  enum: [
    'dava_dilekçesi',
    'cevap_dilekçesi',
    'savunma_dilekçesi',

    'istinaf_dilekçesi',
    'temyiz_dilekçesi',
    'itiraz_dilekçesi',

    'iddianame',
    'esas_hakkında_mütalaa',

    'mahkeme_kararı',
    'gerekçeli_karar',
    'ara_karar',
    'tensip_zaptı',
    'duruşma_tutanağı',

    'bilirkişi_raporu',
    'adli_tıp_raporu',
    'kriminal_rapor',

    'sözleşme',
    'ihtarname',
    'tebligat',
    'tutanak',
    'vekaletname',
    'delil',
    'yazışma',

    'icra_belgesi',
    'ceza_dosyası_belgesi',
    'idari_belge',

    'diğer',
    'belirsiz',
  ],
},

    title: nullableString,

    language: {
      type: 'string',
    },

    summary: {
      type: 'string',
      description:
        'Belgenin tarafsız, açık ve kısa özeti.',
    },

    caseType: nullableString,

    jurisdiction: nullableString,

    court: nullableString,

    caseNumber: nullableString,

    decisionNumber: nullableString,

    parties: {
      type: 'array',
      items: partySchema,
    },

    importantDates: {
      type: 'array',
      items: dateSchema,
    },

    amounts: {
      type: 'array',
      items: amountSchema,
    },

    claims: stringArray,

    defenses: stringArray,

    obligations: stringArray,

    evidence: stringArray,

    legalIssues: stringArray,

    referencedLaws: stringArray,

    risks: {
      type: 'array',
      items: riskSchema,
    },

    missingInformation: stringArray,

    recommendedActions: stringArray,

    overallRiskLevel: {
      type: 'string',
      enum: [
        'low',
        'medium',
        'high',
        'critical',
        'undetermined',
      ],
    },

    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },

    requiresHumanReview: {
      type: 'boolean',
    },

    reviewReasons: stringArray,

    warnings: stringArray,
  },

  required: [
    'documentType',
    'title',
    'language',
    'summary',
    'caseType',
    'jurisdiction',
    'court',
    'caseNumber',
    'decisionNumber',
    'parties',
    'importantDates',
    'amounts',
    'claims',
    'defenses',
    'obligations',
    'evidence',
    'legalIssues',
    'referencedLaws',
    'risks',
    'missingInformation',
    'recommendedActions',
    'overallRiskLevel',
    'confidence',
    'requiresHumanReview',
    'reviewReasons',
    'warnings',
  ],
};
export const caseQuestionSchema = {
  type: 'object',
  additionalProperties: false,

  properties: {
    question: {
      type: 'string',
    },

    shortAnswer: {
      type: 'string',
    },

    answer: {
      type: 'string',
    },

    keyFindings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          finding: {
            type: 'string',
          },

          importance: {
            type: 'string',
            enum: [
              'low',
              'medium',
              'high',
              'critical',
            ],
          },

          sourceType: {
            anyOf: [
              {
                type: 'string',
                enum: [
                  'case',
                  'document',
                  'task',
                  'event',
                  'meeting',
                  'note',
                ],
              },
              {
                type: 'null',
              },
            ],
          },

          sourceId: nullableString,
        },

        required: [
          'finding',
          'importance',
          'sourceType',
          'sourceId',
        ],
      },
    },

    sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          sourceType: {
            type: 'string',
            enum: [
              'case',
              'document',
              'task',
              'event',
              'meeting',
              'note',
            ],
          },

          sourceId: {
            type: 'string',
          },

          title: {
            type: 'string',
          },

          relevance: {
            type: 'string',
          },
        },

        required: [
          'sourceType',
          'sourceId',
          'title',
          'relevance',
        ],
      },
    },

    missingInformation: stringArray,

    suggestedActions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          title: {
            type: 'string',
          },

          description: nullableString,

          priority: {
            type: 'string',
            enum: [
              'low',
              'normal',
              'high',
              'critical',
            ],
          },

          sourceType: {
            anyOf: [
              {
                type: 'string',
                enum: [
                  'case',
                  'document',
                  'task',
                  'event',
                  'meeting',
                  'note',
                ],
              },
              {
                type: 'null',
              },
            ],
          },

          sourceId: nullableString,

          canCreateTask: {
            type: 'boolean',
          },
        },

        required: [
          'title',
          'description',
          'priority',
          'sourceType',
          'sourceId',
          'canCreateTask',
        ],
      },
    },

    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },

    requiresHumanReview: {
      type: 'boolean',
    },

    reviewReasons: stringArray,
  },

  required: [
    'question',
    'shortAnswer',
    'answer',
    'keyFindings',
    'sources',
    'missingInformation',
    'suggestedActions',
    'confidence',
    'requiresHumanReview',
    'reviewReasons',
  ],
};
export const hearingPreparationSchema = {
  type: 'object',
  additionalProperties: false,

  properties: {
    hearingId: nullableString,

    hearingTitle: nullableString,

    hearingDate: nullableString,

    shortBrief: {
      type: 'string',
      description:
        'Avukatın duruşma öncesinde dosyanın durumunu hızlıca anlayabileceği kısa özet.',
    },

    caseStatus: {
      type: 'string',
      description:
        'Dosyanın duruşma hazırlığı açısından mevcut durumunun kısa açıklaması.',
    },

    caseSummary: {
      type: 'string',
      description:
        'Dava kaydı ve analiz edilmiş belgeler üzerinden oluşturulan duruşma odaklı dosya özeti.',
    },

    partiesAndPositions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          partyName: {
            type: 'string',
          },

          role: nullableString,

          position: {
            type: 'string',
            description:
              'Yalnızca dosyada açıkça kayıtlı olan iddia, savunma veya taraf konumu.',
          },

          sourceType: {
            anyOf: [
              {
                type: 'string',
                enum: [
                  'case',
                  'document',
                  'task',
                  'event',
                  'meeting',
                  'note',
                ],
              },
              {
                type: 'null',
              },
            ],
          },

          sourceId: nullableString,
        },

        required: [
          'partyName',
          'role',
          'position',
          'sourceType',
          'sourceId',
        ],
      },
    },

    claimsAndDefenses: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          type: {
            type: 'string',
            enum: [
              'claim',
              'defense',
              'unknown',
            ],
          },

          statement: {
            type: 'string',
          },

          partyName: nullableString,

          sourceType: {
            anyOf: [
              {
                type: 'string',
                enum: [
                  'case',
                  'document',
                  'task',
                  'event',
                  'meeting',
                  'note',
                ],
              },
              {
                type: 'null',
              },
            ],
          },

          sourceId: nullableString,
        },

        required: [
          'type',
          'statement',
          'partyName',
          'sourceType',
          'sourceId',
        ],
      },
    },

    evidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          title: {
            type: 'string',
          },

          assessment: {
            type: 'string',
            description:
              'Delilin dosyadaki açık içeriğine göre kısa değerlendirmesi.',
          },

          importance: {
            type: 'string',
            enum: [
              'low',
              'medium',
              'high',
              'critical',
            ],
          },

          sourceType: {
            anyOf: [
              {
                type: 'string',
                enum: [
                  'case',
                  'document',
                  'task',
                  'event',
                  'meeting',
                  'note',
                ],
              },
              {
                type: 'null',
              },
            ],
          },

          sourceId: nullableString,
        },

        required: [
          'title',
          'assessment',
          'importance',
          'sourceType',
          'sourceId',
        ],
      },
    },

    hearingFocusPoints: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          point: {
            type: 'string',
          },

          reason: {
            type: 'string',
          },

          importance: {
            type: 'string',
            enum: [
              'low',
              'medium',
              'high',
              'critical',
            ],
          },

          sourceType: {
            anyOf: [
              {
                type: 'string',
                enum: [
                  'case',
                  'document',
                  'task',
                  'event',
                  'meeting',
                  'note',
                ],
              },
              {
                type: 'null',
              },
            ],
          },

          sourceId: nullableString,
        },

        required: [
          'point',
          'reason',
          'importance',
          'sourceType',
          'sourceId',
        ],
      },
    },

    missingInformation: stringArray,

    preparationChecklist: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          title: {
            type: 'string',
          },

          description: nullableString,

          priority: {
            type: 'string',
            enum: [
              'low',
              'normal',
              'high',
              'critical',
            ],
          },

          sourceType: {
            anyOf: [
              {
                type: 'string',
                enum: [
                  'case',
                  'document',
                  'task',
                  'event',
                  'meeting',
                  'note',
                ],
              },
              {
                type: 'null',
              },
            ],
          },

          sourceId: nullableString,

          canCreateTask: {
            type: 'boolean',
          },
        },

        required: [
          'title',
          'description',
          'priority',
          'sourceType',
          'sourceId',
          'canCreateTask',
        ],
      },
    },

    criticalDates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          date: {
            type: 'string',
          },

          title: {
            type: 'string',
          },

          description: nullableString,

          sourceType: {
            anyOf: [
              {
                type: 'string',
                enum: [
                  'case',
                  'document',
                  'task',
                  'event',
                  'meeting',
                  'note',
                ],
              },
              {
                type: 'null',
              },
            ],
          },

          sourceId: nullableString,
        },

        required: [
          'date',
          'title',
          'description',
          'sourceType',
          'sourceId',
        ],
      },
    },

    sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          sourceType: {
            type: 'string',
            enum: [
              'case',
              'document',
              'task',
              'event',
              'meeting',
              'note',
            ],
          },

          sourceId: {
            type: 'string',
          },

          title: {
            type: 'string',
          },

          relevance: {
            type: 'string',
          },
        },

        required: [
          'sourceType',
          'sourceId',
          'title',
          'relevance',
        ],
      },
    },

    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },

    requiresHumanReview: {
      type: 'boolean',
    },

    reviewReasons: stringArray,
  },

  required: [
    'hearingId',
    'hearingTitle',
    'hearingDate',
    'shortBrief',
    'caseStatus',
    'caseSummary',
    'partiesAndPositions',
    'claimsAndDefenses',
    'evidence',
    'hearingFocusPoints',
    'missingInformation',
    'preparationChecklist',
    'criticalDates',
    'sources',
    'confidence',
    'requiresHumanReview',
    'reviewReasons',
  ],
};
export const caseSummarySchema = {
  type: 'object',
  additionalProperties: false,

  properties: {
    title: {
      type: 'string',
    },

    overview: {
      type: 'string',
      description:
        'Dava dosyasının mevcut durumunu avukatın hızlıca anlayabileceği kısa ve tarafsız özet.',
    },

    caseType: nullableString,

    currentStatus: {
      type: 'string',
      description:
        'Dosyanın mevcut usuli ve operasyonel durumunun kısa açıklaması.',
    },

    /*
     * 0 = çok problemli / eksik
     * 100 = dosya organizasyonu ve hazırlığı güçlü
     *
     * Hukuki kazanma ihtimali değildir.
     */
    caseHealthScore: {
      type: 'integer',
      minimum: 0,
      maximum: 100,
      description:
        'Dosyanın bilgi bütünlüğü, hazırlık seviyesi, yaklaşan işler ve operasyonel durumuna göre 0-100 arası sağlık skoru. Davanın kazanılma olasılığı değildir.',
    },

    /*
     * 0 = düşük operasyonel/hukuki risk
     * 100 = yüksek risk
     */
    riskScore: {
      type: 'integer',
      minimum: 0,
      maximum: 100,
      description:
        'Mevcut kayıtlar ışığında süre, delil, usul ve diğer risklerin ağırlığını gösteren 0-100 arası risk skoru.',
    },

    overallRiskLevel: {
      type: 'string',
      enum: [
        'low',
        'medium',
        'high',
        'critical',
        'undetermined',
      ],
    },

    parties: {
      type: 'array',
      items: partySchema,
    },

    keyFacts: stringArray,

    legalIssues: stringArray,

    claims: stringArray,

    defenses: stringArray,

    evidenceSummary: stringArray,

    /*
     * Bilgi eksikliği ile delil eksikliğini ayırıyoruz.
     */
    missingInformation: stringArray,

    missingEvidence: stringArray,

    proceduralHistory: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          date: nullableString,

          event: {
            type: 'string',
          },

          sourceType: {
            type: 'string',
            enum: [
              'case',
              'task',
              'event',
              'meeting',
              'note',
              'document',
              'other',
            ],
          },

          importance: {
            type: 'string',
            enum: [
              'low',
              'medium',
              'high',
              'critical',
            ],
          },
        },

        required: [
          'date',
          'event',
          'sourceType',
          'importance',
        ],
      },
    },

    /*
     * Burada document schema'daki sourceReferenceSchema'yı
     * kullanmıyoruz. Çünkü Case AI kaynağı tek bir PDF değil;
     * task/event/meeting gibi veritabanı kayıtları olabilir.
     */
    importantDates: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          date: {
            type: 'string',
          },

          label: {
            type: 'string',
          },

          importance: {
            type: 'string',
            enum: [
              'low',
              'medium',
              'high',
              'critical',
            ],
          },

          deadline: {
            type: 'boolean',
          },

          sourceType: {
            type: 'string',
            enum: [
              'case',
              'task',
              'event',
              'meeting',
              'document',
              'other',
            ],
          },

          sourceId: nullableString,

          explanation: nullableString,
        },

        required: [
          'date',
          'label',
          'importance',
          'deadline',
          'sourceType',
          'sourceId',
          'explanation',
        ],
      },
    },

    upcomingDeadlines: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          date: {
            type: 'string',
          },

          label: {
            type: 'string',
          },

          importance: {
            type: 'string',
            enum: [
              'low',
              'medium',
              'high',
              'critical',
            ],
          },

          sourceType: {
            type: 'string',
            enum: [
              'task',
              'event',
              'meeting',
              'case',
              'other',
            ],
          },

          sourceId: nullableString,

          explanation: nullableString,
        },

        required: [
          'date',
          'label',
          'importance',
          'sourceType',
          'sourceId',
          'explanation',
        ],
      },
    },

    /*
     * Case AI risk'lerinde PDF sayfası gibi bir source yok.
     * Bu yüzden ayrı risk yapısı kullanıyoruz.
     */
    risks: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          title: {
            type: 'string',
          },

          level: {
            type: 'string',
            enum: [
              'low',
              'medium',
              'high',
              'critical',
            ],
          },

          category: {
            type: 'string',
            enum: [
              'procedural',
              'financial',
              'contractual',
              'evidentiary',
              'deadline',
              'compliance',
              'privacy',
              'enforcement',
              'operational',
              'other',
            ],
          },

          description: {
            type: 'string',
          },

          recommendation: {
            type: 'string',
          },

          sourceType: {
            type: 'string',
            enum: [
              'case',
              'task',
              'event',
              'meeting',
              'note',
              'document',
              'multiple',
              'other',
            ],
          },

          sourceId: nullableString,
        },

        required: [
          'title',
          'level',
          'category',
          'description',
          'recommendation',
          'sourceType',
          'sourceId',
        ],
      },
    },

    /*
     * Genel öneriler.
     */
    recommendedActions: stringArray,

    /*
     * UI'da direkt "Önerilen Sonraki İşler" olarak gösterilecek.
     */
    nextBestActions: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          title: {
            type: 'string',
          },

          description: nullableString,

          priority: {
            type: 'string',
            enum: [
              'low',
              'normal',
              'high',
              'critical',
            ],
          },

          suggestedDueDate: nullableString,

          relatedSourceType: {
            anyOf: [
              {
                type: 'string',
                enum: [
                  'case',
                  'task',
                  'event',
                  'meeting',
                  'document',
                  'note',
                ],
              },
              {
                type: 'null',
              },
            ],
          },

          relatedSourceId: nullableString,

          canCreateTask: {
            type: 'boolean',
          },
        },

        required: [
          'title',
          'description',
          'priority',
          'suggestedDueDate',
          'relatedSourceType',
          'relatedSourceId',
          'canCreateTask',
        ],
      },
    },

    strategicConsiderations: stringArray,

    /*
     * Dosyanın operasyonel iş yükü.
     */
    workloadSummary: {
      type: 'object',
      additionalProperties: false,

      properties: {
        openTaskCount: {
          type: 'integer',
          minimum: 0,
        },

        overdueTaskCount: {
          type: 'integer',
          minimum: 0,
        },

        upcomingEventCount: {
          type: 'integer',
          minimum: 0,
        },

        upcomingMeetingCount: {
          type: 'integer',
          minimum: 0,
        },

        urgency: {
          type: 'string',
          enum: [
            'low',
            'normal',
            'high',
            'critical',
          ],
        },

        summary: {
          type: 'string',
        },
      },

      required: [
        'openTaskCount',
        'overdueTaskCount',
        'upcomingEventCount',
        'upcomingMeetingCount',
        'urgency',
        'summary',
      ],
    },

    /*
     * Müvekkile verilebilecek operasyonel iletişim başlıkları.
     * Hukuki tavsiye olarak değil, iletişim önerisi olarak düşün.
     */
    clientCommunicationNotes: stringArray,

    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },

    requiresHumanReview: {
      type: 'boolean',
    },

    reviewReasons: stringArray,

    warnings: stringArray,
  },

  required: [
    'title',
    'overview',
    'caseType',
    'currentStatus',
    'caseHealthScore',
    'riskScore',
    'overallRiskLevel',
    'parties',
    'keyFacts',
    'legalIssues',
    'claims',
    'defenses',
    'evidenceSummary',
    'missingInformation',
    'missingEvidence',
    'proceduralHistory',
    'importantDates',
    'upcomingDeadlines',
    'risks',
    'recommendedActions',
    'nextBestActions',
    'strategicConsiderations',
    'workloadSummary',
    'clientCommunicationNotes',
    'confidence',
    'requiresHumanReview',
    'reviewReasons',
    'warnings',
  ],
};

export const entityExtractionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    persons: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
          },
          role: nullableString,
          identifier: nullableString,
        },
        required: [
          'name',
          'role',
          'identifier',
        ],
      },
    },

    organizations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
          },
          role: nullableString,
          identifier: nullableString,
        },
        required: [
          'name',
          'role',
          'identifier',
        ],
      },
    },

    dates: {
      type: 'array',
      items: dateSchema,
    },

    amounts: {
      type: 'array',
      items: amountSchema,
    },

    locations: stringArray,

    courts: stringArray,

    caseNumbers: stringArray,

    legalTerms: stringArray,

    referencedLaws: stringArray,

    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
  },

  required: [
    'persons',
    'organizations',
    'dates',
    'amounts',
    'locations',
    'courts',
    'caseNumbers',
    'legalTerms',
    'referencedLaws',
    'confidence',
  ],
};

export const legalResearchSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    question: {
      type: 'string',
    },

    shortAnswer: {
      type: 'string',
    },

    analysis: {
      type: 'string',
    },

    applicablePrinciples: stringArray,

    referencedLegislation: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
          },
          article: nullableString,
          relevance: {
            type: 'string',
          },
          verificationRequired: {
            type: 'boolean',
          },
        },
        required: [
          'name',
          'article',
          'relevance',
          'verificationRequired',
        ],
      },
    },

    factualAssumptions: stringArray,

    risks: {
      type: 'array',
      items: riskSchema,
    },

    recommendedActions: stringArray,

    missingInformation: stringArray,

    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },

    requiresLawyerReview: {
      type: 'boolean',
    },

    disclaimer: {
      type: 'string',
    },
  },

  required: [
    'question',
    'shortAnswer',
    'analysis',
    'applicablePrinciples',
    'referencedLegislation',
    'factualAssumptions',
    'risks',
    'recommendedActions',
    'missingInformation',
    'confidence',
    'requiresLawyerReview',
    'disclaimer',
  ],
};

export const documentClassificationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    category: {
      type: 'string',
      enum: [
        'petition',
        'court_decision',
        'interim_decision',
        'expert_report',
        'notification',
        'evidence',
        'correspondence',
        'contract',
        'notice',
        'power_of_attorney',
        'enforcement_document',
        'other',
        'unknown',
      ],
    },

    subcategory: nullableString,

    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },

    explanation: {
      type: 'string',
    },

    requiresHumanReview: {
      type: 'boolean',
    },
  },

  required: [
    'category',
    'subcategory',
    'confidence',
    'explanation',
    'requiresHumanReview',
  ],
};

export const draftGenerationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    documentType: {
      type: 'string',
      enum: [
        'petition',
        'contract',
        'notice',
      ],
    },

    title: {
      type: 'string',
    },

    draft: {
      type: 'string',
    },

    missingFields: stringArray,

    assumptions: stringArray,

    warnings: stringArray,

    requiresLawyerReview: {
      type: 'boolean',
    },
  },

  required: [
    'documentType',
    'title',
    'draft',
    'missingFields',
    'assumptions',
    'warnings',
    'requiresLawyerReview',
  ],
};
export const caseCompletionSchema = {
  type: 'object',
  additionalProperties: false,

  properties: {
    missingParties: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
          },

          entityType: {
            type: 'string',
            enum: [
              'kişi',
              'kurum',
              'şirket',
              'kamu_kurumu',
              'baro',
              'diğer',
              'belirsiz',
            ],
          },

          role: {
            type: 'string',
            enum: [
              'davacı',
              'davalı',
              'başvurucu',
              'karşı_taraf',

              'müşteki',
              'şikayetçi',
              'mağdur',
              'maktul',
              'katılan',
              'sanık',
              'şüpheli',
              'hükümlü',

              'vekil',
              'müdafi',
              'katılan_vekili',
              'müşteki_vekili',
              'sanık_müdafii',

              'tanık',
              'bilirkişi',

              'diğer',
              'belirsiz',
            ],
          },

          identifier: nullableString,
          representative: nullableString,
          description: nullableString,

          sourceDocumentId: nullableString,

          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
        },

        required: [
          'name',
          'entityType',
          'role',
          'identifier',
          'representative',
          'description',
          'sourceDocumentId',
          'confidence',
        ],
      },
    },

    partyConflicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          partyName: {
            type: 'string',
          },

          field: {
            type: 'string',
            enum: [
              'name',
              'entityType',
              'role',
              'identifier',
              'representative',
              'other',
            ],
          },

          currentValue: nullableString,
          suggestedValue: nullableString,

          explanation: {
            type: 'string',
          },

          sourceDocumentId: nullableString,

          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
        },

        required: [
          'partyName',
          'field',
          'currentValue',
          'suggestedValue',
          'explanation',
          'sourceDocumentId',
          'confidence',
        ],
      },
    },

    suggestedCaseUpdates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          field: {
  type: 'string',
  enum: [
    'title',
    'judiciary_type',
    'judiciary_unit',
    'opening_date',
    'court_name',
    'case_number',
    'subject',
    'description',
    'status',
    'priority',
    'other',
  ],
          },

          currentValue: nullableString,
          suggestedValue: nullableString,

          reason: {
            type: 'string',
          },

          sourceDocumentId: nullableString,

          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },

          requiresHumanConfirmation: {
            type: 'boolean',
          },
        },

        required: [
          'field',
          'currentValue',
          'suggestedValue',
          'reason',
          'sourceDocumentId',
          'confidence',
          'requiresHumanConfirmation',
        ],
      },
    },

    importantDateSuggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          date: {
            type: 'string',
          },

          label: {
            type: 'string',
          },

          importance: {
            type: 'string',
            enum: [
              'low',
              'medium',
              'high',
              'critical',
            ],
          },

          deadline: {
            type: 'boolean',
          },

          explanation: nullableString,

          sourceDocumentId: nullableString,

          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
        },

        required: [
          'date',
          'label',
          'importance',
          'deadline',
          'explanation',
          'sourceDocumentId',
          'confidence',
        ],
      },
    },

    warnings: stringArray,

    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },

    requiresHumanReview: {
      type: 'boolean',
    },

    reviewReasons: stringArray,
  },

  required: [
    'missingParties',
    'partyConflicts',
    'suggestedCaseUpdates',
    'importantDateSuggestions',
    'warnings',
    'confidence',
    'requiresHumanReview',
    'reviewReasons',
  ],
};
export const AI_SCHEMAS = Object.freeze({
  documentAnalysis: documentAnalysisSchema,
  caseSummary: caseSummarySchema,
  caseCompletion: caseCompletionSchema,
  caseQuestion: caseQuestionSchema,

  hearingPreparation: hearingPreparationSchema,

  entityExtraction: entityExtractionSchema,
  legalResearch: legalResearchSchema,
  documentClassification: documentClassificationSchema,
  draftGeneration: draftGenerationSchema,
});

export default AI_SCHEMAS;