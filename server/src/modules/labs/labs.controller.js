import { labsService } from './labs.service.js';

class LabsController {
  async getAllLabs(req, res) {
    const data = await labsService.getAllLabs(req.user, req.validQuery);
    res.status(200).json({ success: true, data });
  }

  async getLabById(req, res) {
    const data = await labsService.getLabById(req.params.id, req.user);
    res.status(200).json({ success: true, data });
  }

  async createLab(req, res) {
    const data = await labsService.createLab(req.body);
    res.status(201).json({ success: true, message: 'สร้างโจทย์แล็บสำเร็จ', data });
  }

  async updateLab(req, res) {
    const data = await labsService.updateLab(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'แก้ไขโจทย์แล็บสำเร็จ', data });
  }

  async toggleLabActive(req, res) {
    const data = await labsService.toggleLabActive(req.params.id);
    res.status(200).json({ success: true, message: 'ปรับสถานะโจทย์แล็บสำเร็จ', data });
  }

  async resetLabSolves(req, res) {
    const data = await labsService.resetLabSolves(req.params.id);
    res.status(200).json({ success: true, message: data.message, data });
  }

  async deleteLab(req, res) {
    const data = await labsService.deleteLab(req.params.id);
    res.status(200).json({ success: true, message: data.message });
  }
}

export default new LabsController();
