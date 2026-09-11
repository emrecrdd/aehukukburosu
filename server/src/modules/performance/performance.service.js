import {
  Op,
} from 'sequelize';

import {
  TaskAssignee,
} from '../../models/TaskAssignee.js';

import {
  Task,
} from '../../models/Task.js';

import {
  User,
} from '../../models/User.js';

import {
  Case,
} from '../../models/Case.js';

// ======================================================
// CONSTANTS
// ======================================================

const PERFORMANCE_USER_ATTRIBUTES = [
  'id',
  'first_name',
  'last_name',
  'email',
  'role',
  'title',
  'avatar',
  'is_active',
];

const PERFORMANCE_TASK_ATTRIBUTES = [
  'id',
  'title',
  'status',
  'priority',
  'due_date',
  'created_at',
  'estimated_hours',
];

const VALID_ASSIGNMENT_STATUSES =
  new Set([
    'pending',
    'in_progress',
    'completed',
  ]);

// ======================================================
// NUMBER HELPERS
// ======================================================

const toNumber = (
  value,
  fallback = 0
) => {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return fallback;
  }

  return parsed;
};

const round = (
  value,
  digits = 2
) => {
  const number =
    toNumber(
      value,
      0
    );

  const factor =
    10 ** digits;

  return (
    Math.round(
      number *
        factor
    ) /
    factor
  );
};

const percentage = (
  numerator,
  denominator
) => {
  if (
    !denominator ||
    denominator <= 0
  ) {
    return 0;
  }

  return round(
    (
      numerator /
      denominator
    ) *
      100,
    1
  );
};

// ======================================================
// DATE HELPERS
// ======================================================

const toDate = (
  value
) => {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
};

