import { Router } from 'express';
import labsController from './labs.controller.js';
import { authenticate, optionalAuthenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createLabSchema, updateLabSchema } from './labs.validation.js';

const router = Router();

router.get('/', optionalAuthenticate, labsController.getAllLabs);
router.get('/:id', optionalAuthenticate, labsController.getLabById);

router.post('/', authenticate, authorize(['ADMIN']), validate(createLabSchema), labsController.createLab);
router.put('/:id', authenticate, authorize(['ADMIN']), validate(updateLabSchema), labsController.updateLab);
router.delete('/:id', authenticate, authorize(['ADMIN']), labsController.deleteLab);

export default router;
