import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ArrowLeft,
  MessagesSquare,
  Users,
} from 'lucide-react';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import ConversationList from '../../components/chat/ConversationList.jsx';
import MessageList from '../../components/chat/MessageList.jsx';
import MessageInput from '../../components/chat/MessageInput.jsx';
import NewDirectChatModal from '../../components/chat/NewDirectChatModal.jsx';
import ChatMessageActionDialog from '../../components/chat/ChatMessageActionDialog.jsx';

import chatApi from '../../features/chat/chat.api.js';

import {
  useChatConversations,
  useChatMessages,
  useChatUsers,
  useDeleteChatConversation,
  useDeleteChatMessage,
  useEditChatMessage,
  useMarkChatRead,
  useOpenDirectConversation,
  useSendChatMessage,
  useSendChatAttachments,
} from '../../features/chat/chat.query.js';

import {
  useChatRealtime,
} from '../../features/chat/chat.socket.js';

import toast from 'react-hot-toast';

const getMessagesFromInfiniteData = (
  data
) => {
  if (
    !Array.isArray(
      data?.pages
    )
  ) {
    return [];
  }

  /*
   * İlk page en yeni 30 mesajdır.
   * fetchNextPage daha eski sayfaları sona ekler.
   * Timeline için page sırasını ters çeviriyoruz.
   */
  return [
    ...data.pages,
  ]
    .reverse()
    .flatMap(
      (
        page
      ) =>
        Array.isArray(
          page?.data
        )
          ? page.data
          : []
    );
};

const isSameLocalDay = (
  first,
  second
) =>
  first.getFullYear() ===
    second.getFullYear() &&
  first.getMonth() ===
    second.getMonth() &&
  first.getDate() ===
    second.getDate();

const formatLastSeen = (
  value
) => {
  if (!value) {
    return 'Çevrimdışı';
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
    return 'Çevrimdışı';
  }

  const now =
    new Date();

  const yesterday =
    new Date(
      now
    );

  yesterday.setDate(
    now.getDate() -
      1
  );

  const time =
    date.toLocaleTimeString(
      'tr-TR',
      {
        hour:
          '2-digit',

        minute:
          '2-digit',
      }
    );

  if (
    isSameLocalDay(
      date,
      now
    )
  ) {
    return `Son görülme bugün ${time}`;
  }

  if (
    isSameLocalDay(
      date,
      yesterday
    )
  ) {
    return `Son görülme dün ${time}`;
  }

  const day =
    date.toLocaleDateString(
      'tr-TR',
      {
        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',
      }
    );

  return `Son görülme ${day} ${time}`;
};

