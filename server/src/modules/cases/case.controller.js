import {
  caseService,
} from './case.service.js';

import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from '../../utils/response.js';

import {
  logger,
} from '../../config/logger.js';

import {
  AuditLog,
} from '../../models/AuditLog.js';

// ======================================================
// HELPERS
// ======================================================

const getAuditIp = (
  req
) => {
  return (
    req.realClientIp ||
    req.ip ||
    null
  );
};

const buildCaseCreateData = (
  req
) => {
  const title =
    req.body.title ||
    `${req.body.judiciary_type || 'Dava'} - ${
      req.body.judiciary_unit || 'Birim'
    }`;

  /*
   * Mass-assignment engeli.
   *
   * req.body doğrudan modele yayılmıyor.
   * Yalnız izin verilen alanlar alınır.
   */
  return {
    title,

    judiciary_type:
      req.body.judiciary_type ||
      null,

    judiciary_unit:
      req.body.judiciary_unit ||
      null,

    opening_date:
      req.body.opening_date ||
      null,

    court_name:
      req.body.court_name ||
      null,

    case_number:
      req.body.case_number ||
      null,

    subject:
      req.body.subject ||
      null,

    description:
      req.body.description ||
      null,

    status:
      req.body.status ||
      'preparation',

    priority:
      req.body.priority ||
      'normal',

    /*
     * created_by request body'den alınmaz.
     * Her zaman authenticated kullanıcıdır.
     */
    created_by:
      req.user.id,

    assigned_to:
      req.body.assigned_to ||
      null,

    client_ids:
      Array.isArray(
        req.body.client_ids
      )
        ? req.body.client_ids
        : [],
  };
};

const buildCaseUpdateData = (
  req
) => {
  const title =
    req.body.title ||
    `${req.body.judiciary_type || 'Dava'} - ${
      req.body.judiciary_unit || 'Birim'
    }`;

  /*
   * KRİTİK:
   *
   * Önceki kodda:
   *
   * {
   *   ...req.body
   * }
   *
   * vardı.
   *
   * Böylece created_by gibi internal alanlar
   * istemci tarafından değiştirilmeye çalışılabilirdi.
   *
   * Artık yalnız açıkça izin verilen alanlar var.
   */
  return {
    title,

    judiciary_type:
      req.body.judiciary_type ||
      null,

    judiciary_unit:
      req.body.judiciary_unit ||
      null,

    opening_date:
      req.body.opening_date ||
      null,

    court_name:
      req.body.court_name ||
      null,

    case_number:
      req.body.case_number ||
      null,

    subject:
      req.body.subject ||
      null,

    description:
      req.body.description ||
      null,

    status:
      req.body.status ||
      'preparation',

    priority:
      req.body.priority ||
      'normal',

    assigned_to:
      req.body.assigned_to ||
      null,

    client_ids:
      Array.isArray(
        req.body.client_ids
      )
        ? req.body.client_ids
        : [],
  };
};

// ======================================================
// CONTROLLER
// ======================================================

