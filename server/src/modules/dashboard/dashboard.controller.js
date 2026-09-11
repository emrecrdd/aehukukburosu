import {
  dashboardService,
} from './dashboard.service.js';

import {
  successResponse,
} from '../../utils/response.js';

export const dashboardController = {
  // ======================================================
  // DASHBOARD STATS
  // ======================================================

  async getStats(
    req,
    res
  ) {
    try {
      const stats =
        await dashboardService.getStats(
          req.user
        );

      return successResponse(
        res,
        stats,
        'Dashboard stats fetched successfully'
      );
    } catch (error) {
      console.error(
        'Get stats error:',
        error
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            error.message,
        });
    }
  },

  // ======================================================
  // TODAY HEARINGS
  // ======================================================

  async getTodayHearings(
    req,
    res
  ) {
    try {
      const hearings =
        await dashboardService.getTodayHearings(
          req.user
        );

      return successResponse(
        res,
        hearings,
        "Today's hearings fetched successfully"
      );
    } catch (error) {
      console.error(
        'Get hearings error:',
        error
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            error.message,
        });
    }
  },

  // ======================================================
  // UPCOMING TASKS
  // ======================================================

  async getUpcomingTasks(
    req,
    res
  ) {
    try {
      /*
       * Sadece user id değil, actor'ın tamamını service'e
       * geçiriyoruz. Böylece task ve bağlı case erişim
       * permission'ları service katmanında doğrulanabilir.
       */
      const tasks =
        await dashboardService.getUpcomingTasks(
          req.user
        );

      return successResponse(
        res,
        tasks,
        'Upcoming tasks fetched successfully'
      );
    } catch (error) {
      console.error(
        'Get tasks error:',
        error
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            error.message,
        });
    }
  },

  // ======================================================
  // RECENT ACTIVITIES
  // ======================================================

  async getRecentActivities(
    req,
    res
  ) {
    try {
      const activities =
        await dashboardService.getRecentActivities(
          5,
          req.user
        );

      return successResponse(
        res,
        activities,
        'Recent activities fetched successfully'
      );
    } catch (error) {
      console.error(
        'Get activities error:',
        error
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            error.message,
        });
    }
  },
};

export default dashboardController;
