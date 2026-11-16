import { Router } from 'express';
import instancesController from './instances.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/start/:labId', instancesController.startLab);
router.post('/:id/stop', instancesController.stopInstance);
router.get('/active', instancesController.getActiveInstance);
router.get('/:id/status', instancesController.getInstanceStatus);

export default router;
