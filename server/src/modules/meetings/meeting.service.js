import {
  Op,
  QueryTypes,
} from 'sequelize';

import {
  Meeting,
} from '../../models/Meeting.js';

import {
  Case,
} from '../../models/Case.js';

import {
  Client,
} from '../../models/Client.js';

import {
  User,
} from '../../models/User.js';

import {
  sequelize,
} from '../../config/database.js';

import {
  logger,
} from '../../config/logger.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

import {
  notificationService,
} from '../notifications/notification.service.js';

import {
  reminderService,
} from '../reminders/reminder.service.js';

import {
  googleCalendarSyncService,
} from '../calendar-integration/google-calendar-sync.service.js';

// ======================================================
// CONSTANTS
// ======================================================

const TERMINAL_STATUSES =
  new Set([
    'completed',
    'cancelled',
  ]);

const ALLOWED_STATUSES =
  new Set([
    'scheduled',
    'ongoing',
    'completed',
    'cancelled',
  ]);

const ALLOWED_MEETING_TYPES =
  new Set([
    'client',
    'internal',
    'phone',
    'other',
  ]);

const USER_SUMMARY_ATTRIBUTES = [
  'id',
  'first_name',
  'last_name',
];

const ASSIGNEE_ATTRIBUTES = [
  'id',
  'first_name',
  'last_name',
  'email',
];

/*
 * created_by / assigned_to yalnız response sanitization
 * sırasında record-level Case erişimini anlamak için
 * yüklenir. Response'tan sonra kaldırılır.
 */
const CASE_SUMMARY_ATTRIBUTES = [
  'id',
  'title',
  'case_number',
  'court_name',
  'judiciary_type',
  'judiciary_unit',
  'created_by',
  'assigned_to',
];

/*
 * created_by yalnız response sanitization için kullanılır.
 */
const CLIENT_SUMMARY_ATTRIBUTES = [
  'id',
  'name',
  'created_by',
];

// ======================================================
// BASIC HELPERS
// ======================================================

const normalizePagination = (
  page,
  limit
) => {
  const pageNumber =
    Math.max(
      Number.parseInt(
        page,
        10
      ) || 1,
      1
    );

  const limitNumber =
    Math.min(
      Math.max(
        Number.parseInt(
          limit,
          10
        ) || 10,
        1
      ),
      100
    );

  return {
    pageNumber,
    limitNumber,
  };
};

const normalizeSearch = (
  value
) => {
  if (
    typeof value !==
    'string'
  ) {
    return '';
  }

  return value
    .trim()
    .slice(
      0,
      150
    );
};

const normalizeUserIds = (
  values = []
) => {
  return [
    ...new Set(
      values
        .flatMap(
          (value) =>
            Array.isArray(
              value
            )
              ? value
              : [
                  value,
                ]
        )
        .map(
          (value) =>
            value
              ? String(
                  value
                ).trim()
              : null
        )
        .filter(
          Boolean
        )
    ),
  ];
};

const getRequestedParticipantIds = (
  data = {}
) => {
  if (
    Object.prototype.hasOwnProperty.call(
      data,
      'attendee_ids'
    )
  ) {
    if (
      !Array.isArray(
        data.attendee_ids
      )
    ) {
      throw new Error(
        'Toplantı katılımcıları liste formatında olmalıdır'
      );
    }

    return normalizeUserIds(
      data.attendee_ids
    );
  }

  if (
    data?.assigned_to
  ) {
    return normalizeUserIds([
      data.assigned_to,
    ]);
  }

  return [];
};

const assertAtLeastOneMeetingParticipant = (
  participantIds
) => {
  if (
    !Array.isArray(
      participantIds
    ) ||
    participantIds.length ===
      0
  ) {
    throw new Error(
      'Toplantı için en az bir katılımcı seçilmelidir'
    );
  }

  return participantIds;
};

const parseDate = (
  value,
  errorMessage
) => {
  if (!value) {
    return null;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      errorMessage
    );
  }

  return parsed;
};

const PAST_DATE_TOLERANCE_MS =
  60 * 1000;

const validateMeetingDates = ({
  startDate,
  endDate,
  rejectPastStart = false,
}) => {
  if (!startDate) {
    throw new Error(
      'Toplantı başlangıç tarihi gereklidir'
    );
  }

  const parsedStart =
    parseDate(
      startDate,
      'Geçerli bir toplantı başlangıç tarihi girilmelidir'
    );

  if (
    rejectPastStart &&
    parsedStart.getTime() <
      Date.now() -
        PAST_DATE_TOLERANCE_MS
  ) {
    throw new Error(
      'Toplantı başlangıç tarihi geçmiş bir tarih olamaz'
    );
  }

  if (!endDate) {
    return;
  }

  const parsedEnd =
    parseDate(
      endDate,
      'Geçerli bir toplantı bitiş tarihi girilmelidir'
    );

  if (
    parsedEnd <
    parsedStart
  ) {
    throw new Error(
      'Toplantı bitiş tarihi başlangıç tarihinden önce olamaz'
    );
  }
};

const hasMeetingStartDateChanged = (
  nextStartDate,
  currentStartDate
) => {
  if (
    nextStartDate ===
    undefined
  ) {
    return false;
  }

  const next =
    new Date(
      nextStartDate
    );

  const current =
    currentStartDate
      ? new Date(
          currentStartDate
        )
      : null;

  if (
    Number.isNaN(
      next.getTime()
    )
  ) {
    /*
     * Geçersiz tarih asıl tarih doğrulamasında
     * anlaşılır hata ile reddedilir.
     */
    return true;
  }

  if (
    !current ||
    Number.isNaN(
      current.getTime()
    )
  ) {
    return true;
  }

  return (
    next.getTime() !==
    current.getTime()
  );
};

const validateStatus = (
  status
) => {
  if (
    !ALLOWED_STATUSES.has(
      status
    )
  ) {
    throw new Error(
      'Invalid meeting status'
    );
  }
};

const validateMeetingType = (
  meetingType
) => {
  if (
    meetingType &&
    !ALLOWED_MEETING_TYPES.has(
      meetingType
    )
  ) {
    throw new Error(
      'Invalid meeting type'
    );
  }
};

