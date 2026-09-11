import express from 'express';

import {
  eventController,
} from './event.controller.js';

import {
  authenticate,
  authorizePermission,
} from '../../middlewares/auth.middleware.js';

import {
  PERMISSION_KEYS,
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
// CALENDAR
//
// Özel route'lar /:id'den önce olmalı.
// ======================================================

router.get(
  '/calendar',

  authorizePermission(
    PERMISSION_KEYS.VIEW_CALENDAR
  ),

  eventController.getCalendarEvents
);

// ======================================================
// MY EVENTS
// ======================================================

router.get(
  '/my',

  authorizePermission(
    PERMISSION_KEYS.VIEW_EVENTS
  ),

  eventController.getMyEvents
);

// ======================================================
// CASE EVENTS
//
// Record-level Case/Event erişimi service içinde
// ayrıca kontrol edilir.
// ======================================================

router.get(
  '/case/:caseId',

  authorizePermission(
    PERMISSION_KEYS.VIEW_EVENTS
  ),

  eventController.getByCase
);

// ======================================================
// CREATE
//
// CREATE_EVENTS feature/action iznidir.
//
// created_by controller/service tarafından giriş yapan
// kullanıcıdan zorlanır.
//
// case_id verilmişse Case record-level erişimi
// service tarafından ayrıca doğrulanır.
// ======================================================

router.post(
  '/',

  authorizePermission(
    PERMISSION_KEYS.CREATE_EVENTS
  ),

  eventController.create
);

// ======================================================
// LIST
//
// VIEW_EVENTS feature iznidir.
//
// Kullanıcının hangi Event kayıtlarını görebileceği
// service BOLA scope'u tarafından belirlenir.
// ======================================================

router.get(
  '/',

  authorizePermission(
    PERMISSION_KEYS.VIEW_EVENTS
  ),

  eventController.findAll
);

// ======================================================
// STATUS
//
// EDIT_EVENTS action iznidir.
//
// Record-level Event erişimi service tarafından ayrıca
// doğrulanır.
// ======================================================

router.patch(
  '/:id/status',

  authorizePermission(
    PERMISSION_KEYS.EDIT_EVENTS
  ),

  eventController.updateStatus
);

// ======================================================
// CALENDAR / ICS DOWNLOAD
//
// Duruşma / etkinliği telefon veya harici takvime
// eklemek için .ics dosyası üretir.
//
// Record-level Event erişimi controller -> service
// üzerinden tekrar doğrulanır.
//
// Genel /:id route'undan önce olmalı.
// ======================================================

router.get(
  '/:id/calendar',

  authorizePermission(
    PERMISSION_KEYS.VIEW_EVENTS
  ),

  eventController.downloadCalendar
);

// ======================================================
// DETAIL
// ======================================================

router.get(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.VIEW_EVENTS
  ),

  eventController.findOne
);

// ======================================================
// UPDATE
//
// EDIT_EVENTS feature/action iznidir.
//
// created_by/status gibi server-controlled alanlar
// service tarafından normal update işleminden korunur.
//
// Record-level Event erişimi service tarafından
// ayrıca doğrulanır.
// ======================================================

router.patch(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.EDIT_EVENTS
  ),

  eventController.update
);

// ======================================================
// DELETE
//
// DELETE_EVENTS feature/action iznidir.
//
// Record-level Event erişimi service tarafından
// ayrıca doğrulanır.
// ======================================================

router.delete(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.DELETE_EVENTS
  ),

  eventController.remove
);

export {
  router as eventRoutes,
};