import {
  Op,
  Sequelize,
} from 'sequelize';

import { Consultation } from '../../models/Consultation.js';
import { ConsultationAssignee } from '../../models/ConsultationAssignee.js';
import { Client } from '../../models/Client.js';
import { User } from '../../models/User.js';
import { Case } from '../../models/Case.js';
import { Task } from '../../models/Task.js';
import { Meeting } from '../../models/Meeting.js';
import { Document } from '../../models/Document.js';
import { Note } from '../../models/Note.js';
import { sequelize } from '../../config/database.js';
import { paginate, getPaginationData } from '../../utils/paginate.js';
import {
  ROLES,
  PERMISSION_KEYS,
  getEffectivePermissions,
} from '../../constants/roles.js';

const getActorId = (actor) => actor?.id || null;

const getActorPermissions = (actor) => {
  if (!actor) return [];
  return getEffectivePermissions(actor.role, actor.permissions || {});
};

const isAdmin = (actor) => actor?.role === ROLES.ADMIN;

const createRepositoryError = (
  message,
  statusCode = 400
) => {
  const error =
    new Error(
      message
    );

  error.statusCode =
    statusCode;

  return error;
};

const canViewAllConsultations = (actor) => (
  isAdmin(actor) ||
  getActorPermissions(actor).includes(PERMISSION_KEYS.VIEW_ALL_CONSULTATIONS)
);

const canViewAllCases = (actor) => (
  isAdmin(actor) ||
  getActorPermissions(actor).includes(PERMISSION_KEYS.VIEW_ALL_CASES)
);

const hasWhereContent = (value) => Boolean(
  value &&
  typeof value === 'object' &&
  Reflect.ownKeys(value).length > 0
);

const combineWhere = (...conditions) => {
  const valid = conditions.filter(hasWhereContent);
  if (valid.length === 0) return {};
  if (valid.length === 1) return valid[0];
  return { [Op.and]: valid };
};

const buildConsultationAccessWhere = (actor) => {
  const actorId = getActorId(actor);
  if (!actorId) throw createRepositoryError(
    'Danışmanlık kaydı bulunamadı.',
    404
  );
  if (canViewAllConsultations(actor)) return {};

  const escapedActorId = sequelize.escape(actorId);

  return {
    [Op.or]: [
      { created_by: actorId },
      Sequelize.where(
        Sequelize.literal(`
          EXISTS (
            SELECT 1
            FROM consultation_assignees ca
            WHERE ca.consultation_id = "Consultation"."id"
              AND ca.user_id = ${escapedActorId}
          )
        `),
        true
      ),
    ],
  };
};

const buildClientAccessWhere = (actor) => {
  const actorId = getActorId(actor);
  if (!actorId) throw createRepositoryError(
    'Müvekkil kaydı bulunamadı veya bu kayda erişim yetkiniz yok.',
    404
  );
  if (isAdmin(actor)) return {};

  const escapedActorId = sequelize.escape(actorId);
  const caseAccessPredicate = canViewAllCases(actor)
    ? `
      EXISTS (
        SELECT 1
        FROM case_clients cc
        INNER JOIN cases c
          ON c.id = cc.case_id
         AND c.deleted_at IS NULL
        WHERE cc.client_id = "Client"."id"
      )
    `
    : `
      EXISTS (
        SELECT 1
        FROM case_clients cc
        INNER JOIN cases c
          ON c.id = cc.case_id
         AND c.deleted_at IS NULL
        WHERE cc.client_id = "Client"."id"
          AND (
            c.created_by = ${escapedActorId}
            OR c.assigned_to = ${escapedActorId}
          )
      )
    `;

  return {
    [Op.or]: [
      { created_by: actorId },
      Sequelize.where(Sequelize.literal(caseAccessPredicate), true),
    ],
  };
};

