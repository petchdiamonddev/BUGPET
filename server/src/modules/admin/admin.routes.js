import { Router } from 'express';
import { z } from 'zod';
import adminController from './admin.controller.js';
import labsController from '../labs/labs.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { optionalEnum, optionalInt, optionalText } from '../../utils/query.js';
import {
  createLabSchema,
  updateLabSchema,
  labIdParamSchema,
  adminListLabsQuerySchema,
} from '../labs/labs.validation.js';

const router = Router();

router.use(authenticate, authorize(['ADMIN']));

// Overview
router.get('/stats', adminController.getDashboardStats);
router.get('/instances', adminController.getActiveInstances);
router.get('/docker/containers', adminController.getDockerContainers);
router.post('/instances/:id/terminate', adminController.terminateInstance);

// Users
const userQuerySchema = {
  query: z.object({
    search: optionalText(120, 'คำค้น'),
    role: optionalEnum(['ADMIN', 'USER'], 'สิทธิ์ผู้ใช้'),
    page: optionalInt(1, 100000, 1, 'หน้า'),
    limit: optionalInt(1, 100, 50, 'จำนวนต่อหน้า'),
  }),
};
router.get('/users', validate(userQuerySchema), adminController.getAllUsers);
router.patch(
  '/users/:id',
  validate({
    params: z.object({ id: z.coerce.number().int().positive('ผู้ใช้ไม่ถูกต้อง') }),
    body: z.object({
      role: z.enum(['ADMIN', 'USER']).optional(),
      isBanned: z.boolean().optional(),
    }),
  }),
  adminController.updateUser
);

// Labs (CRUD through the admin panel; includes inactive labs and flags)
router.get('/labs', validate(adminListLabsQuerySchema), adminController.listLabs);
router.get('/labs/:id', validate(labIdParamSchema), adminController.getLab);
router.get('/labs/:id/solvers', validate(labIdParamSchema), adminController.getLabSolvers);
router.post('/labs', validate(createLabSchema), labsController.createLab);
router.put('/labs/:id', validate(updateLabSchema), labsController.updateLab);
router.patch('/labs/:id/toggle', validate(labIdParamSchema), labsController.toggleLabActive);
router.post('/labs/:id/reset', validate(labIdParamSchema), adminController.resetLab);
router.delete('/labs/:id', validate(labIdParamSchema), labsController.deleteLab);

export default router;
