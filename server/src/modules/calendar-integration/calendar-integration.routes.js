import express from 'express';

import {
  calendarIntegrationController,
} from './calendar-integration.controller.js';

import {
  authenticate,
} from '../../middlewares/auth.middleware.js';

const router =
  express.Router();

// ======================================================
// PUBLIC GOOGLE CALLBACK
// ======================================================

/*
 * Google OAuth dönüşü buraya gelir.
 *
 * Bu route authenticate arkasında DEĞİL.
 *
 * Kullanıcı kimliği controller/service tarafında
 * imzalı ve süreli OAuth state üzerinden doğrulanır.
 */

router.get(
  '/google/callback',
  calendarIntegrationController
    .handleGoogleCallback
);

// ======================================================
// AUTHENTICATED ROUTES
// ======================================================

router.use(
  authenticate
);

// ======================================================
// GOOGLE CONNECTION STATUS
// ======================================================

router.get(
  '/google/status',
  calendarIntegrationController
    .getGoogleStatus
);

// ======================================================
// GOOGLE CONNECT
// ======================================================

/*
 * Frontend önce bu endpoint'i çağırır.
 *
 * Response:
 *
 * {
 *   success: true,
 *   data: {
 *     url: "https://accounts.google.com/..."
 *   }
 * }
 *
 * Frontend bu URL'yi popup veya yeni sekmede açar.
 */

router.get(
  '/google/connect',
  calendarIntegrationController
    .getGoogleAuthorizationUrl
);

// ======================================================
// GOOGLE DISCONNECT
// ======================================================

router.delete(
  '/google',
  calendarIntegrationController
    .disconnectGoogle
);

export {
  router as calendarIntegrationRoutes,
};

export default router;