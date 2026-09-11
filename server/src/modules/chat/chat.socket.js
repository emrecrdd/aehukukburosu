import {
  User,
} from '../../models/index.js';

import {
  assertConversationAccess,
} from './chat.service.js';

import {
  chatRealtime,
} from './chat.realtime.js';

import {
  chatPresence,
} from './chat.presence.js';

import {
  logger,
} from '../../config/logger.js';

const TYPING_THROTTLE_MS =
  500;

const sendAck = (
  acknowledgement,
  payload
) => {
  if (
    typeof acknowledgement ===
    'function'
  ) {
    acknowledgement(
      payload
    );
  }
};

export const registerChatSocket = ({
  socket,
}) => {
  let lastTypingAt =
    0;

  const userId =
    socket.data.userId;

  /*
   * Presence socket sayısı üzerinden tutulur.
   * Aynı kullanıcının birden fazla sekmesi/cihazı desteklenir.
   */
  void chatPresence
    .markConnected(
      userId
    )
    .then(
      async (
        result
      ) => {
        if (
          result.changed
        ) {
          await chatRealtime.publishPresence(
            userId,
            {
              isOnline:
                true,

              lastSeenAt:
                null,
            }
          );
        }
      }
    )
    .catch(
      (
        error
      ) => {
        logger.warn(
          'Chat presence connect kaydı başarısız',
          {
            userId,

            message:
              error?.message,
          }
        );
      }
    );

  socket.on(
    'disconnect',
    () => {
      void chatPresence
        .markDisconnected(
          userId
        )
        .then(
          async (
            result
          ) => {
            if (
              result.changed &&
              result.snapshot
            ) {
              await chatRealtime.publishPresence(
                userId,
                {
                  isOnline:
                    false,

                  lastSeenAt:
                    result
                      .snapshot
                      .last_seen_at,
                }
              );
            }
          }
        )
        .catch(
          (
            error
          ) => {
            logger.warn(
              'Chat presence disconnect kaydı başarısız',
              {
                userId,

                message:
                  error?.message,
              }
            );
          }
        );
    }
  );

  socket.on(
    'chat:typing',
    async (
      payload = {},
      acknowledgement
    ) => {
      try {
        const now =
          Date.now();

        if (
          now -
            lastTypingAt <
          TYPING_THROTTLE_MS
        ) {
          return sendAck(
            acknowledgement,
            {
              success:
                true,

              throttled:
                true,
            }
          );
        }

        lastTypingAt =
          now;

        const conversationId =
          payload
            ?.conversationId ||
          payload
            ?.conversation_id ||
          null;

        const isTyping =
          payload?.isTyping ===
            true ||
          payload?.is_typing ===
            true;

        if (!conversationId) {
          return sendAck(
            acknowledgement,
            {
              success:
                false,

              code:
                'CHAT_INVALID_CONVERSATION',
            }
          );
        }

        /*
         * Socket bağlantısı kurulduktan sonra kullanıcı
         * pasife alınmış olabilir. Typing gibi client -> server
         * eventlerinde aktifliği tekrar DB'den kontrol ediyoruz.
         */
        const actor =
          await User.findOne({
            where: {
              id:
                socket.data.userId,

              is_active:
                true,
            },

            attributes: [
              'id',
              'is_active',
            ],
          });

        if (!actor) {
          socket.disconnect(
            true
          );

          return sendAck(
            acknowledgement,
            {
              success:
                false,

              code:
                'SOCKET_USER_INACTIVE',
            }
          );
        }

        const {
          conversation,
        } =
          await assertConversationAccess(
            conversationId,
            actor
          );

        await chatRealtime.publishTyping(
          conversation.id,
          actor.id,
          isTyping
        );

        return sendAck(
          acknowledgement,
          {
            success:
              true,
          }
        );
      } catch (
        error
      ) {
        logger.warn(
          'Chat typing socket isteği reddedildi',
          {
            socketId:
              socket.id,

            userId:
              socket.data.userId,

            message:
              error?.message,
          }
        );

        return sendAck(
          acknowledgement,
          {
            success:
              false,

            code:
              error?.code ||
              'CHAT_TYPING_FAILED',
          }
        );
      }
    }
  );
};

export default registerChatSocket;
