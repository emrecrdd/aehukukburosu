import { sequelize } from '../../config/database.js';
import { consultationRepository } from './consultation.repository.js';
import { clientService } from '../clients/client.service.js';
import { caseService } from '../cases/case.service.js';
import { meetingService } from '../meetings/meeting.service.js';
import { taskService } from '../tasks/task.service.js';
import { documentService } from '../documents/document.service.js';
import { notificationService } from '../notifications/notification.service.js';
import { financeV2Service } from '../finance-v2/finance-v2.service.js';
import { AuditLog } from '../../models/AuditLog.js';
import {
  CONSULTATION_STATUS,
  CONSULTATION_BILLING_TYPE,
} from '../../constants/consultation.js';
import {
  ROLES,
  PERMISSION_KEYS,
  getEffectivePermissions,
} from '../../constants/roles.js';

const getActorId = (actor) => actor?.id || null;
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const createConsultationError = (
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

const getMeetingAccessFromActor = (actor) => {
  const actorId =
    getActorId(
      actor
    );

  if (!actorId) {
    throw createConsultationError(
      'Danışmanlık kaydı bulunamadı.',
      404
    );
  }

  const permissions =
    getEffectivePermissions(
      actor.role,
      actor.permissions || {}
    );

  const isAdmin =
    actor.role ===
    ROLES.ADMIN;

  return {
    userId:
      actorId,

    canViewAllMeetings:
      isAdmin ||
      permissions.includes(
        PERMISSION_KEYS.VIEW_ALL_MEETINGS
      ),

    canViewAllCases:
      isAdmin ||
      permissions.includes(
        PERMISSION_KEYS.VIEW_ALL_CASES
      ),

    canViewConsultations:
      isAdmin ||
      permissions.includes(
        PERMISSION_KEYS.VIEW_CONSULTATIONS
      ),

    canViewAllConsultations:
      isAdmin ||
      permissions.includes(
        PERMISSION_KEYS.VIEW_ALL_CONSULTATIONS
      ),
  };
};

const getTaskAccessFromActor = (actor) => {
  const actorId =
    getActorId(
      actor
    );

  if (!actorId) {
    throw createConsultationError(
      'Danışmanlık kaydı bulunamadı.',
      404
    );
  }

  const permissions =
    getEffectivePermissions(
      actor.role,
      actor.permissions || {}
    );

  const isAdmin =
    actor.role ===
    ROLES.ADMIN;

  return {
    userId:
      actorId,

    canViewAllTasks:
      isAdmin ||
      permissions.includes(
        PERMISSION_KEYS.VIEW_ALL_TASKS
      ),

    canViewAllCases:
      isAdmin ||
      permissions.includes(
        PERMISSION_KEYS.VIEW_ALL_CASES
      ),

    canViewConsultations:
      isAdmin ||
      permissions.includes(
        PERMISSION_KEYS.VIEW_CONSULTATIONS
      ),

    canViewAllConsultations:
      isAdmin ||
      permissions.includes(
        PERMISSION_KEYS.VIEW_ALL_CONSULTATIONS
      ),
  };
};

const normalizeNullableText = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const TERMINAL_CONSULTATION_STATUSES = new Set([
  CONSULTATION_STATUS.COMPLETED,
  CONSULTATION_STATUS.CONVERTED_TO_CASE,
  CONSULTATION_STATUS.REJECTED,
  CONSULTATION_STATUS.CANCELLED,
]);

const CONSULTATION_STATUS_TRANSITIONS =
  Object.freeze({
    [CONSULTATION_STATUS.NEW]:
      new Set([
        CONSULTATION_STATUS.EVALUATING,
        CONSULTATION_STATUS.MEETING_SCHEDULED,
        CONSULTATION_STATUS.IN_PROGRESS,
        CONSULTATION_STATUS.REJECTED,
        CONSULTATION_STATUS.CANCELLED,
      ]),

    [CONSULTATION_STATUS.EVALUATING]:
      new Set([
        CONSULTATION_STATUS.MEETING_SCHEDULED,
        CONSULTATION_STATUS.IN_PROGRESS,
        CONSULTATION_STATUS.WAITING_CLIENT,
        CONSULTATION_STATUS.COMPLETED,
        CONSULTATION_STATUS.REJECTED,
        CONSULTATION_STATUS.CANCELLED,
      ]),

    [CONSULTATION_STATUS.MEETING_SCHEDULED]:
      new Set([
        CONSULTATION_STATUS.EVALUATING,
        CONSULTATION_STATUS.IN_PROGRESS,
        CONSULTATION_STATUS.WAITING_CLIENT,
        CONSULTATION_STATUS.COMPLETED,
        CONSULTATION_STATUS.REJECTED,
        CONSULTATION_STATUS.CANCELLED,
      ]),

    [CONSULTATION_STATUS.IN_PROGRESS]:
      new Set([
        CONSULTATION_STATUS.MEETING_SCHEDULED,
        CONSULTATION_STATUS.WAITING_CLIENT,
        CONSULTATION_STATUS.COMPLETED,
        CONSULTATION_STATUS.REJECTED,
        CONSULTATION_STATUS.CANCELLED,
      ]),

    [CONSULTATION_STATUS.WAITING_CLIENT]:
      new Set([
        CONSULTATION_STATUS.MEETING_SCHEDULED,
        CONSULTATION_STATUS.IN_PROGRESS,
        CONSULTATION_STATUS.COMPLETED,
        CONSULTATION_STATUS.REJECTED,
        CONSULTATION_STATUS.CANCELLED,
      ]),
  });

const assertConsultationStatusTransition = (
  fromStatus,
  toStatus
) => {
  if (
    fromStatus ===
    toStatus
  ) {
    return;
  }

  const allowed =
    CONSULTATION_STATUS_TRANSITIONS[
      fromStatus
    ];

  if (
    !allowed ||
    !allowed.has(
      toStatus
    )
  ) {
    throw createConsultationError(
      'Bu durum değişikliği mevcut danışmanlık durumu için uygun değil.',
      409
    );
  }
};

const assertConsultationMutable = (
  consultation
) => {
  if (
    TERMINAL_CONSULTATION_STATUSES.has(
      consultation?.status
    )
  ) {
    const error =
      new Error(
        'Kapanmış danışmanlık güncellenemez.'
      );

    error.statusCode =
      409;

    throw error;
  }
};

const assertConsultationDeletable = (
  consultation
) => {
  if (
    consultation?.converted_case_id ||
    consultation?.status ===
      CONSULTATION_STATUS.CONVERTED_TO_CASE
  ) {
    const error =
      new Error(
        'Davaya dönüştürülmüş danışmanlık silinemez.'
      );

    error.statusCode =
      409;

    throw error;
  }
};

const getActorDisplayName = (actor) => {
  const name = [actor?.first_name, actor?.last_name].filter(Boolean).join(' ').trim();
  return name || actor?.email || 'Bir kullanıcı';
};

const normalizeAssignments = (value) => {
  if (!Array.isArray(value)) {
    throw createConsultationError(
      'Sorumlu kullanıcı bilgileri geçersiz formatta.',
      400
    );
  }
  if (value.length === 0) {
    throw createConsultationError(
      'En az bir sorumlu seçilmelidir.',
      400
    );
  }

  const normalized = value.map((item) => ({
    user_id: String(item?.user_id || '').trim(),
    is_primary: item?.is_primary === true,
  }));

  if (normalized.some((item) => !item.user_id)) {
    throw createConsultationError(
      'Seçilen sorumlu kullanıcı bulunamadı veya artık atanabilir değil.',
      400
    );
  }

  const ids = normalized.map((item) => item.user_id);
  if (new Set(ids).size !== ids.length) {
    throw createConsultationError(
      'Aynı sorumlu birden fazla kez eklenemez.',
      409
    );
  }

  const primaryCount = normalized.filter((item) => item.is_primary).length;
  if (primaryCount > 1) {
    throw createConsultationError(
      'En fazla bir ana sorumlu seçilebilir.',
      400
    );
  }

  return normalized;
};

const CONSULTATION_MUTABLE_FIELDS =
  Object.freeze([
    'title',
    'description',
    'client_id',
    'prospect_name',
    'prospect_email',
    'prospect_phone',
    'legal_area',
    'consultation_type',
    'consultation_mode',
    'service_model',
    'priority',
    'billing_type',
    'agreed_fee',
    'currency',
    'source',
    'opened_at',
    'metadata',
  ]);

const pickConsultationMutableFields = (
  data
) => {
  const source =
    data &&
    typeof data === 'object' &&
    !Array.isArray(data)
      ? data
      : {};

  const payload = {};

  for (
    const field of
    CONSULTATION_MUTABLE_FIELDS
  ) {
    if (
      hasOwn(
        source,
        field
      )
    ) {
      payload[field] =
        source[field];
    }
  }

  return payload;
};

const normalizeConsultationBilling = (
  payload,
  currentBillingType = null
) => {
  const touchesBilling =
    hasOwn(
      payload,
      'billing_type'
    ) ||
    hasOwn(
      payload,
      'agreed_fee'
    );

  if (!touchesBilling) {
    return payload;
  }

  const effectiveBillingType =
    payload.billing_type ??
    currentBillingType;

  if (
    effectiveBillingType ===
    CONSULTATION_BILLING_TYPE.FREE
  ) {
    payload.agreed_fee = null;
    return payload;
  }

  if (
    hasOwn(
      payload,
      'agreed_fee'
    )
  ) {
    const rawFee =
      payload.agreed_fee;

    if (
      rawFee === null ||
      rawFee === undefined ||
      String(
        rawFee
      ).trim() === ''
    ) {
      payload.agreed_fee = null;
      return payload;
    }

    const fee =
      Number(
        rawFee
      );

    if (
      !Number.isFinite(
        fee
      ) ||
      fee < 0
    ) {
      throw createConsultationError(
        'Kararlaştırılan ücret 0 veya daha büyük olmalıdır.',
        400
      );
    }

    payload.agreed_fee =
      fee;
  }

  return payload;
};

const sanitizeCreateData = (
  data
) => {
  const payload =
    pickConsultationMutableFields(
      data
    );

  /*
   * Status istemciden alınmaz.
   * Yeni danışmanlık her zaman NEW olarak başlar.
   */
  payload.status =
    CONSULTATION_STATUS.NEW;

  return normalizeConsultationBilling(
    payload
  );
};

const sanitizeUpdateData = (
  data,
  currentBillingType = null
) => {
  /*
   * Bu yol yalnız business/mutable alanları kabul eder.
   *
   * id, consultation_number, status, completed_at,
   * converted_case_id, created_by, updated_by,
   * deleted_at ve bilinmeyen alanlar hiçbir şekilde
   * repository/model update payload'una taşınmaz.
   */
  const payload =
    pickConsultationMutableFields(
      data
    );

  return normalizeConsultationBilling(
    payload,
    currentBillingType
  );
};

const createAudit = async ({
  action,
  consultationId,
  actorId,
  oldValues = null,
  newValues = null,
  description,
  metadata = {},
}, transaction) => {
  return AuditLog.create(
    {
      action,
      entity_type: 'consultation',
      entity_id: consultationId,
      old_values: oldValues,
      new_values: newValues,
      description,
      user_id: actorId,
      metadata,
    },
    { transaction }
  );
};

const notifyConsultation = async ({
  userId,
  consultationId,
  consultationTitle,
  actor,
  action = 'assigned',
}) => {
  if (!userId || userId === getActorId(actor)) return;

  await notificationService.notifyConsultationAssigned(
    userId,
    consultationId,
    consultationTitle,
    getActorDisplayName(actor),
    action
  );
};

const notifyAssignmentChanges = async ({
  consultationId,
  consultationTitle,
  actor,
  oldAssignments = [],
  newAssignments = [],
}) => {
  const oldIds = new Set(oldAssignments.map((item) => item.user_id));
  const oldPrimary = oldAssignments.find((item) => item.is_primary)?.user_id || null;
  const newPrimary = newAssignments.find((item) => item.is_primary)?.user_id || null;

  const notifications = [];

  for (const item of newAssignments) {
    if (!oldIds.has(item.user_id)) {
      notifications.push({
        userId: item.user_id,
        action: newPrimary === item.user_id && oldPrimary && oldPrimary !== newPrimary
          ? 'transferred'
          : 'assigned',
      });
    }
  }

  if (
    newPrimary &&
    newPrimary !== oldPrimary &&
    oldIds.has(newPrimary) &&
    !notifications.some((item) => item.userId === newPrimary)
  ) {
    notifications.push({ userId: newPrimary, action: 'transferred' });
  }

  await Promise.allSettled(
    notifications.map((item) => notifyConsultation({
      ...item,
      consultationId,
      consultationTitle,
      actor,
    }))
  );
};

const markClientCreateError = (error) => {
  const message = String(error?.message || '');

  if (
    message.includes('başka bir müvekkil kaydında') ||
    message.includes('Bu değer başka bir müvekkil kaydında')
  ) {
    error.statusCode = error.statusCode || 409;
    return error;
  }

  error.statusCode = error.statusCode || 400;
  return error;
};

export const consultationService = {
  async getAssignableUsers() {
    return consultationRepository.getAssignableUsers();
  },

  async create(data, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw createConsultationError(
      'Danışmanlık kaydı bulunamadı.',
      404
    );

    const { assignees, ...rawConsultationData } = data || {};
    const assignments = normalizeAssignments(assignees);

    const result = await sequelize.transaction(async (transaction) => {
      const clientId = normalizeNullableText(rawConsultationData.client_id);

      if (clientId) {
        await consultationRepository.assertClientAccess(clientId, actor, { transaction });
      }

      await consultationRepository.assertEligibleAssignees(
        assignments.map((item) => item.user_id),
        { transaction }
      );

      const consultationNumber = await consultationRepository.getNextNumber(transaction);
      const consultation = await consultationRepository.create(
        {
          ...sanitizeCreateData(rawConsultationData),
          client_id: clientId,
          consultation_number: consultationNumber,
          created_by: actorId,
          updated_by: actorId,
        },
        { transaction }
      );

      await consultationRepository.replaceAssignees(
        consultation.id,
        assignments,
        actorId,
        { transaction }
      );

      await createAudit({
        action: 'create',
        consultationId: consultation.id,
        actorId,
        newValues: {
          consultation_number: consultation.consultation_number,
          title: consultation.title,
          status: consultation.status,
          client_id: consultation.client_id,
        },
        description: 'Danışmanlık oluşturuldu',
        metadata: { event: 'consultation_created' },
      }, transaction);

      return {
        id: consultation.id,
        title: consultation.title,
        assignments,
      };
    });

    await notifyAssignmentChanges({
      consultationId: result.id,
      consultationTitle: result.title,
      actor,
      oldAssignments: [],
      newAssignments: result.assignments,
    });

    return consultationRepository.findOne(result.id, actor);
  },

  async findAll(params) {
    return consultationRepository.findAll(params);
  },

  async findOne(id, actor) {
    return consultationRepository.findOne(id, actor);
  },

  async update(id, data, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw createConsultationError(
      'Danışmanlık kaydı bulunamadı.',
      404
    );

    const { assignees, ...rawUpdateData } = data || {};
    const shouldUpdateAssignees = assignees !== undefined;
    const assignments = shouldUpdateAssignees ? normalizeAssignments(assignees) : null;

    const result = await sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );

      if (!consultation) {
        throw createConsultationError(
          'Danışmanlık kaydı bulunamadı.',
          404
        );
      }

      assertConsultationMutable(
        consultation
      );

      const oldValues = consultation.toJSON();
      const oldAssignments = shouldUpdateAssignees
        ? await consultationRepository.getAssigneeRecords(id, { transaction })
        : [];

      const updateData = sanitizeUpdateData(
        rawUpdateData,
        consultation.billing_type
      );

      if (hasOwn(updateData, 'client_id')) {
        updateData.client_id = normalizeNullableText(updateData.client_id);
        if (updateData.client_id) {
          await consultationRepository.assertClientAccess(
            updateData.client_id,
            actor,
            { transaction }
          );
        }
      }

      if (shouldUpdateAssignees) {
        await consultationRepository.assertEligibleAssignees(
          assignments.map((item) => item.user_id),
          { transaction }
        );
      }

      await consultationRepository.updateInstance(
        consultation,
        { ...updateData, updated_by: actorId },
        { transaction }
      );

      if (shouldUpdateAssignees) {
        await consultationRepository.replaceAssignees(
          id,
          assignments,
          actorId,
          { transaction }
        );
      }

      await createAudit({
        action: 'update',
        consultationId: id,
        actorId,
        oldValues,
        newValues: {
          ...updateData,
          ...(shouldUpdateAssignees ? { assignees: assignments } : {}),
        },
        description: 'Danışmanlık güncellendi',
        metadata: { event: 'consultation_updated' },
      }, transaction);

      return {
        title: consultation.title,
        oldAssignments,
        newAssignments: shouldUpdateAssignees ? assignments : [],
        shouldUpdateAssignees,
      };
    });

    if (result.shouldUpdateAssignees) {
      await notifyAssignmentChanges({
        consultationId: id,
        consultationTitle: result.title,
        actor,
        oldAssignments: result.oldAssignments,
        newAssignments: result.newAssignments,
      });
    }

    return consultationRepository.findOne(id, actor);
  },

  async remove(id, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw createConsultationError(
      'Danışmanlık kaydı bulunamadı.',
      404
    );

    return sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );
      if (!consultation) {
        throw createConsultationError(
          'Danışmanlık kaydı bulunamadı.',
          404
        );
      }

      assertConsultationDeletable(
        consultation
      );

      await createAudit({
        action: 'delete',
        consultationId: id,
        actorId,
        oldValues: consultation.toJSON(),
        description: 'Danışmanlık silindi',
        metadata: { event: 'consultation_deleted' },
      }, transaction);

      await consultationRepository.removeInstance(consultation, { transaction });
      return consultation;
    });
  },

  async updateStatus(id, status, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw createConsultationError(
      'Danışmanlık kaydı bulunamadı.',
      404
    );

    const normalizedStatus = String(status || '').trim();
    if (!Object.values(CONSULTATION_STATUS).includes(normalizedStatus)) {
      throw createConsultationError(
        'Geçersiz danışmanlık durumu.',
        400
      );
    }
    if (normalizedStatus === CONSULTATION_STATUS.CONVERTED_TO_CASE) {
      throw createConsultationError(
        'Davaya dönüştürüldü durumu yalnızca davaya dönüştürme işlemiyle atanabilir.',
        400
      );
    }

    await sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );
      if (!consultation) {
        throw createConsultationError(
          'Danışmanlık kaydı bulunamadı.',
          404
        );
      }

      const oldStatus = consultation.status;

      if (oldStatus === normalizedStatus) {
        return;
      }

      if (TERMINAL_CONSULTATION_STATUSES.has(oldStatus)) {
        const error = new Error(
          'Kapanmış danışmanlığın durumu değiştirilemez.'
        );
        error.statusCode = 409;
        throw error;
      }

      assertConsultationStatusTransition(
        oldStatus,
        normalizedStatus
      );

      const completedAt = normalizedStatus === CONSULTATION_STATUS.COMPLETED
        ? (consultation.completed_at || new Date())
        : null;

      await consultationRepository.updateInstance(
        consultation,
        {
          status: normalizedStatus,
          completed_at: completedAt,
          updated_by: actorId,
        },
        { transaction }
      );

      await createAudit({
        action: 'update',
        consultationId: id,
        actorId,
        oldValues: { status: oldStatus },
        newValues: { status: normalizedStatus, completed_at: completedAt },
        description: 'Danışmanlık durumu güncellendi',
        metadata: { event: 'consultation_status_changed' },
      }, transaction);
    });

    return consultationRepository.findOne(id, actor);
  },

  async addAssignee(id, data, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw createConsultationError(
      'Danışmanlık kaydı bulunamadı.',
      404
    );

    const assignment = {
      user_id: String(data?.user_id || '').trim(),
      is_primary: data?.is_primary === true,
    };

    const result = await sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );
      if (!consultation) {
        throw createConsultationError(
          'Danışmanlık kaydı bulunamadı.',
          404
        );
      }

      assertConsultationMutable(
        consultation
      );

      await consultationRepository.assertEligibleAssignees(
        [assignment.user_id],
        { transaction }
      );

      const current = await consultationRepository.getAssigneeRecords(id, { transaction });
      if (current.some((item) => item.user_id === assignment.user_id)) {
        throw createConsultationError(
          'Bu kullanıcı zaten danışmanlığa atanmış.',
          409
        );
      }

      const previousPrimary = current.find((item) => item.is_primary)?.user_id || null;
      if (assignment.is_primary) {
        await consultationRepository.clearPrimaryAssignee(id, { transaction });
      }

      await consultationRepository.addAssigneeRecord(
        id,
        assignment,
        actorId,
        { transaction }
      );

      await createAudit({
        action: 'update',
        consultationId: id,
        actorId,
        oldValues: { primary_assignee_id: previousPrimary },
        newValues: { added_assignee: assignment },
        description: 'Danışmanlığa sorumlu eklendi',
        metadata: { event: 'consultation_assignee_added', user_id: assignment.user_id },
      }, transaction);

      return {
        title: consultation.title,
        action: assignment.is_primary && previousPrimary
          ? 'transferred'
          : 'assigned',
      };
    });

    await Promise.allSettled([
      notifyConsultation({
        userId: assignment.user_id,
        consultationId: id,
        consultationTitle: result.title,
        actor,
        action: result.action,
      }),
    ]);

    return consultationRepository.findOne(id, actor);
  },

  async removeAssignee(id, userId, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw createConsultationError(
      'Danışmanlık kaydı bulunamadı.',
      404
    );

    await sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );
      if (!consultation) {
        throw createConsultationError(
          'Danışmanlık kaydı bulunamadı.',
          404
        );
      }

      assertConsultationMutable(
        consultation
      );

      const current = await consultationRepository.getAssigneeRecords(id, { transaction });
      const target = current.find((item) => item.user_id === userId);
      if (!target) {
        throw createConsultationError(
          'Danışmanlığa atanmış sorumlu kullanıcı bulunamadı.',
          404
        );
      }

      if (current.length <= 1) {
        throw createConsultationError(
          'Danışmanlıkta en az bir sorumlu kalmalıdır.',
          409
        );
      }

      await consultationRepository.removeAssigneeRecord(id, userId, { transaction });

      await createAudit({
        action: 'update',
        consultationId: id,
        actorId,
        oldValues: { removed_assignee: target },
        newValues: null,
        description: 'Danışmanlıktan sorumlu kaldırıldı',
        metadata: { event: 'consultation_assignee_removed', user_id: userId },
      }, transaction);
    });

    return consultationRepository.findOne(id, actor);
  },

  async getTasks(id, actor) {
    /*
     * Önce consultation domain erişimi fail-closed doğrulanır.
     * Ardından Task servisi kendi record-level scope'unu uygular.
     */
    const consultation =
      await consultationRepository.findScopedInstance(
        id,
        actor
      );

    if (!consultation) {
      throw createConsultationError(
        'Danışmanlık kaydı bulunamadı.',
        404
      );
    }

    return taskService.getByConsultation(
      id,
      getTaskAccessFromActor(
        actor
      )
    );
  },

  async getMeetings(id, actor) {
    /*
     * Önce consultation domain erişimi fail-closed doğrulanır.
     * Ardından Meeting servisi kendi record-level scope'unu uygular.
     */
    const consultation =
      await consultationRepository.findScopedInstance(
        id,
        actor
      );

    if (!consultation) {
      throw createConsultationError(
        'Danışmanlık kaydı bulunamadı.',
        404
      );
    }

    return meetingService.getByConsultation(
      id,
      getMeetingAccessFromActor(
        actor
      )
    );
  },

  async getDocuments(id, actor) {
    /*
     * Önce consultation erişimi kendi domain'inde doğrulanır.
     * Ardından Document servisi kendi read-access scope'unu uygular.
     */
    const consultation =
      await consultationRepository.findScopedInstance(
        id,
        actor
      );

    if (!consultation) {
      throw createConsultationError(
        'Danışmanlık kaydı bulunamadı.',
        404
      );
    }

    return documentService.getByConsultation(
      id,
      actor
    );
  },

  async getNotes(id, actor) {
    return consultationRepository.getNotes(id, actor);
  },

  async addNote(id, data, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw createConsultationError(
      'Danışmanlık kaydı bulunamadı.',
      404
    );

    const content = String(data?.content ?? '').trim();
    if (!content) {
      throw createConsultationError(
        'Not içeriği gereklidir.',
        400
      );
    }

    return sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );

      if (!consultation) {
        throw createConsultationError(
          'Danışmanlık kaydı bulunamadı.',
          404
        );
      }

      const note = await consultationRepository.addNoteRecord(
        id,
        actorId,
        content,
        { transaction }
      );

      await createAudit({
        action: 'update',
        consultationId: id,
        actorId,
        oldValues: null,
        newValues: { note_id: note.id },
        description: 'Danışmanlık notu eklendi',
        metadata: {
          event: 'consultation_note_added',
          note_id: note.id,
        },
      }, transaction);

      return consultationRepository.findNoteById(
        note.id,
        { transaction }
      );
    });
  },

  async convertToClient(id, data, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw createConsultationError(
      'Danışmanlık kaydı bulunamadı.',
      404
    );

    const result = await sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );
      if (!consultation) {
        throw createConsultationError(
          'Danışmanlık kaydı bulunamadı.',
          404
        );
      }

      if (consultation.client_id) {
        const error = new Error('Danışmanlık zaten bir müvekkile bağlı.');
        error.statusCode = 409;
        throw error;
      }

      const clientData = {
        ...(data || {}),
        name: normalizeNullableText(data?.name) || consultation.prospect_name,
        client_type: data?.client_type || 'individual',
        email: hasOwn(data || {}, 'email') ? data.email : consultation.prospect_email,
        phone: hasOwn(data || {}, 'phone') ? data.phone : consultation.prospect_phone,
      };

      let client;
      try {
        client = await clientService.create(
          clientData,
          actor,
          { transaction }
        );
      } catch (error) {
        throw markClientCreateError(error);
      }

      await consultationRepository.updateInstance(
        consultation,
        {
          client_id: client.id,
          updated_by: actorId,
        },
        { transaction }
      );

      const linkedFinance = await financeV2Service.linkConsultationToClient({
        consultationId: id,
        clientId: client.id,
        actorId,
        transaction,
      });

      await createAudit({
        action: 'update',
        consultationId: id,
        actorId,
        oldValues: { client_id: null },
        newValues: { client_id: client.id },
        description: 'Danışmanlık talep sahibi müvekkile dönüştürüldü',
        metadata: {
          event: 'consultation_converted_to_client',
          client_id: client.id,
          linked_finance: linkedFinance,
        },
      }, transaction);

      return {
        clientId: client.id,
        linkedFinance,
      };
    });

    const consultation = await consultationRepository.findOne(id, actor);
    return {
      consultation,
      client_id: result.clientId,
    };
  },

  async convertToCase(id, data, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw createConsultationError(
      'Danışmanlık kaydı bulunamadı.',
      404
    );

    const result = await sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );
      if (!consultation) {
        throw createConsultationError(
          'Danışmanlık kaydı bulunamadı.',
          404
        );
      }

      if (
        consultation.converted_case_id ||
        consultation.status === CONSULTATION_STATUS.CONVERTED_TO_CASE
      ) {
        const error = new Error('Danışmanlık zaten davaya dönüştürülmüş.');
        error.statusCode = 409;
        throw error;
      }

      if (
        TERMINAL_CONSULTATION_STATUSES.has(
          consultation.status
        )
      ) {
        const error =
          new Error(
            'Tamamlanmış veya kapatılmış danışmanlık davaya dönüştürülemez.'
          );

        error.statusCode =
          409;

        throw error;
      }

      if (!consultation.client_id) {
        throw createConsultationError(
          'Davaya dönüştürmeden önce talep sahibini müvekkile dönüştürmelisiniz.',
          409
        );
      }

      const assignedTo = String(data?.assigned_to || '').trim();
      await consultationRepository.assertCaseAssignableUser(
        assignedTo,
        { transaction }
      );

      const oldStatus =
        consultation.status;

      const judiciaryType =
        normalizeNullableText(
          data?.judiciary_type
        );

      const judiciaryUnit =
        normalizeNullableText(
          data?.judiciary_unit
        );

      const courtName =
        normalizeNullableText(
          data?.court_name
        );

      const caseNumber =
        normalizeNullableText(
          data?.case_number
        );

      if (
        !judiciaryType ||
        !judiciaryUnit ||
        !courtName ||
        !caseNumber
      ) {
        const error =
          new Error(
            'Yargı türü, yargı birimi, mahkeme ve dosya numarası gereklidir.'
          );

        error.statusCode =
          400;

        throw error;
      }

      const newCase = await caseService.createFromConsultation(
        {
          judiciary_type:
            judiciaryType,

          judiciary_unit:
            judiciaryUnit,

          court_name:
            courtName,

          case_number:
            caseNumber,

          subject:
            hasOwn(
              data || {},
              'subject'
            )
              ? normalizeNullableText(
                  data.subject
                )
              : consultation.title,

          description:
            hasOwn(
              data || {},
              'description'
            )
              ? normalizeNullableText(
                  data.description
                )
              : consultation.description,

          status:
            'preparation',

          priority:
            data?.priority ||
            consultation.priority ||
            'normal',

          assigned_to:
            assignedTo,

          opening_date:
            normalizeNullableText(
              data?.opening_date
            ),

          client_ids: [
            consultation.client_id,
          ],
        },
        actor,
        { transaction }
      );

      const linked = await consultationRepository.linkChildrenToCase(
        id,
        newCase.id,
        { transaction }
      );

      // Finance V2 records are not copied. Their consultation origin is preserved
      // and the new case is attached in the same atomic conversion transaction.
      const linkedFinance = await financeV2Service.linkConsultationToCase({
        consultationId: id,
        caseId: newCase.id,
        actorId,
        transaction,
      });

      await consultationRepository.updateInstance(
        consultation,
        {
          converted_case_id: newCase.id,
          status: CONSULTATION_STATUS.CONVERTED_TO_CASE,
          completed_at: consultation.completed_at || new Date(),
          updated_by: actorId,
        },
        { transaction }
      );

      await createAudit({
        action: 'update',
        consultationId: id,
        actorId,
        oldValues: {
          status: oldStatus,
          converted_case_id: null,
        },
        newValues: {
          status: CONSULTATION_STATUS.CONVERTED_TO_CASE,
          converted_case_id: newCase.id,
        },
        description: 'Danışmanlık davaya dönüştürüldü',
        metadata: {
          event: 'consultation_converted_to_case',
          case_id: newCase.id,
          linked_children: linked,
          linked_finance: linkedFinance,
        },
      }, transaction);

      return {
        caseId: newCase.id,
        caseTitle: newCase.title,
        consultationTitle: consultation.title,
        assignedTo,
        linked,
        linkedFinance,
      };
    });

    if (
      result.assignedTo &&
      result.assignedTo !== actorId
    ) {
      await Promise.allSettled([
        notificationService.notifyConsultationConvertedToCase(
          result.assignedTo,
          id,
          result.consultationTitle,
          result.caseId,
          result.caseTitle,
          getActorDisplayName(actor)
        ),
      ]);
    }

    return {
      consultation: await consultationRepository.findOne(id, actor),
      case_id: result.caseId,
      linked_children: result.linked,
    };
  },

  async getStatistics(actor) {
    return consultationRepository.getStatistics(actor);
  },
};

export default consultationService;
