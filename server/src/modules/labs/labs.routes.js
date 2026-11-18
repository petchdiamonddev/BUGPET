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

// Player-facing catalog (works logged-in or anonymous)
router.get('/', apiLimiter, optionalAuthenticate, validate(listLabsQuerySchema), labsController.getAllLabs);
router.get('/:id', optionalAuthenticate, validate(labIdParamSchema), labsController.getLabById);

// Admin CRUD (the admin panel also has /api/admin/labs which includes inactive labs)
router.post('/', authenticate, authorize(['ADMIN']), validate(createLabSchema), labsController.createLab);
router.put('/:id', authenticate, authorize(['ADMIN']), validate(updateLabSchema), labsController.updateLab);
router.patch('/:id/toggle', authenticate, authorize(['ADMIN']), validate(labIdParamSchema), labsController.toggleLabActive);
router.post('/:id/reset', authenticate, authorize(['ADMIN']), validate(labIdParamSchema), labsController.resetLabSolves);
router.delete('/:id', authenticate, authorize(['ADMIN']), validate(labIdParamSchema), labsController.deleteLab);

export default router;