const shouldHaveReminders = (
  meeting
) => {
  return (
    Boolean(
      meeting?.start_date
    ) &&
    !TERMINAL_STATUSES.has(
      meeting?.status
    )
  );
};

// ======================================================
// INPUT NORMALIZATION
// ======================================================

const prepareMeetingData = (
  data
) => {
  const prepared = {
    ...data,
  };

  /*
   * DB/system alanları request body üzerinden
   * değiştirilemez.
   */
  delete prepared.id;
  delete prepared.created_at;
  delete prepared.updated_at;
  delete prepared.deleted_at;
  delete prepared.attendee_ids;

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'title'
    )
  ) {
    prepared.title =
      String(
        prepared.title || ''
      ).trim();
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'description'
    )
  ) {
    prepared.description =
      prepared.description
        ? String(
            prepared.description
          ).trim()
        : null;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'location'
    )
  ) {
    prepared.location =
      prepared.location
        ? String(
            prepared.location
          ).trim()
        : null;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'meeting_link'
    )
  ) {
    prepared.meeting_link =
      prepared.meeting_link
        ? String(
            prepared.meeting_link
          ).trim()
        : null;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'notes'
    )
  ) {
    prepared.notes =
      prepared.notes
        ? String(
            prepared.notes
          ).trim()
        : null;
  }

  if (
    prepared.status
  ) {
    validateStatus(
      prepared.status
    );
  }

  if (
    prepared.meeting_type
  ) {
    validateMeetingType(
      prepared.meeting_type
    );
  }

  return prepared;
};

// ======================================================
// RECORD-LEVEL ACCESS
// ======================================================

const requireMeetingUserId = (
  access = {}
) => {
  const userId =
    access?.userId ||
    null;

  if (!userId) {
    throw new Error(
      'Meeting not found'
    );
  }

  return userId;
};

const buildParticipantMembershipWhere = (
  userId
) => {
  if (!userId) {
    return {
      id: null,
    };
  }

  return {
    id: {
      [Op.in]:
        sequelize.literal(
          `(SELECT ma.meeting_id FROM meeting_attendees ma WHERE ma.user_id = ${sequelize.escape(userId)})`
        ),
    },
  };
};

const buildMeetingAccessWhere = ({
  userId,
  canViewAllMeetings = false,
} = {}) => {
  if (
    canViewAllMeetings
  ) {
    return null;
  }

  if (!userId) {
    return {
      id: null,
    };
  }

  return {
    [Op.or]: [
      {
        created_by:
          userId,
      },

      /*
       * Legacy kayıtlar / eski client uyumluluğu.
       */
      {
        assigned_to:
          userId,
      },

      buildParticipantMembershipWhere(
        userId
      ),
    ],
  };
};

const applyMeetingAccessScope = (
  where = {},
  access = {}
) => {
  const accessWhere =
    buildMeetingAccessWhere(
      access
    );

  if (!accessWhere) {
    return where;
  }

  if (
    Object.keys(
      where
    ).length === 0 &&
    Object.getOwnPropertySymbols(
      where
    ).length === 0
  ) {
    return accessWhere;
  }

  return {
    [Op.and]: [
      where,
      accessWhere,
    ],
  };
};

const canAccessCaseInstance = (
  caseItem,
  access = {}
) => {
  if (!caseItem) {
    return false;
  }

  if (
    access?.canViewAllCases
  ) {
    return true;
  }

  const userId =
    access?.userId;

  if (!userId) {
    return false;
  }

  return (
    caseItem.created_by ===
      userId ||
    caseItem.assigned_to ===
      userId
  );
};

const assertCaseAccessForMeeting =
  async (
    caseId,
    access = {},
    {
      transaction = null,
    } = {}
  ) => {
    if (!caseId) {
      return null;
    }

    const userId =
      requireMeetingUserId(
        access
      );

    const where = {
      id:
        caseId,
    };

    if (
      !access?.canViewAllCases
    ) {
      where[Op.or] = [
        {
          created_by:
            userId,
        },

        {
          assigned_to:
            userId,
        },
      ];
    }

    const caseItem =
      await Case.findOne({
        where,

        attributes:
  CASE_SUMMARY_ATTRIBUTES,

        transaction,
      });

    if (!caseItem) {
      throw new Error(
        'Meeting not found'
      );
    }

    return caseItem;
  };

const assertClientAccessForMeeting =
  async (
    clientId,
    access = {},
    {
      transaction = null,
    } = {}
  ) => {
    if (!clientId) {
      return null;
    }

    const userId =
      requireMeetingUserId(
        access
      );

    const client =
      await Client.findByPk(
        clientId,
        {
          attributes: [
            'id',
            'name',
            'created_by',
          ],

          transaction,
        }
      );

    if (!client) {
      throw new Error(
        'Meeting not found'
      );
    }

    if (
      client.created_by ===
      userId
    ) {
      return client;
    }

    const caseCondition =
      access?.canViewAllCases
        ? ''
        : `
          AND (
            c.created_by = :userId
            OR c.assigned_to = :userId
          )
        `;

    const rows =
      await sequelize.query(
        `
          SELECT 1

          FROM case_clients cc

          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL

          WHERE cc.client_id = :clientId

          ${caseCondition}

          LIMIT 1
        `,
        {
          replacements: {
            clientId,
            userId,
          },

          type:
            QueryTypes.SELECT,

          transaction,
        }
      );

    if (
      rows.length ===
      0
    ) {
      throw new Error(
        'Meeting not found'
      );
    }

    return client;
  };

