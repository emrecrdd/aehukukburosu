import {
  Router,
} from 'express';

import {
  authenticate,
} from '../../middlewares/auth.middleware.js';

import {
  chatController,
} from './chat.controller.js';

import {
  chatUpload,
  CHAT_MAX_FILES,
} from './chat.upload.js';

const router =
  Router();

/*
 * Chat HTTP endpointlerinin tamamı merkezi auth zincirinden
 * geçer: JWT + active user + token_version + screen lock.
 */
router.use(
  authenticate
);

// ======================================================
// CHAT USERS
// ======================================================

router.get(
  '/users',
  chatController.getUsers
);

// ======================================================
// CONVERSATIONS
// ======================================================

router.get(
  '/office',
  chatController.getOffice
);

router.get(
  '/conversations',
  chatController.getConversations
);
router.delete(
  '/conversations/:conversationId',
  chatController.deleteConversation
);
router.post(
  '/direct/:userId',
  chatController.openDirectConversation
);

// ======================================================
// MESSAGES
// ======================================================

router.get(
  '/conversations/:conversationId/messages',
  chatController.getMessages
);

router.post(
  '/conversations/:conversationId/messages',
  chatController.sendMessage
);

router.post(
  '/conversations/:conversationId/attachments',
  chatUpload.array(
    'files',
    CHAT_MAX_FILES
  ),
  chatController.sendAttachments
);

router.patch(
  '/messages/:messageId',
  chatController.editMessage
);

router.delete(
  '/messages/:messageId',
  chatController.deleteMessage
);

// ======================================================
// ATTACHMENT DOWNLOAD
// ======================================================

router.get(
  '/attachments/:attachmentId/download',
  chatController.getAttachmentDownload
);

// ======================================================
// READ STATE
// ======================================================

router.post(
  '/conversations/:conversationId/read',
  chatController.markRead
);

export {
  router as chatRoutes,
};

export default router;
