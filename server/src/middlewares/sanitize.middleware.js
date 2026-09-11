import { body, validationResult } from 'express-validator';
import xss from 'xss';

// XSS sanitization middleware
export const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
      if (typeof req.body[key] === 'object' && req.body[key] !== null) {
        Object.keys(req.body[key]).forEach((subKey) => {
          if (typeof req.body[key][subKey] === 'string') {
            req.body[key][subKey] = xss(req.body[key][subKey]);
          }
        });
      }
    });
  }
  next();
};

// SQL Injection protection (basic)
export const sanitizeQuery = (req, res, next) => {
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === 'string') {
        // Remove potential SQL injection patterns
        req.query[key] = req.query[key]
          .replace(/['";]/g, '')
          .replace(/--/g, '')
          .replace(/\/\*/g, '')
          .replace(/\*\//g, '');
      }
    });
  }
  next();
};

// Validation sanitizers
export const sanitizeValidators = {
  trim: (field) => body(field).trim().escape(),
  escape: (field) => body(field).escape(),
  normalizeEmail: (field) => body(field).normalizeEmail(),
  toDate: (field) => body(field).toDate(),
  toInt: (field) => body(field).toInt(),
  toFloat: (field) => body(field).toFloat(),
  blacklist: (field, chars) => body(field).blacklist(chars),
  whitelist: (field, chars) => body(field).whitelist(chars),
};