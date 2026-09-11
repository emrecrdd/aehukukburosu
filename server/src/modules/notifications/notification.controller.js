import {
  notificationService,
} from './notification.service.js';

import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from '../../utils/response.js';

import {
  logger,
} from '../../config/logger.js';

export const notificationController = {
  // ======================================================
  // MY NOTIFICATIONS
  // ======================================================

  async getMyNotifications(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        read,
      } = req.query;

      const result =
        await notificationService.getByUser(
          req.user.id,
          {
            page,
            limit,

            read:
              read !== undefined
                ? read === 'true'
                : null,
          }
        );

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Bildirimler getirildi'
      );
    } catch (error) {
      logger.error(
        'Get notifications error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ======================================================
  // UNREAD COUNT
  // ======================================================

  async getUnreadCount(
    req,
    res
  ) {
    try {
      const count =
        await notificationService.getUnreadCount(
          req.user.id
        );

      return successResponse(
        res,
        {
          count,
        },
        'Okunmamış bildirim sayısı'
      );
    } catch (error) {
      logger.error(
        'Get unread count error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ======================================================
  // GET ONE
  // Ownership zorunlu
  // ======================================================

  async getOne(
    req,
    res
  ) {
    try {
      const notification =
        await notificationService.getOne(
          req.params.id,
          req.user.id
        );

      return successResponse(
        res,
        notification,
        'Bildirim getirildi'
      );
    } catch (error) {
      logger.error(
        'Get notification error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        404
      );
    }
  },

  // ======================================================
  // MARK AS READ
  // Ownership zorunlu
  // ======================================================

  async markAsRead(
    req,
    res
  ) {
    try {
      const notification =
        await notificationService.markAsRead(
          req.params.id,
          req.user.id
        );

      return successResponse(
        res,
        notification,
        'Bildirim okundu olarak işaretlendi'
      );
    } catch (error) {
      logger.error(
        'Mark as read error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        404
      );
    }
  },

  // ======================================================
  // MARK ALL AS READ
  // ======================================================

  async markAllAsRead(
    req,
    res
  ) {
    try {
      await notificationService.markAllAsRead(
        req.user.id
      );

      return successResponse(
        res,
        null,
        'Tüm bildirimler okundu olarak işaretlendi'
      );
    } catch (error) {
      logger.error(
        'Mark all as read error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ======================================================
  // DELETE ONE
  // Ownership zorunlu
  // ======================================================

  async remove(
    req,
    res
  ) {
    try {
      await notificationService.remove(
        req.params.id,
        req.user.id
      );

      return successResponse(
        res,
        null,
        'Bildirim silindi'
      );
    } catch (error) {
      logger.error(
        'Delete notification error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        404
      );
    }
  },

  // ======================================================
  // DELETE ALL
  // ======================================================

  async removeAll(
    req,
    res
  ) {
    try {
      await notificationService.removeAll(
        req.user.id
      );

      return successResponse(
        res,
        null,
        'Tüm bildirimler silindi'
      );
    } catch (error) {
      logger.error(
        'Delete all notifications error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },
};

export default notificationController;