const assertConsultationAccessForMeeting =
  async (
    consultationId,
    access = {},
    {
      transaction = null,
    } = {}
  ) => {
    if (!consultationId) {
      return null;
    }

    const userId =
      requireMeetingUserId(
        access
      );

    if (
      !access?.canViewConsultations &&
      !access?.canViewAllConsultations
    ) {
      throw new Error(
        'Meeting not found'
      );
    }

    const consultationAccessCondition =
      access?.canViewAllConsultations
        ? ''
        : `
          AND (
            c.created_by = :userId
            OR EXISTS (
              SELECT 1
              FROM consultation_assignees ca
              WHERE ca.consultation_id = c.id
                AND ca.user_id = :userId
            )
          )
        `;

    const rows =
      await sequelize.query(
        `
          SELECT
            c.id,
            c.client_id,
            c.converted_case_id

          FROM consultations c

          WHERE c.id = :consultationId
            AND c.deleted_at IS NULL

          ${consultationAccessCondition}

          LIMIT 1
        `,
        {
          replacements: {
            consultationId,
            userId,
          },

          type:
            QueryTypes.SELECT,

          transaction,
        }
      );

    if (
      rows.length ===
      0
    ) {
      throw new Error(
        'Meeting not found'
      );
    }

    return rows[0];
  };

const assertCaseClientRelation =
  async (
    caseId,
    clientId,
    transaction = null
  ) => {
    if (
      !caseId ||
      !clientId
    ) {
      return;
    }

    const rows =
      await sequelize.query(
        `
          SELECT 1

          FROM case_clients

          WHERE case_id = :caseId
            AND client_id = :clientId

          LIMIT 1
        `,
        {
          replacements: {
            caseId,
            clientId,
          },

          type:
            QueryTypes.SELECT,

          transaction,
        }
      );

    if (
      rows.length ===
      0
    ) {
      throw new Error(
        'Seçilen dava bu müvekkille ilişkili değil'
      );
    }
  };

const validateAssignedUser =
  async (
    userId,
    transaction = null
  ) => {
    if (!userId) {
      return null;
    }

    const user =
      await User.findOne({
        where: {
          id:
            userId,

          is_active:
            true,
        },

        attributes:
          ASSIGNEE_ATTRIBUTES,

        transaction,
      });

    if (!user) {
      throw new Error(
        'Atanan kullanıcı bulunamadı'
      );
    }

    return user;
  };

const validateMeetingParticipants =
  async (
    participantIds,
    transaction = null
  ) => {
    const ids =
      normalizeUserIds(
        participantIds
      );

    if (
      ids.length ===
      0
    ) {
      return [];
    }

    const users =
      await User.findAll({
        where: {
          id: {
            [Op.in]:
              ids,
          },

          is_active:
            true,
        },

        attributes:
          ASSIGNEE_ATTRIBUTES,

        transaction,
      });

    if (
      users.length !==
      ids.length
    ) {
      throw new Error(
        'Atanan kullanıcılardan biri bulunamadı veya aktif değil'
      );
    }

    const byId =
      new Map(
        users.map(
          (user) => [
            user.id,
            user,
          ]
        )
      );

    return ids.map(
      (id) =>
        byId.get(
          id
        )
    );
  };

const loadMeetingParticipantUsers =
  async (
    meeting,
    {
      transaction = null,
    } = {}
  ) => {
    if (!meeting?.id) {
      return [];
    }

    if (
      Array.isArray(
        meeting.participantUsers
      )
    ) {
      return meeting.participantUsers;
    }

    if (
      typeof meeting.getParticipantUsers ===
      'function'
    ) {
      const users =
        await meeting.getParticipantUsers({
          attributes:
            ASSIGNEE_ATTRIBUTES,

          joinTableAttributes:
            [],

          transaction,
        });

      meeting.setDataValue?.(
        'participantUsers',
        users
      );

      return users;
    }

    if (
      meeting.assigned_to
    ) {
      const legacyUser =
        await validateAssignedUser(
          meeting.assigned_to,
          transaction
        );

      return legacyUser
        ? [
            legacyUser,
          ]
        : [];
    }

    return [];
  };

const sameUserIdSet = (
  left = [],
  right = []
) => {
  const a =
    normalizeUserIds(
      left
    ).sort();

  const b =
    normalizeUserIds(
      right
    ).sort();

  return (
    a.length ===
      b.length &&
    a.every(
      (
        value,
        index
      ) =>
        value ===
        b[index]
    )
  );
};

const validateMeetingRelations =
  async (
    {
      caseId,
      clientId,
      consultationId,
      assignedTo,
    },
    access = {},
    {
      transaction = null,
    } = {}
  ) => {
    if (caseId) {
      await assertCaseAccessForMeeting(
        caseId,
        access,
        {
          transaction,
        }
      );
    }

    if (clientId) {
      await assertClientAccessForMeeting(
        clientId,
        access,
        {
          transaction,
        }
      );
    }

    if (consultationId) {
      await assertConsultationAccessForMeeting(
        consultationId,
        access,
        {
          transaction,
        }
      );
    }

    if (
      caseId &&
      clientId
    ) {
      await assertCaseClientRelation(
        caseId,
        clientId,
        transaction
      );
    }

    if (assignedTo) {
      await validateAssignedUser(
        assignedTo,
        transaction
      );
    }
  };

// ======================================================
// INCLUDES / RESPONSE SANITIZATION
// ======================================================

const buildIncludes = ({
  includeClient = true,
  includeCase = true,
  includeCreator = true,
  includeAssignee = true,
  includeParticipants = true,
} = {}) => {
  const includes = [];

  if (includeCase) {
    includes.push({
      model:
        Case,

      as:
        'case',

      attributes:
        CASE_SUMMARY_ATTRIBUTES,

      required:
        false,
    });
  }

  if (includeClient) {
    includes.push({
      model:
        Client,

      as:
        'client',

      attributes:
        CLIENT_SUMMARY_ATTRIBUTES,

      required:
        false,
    });
  }

  if (includeCreator) {
    includes.push({
      model:
        User,

      as:
        'creator',

      attributes:
        USER_SUMMARY_ATTRIBUTES,

      required:
        false,
    });
  }

  if (includeAssignee) {
    includes.push({
      model:
        User,

      as:
        'assignee',

      attributes:
        ASSIGNEE_ATTRIBUTES,

      required:
        false,
    });
  }

  if (
    includeParticipants
  ) {
    includes.push({
      model:
        User,

      as:
        'participantUsers',

      attributes:
        ASSIGNEE_ATTRIBUTES,

      through: {
        attributes:
          [],
      },

      required:
        false,
    });
  }

  return includes;
};

