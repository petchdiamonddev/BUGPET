import { instancesService } from './instances.service.js';

class InstancesController {
  async startLab(req, res, next) {
    try {
      const labId = parseInt(req.params.labId || req.body.labId, 10);
      const userId = req.user.id;

      const instance = await instancesService.startLabInstance(userId, labId);
      res.status(201).json({
        success: true,
        message: 'กำลังเริ่มระบบ Lab ของคุณ...',
        data: instance,
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
          activeInstanceId: error.activeInstanceId,
        });
      }
      next(error);
    }
  }

  async stopInstance(req, res, next) {
    try {
      const instanceId = req.params.id;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'ADMIN';

      const result = await instancesService.stopLabInstance(userId, instanceId, isAdmin);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async getActiveInstance(req, res, next) {
    try {
      const userId = req.user.id;
      const active = await instancesService.getActiveInstance(userId);
      res.status(200).json({
        success: true,
        data: active,
      });
    } catch (error) {
      next(error);
    }
  }

  async getInstanceStatus(req, res, next) {
    try {
      const instanceId = req.params.id;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'ADMIN';

      const status = await instancesService.getInstanceStatus(instanceId, userId, isAdmin);
      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }
}

export default new InstancesController();
