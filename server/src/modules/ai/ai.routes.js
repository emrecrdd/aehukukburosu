import express from 'express';

import {
  rateLimit,
  ipKeyGenerator,
} from 'express-rate-limit';

import {
  aiController,
} from './ai.controller.js';

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
// RATE LIMIT HELPERS
// ======================================================

const createRateLimitKey = (
  req
) => {
  if (
    req.user?.id
  ) {
    return `user:${req.user.id}`;
  }

  return `ip:${ipKeyGenerator(
    req.ip
  )}`;
};

// ======================================================
// GENERAL AI RATE LIMIT
// ======================================================

const aiRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit:
      30,

    standardHeaders:
      'draft-8',

    legacyHeaders:
      false,

    keyGenerator:
      createRateLimitKey,

    message: {
      success:
        false,

      message:
        'Çok fazla yapay zekâ isteği gönderildi. Lütfen daha sonra tekrar deneyin.',

      code:
        'AI_RATE_LIMIT_EXCEEDED',
    },
  });

// ======================================================
// EXPENSIVE AI RATE LIMIT
// ======================================================

const expensiveAiRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit:
      10,

    standardHeaders:
      'draft-8',

    legacyHeaders:
      false,

    keyGenerator:
      createRateLimitKey,

    message: {
      success:
        false,

      message:
        'Belge ve dava analiz limiti aşıldı. Lütfen daha sonra tekrar deneyin.',

      code:
        'AI_EXPENSIVE_RATE_LIMIT_EXCEEDED',
    },
  });

// ======================================================
// AUTH + PERMISSION
//
// Önce authenticate:
// rate-limit anahtarı user.id üzerinden üretilebilsin.
//
// Sonra USE_AI:
// kullanıcı bazlı override sistemi burada devreye girer.
// ======================================================

router.use(
  authenticate
);

router.use(
  authorizePermission(
    PERMISSION_KEYS.USE_AI
  )
);

router.use(
  aiRateLimiter
);

// ======================================================
// DOCUMENT AI
// ======================================================

// Belge analizi
router.post(
  '/documents/:documentId/analyze',

  expensiveAiRateLimiter,

  aiController.analyzeDocument
);

// Belge sınıflandırma
router.post(
  '/documents/:documentId/classify',

  expensiveAiRateLimiter,

  aiController.classifyDocument
);

// Belge AI geçmişi
router.get(
  '/documents/:documentId/analyses',

  aiController.getDocumentAnalyses
);

// ======================================================
// CASE AI
// ======================================================

// Dava özeti
router.post(
  '/cases/:caseId/summary',

  expensiveAiRateLimiter,

  aiController.summarizeCase
);

// Dava tamamlama analizi
router.post(
  '/cases/:caseId/completion',

  expensiveAiRateLimiter,

  aiController.analyzeCaseCompletion
);

// Dosyaya Sor
router.post(
  '/cases/:caseId/ask',

  expensiveAiRateLimiter,

  aiController.askCaseQuestion
);

// Duruşmaya Hazırla
router.post(
  '/cases/:caseId/hearing-preparation',

  expensiveAiRateLimiter,

  aiController.prepareForHearing
);
// ======================================================
// LEGAL RESEARCH
// ======================================================

router.post(
  '/legal-research',

  aiController.generateLegalResearch
);

// ======================================================
// ENTITY EXTRACTION
// ======================================================

router.post(
  '/entities',

  aiController.extractEntities
);

// ======================================================
// DRAFT GENERATION
// ======================================================

router.post(
  '/drafts',

  aiController.generateDraft
);

// ======================================================
// AI HISTORY
// ======================================================

router.get(
  '/analyses/:analysisId',

  aiController.getAnalysisById
);

export {
  router as aiRoutes,
};

export default router;