const assertRelationsStillAvailable = (
  meeting
) => {
  if (
    meeting?.case_id &&
    !meeting?.case
  ) {
    throw new Error(
      'Meeting not found'
    );
  }

  if (
    meeting?.client_id &&
    !meeting?.client
  ) {
    throw new Error(
      'Meeting not found'
    );
  }
};

const sanitizeMeetingForAccess = (
  meeting,
  access = {}
) => {
  if (!meeting) {
    return meeting;
  }

  const caseItem =
    meeting.case ||
    null;

  const client =
    meeting.client ||
    null;

  const canSeeCase =
    caseItem
      ? canAccessCaseInstance(
          caseItem,
          access
        )
      : false;

  if (
    caseItem &&
    !canSeeCase
  ) {
    meeting.setDataValue?.(
      'case',
      null
    );

    if (
      meeting.dataValues
    ) {
      meeting.dataValues.case =
        null;
    }
  }

  if (client) {
    const canSeeClient =
      Boolean(
        access?.canViewAllCases &&
        access?.canViewAllMeetings
      ) ||
      client.created_by ===
        access?.userId ||
      canSeeCase;

    if (!canSeeClient) {
      meeting.setDataValue?.(
        'client',
        null
      );

      if (
        meeting.dataValues
      ) {
        meeting.dataValues.client =
          null;
      }
    }
  }

  if (
    caseItem?.dataValues
  ) {
    delete caseItem
      .dataValues
      .created_by;

    delete caseItem
      .dataValues
      .assigned_to;
  }

  if (
    client?.dataValues
  ) {
    delete client
      .dataValues
      .created_by;
  }

  return meeting;
};

const sanitizeMeetingsForAccess = (
  meetings,
  access = {}
) => {
  return meetings.map(
    (
      meeting
    ) =>
      sanitizeMeetingForAccess(
        meeting,
        access
      )
  );
};

// ======================================================
// GOOGLE CALENDAR HELPERS
// ======================================================

const getMeetingCalendarUserIds = (
  meeting,
  participants = []
) => {
  const participantIds =
    normalizeUserIds(
      participants.map(
        (participant) =>
          typeof participant ===
          'string'
            ? participant
            : participant?.id
      )
    );

  return normalizeUserIds([
    meeting?.created_by,

    /*
     * Legacy mirror alanı geçiş sürecinde korunuyor.
     */
    meeting?.assigned_to,

    ...participantIds,
  ]);
};

const getUserDisplayName = (
  user
) => {
  const name = [
    user?.first_name,
    user?.last_name,
  ]
    .filter(
      Boolean
    )
    .join(' ')
    .trim();

  return name ||
    'Sistem';
};

const notifySafely =
  async (
    operation,
    callback,
    metadata = {}
  ) => {
    try {
      await callback();
    } catch (error) {
      logger.error(
        `Meeting notification failed: ${operation}`,
        {
          ...metadata,

          message:
            error.message,
        }
      );
    }
  };

const notifyMeetingParticipants =
  async (
    meeting,
    participants = []
  ) => {
    if (
      !meeting?.id ||
      participants.length ===
        0
    ) {
      return;
    }

    const creator =
      await User.findByPk(
        meeting.created_by,
        {
          attributes:
            USER_SUMMARY_ATTRIBUTES,
        }
      );

    const creatorName =
      getUserDisplayName(
        creator
      );

    for (
      const participant of
      participants
    ) {
      /*
       * Kendi oluşturduğu toplantıya kendisini ekleyen kullanıcıya
       * gereksiz "size toplantı atandı" bildirimi göndermiyoruz.
       */
      if (
        participant.id ===
        meeting.created_by
      ) {
        continue;
      }

      await notificationService
        .notifyMeetingAssigned(
          participant.id,
          meeting.id,
          meeting.title,
          creatorName,
          meeting.start_date
        );
    }
  };

const buildMeetingGoogleDescription = (
  meeting
) => {
  return [
    'Derkenar toplantısı',

    meeting?.description ||
      null,

    meeting?.meeting_link
      ? `Toplantı bağlantısı: ${meeting.meeting_link}`
      : null,

    meeting?.notes
      ? `Notlar: ${meeting.notes}`
      : null,
  ]
    .filter(
      Boolean
    )
    .join(
      '\n\n'
    );
};

const upsertMeetingToGoogleForUserSafely =
  async (
    meeting,
    userId
  ) => {
    if (
      !meeting?.id ||
      !meeting?.start_date ||
      !userId
    ) {
      return;
    }

    await googleCalendarSyncService
      .upsertEventSafely({
        userId,

        entityType:
          'meeting',

        entityId:
          meeting.id,

        title:
          `Toplantı: ${meeting.title}`,

        description:
          buildMeetingGoogleDescription(
            meeting
          ),

        location:
          meeting.location ||
          '',

        start:
          meeting.start_date,

        end:
          meeting.end_date ||
          null,

        /*
         * Meeting modeli saatli toplantı mantığında.
         */
        allDay:
          false,
      });
  };

const deleteMeetingFromGoogleForUserSafely =
  async (
    meetingId,
    userId
  ) => {
    if (
      !meetingId ||
      !userId
    ) {
      return;
    }

    await googleCalendarSyncService
      .deleteEventSafely({
        userId,

        entityType:
          'meeting',

        entityId:
          meetingId,
      });
  };

const deleteMeetingFromGoogleForUsersSafely =
  async (
    meetingId,
    userIds = []
  ) => {
    const uniqueUserIds = [
      ...new Set(
        userIds.filter(
          Boolean
        )
      ),
    ];

    if (
      !meetingId ||
      uniqueUserIds.length ===
        0
    ) {
      return;
    }

    await Promise.all(
      uniqueUserIds.map(
        (
          userId
        ) =>
          deleteMeetingFromGoogleForUserSafely(
            meetingId,
            userId
          )
      )
    );
  };

