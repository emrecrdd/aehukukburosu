import express from 'express';

import {
  authController,
} from './auth.controller.js';

import {
  authenticate,
} from '../../middlewares/auth.middleware.js';

import {
  validate,
} from '../../middlewares/validate.middleware.js';

import {
  authValidation,
} from './auth.validation.js';

const router =
  express.Router();

// ======================================================
// PUBLIC / TOKEN ROUTES
// ======================================================

router.post(
  '/login',
  validate(
    authValidation.login
  ),
  authController.login
);

router.post(
  '/refresh-token',
  authController.refreshToken
);

/*
 * Logout'u authenticate arkasına koymuyoruz.
 *
 * Access token süresi dolmuş olsa bile kullanıcı
 * refresh token üzerinden oturumu kapatabilmeli.
 */
router.post(
  '/logout',
  authController.logout
);

router.post(
  '/forgot-password',
  validate(
    authValidation.forgotPassword
  ),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  validate(
    authValidation.resetPassword
  ),
  authController.resetPassword
);

// ======================================================
// PROTECTED ROUTES
// ======================================================

router.use(
  authenticate
);

router.get(
  '/profile',
  authController.getProfile
);

router.patch(
  '/profile',
  authController.updateProfile
);

router.put(
  '/profile',
  authController.updateProfile
);

router.put(
  '/change-password',
  validate(
    authValidation.changePassword
  ),
  authController.changePassword
);

export {
  router as authRoutes,
};