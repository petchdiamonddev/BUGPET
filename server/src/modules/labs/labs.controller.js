import { labsService } from './labs.service.js';

class LabsController {
  async getAllLabs(req, res) {
    const result = await labsService.getAllLabs(req.user, req.validQuery ?? {});
    res.status(200).json({ success: true, data: result.labs, meta: { tags: result.tags, counts: result.counts } });
  }

  async getLabById(req, res) {
    const lab = await labsService.getLabById(req.params.id, req.user);
    const related = await labsService.getRelatedLabs(lab.id, lab.difficulty);
    res.status(200).json({ success: true, data: lab, meta: { related } });
  }

  // Admin
  async adminListLabs(req, res) {
    const labs = await labsService.adminListLabs(req.validQuery ?? {});
    res.status(200).json({ success: true, data: labs });
  }

  async adminGetLab(req, res) {
    const lab = await labsService.adminGetLab(req.params.id);
    res.status(200).json({ success: true, data: lab });
  }

  async createLab(req, res) {
    const lab = await labsService.createLab(req.body);
    res.status(201).json({ success: true, message: 'สร้างด่านใหม่เรียบร้อยแล้ว', data: lab });
  }

  async updateLab(req, res) {
    const lab = await labsService.updateLab(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'บันทึกการแก้ไขแล้ว', data: lab });
  }

  async toggleLabActive(req, res) {
    const lab = await labsService.toggleLabActive(req.params.id);
    res.status(200).json({
      success: true,
      message: lab.isActive ? 'เปิดใช้งานด่านแล้ว' : 'ปิดใช้งานด่านแล้ว',
      data: lab,
    });
  }

  async resetLabSolves(req, res) {
    const result = await labsService.resetLabSolves(req.params.id);
    res.status(200).json({ success: true, message: result.message, data: result });
  }

  async deleteLab(req, res) {
    const result = await labsService.deleteLab(req.params.id);
    res.status(200).json({ success: true, message: result.message, data: result });
  }
}

export default new LabsController();
