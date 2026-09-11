import {
  chatService,
} from './chat.service.js';

import {
  chatAttachmentService,
} from './chat.attachment.service.js';

import {
  chatRealtime,
} from './chat.realtime.js';

export const chatController = {
  // ====================================================
  // AVAILABLE CHAT USERS
  // ====================================================

  async getUsers(
    req,
    res,
    next
  ) {
    try {
      const data =
        await chatService.getAvailableUsers(
          req.user
        );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (error) {
      return next(error);
    }
  },

  // ====================================================
  // OFFICE GENERAL
  // ====================================================

  async getOffice(
    req,
    res,
    next
  ) {
    try {
      const data =
        await chatService.getOfficeConversation(
          req.user
        );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (error) {
      return next(error);
    }
  },

  // ====================================================
  // CONVERSATIONS
  // ====================================================

  async getConversations(
    req,
    res,
    next
  ) {
    try {
      const data =
        await chatService.getConversations(
          req.user
        );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (error) {
      return next(error);
    }
  },
// ====================================================
// DELETE / HIDE CONVERSATION
// ====================================================

async deleteConversation(
  req,
  res,
  next
) {
  try {
    const data =
      await chatService.deleteConversation(
        req.params.conversationId,
        req.user
      );

    return res
      .status(200)
      .json({
        success:
          true,

        data,
      });
  } catch (error) {
    return next(error);
  }
},
  // ====================================================
  // DIRECT
  // ====================================================

  async openDirectConversation(
    req,
    res,
    next
  ) {
    try {
      const result =
        await chatService.getOrCreateDirectConversation(
          req.user,
          req.params.userId
        );

      if (
        result.created
      ) {
        await chatRealtime.publishConversationCreated(
          result.conversation.id
        );
      }

      return res
        .status(
          result.created
            ? 201
            : 200
        )
        .json({
          success:
            true,

          created:
            result.created,

          data:
            result.conversation,
        });
    } catch (error) {
      return next(error);
    }
  },

  // ====================================================
  // MESSAGES
  // ====================================================

  async getMessages(
    req,
    res,
    next
  ) {
    try {
      const result =
        await chatService.getMessages(
          req.params.conversationId,
          req.user,
          {
            before:
              req.query.before ||
              null,

            limit:
              req.query.limit,
          }
        );

      return res
        .status(200)
        .json({
          success:
            true,

          data:
            result.data,

          next_cursor:
            result.next_cursor,
        });
    } catch (error) {
      return next(error);
    }
  },

  async sendMessage(
    req,
    res,
    next
  ) {
    try {
      const data =
        await chatService.sendTextMessage(
          req.params.conversationId,
          req.user,
          req.body?.content
        );

      await chatRealtime.publishMessageCreated(
        data
      );

      return res
        .status(201)
        .json({
          success:
            true,

          data,
        });
    } catch (error) {
      return next(error);
    }
  },

  async sendAttachments(
    req,
    res,
    next
  ) {
    try {
      const data =
        await chatAttachmentService.sendFiles(
          req.params.conversationId,
          req.user,
          req.files,
          req.body?.content ||
            null
        );

      await chatRealtime.publishMessageCreated(
        data
      );

      return res
        .status(201)
        .json({
          success:
            true,

          data,
        });
    } catch (error) {
      return next(error);
    }
  },

  async editMessage(
    req,
    res,
    next
  ) {
    try {
      const data =
        await chatService.editMessage(
          req.params.messageId,
          req.user,
          req.body?.content
        );

      await chatRealtime.publishMessageUpdated(
        data
      );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (error) {
      return next(error);
    }
  },

  async deleteMessage(
    req,
    res,
    next
  ) {
    try {
      const data =
        await chatService.deleteMessage(
          req.params.messageId,
          req.user
        );

      await chatRealtime.publishMessageDeleted(
        data
      );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (error) {
      return next(error);
    }
  },

  // ====================================================
  // ATTACHMENT DOWNLOAD
  // ====================================================

  async getAttachmentDownload(
    req,
    res,
    next
  ) {
    try {
      const data =
        await chatAttachmentService.getDownloadUrl(
          req.params.attachmentId,
          req.user
        );

      res.set(
        'Cache-Control',
        'no-store'
      );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (error) {
      return next(error);
    }
  },

  // ====================================================
  // READ STATE
  // ====================================================

  async markRead(
    req,
    res,
    next
  ) {
    try {
      const data =
        await chatService.markRead(
          req.params.conversationId,
          req.user,
          req.body?.messageId ||
            null
        );

      await chatRealtime.publishRead(
        data,
        req.user.id
      );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (error) {
      return next(error);
    }
  },
};

export default chatController;
