import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import toast from 'react-hot-toast';

import chatApi from './chat.api.js';

export const chatKeys = {
  all:
    ['chat'],

  conversations:
    ['chat', 'conversations'],

  users:
    ['chat', 'users'],

  messages: (
    conversationId
  ) => [
    'chat',
    'messages',
    String(
      conversationId ||
      ''
    ),
  ],
};

const getErrorMessage = (
  error,
  fallback
) =>
  error?.response?.data
    ?.message ||
  error?.message ||
  fallback;

export const useChatUsers = (
  enabled = true
) =>
  useQuery({
    queryKey:
      chatKeys.users,

    queryFn:
      async () => {
        const result =
          await chatApi.getUsers();

        return Array.isArray(
          result?.data
        )
          ? result.data
          : [];
      },

    enabled,

    staleTime:
      60 * 1000,

    refetchOnWindowFocus:
      true,
  });

export const useChatConversations =
  () =>
    useQuery({
      queryKey:
        chatKeys.conversations,

      queryFn:
        async () => {
          const result =
            await chatApi.getConversations();

          return Array.isArray(
            result?.data
          )
            ? result.data
            : [];
        },

      staleTime:
        15 * 1000,

      refetchOnWindowFocus:
        true,

      refetchOnReconnect:
        true,
    });

export const useChatMessages = (
  conversationId
) =>
  useInfiniteQuery({
    queryKey:
      chatKeys.messages(
        conversationId
      ),

    queryFn:
      async ({
        pageParam,
      }) =>
        chatApi.getMessages(
          conversationId,
          {
            before:
              pageParam ||
              null,

            limit:
              30,
          }
        ),

    initialPageParam:
      null,

    getNextPageParam:
      (
        lastPage
      ) =>
        lastPage
          ?.next_cursor ||
        undefined,

    enabled:
      Boolean(
        conversationId
      ),

    staleTime:
      10 * 1000,

    refetchOnWindowFocus:
      true,

    refetchOnReconnect:
      true,
  });

export const useOpenDirectConversation =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        (
          userId
        ) =>
          chatApi.openDirect(
            userId
          ),

      onSuccess:
        () => {
          queryClient.invalidateQueries({
            queryKey:
              chatKeys.conversations,
          });
        },

      onError:
        (
          error
        ) => {
          toast.error(
            getErrorMessage(
              error,
              'Sohbet başlatılamadı'
            )
          );
        },
    });
  };

export const useSendChatMessage =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          conversationId,
          content,
        }) =>
          chatApi.sendMessage(
            conversationId,
            content
          ),

      onSuccess:
        (
          result,
          variables
        ) => {
          queryClient.invalidateQueries({
            queryKey:
              chatKeys.messages(
                variables
                  .conversationId
              ),
          });

          queryClient.invalidateQueries({
            queryKey:
              chatKeys.conversations,
          });
        },

      onError:
        (
          error
        ) => {
          toast.error(
            getErrorMessage(
              error,
              'Mesaj gönderilemedi'
            )
          );
        },
    });
  };

export const useEditChatMessage =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          messageId,
          content,
        }) =>
          chatApi.editMessage(
            messageId,
            content
          ),

      onSuccess:
        (
          result
        ) => {
          const conversationId =
            result?.data
              ?.conversation_id;

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

          queryClient.invalidateQueries({
            queryKey:
              chatKeys.conversations,
          });
        },

      onError:
        (
          error
        ) => {
          toast.error(
            getErrorMessage(
              error,
              'Mesaj güncellenemedi'
            )
          );
        },
    });
  };
export const useDeleteChatConversation =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        (
          conversationId
        ) =>
          chatApi.deleteConversation(
            conversationId
          ),

      onSuccess:
        (
          result,
          conversationId
        ) => {
          queryClient.removeQueries({
            queryKey:
              chatKeys.messages(
                conversationId
              ),
          });

          queryClient.invalidateQueries({
            queryKey:
              chatKeys.conversations,
          });
        },

      onError:
        (
          error
        ) => {
          toast.error(
            getErrorMessage(
              error,
              'Sohbet silinemedi'
            )
          );
        },
    });
  };
export const useDeleteChatMessage =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        (
          messageId
        ) =>
          chatApi.deleteMessage(
            messageId
          ),

      onSuccess:
        (
          result
        ) => {
          const conversationId =
            result?.data
              ?.conversation_id;

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

          queryClient.invalidateQueries({
            queryKey:
              chatKeys.conversations,
          });
        },

      onError:
        (
          error
        ) => {
          toast.error(
            getErrorMessage(
              error,
              'Mesaj silinemedi'
            )
          );
        },
    });
  };

export const useMarkChatRead =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          conversationId,
          messageId,
        }) =>
          chatApi.markRead(
            conversationId,
            messageId
          ),

      onSuccess:
        () => {
          queryClient.invalidateQueries({
            queryKey:
              chatKeys.conversations,
          });
        },
    });
  };

export const useSendChatAttachments =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          conversationId,
          files,
          content,
        }) =>
          chatApi.sendAttachments(
            conversationId,
            files,
            content
          ),

      onSuccess:
        (
          result,
          variables
        ) => {
          queryClient.invalidateQueries({
            queryKey:
              chatKeys.messages(
                variables
                  .conversationId
              ),
          });

          queryClient.invalidateQueries({
            queryKey:
              chatKeys.conversations,
          });
        },

      onError:
        (
          error
        ) => {
          toast.error(
            getErrorMessage(
              error,
              'Dosya gönderilemedi'
            )
          );
        },
    });
  };
