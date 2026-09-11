import { Client } from '../../models/Client.js';
import { Case } from '../../models/Case.js';
import { Document } from '../../models/Document.js';
import { Task } from '../../models/Task.js';
import { User } from '../../models/User.js';
import { Note } from '../../models/Note.js';
import { Consultation } from '../../models/Consultation.js';

import { Op, Sequelize } from 'sequelize';
import { sequelize } from '../../config/database.js';

import {
  ROLES,
  PERMISSION_KEYS,
  getEffectivePermissions,
} from '../../constants/roles.js';

const getActorId = (actor) => actor?.id || null;

const requireActor = (actor) => {
  const actorId = getActorId(actor);

  if (!actorId) {
    throw new Error('Search user not found');
  }

  return actorId;
};

const getActorPermissions = (actor) => {
  if (!actor) return [];

  return getEffectivePermissions(
    actor.role,
    actor.permissions || {}
  );
};

const isAdmin = (actor) =>
  actor?.role === ROLES.ADMIN;

const hasActorPermission = (actor, permission) =>
  isAdmin(actor) ||
  getActorPermissions(actor).includes(permission);

const canViewAllCases = (actor) =>
  hasActorPermission(
    actor,
    PERMISSION_KEYS.VIEW_ALL_CASES
  );

const canViewAllTasks = (actor) =>
  hasActorPermission(
    actor,
    PERMISSION_KEYS.VIEW_ALL_TASKS
  );

const canViewAllConsultations = (actor) =>
  hasActorPermission(
    actor,
    PERMISSION_KEYS.VIEW_ALL_CONSULTATIONS
  );

const buildConsultationAccessWhere = (actor) => {
  const actorId = requireActor(actor);

  if (canViewAllConsultations(actor)) {
    return {};
  }

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

const normalizeSearchTerm = (query) =>
  typeof query === 'string'
    ? query.trim().slice(0, 150)
    : '';

const normalizeLimit = (limit, fallback = 20) =>
  Math.min(
    Math.max(
      Number.parseInt(limit, 10) || fallback,
      1
    ),
    50
  );

const hasWhereContent = (value) =>
  Boolean(
    value &&
      typeof value === 'object' &&
      Reflect.ownKeys(value).length > 0
  );

const combineWhere = (...conditions) => {
  const valid = conditions.filter(hasWhereContent);

  if (valid.length === 0) return {};
  if (valid.length === 1) return valid[0];

  return {
    [Op.and]: valid,
  };
};

const buildCaseAccessWhere = (actor) => {
  const actorId = requireActor(actor);

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

const buildClientAccessWhere = (actor) => {
  const actorId = requireActor(actor);

  if (isAdmin(actor)) {
    return {};
  }

  const escapedActorId =
    sequelize.escape(actorId);

  const relatedCasePredicate =
    canViewAllCases(actor)
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
      Sequelize.where(
        Sequelize.literal(
          relatedCasePredicate
        ),
        true
      ),
    ],
  };
};

