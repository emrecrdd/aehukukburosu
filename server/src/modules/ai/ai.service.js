import crypto from 'crypto';
import path from 'path';

import { config } from '../../config/env.js';
import { logger } from '../../config/logger.js';

import { Op, Sequelize } from 'sequelize';
import { sequelize } from '../../config/database.js';

import { aiProvider, AIProviderError } from '../../integrations/ai.provider.js';

import { AIAnalysis } from '../../models/AIAnalysis.js';
import { Case } from '../../models/Case.js';
import { CaseParty } from '../../models/CaseParty.js';
import { Client } from '../../models/Client.js';
import { Document } from '../../models/Document.js';
import { Event } from '../../models/Event.js';
import { Meeting } from '../../models/Meeting.js';
import { Note } from '../../models/Note.js';
import { Task } from '../../models/Task.js';
import { User } from '../../models/User.js';

import {
  caseCompletionSchema,
  caseQuestionSchema,
  caseSummarySchema,
  hearingPreparationSchema,
  documentAnalysisSchema,
  documentClassificationSchema,
  draftGenerationSchema,
  entityExtractionSchema,
  legalResearchSchema,
} from './ai.schemas.js';

import {
  CASE_COMPLETION_PROMPT,
  CASE_QUESTION_PROMPT,
  CASE_SUMMARY_PROMPT,
  HEARING_PREPARATION_PROMPT,
  DOCUMENT_ANALYSIS_PROMPT,
  DOCUMENT_CLASSIFICATION_PROMPT,
  ENTITY_EXTRACTION_PROMPT,
  LEGAL_RESEARCH_PROMPT,
  buildCaseCompletionInput,
  buildCaseQuestionInput,
  buildCaseSummaryInput,
  buildHearingPreparationInput,
  buildDraftInput,
  buildEntityExtractionInput,
  buildLegalResearchInput,
  getDraftPrompt,
} from './ai.prompts.js';
import { documentService } from '../documents/document.service.js';
import {
  ROLES,
  PERMISSION_KEYS,
  getEffectivePermissions,
} from '../../constants/roles.js';

const PROMPT_VERSION = 'v2';

const ANALYSIS_TYPES = Object.freeze({
  DOCUMENT_ANALYSIS: 'document_analysis',
  DOCUMENT_CLASSIFICATION: 'document_classification',
  ENTITY_EXTRACTION: 'entity_extraction',
  CASE_SUMMARY: 'case_summary',
  CASE_QUESTION: 'case_question',
  CASE_COMPLETION: 'case_completion',

  HEARING_PREPARATION: 'hearing_preparation',

  LEGAL_RESEARCH: 'legal_research',
  DRAFT_GENERATION: 'draft_generation',
});

const AI_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]);

const AI_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const isAIImageDocument = (
  document
) => {
  const extension =
    path
      .extname(
        document?.original_name ||
          ''
      )
      .toLowerCase();

  const mimeType =
    String(
      document?.mime_type ||
        ''
    )
      .trim()
      .toLowerCase();

  return (
    AI_IMAGE_EXTENSIONS.has(
      extension
    ) ||
    AI_IMAGE_MIME_TYPES.has(
      mimeType
    )
  );
};

const DRAFT_TYPES = Object.freeze([
  'petition',
  'contract',
  'notice',
]);

const MAX_TEXT_INPUT_LENGTH = 100_000;

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'refresh_token',
  'refreshToken',
  'access_token',
  'accessToken',
  'reset_token',
  'resetToken',
  'verification_token',
  'verificationToken',
  'jwt',
  'secret',
]);

export class AIServiceError extends Error {
  constructor(
    message,
    {
      code = 'AI_SERVICE_ERROR',
      statusCode = 500,
      cause = null,
    } = {}
  ) {
    super(message);

    this.name = 'AIServiceError';
    this.code = code;
    this.statusCode = statusCode;

    if (cause) {
      this.cause = cause;
    }

    Error.captureStackTrace?.(this, AIServiceError);
  }
}


// ======================================================
// ACCESS CONTROL HELPERS
// ======================================================

const getActorId = (actor) => actor?.id || null;

const getActorPermissions = (actor) => {
  if (!actor) return [];

  return getEffectivePermissions(
    actor.role,
    actor.permissions || {}
  );
};

const isAdmin = (actor) => actor?.role === ROLES.ADMIN;

const canViewAllCases = (actor) =>
  isAdmin(actor) ||
  getActorPermissions(actor).includes(
    PERMISSION_KEYS.VIEW_ALL_CASES
  );

const requireActorId = (actor) => {
  const actorId = getActorId(actor);

  if (!actorId) {
    throw new AIServiceError('Kimlik doğrulaması gerekli.', {
      code: 'AUTH_REQUIRED',
      statusCode: 401,
    });
  }

  return actorId;
};

const hasWhereContent = (value) =>
  Boolean(
    value &&
      typeof value === 'object' &&
      Reflect.ownKeys(value).length > 0
  );

const combineWhere = (...conditions) => {
  const validConditions = conditions.filter(hasWhereContent);

  if (validConditions.length === 0) return {};
  if (validConditions.length === 1) return validConditions[0];

  return {
    [Op.and]: validConditions,
  };
};

const buildCaseAccessWhere = (actor) => {
  const actorId = requireActorId(actor);

  if (canViewAllCases(actor)) {
    return {};
  }

  return {
    [Op.or]: [
      { created_by: actorId },
      { assigned_to: actorId },
    ],
  };
};

const buildDocumentReadAccessWhere = (actor) => {
  const actorId = requireActorId(actor);

  if (isAdmin(actor)) {
    return {};
  }

  const caseLinkedScope = canViewAllCases(actor)
    ? {
        case_id: {
          [Op.ne]: null,
        },
      }
    : {
        [Op.and]: [
          {
            case_id: {
              [Op.ne]: null,
            },
          },
          {
            [Op.or]: [
              { '$case.created_by$': actorId },
              { '$case.assigned_to$': actorId },
            ],
          },
        ],
      };

  const clientCasePredicate = canViewAllCases(actor)
    ? `
      EXISTS (
        SELECT 1
        FROM case_clients cc
        INNER JOIN cases c
          ON c.id = cc.case_id
         AND c.deleted_at IS NULL
        WHERE cc.client_id = "Document"."client_id"
      )
    `
    : `
      EXISTS (
        SELECT 1
        FROM case_clients cc
        INNER JOIN cases c
          ON c.id = cc.case_id
         AND c.deleted_at IS NULL
        WHERE cc.client_id = "Document"."client_id"
          AND (
            c.created_by = ${sequelize.escape(actorId)}
            OR c.assigned_to = ${sequelize.escape(actorId)}
          )
      )
    `;

  return {
    [Op.or]: [
      { is_public: true },
      caseLinkedScope,
      {
        [Op.and]: [
          { case_id: null },
          {
            client_id: {
              [Op.ne]: null,
            },
          },
          {
            [Op.or]: [
              { '$client.created_by$': actorId },
              Sequelize.where(
                Sequelize.literal(clientCasePredicate),
                true
              ),
            ],
          },
        ],
      },
      {
        [Op.and]: [
          { case_id: null },
          { client_id: null },
          { uploaded_by: actorId },
        ],
      },
    ],
  };
};

class AIService {
  /**
   * Kayıtlı bir belgeyi documentId üzerinden analiz eder.
   *
   * @param {object} params
   * @param {string} params.documentId
   * @param {string} params.userId
   * @param {boolean} [params.force=false]
   */
  async analyzeDocument({
    documentId,
    userId: legacyUserId = null,
    actor = null,
    force = false,
  }) {
    this.validateUuidLike(documentId, 'documentId');

    const actorContext = await this.resolveActorContext({
      actor,
      userId: legacyUserId,
    });
    const userId = requireActorId(actorContext);

    const document = await this.getDocument(
      documentId,
      actorContext
    );
    const file = await this.readDocumentFile(
      document,
      actorContext
    );
    const inputHash = this.createInputHash({
      buffer: file.buffer,
      operation: ANALYSIS_TYPES.DOCUMENT_ANALYSIS,
      promptVersion: PROMPT_VERSION,
    });

    if (!force) {
      const cached = await this.findCachedAnalysis({
        analysisType: ANALYSIS_TYPES.DOCUMENT_ANALYSIS,
        documentId,
        userId,
        inputHash,
      });

      if (cached) {
        return this.formatAnalysisResponse(cached, true);
      }
    }

    const analysis = await this.createPendingAnalysis({
      analysisType: ANALYSIS_TYPES.DOCUMENT_ANALYSIS,
      documentId,
      caseId: document.case_id,
      userId,
      inputHash,
      metadata: {
        documentName: document.original_name,
        mimeType: document.mime_type,
        fileSize: document.file_size,
      },
    });

    let openAIFileId = null;

    try {
      let uploadBuffer = file.buffer;
let uploadFilename = document.original_name;
let uploadMimeType = document.mime_type;

const isUdf =
  document.file_type === 'udf' ||
  path.extname(document.original_name || '').toLowerCase() === '.udf';

if (isUdf) {
  const udfPreview = await documentService.getUdfPreview(
    document.id,
    actorContext
  );

  uploadBuffer = Buffer.from(udfPreview.content, 'utf8');
  uploadFilename = `${path.parse(document.original_name || 'document').name}.txt`;
  uploadMimeType = 'text/plain';
}

const isImage =
  isAIImageDocument(
    document
  );

const uploadedFile = await aiProvider.uploadFile({
  buffer: uploadBuffer,
  filename: uploadFilename,
  mimeType: uploadMimeType,
  purpose:
    isImage
      ? 'vision'
      : 'user_data',
});

      openAIFileId = uploadedFile.id;

      const responseOptions = {
        fileId: openAIFileId,
        instructions: DOCUMENT_ANALYSIS_PROMPT,
        prompt:
          'Bu dosyanın tamamını incele ve tanımlanan şemaya göre hukuki belge analizi oluştur.',
        schemaName: 'legal_document_analysis',
        schema: documentAnalysisSchema,
        schemaDescription:
          'Hukuki belgenin yapılandırılmış analiz sonucu.',
        maxOutputTokens: 10_000,
        metadata: {
          operation: ANALYSIS_TYPES.DOCUMENT_ANALYSIS,
          analysisId: analysis.id,
          documentId,
          userId,
        },
      };

      const providerResult =
        isImage
          ? await aiProvider
              .createStructuredImageResponse({
                ...responseOptions,
                detail: 'auto',
              })
          : await aiProvider
              .createStructuredFileResponse(
                responseOptions
              );

      await this.completeAnalysis({
        analysis,
        providerResult,
        confidence: providerResult.output.confidence,
        metadata: {
          ...analysis.metadata,
          openAIFileId,
        },
      });

      logger.info('Hukuki belge analizi tamamlandı', {
        analysisId: analysis.id,
        documentId,
        userId,
        model: providerResult.model,
        durationMs: providerResult.durationMs,
      });

      return this.formatAnalysisResponse(analysis, false);
    } catch (error) {
      await this.failAnalysis(analysis, error);

      throw this.normalizeServiceError(
        error,
        'Belge analizi tamamlanamadı.'
      );
    } finally {
      if (openAIFileId) {
        await this.deleteProviderFileSafely(openAIFileId);
      }
    }
  }

