import express from 'express';

import {
  authenticate,
} from '../../middlewares/auth.middleware.js';

import {
  screenLockController,
} from './screen-lock.controller.js';

const router =
  express.Router();

router.use(
  authenticate
);

router.get(
  '/status',
  screenLockController.status
);

router.post(
  '/setup',
  screenLockController.setup
);

router.post(
  '/lock',
  screenLockController.lock
);

router.post(
  '/touch',
  screenLockController.touch
);

router.post(
  '/unlock',
  screenLockController.unlock
);

router.post(
  '/recover/password',
  screenLockController.recoverWithPassword
);

router.post(
  '/recover/recovery-code',
  screenLockController.recoverWithCode
);

router.post(
  '/recovery-codes/regenerate',
  screenLockController.regenerateRecoveryCodes
);

export {
  router as screenLockRoutes,
};
