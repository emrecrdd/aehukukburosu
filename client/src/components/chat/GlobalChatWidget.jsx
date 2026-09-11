import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ArrowLeft,
  Maximize2,
  MessageCircle,
  Users,
  X,
} from 'lucide-react';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import toast from 'react-hot-toast';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import chatApi from '../../features/chat/chat.api.js';

import {
  useChatConversations,
  useChatMessages,
  useChatUsers,
  useDeleteChatMessage,
  useEditChatMessage,
  useMarkChatRead,
  useOpenDirectConversation,
  useSendChatAttachments,
  useSendChatMessage,
} from '../../features/chat/chat.query.js';

import {
  useChatRealtime,
} from '../../features/chat/chat.socket.js';

import ConversationList from './ConversationList.jsx';
import MessageInput from './MessageInput.jsx';
import MessageList from './MessageList.jsx';
import NewDirectChatModal from './NewDirectChatModal.jsx';
import ChatMessageActionDialog from './ChatMessageActionDialog.jsx';

const CHAT_WINDOW_STORAGE_KEY =
  'derkenar-chat-window';

const CHAT_WINDOW_DEFAULT = {
  width:
    420,

  height:
    650,

  x:
    null,

  y:
    24,
};

const CHAT_WINDOW_MIN_WIDTH =
  280;

const CHAT_WINDOW_MIN_HEIGHT =
  340;

const CHAT_WINDOW_MARGIN =
  12;

const getViewportBounds =
  () => ({
    width:
      typeof window !==
        'undefined'
        ? window.innerWidth
        : 1440,

    height:
      typeof window !==
        'undefined'
        ? window.innerHeight
        : 900,
  });

const clamp = (
  value,
  min,
  max
) =>
  Math.min(
    Math.max(
      value,
      min
    ),
    max
  );

const normalizeWindowState =
  (
    value = {}
  ) => {
    const viewport =
      getViewportBounds();

    const maxWidth =
      Math.max(
        CHAT_WINDOW_MIN_WIDTH,
        viewport.width -
          CHAT_WINDOW_MARGIN *
            2
      );

    const maxHeight =
      Math.max(
        CHAT_WINDOW_MIN_HEIGHT,
        viewport.height -
          CHAT_WINDOW_MARGIN *
            2
      );

    const width =
      clamp(
        Number(
          value.width
        ) ||
          CHAT_WINDOW_DEFAULT.width,
        CHAT_WINDOW_MIN_WIDTH,
        maxWidth
      );

    const height =
      clamp(
        Number(
          value.height
        ) ||
          Math.min(
            CHAT_WINDOW_DEFAULT.height,
            maxHeight
          ),
        CHAT_WINDOW_MIN_HEIGHT,
        maxHeight
      );

    const defaultX =
      Math.max(
        CHAT_WINDOW_MARGIN,
        viewport.width -
          width -
          24
      );

    const x =
      clamp(
        Number.isFinite(
          Number(
            value.x
          )
        )
          ? Number(
              value.x
            )
          : defaultX,
        CHAT_WINDOW_MARGIN,
        Math.max(
          CHAT_WINDOW_MARGIN,
          viewport.width -
            width -
            CHAT_WINDOW_MARGIN
        )
      );

    const y =
      clamp(
        Number(
          value.y
        ) ||
          CHAT_WINDOW_DEFAULT.y,
        CHAT_WINDOW_MARGIN,
        Math.max(
          CHAT_WINDOW_MARGIN,
          viewport.height -
            height -
            CHAT_WINDOW_MARGIN
        )
      );

    return {
      width,
      height,
      x,
      y,
    };
  };

