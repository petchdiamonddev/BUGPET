import { Router } from 'express';
import solvesController from './solves.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { submitFlagSchema } from '../labs/labs.validation.js';
import { submitFlagLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/labs/:labId/submit', submitFlagLimiter, validate(submitFlagSchema), solvesController.submitFlag);
router.get('/my', solvesController.getMySolves);

export default router;
