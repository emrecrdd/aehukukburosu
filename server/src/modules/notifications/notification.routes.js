import express from 'express';

import {
  notificationController,
} from './notification.controller.js';

import {
  authenticate,
} from '../../middlewares/auth.middleware.js';

const router =
  express.Router();

router.use(
  authenticate
);

// ======================================================
// CURRENT USER
// ======================================================

router.get(
  '/unread-count',
  notificationController.getUnreadCount
);

router.get(
  '/my',
  notificationController.getMyNotifications
);

router.post(
  '/mark-all-read',
  notificationController.markAllAsRead
);

router.delete(
  '/remove-all',
  notificationController.removeAll
);

// ======================================================
// SINGLE NOTIFICATION
// Controller mutlaka req.user.id ile ownership kontrolü yapmalı.
// ======================================================

router.get(
  '/:id',
  notificationController.getOne
);

router.patch(
  '/:id/read',
  notificationController.markAsRead
);

router.delete(
  '/:id',
  notificationController.remove
);

export {
  router as notificationRoutes,
};