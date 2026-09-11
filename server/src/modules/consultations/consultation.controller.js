import { consultationService } from './consultation.service.js';

const FIELD_FALLBACKS =
  Object.freeze({
    title:
      'Danışmanlık başlığını kontrol edin.',
    legal_area:
      'Hukuk alanını kontrol edin.',
    consultation_type:
      'Danışmanlık türünü kontrol edin.',
    consultation_mode:
      'Görüşme şeklini kontrol edin.',
    service_model:
      'Hizmet modelini kontrol edin.',
    priority:
      'Öncelik bilgisini kontrol edin.',
    billing_type:
      'Ücretlendirme türünü kontrol edin.',
    agreed_fee:
      'Ücret bilgisini kontrol edin.',
    currency:
      'Para birimini kontrol edin.',
    prospect_name:
      'Potansiyel kişi adını kontrol edin.',
    prospect_email:
      'E-posta adresini kontrol edin.',
    prospect_phone:
      'Telefon bilgisini kontrol edin.',
    client_id:
      'Müvekkil bilgisini kontrol edin.',
    assignees:
      'Sorumlu kullanıcıları kontrol edin.',
    assigned_to:
      'Davaya atanacak avukatı kontrol edin.',
    court_name:
      'Mahkeme adını kontrol edin.',
    case_number:
      'Dosya / esas numarasını kontrol edin.',
    opening_date:
      'Dava açılış tarihini kontrol edin.',
  });

const LEGACY_ERROR_MAP =
  Object.freeze({
    'Consultation not found': {
      statusCode:
        404,
      message:
        'Danışmanlık kaydı bulunamadı.',
    },

    'Client not found': {
      statusCode:
        404,
      message:
        'Müvekkil kaydı bulunamadı veya bu kayda erişim yetkiniz yok.',
    },

    'Assignee not found': {
      statusCode:
        400,
      message:
        'Seçilen sorumlu kullanıcı bulunamadı veya artık atanabilir değil.',
    },

    'Case assignee not found': {
      statusCode:
        400,
      message:
        'Seçilen avukat bulunamadı veya artık davaya atanabilir değil.',
    },

    'Assignee already assigned': {
      statusCode:
        409,
      message:
        'Bu kullanıcı zaten danışmanlığa atanmış.',
    },

    'Consultation assignees must be an array': {
      statusCode:
        400,
      message:
        'Sorumlu kullanıcı bilgileri geçersiz formatta.',
    },

    'At least one consultation assignee is required': {
      statusCode:
        400,
      message:
        'En az bir sorumlu seçilmelidir.',
    },
  });

const TECHNICAL_MESSAGE_REGEX =
  /sequelize|validation\s+(?:len|notempty|notnull|isin|is_in)|constraint|foreign key|unique constraint|duplicate key|invalid input syntax|syntax error|stack trace|internal server error|econn|socket|request failed with status code|cannot read propert|undefined is not|null value in column|not-null violation|2350\d|22p02|transaction is required/i;

const getValidationItem = (
  error
) => {
  if (
    !Array.isArray(
      error?.errors
    )
  ) {
    return null;
  }

  return (
    error.errors.find(
      (item) =>
        String(
          item?.message ||
          ''
        ).trim()
    ) ||
    null
  );
};

const getStatusCode = (
  error,
  rawMessage
) => {
  const explicit =
    Number(
      error?.statusCode ||
      error?.status
    );

  if (
    Number.isInteger(
      explicit
    ) &&
    explicit >=
      400 &&
    explicit <=
      599
  ) {
    return explicit;
  }

  const legacy =
    LEGACY_ERROR_MAP[
      rawMessage
    ];

  if (
    legacy
  ) {
    return legacy.statusCode;
  }

  if (
    error?.name ===
    'SequelizeUniqueConstraintError'
  ) {
    return 409;
  }

  if (
    error?.name ===
      'SequelizeValidationError' ||
    error?.name ===
      'SequelizeForeignKeyConstraintError'
  ) {
    return 400;
  }

  if (
    error?.name ===
      'SequelizeDatabaseError' ||
    TECHNICAL_MESSAGE_REGEX.test(
      rawMessage
    )
  ) {
    return 500;
  }

  if (
    /not found/i.test(
      rawMessage
    )
  ) {
    return 404;
  }

  return 400;
};

