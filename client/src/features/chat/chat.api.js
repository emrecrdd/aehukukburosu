import api from '../../app/config/axios.js';

const CHAT_BASE =
  '/chat';

const unwrapBody = (
  response
) =>
  response?.data ??
  response;

const chatApi = {
  async getUsers() {
    const response =
      await api.get(
        `${CHAT_BASE}/users`
      );

    return unwrapBody(
      response
    );
  },

  async getOffice() {
    const response =
      await api.get(
        `${CHAT_BASE}/office`
      );

    return unwrapBody(
      response
    );
  },

  async getConversations() {
    const response =
      await api.get(
        `${CHAT_BASE}/conversations`
      );

    return unwrapBody(
      response
    );
  },

  async openDirect(
    userId
  ) {
    const response =
      await api.post(
        `${CHAT_BASE}/direct/${userId}`
      );

    return unwrapBody(
      response
    );
  },
async deleteConversation(
  conversationId
) {
  const response =
    await api.delete(
      `${CHAT_BASE}/conversations/${conversationId}`
    );

  return unwrapBody(
    response
  );
},
  async getMessages(
    conversationId,
    {
      before = null,
      limit = 30,
    } = {}
  ) {
    const response =
      await api.get(
        `${CHAT_BASE}/conversations/${conversationId}/messages`,
        {
          params: {
            ...(before
              ? {
                  before,
                }
              : {}),

            limit,
          },
        }
      );

    return unwrapBody(
      response
    );
  },

  async sendMessage(
    conversationId,
    content
  ) {
    const response =
      await api.post(
        `${CHAT_BASE}/conversations/${conversationId}/messages`,
        {
          content,
        }
      );

    return unwrapBody(
      response
    );
  },

  async editMessage(
    messageId,
    content
  ) {
    const response =
      await api.patch(
        `${CHAT_BASE}/messages/${messageId}`,
        {
          content,
        }
      );

    return unwrapBody(
      response
    );
  },

  async deleteMessage(
    messageId
  ) {
    const response =
      await api.delete(
        `${CHAT_BASE}/messages/${messageId}`
      );

    return unwrapBody(
      response
    );
  },

  async markRead(
    conversationId,
    messageId = null
  ) {
    const response =
      await api.post(
        `${CHAT_BASE}/conversations/${conversationId}/read`,
        {
          ...(messageId
            ? {
                messageId,
              }
            : {}),
        }
      );

    return unwrapBody(
      response
    );
  },

  async sendAttachments(
    conversationId,
    files,
    content = ''
  ) {
    const formData =
      new FormData();

    for (
      const file of
      files || []
    ) {
      formData.append(
        'files',
        file
      );
    }

    if (
      typeof content ===
        'string' &&
      content.trim()
    ) {
      formData.append(
        'content',
        content.trim()
      );
    }

    const response =
      await api.post(
        `${CHAT_BASE}/conversations/${conversationId}/attachments`,
        formData,
        {
          headers: {
            'Content-Type':
              'multipart/form-data',
          },
        }
      );

    return unwrapBody(
      response
    );
  },

  async getAttachmentDownload(
    attachmentId
  ) {
    const response =
      await api.get(
        `${CHAT_BASE}/attachments/${attachmentId}/download`
      );

    return unwrapBody(
      response
    );
  },
};

export default chatApi;
