import { Router } from 'express';
import instancesController from './instances.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { instanceIdSchema, startLabSchema } from './instances.validation.js';
import { instanceActionLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/active', instancesController.getActiveInstance);
router.get('/history', instancesController.getHistory);
router.post('/start/:labId', instanceActionLimiter, validate(startLabSchema), instancesController.startLab);
router.post('/:id/stop', instanceActionLimiter, validate(instanceIdSchema), instancesController.stopInstance);
router.get('/:id/status', validate(instanceIdSchema), instancesController.getInstanceStatus);

export default router;
