import { labsService } from './labs.service.js';

class LabsController {
  async getAllLabs(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const { difficulty, search } = req.query;
      const labs = await labsService.getAllLabs(userId, { difficulty, search });
      res.status(200).json({
        success: true,
        data: labs,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLabById(req, res, next) {
    try {
      const labId = parseInt(req.params.id, 10);
      const userId = req.user?.id || null;
      const isAdmin = req.user?.role === 'ADMIN';

      const lab = await labsService.getLabById(labId, userId, isAdmin);
      res.status(200).json({
        success: true,
        data: lab,
      });
    } catch (error) {
      next(error);
    }
  }

  async createLab(req, res, next) {
    try {
      const lab = await labsService.createLab(req.body);
      res.status(201).json({
        success: true,
        message: 'สร้าง Lab เรียบร้อยแล้ว',
        data: lab,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLab(req, res, next) {
    try {
      const labId = parseInt(req.params.id, 10);
      const lab = await labsService.updateLab(labId, req.body);
      res.status(200).json({
        success: true,
        message: 'อัปเดตข้อมูล Lab สำเร็จ',
        data: lab,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteLab(req, res, next) {
    try {
      const labId = parseInt(req.params.id, 10);
      const result = await labsService.deleteLab(labId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new LabsController();
