import { Router } from 'express';
import solvesController from './solves.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { submitFlagSchema } from '../labs/labs.validation.js';

const router = Router();

router.use(authenticate);

router.post('/labs/:labId/submit', solvesController.submitFlag);
router.get('/my', solvesController.getMySolves);

export default router;
