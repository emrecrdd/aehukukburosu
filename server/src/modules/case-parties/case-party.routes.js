import express from 'express';

import {
  casePartyController,
} from './case-party.controller.js';

import {
  authenticate,
  authorize,
} from '../../middlewares/auth.middleware.js';

import {
  validate,
} from '../../middlewares/validate.middleware.js';

import {
  createCasePartyValidation,
  updateCasePartyValidation,
} from './case-party.validation.js';

import {
  ROLES,
} from '../../constants/roles.js';

const router =
  express.Router();

// ======================================================
// AUTH
// ======================================================

router.use(
  authenticate
);

// ======================================================
// CREATE
// ======================================================

router.post(
  '/case/:caseId',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),

  validate(
    createCasePartyValidation
  ),

  casePartyController.create
);

// ======================================================
// CASE PARTIES
// ======================================================

router.get(
  '/case/:caseId',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),

  casePartyController.getByCase
);

// ======================================================
// LIST
// ======================================================

router.get(
  '/',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),

  casePartyController.findAll
);

// ======================================================
// DETAIL
// ======================================================

router.get(
  '/:id',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),

  casePartyController.findOne
);

// ======================================================
// UPDATE
// ======================================================

router.patch(
  '/:id',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),

  validate(
    updateCasePartyValidation
  ),

  casePartyController.update
);

// ======================================================
// DELETE
// ======================================================

router.delete(
  '/:id',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER
  ),

  casePartyController.remove
);

export {
  router as casePartyRoutes,
};