  /**
   * Kayıtlı belgeyi ayrı bir işlem olarak sınıflandırır.
   *
   * Ana belge analizi zaten documentType alanını döndürür.
   * Bu metot yalnızca hızlı ve bağımsız sınıflandırma gereken
   * ekranlar için tutulmaktadır.
   */
  async classifyDocument({
    documentId,
    userId: legacyUserId = null,
    actor = null,
    force = false,
  }) {
    this.validateUuidLike(documentId, 'documentId');

    const actorContext = await this.resolveActorContext({
      actor,
      userId: legacyUserId,
    });
    const userId = requireActorId(actorContext);

    const document = await this.getDocument(
      documentId,
      actorContext
    );
    const file = await this.readDocumentFile(
      document,
      actorContext
    );
    const inputHash = this.createInputHash({
      buffer: file.buffer,
      operation: ANALYSIS_TYPES.DOCUMENT_CLASSIFICATION,
      promptVersion: PROMPT_VERSION,
    });

    if (!force) {
      const cached = await this.findCachedAnalysis({
        analysisType:
          ANALYSIS_TYPES.DOCUMENT_CLASSIFICATION,
        documentId,
        userId,
        inputHash,
      });

      if (cached) {
        return this.formatAnalysisResponse(cached, true);
      }
    }

    const analysis = await this.createPendingAnalysis({
      analysisType:
        ANALYSIS_TYPES.DOCUMENT_CLASSIFICATION,
      documentId,
      caseId: document.case_id,
      userId,
      inputHash,
      metadata: {
        documentName: document.original_name,
        mimeType: document.mime_type,
      },
    });

    let openAIFileId = null;

    try {
      const isImage =
        isAIImageDocument(
          document
        );

      const uploadedFile =
        await aiProvider.uploadFile({
          buffer: file.buffer,
          filename:
            document.original_name,
          mimeType:
            document.mime_type,
          purpose:
            isImage
              ? 'vision'
              : 'user_data',
        });

      openAIFileId = uploadedFile.id;

      const responseOptions = {
        fileId: openAIFileId,
        instructions:
          DOCUMENT_CLASSIFICATION_PROMPT,
        prompt:
          'Bu dosyanın hukuki belge türünü sınıflandır.',
        schemaName:
          'legal_document_classification',
        schema:
          documentClassificationSchema,
        schemaDescription:
          'Hukuki belgenin sınıflandırma sonucu.',
        metadata: {
          operation:
            ANALYSIS_TYPES
              .DOCUMENT_CLASSIFICATION,
          analysisId:
            analysis.id,
          documentId,
          userId,
        },
      };

      const providerResult =
        isImage
          ? await aiProvider
              .createStructuredImageResponse({
                ...responseOptions,
                detail: 'auto',
              })
          : await aiProvider
              .createStructuredFileResponse(
                responseOptions
              );

      await this.completeAnalysis({
        analysis,
        providerResult,
        confidence: providerResult.output.confidence,
      });

      return this.formatAnalysisResponse(analysis, false);
    } catch (error) {
      await this.failAnalysis(analysis, error);

      throw this.normalizeServiceError(
        error,
        'Belge sınıflandırılamadı.'
      );
    } finally {
      if (openAIFileId) {
        await this.deleteProviderFileSafely(openAIFileId);
      }
    }
  }

