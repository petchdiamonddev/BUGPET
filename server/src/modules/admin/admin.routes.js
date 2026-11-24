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

// ล็อคความปลอดภัยทั้ง router ให้เฉพาะ Role ADMIN เท่านั้น
router.use(authenticate, authorize(['ADMIN']));

// Overview & Statistics
router.get('/stats', (req, res) => adminController.getDashboardStats(req, res));

// User Management
const userQuerySchema = {
  query: z.object({
    search: optionalText(120, 'คำค้น'),
    role: optionalEnum(['ADMIN', 'USER'], 'สิทธิ์ผู้ใช้'),
    page: optionalInt(1, 100000, 1, 'หน้า'),
    limit: optionalInt(1, 100, 50, 'จำนวนต่อหน้า'),
  }),
};

router.get('/users', validate(userQuerySchema), (req, res) =>
  adminController.getAllUsers(req, res)
);
router.patch(
  '/users/:id',
  validate({
    params: z.object({ id: z.coerce.number().int().positive('ผู้ใช้ไม่ถูกต้อง') }),
    body: z.object({
      role: z.enum(['ADMIN', 'USER']).optional(),
      isBanned: z.boolean().optional(),
    }),
  }),
  (req, res) => adminController.updateUser(req, res)
);

// Lab Management (รวมแล็บ Inactive และเปิดเผย Flag สำหรับ Admin)
router.get('/labs', validate(adminListLabsQuerySchema), (req, res) =>
  adminController.listLabs(req, res)
);
router.get('/labs/:id', validate(labIdParamSchema), (req, res) =>
  adminController.getLab(req, res)
);
router.get('/labs/:id/solvers', validate(labIdParamSchema), (req, res) =>
  adminController.getLabSolvers(req, res)
);
router.post('/labs', validate(createLabSchema), (req, res) =>
  labsController.createLab(req, res)
);
router.put('/labs/:id', validate(updateLabSchema), (req, res) =>
  labsController.updateLab(req, res)
);
router.patch('/labs/:id/toggle', validate(labIdParamSchema), (req, res) =>
  labsController.toggleLabActive(req, res)
);
router.post('/labs/:id/reset', validate(labIdParamSchema), (req, res) =>
  adminController.resetLab(req, res)
);
router.delete('/labs/:id', validate(labIdParamSchema), (req, res) =>
  labsController.deleteLab(req, res)
);

export default router;
