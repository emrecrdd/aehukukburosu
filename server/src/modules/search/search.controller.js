import { searchService } from './search.service.js';

import {
  successResponse,
  errorResponse,
} from '../../utils/response.js';

import {
  logger,
} from '../../config/logger.js';

const normalizeLimit = (
  value,
  fallback = 20
) =>
  Math.min(
    Math.max(
      Number.parseInt(
        value,
        10
      ) || fallback,
      1
    ),
    50
  );

const validateQuery = (query) =>
  typeof query === 'string' &&
  query.trim().length >= 2;

export const searchController = {
  async search(req, res) {
    try {
      const {
        q,
        type,
        limit = 20,
      } = req.query;

      if (!validateQuery(q)) {
        return errorResponse(
          res,
          'Search query must be at least 2 characters',
          400
        );
      }

      const results =
        await searchService.search(
          q,
          type,
          normalizeLimit(limit),
          req.user
        );

      return successResponse(
        res,
        results,
        'Search completed successfully'
      );
    } catch (error) {
      logger.error(
        'Search error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async searchClients(req, res) {
    try {
      const { q, limit = 20 } = req.query;
      if (!validateQuery(q)) {
        return errorResponse(res, 'Search query must be at least 2 characters', 400);
      }
      const results = await searchService.searchClients(q, normalizeLimit(limit), req.user);
      return successResponse(res, results, 'Client search completed');
    } catch (error) {
      logger.error('Search clients error:', error);
      return errorResponse(res, error.message, 400);
    }
  },

  async searchCases(req, res) {
    try {
      const { q, limit = 20 } = req.query;
      if (!validateQuery(q)) {
        return errorResponse(res, 'Search query must be at least 2 characters', 400);
      }
      const results = await searchService.searchCases(q, normalizeLimit(limit), req.user);
      return successResponse(res, results, 'Case search completed');
    } catch (error) {
      logger.error('Search cases error:', error);
      return errorResponse(res, error.message, 400);
    }
  },

  async searchDocuments(req, res) {
    try {
      const { q, limit = 20 } = req.query;
      if (!validateQuery(q)) {
        return errorResponse(res, 'Search query must be at least 2 characters', 400);
      }
      const results = await searchService.searchDocuments(q, normalizeLimit(limit), req.user);
      return successResponse(res, results, 'Document search completed');
    } catch (error) {
      logger.error('Search documents error:', error);
      return errorResponse(res, error.message, 400);
    }
  },

  async searchTasks(req, res) {
    try {
      const { q, limit = 20 } = req.query;
      if (!validateQuery(q)) {
        return errorResponse(res, 'Search query must be at least 2 characters', 400);
      }
      const results = await searchService.searchTasks(q, normalizeLimit(limit), req.user);
      return successResponse(res, results, 'Task search completed');
    } catch (error) {
      logger.error('Search tasks error:', error);
      return errorResponse(res, error.message, 400);
    }
  },

  async searchConsultations(req, res) {
    try {
      const { q, limit = 20 } = req.query;
      if (!validateQuery(q)) {
        return errorResponse(res, 'Search query must be at least 2 characters', 400);
      }
      const results = await searchService.searchConsultations(q, normalizeLimit(limit), req.user);
      return successResponse(res, results, 'Consultation search completed');
    } catch (error) {
      logger.error('Search consultations error:', error);
      return errorResponse(res, error.message, 400);
    }
  },

  async searchAll(req, res) {
    try {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const { q, limit = 10 } = req.query;
      if (!validateQuery(q)) {
        return errorResponse(res, 'Search query must be at least 2 characters', 400);
      }

      const results = await searchService.searchAll(q, normalizeLimit(limit, 10), req.user);
      return successResponse(res, results, 'Global search completed');
    } catch (error) {
      logger.error('Global search error:', error);
      return errorResponse(res, error.message, 400);
    }
  },

  async getSearchSuggestions(req, res) {
    try {
      const { q } = req.query;
      if (!validateQuery(q)) {
        return successResponse(res, [], 'Suggestions fetched');
      }
      const suggestions = await searchService.getSuggestions(q, req.user);
      return successResponse(res, suggestions, 'Suggestions fetched');
    } catch (error) {
      logger.error('Get suggestions error:', error);
      return errorResponse(res, error.message, 400);
    }
  },
};

export default searchController;