  /**
   * Dava kaydından kapsamlı özet oluşturur.
   */
  async summarizeCase({
    caseId,
    userId: legacyUserId = null,
    actor = null,
    force = false,
  }) {
    this.validateUuidLike(caseId, 'caseId');

    const actorContext = await this.resolveActorContext({
      actor,
      userId: legacyUserId,
    });
    const userId = requireActorId(actorContext);

    const caseRecord = await this.getCaseWithContext(
      caseId,
      actorContext
    );
    const casePayload = this.prepareCasePayload(caseRecord);
    const input = buildCaseSummaryInput(casePayload);

    const inputHash = this.createInputHash({
      text: input,
      operation: ANALYSIS_TYPES.CASE_SUMMARY,
      promptVersion: PROMPT_VERSION,
    });

    if (!force) {
      const cached = await this.findCachedAnalysis({
        analysisType: ANALYSIS_TYPES.CASE_SUMMARY,
        caseId,
        userId,
        inputHash,
      });

      if (cached) {
        return this.formatAnalysisResponse(cached, true);
      }
    }

    const analysis = await this.createPendingAnalysis({
      analysisType: ANALYSIS_TYPES.CASE_SUMMARY,
      caseId,
      userId,
      inputHash,
      metadata: {
        caseTitle:
          caseRecord.title ||
          caseRecord.case_number ||
          null,
      },
    });

    try {
      const providerResult =
  await aiProvider.createStructuredResponse({
    instructions: CASE_SUMMARY_PROMPT,
    input,

    schemaName: 'legal_case_summary',
    schema: caseSummarySchema,

    schemaDescription:
      'Dava dosyasının yapılandırılmış hukuki özeti.',

    // Case AI çıktısı oldukça geniş olduğu için
    // genel 4000 token limiti burada yetersiz kalıyor.
    maxOutputTokens: 10_000,

    metadata: {
      operation: ANALYSIS_TYPES.CASE_SUMMARY,
      analysisId: analysis.id,
      caseId,
      userId,
    },
  });

      await this.completeAnalysis({
        analysis,
        providerResult,
        confidence: providerResult.output.confidence,
      });

      return this.formatAnalysisResponse(analysis, false);
    } catch (error) {
      await this.failAnalysis(analysis, error);

      throw this.normalizeServiceError(
        error,
        'Dava özeti oluşturulamadı.'
      );
    }
  }
async analyzeCaseCompletion({
  caseId,
  userId: legacyUserId = null,
  actor = null,
  force = false,
}) {
  this.validateUuidLike(caseId, 'caseId');

  const actorContext = await this.resolveActorContext({
    actor,
    userId: legacyUserId,
  });
  const userId = requireActorId(actorContext);

  const caseRecord =
    await this.getCaseWithContext(
      caseId,
      actorContext
    );

  const casePayload =
    this.prepareCasePayload(caseRecord);

  /*
   * Case Completion yalnızca analiz edilmiş belgelerden
   * anlamlı öneriler çıkarabilir.
   *
   * Hiç analiz edilmiş belge yoksa kullanıcıya anlamsız
   * AI çağrısı yaptırmıyoruz.
   */
  const analyzedDocumentCount =
    casePayload.documentContext
      ?.analyzedDocuments || 0;

  if (analyzedDocumentCount === 0) {
    throw new AIServiceError(
      'Dosya tamamlama analizi için önce davaya bağlı en az bir belgeyi AI ile analiz edin.',
      {
        code: 'CASE_COMPLETION_NO_ANALYZED_DOCUMENT',
        statusCode: 422,
      }
    );
  }

  const input =
    buildCaseCompletionInput(
      casePayload
    );

  const inputHash =
    this.createInputHash({
      text: input,
      operation:
        ANALYSIS_TYPES.CASE_COMPLETION,
      promptVersion:
        PROMPT_VERSION,
    });

  if (!force) {
    const cached =
      await this.findCachedAnalysis({
        analysisType:
          ANALYSIS_TYPES.CASE_COMPLETION,
        caseId,
        userId,
        inputHash,
      });

    if (cached) {
      return this.formatAnalysisResponse(
        cached,
        true
      );
    }
  }

  const analysis =
    await this.createPendingAnalysis({
      analysisType:
        ANALYSIS_TYPES.CASE_COMPLETION,

      caseId,
      userId,
      inputHash,

      metadata: {
        caseTitle:
          caseRecord.title ||
          caseRecord.case_number ||
          null,

        documentCount:
          casePayload.documents
            ?.length || 0,

        analyzedDocumentCount,
      },
    });

  try {
    const providerResult =
      await aiProvider.createStructuredResponse({
        instructions:
          CASE_COMPLETION_PROMPT,

        input,

        schemaName:
          'legal_case_completion',

        schema:
          caseCompletionSchema,

        schemaDescription:
          'Mevcut dava kaydı ile analiz edilmiş belge verilerini karşılaştırarak eksik ve çelişkili alanlar için yapılandırılmış öneriler.',

        maxOutputTokens: 20_000,

        metadata: {
          operation:
            ANALYSIS_TYPES.CASE_COMPLETION,

          analysisId:
            analysis.id,

          caseId,
          userId,

          analyzedDocumentCount,
        },
      });

    await this.completeAnalysis({
      analysis,
      providerResult,

      confidence:
        providerResult.output
          .confidence,
    });

    logger.info(
      'AI dava tamamlama analizi tamamlandı',
      {
        analysisId:
          analysis.id,

        caseId,
        userId,

        model:
          providerResult.model,

        analyzedDocumentCount,

        missingPartyCount:
          providerResult.output
            ?.missingParties
            ?.length || 0,

        conflictCount:
          providerResult.output
            ?.partyConflicts
            ?.length || 0,

        suggestedUpdateCount:
          providerResult.output
            ?.suggestedCaseUpdates
            ?.length || 0,

        durationMs:
          providerResult.durationMs,
      }
    );

    return this.formatAnalysisResponse(
      analysis,
      false
    );
  } catch (error) {
    await this.failAnalysis(
      analysis,
      error
    );

    throw this.normalizeServiceError(
      error,
      'Dava tamamlama analizi oluşturulamadı.'
    );
  }
}
  /**
   * Seçili dava dosyası hakkında kaynaklı soru-cevap üretir.
   */
  async askCaseQuestion({
    caseId,
    question,
    userId: legacyUserId = null,
    actor = null,
  }) {
    this.validateUuidLike(caseId, 'caseId');

    this.validateRequiredText(
      question,
      'question',
      10_000
    );

    const actorContext =
      await this.resolveActorContext({
        actor,
        userId: legacyUserId,
      });

    const userId =
      requireActorId(actorContext);

    /*
     * getCaseWithContext erişim kontrolünü de uygular.
     * Böylece kullanıcı erişemediği bir davayı AI üzerinden
     * sorgulayamaz.
     */
    const caseRecord =
      await this.getCaseWithContext(
        caseId,
        actorContext
      );

    const casePayload =
      this.prepareCasePayload(
        caseRecord
      );

    const normalizedQuestion =
      question.trim();

    const input =
      buildCaseQuestionInput({
        question: normalizedQuestion,
        caseData: casePayload,
      });

    /*
     * Soru da input içerisinde bulunduğu için aynı dava
     * bağlamında farklı sorular farklı hash üretir.
     */
    const inputHash =
      this.createInputHash({
        text: input,
        operation:
          ANALYSIS_TYPES.CASE_QUESTION,
        promptVersion:
          PROMPT_VERSION,
      });

    /*
     * Aynı kullanıcı + aynı dava durumu + aynı soru
     * tekrar sorulursa mevcut yanıt kullanılabilir.
     *
     * Dava verisi değişirse casePayload değişeceği için
     * hash de otomatik olarak değişir.
     */
    const cached =
      await this.findCachedAnalysis({
        analysisType:
          ANALYSIS_TYPES.CASE_QUESTION,
        caseId,
        userId,
        inputHash,
      });

    if (cached) {
      return this.formatAnalysisResponse(
        cached,
        true
      );
    }

    const analysis =
      await this.createPendingAnalysis({
        analysisType:
          ANALYSIS_TYPES.CASE_QUESTION,

        caseId,
        userId,
        inputHash,

        metadata: {
          caseTitle:
            caseRecord.title ||
            caseRecord.case_number ||
            null,

          questionPreview:
            normalizedQuestion.slice(
              0,
              250
            ),

          documentCount:
            casePayload.documents
              ?.length || 0,

          analyzedDocumentCount:
            casePayload
              .documentContext
              ?.analyzedDocuments || 0,
        },
      });

    try {
      const providerResult =
        await aiProvider
          .createStructuredResponse({
            instructions:
              CASE_QUESTION_PROMPT,

            input,

            schemaName:
              'legal_case_question',

            schema:
              caseQuestionSchema,

            schemaDescription:
              'Seçili dava dosyasındaki kayıt ve analiz edilmiş belgelere dayalı kaynaklı soru-cevap sonucu.',

            maxOutputTokens:
              8_000,

            metadata: {
              operation:
                ANALYSIS_TYPES
                  .CASE_QUESTION,

              analysisId:
                analysis.id,

              caseId,
              userId,
            },
          });

      /*
       * Modelin döndürdüğü sourceId değerlerine doğrudan
       * güvenmiyoruz.
       *
       * Yalnızca gerçekten bu dava context'inde bulunan
       * kaynakları kabul ediyoruz.
       */
      const sanitizedOutput =
        this.sanitizeCaseQuestionSources(
          providerResult.output,
          casePayload
        );

      /*
       * completeAnalysis providerResult.output'u DB'ye
       * yazdığı için temizlenmiş sonucu providerResult'a
       * geri koyuyoruz.
       */
      const sanitizedProviderResult = {
        ...providerResult,
        output: sanitizedOutput,
      };

      await this.completeAnalysis({
        analysis,
        providerResult:
          sanitizedProviderResult,

        confidence:
          sanitizedOutput.confidence,
      });

      logger.info(
        'AI Dosyaya Sor yanıtı oluşturuldu',
        {
          analysisId:
            analysis.id,

          caseId,
          userId,

          model:
            providerResult.model,

          sourceCount:
            sanitizedOutput.sources
              ?.length || 0,

          findingCount:
            sanitizedOutput.keyFindings
              ?.length || 0,

          suggestedActionCount:
            sanitizedOutput
              .suggestedActions
              ?.length || 0,

          durationMs:
            providerResult.durationMs,
        }
      );

      return this.formatAnalysisResponse(
        analysis,
        false
      );
    } catch (error) {
      await this.failAnalysis(
        analysis,
        error
      );

      throw this.normalizeServiceError(
        error,
        'Dosya sorusu yanıtlanamadı.'
      );
    }
  }
  /**
 * Seçili yaklaşan duruşma için dava bağlamından
 * yapılandırılmış duruşma hazırlık özeti oluşturur.
 */
async prepareForHearing({
  caseId,
  eventId,
  userId: legacyUserId = null,
  actor = null,
  force = false,
}) {
  this.validateUuidLike(caseId, 'caseId');
  this.validateUuidLike(eventId, 'eventId');

  const actorContext =
    await this.resolveActorContext({
      actor,
      userId: legacyUserId,
    });

  const userId =
    requireActorId(actorContext);

  /*
   * Dava erişim kontrolü burada da merkezi context
   * sorgusu üzerinden uygulanır.
   */
  const caseRecord =
    await this.getCaseWithContext(
      caseId,
      actorContext
    );

  const casePayload =
    this.prepareCasePayload(
      caseRecord
    );

  /*
   * eventId doğrudan kullanıcıdan geliyor.
   * Bu nedenle yalnızca bu davanın context'inde gerçekten
   * bulunan event kayıtları arasından seçiyoruz.
   */
  const targetHearing =
    (casePayload.events || []).find(
      (event) => event.id === eventId
    );

  if (!targetHearing) {
    throw new AIServiceError(
      'Duruşma kaydı bulunamadı.',
      {
        code: 'HEARING_NOT_FOUND',
        statusCode: 404,
      }
    );
  }

  /*
   * Duruşmaya Hazırla gelecekteki bir duruşma için çalışır.
   *
   * Tarihi geçmiş bir event hâlâ "planlandı" görünse bile
   * bunu yaklaşan duruşma olarak kabul etmiyoruz.
   */
  if (!targetHearing.isUpcoming) {
    throw new AIServiceError(
      'Duruşmaya hazırlık yalnızca yaklaşan duruşmalar için oluşturulabilir.',
      {
        code: 'HEARING_NOT_UPCOMING',
        statusCode: 422,
      }
    );
  }

  /*
   * Prompt'a selected hearing ayrıca gönderiliyor.
   * Böylece model birden fazla event varsa hangi duruşmaya
   * hazırlanacağını kendisi tahmin etmiyor.
   */
  const aiCasePayload = {
  ...casePayload,

  events: (casePayload.events || []).map(
    (event) => ({
      ...event,
      startDate: this.formatDateTimeForAI(
        event.startDate
      ),
      endDate: this.formatDateTimeForAI(
        event.endDate
      ),
    })
  ),

  meetings: (casePayload.meetings || []).map(
    (meeting) => ({
      ...meeting,
      startDate: this.formatDateTimeForAI(
        meeting.startDate
      ),
      endDate: this.formatDateTimeForAI(
        meeting.endDate
      ),
    })
  ),

  tasks: (casePayload.tasks || []).map(
    (task) => ({
      ...task,
      dueDate: this.formatDateTimeForAI(
        task.dueDate
      ),
      completedAt: this.formatDateTimeForAI(
        task.completedAt
      ),
      startedAt: this.formatDateTimeForAI(
        task.startedAt
      ),
    })
  ),
};

const aiTargetHearing = {
  ...targetHearing,

  startDate: this.formatDateTimeForAI(
    targetHearing.startDate
  ),

  endDate: this.formatDateTimeForAI(
    targetHearing.endDate
  ),
};

const input =
  buildHearingPreparationInput({
    caseData: aiCasePayload,
    targetHearing: aiTargetHearing,
  });
  /*
   * eventId ve event içeriği input içinde bulunduğu için
   * farklı duruşmalar farklı cache hash'i üretir.
   *
   * Dava bağlamı değişirse de hash değişir.
   */
  const inputHash =
    this.createInputHash({
      text: input,
      operation:
        ANALYSIS_TYPES.HEARING_PREPARATION,
      promptVersion:
        PROMPT_VERSION,
    });

  if (!force) {
    const cached =
      await this.findCachedAnalysis({
        analysisType:
          ANALYSIS_TYPES.HEARING_PREPARATION,

        caseId,
        userId,
        inputHash,
      });

    if (cached) {
      return this.formatAnalysisResponse(
        cached,
        true
      );
    }
  }

  const analysis =
    await this.createPendingAnalysis({
      analysisType:
        ANALYSIS_TYPES.HEARING_PREPARATION,

      caseId,
      userId,
      inputHash,

      metadata: {
        caseTitle:
          caseRecord.title ||
          caseRecord.case_number ||
          null,

        hearingId:
          targetHearing.id,

        hearingTitle:
          targetHearing.title ||
          null,

        hearingDate:
          targetHearing.startDate ||
          null,

        documentCount:
          casePayload.documents
            ?.length || 0,

        analyzedDocumentCount:
          casePayload
            .documentContext
            ?.analyzedDocuments || 0,

        unanalyzedDocumentCount:
          casePayload
            .documentContext
            ?.unanalyzedDocuments || 0,
      },
    });

  try {
    const providerResult =
      await aiProvider
        .createStructuredResponse({
          instructions:
            HEARING_PREPARATION_PROMPT,

          input,

          schemaName:
            'legal_hearing_preparation',

          schema:
            hearingPreparationSchema,

          schemaDescription:
            'Seçili yaklaşan duruşma için dava kayıtları ve analiz edilmiş belgelere dayalı yapılandırılmış duruşma hazırlık özeti.',

          maxOutputTokens:
            12_000,

          metadata: {
            operation:
              ANALYSIS_TYPES
                .HEARING_PREPARATION,

            analysisId:
              analysis.id,

            caseId,
            eventId:
              targetHearing.id,

            userId,
          },
        });

    /*
     * Modelin döndürdüğü ID'lere güvenmiyoruz.
     * Yalnızca gerçek dava context'indeki kaynakları
     * kabul ediyoruz.
     */
    const sanitizedOutput =
      this.sanitizeHearingPreparationSources(
        providerResult.output,
        casePayload,
        targetHearing
      );

    /*
     * Duruşma kimliğini ve temel bilgisini
     * modelin ürettiği değerlerden değil backend'deki
     * gerçek event kaydından sabitliyoruz.
     */
    const finalOutput = {
      ...sanitizedOutput,

      hearingId:
        targetHearing.id,

      hearingTitle:
        targetHearing.title ||
        'Duruşma',

      hearingDate:
        targetHearing.startDate ||
        null,
    };

    const sanitizedProviderResult = {
      ...providerResult,
      output: finalOutput,
    };

    await this.completeAnalysis({
      analysis,

      providerResult:
        sanitizedProviderResult,

      confidence:
        finalOutput.confidence,
    });

    logger.info(
      'AI duruşma hazırlığı oluşturuldu',
      {
        analysisId:
          analysis.id,

        caseId,

        eventId:
          targetHearing.id,

        userId,

        model:
          providerResult.model,

        sourceCount:
          finalOutput.sources
            ?.length || 0,

        focusPointCount:
          finalOutput
            .hearingFocusPoints
            ?.length || 0,

        checklistCount:
          finalOutput
            .preparationChecklist
            ?.length || 0,

        evidenceCount:
          finalOutput.evidence
            ?.length || 0,

        durationMs:
          providerResult.durationMs,
      }
    );

    return this.formatAnalysisResponse(
      analysis,
      false
    );
  } catch (error) {
    await this.failAnalysis(
      analysis,
      error
    );

    throw this.normalizeServiceError(
      error,
      'Duruşma hazırlığı oluşturulamadı.'
    );
  }
}
  /**
   * Hukuki soru hakkında kaynak doğrulaması gerektiren
   * bir ön değerlendirme oluşturur.
   */
  async generateLegalResearch({
    query,
    context = '',
    userId: legacyUserId = null,
    actor = null,
  }) {
    const actorContext = await this.resolveActorContext({
      actor,
      userId: legacyUserId,
    });
    const userId = requireActorId(actorContext);
    this.validateRequiredText(query, 'query', 10_000);
    this.validateOptionalText(context, 'context', 50_000);

    const input = buildLegalResearchInput({
      query: query.trim(),
      context: context.trim(),
    });

    const inputHash = this.createInputHash({
      text: input,
      operation: ANALYSIS_TYPES.LEGAL_RESEARCH,
      promptVersion: PROMPT_VERSION,
    });

    const analysis = await this.createPendingAnalysis({
      analysisType: ANALYSIS_TYPES.LEGAL_RESEARCH,
      userId,
      inputHash,
      metadata: {
        queryPreview: query.trim().slice(0, 250),
      },
    });

    try {
      const providerResult =
        await aiProvider.createStructuredResponse({
          instructions: LEGAL_RESEARCH_PROMPT,
          input,
          schemaName: 'legal_research_assessment',
          schema: legalResearchSchema,
          schemaDescription:
            'Avukat kontrolüne tabi hukuki ön değerlendirme.',
            maxOutputTokens: 8000,
          metadata: {
            operation: ANALYSIS_TYPES.LEGAL_RESEARCH,
            analysisId: analysis.id,
            userId,
          },
        });

      await this.completeAnalysis({
        analysis,
        providerResult,
        confidence: providerResult.output.confidence,
      });

      return this.formatAnalysisResponse(analysis, false);
    } catch (error) {
      await this.failAnalysis(analysis, error);

      throw this.normalizeServiceError(
        error,
        'Hukuki ön değerlendirme oluşturulamadı.'
      );
    }
  }

