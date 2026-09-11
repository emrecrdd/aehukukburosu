import express from 'express';

import {
  meetingController,
} from './meeting.controller.js';

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
// SPECIAL ROUTES
//
// Bunlar /:id route'undan önce olmalı.
// ======================================================

// Kullanıcının toplantıları
router.get(
  '/my',

  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),

  meetingController.getMyMeetings
);

// Yaklaşan toplantılar
router.get(
  '/upcoming',

  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),

  meetingController.getUpcoming
);

// Dava bazlı toplantılar
//
// Case record-level erişimi service içinde
// ayrıca doğrulanır.
router.get(
  '/case/:caseId',

  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),

  meetingController.getByCase
);

// ======================================================
// CLIENT ROUTES
//
// Client record-level erişimi service içinde
// ayrıca doğrulanır.
// ======================================================

// Client cockpit timeline
router.get(
  '/client/:clientId/timeline',

  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),

  meetingController.getClientTimeline
);

// Müvekkilin tüm toplantıları
router.get(
  '/client/:clientId',

  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),

  meetingController.getByClient
);

// ======================================================
// CRUD
// ======================================================

// Toplantı oluştur
//
// created_by service tarafından giriş yapan
// kullanıcıdan zorlanır.
//
// case_id / client_id verilmişse relation erişimleri
// service tarafından ayrıca doğrulanır.
router.post(
  '/',

  authorizePermission(
    PERMISSION_KEYS.CREATE_MEETINGS
  ),

  meetingController.create
);

// Liste
//
// VIEW_MEETINGS feature iznidir.
// Hangi Meeting kayıtlarının döneceği service BOLA
// scope'u tarafından belirlenir.
router.get(
  '/',

  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),

  meetingController.findAll
);

// ======================================================
// CALENDAR / ICS
//
// Toplantıyı telefon / harici takvime eklemek için
// .ics dosyası üretir.
//
// Genel /:id route'undan önce olmalı.
// Record-level Meeting erişimi service tarafından
// ayrıca doğrulanır.
// ======================================================

router.get(
  '/:id/calendar',

  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),

  meetingController.downloadCalendar
);

// ======================================================
// SINGLE MEETING
// ======================================================

// Detay
router.get(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),

  meetingController.findOne
);

// Güncelle
//
// created_by ve status gibi server-controlled
// alanlar service tarafından normal update işleminden
// korunur.
router.put(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.EDIT_MEETINGS
  ),

  meetingController.update
);

// Durum değiştir
//
// Status değişimi ayrı endpoint üzerinden yürür.
router.patch(
  '/:id/status',

  authorizePermission(
    PERMISSION_KEYS.EDIT_MEETINGS
  ),

  meetingController.updateStatus
);

// Sil
router.delete(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.DELETE_MEETINGS
  ),

  meetingController.remove
);

export {
  router as meetingRoutes,
};