const listIncludes = () => [
  {
    model: Client,
    as: 'client',
    attributes: ['id', 'name', 'phone', 'email'],
    required: false,
  },
  {
    model: User,
    as: 'assignees',
    attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
    through: {
      attributes: ['is_primary', 'assigned_by', 'created_at'],
    },
    required: false,
  },
  {
    model: Case,
    as: 'convertedCase',
    attributes: ['id', 'case_number', 'title', 'status'],
    required: false,
  },
];

const detailIncludes = () => [
  ...listIncludes(),
  {
    model: User,
    as: 'creator',
    attributes: ['id', 'first_name', 'last_name'],
    required: false,
  },
  {
    model: User,
    as: 'updater',
    attributes: ['id', 'first_name', 'last_name'],
    required: false,
  },
];

const getIstanbulYear = () => Number(
  new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
  }).format(new Date())
);

const getNextConsultationNumber = async (transaction) => {
  if (!transaction) {
    throw createRepositoryError(
      'Danışmanlık numarası oluşturma işlemi başlatılamadı.',
      500
    );
  }

  const year = getIstanbulYear();

  const [rows] = await sequelize.query(
    `
      INSERT INTO consultation_counters (
        year,
        last_value,
        created_at,
        updated_at
      )
      VALUES (
        :year,
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (year)
      DO UPDATE
      SET
        last_value = consultation_counters.last_value + 1,
        updated_at = CURRENT_TIMESTAMP
      RETURNING last_value
    `,
    {
      replacements: { year },
      transaction,
    }
  );

  const nextNumber = Number(rows?.[0]?.last_value);

  if (!Number.isInteger(nextNumber) || nextNumber <= 0) {
    throw createRepositoryError(
      'Danışmanlık numarası üretilemedi.',
      500
    );
  }

  return `DNS-${year}-${String(nextNumber).padStart(6, '0')}`;
};

const buildAssignedToWhere = (userId) => {
  if (!userId) return {};
  const escapedUserId = sequelize.escape(String(userId).trim());
  return Sequelize.where(
    Sequelize.literal(`
      EXISTS (
        SELECT 1
        FROM consultation_assignees ca_filter
        WHERE ca_filter.consultation_id = "Consultation"."id"
          AND ca_filter.user_id = ${escapedUserId}
      )
    `),
    true
  );
};

const buildSearchWhere = (search) => {
  const normalized = String(search || '').trim();
  if (!normalized) return {};

  const likeValue = `%${normalized}%`;
  const escapedLike = sequelize.escape(likeValue);

  return {
    [Op.or]: [
      { consultation_number: { [Op.iLike]: likeValue } },
      { title: { [Op.iLike]: likeValue } },
      { legal_area: { [Op.iLike]: likeValue } },
      { prospect_name: { [Op.iLike]: likeValue } },
      { prospect_email: { [Op.iLike]: likeValue } },
      { prospect_phone: { [Op.iLike]: likeValue } },
      Sequelize.where(
        Sequelize.literal(`
          EXISTS (
            SELECT 1
            FROM clients c_search
            WHERE c_search.id = "Consultation".client_id
              AND c_search.deleted_at IS NULL
              AND c_search.name ILIKE ${escapedLike}
          )
        `),
        true
      ),
    ],
  };
};