const syncMeetingToGoogleForUsersSafely =
  async (
    meeting,
    userIds = []
  ) => {
    if (!meeting?.id) {
      return;
    }

    const uniqueUserIds = [
      ...new Set(
        userIds.filter(
          Boolean
        )
      ),
    ];

    if (
      uniqueUserIds.length ===
        0
    ) {
      return;
    }

    /*
     * cancelled toplantılar Google'dan kaldırılır.
     * completed toplantılar geçmiş kayıt olarak kalır.
     */
    if (
      meeting.status ===
        'cancelled' ||
      !meeting.start_date
    ) {
      await deleteMeetingFromGoogleForUsersSafely(
        meeting.id,
        uniqueUserIds
      );

      return;
    }

    await Promise.all(
      uniqueUserIds.map(
        (
          userId
        ) =>
          upsertMeetingToGoogleForUserSafely(
            meeting,
            userId
          )
      )
    );
  };

// ======================================================
// SERVICE
// ======================================================

export const meetingService = {

  // ====================================================
  // CREATE
  // ====================================================

  async create(
    data,
    access = {}
  ) {
    const userId =
      requireMeetingUserId(
        access
      );

    const participantIds =
      assertAtLeastOneMeetingParticipant(
        getRequestedParticipantIds(
          data || {}
        )
      );

    const {
      id,
      created_by,
      created_at,
      updated_at,
      deleted_at,
      status,
      attendee_ids,
      ...inputData
    } = data || {};

    const preparedData =
      prepareMeetingData(
        inputData
      );

    preparedData.created_by =
      userId;

    preparedData.status =
      'scheduled';

    /*
     * assigned_to artık source-of-truth değildir.
     * Eski client / query uyumluluğu için ilk katılımcıyı
     * legacy mirror alanında tutuyoruz.
     */
    preparedData.assigned_to =
      participantIds[0];

    validateMeetingDates({
      startDate:
        preparedData.start_date,

      endDate:
        preparedData.end_date,

      rejectPastStart:
        true,
    });

    const transaction =
      await sequelize.transaction();

    let meeting;
    let participants = [];

    try {
      participants =
        await validateMeetingParticipants(
          participantIds,
          transaction
        );

      await validateMeetingRelations(
        {
          caseId:
            preparedData.case_id ||
            null,

          clientId:
            preparedData.client_id ||
            null,

          consultationId:
            preparedData.consultation_id ||
            null,

          assignedTo:
            preparedData.assigned_to ||
            null,
        },
        access,
        {
          transaction,
        }
      );

      meeting =
        await Meeting.create(
          preparedData,
          {
            transaction,
          }
        );

      await meeting.setParticipantUsers(
        participants,
        {
          transaction,
        }
      );

      meeting.setDataValue(
        'participantUsers',
        participants
      );

      if (
        shouldHaveReminders(
          meeting
        )
      ) {
        await reminderService
          .createMeetingReminders(
            meeting,
            {
              transaction,
            }
          );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    await notifySafely(
      'meeting-assigned-on-create',
      () =>
        notifyMeetingParticipants(
          meeting,
          participants
        ),
      {
        meetingId:
          meeting.id,

        participantIds:
          participants.map(
            (user) =>
              user.id
          ),

        createdBy:
          meeting.created_by,
      }
    );

    await syncMeetingToGoogleForUsersSafely(
      meeting,
      getMeetingCalendarUserIds(
        meeting,
        participants
      )
    );

    return this.findOne(
      meeting.id,
      access
    );
  },

  // ====================================================
  // LIST
  // ====================================================

  async findAll({
    page = 1,
    limit = 10,
    search,
    status,
    meeting_type,
    case_id,
    client_id,
    assigned_to,
    start_date,
    end_date,
    userId,
    canViewAllMeetings = false,
    canViewAllCases = false,
  }) {
    const access = {
      userId,
      canViewAllMeetings,
      canViewAllCases,
    };

    requireMeetingUserId(
      access
    );

    const filters = {};

    const normalizedSearch =
      normalizeSearch(
        search
      );

    if (
      normalizedSearch
    ) {
      filters[Op.or] = [
        {
          title: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          description: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          location: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
      ];
    }

    if (status) {
      validateStatus(
        status
      );

      filters.status =
        status;
    }

    if (
      meeting_type
    ) {
      validateMeetingType(
        meeting_type
      );

      filters.meeting_type =
        meeting_type;
    }

    if (case_id) {
      filters.case_id =
        case_id;
    }

    if (client_id) {
      filters.client_id =
        client_id;
    }

    if (assigned_to) {
      if (
        !canViewAllMeetings &&
        assigned_to !==
          userId
      ) {
        throw new Error(
          'Meeting not found'
        );
      }

      filters[Op.and] = [
        ...(filters[Op.and] || []),

        {
          [Op.or]: [
            {
              assigned_to,
            },

            buildParticipantMembershipWhere(
              assigned_to
            ),
          ],
        },
      ];
    }

    if (
      start_date ||
      end_date
    ) {
      filters.start_date = {};

      if (start_date) {
        filters.start_date[
          Op.gte
        ] =
          parseDate(
            start_date,
            'Invalid start date filter'
          );
      }

      if (end_date) {
        filters.start_date[
          Op.lte
        ] =
          parseDate(
            end_date,
            'Invalid end date filter'
          );
      }
    }

    const where =
      applyMeetingAccessScope(
        filters,
        access
      );

    const {
      pageNumber,
      limitNumber,
    } =
      normalizePagination(
        page,
        limit
      );

    const query =
      paginate(
        {
          where,
        },
        pageNumber,
        limitNumber
      );

    const {
      count,
      rows,
    } =
      await Meeting.findAndCountAll({
        ...query,

        include:
          buildIncludes(),

        distinct:
          true,

        order: [
          [
            'start_date',
            'ASC',
          ],

          [
            'created_at',
            'DESC',
          ],
        ],
      });

    const visibleRows =
      rows.filter(
        (
          meeting
        ) =>
          (!meeting.case_id ||
            Boolean(
              meeting.case
            )) &&
          (!meeting.client_id ||
            Boolean(
              meeting.client
            ))
      );

    return {
      data:
        sanitizeMeetingsForAccess(
          visibleRows,
          access
        ),

      pagination:
        getPaginationData(
          count,
          pageNumber,
          limitNumber
        ),
    };
  },

  // ====================================================
  // BY CONSULTATION
  // ====================================================

  async getByConsultation(
    consultationId,
    access = {}
  ) {
    requireMeetingUserId(
      access
    );

    await assertConsultationAccessForMeeting(
      consultationId,
      access
    );

    const meetings =
      await Meeting.findAll({
        where:
          applyMeetingAccessScope(
            {
              consultation_id:
                consultationId,
            },
            access
          ),

        include:
          buildIncludes(),

        order: [
          [
            'start_date',
            'ASC',
          ],
          [
            'created_at',
            'DESC',
          ],
        ],
      });

    const visibleMeetings =
      meetings.filter(
        (meeting) =>
          (!meeting.case_id ||
            Boolean(
              meeting.case
            )) &&
          (!meeting.client_id ||
            Boolean(
              meeting.client
            ))
      );

    return sanitizeMeetingsForAccess(
      visibleMeetings,
      access
    );
  },

  // ====================================================
  // DETAIL
  // ====================================================

  async findOne(
    id,
    access = {}
  ) {
    requireMeetingUserId(
      access
    );

    const meeting =
      await Meeting.findOne({
        where:
          applyMeetingAccessScope(
            {
              id,
            },
            access
          ),

        include:
          buildIncludes(),
      });

    if (!meeting) {
      throw new Error(
        'Meeting not found'
      );
    }

    assertRelationsStillAvailable(
      meeting
    );

    return sanitizeMeetingForAccess(
      meeting,
      access
    );
  },

  // ====================================================
  // UPDATE
  // ====================================================

  async update(
    id,
    data,
    access = {}
  ) {
    requireMeetingUserId(
      access
    );

    const transaction =
      await sequelize.transaction();

    let meeting;
    let previousParticipants = [];
    let currentParticipants = [];
    let previousCalendarUserIds = [];
    let currentCalendarUserIds = [];
    let newlyAddedParticipants = [];

    try {
      meeting =
        await Meeting.findOne({
          where:
            applyMeetingAccessScope(
              {
                id,
              },
              access
            ),

          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        });

      if (!meeting) {
        throw new Error(
          'Meeting not found'
        );
      }

      previousParticipants =
        await loadMeetingParticipantUsers(
          meeting,
          {
            transaction,
          }
        );

      const previousParticipantIds =
        normalizeUserIds(
          previousParticipants.map(
            (user) =>
              user.id
          )
        );

      previousCalendarUserIds =
        getMeetingCalendarUserIds(
          meeting,
          previousParticipants
        );

      const participantUpdateRequested =
        Object.prototype.hasOwnProperty.call(
          data || {},
          'attendee_ids'
        ) ||
        Object.prototype.hasOwnProperty.call(
          data || {},
          'assigned_to'
        );

      if (
        participantUpdateRequested
      ) {
        const requestedParticipantIds =
          assertAtLeastOneMeetingParticipant(
            getRequestedParticipantIds(
              data || {}
            )
          );

        currentParticipants =
          await validateMeetingParticipants(
            requestedParticipantIds,
            transaction
          );
      } else {
        currentParticipants =
          previousParticipants;
      }

      const currentParticipantIds =
        normalizeUserIds(
          currentParticipants.map(
            (user) =>
              user.id
          )
        );

      const participantsChanged =
        !sameUserIdSet(
          previousParticipantIds,
          currentParticipantIds
        );

      const preparedData =
        prepareMeetingData(
          data
        );

      delete preparedData.created_by;

      /*
       * Global status yalnız updateStatus endpoint'i
       * üzerinden değiştirilir.
       */
      delete preparedData.status;

      if (
        participantUpdateRequested
      ) {
        preparedData.assigned_to =
          currentParticipantIds[0];
      }

      const startDateChanged =
        hasMeetingStartDateChanged(
          preparedData.start_date,
          meeting.start_date
        );

      validateMeetingDates({
        startDate:
          preparedData.start_date ??
          meeting.start_date,

        endDate:
          preparedData.end_date !==
          undefined
            ? preparedData.end_date
            : meeting.end_date,

        rejectPastStart:
          startDateChanged,
      });

      const effectiveCaseId =
        preparedData.case_id !==
        undefined
          ? preparedData.case_id ||
            null
          : meeting.case_id ||
            null;

      const effectiveClientId =
        preparedData.client_id !==
        undefined
          ? preparedData.client_id ||
            null
          : meeting.client_id ||
            null;

      const effectiveConsultationId =
        preparedData.consultation_id !==
        undefined
          ? preparedData.consultation_id ||
            null
          : meeting.consultation_id ||
            null;

      const effectiveAssignedTo =
        participantUpdateRequested
          ? currentParticipantIds[0]
          : meeting.assigned_to ||
            currentParticipantIds[0] ||
            null;

      await validateMeetingRelations(
        {
          caseId:
            effectiveCaseId,

          clientId:
            effectiveClientId,

          consultationId:
            effectiveConsultationId,

          assignedTo:
            effectiveAssignedTo,
        },
        access,
        {
          transaction,
        }
      );

      const previousValues = {
        startDate:
          meeting.start_date
            ? new Date(
                meeting.start_date
              ).getTime()
            : null,

        endDate:
          meeting.end_date
            ? new Date(
                meeting.end_date
              ).getTime()
            : null,

        status:
          meeting.status,

        title:
          meeting.title,
      };

      await meeting.update(
        preparedData,
        {
          transaction,
        }
      );

      if (
        participantUpdateRequested
      ) {
        await meeting.setParticipantUsers(
          currentParticipants,
          {
            transaction,
          }
        );
      }

      meeting.setDataValue(
        'participantUsers',
        currentParticipants
      );

      const currentValues = {
        startDate:
          meeting.start_date
            ? new Date(
                meeting.start_date
              ).getTime()
            : null,

        endDate:
          meeting.end_date
            ? new Date(
                meeting.end_date
              ).getTime()
            : null,

        status:
          meeting.status,

        title:
          meeting.title,
      };

      const schedulingChanged =
        previousValues.startDate !==
          currentValues.startDate ||
        previousValues.endDate !==
          currentValues.endDate ||
        previousValues.status !==
          currentValues.status ||
        previousValues.title !==
          currentValues.title ||
        participantsChanged;

      if (
        TERMINAL_STATUSES.has(
          meeting.status
        )
      ) {
        await reminderService
          .cancelForSource({
            sourceType:
              'meeting',

            sourceId:
              meeting.id,

            transaction,
          });
      } else if (
        schedulingChanged &&
        shouldHaveReminders(
          meeting
        )
      ) {
        await reminderService
          .rescheduleMeeting(
            meeting,
            {
              transaction,
            }
          );
      } else if (
        schedulingChanged
      ) {
        await reminderService
          .cancelForSource({
            sourceType:
              'meeting',

            sourceId:
              meeting.id,

            transaction,
          });
      }

      newlyAddedParticipants =
        currentParticipants.filter(
          (user) =>
            !previousParticipantIds.includes(
              user.id
            )
        );

      currentCalendarUserIds =
        getMeetingCalendarUserIds(
          meeting,
          currentParticipants
        );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    if (
      newlyAddedParticipants.length >
      0
    ) {
      await notifySafely(
        'meeting-assigned-on-update',
        () =>
          notifyMeetingParticipants(
            meeting,
            newlyAddedParticipants
          ),
        {
          meetingId:
            meeting.id,

          participantIds:
            newlyAddedParticipants.map(
              (user) =>
                user.id
            ),
        }
      );
    }

    const removedCalendarUserIds =
      previousCalendarUserIds.filter(
        (
          userId
        ) =>
          !currentCalendarUserIds.includes(
            userId
          )
      );

    await deleteMeetingFromGoogleForUsersSafely(
      meeting.id,
      removedCalendarUserIds
    );

    await syncMeetingToGoogleForUsersSafely(
      meeting,
      currentCalendarUserIds
    );

    return this.findOne(
      id,
      access
    );
  },

  // ====================================================
  // REMOVE
  // ====================================================

  async remove(
    id,
    access = {}
  ) {
    requireMeetingUserId(
      access
    );

    const transaction =
      await sequelize.transaction();

    let meeting;
    let calendarUserIds = [];

    try {
      meeting =
        await Meeting.findOne({
          where:
            applyMeetingAccessScope(
              {
                id,
              },
              access
            ),

          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        });

      if (!meeting) {
        throw new Error(
          'Meeting not found'
        );
      }

      const participants =
        await loadMeetingParticipantUsers(
          meeting,
          {
            transaction,
          }
        );

      calendarUserIds =
        getMeetingCalendarUserIds(
          meeting,
          participants
        );

      await reminderService
        .cancelForSource({
          sourceType:
            'meeting',

          sourceId:
            meeting.id,

          transaction,
        });

      await meeting.destroy({
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    await deleteMeetingFromGoogleForUsersSafely(
      meeting.id,
      calendarUserIds
    );

    return meeting;
  },

  // ====================================================
  // MY MEETINGS
  // ====================================================

  async getMyMeetings(
    userId,
    {
      page = 1,
      limit = 25,
      includeCompleted = false,
    } = {},
    access = {}
  ) {
    const actorId =
      requireMeetingUserId(
        access
      );

    if (
      actorId !==
      userId
    ) {
      throw new Error(
        'Meeting not found'
      );
    }

    const {
      pageNumber,
      limitNumber,
    } =
      normalizePagination(
        page,
        limit
      );

    const where = {
      [Op.or]: [
        {
          created_by:
            userId,
        },

        {
          assigned_to:
            userId,
        },

        buildParticipantMembershipWhere(
          userId
        ),
      ],
    };

    if (
      !includeCompleted
    ) {
      where.status = {
        [Op.notIn]: [
          'completed',
          'cancelled',
        ],
      };
    }

    const {
      count,
      rows,
    } =
      await Meeting.findAndCountAll({
        where,

        include:
          buildIncludes({
            includeCreator:
              false,
          }),

        distinct:
          true,

        order: [
          [
            'start_date',
            'ASC',
          ],
        ],

        limit:
          limitNumber,

        offset:
          (
            pageNumber -
            1
          ) *
          limitNumber,
      });

    const visibleRows =
      rows.filter(
        (
          meeting
        ) =>
          (!meeting.case_id ||
            Boolean(
              meeting.case
            )) &&
          (!meeting.client_id ||
            Boolean(
              meeting.client
            ))
      );

    return {
      data:
        sanitizeMeetingsForAccess(
          visibleRows,
          access
        ),

      pagination:
        getPaginationData(
          count,
          pageNumber,
          limitNumber
        ),
    };
  },

  // ====================================================
  // BY CASE
  // ====================================================

  async getByCase(
    caseId,
    {
      page = 1,
      limit = 25,
    } = {},
    access = {}
  ) {
    await assertCaseAccessForMeeting(
      caseId,
      access
    );

    const {
      pageNumber,
      limitNumber,
    } =
      normalizePagination(
        page,
        limit
      );

    const {
      count,
      rows,
    } =
      await Meeting.findAndCountAll({
        where: {
          case_id:
            caseId,
        },

        include:
          buildIncludes(),

        distinct:
          true,

        order: [
          [
            'start_date',
            'ASC',
          ],
        ],

        limit:
          limitNumber,

        offset:
          (
            pageNumber -
            1
          ) *
          limitNumber,
      });

    return {
      data:
        sanitizeMeetingsForAccess(
          rows,
          access
        ),

      pagination:
        getPaginationData(
          count,
          pageNumber,
          limitNumber
        ),
    };
  },

  // ====================================================
  // BY CLIENT
  // ====================================================

  async getByClient(
    clientId,
    {
      page = 1,
      limit = 25,
    } = {},
    access = {}
  ) {
    await assertClientAccessForMeeting(
      clientId,
      access
    );

    const {
      pageNumber,
      limitNumber,
    } =
      normalizePagination(
        page,
        limit
      );

    const {
      count,
      rows,
    } =
      await Meeting.findAndCountAll({
        where: {
          client_id:
            clientId,
        },

        include:
          buildIncludes(),

        distinct:
          true,

        order: [
          [
            'start_date',
            'ASC',
          ],
        ],

        limit:
          limitNumber,

        offset:
          (
            pageNumber -
            1
          ) *
          limitNumber,
      });

    return {
      data:
        sanitizeMeetingsForAccess(
          rows,
          access
        ),

      pagination:
        getPaginationData(
          count,
          pageNumber,
          limitNumber
        ),
    };
  },

  // ====================================================
  // CLIENT COCKPIT
  // ====================================================

  async getClientTimeline(
    clientId,
    {
      upcomingLimit = 5,
      recentLimit = 5,
    } = {},
    access = {}
  ) {
    await assertClientAccessForMeeting(
      clientId,
      access
    );

    const safeUpcomingLimit =
      Math.min(
        Math.max(
          Number(
            upcomingLimit
          ) || 5,
          1
        ),
        20
      );

    const safeRecentLimit =
      Math.min(
        Math.max(
          Number(
            recentLimit
          ) || 5,
          1
        ),
        20
      );

    const now =
      new Date();

    const [
      upcoming,
      recent,
    ] =
      await Promise.all([
        Meeting.findAll({
          where: {
            client_id:
              clientId,

            start_date: {
              [Op.gte]:
                now,
            },

            status: {
              [Op.notIn]: [
                'completed',
                'cancelled',
              ],
            },
          },

          include:
            buildIncludes({
              includeClient:
                false,

              includeCreator:
                false,
            }),

          order: [
            [
              'start_date',
              'ASC',
            ],
          ],

          limit:
            safeUpcomingLimit,
        }),

        Meeting.findAll({
          where: {
            client_id:
              clientId,

            [Op.or]: [
              {
                start_date: {
                  [Op.lt]:
                    now,
                },
              },

              {
                status: {
                  [Op.in]: [
                    'completed',
                    'cancelled',
                  ],
                },
              },
            ],
          },

          include:
            buildIncludes({
              includeClient:
                false,

              includeCreator:
                false,
            }),

          order: [
            [
              'start_date',
              'DESC',
            ],
          ],

          limit:
            safeRecentLimit,
        }),
      ]);

    return {
      upcoming:
        sanitizeMeetingsForAccess(
          upcoming,
          access
        ),

      recent:
        sanitizeMeetingsForAccess(
          recent,
          access
        ),

      counts: {
        upcoming:
          upcoming.length,

        recent:
          recent.length,
      },
    };
  },

  // ====================================================
  // UPCOMING
  // ====================================================

  async getUpcoming(
    userId,
    limit = 5,
    access = {}
  ) {
    const actorId =
      requireMeetingUserId(
        access
      );

    if (
      actorId !==
      userId
    ) {
      throw new Error(
        'Meeting not found'
      );
    }

    const safeLimit =
      Math.min(
        Math.max(
          Number.parseInt(
            limit,
            10
          ) || 5,
          1
        ),
        50
      );

    const meetings =
      await Meeting.findAll({
        where: {
          [Op.or]: [
            {
              created_by:
                userId,
            },

            {
              assigned_to:
                userId,
            },

            buildParticipantMembershipWhere(
              userId
            ),
          ],

          start_date: {
            [Op.gte]:
              new Date(),
          },

          status: {
            [Op.notIn]: [
              'completed',
              'cancelled',
            ],
          },
        },

        include:
          buildIncludes({
            includeCreator:
              false,
          }),

        order: [
          [
            'start_date',
            'ASC',
          ],
        ],

        limit:
          safeLimit,
      });

    const visibleMeetings =
      meetings.filter(
        (
          meeting
        ) =>
          (!meeting.case_id ||
            Boolean(
              meeting.case
            )) &&
          (!meeting.client_id ||
            Boolean(
              meeting.client
            ))
      );

    return sanitizeMeetingsForAccess(
      visibleMeetings,
      access
    );
  },

  // ====================================================
  // STATUS
  // ====================================================

  async updateStatus(
    id,
    status,
    access = {}
  ) {
    requireMeetingUserId(
      access
    );

    validateStatus(
      status
    );

    const transaction =
      await sequelize.transaction();

    let meeting;
    let calendarUserIds = [];

    try {
      meeting =
        await Meeting.findOne({
          where:
            applyMeetingAccessScope(
              {
                id,
              },
              access
            ),

          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        });

      if (!meeting) {
        throw new Error(
          'Meeting not found'
        );
      }

      if (
        meeting.status ===
        status
      ) {
        const participants =
          await loadMeetingParticipantUsers(
            meeting,
            {
              transaction,
            }
          );

        calendarUserIds =
          getMeetingCalendarUserIds(
            meeting,
            participants
          );

        await transaction.commit();

        await syncMeetingToGoogleForUsersSafely(
          meeting,
          calendarUserIds
        );

        return this.findOne(
          id,
          access
        );
      }

      await meeting.update(
        {
          status,
        },
        {
          transaction,
        }
      );

      if (
        TERMINAL_STATUSES.has(
          status
        )
      ) {
        await reminderService
          .cancelForSource({
            sourceType:
              'meeting',

            sourceId:
              meeting.id,

            transaction,
          });
      } else if (
        shouldHaveReminders(
          meeting
        )
      ) {
        await reminderService
          .rescheduleMeeting(
            meeting,
            {
              transaction,
            }
          );
      } else {
        await reminderService
          .cancelForSource({
            sourceType:
              'meeting',

            sourceId:
              meeting.id,

            transaction,
          });
      }

      const participants =
        await loadMeetingParticipantUsers(
          meeting,
          {
            transaction,
          }
        );

      calendarUserIds =
        getMeetingCalendarUserIds(
          meeting,
          participants
        );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    await syncMeetingToGoogleForUsersSafely(
      meeting,
      calendarUserIds
    );

    return this.findOne(
      id,
      access
    );
  },
};

export default meetingService;