const buildDocumentReadAccessWhere = (actor) => {
  const actorId = requireActor(actor);

  if (isAdmin(actor)) {
    return {};
  }

  const caseLinkedScope =
    canViewAllCases(actor)
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
                {
                  '$case.created_by$':
                    actorId,
                },
                {
                  '$case.assigned_to$':
                    actorId,
                },
              ],
            },
          ],
        };

  const clientCasePredicate =
    canViewAllCases(actor)
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
      {
        is_public: true,
      },
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
              {
                '$client.created_by$':
                  actorId,
              },
              Sequelize.where(
                Sequelize.literal(
                  clientCasePredicate
                ),
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

const buildTaskAccessWhere = (actor) => {
  const actorId = requireActor(actor);

  if (canViewAllTasks(actor)) {
    return {};
  }

  return {
    [Op.or]: [
      { created_by: actorId },
      {
        '$assignees.id$':
          actorId,
      },
    ],
  };
};

const getAccessibleRelationIds = async (actor) => {
  const [caseRows, clientRows] =
    await Promise.all([
      Case.findAll({
        where:
          buildCaseAccessWhere(actor),
        attributes: ['id'],
        raw: true,
      }),
      Client.findAll({
        where:
          buildClientAccessWhere(actor),
        attributes: ['id'],
        raw: true,
      }),
    ]);

  return {
    caseIds:
      new Set(
        caseRows.map(
          (item) => item.id
        )
      ),
    clientIds:
      new Set(
        clientRows.map(
          (item) => item.id
        )
      ),
  };
};

const sanitizeTaskRelations = (
  tasks,
  { caseIds, clientIds }
) =>
  tasks.map((task) => {
    if (
      task.case_id &&
      !caseIds.has(task.case_id)
    ) {
      task.setDataValue?.(
        'case_id',
        null
      );
      task.setDataValue?.(
        'case',
        null
      );

      if (task.dataValues) {
        task.dataValues.case_id =
          null;
        task.dataValues.case =
          null;
      }
    }

    if (
      task.client_id &&
      !clientIds.has(
        task.client_id
      )
    ) {
      task.setDataValue?.(
        'client_id',
        null
      );
      task.setDataValue?.(
        'client',
        null
      );

      if (task.dataValues) {
        task.dataValues.client_id =
          null;
        task.dataValues.client =
          null;
      }
    }

    return task;
  });

const buildNoteAccessWhere = async (actor) => {
  const actorId = requireActor(actor);

  if (isAdmin(actor)) {
    return {};
  }

  const {
    caseIds,
    clientIds,
  } =
    await getAccessibleRelationIds(
      actor
    );

  const scopes = [
    {
      [Op.and]: [
        { case_id: null },
        { client_id: null },
        { created_by: actorId },
      ],
    },
  ];

  if (caseIds.size > 0) {
    scopes.push({
      case_id: {
        [Op.in]:
          Array.from(caseIds),
      },
    });
  }

  if (clientIds.size > 0) {
    scopes.push({
      [Op.and]: [
        { case_id: null },
        {
          client_id: {
            [Op.in]:
              Array.from(
                clientIds
              ),
          },
        },
      ],
    });
  }

  return {
    [Op.or]: scopes,
  };
};

export const searchService = {
  async searchClients(
    query,
    limit,
    actor
  ) {
    requireActor(actor);

    const searchTerm =
      normalizeSearchTerm(query);

    if (searchTerm.length < 2) {
      return [];
    }

    const parts =
      searchTerm
        .split(' ')
        .filter(Boolean);

    const searchWhere =
      parts.length === 1
        ? {
            [Op.or]: [
              {
                name: {
                  [Op.iLike]:
                    `%${parts[0]}%`,
                },
              },
              {
                email: {
                  [Op.iLike]:
                    `%${parts[0]}%`,
                },
              },
              {
                phone: {
                  [Op.iLike]:
                    `%${parts[0]}%`,
                },
              },
              {
                identification_number: {
                  [Op.iLike]:
                    `%${parts[0]}%`,
                },
              },
            ],
          }
        : {
            name: {
              [Op.iLike]:
                `%${searchTerm}%`,
            },
          };

    return Client.findAll({
      where:
        combineWhere(
          searchWhere,
          buildClientAccessWhere(
            actor
          )
        ),
      attributes: [
        'id',
        'name',
        'identification_number',
        'email',
        'phone',
        'status',
        'client_type',
      ],
      limit:
        normalizeLimit(limit),
      order: [
        ['name', 'ASC'],
      ],
    });
  },

  async searchCases(
    query,
    limit,
    actor
  ) {
    requireActor(actor);

    const searchTerm =
      normalizeSearchTerm(query);

    if (searchTerm.length < 2) {
      return [];
    }

    return Case.findAll({
      where:
        combineWhere(
          {
            [Op.or]: [
              {
                title: {
                  [Op.iLike]:
                    `%${searchTerm}%`,
                },
              },
              {
                case_number: {
                  [Op.iLike]:
                    `%${searchTerm}%`,
                },
              },
              {
                court_name: {
                  [Op.iLike]:
                    `%${searchTerm}%`,
                },
              },
              {
                subject: {
                  [Op.iLike]:
                    `%${searchTerm}%`,
                },
              },
              {
                description: {
                  [Op.iLike]:
                    `%${searchTerm}%`,
                },
              },
            ],
          },
          buildCaseAccessWhere(actor)
        ),
      include: [
        {
          model: Client,
          as: 'clients',
          attributes: [
            'id',
            'name',
          ],
          through: {
            attributes: [],
          },
        },
      ],
      attributes: [
        'id',
        'title',
        'case_number',
        'court_name',
        'status',
        'opening_date',
        'created_at',
      ],
      order: [
        ['created_at', 'DESC'],
      ],
      limit:
        normalizeLimit(limit),
      subQuery: false,
    });
  },

  async searchDocuments(
    query,
    limit,
    actor
  ) {
    requireActor(actor);

    const searchTerm =
      normalizeSearchTerm(query);

    if (searchTerm.length < 2) {
      return [];
    }

    return Document.findAll({
      where:
        combineWhere(
          {
            [Op.or]: [
              {
                name: {
                  [Op.iLike]:
                    `%${searchTerm}%`,
                },
              },
              {
                original_name: {
                  [Op.iLike]:
                    `%${searchTerm}%`,
                },
              },
              {
                description: {
                  [Op.iLike]:
                    `%${searchTerm}%`,
                },
              },
              {
                category: {
                  [Op.iLike]:
                    `%${searchTerm}%`,
                },
              },
            ],
          },
          buildDocumentReadAccessWhere(
            actor
          )
        ),
      include: [
        {
          model: Case,
          as: 'case',
          attributes: [
            'id',
            'title',
          ],
          required: false,
        },
        {
          model: Client,
          as: 'client',
          attributes: [
            'id',
            'name',
          ],
          required: false,
        },
        {
          model: User,
          as: 'uploader',
          attributes: [
            'id',
            'first_name',
            'last_name',
          ],
          required: false,
        },
      ],
      attributes: [
        'id',
        'name',
        'original_name',
        'file_type',
        'file_size',
        'category',
      ],
      limit:
        normalizeLimit(limit),
      order: [
        ['created_at', 'DESC'],
      ],
      subQuery: false,
    });
  },

  async searchTasks(
    query,
    limit,
    actor
  ) {
    requireActor(actor);

    const searchTerm =
      normalizeSearchTerm(query);

    if (searchTerm.length < 2) {
      return [];
    }

    const relationIds =
      await getAccessibleRelationIds(
        actor
      );

    const tasks =
      await Task.findAll({
        where:
          combineWhere(
            {
              [Op.or]: [
                {
                  title: {
                    [Op.iLike]:
                      `%${searchTerm}%`,
                  },
                },
                {
                  description: {
                    [Op.iLike]:
                      `%${searchTerm}%`,
                  },
                },
              ],
            },
            buildTaskAccessWhere(actor)
          ),
        include: [
          {
            model: Case,
            as: 'case',
            attributes: [
              'id',
              'title',
            ],
            required: false,
          },
          {
            association:
              'assignees',
            attributes: [
              'id',
              'first_name',
              'last_name',
            ],
            through: {
              attributes: [],
            },
            required: false,
          },
          {
            model: Client,
            as: 'client',
            attributes: [
              'id',
              'name',
            ],
            required: false,
          },
        ],
        attributes: [
          'id',
          'title',
          'status',
          'priority',
          'due_date',
          'case_id',
          'client_id',
        ],
        limit:
          normalizeLimit(limit),
        order: [
          ['priority', 'DESC'],
          ['due_date', 'ASC'],
        ],
        subQuery: false,
      });

    return sanitizeTaskRelations(
      tasks,
      relationIds
    );
  },

  async searchConsultations(
    query,
    limit,
    actor
  ) {
    requireActor(actor);

    const searchTerm =
      normalizeSearchTerm(query);

    if (searchTerm.length < 2) {
      return [];
    }

    return Consultation.findAll({
      where:
        combineWhere(
          {
            [Op.or]: [
              {
                consultation_number: {
                  [Op.iLike]: `%${searchTerm}%`,
                },
              },
              {
                title: {
                  [Op.iLike]: `%${searchTerm}%`,
                },
              },
              {
                description: {
                  [Op.iLike]: `%${searchTerm}%`,
                },
              },
              {
                legal_area: {
                  [Op.iLike]: `%${searchTerm}%`,
                },
              },
              {
                prospect_name: {
                  [Op.iLike]: `%${searchTerm}%`,
                },
              },
              {
                prospect_email: {
                  [Op.iLike]: `%${searchTerm}%`,
                },
              },
              {
                prospect_phone: {
                  [Op.iLike]: `%${searchTerm}%`,
                },
              },
            ],
          },
          buildConsultationAccessWhere(actor)
        ),
      attributes: [
        'id',
        'consultation_number',
        'title',
        'status',
        'priority',
        'legal_area',
        'client_id',
        'prospect_name',
        'opened_at',
        'created_at',
        'converted_case_id',
      ],
      limit:
        normalizeLimit(limit),
      order: [
        ['updated_at', 'DESC'],
      ],
    });
  },

  async searchNotes(
    query,
    limit,
    actor
  ) {
    requireActor(actor);

    const searchTerm =
      normalizeSearchTerm(query);

    if (searchTerm.length < 2) {
      return [];
    }

    return Note.findAll({
      where:
        combineWhere(
          {
            content: {
              [Op.iLike]:
                `%${searchTerm}%`,
            },
          },
          await buildNoteAccessWhere(
            actor
          )
        ),
      include: [
        {
          model: Case,
          as: 'case',
          attributes: [
            'id',
            'title',
          ],
          required: false,
        },
        {
          model: Client,
          as: 'client',
          attributes: [
            'id',
            'name',
          ],
          required: false,
        },
        {
          model: User,
          as: 'creator',
          attributes: [
            'id',
            'first_name',
            'last_name',
          ],
          required: false,
        },
      ],
      attributes: [
        'id',
        'content',
        'note_type',
      ],
      limit:
        normalizeLimit(limit),
    });
  },

  async searchAll(
    query,
    limit,
    actor
  ) {
    requireActor(actor);

    const searchTerm =
      normalizeSearchTerm(query);
    const safeLimit =
      normalizeLimit(
        limit,
        10
      );

    const [
      clients,
      cases,
      documents,
      tasks,
      consultations,
      notes,
    ] =
      await Promise.all([
        this.searchClients(
          searchTerm,
          safeLimit,
          actor
        ),
        this.searchCases(
          searchTerm,
          safeLimit,
          actor
        ),
        this.searchDocuments(
          searchTerm,
          safeLimit,
          actor
        ),
        this.searchTasks(
          searchTerm,
          safeLimit,
          actor
        ),
        this.searchConsultations(
          searchTerm,
          safeLimit,
          actor
        ),
        this.searchNotes(
          searchTerm,
          safeLimit,
          actor
        ),
      ]);

    return {
      clients,
      cases,
      documents,
      tasks,
      consultations,
      notes,
      total:
        clients.length +
        cases.length +
        documents.length +
        tasks.length +
        consultations.length +
        notes.length,
    };
  },

  async search(
    query,
    type,
    limit,
    actor
  ) {
    requireActor(actor);

    switch (type) {
      case 'clients':
        return this.searchClients(
          query,
          limit,
          actor
        );
      case 'cases':
        return this.searchCases(
          query,
          limit,
          actor
        );
      case 'documents':
        return this.searchDocuments(
          query,
          limit,
          actor
        );
      case 'tasks':
        return this.searchTasks(
          query,
          limit,
          actor
        );
      case 'consultations':
        return this.searchConsultations(
          query,
          limit,
          actor
        );
      case 'notes':
        return this.searchNotes(
          query,
          limit,
          actor
        );
      case 'all':
      default:
        return this.searchAll(
          query,
          limit,
          actor
        );
    }
  },

  async getSuggestions(
    query,
    actor
  ) {
    requireActor(actor);

    const searchTerm =
      normalizeSearchTerm(query);

    if (searchTerm.length < 2) {
      return [];
    }

    const [
      clients,
      cases,
      documents,
      consultations,
    ] =
      await Promise.all([
        Client.findAll({
          where:
            combineWhere(
              {
                name: {
                  [Op.iLike]:
                    `%${searchTerm}%`,
                },
              },
              buildClientAccessWhere(
                actor
              )
            ),
          attributes: [
            'id',
            'name',
          ],
          limit: 3,
        }),

        Case.findAll({
          where:
            combineWhere(
              {
                [Op.or]: [
                  {
                    title: {
                      [Op.iLike]:
                        `%${searchTerm}%`,
                    },
                  },
                  {
                    case_number: {
                      [Op.iLike]:
                        `%${searchTerm}%`,
                    },
                  },
                ],
              },
              buildCaseAccessWhere(
                actor
              )
            ),
          attributes: [
            'id',
            'title',
            'case_number',
          ],
          limit: 3,
        }),

        Document.findAll({
          where:
            combineWhere(
              {
                [Op.or]: [
                  {
                    name: {
                      [Op.iLike]:
                        `%${searchTerm}%`,
                    },
                  },
                  {
                    original_name: {
                      [Op.iLike]:
                        `%${searchTerm}%`,
                    },
                  },
                ],
              },
              buildDocumentReadAccessWhere(
                actor
              )
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
          attributes: [
            'id',
            'name',
          ],
          limit: 2,
          subQuery: false,
        }),

        this.searchConsultations(
          searchTerm,
          3,
          actor
        ),
      ]);

    const suggestions = [];

    clients.forEach((client) => {
      suggestions.push({
        type: 'client',
        id: client.id,
        label: client.name,
        url:
          `/clients/${client.id}`,
      });
    });

    cases.forEach((caseItem) => {
      suggestions.push({
        type: 'case',
        id: caseItem.id,
        label:
          `${caseItem.title}${
            caseItem.case_number
              ? ` (${caseItem.case_number})`
              : ''
          }`,
        url:
          `/cases/${caseItem.id}`,
      });
    });

    consultations.forEach((consultation) => {
      suggestions.push({
        type: 'consultation',
        id: consultation.id,
        label: [
          consultation.consultation_number,
          consultation.title,
        ]
          .filter(Boolean)
          .join(' · '),
        url:
          `/consultations/${consultation.id}`,
      });
    });

    documents.forEach((document) => {
      suggestions.push({
        type: 'document',
        id: document.id,
        label: document.name,
        url: '/documents',
      });
    });

    return suggestions;
  },
};

export default searchService;