export const caseController = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    req,
    res
  ) {
    try {
      const caseData =
        buildCaseCreateData(
          req
        );

      /*
       * req.user ayrıca service'e aktarılıyor.
       *
       * Service BOLA enforcement eklendiğinde
       * actor üzerinden yetkilendirme yapacak.
       */
      const caseItem =
        await caseService.create(
          caseData,
          req.user
        );

      await AuditLog.create({
        action:
          'create',

        entity_type:
          'case',

        entity_id:
          caseItem.id,

        user_id:
          req.user.id,

        description:
          `"${caseItem.title}" davası oluşturuldu`,

        ip_address:
          getAuditIp(
            req
          ),

        user_agent:
          req.headers[
            'user-agent'
          ],
      });

      return successResponse(
        res,
        caseItem,
        'Case created successfully',
        201
      );
    } catch (
      error
    ) {
      logger.error(
        'Create case error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // FIND ALL
  // ====================================================

  async findAll(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
      } = req.query;

      const result =
        await caseService.findAll({
          page,
          limit,
          search,
          status,

          /*
           * BOLA scope için actor service'e taşınıyor.
           */
          actor:
            req.user,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Cases fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get cases error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // FIND ONE
  // ====================================================

  async findOne(
    req,
    res
  ) {
    try {
      const caseItem =
        await caseService.findOne(
          req.params.id,
          req.user
        );

      return successResponse(
        res,
        caseItem,
        'Case fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get case error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        404
      );
    }
  },

  // ====================================================
  // TAM GÜNCELLEME
  // ====================================================

  async update(
    req,
    res
  ) {
    try {
      const updateData =
        buildCaseUpdateData(
          req
        );

      const caseItem =
        await caseService.update(
          req.params.id,
          updateData,
          req.user
        );

      await AuditLog.create({
        action:
          'update',

        entity_type:
          'case',

        entity_id:
          caseItem.id,

        user_id:
          req.user.id,

        description:
          `"${caseItem.title}" davası güncellendi`,

        ip_address:
          getAuditIp(
            req
          ),

        user_agent:
          req.headers[
            'user-agent'
          ],
      });

      return successResponse(
        res,
        caseItem,
        'Case updated successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Update case error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // KISMİ / AI GÜNCELLEMESİ
  // ====================================================

  async patch(
    req,
    res
  ) {
    try {
      const allowedFields = [
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
        'assigned_to',
      ];

      const updateData =
        {};

      for (
        const field of
        allowedFields
      ) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body,
            field
          )
        ) {
          updateData[field] =
            req.body[field];
        }
      }

      if (
        Object.keys(
          updateData
        ).length ===
        0
      ) {
        return errorResponse(
          res,
          'Güncellenecek geçerli bir alan bulunamadı.',
          400
        );
      }

      const caseItem =
        await caseService.update(
          req.params.id,
          updateData,
          req.user
        );

      await AuditLog.create({
        action:
          'update',

        entity_type:
          'case',

        entity_id:
          caseItem.id,

        user_id:
          req.user.id,

        description:
          `"${caseItem.title}" davasında kısmi güncelleme yapıldı`,

        ip_address:
          getAuditIp(
            req
          ),

        user_agent:
          req.headers[
            'user-agent'
          ],
      });

      return successResponse(
        res,
        caseItem,
        'Case partially updated successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Patch case error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // REMOVE
  // ====================================================

  async remove(
    req,
    res
  ) {
    try {
      /*
       * Service findOne BOLA kontrolünü yapacak.
       */
      const caseItem =
        await caseService.findOne(
          req.params.id,
          req.user
        );

      await caseService.remove(
        req.params.id,
        req.user
      );

      await AuditLog.create({
        action:
          'delete',

        entity_type:
          'case',

        entity_id:
          req.params.id,

        user_id:
          req.user.id,

        description:
          `"${caseItem.title}" davası silindi`,

        ip_address:
          getAuditIp(
            req
          ),

        user_agent:
          req.headers[
            'user-agent'
          ],
      });

      return successResponse(
        res,
        null,
        'Case deleted successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Delete case error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // ADD PARTY
  // ====================================================

  async addParty(
    req,
    res
  ) {
    try {
      const party =
        await caseService.addParty(
          req.params.id,
          req.body,
          req.user
        );

      return successResponse(
        res,
        party,
        'Party added successfully',
        201
      );
    } catch (
      error
    ) {
      logger.error(
        'Add party error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // REMOVE PARTY
  // ====================================================

  async removeParty(
    req,
    res
  ) {
    try {
      await caseService.removeParty(
        req.params.id,
        req.params.partyId,
        req.user
      );

      return successResponse(
        res,
        null,
        'Party removed successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Remove party error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // GET PARTIES
  // ====================================================

  async getParties(
    req,
    res
  ) {
    try {
      const parties =
        await caseService.getParties(
          req.params.id,
          req.user
        );

      return successResponse(
        res,
        parties,
        'Parties fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get parties error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // GET DOCUMENTS
  // ====================================================

  async getDocuments(
    req,
    res
  ) {
    try {
      const documents =
        await caseService.getDocuments(
          req.params.id,
          req.user
        );

      return successResponse(
        res,
        documents,
        'Documents fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get documents error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // GET TASKS
  // ====================================================

  async getTasks(
    req,
    res
  ) {
    try {
      const tasks =
        await caseService.getTasks(
          req.params.id,
          req.user
        );

      return successResponse(
        res,
        tasks,
        'Tasks fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get tasks error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // GET EVENTS
  // ====================================================

  async getEvents(
    req,
    res
  ) {
    try {
      const events =
        await caseService.getEvents(
          req.params.id,
          req.user
        );

      return successResponse(
        res,
        events,
        'Events fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get events error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // GET PAYMENTS
  // ====================================================

  async getPayments(
    req,
    res
  ) {
    try {
      const payments =
        await caseService.getPayments(
          req.params.id,
          req.user
        );

      return successResponse(
        res,
        payments,
        'Payments fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get payments error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // GET NOTES
  // ====================================================

  async getNotes(
    req,
    res
  ) {
    try {
      const notes =
        await caseService.getNotes(
          req.params.id,
          req.user
        );

      return successResponse(
        res,
        notes,
        'Notes fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get notes error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // ASSIGNABLE LAWYERS
  // ====================================================

  async getAssignableLawyers(
    req,
    res
  ) {
    try {
      /*
       * Kullanıcı yönetimi listesini açmadan,
       * yalnız dava atamasında kullanılabilecek
       * aktif avukatları service üzerinden döndürür.
       *
       * Actor ayrıca service'e taşınır; böylece
       * yetki / kapsam politikası service katmanında
       * merkezi olarak uygulanabilir.
       */
      const lawyers =
        await caseService.getAssignableLawyers(
          req.user
        );

      return successResponse(
        res,
        lawyers,
        'Assignable lawyers fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get assignable lawyers error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Atanabilir avukatlar getirilemedi',
        400
      );
    }
  },

  // ====================================================
  // STATISTICS
  // ====================================================

  async getStatistics(
    req,
    res
  ) {
    try {
      /*
       * Artık yalnız userId değil bütün actor
       * gönderiliyor.
       *
       * Service rol + ownership bazlı doğru
       * istatistik scope'u uygulayabilecek.
       */
      const stats =
        await caseService.getStatistics(
          req.user
        );

      return successResponse(
        res,
        stats,
        'Case statistics fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get case statistics error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // UPDATE STATUS
  // ====================================================

  async updateStatus(
    req,
    res
  ) {
    try {
      const {
        status,
      } = req.body;

      const caseItem =
        await caseService.updateStatus(
          req.params.id,
          status,
          req.user
        );

      await AuditLog.create({
        action:
          'update',

        entity_type:
          'case',

        entity_id:
          caseItem.id,

        user_id:
          req.user.id,

        description:
          `Case ${caseItem.title} status updated to ${status}`,

        ip_address:
          getAuditIp(
            req
          ),

        user_agent:
          req.headers[
            'user-agent'
          ],
      });

      return successResponse(
        res,
        caseItem,
        'Case status updated successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Update case status error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },
};