const getSafeValidationMessage = (
  item
) => {
  const rawMessage =
    String(
      item?.message ||
      ''
    ).trim();

  const field =
    String(
      item?.path ||
      item?.field ||
      ''
    ).trim();

  if (
    rawMessage &&
    !TECHNICAL_MESSAGE_REGEX.test(
      rawMessage
    ) &&
    !/^validation error:/i.test(
      rawMessage
    )
  ) {
    return {
      field:
        field ||
        null,

      message:
        rawMessage,
    };
  }

  return {
    field:
      field ||
      null,

    message:
      FIELD_FALLBACKS[
        field
      ] ||
      'Formdaki bazı bilgiler geçersiz. Lütfen alanları kontrol edin.',
  };
};

const normalizeControllerError = (
  error
) => {
  const sourceError =
    error instanceof Error
      ? error
      : new Error(
          'Danışmanlık işlemi gerçekleştirilemedi.'
        );

  const rawMessage =
    String(
      sourceError.message ||
      ''
    ).trim();

  const statusCode =
    getStatusCode(
      sourceError,
      rawMessage
    );

  const validationItem =
    getValidationItem(
      sourceError
    );

  let field =
    null;

  let safeMessage =
    '';

  if (
    validationItem
  ) {
    const validation =
      getSafeValidationMessage(
        validationItem
      );

    field =
      validation.field;

    safeMessage =
      validation.message;
  }

  if (
    !safeMessage &&
    LEGACY_ERROR_MAP[
      rawMessage
    ]
  ) {
    safeMessage =
      LEGACY_ERROR_MAP[
        rawMessage
      ].message;
  }

  if (
    !safeMessage &&
    /^validation error:\s*/i.test(
      rawMessage
    )
  ) {
    const cleaned =
      rawMessage.replace(
        /^validation error:\s*/i,
        ''
      ).trim();

    safeMessage =
      cleaned &&
      !TECHNICAL_MESSAGE_REGEX.test(
        cleaned
      )
        ? cleaned
        : 'Formdaki bazı bilgiler geçersiz. Lütfen alanları kontrol edin.';
  }

  if (
    !safeMessage &&
    statusCode <
      500 &&
    rawMessage &&
    !TECHNICAL_MESSAGE_REGEX.test(
      rawMessage
    )
  ) {
    safeMessage =
      rawMessage;
  }

  if (
    statusCode >=
    500
  ) {
    safeMessage =
      'Danışmanlık işlemi sırasında bir sorun oluştu. Lütfen tekrar deneyin.';
  }

  if (
    !safeMessage
  ) {
    safeMessage =
      'Danışmanlık işlemi gerçekleştirilemedi. Lütfen bilgileri kontrol edip tekrar deneyin.';
  }

  const normalizedError =
    new Error(
      safeMessage,
      {
        cause:
          sourceError,
      }
    );

  normalizedError.statusCode =
    statusCode;

  if (
    field
  ) {
    normalizedError.field =
      field;

    normalizedError.errors = [
      {
        field,
        path:
          field,
        message:
          safeMessage,
        msg:
          safeMessage,
      },
    ];
  }

  return normalizedError;
};

const ok = (
  res,
  data,
  message = null
) => {
  return res
    .status(
      200
    )
    .json({
      success:
        true,

      ...(message
        ? {
            message,
          }
        : {}),

      data,
    });
};

