import { Router } from 'express';
import labsController from './labs.controller.js';
import { authenticate, optionalAuthenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createLabSchema,
  updateLabSchema,
  labIdParamSchema,
  listLabsQuerySchema,
} from './labs.validation.js';
import { apiLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

// Public routes (เปิดให้ทุกคนดูรายการและรายละเอียดโจทย์ได้ โดยไม่เปิดเผย Flag)
router.get('/', apiLimiter, optionalAuthenticate, validate(listLabsQuerySchema), (req, res) =>
  labsController.getAllLabs(req, res)
);
router.get('/:id', optionalAuthenticate, validate(labIdParamSchema), (req, res) =>
  labsController.getLabById(req, res)
);

// Admin-only routes (CRUD จัดการโจทย์แล็บ)
router.post('/', authenticate, authorize(['ADMIN']), validate(createLabSchema), (req, res) =>
  labsController.createLab(req, res)
);
router.put('/:id', authenticate, authorize(['ADMIN']), validate(updateLabSchema), (req, res) =>
  labsController.updateLab(req, res)
);
router.patch('/:id/toggle', authenticate, authorize(['ADMIN']), validate(labIdParamSchema), (req, res) =>
  labsController.toggleLabActive(req, res)
);
router.post('/:id/reset', authenticate, authorize(['ADMIN']), validate(labIdParamSchema), (req, res) =>
  labsController.resetLabSolves(req, res)
);
router.delete('/:id', authenticate, authorize(['ADMIN']), validate(labIdParamSchema), (req, res) =>
  labsController.deleteLab(req, res)
);

export default router;