const normalizeDateBoundary = (
  value,
  endOfDay = false
) => {
  if (!value) {
    return null;
  }

  const raw =
    String(
      value
    ).trim();

  if (!raw) {
    return null;
  }

  /*
   * Frontend <input type="date"> üzerinden
   * YYYY-MM-DD gönderecek.
   */
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      raw
    )
  ) {
    const date =
      new Date(
        endOfDay
          ? `${raw}T23:59:59.999Z`
          : `${raw}T00:00:00.000Z`
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date;
  }

  const parsed =
    new Date(
      raw
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  if (endOfDay) {
    parsed.setUTCHours(
      23,
      59,
      59,
      999
    );
  } else {
    parsed.setUTCHours(
      0,
      0,
      0,
      0
    );
  }

  return parsed;
};

// ======================================================
// FILTER HELPERS
// ======================================================

const normalizeBooleanFilter = (
  value
) => {
  if (
    value === true ||
    value === 'true' ||
    value === '1' ||
    value === 1
  ) {
    return true;
  }

  if (
    value === false ||
    value === 'false' ||
    value === '0' ||
    value === 0
  ) {
    return false;
  }

  return null;
};

const normalizePerformanceFilters = (
  filters = {}
) => {
  const rawStatus =
    String(
      filters.status ||
        ''
    )
      .trim()
      .toLowerCase();

  const status =
    VALID_ASSIGNMENT_STATUSES.has(
      rawStatus
    )
      ? rawStatus
      : null;

  const dateFrom =
    normalizeDateBoundary(
      filters.date_from ??
        filters.dateFrom,
      false
    );

  const dateTo =
    normalizeDateBoundary(
      filters.date_to ??
        filters.dateTo,
      true
    );

  const overdue =
    normalizeBooleanFilter(
      filters.overdue
    );

  return {
    status,
    date_from:
      dateFrom,
    date_to:
      dateTo,
    overdue,
  };
};

const buildAssignmentWhere = ({
  filters,
  userId = null,
}) => {
  const where = {};

  if (userId) {
    where.user_id =
      userId;
  }

  if (
    filters.status
  ) {
    where.status =
      filters.status;
  }

  return where;
};

// ======================================================
// ASSIGNMENT STATUS HELPERS
// ======================================================

const isAssignmentOverdue = (
  assignment,
  now = new Date()
) => {
  if (
    !assignment ||
    assignment.status ===
      'completed'
  ) {
    return false;
  }

  const dueDate =
    toDate(
      assignment.task
        ?.due_date
    );

  if (!dueDate) {
    return false;
  }

  return (
    dueDate.getTime() <
    now.getTime()
  );
};

const isCompletedOnTime = (
  assignment
) => {
  if (
    !assignment ||
    assignment.status !==
      'completed'
  ) {
    return false;
  }

  const dueDate =
    toDate(
      assignment.task
        ?.due_date
    );

  const completedAt =
    toDate(
      assignment.completed_at
    );

  if (
    !dueDate ||
    !completedAt
  ) {
    return false;
  }

  return (
    completedAt.getTime() <=
    dueDate.getTime()
  );
};

const isCompletedLate = (
  assignment
) => {
  if (
    !assignment ||
    assignment.status !==
      'completed'
  ) {
    return false;
  }

  const dueDate =
    toDate(
      assignment.task
        ?.due_date
    );

  const completedAt =
    toDate(
      assignment.completed_at
    );

  if (
    !dueDate ||
    !completedAt
  ) {
    return false;
  }

  return (
    completedAt.getTime() >
    dueDate.getTime()
  );
};

// ======================================================
// POST FILTERS
//
// "overdue" hesaplanmış bir durum olduğu için
// TaskAssignee WHERE içine doğrudan koymuyoruz.
// ======================================================

const applyPostFilters = (
  assignments = [],
  filters
) => {
  let result =
    assignments;

  if (
    filters.overdue ===
    true
  ) {
    result =
      result.filter(
        (
          assignment
        ) =>
          isAssignmentOverdue(
            assignment
          )
      );
  }

  if (
    filters.overdue ===
    false
  ) {
    result =
      result.filter(
        (
          assignment
        ) =>
          !isAssignmentOverdue(
            assignment
          )
      );
  }

  return result;
};

// ======================================================
// METRIC CALCULATOR
// ======================================================

const calculateMetrics = (
  assignments = []
) => {
  const now =
    new Date();

  const validAssignments =
    assignments.filter(
      (assignment) =>
        assignment &&
        assignment.task &&
        VALID_ASSIGNMENT_STATUSES.has(
          assignment.status
        )
    );

  const total =
    validAssignments.length;

  const pending =
    validAssignments.filter(
      (assignment) =>
        assignment.status ===
        'pending'
    ).length;

  const inProgress =
    validAssignments.filter(
      (assignment) =>
        assignment.status ===
        'in_progress'
    ).length;

  const completed =
    validAssignments.filter(
      (assignment) =>
        assignment.status ===
        'completed'
    ).length;

  const overdue =
    validAssignments.filter(
      (assignment) =>
        isAssignmentOverdue(
          assignment,
          now
        )
    ).length;

  const completedWithDeadline =
    validAssignments.filter(
      (assignment) =>
        assignment.status ===
          'completed' &&
        Boolean(
          toDate(
            assignment.task
              ?.due_date
          )
        ) &&
        Boolean(
          toDate(
            assignment.completed_at
          )
        )
    );

  const completedOnTime =
    completedWithDeadline.filter(
      (assignment) =>
        isCompletedOnTime(
          assignment
        )
    ).length;

  const completedLate =
    completedWithDeadline.filter(
      (assignment) =>
        isCompletedLate(
          assignment
        )
    ).length;

  const assignmentsWithHours =
    validAssignments.filter(
      (assignment) => {
        const hours =
          Number(
            assignment.actual_hours
          );

        return (
          Number.isFinite(
            hours
          ) &&
          hours >= 0
        );
      }
    );

  const totalActualHours =
    assignmentsWithHours.reduce(
      (
        totalHours,
        assignment
      ) =>
        totalHours +
        Number(
          assignment.actual_hours
        ),
      0
    );

  const progressTotal =
    validAssignments.reduce(
      (
        totalProgress,
        assignment
      ) =>
        totalProgress +
        Math.min(
          100,
          Math.max(
            0,
            toNumber(
              assignment.progress,
              0
            )
          )
        ),
      0
    );

  return {
    total_assignments:
      total,

    pending,

    in_progress:
      inProgress,

    completed,

    active:
      pending +
      inProgress,

    overdue,

    completed_on_time:
      completedOnTime,

    completed_late:
      completedLate,

    completion_rate:
      percentage(
        completed,
        total
      ),

    on_time_completion_rate:
      percentage(
        completedOnTime,
        completedWithDeadline.length
      ),

    overdue_rate:
      percentage(
        overdue,
        total
      ),

    total_actual_hours:
      round(
        totalActualHours,
        2
      ),

    average_actual_hours:
      assignmentsWithHours.length >
      0
        ? round(
            totalActualHours /
              assignmentsWithHours.length,
            2
          )
        : 0,

    average_progress:
      total > 0
        ? round(
            progressTotal /
              total,
            1
          )
        : 0,
  };
};

// ======================================================
// QUERY INCLUDES
// ======================================================

const USER_INCLUDE = {
  model:
    User,

  as:
    'user',

  attributes:
    PERFORMANCE_USER_ATTRIBUTES,

  required:
    true,
};

const buildTaskInclude = (
  filters
) => {
  const taskWhere = {
    status: {
      [Op.ne]:
        'cancelled',
    },
  };

  /*
   * Tarih aralığı görev son tarihine göre uygulanır.
   *
   * Bunun sebebi task_assignees tablosunda şu anda
   * assigned_at alanının bulunmamasıdır.
   */
  if (
    filters.date_from ||
    filters.date_to
  ) {
    taskWhere.due_date =
      {};

    if (
      filters.date_from
    ) {
      taskWhere.due_date[
        Op.gte
      ] =
        filters.date_from;
    }

    if (
      filters.date_to
    ) {
      taskWhere.due_date[
        Op.lte
      ] =
        filters.date_to;
    }
  }

  return {
    model:
      Task,

    as:
      'task',

    attributes:
      PERFORMANCE_TASK_ATTRIBUTES,

    required:
      true,

    where:
      taskWhere,

    include: [
      {
        model:
          Case,

        as:
          'case',

        attributes: [
          'id',
          'title',
          'case_number',
        ],

        required:
          false,
      },
    ],
  };
};

// ======================================================
// SERIALIZERS
// ======================================================

const serializeUser = (
  user
) => {
  if (!user) {
    return null;
  }

  return {
    id:
      user.id,

    first_name:
      user.first_name,

    last_name:
      user.last_name,

    full_name:
      [
        user.first_name,
        user.last_name,
      ]
        .filter(
          Boolean
        )
        .join(' ')
        .trim(),

    email:
      user.email,

    role:
      user.role,

    title:
      user.title,

    avatar:
      user.avatar,

    is_active:
      user.is_active,
  };
};

const serializeAssignment = (
  assignment
) => {
  const task =
    assignment.task;

  return {
    task_id:
      assignment.task_id,

    user_id:
      assignment.user_id,

    status:
      assignment.status,

    progress:
      toNumber(
        assignment.progress,
        0
      ),

    started_at:
      assignment.started_at,

    completed_at:
      assignment.completed_at,

    actual_hours:
      assignment.actual_hours !=
      null
        ? toNumber(
            assignment.actual_hours,
            0
          )
        : null,

    overdue:
      isAssignmentOverdue(
        assignment
      ),

    completed_on_time:
      isCompletedOnTime(
        assignment
      ),

    completed_late:
      isCompletedLate(
        assignment
      ),

    task:
      task
        ? {
            id:
              task.id,

            title:
              task.title,

            status:
              task.status,

            priority:
              task.priority,

            due_date:
              task.due_date,

            estimated_hours:
              task.estimated_hours,

            created_at:
              task.created_at,

            case:
              task.case
                ? {
                    id:
                      task.case.id,

                    title:
                      task.case.title,

                    case_number:
                      task.case.case_number,
                  }
                : null,
          }
        : null,
  };
};

// ======================================================
// FILTER RESPONSE
// ======================================================

const serializeFilters = (
  filters
) => {
  return {
    status:
      filters.status,

    date_from:
      filters.date_from
        ? filters.date_from.toISOString()
        : null,

    date_to:
      filters.date_to
        ? filters.date_to.toISOString()
        : null,

    overdue:
      filters.overdue,
  };
};

// ======================================================
// SERVICE
// ======================================================

export const performanceService = {
  // ====================================================
  // TEAM OVERVIEW
  // ====================================================

  async getTeamOverview(
    rawFilters = {}
  ) {
    const filters =
      normalizePerformanceFilters(
        rawFilters
      );

    const assignments =
      await TaskAssignee.findAll({
        where:
          buildAssignmentWhere({
            filters,
          }),

        include: [
          USER_INCLUDE,
          buildTaskInclude(
            filters
          ),
        ],
      });

    const filteredAssignments =
      applyPostFilters(
        assignments,
        filters
      );

    const userIds =
      new Set(
        filteredAssignments.map(
          (assignment) =>
            assignment.user_id
        )
      );

    return {
      users_with_assignments:
        userIds.size,

      filters:
        serializeFilters(
          filters
        ),

      ...calculateMetrics(
        filteredAssignments
      ),
    };
  },

  // ====================================================
  // ALL USER PERFORMANCE
  // ====================================================

  async getUsersPerformance(
    rawFilters = {}
  ) {
    const filters =
      normalizePerformanceFilters(
        rawFilters
      );

    /*
     * Aktif kullanıcıları ayrıca çekiyoruz.
     *
     * Böylece filtre sonucunda görevi olmayan kullanıcı
     * dahi 0 değerlerle listede kalabilir.
     */
    const [
      users,
      assignments,
    ] =
      await Promise.all([
        User.findAll({
          where: {
            is_active:
              true,
          },

          attributes:
            PERFORMANCE_USER_ATTRIBUTES,

          order: [
            [
              'first_name',
              'ASC',
            ],

            [
              'last_name',
              'ASC',
            ],
          ],
        }),

        TaskAssignee.findAll({
          where:
            buildAssignmentWhere({
              filters,
            }),

          include: [
            buildTaskInclude(
              filters
            ),
          ],
        }),
      ]);

    const filteredAssignments =
      applyPostFilters(
        assignments,
        filters
      );

    const assignmentsByUser =
      new Map();

    for (
      const assignment of
      filteredAssignments
    ) {
      const userId =
        assignment.user_id;

      if (
        !assignmentsByUser.has(
          userId
        )
      ) {
        assignmentsByUser.set(
          userId,
          []
        );
      }

      assignmentsByUser
        .get(
          userId
        )
        .push(
          assignment
        );
    }

    const data =
      users.map(
        (user) => {
          const userAssignments =
            assignmentsByUser.get(
              user.id
            ) || [];

          return {
            user:
              serializeUser(
                user
              ),

            metrics:
              calculateMetrics(
                userAssignments
              ),
          };
        }
      );

    /*
     * Sıralama:
     *
     * 1. Tamamlanan görev sayısı
     * 2. Zamanında tamamlama oranı
     * 3. Toplam görev sayısı
     *
     * Bu performans puanı değildir.
     */
    data.sort(
      (
        first,
        second
      ) => {
        const completedDifference =
          second.metrics
            .completed -
          first.metrics
            .completed;

        if (
          completedDifference !==
          0
        ) {
          return completedDifference;
        }

        const onTimeDifference =
          second.metrics
            .on_time_completion_rate -
          first.metrics
            .on_time_completion_rate;

        if (
          onTimeDifference !==
          0
        ) {
          return onTimeDifference;
        }

        return (
          second.metrics
            .total_assignments -
          first.metrics
            .total_assignments
        );
      }
    );

    return data;
  },

  // ====================================================
  // SINGLE USER PERFORMANCE
  // ====================================================

  async getUserPerformance(
    userId,
    rawFilters = {}
  ) {
    if (!userId) {
      throw new Error(
        'Kullanıcı ID gereklidir'
      );
    }

    const filters =
      normalizePerformanceFilters(
        rawFilters
      );

    const user =
      await User.findByPk(
        userId,
        {
          attributes:
            PERFORMANCE_USER_ATTRIBUTES,
        }
      );

    if (!user) {
      throw new Error(
        'Kullanıcı bulunamadı'
      );
    }

    const assignments =
      await TaskAssignee.findAll({
        where:
          buildAssignmentWhere({
            filters,
            userId,
          }),

        include: [
          buildTaskInclude(
            filters
          ),
        ],
      });

    const filteredAssignments =
      applyPostFilters(
        assignments,
        filters
      );

    const sortedAssignments =
      [
        ...filteredAssignments,
      ].sort(
        (
          first,
          second
        ) => {
          const firstDate =
            toDate(
              first.completed_at
            ) ||
            toDate(
              first.task
                ?.due_date
            ) ||
            toDate(
              first.task
                ?.created_at
            );

          const secondDate =
            toDate(
              second.completed_at
            ) ||
            toDate(
              second.task
                ?.due_date
            ) ||
            toDate(
              second.task
                ?.created_at
            );

          return (
            (
              secondDate
                ?.getTime() ||
              0
            ) -
            (
              firstDate
                ?.getTime() ||
              0
            )
          );
        }
      );

    return {
      user:
        serializeUser(
          user
        ),

      filters:
        serializeFilters(
          filters
        ),

      metrics:
        calculateMetrics(
          filteredAssignments
        ),

      assignments:
        sortedAssignments.map(
          serializeAssignment
        ),
    };
  },
};

export default performanceService;