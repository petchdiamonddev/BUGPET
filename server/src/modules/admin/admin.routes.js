import { Router } from 'express';
import adminController from './admin.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = Router();

router.use(authenticate, authorize(['ADMIN']));

router.get('/stats', adminController.getDashboardStats);
router.get('/instances', adminController.getActiveInstances);
router.post('/instances/:id/terminate', adminController.terminateInstance);
router.get('/users', adminController.getAllUsers);

export default router;
