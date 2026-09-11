import {
  performanceService,
} from './performance.service.js';

// ======================================================
// TEAM OVERVIEW
// ======================================================

export const getTeamOverview =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await performanceService.getTeamOverview(
          req.query
        );

      return res.status(200).json({
        success:
          true,

        data,
      });
    } catch (error) {
      console.error(
        'Get team performance overview error:',
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          'Performans özeti alınamadı',
      });
    }
  };

// ======================================================
// ALL USERS PERFORMANCE
// ======================================================

export const getUsersPerformance =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await performanceService.getUsersPerformance(
          req.query
        );

      return res.status(200).json({
        success:
          true,

        data,
      });
    } catch (error) {
      console.error(
        'Get users performance error:',
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          'Kullanıcı performansları alınamadı',
      });
    }
  };

// ======================================================
// SINGLE USER PERFORMANCE
// ======================================================

export const getUserPerformance =
  async (
    req,
    res
  ) => {
    try {
      const {
        userId,
      } = req.params;

      if (!userId) {
        return res.status(400).json({
          success:
            false,

          message:
            'Kullanıcı ID gereklidir',
        });
      }

      const data =
        await performanceService.getUserPerformance(
          userId,
          req.query
        );

      return res.status(200).json({
        success:
          true,

        data,
      });
    } catch (error) {
      console.error(
        'Get user performance error:',
        error
      );

      const message =
        error.message ||
        'Kullanıcı performansı alınamadı';

      const statusCode =
        message ===
        'Kullanıcı bulunamadı'
          ? 404
          : 500;

      return res.status(statusCode).json({
        success:
          false,

        message,
      });
    }
  };

// ======================================================
// CURRENT USER PERFORMANCE
// ======================================================

export const getMyPerformance =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success:
            false,

          message:
            'Oturum bilgisi bulunamadı',
        });
      }

      const data =
        await performanceService.getUserPerformance(
          userId,
          req.query
        );

      return res.status(200).json({
        success:
          true,

        data,
      });
    } catch (error) {
      console.error(
        'Get my performance error:',
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          'Performans bilgileri alınamadı',
      });
    }
  };

export default {
  getTeamOverview,
  getUsersPerformance,
  getUserPerformance,
  getMyPerformance,
};