export const consultationRepository = {
  buildAccessWhere(actor) {
    return buildConsultationAccessWhere(actor);
  },

  async getNextNumber(transaction) {
    return getNextConsultationNumber(transaction);
  },

  async assertClientAccess(clientId, actor, options = {}) {
    if (!clientId) return null;

    const client = await Client.findOne({
      where: combineWhere(
        { id: clientId },
        buildClientAccessWhere(actor)
      ),
      attributes: ['id'],
      transaction: options.transaction,
      lock: options.lock,
    });

    if (!client) {
      throw createRepositoryError(
        'Müvekkil kaydı bulunamadı veya bu kayda erişim yetkiniz yok.',
        404
      );
    }
    return client;
  },

  async assertEligibleAssignees(userIds, options = {}) {
    const ids = [...new Set(
      (Array.isArray(userIds) ? userIds : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )];

    if (ids.length === 0) {
      throw createRepositoryError(
        'En az bir sorumlu seçilmelidir.',
        400
      );
    }

    const users = await User.findAll({
      where: {
        id: { [Op.in]: ids },
        is_active: true,
        role: { [Op.in]: [ROLES.ADMIN, ROLES.LAWYER, ROLES.INTERN] },
      },
      attributes: ['id'],
      transaction: options.transaction,
      raw: true,
    });

    if (users.length !== ids.length) {
      throw createRepositoryError(
        'Seçilen sorumlulardan biri bulunamadı veya artık atanabilir değil.',
        400
      );
    }
    return ids;
  },

  async assertCaseAssignableUser(userId, options = {}) {
    const user = await User.findOne({
      where: {
        id: userId,
        is_active: true,
        role: { [Op.in]: [ROLES.ADMIN, ROLES.LAWYER] },
      },
      attributes: ['id'],
      transaction: options.transaction,
    });

    if (!user) {
      throw createRepositoryError(
        'Seçilen avukat bulunamadı veya artık davaya atanabilir değil.',
        400
      );
    }
    return user;
  },

  async getAssignableUsers(options = {}) {
    return User.findAll({
      where: {
        is_active: true,
        role: {
          [Op.in]: [
            ROLES.ADMIN,
            ROLES.LAWYER,
            ROLES.INTERN,
          ],
        },
      },
      attributes: [
        'id',
        'first_name',
        'last_name',
        'email',
        'role',
        'title',
      ],
      order: [
        ['first_name', 'ASC'],
        ['last_name', 'ASC'],
      ],
      transaction: options.transaction,
    });
  },

  async getAssigneeRecords(consultationId, options = {}) {
    return ConsultationAssignee.findAll({
      where: { consultation_id: consultationId },
      attributes: ['id', 'user_id', 'is_primary', 'assigned_by', 'created_at'],
      order: [['created_at', 'ASC']],
      transaction: options.transaction,
      lock: options.lock,
      raw: true,
    });
  },

  async replaceAssignees(
    consultationId,
    assignments,
    assignedBy,
    options = {}
  ) {
    const transaction =
      options.transaction;

    const normalizedAssignments =
      Array.isArray(assignments)
        ? assignments.map(
            (assignment) => ({
              user_id:
                assignment.user_id,
              is_primary:
                assignment.is_primary ===
                true,
            })
          )
        : [];

    const currentRecords =
      await ConsultationAssignee.findAll({
        where: {
          consultation_id:
            consultationId,
        },

        attributes: [
          'id',
          'user_id',
          'is_primary',
          'assigned_by',
          'created_at',
        ],

        transaction,

        ...(transaction
          ? {
              lock:
                transaction.LOCK.UPDATE,
            }
          : {}),
      });

    const currentByUserId =
      new Map(
        currentRecords.map(
          (record) => [
            String(
              record.user_id
            ),
            record,
          ]
        )
      );

    const targetByUserId =
      new Map(
        normalizedAssignments.map(
          (assignment) => [
            String(
              assignment.user_id
            ),
            assignment,
          ]
        )
      );

    const removedUserIds =
      currentRecords
        .filter(
          (record) =>
            !targetByUserId.has(
              String(
                record.user_id
              )
            )
        )
        .map(
          (record) =>
            record.user_id
        );

    if (
      removedUserIds.length >
      0
    ) {
      await ConsultationAssignee.destroy({
        where: {
          consultation_id:
            consultationId,

          user_id: {
            [Op.in]:
              removedUserIds,
          },
        },

        force:
          true,

        transaction,
      });
    }

    const currentPrimary =
      currentRecords.find(
        (record) =>
          record.is_primary ===
          true
      ) ||
      null;

    const targetPrimary =
      normalizedAssignments.find(
        (assignment) =>
          assignment.is_primary ===
          true
      ) ||
      null;

    const currentPrimaryId =
      currentPrimary
        ? String(
            currentPrimary.user_id
          )
        : null;

    const targetPrimaryId =
      targetPrimary
        ? String(
            targetPrimary.user_id
          )
        : null;

    /*
     * Partial unique index nedeniyle yeni primary'yi
     * set etmeden önce eski primary temizlenir.
     */
    if (
      currentPrimaryId !==
      targetPrimaryId
    ) {
      await ConsultationAssignee.update(
        {
          is_primary:
            false,
        },
        {
          where: {
            consultation_id:
              consultationId,

            is_primary:
              true,
          },

          transaction,
        }
      );
    }

    const retainedUpdates =
      normalizedAssignments.filter(
        (assignment) =>
          currentByUserId.has(
            String(
              assignment.user_id
            )
          )
      );

    for (
      const assignment of
      retainedUpdates
    ) {
      const current =
        currentByUserId.get(
          String(
            assignment.user_id
          )
        );

      if (
        current.is_primary !==
        assignment.is_primary
      ) {
        await ConsultationAssignee.update(
          {
            is_primary:
              assignment.is_primary,
          },
          {
            where: {
              consultation_id:
                consultationId,

              user_id:
                assignment.user_id,
            },

            transaction,
          }
        );
      }
    }

    const newAssignments =
      normalizedAssignments.filter(
        (assignment) =>
          !currentByUserId.has(
            String(
              assignment.user_id
            )
          )
      );

    if (
      newAssignments.length >
      0
    ) {
      await ConsultationAssignee.bulkCreate(
        newAssignments.map(
          (assignment) => ({
            consultation_id:
              consultationId,

            user_id:
              assignment.user_id,

            is_primary:
              assignment.is_primary,

            assigned_by:
              assignedBy ||
              null,
          })
        ),
        {
          transaction,
        }
      );
    }
  },

  async clearPrimaryAssignee(consultationId, options = {}) {
    return ConsultationAssignee.update(
      { is_primary: false },
      {
        where: {
          consultation_id: consultationId,
          is_primary: true,
        },
        transaction: options.transaction,
      }
    );
  },

  async addAssigneeRecord(consultationId, assignment, assignedBy, options = {}) {
    return ConsultationAssignee.create(
      {
        consultation_id: consultationId,
        user_id: assignment.user_id,
        is_primary: assignment.is_primary === true,
        assigned_by: assignedBy || null,
      },
      { transaction: options.transaction }
    );
  },

  async removeAssigneeRecord(consultationId, userId, options = {}) {
    return ConsultationAssignee.destroy({
      where: {
        consultation_id: consultationId,
        user_id: userId,
      },
      force: true,
      transaction: options.transaction,
    });
  },

  async create(data, options = {}) {
    return Consultation.create(data, { transaction: options.transaction });
  },

  async findAll({
    page,
    limit,
    search,
    status,
    client_id,
    assigned_to,
    legal_area,
    type,
    service_model,
    priority,
    actor,
  }) {
    const conditions = [];
    const accessWhere = buildConsultationAccessWhere(actor);
    if (hasWhereContent(accessWhere)) conditions.push(accessWhere);

    const searchWhere = buildSearchWhere(search);
    if (hasWhereContent(searchWhere)) conditions.push(searchWhere);

    if (status) conditions.push({ status });
    if (client_id) conditions.push({ client_id });
    if (legal_area) {
      conditions.push({
        legal_area: { [Op.iLike]: String(legal_area).trim() },
      });
    }
    if (type) conditions.push({ consultation_type: type });
    if (service_model) conditions.push({ service_model });
    if (priority) conditions.push({ priority });

    const assignedWhere = buildAssignedToWhere(assigned_to);
    if (hasWhereContent(assignedWhere)) conditions.push(assignedWhere);

    const parsedPage = Number.parseInt(page, 10);
    const parsedLimit = Number.parseInt(limit, 10);
    const pageNum = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limitNum = Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 25;

    const query = paginate({ where: combineWhere(...conditions) }, pageNum, limitNum);
    const { count, rows } = await Consultation.findAndCountAll({
      ...query,
      include: listIncludes(),
      distinct: true,
      order: [['updated_at', 'DESC']],
    });

    return {
      data: rows,
      pagination: getPaginationData(count, pageNum, limitNum),
    };
  },

  async findScopedInstance(id, actor, options = {}) {
    return Consultation.findOne({
      where: combineWhere(
        { id },
        buildConsultationAccessWhere(actor)
      ),
      transaction: options.transaction,
      lock: options.lock,
    });
  },

  async findOne(id, actor, options = {}) {
    const consultation = await Consultation.findOne({
      where: combineWhere(
        { id },
        buildConsultationAccessWhere(actor)
      ),
      include: detailIncludes(),
      transaction: options.transaction,
    });

    if (!consultation) {
      throw createRepositoryError(
        'Danışmanlık kaydı bulunamadı.',
        404
      );
    }
    return consultation;
  },

  async updateInstance(consultation, data, options = {}) {
    return consultation.update(data, { transaction: options.transaction });
  },

  async removeInstance(consultation, options = {}) {
    return consultation.destroy({ transaction: options.transaction });
  },




  async getNotes(consultationId, actor, options = {}) {
    const consultation = await this.findScopedInstance(
      consultationId,
      actor,
      { transaction: options.transaction }
    );

    if (!consultation) {
      throw createRepositoryError(
        'Danışmanlık kaydı bulunamadı.',
        404
      );
    }

    return Note.findAll({
      where: { consultation_id: consultationId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: [
            'id',
            'first_name',
            'last_name',
            'email',
            'role',
          ],
          required: false,
        },
      ],
      order: [['created_at', 'DESC']],
      transaction: options.transaction,
    });
  },

  async addNoteRecord(consultationId, actorId, content, options = {}) {
    return Note.create(
      {
        consultation_id: consultationId,
        created_by: actorId,
        content,
      },
      { transaction: options.transaction }
    );
  },

  async findNoteById(noteId, options = {}) {
    return Note.findByPk(noteId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: [
            'id',
            'first_name',
            'last_name',
            'email',
            'role',
          ],
          required: false,
        },
      ],
      transaction: options.transaction,
    });
  },
  async linkChildrenToCase(consultationId, caseId, options = {}) {
    const transaction = options.transaction;
    const where = {
      consultation_id: consultationId,
      case_id: null,
    };

    const [taskCount] = await Task.update(
      { case_id: caseId },
      { where, transaction }
    );

    const [meetingCount] = await Meeting.update(
      { case_id: caseId },
      { where, transaction }
    );

    const [documentCount] = await Document.update(
      { case_id: caseId },
      { where, transaction }
    );

    return {
      tasks: taskCount,
      meetings: meetingCount,
      documents: documentCount,
    };
  },

  async getStatistics(actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw createRepositoryError(
    'Danışmanlık kaydı bulunamadı.',
    404
  );

    const accessWhere = buildConsultationAccessWhere(actor);
    const assignedToMeWhere = buildAssignedToWhere(actorId);

    const countStatus = (status) => Consultation.count({
      where: combineWhere(accessWhere, { status }),
    });

    const [
      total,
      newCount,
      evaluating,
      meetingScheduled,
      inProgress,
      waitingClient,
      completed,
      convertedToCase,
      rejected,
      cancelled,
      assignedToMe,
    ] = await Promise.all([
      Consultation.count({ where: accessWhere }),
      countStatus('new'),
      countStatus('evaluating'),
      countStatus('meeting_scheduled'),
      countStatus('in_progress'),
      countStatus('waiting_client'),
      countStatus('completed'),
      countStatus('converted_to_case'),
      countStatus('rejected'),
      countStatus('cancelled'),
      Consultation.count({ where: combineWhere(accessWhere, assignedToMeWhere) }),
    ]);

    return {
      total,
      new: newCount,
      evaluating,
      meetingScheduled,
      inProgress,
      waitingClient,
      completed,
      convertedToCase,
      rejected,
      cancelled,
      assignedToMe,
    };
  },
};

export default consultationRepository;
