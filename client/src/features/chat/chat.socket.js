import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useQueryClient,
} from '@tanstack/react-query';

import {
  useSocket,
} from '../../hooks/useSocket.js';

import {
  chatKeys,
} from './chat.query.js';

export const useChatRealtime = () => {
  const {
    on,
    emit,
    isConnected,
  } =
    useSocket();

  const queryClient =
    useQueryClient();

  const [
    typingState,
    setTypingState,
  ] =
    useState({});

  const [
    readState,
    setReadState,
  ] =
    useState({});

  const [
    presenceState,
    setPresenceState,
  ] =
    useState({});

  useEffect(() => {
    const unsubscribeConversation =
      on(
        'chat:conversation:new',
        (
          payload
        ) => {
          queryClient.invalidateQueries({
            queryKey:
              chatKeys.conversations,
          });

          if (
            payload
              ?.conversation_id
          ) {
            queryClient.invalidateQueries({
              queryKey:
                chatKeys.messages(
                  payload
                    .conversation_id
                ),
            });
          }
        }
      );

    const handleMessageChange =
      (
        payload
      ) => {
        const conversationId =
          payload
            ?.conversation_id;

        queryClient.invalidateQueries({
          queryKey:
            chatKeys.conversations,
        });

        if (
          conversationId
        ) {
          queryClient.invalidateQueries({
            queryKey:
              chatKeys.messages(
                conversationId
              ),
          });
        }
      };

    const unsubscribeNew =
      on(
        'chat:message:new',
        handleMessageChange
      );

    const unsubscribeUpdated =
      on(
        'chat:message:updated',
        handleMessageChange
      );

    const unsubscribeDeleted =
      on(
        'chat:message:deleted',
        handleMessageChange
      );

    const unsubscribeRead =
      on(
        'chat:read',
        (
          payload
        ) => {
          const conversationId =
            payload
              ?.conversation_id;

          if (
            !conversationId
          ) {
            return;
          }

          setReadState(
            (
              current
            ) => ({
              ...current,

              [conversationId]: {
                user_id:
                  payload
                    ?.user_id ||
                  null,

                last_read_message_id:
                  payload
                    ?.last_read_message_id ||
                  null,
              },
            })
          );

          queryClient.invalidateQueries({
            queryKey:
              chatKeys.conversations,
          });
        }
      );

    const unsubscribePresence =
      on(
        'chat:presence',
        (
          payload
        ) => {
          const userId =
            payload
              ?.user_id;

          if (!userId) {
            return;
          }

          setPresenceState(
            (
              current
            ) => ({
              ...current,

              [userId]: {
                user_id:
                  userId,

                is_online:
                  payload
                    ?.is_online ===
                  true,

                last_seen_at:
                  payload
                    ?.last_seen_at ||
                  null,
              },
            })
          );
        }
      );

    const unsubscribeTyping =
      on(
        'chat:typing',
        (
          payload
        ) => {
          const conversationId =
            payload
              ?.conversation_id;

          const userId =
            payload
              ?.user_id;

          if (
            !conversationId ||
            !userId
          ) {
            return;
          }

          setTypingState(
            (
              current
            ) => {
              const currentUsers =
                new Set(
                  current[
                    conversationId
                  ] ||
                  []
                );

              if (
                payload
                  ?.is_typing ===
                true
              ) {
                currentUsers.add(
                  userId
                );
              } else {
                currentUsers.delete(
                  userId
                );
              }

              return {
                ...current,

                [conversationId]:
                  [
                    ...currentUsers,
                  ],
              };
            }
          );
        }
      );

    return () => {
      unsubscribeConversation();
      unsubscribeNew();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeRead();
      unsubscribePresence();
      unsubscribeTyping();
    };
  }, [
    on,
    queryClient,
  ]);

  const sendTyping =
    useCallback(
      (
        conversationId,
        isTyping
      ) => {
        if (
          !conversationId
        ) {
          return false;
        }

        return emit(
          'chat:typing',
          {
            conversationId,
            isTyping:
              isTyping ===
              true,
          }
        );
      },
      [
        emit,
      ]
    );

  return useMemo(
    () => ({
      isConnected,

      typingState,

      readState,

      presenceState,

      sendTyping,
    }),
    [
      isConnected,
      typingState,
      readState,
      presenceState,
      sendTyping,
    ]
  );
};

export default useChatRealtime;