export const consultationController = {
  async getAssignableUsers(
    req,
    res,
    next
  ) {
    try {
      return ok(
        res,
        await consultationService
          .getAssignableUsers()
      );
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async create(
    req,
    res,
    next
  ) {
    try {
      const data =
        await consultationService
          .create(
            req.body,
            req.user
          );

      return res
        .status(
          201
        )
        .json({
          success:
            true,

          message:
            'Danışmanlık oluşturuldu',

          data,
        });
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async findAll(
    req,
    res,
    next
  ) {
    try {
      const result =
        await consultationService
          .findAll({
            ...req.query,
            actor:
              req.user,
          });

      return res
        .status(
          200
        )
        .json({
          success:
            true,

          data:
            result.data,

          pagination:
            result.pagination,
        });
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async findOne(
    req,
    res,
    next
  ) {
    try {
      return ok(
        res,
        await consultationService
          .findOne(
            req.params.id,
            req.user
          )
      );
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async update(
    req,
    res,
    next
  ) {
    try {
      return ok(
        res,
        await consultationService
          .update(
            req.params.id,
            req.body,
            req.user
          ),
        'Danışmanlık güncellendi'
      );
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async remove(
    req,
    res,
    next
  ) {
    try {
      await consultationService
        .remove(
          req.params.id,
          req.user
        );

      return res
        .status(
          200
        )
        .json({
          success:
            true,

          message:
            'Danışmanlık silindi',
        });
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async updateStatus(
    req,
    res,
    next
  ) {
    try {
      return ok(
        res,
        await consultationService
          .updateStatus(
            req.params.id,
            req.body.status,
            req.user
          ),
        'Danışmanlık durumu güncellendi'
      );
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async addAssignee(
    req,
    res,
    next
  ) {
    try {
      return ok(
        res,
        await consultationService
          .addAssignee(
            req.params.id,
            req.body,
            req.user
          ),
        'Sorumlu eklendi'
      );
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async removeAssignee(
    req,
    res,
    next
  ) {
    try {
      return ok(
        res,
        await consultationService
          .removeAssignee(
            req.params.id,
            req.params.userId,
            req.user
          ),
        'Sorumlu kaldırıldı'
      );
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async getTasks(
    req,
    res,
    next
  ) {
    try {
      return ok(
        res,
        await consultationService
          .getTasks(
            req.params.id,
            req.user
          )
      );
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async getMeetings(
    req,
    res,
    next
  ) {
    try {
      return ok(
        res,
        await consultationService
          .getMeetings(
            req.params.id,
            req.user
          )
      );
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async getDocuments(
    req,
    res,
    next
  ) {
    try {
      return ok(
        res,
        await consultationService
          .getDocuments(
            req.params.id,
            req.user
          )
      );
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async getNotes(
    req,
    res,
    next
  ) {
    try {
      return ok(
        res,
        await consultationService
          .getNotes(
            req.params.id,
            req.user
          )
      );
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async addNote(
    req,
    res,
    next
  ) {
    try {
      const data =
        await consultationService
          .addNote(
            req.params.id,
            req.body,
            req.user
          );

      return res
        .status(
          201
        )
        .json({
          success:
            true,

          message:
            'Not eklendi',

          data,
        });
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async convertToClient(
    req,
    res,
    next
  ) {
    try {
      return ok(
        res,
        await consultationService
          .convertToClient(
            req.params.id,
            req.body,
            req.user
          ),
        'Talep sahibi müvekkile dönüştürüldü'
      );
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async convertToCase(
    req,
    res,
    next
  ) {
    try {
      return ok(
        res,
        await consultationService
          .convertToCase(
            req.params.id,
            req.body,
            req.user
          ),
        'Danışmanlık davaya dönüştürüldü'
      );
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },

  async getStatistics(
    req,
    res,
    next
  ) {
    try {
      return ok(
        res,
        await consultationService
          .getStatistics(
            req.user
          )
      );
    } catch (
      error
    ) {
      return next(
        normalizeControllerError(
          error
        )
      );
    }
  },
};

export default consultationController;