  /**
   * Hukuki metinden kişi, kurum, tarih, tutar ve benzeri
   * varlıkları yapılandırılmış biçimde çıkarır.
   */
  async extractEntities({
    text,
    userId: legacyUserId = null,
    actor = null,
    documentId = null,
  }) {
    const actorContext = await this.resolveActorContext({
      actor,
      userId: legacyUserId,
    });
    const userId = requireActorId(actorContext);

    if (documentId) {
      this.validateUuidLike(documentId, 'documentId');
      await this.findAccessibleDocument(documentId, actorContext);
    }

    this.validateRequiredText(
      text,
      'text',
      MAX_TEXT_INPUT_LENGTH
    );

    const normalizedText = text.trim();
    const input = buildEntityExtractionInput(normalizedText);

    const inputHash = this.createInputHash({
      text: input,
      operation: ANALYSIS_TYPES.ENTITY_EXTRACTION,
      promptVersion: PROMPT_VERSION,
    });

    const analysis = await this.createPendingAnalysis({
      analysisType: ANALYSIS_TYPES.ENTITY_EXTRACTION,
      documentId,
      userId,
      inputHash,
      metadata: {
        characterCount: normalizedText.length,
      },
    });

    try {
      const providerResult =
        await aiProvider.createStructuredResponse({
          instructions: ENTITY_EXTRACTION_PROMPT,
          input,
          schemaName: 'legal_entity_extraction',
          schema: entityExtractionSchema,
          schemaDescription:
            'Hukuki metinden çıkarılan yapılandırılmış varlıklar.',
          metadata: {
            operation: ANALYSIS_TYPES.ENTITY_EXTRACTION,
            analysisId: analysis.id,
            documentId: documentId || 'none',
            userId,
          },
        });

      await this.completeAnalysis({
        analysis,
        providerResult,
        confidence: providerResult.output.confidence,
      });

      return this.formatAnalysisResponse(analysis, false);
    } catch (error) {
      await this.failAnalysis(analysis, error);

      throw this.normalizeServiceError(
        error,
        'Metindeki hukuki varlıklar çıkarılamadı.'
      );
    }
  }

  /**
   * Dilekçe, sözleşme veya ihtarname taslağı oluşturur.
   */
  async generateDraft({
    type,
    data,
    userId: legacyUserId = null,
    actor = null,
    caseId = null,
  }) {
    const actorContext = await this.resolveActorContext({
      actor,
      userId: legacyUserId,
    });
    const userId = requireActorId(actorContext);

    if (caseId) {
      this.validateUuidLike(caseId, 'caseId');
      await this.assertCaseAccess(caseId, actorContext);
    }

    if (!DRAFT_TYPES.includes(type)) {
      throw new AIServiceError(
        `Desteklenmeyen taslak türü: ${type}`,
        {
          code: 'UNSUPPORTED_DRAFT_TYPE',
          statusCode: 400,
        }
      );
    }

    if (
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data)
    ) {
      throw new AIServiceError(
        'Taslak oluşturmak için geçerli data nesnesi zorunludur.',
        {
          code: 'INVALID_DRAFT_DATA',
          statusCode: 400,
        }
      );
    }

