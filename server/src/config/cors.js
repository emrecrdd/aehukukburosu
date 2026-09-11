import cors from 'cors';
import { config } from './env.js';

export const corsOptions = {
  origin: config.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-Id',
    'X-CSRF-Token',
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Pagination-Page',
    'X-Pagination-Limit',
    'X-Pagination-Total',
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

export const corsMiddleware = cors(corsOptions);

export default corsMiddleware;