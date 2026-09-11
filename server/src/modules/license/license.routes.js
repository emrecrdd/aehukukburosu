import express from 'express';

import {
  authenticate,
} from '../../middlewares/auth.middleware.js';

import {
  licenseController,
} from './license.controller.js';

const router =
  express.Router();

router.get(
  '/current',
  authenticate,
  licenseController.current
);

export {
  router as licenseRoutes,
};

export default router;
