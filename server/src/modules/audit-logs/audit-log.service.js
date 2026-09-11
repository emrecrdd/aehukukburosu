import {
  AuditLog,
} from '../../models/AuditLog.js';

import {
  User,
} from '../../models/User.js';

import {
  Consultation,
} from '../../models/Consultation.js';

import {
  ConsultationAssignee,
} from '../../models/ConsultationAssignee.js';

import {
  Op,
  Sequelize,
} from 'sequelize';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

// ======================================================
// HELPERS
// ======================================================

const createNotFoundError =
  (
    message =
      'Loglar bulunamadı'
  ) => {
    const error =
      new Error(
        message
      );

    error.statusCode =
      404;

    return error;
  };

const assertConsultationAuditAccess =
  async ({
    consultationId,
    actorId,
    canViewConsultations = false,
    canViewAllConsultations = false,
  }) => {
    if (
      !consultationId ||
      !actorId ||
      !canViewConsultations
    ) {
      throw createNotFoundError();
    }

    const consultation =
      await Consultation.findOne({
        where: {
          id:
            consultationId,
        },

        attributes: [
          'id',
          'created_by',
        ],
      });

    if (
      !consultation
    ) {
      throw createNotFoundError();
    }

    if (
      canViewAllConsultations ||
      String(
        consultation.created_by
      ) ===
      String(
        actorId
      )
    ) {
      return consultation;
    }

    const assignment =
      await ConsultationAssignee.findOne({
        where: {
          consultation_id:
            consultationId,

          user_id:
            actorId,
        },

        attributes: [
          'id',
        ],
      });

    if (
      !assignment
    ) {
      throw createNotFoundError();
    }

    return consultation;
  };

// ======================================================
// SERVICE
// ======================================================

export const auditLogService = {
  async findAll({
    page = 1,
    limit = 20,
    action,
    entity_type,
    entity_id,
    startDate,
    endDate,
    search,
    actorId,
    canViewConsultations = false,
    canViewAllConsultations = false,
  }) {
    const where =
      {};

    if (
      action
    ) {
      where.action =
        action;
    }

    if (
      entity_type
    ) {
      where.entity_type =
        entity_type;
    }

    if (
      entity_id
    ) {
      where.entity_id =
        entity_id;
    }

    if (
      entity_type ===
        'consultation' &&
      entity_id
    ) {
      await assertConsultationAuditAccess({
        consultationId:
          entity_id,

        actorId,

        canViewConsultations,

        canViewAllConsultations,
      });
    }

    if (
      startDate &&
      endDate
    ) {
      where.created_at = {
        [Op.between]: [
          new Date(
            startDate
          ),

          new Date(
            endDate
          ),
        ],
      };
    }

    if (
      search
    ) {
      where[
        Op.or
      ] = [
        {
          description: {
            [Op.iLike]:
              `%${search}%`,
          },
        },

        Sequelize.where(
          Sequelize.cast(
            Sequelize.col(
              'entity_id'
            ),
            'text'
          ),
          {
            [Op.iLike]:
              `%${search}%`,
          }
        ),
      ];
    }

    const query =
      paginate(
        {
          where,

          order: [
            [
              'created_at',
              'DESC',
            ],
          ],
        },
        page,
        limit
      );

    const {
      count,
      rows,
    } =
      await AuditLog.findAndCountAll({
        ...query,

        include: [
          {
            model:
              User,

            as:
              'user',

            attributes: [
              'id',
              'first_name',
              'last_name',
              'email',
            ],
          },
        ],
      });

    const pagination =
      getPaginationData(
        count,
        page,
        limit
      );

    return {
      data:
        rows,

      pagination,
    };
  },

  async findOne(
    id
  ) {
    const log =
      await AuditLog.findByPk(
        id,
        {
          include: [
            {
              model:
                User,

              as:
                'user',

              attributes: [
                'id',
                'first_name',
                'last_name',
                'email',
              ],
            },
          ],
        }
      );

    if (
      !log
    ) {
      throw new Error(
        'Log bulunamadı'
      );
    }

    return log;
  },

  async remove(
    id
  ) {
    const log =
      await AuditLog.findByPk(
        id
      );

    if (
      !log
    ) {
      throw new Error(
        'Log bulunamadı'
      );
    }

    await log.destroy();

    return log;
  },

  async removeMany(
    ids
  ) {
    if (
      !ids ||
      ids.length ===
        0
    ) {
      throw new Error(
        'Silinecek log seçilmedi'
      );
    }

    const result =
      await AuditLog.destroy({
        where: {
          id: {
            [Op.in]:
              ids,
          },
        },
      });

    if (
      result ===
      0
    ) {
      throw new Error(
        'Loglar bulunamadı'
      );
    }

    return {
      deletedCount:
        result,
    };
  },

  async cleanOldLogs(
    days = 30
  ) {
    const date =
      new Date();

    date.setDate(
      date.getDate() -
      days
    );

    const result =
      await AuditLog.destroy({
        where: {
          created_at: {
            [Op.lt]:
              date,
          },
        },
      });

    return {
      deletedCount:
        result,
    };
  },
};
