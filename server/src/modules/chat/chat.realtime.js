import {
  Conversation,
  ConversationMember,
  User,
} from '../../models/index.js';

import {
  emitToUsers,
} from '../../socket/socket.service.js';

import {
  logger,
} from '../../config/logger.js';

const normalizeIds = (
  values
) => [
  ...new Set(
    values.filter(Boolean)
  ),
];

const getAllActiveUserIds =
  async () => {
    const users =
      await User.findAll({
        where: {
          is_active:
            true,
        },

        attributes: [
          'id',
        ],
      });

    return normalizeIds(
      users.map(
        (
          user
        ) =>
          user.id
      )
    );
  };

const getActiveRecipientIds =
  async (
    conversationId
  ) => {
    const conversation =
      await Conversation.findByPk(
        conversationId,
        {
          attributes: [
            'id',
            'type',
          ],
        }
      );

    if (!conversation) {
      return [];
    }

    if (
      conversation.type ===
      'office'
    ) {
      const users =
        await User.findAll({
          where: {
            is_active:
              true,
          },

          attributes: [
            'id',
          ],
        });

      return normalizeIds(
        users.map(
          (user) =>
            user.id
        )
      );
    }

    const memberships =
      await ConversationMember.findAll({
        where: {
          conversation_id:
            conversation.id,
        },

        attributes: [
          'user_id',
        ],

        include: [
          {
            model:
              User,

            as:
              'user',

            required:
              true,

            attributes: [
              'id',
            ],

            where: {
              is_active:
                true,
            },
          },
        ],
      });

    return normalizeIds(
      memberships.map(
        (membership) =>
          membership.user_id
      )
    );
  };

const safePublish =
  async (
    operation
  ) => {
    try {
      await operation();
    } catch (
      error
    ) {
      /*
       * DB işlemi başarılı olduktan sonra Socket publish
       * başarısız olursa HTTP isteğini 500'e çevirmiyoruz.
       * İstemci reconnect/refetch ile kaydı yine görebilir.
       */
      logger.error(
        'Chat realtime publish başarısız',
        {
          message:
            error?.message,
        }
      );
    }
  };

const buildMessageEventPayload = (
  message
) => ({
  conversation_id:
    message?.conversation_id ||
    null,

  message_id:
    message?.id ||
    null,

  sender_id:
    message?.sender?.id ||
    null,

  type:
    message?.type ||
    null,

  created_at:
    message?.created_at ||
    null,

  updated_at:
    message?.updated_at ||
    null,
});

export const chatRealtime = {
  async publishConversationCreated(
    conversationId
  ) {
    return safePublish(
      async () => {
        const userIds =
          await getActiveRecipientIds(
            conversationId
          );

        emitToUsers(
          userIds,
          'chat:conversation:new',
          {
            conversation_id:
              conversationId,
          }
        );
      }
    );
  },

  async publishMessageCreated(
    message
  ) {
    return safePublish(
      async () => {
        const userIds =
          await getActiveRecipientIds(
            message.conversation_id
          );

        /*
         * Ekran kilidi varken hassas mesaj içeriği socket
         * payload'ında istemciye düşmesin diye content ve
         * attachment URL/isimleri yayınlanmıyor.
         * İstemci bu olayı alınca REST sorgusunu yeniler.
         */
        emitToUsers(
          userIds,
          'chat:message:new',
          buildMessageEventPayload(
            message
          )
        );
      }
    );
  },

  async publishMessageUpdated(
    message
  ) {
    return safePublish(
      async () => {
        const userIds =
          await getActiveRecipientIds(
            message.conversation_id
          );

        emitToUsers(
          userIds,
          'chat:message:updated',
          buildMessageEventPayload(
            message
          )
        );
      }
    );
  },

  async publishMessageDeleted(
    message
  ) {
    return safePublish(
      async () => {
        const userIds =
          await getActiveRecipientIds(
            message.conversation_id
          );

        emitToUsers(
          userIds,
          'chat:message:deleted',
          buildMessageEventPayload(
            message
          )
        );
      }
    );
  },

  async publishRead(
    readState,
    actorId
  ) {
    return safePublish(
      async () => {
        const conversation =
          await Conversation.findByPk(
            readState.conversation_id,
            {
              attributes: [
                'id',
                'type',
              ],
            }
          );

        /*
         * Ofis Genel'de read receipt yayınlamak 10 kişilik
         * odada gereksiz event kalabalığı oluşturur.
         * Birebir sohbet için yayınlıyoruz.
         */
        if (
          !conversation ||
          conversation.type !==
            'direct'
        ) {
          return;
        }

        const userIds =
          await getActiveRecipientIds(
            conversation.id
          );

        emitToUsers(
          userIds,
          'chat:read',
          {
            conversation_id:
              conversation.id,

            user_id:
              actorId,

            last_read_message_id:
              readState.last_read_message_id ||
              null,
          }
        );
      }
    );
  },

  async publishPresence(
    userId,
    {
      isOnline,
      lastSeenAt =
        null,
    } = {}
  ) {
    return safePublish(
      async () => {
        const userIds =
          await getAllActiveUserIds();

        emitToUsers(
          userIds.filter(
            (
              recipientId
            ) =>
              recipientId !==
              userId
          ),
          'chat:presence',
          {
            user_id:
              userId,

            is_online:
              isOnline ===
              true,

            last_seen_at:
              lastSeenAt ||
              null,
          }
        );
      }
    );
  },

  async publishTyping(
    conversationId,
    actorId,
    isTyping
  ) {
    return safePublish(
      async () => {
        const userIds =
          await getActiveRecipientIds(
            conversationId
          );

        emitToUsers(
          userIds.filter(
            (userId) =>
              userId !==
              actorId
          ),
          'chat:typing',
          {
            conversation_id:
              conversationId,

            user_id:
              actorId,

            is_typing:
              isTyping ===
              true,
          }
        );
      }
    );
  },
};

export default chatRealtime;