    const sanitizedData = this.removeSensitiveFields(data);
    const input = buildDraftInput({
      type,
      data: sanitizedData,
    });

    const inputHash = this.createInputHash({
      text: input,
      operation: `${ANALYSIS_TYPES.DRAFT_GENERATION}:${type}`,
      promptVersion: PROMPT_VERSION,
    });

    const analysis = await this.createPendingAnalysis({
      analysisType: ANALYSIS_TYPES.DRAFT_GENERATION,
      caseId,
      userId,
      inputHash,
      metadata: {
        draftType: type,
      },
    });

    try {
      const providerResult =
        await aiProvider.createStructuredResponse({
          instructions: getDraftPrompt(type),
          input,
          schemaName: `legal_${type}_draft`,
          schema: draftGenerationSchema,
          schemaDescription:
            'Avukat incelemesine tabi hukuki belge taslağı.',
          metadata: {
            operation: ANALYSIS_TYPES.DRAFT_GENERATION,
            draftType: type,
            analysisId: analysis.id,
            caseId: caseId || 'none',
            userId,
          },
        });

      await this.completeAnalysis({
        analysis,
        providerResult,
        confidence: null,
      });

      return this.formatAnalysisResponse(analysis, false);
    } catch (error) {
      await this.failAnalysis(analysis, error);

      throw this.normalizeServiceError(
        error,
        'Hukuki belge taslağı oluşturulamadı.'
      );
    }
  }

  async getAnalysisById({
    analysisId,
    userId: legacyUserId = null,
    actor = null,
  }) {
    this.validateUuidLike(analysisId, 'analysisId');

    const actorContext = await this.resolveActorContext({
      actor,
      userId: legacyUserId,
    });
    const userId = requireActorId(actorContext);

    const analysis = await AIAnalysis.findOne({
      where: {
        id: analysisId,
        user_id: userId,
      },
    });

    if (!analysis) {
      throw new AIServiceError(
        'Yapay zekâ analiz kaydı bulunamadı.',
        {
          code: 'AI_ANALYSIS_NOT_FOUND',
          statusCode: 404,
        }
      );
    }

    if (analysis.document_id) {
      await this.findAccessibleDocument(analysis.document_id, actorContext);
    } else if (analysis.case_id) {
      await this.assertCaseAccess(analysis.case_id, actorContext);
    }

    return this.formatAnalysisResponse(analysis, false);
  }

  async getDocumentAnalyses({
    documentId,
    userId: legacyUserId = null,
    actor = null,
    limit = 20,
  }) {
    this.validateUuidLike(documentId, 'documentId');

    const actorContext = await this.resolveActorContext({
      actor,
      userId: legacyUserId,
    });
    const userId = requireActorId(actorContext);

    await this.findAccessibleDocument(documentId, actorContext);

    const safeLimit = Math.min(
      Math.max(Number.parseInt(limit, 10) || 20, 1),
      100
    );

    return AIAnalysis.findAll({
      where: {
        document_id: documentId,
        user_id: userId,
      },
      order: [['created_at', 'DESC']],
      limit: safeLimit,
    });
  }

  async findAccessibleDocument(documentId, actor) {
    const accessWhere = buildDocumentReadAccessWhere(actor);

    const document = await Document.findOne({
      where: combineWhere(
        { id: documentId },
        accessWhere
      ),
      include: [
        {
          model: Case,
          as: 'case',
          attributes: [],
          required: false,
        },
        {
          model: Client,
          as: 'client',
          attributes: [],
          required: false,
        },
      ],
      subQuery: false,
    });

    if (!document) {
      throw new AIServiceError('Belge bulunamadı.', {
        code: 'DOCUMENT_NOT_FOUND',
        statusCode: 404,
      });
    }

    return document;
  }

  async getDocument(documentId, actor) {
    const document = await this.findAccessibleDocument(
      documentId,
      actor
    );

    if (document.is_archived) {
      throw new AIServiceError(
        'Arşivlenmiş belge analiz edilemez.',
        {
          code: 'DOCUMENT_ARCHIVED',
          statusCode: 409,
        }
      );
    }

    return document;
  }

 async getCaseWithContext(caseId, actor) {
  const actorId = requireActorId(actor);

  const caseRecord = await Case.findOne({
    where: combineWhere(
      { id: caseId },
      buildCaseAccessWhere(actor)
    ),
    include: [
      {
        model: Client,
        as: 'clients',
        required: false,
        through: {
          attributes: [],
        },
        attributes: [
          'id',
          'name',
          'identification_number',
          'email',
          'phone',
          'address',
          'city',
          'district',
          'client_type',
          'status',
        ],
      },

      {
        model: CaseParty,
        as: 'parties',
        required: false,
        attributes: [
          'id',
          'party_type',
          'name',
          'tc_number',
          'phone',
          'email',
          'address',
          'lawyer_name',
          'lawyer_phone',
          'lawyer_registry_number',
          'notes',
        ],
      },

      {
        model: Document,
        as: 'documents',
        required: false,
        attributes: [
          'id',
          'name',
          'original_name',
          'file_type',
          'mime_type',
          'category',
          'description',
          'tags',
          'created_at',
        ],
        include: [
          {
            model: AIAnalysis,
            as: 'aiAnalyses',
            required: false,
            where: {
              status: 'completed',
              analysis_type: ANALYSIS_TYPES.DOCUMENT_ANALYSIS,
              user_id: actorId,
            },
            attributes: [
              'id',
              'analysis_type',
              'status',
              'result',
              'confidence',
              'model',
              'prompt_version',
              'created_at',
            ],
            separate: true,
            limit: 1,
            order: [['created_at', 'DESC']],
          },
        ],
      },

      {
        model: Task,
        as: 'tasks',
        required: false,
        attributes: [
          'id',
          'title',
          'description',
          'status',
          'priority',
          'due_date',
          'completed_at',
          'created_by',
          'progress',
          'started_at',
          'estimated_hours',
          'actual_hours',
          'approved_by',
          'approved_at',
          'tags',
          'created_at',
        ],
      },

      {
        model: Event,
        as: 'events',
        required: false,
        attributes: [
          'id',
          'title',
          'description',
          'event_type',
          'hearing_type',
          'last_hearing_result',
          'todo_items',
          'opposing_counsel',
          'expense_status',
          'start_date',
          'end_date',
          'location',
          'court_room',
          'judge_name',
          'status',
          'is_all_day',
          'created_at',
        ],
      },

      {
        model: Note,
        as: 'notes',
        required: false,
        attributes: [
          'id',
          'content',
          'note_type',
          'is_private',
          'is_pinned',
          'tags',
          'created_at',
        ],
      },

      {
        model: Meeting,
        as: 'meetings',
        required: false,
        attributes: [
          'id',
          'title',
          'description',
          'start_date',
          'end_date',
          'location',
          'meeting_type',
          'status',
          'attendees',
          'meeting_link',
          'notes',
          'client_id',
          'assigned_to',
          'created_at',
        ],
      },
    ],

    order: [
      [{ model: Task, as: 'tasks' }, 'due_date', 'ASC'],
      [{ model: Event, as: 'events' }, 'start_date', 'ASC'],
      [{ model: Meeting, as: 'meetings' }, 'start_date', 'ASC'],
      [{ model: Note, as: 'notes' }, 'created_at', 'DESC'],
      [{ model: Document, as: 'documents' }, 'created_at', 'DESC'],
    ],
  });

  if (!caseRecord) {
    throw new AIServiceError('Dava bulunamadı.', {
      code: 'CASE_NOT_FOUND',
      statusCode: 404,
    });
  }

  return caseRecord;
}
formatDateTimeForAI(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }
  ).formatToParts(date);

  const get = (type) =>
    parts.find(
      (part) => part.type === type
    )?.value;

  return (
    `${get('year')}-${get('month')}-${get('day')}` +
    `T${get('hour')}:${get('minute')}:${get('second')}+03:00`
  );
}
prepareCasePayload(caseRecord) {
  const rawData =
    typeof caseRecord.toJSON === 'function'
      ? caseRecord.toJSON()
      : caseRecord;

  const data = this.removeSensitiveFields(rawData);

  const now = Date.now();

  const tasks = (data.tasks ?? []).map((task) => {
    const dueTime = task.due_date
      ? new Date(task.due_date).getTime()
      : null;

    const isOpen = ![
      'completed',
      'cancelled',
    ].includes(task.status);

    return {
      id: task.id,
      title: task.title ?? null,
      description: task.description ?? null,
      status: task.status ?? null,
      priority: task.priority ?? null,
      dueDate: task.due_date ?? null,
      completedAt: task.completed_at ?? null,
      progress: Number(task.progress ?? 0),
      startedAt: task.started_at ?? null,
      estimatedHours: task.estimated_hours ?? null,
      actualHours: task.actual_hours ?? null,
      createdBy: task.created_by ?? null,
      approvedBy: task.approved_by ?? null,
      approvedAt: task.approved_at ?? null,
      tags: task.tags ?? [],
      isOpen,
      isOverdue: Boolean(
        isOpen &&
          dueTime &&
          Number.isFinite(dueTime) &&
          dueTime < now
      ),
      createdAt: task.created_at ?? null,
    };
  });

  const events = (data.events ?? []).map((event) => {
    const startTime = event.start_date
      ? new Date(event.start_date).getTime()
      : null;

    return {
      id: event.id,
      title: event.title ?? null,
      description: event.description ?? null,
      eventType: event.event_type ?? null,
      hearingType: event.hearing_type ?? null,
      lastHearingResult: event.last_hearing_result ?? null,
      todoItems: event.todo_items ?? [],
      opposingCounsel: event.opposing_counsel ?? null,
      expenseStatus: event.expense_status ?? null,
      startDate: event.start_date ?? null,
      endDate: event.end_date ?? null,
      location: event.location ?? null,
      courtRoom: event.court_room ?? null,
      judgeName: event.judge_name ?? null,
      status: event.status ?? null,
      isAllDay: Boolean(event.is_all_day),
      isUpcoming: Boolean(
        startTime &&
          Number.isFinite(startTime) &&
          startTime > now &&
          !['completed', 'cancelled'].includes(event.status)
      ),
      createdAt: event.created_at ?? null,
    };
  });

  const meetings = (data.meetings ?? []).map((meeting) => {
    const startTime = meeting.start_date
      ? new Date(meeting.start_date).getTime()
      : null;

    return {
      id: meeting.id,
      title: meeting.title ?? null,
      description: meeting.description ?? null,
      meetingType: meeting.meeting_type ?? null,
      startDate: meeting.start_date ?? null,
      endDate: meeting.end_date ?? null,
      location: meeting.location ?? null,
      status: meeting.status ?? null,
      attendees: meeting.attendees ?? [],
      meetingLink: meeting.meeting_link ?? null,
      notes: meeting.notes ?? null,
      clientId: meeting.client_id ?? null,
      assignedTo: meeting.assigned_to ?? null,
      isUpcoming: Boolean(
        startTime &&
          Number.isFinite(startTime) &&
          startTime > now &&
          !['completed', 'cancelled'].includes(meeting.status)
      ),
      createdAt: meeting.created_at ?? null,
    };
  });

  const documents = (data.documents ?? []).map((document) => {
    const analyses = Array.isArray(document.aiAnalyses)
      ? document.aiAnalyses
      : [];

    const latestAnalysis = analyses[0] ?? null;

    const aiResult =
      latestAnalysis?.result &&
      typeof latestAnalysis.result === 'object'
        ? latestAnalysis.result
        : null;

    return {
      id: document.id,
      name: document.name ?? null,
      originalName: document.original_name ?? null,
      fileType: document.file_type ?? null,
      mimeType: document.mime_type ?? null,
      category: document.category ?? null,
      description: document.description ?? null,
      tags: document.tags ?? [],
      createdAt: document.created_at ?? null,

      hasAiAnalysis: Boolean(aiResult),

      aiAnalysis: aiResult
        ? {
            analysisId: latestAnalysis.id,
            model: latestAnalysis.model ?? null,
            promptVersion: latestAnalysis.prompt_version ?? null,
            confidence:
              latestAnalysis.confidence ??
              aiResult.confidence ??
              null,
            analyzedAt: latestAnalysis.created_at ?? null,

            documentType: aiResult.documentType ?? null,
            title: aiResult.title ?? null,
            language: aiResult.language ?? null,
            summary: aiResult.summary ?? null,
            caseType: aiResult.caseType ?? null,
            jurisdiction: aiResult.jurisdiction ?? null,
            court: aiResult.court ?? null,
            caseNumber: aiResult.caseNumber ?? null,
            decisionNumber: aiResult.decisionNumber ?? null,
            parties: aiResult.parties ?? [],
            importantDates: aiResult.importantDates ?? [],
            amounts: aiResult.amounts ?? [],
            claims: aiResult.claims ?? [],
            defenses: aiResult.defenses ?? [],
            obligations: aiResult.obligations ?? [],
            evidence: aiResult.evidence ?? [],
            legalIssues: aiResult.legalIssues ?? [],
            referencedLaws: aiResult.referencedLaws ?? [],
            risks: aiResult.risks ?? [],
            missingInformation: aiResult.missingInformation ?? [],
            recommendedActions: aiResult.recommendedActions ?? [],
            overallRiskLevel: aiResult.overallRiskLevel ?? null,
            requiresHumanReview:
              aiResult.requiresHumanReview ?? false,
            reviewReasons: aiResult.reviewReasons ?? [],
            warnings: aiResult.warnings ?? [],
          }
        : null,
    };
  });

  const notes = (data.notes ?? []).map((note) => ({
    id: note.id,
    content: note.content ?? null,
    noteType: note.note_type ?? null,
    isPrivate: Boolean(note.is_private),
    isPinned: Boolean(note.is_pinned),
    tags: note.tags ?? [],
    createdAt: note.created_at ?? null,
  }));

  const workload = {
    openTaskCount: tasks.filter((task) => task.isOpen).length,
    overdueTaskCount: tasks.filter((task) => task.isOverdue).length,
    upcomingEventCount: events.filter((event) => event.isUpcoming).length,
    upcomingMeetingCount: meetings.filter(
      (meeting) => meeting.isUpcoming
    ).length,
  };

  return {
    id: data.id,
    title: data.title ?? null,
    subject: data.subject ?? null,
    description: data.description ?? null,
    status: data.status ?? null,
    priority: data.priority ?? null,

    judiciaryType: data.judiciary_type ?? null,
    judiciaryUnit: data.judiciary_unit ?? null,
    courtName: data.court_name ?? null,
    caseNumber: data.case_number ?? null,
    openingDate: data.opening_date ?? null,

    createdBy: data.created_by ?? null,
    assignedTo: data.assigned_to ?? null,
    createdAt: data.created_at ?? null,
    updatedAt: data.updated_at ?? null,

    clients: (data.clients ?? []).map((client) => ({
      id: client.id,
      name: client.name ?? null,
      identificationNumber:
        client.identification_number ?? null,
      email: client.email ?? null,
      phone: client.phone ?? null,
      address: client.address ?? null,
      city: client.city ?? null,
      district: client.district ?? null,
      clientType: client.client_type ?? null,
      status: client.status ?? null,
    })),

    parties: (data.parties ?? []).map((party) => ({
      id: party.id,
      name: party.name ?? null,
      partyType: party.party_type ?? null,
      identifier: party.tc_number ?? null,
      phone: party.phone ?? null,
      email: party.email ?? null,
      address: party.address ?? null,
      lawyerName: party.lawyer_name ?? null,
      lawyerPhone: party.lawyer_phone ?? null,
      lawyerRegistryNumber:
        party.lawyer_registry_number ?? null,
      notes: party.notes ?? null,
    })),

    documents,
    tasks,
    events,
    meetings,
    notes,

    workload,

    documentContext: {
      totalDocuments: documents.length,

      analyzedDocuments: documents.filter(
        (document) => document.hasAiAnalysis
      ).length,

      unanalyzedDocuments: documents.filter(
        (document) => !document.hasAiAnalysis
      ).length,
    },
  };
}
  sanitizeCaseQuestionSources(
    output,
    casePayload
  ) {
    if (
      !output ||
      typeof output !== 'object'
    ) {
      return output;
    }

    const registry =
      new Map();

    const register = (
      sourceType,
      sourceId,
      title
    ) => {
      if (!sourceId) return;

      registry.set(
        `${sourceType}:${sourceId}`,
        {
          sourceType,
          sourceId,
          title:
            title ||
            'Kaynak',
        }
      );
    };

    /*
     * Dava kaydı
     */
    register(
      'case',
      casePayload.id,
      casePayload.courtName &&
        casePayload.caseNumber
        ? `${casePayload.courtName} · ${casePayload.caseNumber}`
        : casePayload.title ||
          casePayload.caseNumber ||
          'Dava Kaydı'
    );

    /*
     * Belgeler
     */
    for (
      const document of
      casePayload.documents || []
    ) {
      register(
        'document',
        document.id,
        document.originalName ||
          document.name ||
          'Belge'
      );
    }

    /*
     * Görevler
     */
    for (
      const task of
      casePayload.tasks || []
    ) {
      register(
        'task',
        task.id,
        task.title ||
          'Görev'
      );
    }

    /*
     * Duruşma / etkinlikler
     */
    for (
      const event of
      casePayload.events || []
    ) {
      register(
        'event',
        event.id,
        event.title ||
          'Etkinlik'
      );
    }

    /*
     * Toplantılar
     */
    for (
      const meeting of
      casePayload.meetings || []
    ) {
      register(
        'meeting',
        meeting.id,
        meeting.title ||
          'Toplantı'
      );
    }

    /*
     * Notlar
     *
     * Not içeriğini title olarak kullanmıyoruz.
     * Böylece kaynak kartında gereksiz/hassas metin
     * tekrar edilmez.
     */
    for (
      const note of
      casePayload.notes || []
    ) {
      register(
        'note',
        note.id,
        'Dosya Notu'
      );
    }

    const resolveSource = (
      sourceType,
      sourceId
    ) => {
      if (
        !sourceType ||
        !sourceId
      ) {
        return null;
      }

      return (
        registry.get(
          `${sourceType}:${sourceId}`
        ) || null
      );
    };

    /*
     * Ana sources listesi
     */
    const seenSources =
      new Set();

    const sources = (
      Array.isArray(output.sources)
        ? output.sources
        : []
    )
      .map((source) => {
        const valid =
          resolveSource(
            source?.sourceType,
            source?.sourceId
          );

        if (!valid) {
          return null;
        }

        const key =
          `${valid.sourceType}:${valid.sourceId}`;

        if (
          seenSources.has(key)
        ) {
          return null;
        }

        seenSources.add(key);

        return {
          sourceType:
            valid.sourceType,

          sourceId:
            valid.sourceId,

          /*
           * Başlığı modelden değil,
           * backend registry'den alıyoruz.
           */
          title:
            valid.title,

          relevance:
            typeof source?.relevance ===
            'string'
              ? source.relevance
              : '',
        };
      })
      .filter(Boolean);

    /*
     * Key findings içindeki uydurma kaynakları
     * null'a çeviriyoruz.
     */
    const keyFindings = (
      Array.isArray(
        output.keyFindings
      )
        ? output.keyFindings
        : []
    ).map((finding) => {
      const valid =
        resolveSource(
          finding?.sourceType,
          finding?.sourceId
        );

      return {
        ...finding,

        sourceType:
          valid?.sourceType ||
          null,

        sourceId:
          valid?.sourceId ||
          null,
      };
    });

    /*
     * Suggested actions için de aynı kontrol.
     */
    const suggestedActions = (
      Array.isArray(
        output.suggestedActions
      )
        ? output.suggestedActions
        : []
    ).map((action) => {
      const valid =
        resolveSource(
          action?.sourceType,
          action?.sourceId
        );

      return {
        ...action,

        sourceType:
          valid?.sourceType ||
          null,

        sourceId:
          valid?.sourceId ||
          null,
      };
    });

    return {
      ...output,
      sources,
      keyFindings,
      suggestedActions,
    };
  }
