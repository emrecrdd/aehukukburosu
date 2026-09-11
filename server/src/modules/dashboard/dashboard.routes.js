import express from 'express';
import { dashboardController } from './dashboard.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/stats', dashboardController.getStats);
router.get('/hearings', dashboardController.getTodayHearings);
router.get('/tasks', dashboardController.getUpcomingTasks);
router.get('/activities', dashboardController.getRecentActivities);

export { router as dashboardRoutes };