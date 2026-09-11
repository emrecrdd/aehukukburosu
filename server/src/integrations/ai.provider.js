import OpenAI from 'openai';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

export class AIProviderError extends Error {
  constructor(
    message,
    {
      code = 'AI_PROVIDER_ERROR',
      statusCode = 500,
      retryable = false,
      cause = null,
      requestId = null,
    } = {}
  ) {
    super(message);

    this.name = 'AIProviderError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.requestId = requestId;

    if (cause) {
      this.cause = cause;
    }

    Error.captureStackTrace?.(this, AIProviderError);
  }
}

class AIProvider {
  constructor() {
    this.client = null;

    this.enabled =
      config.OPENAI_ENABLED === true &&
      Boolean(config.OPENAI_API_KEY);

    if (!this.enabled) {
      logger.warn(
        'OpenAI devre dışı veya OPENAI_API_KEY tanımlanmamış.'
      );
      return;
    }

    this.client = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
      timeout: config.OPENAI_TIMEOUT_MS,
      maxRetries: config.OPENAI_MAX_RETRIES,
    });

    logger.info('OpenAI provider yapılandırıldı', {
      model: config.OPENAI_MODEL,
      timeoutMs: config.OPENAI_TIMEOUT_MS,
      maxRetries: config.OPENAI_MAX_RETRIES,
    });
  }

  isAvailable() {
    return this.enabled && this.client !== null;
  }

  async createTextResponse({
    instructions,
    input,
    model = config.OPENAI_MODEL,
    maxOutputTokens = config.OPENAI_MAX_OUTPUT_TOKENS,
    metadata,
    previousResponseId,
  }) {
    this.ensureAvailable();

    this.validateCommonInput({
      instructions,
      input,
      model,
      maxOutputTokens,
    });

    const startedAt = Date.now();

    try {
      const response = await this.client.responses.create({
        model,
        instructions,
        input,
        max_output_tokens: maxOutputTokens,
        ...(metadata
          ? { metadata: this.sanitizeMetadata(metadata) }
          : {}),
        ...(previousResponseId
          ? { previous_response_id: previousResponseId }
          : {}),
      });

      this.ensureResponseCompleted(response);

      const outputText = this.extractOutputText(response);

      const result = this.buildResult({
        response,
        output: outputText,
        model,
        startedAt,
      });

      logger.info('OpenAI metin cevabı oluşturuldu', {
        responseId: result.responseId,
        model: result.model,
        durationMs: result.durationMs,
        usage: result.usage,
      });

      return result;
    } catch (error) {
      throw this.handleError(error, {
        operation: 'createTextResponse',
        model,
        startedAt,
      });
    }
  }

  async createStructuredResponse({
    instructions,
    input,
    schemaName,
    schema,
    schemaDescription,
    model = config.OPENAI_MODEL,
    maxOutputTokens = config.OPENAI_MAX_OUTPUT_TOKENS,
    metadata,
  }) {
    this.ensureAvailable();

    this.validateCommonInput({
      instructions,
      input,
      model,
      maxOutputTokens,
    });

    this.validateSchema({
      schemaName,
      schema,
    });

    const startedAt = Date.now();

    try {
      const response = await this.client.responses.create({
        model,
        instructions,
        input,
        max_output_tokens: maxOutputTokens,

        text: {
          format: {
            type: 'json_schema',
            name: this.normalizeSchemaName(schemaName),
            strict: true,
            schema,
            ...(schemaDescription
              ? { description: schemaDescription }
              : {}),
          },
        },

        ...(metadata
          ? { metadata: this.sanitizeMetadata(metadata) }
          : {}),
      });

      this.ensureResponseCompleted(response);

      const outputText = this.extractOutputText(response);
      const parsedOutput =
        this.parseStructuredOutput(outputText);

      const result = this.buildResult({
        response,
        output: parsedOutput,
        model,
        startedAt,
      });

      logger.info('OpenAI structured cevabı oluşturuldu', {
        responseId: result.responseId,
        model: result.model,
        schemaName,
        durationMs: result.durationMs,
        usage: result.usage,
      });

      return result;
    } catch (error) {
      throw this.handleError(error, {
        operation: 'createStructuredResponse',
        model,
        schemaName,
        startedAt,
      });
    }
  }

  async createFileResponse({
    fileId,
    instructions,
    prompt,
    model = config.OPENAI_MODEL,
    maxOutputTokens = config.OPENAI_MAX_OUTPUT_TOKENS,
    metadata,
  }) {
    this.ensureAvailable();

    this.validateFileInput({
      fileId,
      prompt,
    });

    const startedAt = Date.now();

    try {
      const response = await this.client.responses.create({
        model,
        instructions,

        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_file',
                file_id: fileId,
              },
              {
                type: 'input_text',
                text: prompt,
              },
            ],
          },
        ],

        max_output_tokens: maxOutputTokens,

        ...(metadata
          ? { metadata: this.sanitizeMetadata(metadata) }
          : {}),
      });

      this.ensureResponseCompleted(response);

      const result = this.buildResult({
        response,
        output: this.extractOutputText(response),
        model,
        startedAt,
      });

      logger.info('OpenAI dosya cevabı oluşturuldu', {
        responseId: result.responseId,
        fileId,
        model: result.model,
        durationMs: result.durationMs,
        usage: result.usage,
      });

      return result;
    } catch (error) {
      throw this.handleError(error, {
        operation: 'createFileResponse',
        model,
        fileId,
        startedAt,
      });
    }
  }

  async createStructuredFileResponse({
    fileId,
    instructions,
    prompt,
    schemaName,
    schema,
    schemaDescription,
    model = config.OPENAI_MODEL,
    maxOutputTokens = config.OPENAI_MAX_OUTPUT_TOKENS,
    metadata,
  }) {
    this.ensureAvailable();

    this.validateFileInput({
      fileId,
      prompt,
    });

    this.validateSchema({
      schemaName,
      schema,
    });

    const startedAt = Date.now();

    try {
      const response = await this.client.responses.create({
        model,
        instructions,

        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_file',
                file_id: fileId,
              },
              {
                type: 'input_text',
                text: prompt,
              },
            ],
          },
        ],

        text: {
          format: {
            type: 'json_schema',
            name: this.normalizeSchemaName(schemaName),
            strict: true,
            schema,
            ...(schemaDescription
              ? { description: schemaDescription }
              : {}),
          },
        },

        max_output_tokens: maxOutputTokens,

        ...(metadata
          ? { metadata: this.sanitizeMetadata(metadata) }
          : {}),
      });

      this.ensureResponseCompleted(response);

      const outputText = this.extractOutputText(response);
      const parsedOutput =
        this.parseStructuredOutput(outputText);

      const result = this.buildResult({
        response,
        output: parsedOutput,
        model,
        startedAt,
      });

      logger.info(
        'OpenAI structured dosya cevabı oluşturuldu',
        {
          responseId: result.responseId,
          fileId,
          model: result.model,
          schemaName,
          durationMs: result.durationMs,
          usage: result.usage,
        }
      );

      return result;
    } catch (error) {
      throw this.handleError(error, {
        operation: 'createStructuredFileResponse',
        model,
        schemaName,
        fileId,
        startedAt,
      });
    }
  }

  async createStructuredImageResponse({
    fileId,
    instructions,
    prompt,
    schemaName,
    schema,
    schemaDescription,
    detail = 'auto',
    model = config.OPENAI_MODEL,
    maxOutputTokens = config.OPENAI_MAX_OUTPUT_TOKENS,
    metadata,
  }) {
    this.ensureAvailable();

    this.validateFileInput({
      fileId,
      prompt,
    });

    this.validateSchema({
      schemaName,
      schema,
    });

    const allowedDetails = new Set([
      'auto',
      'low',
      'high',
    ]);

    if (!allowedDetails.has(detail)) {
      throw new AIProviderError(
        'Geçersiz görsel detay seviyesi.',
        {
          code: 'INVALID_IMAGE_DETAIL',
          statusCode: 400,
        }
      );
    }

    const startedAt = Date.now();

    try {
      const response = await this.client.responses.create({
        model,
        instructions,

        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: prompt,
              },
              {
                type: 'input_image',
                file_id: fileId,
                detail,
              },
            ],
          },
        ],

        text: {
          format: {
            type: 'json_schema',
            name: this.normalizeSchemaName(schemaName),
            strict: true,
            schema,
            ...(schemaDescription
              ? { description: schemaDescription }
              : {}),
          },
        },

        max_output_tokens: maxOutputTokens,

        ...(metadata
          ? { metadata: this.sanitizeMetadata(metadata) }
          : {}),
      });

      this.ensureResponseCompleted(response);

      const outputText = this.extractOutputText(response);
      const parsedOutput =
        this.parseStructuredOutput(outputText);

      const result = this.buildResult({
        response,
        output: parsedOutput,
        model,
        startedAt,
      });

      logger.info(
        'OpenAI structured görsel cevabı oluşturuldu',
        {
          responseId: result.responseId,
          fileId,
          model: result.model,
          schemaName,
          detail,
          durationMs: result.durationMs,
          usage: result.usage,
        }
      );

      return result;
    } catch (error) {
      throw this.handleError(error, {
        operation: 'createStructuredImageResponse',
        model,
        schemaName,
        fileId,
        startedAt,
      });
    }
  }

  async uploadFile({
    buffer,
    filename,
    mimeType = 'application/octet-stream',
    purpose = 'user_data',
  }) {
    this.ensureAvailable();

    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new AIProviderError(
        'OpenAI dosya yüklemesi için geçerli bir buffer zorunludur.',
        {
          code: 'INVALID_FILE_BUFFER',
          statusCode: 400,
        }
      );
    }

    if (
      !filename ||
      typeof filename !== 'string'
    ) {
      throw new AIProviderError(
        'OpenAI dosya yüklemesi için filename zorunludur.',
        {
          code: 'INVALID_FILENAME',
          statusCode: 400,
        }
      );
    }

    if (
      !purpose ||
      typeof purpose !== 'string'
    ) {
      throw new AIProviderError(
        'OpenAI dosya yükleme amacı geçerli olmalıdır.',
        {
          code: 'INVALID_FILE_PURPOSE',
          statusCode: 400,
        }
      );
    }

    const startedAt = Date.now();

    try {
      const file = await OpenAI.toFile(
        buffer,
        filename,
        {
          type: mimeType,
        }
      );

      const uploadedFile =
        await this.client.files.create({
          file,
          purpose,
        });

      logger.info(
        'Dosya OpenAI sistemine yüklendi',
        {
          fileId: uploadedFile.id,
          filename,
          bytes: uploadedFile.bytes,
          purpose,
          durationMs: Date.now() - startedAt,
        }
      );

      return {
        id: uploadedFile.id,
        filename: uploadedFile.filename,
        bytes: uploadedFile.bytes,
        purpose: uploadedFile.purpose,
        status: uploadedFile.status,
        createdAt: uploadedFile.created_at
          ? new Date(
              uploadedFile.created_at * 1000
            ).toISOString()
          : null,
      };
    } catch (error) {
      throw this.handleError(error, {
        operation: 'uploadFile',
        filename,
        startedAt,
      });
    }
  }

  async deleteFile(fileId) {
    this.ensureAvailable();

    if (
      !fileId ||
      typeof fileId !== 'string'
    ) {
      return false;
    }

    try {
      await this.client.files.delete(fileId);

      logger.info('OpenAI dosyası silindi', {
        fileId,
      });

      return true;
    } catch (error) {
      logger.warn('OpenAI dosyası silinemedi', {
        fileId,
        error: error.message,
      });

      return false;
    }
  }

  async healthCheck() {
    if (!this.isAvailable()) {
      return {
        healthy: false,
        enabled: false,
        model: config.OPENAI_MODEL,
        message: 'OpenAI provider devre dışı.',
      };
    }

    const startedAt = Date.now();

    try {
      const response =
        await this.client.responses.create({
          model: config.OPENAI_MODEL,
          input: 'Yalnızca OK yaz.',
          max_output_tokens: 20,
        });

      this.ensureResponseCompleted(response);

      return {
        healthy: this.extractOutputText(response)
          .trim()
          .toUpperCase()
          .includes('OK'),
        enabled: true,
        model:
          response.model ||
          config.OPENAI_MODEL,
        responseId: response.id || null,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      logger.error(
        'OpenAI health check başarısız',
        {
          message: error.message,
          status: error.status,
        }
      );

      return {
        healthy: false,
        enabled: true,
        model: config.OPENAI_MODEL,
        durationMs: Date.now() - startedAt,
        message:
          'OpenAI bağlantı kontrolü başarısız.',
      };
    }
  }

  ensureAvailable() {
    if (!config.OPENAI_ENABLED) {
      throw new AIProviderError(
        'Yapay zekâ özellikleri devre dışı bırakılmış.',
        {
          code: 'AI_DISABLED',
          statusCode: 503,
          retryable: false,
        }
      );
    }

    if (
      !this.client ||
      !config.OPENAI_API_KEY
    ) {
      throw new AIProviderError(
        'OpenAI servisi yapılandırılmamış.',
        {
          code: 'AI_NOT_CONFIGURED',
          statusCode: 503,
          retryable: false,
        }
      );
    }
  }

  validateCommonInput({
    instructions,
    input,
    model,
    maxOutputTokens,
  }) {
    if (
      typeof instructions !== 'string' ||
      instructions.trim().length === 0
    ) {
      throw new AIProviderError(
        'OpenAI instructions alanı zorunludur.',
        {
          code: 'INVALID_AI_INSTRUCTIONS',
          statusCode: 500,
        }
      );
    }

    if (
      input === undefined ||
      input === null ||
      (
        typeof input === 'string' &&
        input.trim().length === 0
      )
    ) {
      throw new AIProviderError(
        'OpenAI input alanı zorunludur.',
        {
          code: 'INVALID_AI_INPUT',
          statusCode: 400,
        }
      );
    }

    if (
      !model ||
      typeof model !== 'string'
    ) {
      throw new AIProviderError(
        'Geçerli bir OpenAI modeli zorunludur.',
        {
          code: 'INVALID_AI_MODEL',
          statusCode: 500,
        }
      );
    }

    if (
      !Number.isInteger(maxOutputTokens) ||
      maxOutputTokens < 1
    ) {
      throw new AIProviderError(
        'maxOutputTokens pozitif bir tam sayı olmalıdır.',
        {
          code: 'INVALID_MAX_OUTPUT_TOKENS',
          statusCode: 500,
        }
      );
    }
  }

  validateFileInput({
    fileId,
    prompt,
  }) {
    if (
      !fileId ||
      typeof fileId !== 'string'
    ) {
      throw new AIProviderError(
        'Geçerli bir OpenAI fileId zorunludur.',
        {
          code: 'INVALID_FILE_ID',
          statusCode: 400,
        }
      );
    }

    if (
      !prompt ||
      typeof prompt !== 'string'
    ) {
      throw new AIProviderError(
        'Dosya analizi promptu zorunludur.',
        {
          code: 'INVALID_FILE_PROMPT',
          statusCode: 400,
        }
      );
    }
  }

  validateSchema({
    schemaName,
    schema,
  }) {
    if (
      typeof schemaName !== 'string' ||
      schemaName.trim().length === 0
    ) {
      throw new AIProviderError(
        'Structured output için schemaName zorunludur.',
        {
          code: 'INVALID_SCHEMA_NAME',
          statusCode: 500,
        }
      );
    }

    if (
      !schema ||
      typeof schema !== 'object' ||
      Array.isArray(schema)
    ) {
      throw new AIProviderError(
        'Structured output için geçerli bir JSON Schema zorunludur.',
        {
          code: 'INVALID_JSON_SCHEMA',
          statusCode: 500,
        }
      );
    }
  }

  ensureResponseCompleted(response) {
    const status = response?.status;

    if (status === 'completed') {
      return;
    }

    if (status === 'incomplete') {
      const reason =
        response?.incomplete_details?.reason ||
        'unknown';

      if (reason === 'max_output_tokens') {
        throw new AIProviderError(
          'Yapay zekâ cevabı çıktı token sınırına ulaştığı için tamamlanamadı.',
          {
            code: 'AI_OUTPUT_TOKEN_LIMIT',
            statusCode: 502,
            retryable: true,
            requestId: response?.id || null,
          }
        );
      }

      if (reason === 'content_filter') {
        throw new AIProviderError(
          'Yapay zekâ cevabı güvenlik filtresi nedeniyle tamamlanamadı.',
          {
            code: 'AI_CONTENT_FILTERED',
            statusCode: 422,
            retryable: false,
            requestId: response?.id || null,
          }
        );
      }

      throw new AIProviderError(
        `Yapay zekâ cevabı tamamlanamadı. Sebep: ${reason}`,
        {
          code: 'AI_INCOMPLETE_RESPONSE',
          statusCode: 502,
          retryable: true,
          requestId: response?.id || null,
        }
      );
    }

    if (status === 'failed') {
      throw new AIProviderError(
        response?.error?.message ||
          'OpenAI cevabı başarısız durumunda döndü.',
        {
          code:
            response?.error?.code ||
            'AI_RESPONSE_FAILED',
          statusCode: 502,
          retryable: true,
          requestId: response?.id || null,
        }
      );
    }

    if (status === 'cancelled') {
      throw new AIProviderError(
        'Yapay zekâ isteği iptal edildi.',
        {
          code: 'AI_RESPONSE_CANCELLED',
          statusCode: 502,
          retryable: true,
          requestId: response?.id || null,
        }
      );
    }

    if (
      !status &&
      typeof response?.output_text === 'string' &&
      response.output_text.trim()
    ) {
      return;
    }

    throw new AIProviderError(
      `Yapay zekâ beklenmeyen bir cevap durumu döndürdü: ${
        status || 'unknown'
      }`,
      {
        code: 'AI_UNEXPECTED_RESPONSE_STATUS',
        statusCode: 502,
        retryable: true,
        requestId: response?.id || null,
      }
    );
  }

  extractOutputText(response) {
    const outputText = response?.output_text;

    if (
      typeof outputText === 'string' &&
      outputText.trim()
    ) {
      return outputText.trim();
    }

    const fallbackText = response?.output
      ?.flatMap(
        (item) => item?.content || []
      )
      ?.filter(
        (content) =>
          content?.type === 'output_text'
      )
      ?.map(
        (content) => content?.text
      )
      ?.filter(Boolean)
      ?.join('\n')
      ?.trim();

    if (fallbackText) {
      return fallbackText;
    }

    const refusal = response?.output
      ?.flatMap(
        (item) => item?.content || []
      )
      ?.find(
        (content) =>
          content?.type === 'refusal'
      );

    if (refusal?.refusal) {
      throw new AIProviderError(
        'Model güvenlik nedeniyle bu isteğe cevap vermedi.',
        {
          code: 'AI_REFUSAL',
          statusCode: 422,
          retryable: false,
          requestId: response?.id || null,
        }
      );
    }

    throw new AIProviderError(
      'OpenAI boş veya okunamayan bir cevap döndürdü.',
      {
        code: 'EMPTY_AI_RESPONSE',
        statusCode: 502,
        retryable: true,
        requestId: response?.id || null,
      }
    );
  }

  parseStructuredOutput(outputText) {
    try {
      return JSON.parse(outputText);
    } catch (error) {
      logger.error(
        'Structured AI cevabı JSON olarak ayrıştırılamadı',
        {
          outputPreview:
            outputText.slice(0, 500),
        }
      );

      throw new AIProviderError(
        'Yapay zekâ cevabı beklenen JSON formatında değil.',
        {
          code: 'INVALID_AI_JSON',
          statusCode: 502,
          retryable: true,
          cause: error,
        }
      );
    }
  }

  buildResult({
    response,
    output,
    model,
    startedAt,
  }) {
    return {
      output,
      responseId: response?.id || null,
      model:
        response?.model || model,
      status:
        response?.status || null,
      usage:
        this.normalizeUsage(
          response?.usage
        ),
      durationMs:
        Date.now() - startedAt,
      createdAt:
        new Date().toISOString(),
    };
  }

  normalizeUsage(usage) {
    if (!usage) {
      return {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      };
    }

    return {
      inputTokens:
        usage.input_tokens || 0,
      outputTokens:
        usage.output_tokens || 0,
      totalTokens:
        usage.total_tokens || 0,
      inputDetails:
        usage.input_tokens_details ||
        null,
      outputDetails:
        usage.output_tokens_details ||
        null,
    };
  }

  sanitizeMetadata(metadata) {
    if (
      !metadata ||
      typeof metadata !== 'object'
    ) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(metadata)
        .filter(
          ([key, value]) =>
            typeof key === 'string' &&
            key.length <= 64 &&
            value !== undefined &&
            value !== null
        )
        .slice(0, 16)
        .map(([key, value]) => [
          key,
          String(value).slice(0, 512),
        ])
    );
  }

  normalizeSchemaName(name) {
    return name
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9_-]/g,
        '_'
      )
      .slice(0, 64);
  }

  handleError(error, context = {}) {
    if (error instanceof AIProviderError) {
      return error;
    }

    const status =
      Number(error?.status) || 500;

    const requestId =
      error?.request_id ||
      error?.headers?.['x-request-id'] ||
      null;

    const durationMs =
      context.startedAt
        ? Date.now() - context.startedAt
        : null;

    logger.error(
      'OpenAI provider hatası',
      {
        operation: context.operation,
        model: context.model,
        schemaName: context.schemaName,
        fileId: context.fileId,
        filename: context.filename,
        status,
        requestId,
        durationMs,
        errorType: error?.type,
        errorCode: error?.code,
        message: error?.message,
      }
    );

    if (status === 400) {
      return new AIProviderError(
        'Yapay zekâ isteği geçersiz bulundu.',
        {
          code: 'AI_BAD_REQUEST',
          statusCode: 400,
          retryable: false,
          cause: error,
          requestId,
        }
      );
    }

    if (
      status === 401 ||
      status === 403
    ) {
      return new AIProviderError(
        'OpenAI kimlik doğrulaması başarısız.',
        {
          code: 'AI_AUTHENTICATION_ERROR',
          statusCode: 503,
          retryable: false,
          cause: error,
          requestId,
        }
      );
    }

    if (status === 404) {
      return new AIProviderError(
        'İstenen OpenAI modeli veya kaynağı bulunamadı.',
        {
          code: 'AI_RESOURCE_NOT_FOUND',
          statusCode: 503,
          retryable: false,
          cause: error,
          requestId,
        }
      );
    }

    if (status === 408) {
      return new AIProviderError(
        'Yapay zekâ isteği zaman aşımına uğradı.',
        {
          code: 'AI_TIMEOUT',
          statusCode: 504,
          retryable: true,
          cause: error,
          requestId,
        }
      );
    }

    if (status === 429) {
      return new AIProviderError(
        'Yapay zekâ kullanım limiti geçici olarak aşıldı.',
        {
          code: 'AI_RATE_LIMITED',
          statusCode: 429,
          retryable: true,
          cause: error,
          requestId,
        }
      );
    }

    if (status >= 500) {
      return new AIProviderError(
        'Yapay zekâ servisi geçici olarak kullanılamıyor.',
        {
          code: 'AI_UPSTREAM_ERROR',
          statusCode: 503,
          retryable: true,
          cause: error,
          requestId,
        }
      );
    }

    return new AIProviderError(
      'Yapay zekâ işlemi tamamlanamadı.',
      {
        code: 'AI_UNKNOWN_ERROR',
        statusCode: 500,
        retryable: false,
        cause: error,
        requestId,
      }
    );
  }
}

export const aiProvider = new AIProvider();

export default aiProvider;