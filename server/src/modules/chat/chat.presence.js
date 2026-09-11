import {
  QueryTypes,
} from 'sequelize';

import {
  User,
} from '../../models/index.js';

const socketCounts =
  new Map();

const normalizeUserId = (
  value
) =>
  value
    ? String(
        value
      )
    : null;

const getCount = (
  userId
) =>
  socketCounts.get(
    userId
  ) ||
  0;

const setCount = (
  userId,
  count
) => {
  if (
    count <=
    0
  ) {
    socketCounts.delete(
      userId
    );

    return;
  }

  socketCounts.set(
    userId,
    count
  );
};

const readLastSeenAt =
  async (
    userId
  ) => {
    const rows =
      await User.sequelize.query(
        `
          SELECT
            last_seen_at
          FROM users
          WHERE id = :userId
          LIMIT 1
        `,
        {
          replacements: {
            userId,
          },

          type:
            QueryTypes.SELECT,
        }
      );

    return (
      rows?.[0]
        ?.last_seen_at ??
      null
    );
  };

const writeLastSeenAt =
  async (
    userId,
    lastSeenAt
  ) => {
    await User.sequelize.query(
      `
        UPDATE users
        SET last_seen_at = :lastSeenAt
        WHERE id = :userId
      `,
      {
        replacements: {
          userId,
          lastSeenAt,
        },
      }
    );
  };

export const chatPresence = {
  isOnline(
    userId
  ) {
    const normalized =
      normalizeUserId(
        userId
      );

    if (!normalized) {
      return false;
    }

    return (
      getCount(
        normalized
      ) >
      0
    );
  },

  async getSnapshot(
    userId
  ) {
    const normalized =
      normalizeUserId(
        userId
      );

    if (!normalized) {
      return {
        user_id:
          null,

        is_online:
          false,

        last_seen_at:
          null,
      };
    }

    return {
      user_id:
        normalized,

      is_online:
        this.isOnline(
          normalized
        ),

      last_seen_at:
        await readLastSeenAt(
          normalized
        ),
    };
  },

  async markConnected(
    userId
  ) {
    const normalized =
      normalizeUserId(
        userId
      );

    if (!normalized) {
      return {
        changed:
          false,

        snapshot:
          null,
      };
    }

    const previous =
      getCount(
        normalized
      );

    setCount(
      normalized,
      previous +
        1
    );

    return {
      /*
       * Aynı kullanıcı iki sekme / iki cihazla bağlıysa
       * yalnızca ilk socket "online oldu" değişikliği üretir.
       */
      changed:
        previous ===
        0,

      snapshot: {
        user_id:
          normalized,

        is_online:
          true,

        last_seen_at:
          null,
      },
    };
  },

  async markDisconnected(
    userId
  ) {
    const normalized =
      normalizeUserId(
        userId
      );

    if (!normalized) {
      return {
        changed:
          false,

        snapshot:
          null,
      };
    }

    const previous =
      getCount(
        normalized
      );

    if (
      previous <=
      0
    ) {
      return {
        changed:
          false,

        snapshot:
          null,
      };
    }

    const next =
      previous -
      1;

    setCount(
      normalized,
      next
    );

    /*
     * Başka socket hâlâ açıksa kullanıcı online kalır.
     */
    if (
      next >
      0
    ) {
      return {
        changed:
          false,

        snapshot: {
          user_id:
            normalized,

          is_online:
            true,

          last_seen_at:
            null,
        },
      };
    }

    const lastSeenAt =
      new Date();

    await writeLastSeenAt(
      normalized,
      lastSeenAt
    );

    return {
      changed:
        true,

      snapshot: {
        user_id:
          normalized,

        is_online:
          false,

        last_seen_at:
          lastSeenAt.toISOString(),
      },
    };
  },
};

export default chatPresence;