const readStoredWindowState =
  () => {
    if (
      typeof window ===
      'undefined'
    ) {
      return normalizeWindowState(
        CHAT_WINDOW_DEFAULT
      );
    }

    try {
      const stored =
        window.localStorage.getItem(
          CHAT_WINDOW_STORAGE_KEY
        );

      if (!stored) {
        return normalizeWindowState(
          CHAT_WINDOW_DEFAULT
        );
      }

      return normalizeWindowState(
        JSON.parse(
          stored
        )
      );
    } catch {
      return normalizeWindowState(
        CHAT_WINDOW_DEFAULT
      );
    }
  };

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

  return `Son görülme ${date.toLocaleDateString(
    'tr-TR',
    {
      day:
        '2-digit',

      month:
        '2-digit',
    }
  )} ${time}`;
};

const getInitials = (
  conversation
) => {
  const value =
    conversation
      ?.display_name ||
    conversation
      ?.name ||
    'S';

  return String(
    value
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean)
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
    .toUpperCase();
};

const GlobalChatPanel = ({
  onClose,
}) => {
  const navigate =
    useNavigate();

  const {
    user,
  } =
    useAuth();

  const [
    windowState,
    setWindowState,
  ] =
    useState(
      readStoredWindowState
    );

  const [
    dragState,
    setDragState,
  ] =
    useState(null);

  const [
    resizeState,
    setResizeState,
  ] =
    useState(null);

  const [
    selectedConversationId,
    setSelectedConversationId,
  ] =
    useState(null);

  const [
    openedConversation,
    setOpenedConversation,
  ] =
    useState(null);

  const [
    view,
    setView,
  ] =
    useState('list');

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

  const markRead =
    useMarkChatRead();

  const realtime =
    useChatRealtime();

  const typingState =
    realtime
      ?.typingState ||
    {};

  const readState =
    realtime
      ?.readState ||
    {};

  const presenceState =
    realtime
      ?.presenceState ||
    {};

  const sendTyping =
    realtime
      ?.sendTyping;

  const conversations =
    Array.isArray(
      conversationsQuery
        .data
    )
      ? conversationsQuery
          .data
      : [];

  const unreadTotal =
    useMemo(
      () =>
        conversations.reduce(
          (
            total,
            conversation
          ) =>
            total +
            Number(
              conversation
                ?.unread_count ||
              0
            ),
          0
        ),
      [
        conversations,
      ]
    );

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
        (
          openedConversation
            ?.id ===
          selectedConversationId
            ? openedConversation
            : null
        ),
      [
        conversations,
        openedConversation,
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
                ?.display_name ||
              conversation
                ?.name ||
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
      view ===
        'thread'
        ? selectedConversationId
        : null
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

  const otherMembership =
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
      : null;

  const otherMember =
    otherMembership
      ?.user ||
    null;

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

  useEffect(
    () => {
      if (
        view !==
          'thread' ||
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
    },
    [
      view,
      selectedConversation,
      latestMessage,
      user?.id,
      markRead,
    ]
  );

  const handleSelectConversation =
    (
      conversation
    ) => {
      setSelectedConversationId(
        conversation.id
      );

      setOpenedConversation(
        null
      );

      setView(
        'thread'
      );
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
        !conversation?.id
      ) {
        return;
      }

      setOpenedConversation(
        conversation
      );

      setSelectedConversationId(
        conversation.id
      );

      setDirectModalOpen(
        false
      );

      setView(
        'thread'
      );
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
      content =
        ''
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
         * Mutation hook hata toast'ını gösterir.
         * Kullanıcı düzeltmek / tekrar denemek için dialogda kalır.
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

        if (url) {
          window.location.href =
            url;
        }
      } catch {
        /*
         * API/global interceptor mevcut hata mesajını yönetir.
         */
      }
    };

  const handleTyping =
    useCallback(
      (
        isTyping
      ) => {
        if (
          !selectedConversationId ||
          typeof sendTyping !==
            'function'
        ) {
          return;
        }

        sendTyping(
          selectedConversationId,
          isTyping
        );
      },
      [
        selectedConversationId,
        sendTyping,
      ]
    );

  useEffect(
    () => {
      if (
        typeof window ===
        'undefined'
      ) {
        return;
      }

      window.localStorage.setItem(
        CHAT_WINDOW_STORAGE_KEY,
        JSON.stringify(
          windowState
        )
      );
    },
    [
      windowState,
    ]
  );

  useEffect(
    () => {
      const handleViewportResize =
        () => {
          if (
            window.innerWidth <
            768
          ) {
            return;
          }

          setWindowState(
            (
              current
            ) =>
              normalizeWindowState(
                current
              )
          );
        };

      window.addEventListener(
        'resize',
        handleViewportResize
      );

      return () => {
        window.removeEventListener(
          'resize',
          handleViewportResize
        );
      };
    },
    []
  );

  useEffect(
    () => {
      if (
        !dragState &&
        !resizeState
      ) {
        return undefined;
      }

      const previousUserSelect =
        document.body.style
          .userSelect;

      const previousCursor =
        document.body.style
          .cursor;

      document.body.style.userSelect =
        'none';

      document.body.style.cursor =
        dragState
          ? 'grabbing'
          : 'nwse-resize';

      const handlePointerMove =
        (
          event
        ) => {
          if (
            window.innerWidth <
            768
          ) {
            return;
          }

          if (
            dragState
          ) {
            const viewport =
              getViewportBounds();

            const nextX =
              event.clientX -
              dragState.offsetX;

            const nextY =
              event.clientY -
              dragState.offsetY;

            setWindowState(
              (
                current
              ) => ({
                ...current,

                x:
                  clamp(
                    nextX,
                    CHAT_WINDOW_MARGIN,
                    Math.max(
                      CHAT_WINDOW_MARGIN,
                      viewport.width -
                        current.width -
                        CHAT_WINDOW_MARGIN
                    )
                  ),

                y:
                  clamp(
                    nextY,
                    CHAT_WINDOW_MARGIN,
                    Math.max(
                      CHAT_WINDOW_MARGIN,
                      viewport.height -
                        current.height -
                        CHAT_WINDOW_MARGIN
                    )
                  ),
              })
            );

            return;
          }

          if (
            resizeState
          ) {
            const viewport =
              getViewportBounds();

            const maxWidth =
              Math.max(
                CHAT_WINDOW_MIN_WIDTH,
                viewport.width -
                  resizeState.startX -
                  CHAT_WINDOW_MARGIN
              );

            const maxHeight =
              Math.max(
                CHAT_WINDOW_MIN_HEIGHT,
                viewport.height -
                  resizeState.startY -
                  CHAT_WINDOW_MARGIN
              );

            const nextWidth =
              clamp(
                resizeState.startWidth +
                  (
                    event.clientX -
                    resizeState.pointerX
                  ),
                CHAT_WINDOW_MIN_WIDTH,
                maxWidth
              );

            const nextHeight =
              clamp(
                resizeState.startHeight +
                  (
                    event.clientY -
                    resizeState.pointerY
                  ),
                CHAT_WINDOW_MIN_HEIGHT,
                maxHeight
              );

            setWindowState(
              (
                current
              ) => ({
                ...current,

                width:
                  nextWidth,

                height:
                  nextHeight,
              })
            );
          }
        };

      const handlePointerUp =
        () => {
          setDragState(
            null
          );

          setResizeState(
            null
          );
        };

      window.addEventListener(
        'pointermove',
        handlePointerMove
      );

      window.addEventListener(
        'pointerup',
        handlePointerUp
      );

      return () => {
        window.removeEventListener(
          'pointermove',
          handlePointerMove
        );

        window.removeEventListener(
          'pointerup',
          handlePointerUp
        );

        document.body.style.userSelect =
          previousUserSelect;

        document.body.style.cursor =
          previousCursor;
      };
    },
    [
      dragState,
      resizeState,
    ]
  );

  const handleWindowDragStart =
    (
      event
    ) => {
      if (
        window.innerWidth <
          768 ||
        event.button !==
          0
      ) {
        return;
      }

      const interactive =
        event.target.closest(
          'button, input, textarea, a, [role="button"]'
        );

      if (
        interactive
      ) {
        return;
      }

      event.preventDefault();

      setDragState({
        offsetX:
          event.clientX -
          windowState.x,

        offsetY:
          event.clientY -
          windowState.y,
      });
    };

  const handleResizeStart =
    (
      event
    ) => {
      if (
        window.innerWidth <
          768 ||
        event.button !==
          0
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setResizeState({
        pointerX:
          event.clientX,

        pointerY:
          event.clientY,

        startWidth:
          windowState.width,

        startHeight:
          windowState.height,

        startX:
          windowState.x,

        startY:
          windowState.y,
      });
    };

  return (
    <>
      <section
        className="
          fixed inset-0 z-40
          flex min-h-0 flex-col
          overflow-hidden bg-white
          shadow-2xl
          dark:bg-[#08172b]
          md:inset-auto
          md:rounded-[24px]
          md:border md:border-slate-200/90
          md:shadow-[0_24px_80px_rgba(15,23,42,0.22)]
          md:dark:border-white/[0.08]
        "
        style={
          typeof window !==
            'undefined' &&
          window.innerWidth >=
            768
            ? {
                left:
                  `${windowState.x}px`,

                top:
                  `${windowState.y}px`,

                width:
                  `${windowState.width}px`,

                height:
                  `${windowState.height}px`,
              }
            : undefined
        }
        aria-label="Hızlı sohbet"
      >
        <header
          onPointerDown={
            handleWindowDragStart
          }
          className="
            flex min-h-[62px] shrink-0
            items-center gap-2
            border-b border-slate-200/90
            bg-white/95 px-3
            backdrop-blur
            dark:border-white/[0.07]
            dark:bg-[#09182c]/95
            md:cursor-grab
            md:active:cursor-grabbing
          "
          title="Pencereyi taşımak için sürükle"
        >
          {view ===
            'thread' ? (
            <button
              type="button"
              onClick={() =>
                setView(
                  'list'
                )
              }
              className="
                inline-flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-xl text-slate-500
                transition hover:bg-slate-100
                dark:text-slate-400
                dark:hover:bg-white/[0.06]
              "
              aria-label="Sohbet listesine dön"
            >
              <ArrowLeft
                size={18}
              />
            </button>
          ) : (
            <div
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-xl
                bg-[#102f59] text-white
                shadow-sm
                dark:bg-blue-600
              "
            >
              <MessageCircle
                size={18}
              />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {view ===
              'thread' &&
            selectedConversation ? (
              <>
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                  {
                    selectedConversation
                      .display_name
                  }
                </p>

                <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {typingNames.length >
                  0
                    ? `${typingNames.join(
                        ', '
                      )} yazıyor...`
                    : selectedConversation
                          .type ===
                        'office'
                      ? 'Ofis içi iletişim'
                      : directStatusText}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Sohbetler
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {unreadTotal >
                  0
                    ? `${unreadTotal} okunmamış mesaj`
                    : 'Ofis iletişimi'}
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(
                '/chat'
              );
            }}
            className="
              inline-flex h-9 w-9 shrink-0
              items-center justify-center
              rounded-xl text-slate-500
              transition hover:bg-slate-100
              dark:text-slate-400
              dark:hover:bg-white/[0.06]
            "
            title="Tam ekran aç"
            aria-label="Sohbetleri tam ekran aç"
          >
            <Maximize2
              size={17}
            />
          </button>

          <button
            type="button"
            onClick={
              onClose
            }
            className="
              inline-flex h-9 w-9 shrink-0
              items-center justify-center
              rounded-xl text-slate-500
              transition hover:bg-slate-100
              dark:text-slate-400
              dark:hover:bg-white/[0.06]
            "
            aria-label="Sohbeti kapat"
          >
            <X
              size={18}
            />
          </button>
        </header>

        <div className="min-h-0 flex-1">
          {view ===
            'list' ? (
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
          ) : !selectedConversation ? (
            <div className="flex h-full items-center justify-center bg-[#e7edf3] px-6 text-center dark:bg-[#061324]">
              <div>
                <Users
                  size={28}
                  className="mx-auto text-slate-300 dark:text-slate-600"
                />

                <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Sohbet yükleniyor
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              {messagesQuery
                .isLoading ? (
                <div className="flex min-h-0 flex-1 items-center justify-center bg-[#e7edf3] dark:bg-[#061324]">
                  <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-b-blue-600 dark:border-white/[0.08] dark:border-b-blue-500" />
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
                onTyping={
                  handleTyping
                }
                attachmentsEnabled={
                  true
                }
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onPointerDown={
            handleResizeStart
          }
          className="
            absolute bottom-0 right-0
            z-30 hidden h-7 w-7
            cursor-nwse-resize
            items-end justify-end
            rounded-tl-xl
            md:flex
          "
          aria-label="Sohbet penceresini yeniden boyutlandır"
          title="Köşeden tutup küçült / büyüt"
        >
          <span
            className="
              mb-1.5 mr-1.5 block
              h-3 w-3
              border-b-2 border-r-2
              border-slate-400/70
              dark:border-slate-400/50
            "
          />
        </button>
      </section>

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

const GlobalChatWidget = () => {
  const {
    pathname,
  } =
    useLocation();

  const {
    user,
  } =
    useAuth();

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const conversationsQuery =
    useChatConversations();

  const realtime =
    useChatRealtime();

  /*
   * Realtime hook'un burada mount edilmesi,
   * drawer kapalıyken de unread listesinin güncel
   * kalmasını sağlar. Aynı SocketProvider kullanılır;
   * yeni socket bağlantısı oluşturulmaz.
   */
  void realtime;

  const conversations =
    Array.isArray(
      conversationsQuery
        .data
    )
      ? conversationsQuery
          .data
      : [];

  const unreadTotal =
    useMemo(
      () =>
        conversations.reduce(
          (
            total,
            conversation
          ) =>
            total +
            Number(
              conversation
                ?.unread_count ||
              0
            ),
          0
        ),
      [
        conversations,
      ]
    );

  if (
    !user ||
    pathname ===
      '/chat' ||
    pathname.startsWith(
      '/chat/'
    )
  ) {
    return null;
  }

  if (open) {
    return (
      <GlobalChatPanel
        onClose={() =>
          setOpen(
            false
          )
        }
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() =>
        setOpen(
          true
        )
      }
      className="
        fixed bottom-5 right-5 z-40
        inline-flex h-14 w-14
        items-center justify-center
        rounded-2xl
        bg-[#102f59] text-white
        shadow-[0_14px_35px_rgba(15,47,89,0.32)]
        transition
        hover:-translate-y-0.5
        hover:bg-[#153d70]
        focus:outline-none
        focus:ring-4
        focus:ring-blue-200/60
        dark:bg-blue-600
        dark:hover:bg-blue-500
        dark:focus:ring-blue-500/20
      "
      aria-label="Hızlı sohbeti aç"
      title="Sohbetler"
    >
      <MessageCircle
        size={24}
      />

      {unreadTotal >
        0 && (
        <span
          className="
            absolute -right-1.5 -top-1.5
            flex min-h-[22px] min-w-[22px]
            items-center justify-center
            rounded-full border-2 border-white
            bg-rose-500 px-1.5
            text-[10px] font-bold text-white
            shadow-sm
            dark:border-[#08172b]
          "
        >
          {unreadTotal >
          99
            ? '99+'
            : unreadTotal}
        </span>
      )}
    </button>
  );
};

export default GlobalChatWidget;