sanitizeHearingPreparationSources(
  output,
  casePayload,
  targetHearing
) {
  if (
    !output ||
    typeof output !== 'object'
  ) {
    return output;
  }

  const registry = new Map();

  const register = (
    sourceType,
    sourceId,
    title
  ) => {
    if (!sourceId) return;

    registry.set(
      `${sourceType}:${sourceId}`,
      {
        sourceType,
        sourceId,
        title:
          title ||
          'Kaynak',
      }
    );
  };

  register(
    'case',
    casePayload.id,
    casePayload.courtName &&
      casePayload.caseNumber
      ? `${casePayload.courtName} · ${casePayload.caseNumber}`
      : casePayload.title ||
        casePayload.caseNumber ||
        'Dava Kaydı'
  );

  for (
    const document of
    casePayload.documents || []
  ) {
    register(
      'document',
      document.id,
      document.originalName ||
        document.name ||
        'Belge'
    );
  }

  for (
    const task of
    casePayload.tasks || []
  ) {
    register(
      'task',
      task.id,
      task.title ||
        'Görev'
    );
  }

  for (
    const event of
    casePayload.events || []
  ) {
    register(
      'event',
      event.id,
      event.title ||
        'Duruşma / Etkinlik'
    );
  }

  for (
    const meeting of
    casePayload.meetings || []
  ) {
    register(
      'meeting',
      meeting.id,
      meeting.title ||
        'Toplantı'
    );
  }

  for (
    const note of
    casePayload.notes || []
  ) {
    register(
      'note',
      note.id,
      'Dosya Notu'
    );
  }

  const resolveSource = (
    sourceType,
    sourceId
  ) => {
    if (
      !sourceType ||
      !sourceId
    ) {
      return null;
    }

    return (
      registry.get(
        `${sourceType}:${sourceId}`
      ) || null
    );
  };

  const sanitizeReferencedItems = (
    value
  ) => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => {
      const valid =
        resolveSource(
          item?.sourceType,
          item?.sourceId
        );

      return {
        ...item,

        sourceType:
          valid?.sourceType ||
          null,

        sourceId:
          valid?.sourceId ||
          null,
      };
    });
  };

  const partiesAndPositions =
    sanitizeReferencedItems(
      output.partiesAndPositions
    );

  const claimsAndDefenses =
    sanitizeReferencedItems(
      output.claimsAndDefenses
    );

  const evidence =
    sanitizeReferencedItems(
      output.evidence
    );

  const hearingFocusPoints =
    sanitizeReferencedItems(
      output.hearingFocusPoints
    );

  const preparationChecklist =
    sanitizeReferencedItems(
      output.preparationChecklist
    );

  /*
   * Hedef duruşmanın bitiş bilgisini kritik tarih
   * olarak dışarı çıkarmıyoruz.
   *
   * Model "bitiş", "end", "son tarih" gibi bir madde
   * üretse dahi hedef event'in endDate değerine
   * dayanıyorsa filtrelenir.
   */
  const normalizedTargetEndDate =
    targetHearing?.endDate
      ? new Date(
          targetHearing.endDate
        ).getTime()
      : null;

  const criticalDates =
    sanitizeReferencedItems(
      output.criticalDates
    ).filter((item) => {
      if (
        item?.sourceType !==
          'event' ||
        item?.sourceId !==
          targetHearing?.id
      ) {
        return true;
      }

      const itemDate =
        item?.date
          ? new Date(
              item.date
            ).getTime()
          : null;

      if (
        normalizedTargetEndDate &&
        itemDate &&
        itemDate ===
          normalizedTargetEndDate
      ) {
        return false;
      }

      const searchableText = [
        item?.title,
        item?.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase(
          'tr-TR'
        );

      if (
        searchableText.includes(
          'bitiş'
        ) ||
        searchableText.includes(
          'bitis'
        ) ||
        searchableText.includes(
          'end_date'
        ) ||
        searchableText.includes(
          'enddate'
        )
      ) {
        return false;
      }

      return true;
    });

  /*
   * Brif içindeki gerçek referanslardan
   * kullanılan kaynak anahtarlarını çıkarıyoruz.
   */
  const referencedSourceKeys =
    new Set();

  const collectReferences = (
    items
  ) => {
    for (
      const item of
      items || []
    ) {
      const valid =
        resolveSource(
          item?.sourceType,
          item?.sourceId
        );

      if (!valid) {
        continue;
      }

      referencedSourceKeys.add(
        `${valid.sourceType}:${valid.sourceId}`
      );
    }
  };

  collectReferences(
    partiesAndPositions
  );

  collectReferences(
    claimsAndDefenses
  );

  collectReferences(
    evidence
  );

  collectReferences(
    hearingFocusPoints
  );

  collectReferences(
    preparationChecklist
  );

  collectReferences(
    criticalDates
  );

  /*
   * Ana dava kaydını brifin temel kaynağı olarak
   * tutuyoruz.
   */
  if (casePayload.id) {
    referencedSourceKeys.add(
      `case:${casePayload.id}`
    );
  }

  /*
   * Hedef duruşma da bu çıktının zorunlu kaynağıdır.
   */
  if (targetHearing?.id) {
    referencedSourceKeys.add(
      `event:${targetHearing.id}`
    );
  }

  const seenSources =
    new Set();

  const sources = (
    Array.isArray(output.sources)
      ? output.sources
      : []
  )
    .map((source) => {
      const valid =
        resolveSource(
          source?.sourceType,
          source?.sourceId
        );

      if (!valid) {
        return null;
      }

      const key =
        `${valid.sourceType}:${valid.sourceId}`;

      /*
       * Gerçekten brifte kullanılmayan
       * kaynakları göstermiyoruz.
       */
      if (
        !referencedSourceKeys.has(
          key
        )
      ) {
        return null;
      }

      if (
        seenSources.has(key)
      ) {
        return null;
      }

      seenSources.add(key);

      return {
        sourceType:
          valid.sourceType,

        sourceId:
          valid.sourceId,

        title:
          valid.title,

        relevance:
          typeof source?.relevance ===
          'string'
            ? source.relevance
            : '',
      };
    })
    .filter(Boolean);

  /*
   * Model sources listesine dava veya hedef duruşmayı
   * koymamış olsa bile bunlar brifin temel kaynaklarıdır.
   * Registry'den güvenli biçimde ekliyoruz.
   */
  const ensureSource = (
    sourceType,
    sourceId,
    relevance
  ) => {
    const valid =
      resolveSource(
        sourceType,
        sourceId
      );

    if (!valid) {
      return;
    }

    const key =
      `${valid.sourceType}:${valid.sourceId}`;

    if (
      seenSources.has(key)
    ) {
      return;
    }

    seenSources.add(key);

    sources.push({
      sourceType:
        valid.sourceType,

      sourceId:
        valid.sourceId,

      title:
        valid.title,

      relevance,
    });
  };

  ensureSource(
    'case',
    casePayload.id,
    'Dosyanın genel bilgileri ve taraf kayıtları için temel kaynak.'
  );

  ensureSource(
    'event',
    targetHearing?.id,
    'Hedef duruşmanın tarih, tür ve etkinlik bilgileri için temel kaynak.'
  );

  const realHearing =
    resolveSource(
      'event',
      targetHearing?.id
    );

  return {
    ...output,

    hearingId:
      realHearing?.sourceId ||
      targetHearing?.id ||
      null,

    hearingTitle:
      targetHearing?.title ||
      'Duruşma',

    hearingDate:
      targetHearing?.startDate ||
      null,

    partiesAndPositions,
    claimsAndDefenses,
    evidence,
    hearingFocusPoints,
    preparationChecklist,
    criticalDates,

    sources,
  };
}
  async resolveActorContext({ actor = null, userId = null } = {}) {
    if (actor?.id) {
      this.validateUuidLike(actor.id, 'userId');
      return actor;
    }

    this.validateUuidLike(userId, 'userId');

    const user = await User.findByPk(userId);

    if (!user) {
      throw new AIServiceError('Kimlik doğrulaması gerekli.', {
        code: 'AUTH_REQUIRED',
        statusCode: 401,
      });
    }

    return typeof user.toJSON === 'function'
      ? user.toJSON()
      : user;
  }

  async assertCaseAccess(caseId, actor) {
    const caseRecord = await Case.findOne({
      where: combineWhere(
        { id: caseId },
        buildCaseAccessWhere(actor)
      ),
      attributes: ['id'],
    });

    if (!caseRecord) {
      throw new AIServiceError('Dava bulunamadı.', {
        code: 'CASE_NOT_FOUND',
        statusCode: 404,
      });
    }

    return caseRecord;
  }

  async deleteProviderFileSafely(fileId) {
    if (!fileId) return;

    try {
      await aiProvider.deleteFile(fileId);
    } catch (error) {
      logger.warn('AI sağlayıcı dosyası temizlenemedi', {
        fileId,
        message: error?.message,
      });
    }
  }

  async readDocumentFile(
    document,
    actorContext
  ) {
    if (!document?.id) {
      throw new AIServiceError(
        'Belge kaydı bulunamadı.',
        {
          code:
            'DOCUMENT_NOT_FOUND',
          statusCode:
            404,
        }
      );
    }

    if (!document.file_path) {
      throw new AIServiceError(
        'Belgenin dosya yolu bulunamadı.',
        {
          code:
            'DOCUMENT_FILE_PATH_MISSING',
          statusCode:
            422,
        }
      );
    }

    try {
      /*
       * Belge depolaması artık Neon Object Storage (S3) kullanıyor.
       * documentService.download hem s3:documents/... referanslarını
       * bucket'tan okur hem de eski lokal belgeler için fallback sağlar.
       *
       * AI servisi storage tipini bilmez; yalnızca yetki kontrollü stream'i
       * Buffer'a dönüştürür.
       */
      const stream =
        await documentService.download(
          document.id,
          actorContext
        );

      if (!stream) {
        throw new AIServiceError(
          'Belge dosyası depolama alanında bulunamadı.',
          {
            code:
              'DOCUMENT_FILE_NOT_FOUND',
            statusCode:
              404,
          }
        );
      }

      const chunks = [];

      for await (
        const chunk of stream
      ) {
        chunks.push(
          Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk)
        );
      }

      const buffer =
        Buffer.concat(chunks);

      if (buffer.length === 0) {
        throw new AIServiceError(
          'Belge dosyası boş.',
          {
            code:
              'EMPTY_DOCUMENT_FILE',
            statusCode:
              422,
          }
        );
      }

      return {
        buffer,
      };
    } catch (error) {
      if (
        error instanceof
        AIServiceError
      ) {
        throw error;
      }

      const message =
        String(
          error?.message ||
            ''
        );

      if (
        /file not found|no such key|nosuchkey|not found/i.test(
          message
        )
      ) {
        throw new AIServiceError(
          'Belge dosyası depolama alanında bulunamadı.',
          {
            code:
              'DOCUMENT_FILE_NOT_FOUND',
            statusCode:
              404,
            cause:
              error,
          }
        );
      }

      throw new AIServiceError(
        'Belge dosyası okunamadı.',
        {
          code:
            'DOCUMENT_FILE_READ_ERROR',
          statusCode:
            500,
          cause:
            error,
        }
      );
    }
  }

  createInputHash({
    buffer,
    text,
    operation,
    promptVersion,
  }) {
    const hash = crypto.createHash('sha256');

    hash.update(operation);
    hash.update(':');
    hash.update(promptVersion);

    if (buffer) {
      hash.update(buffer);
    }

    if (text) {
      hash.update(text);
    }

    return hash.digest('hex');
  }

  async findCachedAnalysis({
    analysisType,
    userId,
    documentId = null,
    caseId = null,
    inputHash,
  }) {
    return AIAnalysis.findOne({
      where: {
        user_id: userId,
        analysis_type: analysisType,
        status: 'completed',
        input_hash: inputHash,
        ...(documentId
          ? { document_id: documentId }
          : {}),
        ...(caseId ? { case_id: caseId } : {}),
      },
      order: [['created_at', 'DESC']],
    });
  }

  async createPendingAnalysis({
    analysisType,
    userId,
    inputHash,
    documentId = null,
    caseId = null,
    metadata = {},
  }) {
    return AIAnalysis.create({
      document_id: documentId,
      case_id: caseId,
      user_id: userId,
      analysis_type: analysisType,
      provider: 'openai',
      model: config.OPENAI_MODEL,
      status: 'pending',
      input_hash: inputHash,
      prompt_version: PROMPT_VERSION,
      metadata,
    });
  }

  async completeAnalysis({
    analysis,
    providerResult,
    confidence = null,
    metadata,
  }) {
    await analysis.update({
      status: 'completed',
      model: providerResult.model,
      openai_response_id: providerResult.responseId,
      confidence:
        typeof confidence === 'number'
          ? confidence
          : null,
      duration_ms: providerResult.durationMs,
      input_tokens:
        providerResult.usage?.inputTokens || 0,
      output_tokens:
        providerResult.usage?.outputTokens || 0,
      total_tokens:
        providerResult.usage?.totalTokens || 0,
      result: providerResult.output,
      error_message: null,
      metadata: metadata || analysis.metadata || {},
    });

    return analysis;
  }

  async failAnalysis(analysis, error) {
    try {
      await analysis.update({
        status: 'failed',
        error_message: this.getSafeErrorMessage(error),
        metadata: {
          ...(analysis.metadata || {}),
          errorCode:
            error?.code || 'AI_PROCESSING_ERROR',
          retryable:
            error?.retryable === true,
          requestId:
            error?.requestId || null,
        },
      });
    } catch (updateError) {
      logger.error(
        'Başarısız AI analiz kaydı güncellenemedi',
        {
          analysisId: analysis?.id,
          message: updateError.message,
        }
      );
    }
  }

  formatAnalysisResponse(analysis, cached) {
    const plain =
      typeof analysis.toJSON === 'function'
        ? analysis.toJSON()
        : analysis;

    return {
      id: plain.id,
      type: plain.analysis_type,
      status: plain.status,
      result: plain.result,
      confidence: plain.confidence,
      model: plain.model,
      usage: {
        inputTokens: plain.input_tokens || 0,
        outputTokens: plain.output_tokens || 0,
        totalTokens: plain.total_tokens || 0,
      },
      durationMs: plain.duration_ms,
      documentId: plain.document_id,
      caseId: plain.case_id,
      promptVersion: plain.prompt_version,
      cached,
      createdAt:
        plain.created_at ||
        plain.createdAt ||
        null,
      updatedAt:
        plain.updated_at ||
        plain.updatedAt ||
        null,
    };
  }

  removeSensitiveFields(value) {
    if (Array.isArray(value)) {
      return value.map((item) =>
        this.removeSensitiveFields(item)
      );
    }

    if (
      !value ||
      typeof value !== 'object' ||
      value instanceof Date
    ) {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_KEYS.has(key))
        .map(([key, nestedValue]) => [
          key,
          this.removeSensitiveFields(nestedValue),
        ])
    );
  }

  validateRequiredText(
    value,
    fieldName,
    maxLength
  ) {
    if (
      typeof value !== 'string' ||
      value.trim().length === 0
    ) {
      throw new AIServiceError(
        `${fieldName} alanı zorunludur.`,
        {
          code: 'VALIDATION_ERROR',
          statusCode: 400,
        }
      );
    }

    if (value.length > maxLength) {
      throw new AIServiceError(
        `${fieldName} alanı en fazla ${maxLength} karakter olabilir.`,
        {
          code: 'INPUT_TOO_LARGE',
          statusCode: 413,
        }
      );
    }
  }

  validateOptionalText(
    value,
    fieldName,
    maxLength
  ) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return;
    }

    if (typeof value !== 'string') {
      throw new AIServiceError(
        `${fieldName} metin olmalıdır.`,
        {
          code: 'VALIDATION_ERROR',
          statusCode: 400,
        }
      );
    }

    if (value.length > maxLength) {
      throw new AIServiceError(
        `${fieldName} alanı en fazla ${maxLength} karakter olabilir.`,
        {
          code: 'INPUT_TOO_LARGE',
          statusCode: 413,
        }
      );
    }
  }

  validateUuidLike(value, fieldName) {
    if (
      typeof value !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      )
    ) {
      throw new AIServiceError(
        `Geçerli bir ${fieldName} zorunludur.`,
        {
          code: 'INVALID_IDENTIFIER',
          statusCode: 400,
        }
      );
    }
  }

  getSafeErrorMessage(error) {
    if (
      error instanceof AIProviderError ||
      error instanceof AIServiceError
    ) {
      return error.message;
    }

    return 'Yapay zekâ işlemi sırasında beklenmeyen bir hata oluştu.';
  }

  normalizeServiceError(error, fallbackMessage) {
    if (error instanceof AIServiceError) {
      return error;
    }

    if (error instanceof AIProviderError) {
      return new AIServiceError(error.message, {
        code: error.code,
        statusCode: error.statusCode,
        cause: error,
      });
    }

    logger.error('Beklenmeyen AI service hatası', {
      name: error?.name,
      message: error?.message,
      stack:
        config.NODE_ENV === 'development'
          ? error?.stack
          : undefined,
    });

    return new AIServiceError(fallbackMessage, {
      code: 'AI_PROCESSING_ERROR',
      statusCode: 500,
      cause: error,
    });
  }
}

export const aiService = new AIService();

export default aiService;