const ChatPage = () => {
  const {
    user,
  } =
    useAuth();

  const [
    selectedConversationId,
    setSelectedConversationId,
  ] =
    useState(null);

  const [
    conversationSearch,
    setConversationSearch,
  ] =
    useState('');

  const [
    directModalOpen,
    setDirectModalOpen,
  ] =
    useState(false);

  const [
    mobileConversationOpen,
    setMobileConversationOpen,
  ] =
    useState(false);

  const [
    messageDialog,
    setMessageDialog,
  ] =
    useState(null);

  const conversationsQuery =
    useChatConversations();

  const usersQuery =
    useChatUsers(
      directModalOpen
    );

  const openDirect =
    useOpenDirectConversation();

  const sendMessage =
    useSendChatMessage();

  const sendAttachments =
    useSendChatAttachments();

  const editMessage =
    useEditChatMessage();

  const deleteMessage =
    useDeleteChatMessage();

  const deleteConversation =
    useDeleteChatConversation();

  const markRead =
    useMarkChatRead();

  const {
    typingState,
    readState,
    presenceState,
    sendTyping,
  } =
    useChatRealtime();

  const conversations =
    Array.isArray(
      conversationsQuery
        .data
    )
      ? conversationsQuery
          .data
      : [];

  useEffect(() => {
    if (
      selectedConversationId ||
      conversations.length ===
        0
    ) {
      return;
    }

    const office =
      conversations.find(
        (
          conversation
        ) =>
          conversation.type ===
          'office'
      );

    setSelectedConversationId(
      office?.id ||
        conversations[0]
          ?.id ||
        null
    );
  }, [
    conversations,
    selectedConversationId,
  ]);

  const selectedConversation =
    useMemo(
      () =>
        conversations.find(
          (
            conversation
          ) =>
            conversation.id ===
            selectedConversationId
        ) ||
        null,
      [
        conversations,
        selectedConversationId,
      ]
    );

  const filteredConversations =
    useMemo(
      () => {
        const query =
          conversationSearch
            .trim()
            .toLocaleLowerCase(
              'tr-TR'
            );

        if (!query) {
          return conversations;
        }

        return conversations.filter(
          (
            conversation
          ) =>
            String(
              conversation
                .display_name ||
              ''
            )
              .toLocaleLowerCase(
                'tr-TR'
              )
              .includes(
                query
              )
        );
      },
      [
        conversations,
        conversationSearch,
      ]
    );

  const messagesQuery =
    useChatMessages(
      selectedConversationId
    );

  const messages =
    useMemo(
      () =>
        getMessagesFromInfiniteData(
          messagesQuery.data
        ),
      [
        messagesQuery.data,
      ]
    );

  const latestMessage =
    messages[
      messages.length -
        1
    ];

  useEffect(() => {
    if (
      !selectedConversation ||
      !latestMessage ||
      markRead.isPending
    ) {
      return;
    }

    if (
      latestMessage
        ?.sender?.id ===
      user?.id
    ) {
      return;
    }

    if (
      selectedConversation
        .last_read_message_id ===
      latestMessage.id
    ) {
      return;
    }

    markRead.mutate({
      conversationId:
        selectedConversation.id,

      messageId:
        latestMessage.id,
    });
  }, [
    selectedConversation,
    latestMessage,
    user?.id,
    markRead,
  ]);

  const typingUserIds =
    typingState[
      selectedConversationId
    ] ||
    [];

  const typingNames =
    typingUserIds
      .map(
        (
          userId
        ) =>
          selectedConversation
            ?.members
            ?.find(
              (
                member
              ) =>
                member.user_id ===
                userId
            )
            ?.user
      )
      .filter(Boolean)
      .map(
        (
          memberUser
        ) =>
          [
            memberUser
              .first_name,
            memberUser
              .last_name,
          ]
            .filter(Boolean)
            .join(' ')
      );

  const handleSelectConversation =
    (
      conversation
    ) => {
      setSelectedConversationId(
        conversation.id
      );

      setMobileConversationOpen(
        true
      );
    };

  const handleDeleteConversation =
    async (
      conversation
    ) => {
      if (
        !conversation?.id ||
        conversation.type !==
          'direct'
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `${conversation.display_name || 'Bu sohbet'} ile olan sohbeti silmek istediğinize emin misiniz?`
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteConversation.mutateAsync(
          conversation.id
        );

        if (
          selectedConversationId ===
          conversation.id
        ) {
          setSelectedConversationId(
            null
          );

          setMobileConversationOpen(
            false
          );
        }

        toast.success(
          'Sohbet silindi'
        );
      } catch {
        /*
         * Mutation hook hata toast'ını gösterir.
         */
      }
    };

  const handleOpenDirect =
    async (
      targetUser
    ) => {
      const result =
        await openDirect.mutateAsync(
          targetUser.id
        );

      const conversation =
        result?.data;

      if (
        conversation?.id
      ) {
        setSelectedConversationId(
          conversation.id
        );

        setMobileConversationOpen(
          true
        );

        setDirectModalOpen(
          false
        );
      }
    };

  const handleSend =
    async (
      content
    ) => {
      if (
        !selectedConversationId
      ) {
        return;
      }

      await sendMessage.mutateAsync({
        conversationId:
          selectedConversationId,

        content,
      });
    };

  const handleSendFiles =
    async (
      files,
      content = ''
    ) => {
      if (
        !selectedConversationId ||
        !Array.isArray(
          files
        ) ||
        files.length ===
          0
      ) {
        return;
      }

      await sendAttachments.mutateAsync({
        conversationId:
          selectedConversationId,

        files,

        content,
      });
    };

  const handleEdit =
    (
      message
    ) => {
      setMessageDialog({
        mode:
          'edit',

        message,
      });
    };

  const handleDelete =
    (
      message
    ) => {
      setMessageDialog({
        mode:
          'delete',

        message,
      });
    };

  const handleCloseMessageDialog =
    () => {
      if (
        editMessage.isPending ||
        deleteMessage.isPending
      ) {
        return;
      }

      setMessageDialog(
        null
      );
    };

  const handleConfirmMessageAction =
    async (
      content
    ) => {
      const dialog =
        messageDialog;

      if (
        !dialog?.message?.id
      ) {
        return;
      }

      try {
        if (
          dialog.mode ===
          'edit'
        ) {
          await editMessage.mutateAsync({
            messageId:
              dialog.message.id,

            content,
          });

          setMessageDialog(
            null
          );

          toast.success(
            'Mesaj güncellendi'
          );

          return;
        }

        if (
          dialog.mode ===
          'delete'
        ) {
          await deleteMessage.mutateAsync(
            dialog.message.id
          );

          setMessageDialog(
            null
          );

          toast.success(
            'Mesaj silindi'
          );
        }
      } catch {
        /*
         * Mutation hook mevcut hata toast'ını gösterir.
         * Dialog hata halinde açık kalır.
         */
      }
    };

  const handleDownloadAttachment =
    async (
      attachment
    ) => {
      try {
        const result =
          await chatApi.getAttachmentDownload(
            attachment.id
          );

        const url =
          result?.data?.url;

        if (!url) {
          return;
        }

        window.location.href =
          url;
      } catch {
        /*
         * Storage şu anda kapalı olabilir.
         * Backend error middleware mesajı axios interceptor /
         * global error handler üzerinden gösterilebilir.
         */
      }
    };

  const otherMember =
    selectedConversation
      ?.type ===
      'direct'
      ? selectedConversation
          ?.members
          ?.find(
            (
              member
            ) =>
              member.user_id !==
              user?.id
          )
          ?.user
      : null;

  const directPresence =
    otherMember?.id
      ? (
          presenceState[
            otherMember.id
          ] ||
          selectedConversation
            ?.direct_presence ||
          null
        )
      : null;

  const persistedReadReceipt =
    selectedConversation
      ?.type ===
      'direct' &&
    otherMember?.id
      ? {
          user_id:
            otherMember.id,

          last_read_message_id:
            selectedConversation
              ?.other_last_read_message_id ||
            null,
        }
      : null;

  const directStatusText =
    selectedConversation
      ?.type !==
      'direct'
      ? ''
      : otherMember
          ?.is_active !==
        true
        ? 'Pasif kullanıcı'
        : directPresence
            ?.is_online ===
          true
          ? 'Çevrimiçi'
          : formatLastSeen(
              directPresence
                ?.last_seen_at
            );

  return (
    <>
      <div className="mx-auto h-[calc(100vh-112px)] min-h-[560px] max-w-[1600px] px-3 pb-3 md:px-5 md:pb-5">
        <div className="grid h-full min-h-0 overflow-hidden rounded-[22px] border border-slate-300/70 bg-[#e9eef4] shadow-[0_18px_55px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.03] dark:border-white/[0.07] dark:bg-[#08172b] dark:shadow-[0_20px_60px_rgba(0,0,0,0.30)] md:grid-cols-[328px_minmax(0,1fr)]">
          <aside
            className={`
              min-h-0 border-r border-slate-200/90
              bg-[#fbfcfe]
              dark:border-white/[0.06]
              dark:bg-[#09182c]
              ${
                mobileConversationOpen
                  ? 'hidden md:block'
                  : 'block'
              }
            `}
          >
            <ConversationList
              conversations={
                filteredConversations
              }
              selectedId={
                selectedConversationId
              }
              onSelect={
                handleSelectConversation
              }
              onDelete={
                handleDeleteConversation
              }
              deletingId={
                deleteConversation.isPending
                  ? deleteConversation.variables
                  : null
              }
              onNewDirect={() =>
                setDirectModalOpen(
                  true
                )
              }
              searchValue={
                conversationSearch
              }
              onSearchChange={
                setConversationSearch
              }
              loading={
                conversationsQuery
                  .isLoading
              }
            />
          </aside>

          <section
            className={`
              min-h-0 min-w-0
              bg-[#e7edf3]
              dark:bg-[#061324]
              ${
                mobileConversationOpen
                  ? 'flex'
                  : 'hidden md:flex'
              }
              flex-col
            `}
          >
            {!selectedConversation ? (
              <div className="flex h-full items-center justify-center bg-[#f7f8fa] px-6 text-center dark:bg-[#061324]">
                <div>
                  <MessagesSquare
                    size={34}
                    className="mx-auto text-gray-300 dark:text-slate-600"
                  />

                  <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Bir sohbet seç
                  </p>

                  <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                    Ofis Genel veya bir çalışanla birebir konuşabilirsin.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex min-h-[68px] items-center gap-3 border-b border-slate-200/90 bg-white/95 px-3 py-2.5 shadow-[0_1px_0_rgba(15,23,42,0.02)] backdrop-blur dark:border-white/[0.06] dark:bg-[#09182c]/95 md:px-5">
                  <button
                    type="button"
                    onClick={() =>
                      setMobileConversationOpen(
                        false
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-white/[0.05] md:hidden"
                    aria-label="Sohbet listesine dön"
                  >
                    <ArrowLeft
                      size={18}
                    />
                  </button>

                  <div
                    className={`
                      flex h-10 w-10 shrink-0
                      items-center justify-center
                      rounded-xl
                      ${
                        selectedConversation
                          .type ===
                        'office'
                          ? 'border border-amber-200/70 bg-[#fbf4df] text-[#8a6518] shadow-sm dark:border-amber-400/10 dark:bg-amber-400/[0.08] dark:text-amber-300'
                          : 'border border-slate-200 bg-slate-50 text-[#17345d] shadow-sm dark:border-white/[0.06] dark:bg-white/[0.04] dark:text-slate-300'
                      }
                    `}
                  >
                    {selectedConversation
                      .type ===
                    'office' ? (
                      <Users
                        size={18}
                      />
                    ) : (
                      <span className="text-xs font-bold">
                        {selectedConversation
                          .display_name
                          ?.split(
                            /\s+/
                          )
                          .slice(
                            0,
                            2
                          )
                          .map(
                            (
                              word
                            ) =>
                              word[0]
                          )
                          .join('')
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[14px] font-bold tracking-[-0.01em] text-slate-900 dark:text-white">
                      {
                        selectedConversation
                          .display_name
                      }
                    </h2>

                    <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      {typingNames.length >
                      0
                        ? `${typingNames.join(
                            ', '
                          )} yazıyor...`
                        : selectedConversation
                              .type ===
                            'office'
                          ? 'Tüm aktif ofis kullanıcıları'
                          : directStatusText}
                    </p>
                  </div>
                </div>

                {messagesQuery
                  .isLoading ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center bg-[#e7edf3] dark:bg-[#061324]">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600 dark:border-white/[0.08] dark:border-b-blue-500" />
                  </div>
                ) : (
                  <MessageList
                    messages={
                      messages
                    }
                    currentUserId={
                      user?.id
                    }
                    conversationType={
                      selectedConversation
                        .type
                    }
                    hasMore={
                      Boolean(
                        messagesQuery
                          .hasNextPage
                      )
                    }
                    loadingMore={
                      messagesQuery
                        .isFetchingNextPage
                    }
                    onLoadMore={() =>
                      messagesQuery
                        .fetchNextPage()
                    }
                    readReceipt={
                      readState[
                        selectedConversation
                          .id
                      ] ||
                      persistedReadReceipt
                    }
                    onEdit={
                      handleEdit
                    }
                    onDelete={
                      handleDelete
                    }
                    onDownloadAttachment={
                      handleDownloadAttachment
                    }
                  />
                )}

                <MessageInput
                  disabled={
                    !selectedConversationId ||
                    (
                      selectedConversation
                        .type ===
                        'direct' &&
                      otherMember &&
                      otherMember
                        .is_active !==
                        true
                    )
                  }
                  sending={
                    sendMessage
                      .isPending ||
                    sendAttachments
                      .isPending ||
                    editMessage
                      .isPending
                  }
                  onSend={
                    handleSend
                  }
                  onSendFiles={
                    handleSendFiles
                  }
                  onTyping={(
                    isTyping
                  ) =>
                    sendTyping(
                      selectedConversationId,
                      isTyping
                    )
                  }
                  attachmentsEnabled={
                    true
                  }
                />
              </>
            )}
          </section>
        </div>
      </div>

      <ChatMessageActionDialog
        open={
          Boolean(
            messageDialog
          )
        }
        mode={
          messageDialog
            ?.mode
        }
        message={
          messageDialog
            ?.message
        }
        pending={
          editMessage.isPending ||
          deleteMessage.isPending
        }
        onClose={
          handleCloseMessageDialog
        }
        onConfirm={
          handleConfirmMessageAction
        }
      />

      <NewDirectChatModal
        open={
          directModalOpen
        }
        users={
          usersQuery.data ||
          []
        }
        loading={
          usersQuery
            .isLoading
        }
        opening={
          openDirect
            .isPending
        }
        onClose={() =>
          setDirectModalOpen(
            false
          )
        }
        onSelect={
          handleOpenDirect
        }
      />
    </>
  );
};

export default ChatPage;
