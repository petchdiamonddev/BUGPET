import { instancesService } from './instances.service.js';

class InstancesController {
  async startLab(req, res) {
    const { instance, reused } = await instancesService.startLabInstance(req.user.id, req.params.labId);

    res.status(reused ? 200 : 201).json({
      success: true,
      message: reused ? 'ด่านนี้กำลังทำงานอยู่แล้ว' : 'กำลังเตรียม container ให้คุณ…',
      data: instance,
      meta: { reused },
    });
  }

  async stopInstance(req, res) {
    const isAdmin = req.user.role === 'ADMIN';
    const result = await instancesService.stopLabInstance(req.user.id, req.params.id, isAdmin);
    res.status(200).json({ success: true, message: result.message, data: result.instance });
  }

  async getActiveInstance(req, res) {
    const active = await instancesService.getActiveInstance(req.user.id);
    res.status(200).json({ success: true, data: active });
  }

  async getInstanceStatus(req, res) {
    const status = await instancesService.getInstanceStatus(
      req.params.id,
      req.user.id,
      req.user.role === 'ADMIN'
    );
    res.status(200).json({ success: true, data: status });
  }

  async getHistory(req, res) {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit ?? '10', 10) || 10, 1), 50);
    const page = Math.max(Number.parseInt(req.query.page ?? '1', 10) || 1, 1);
    const history = await instancesService.getInstanceHistory(req.user.id, { limit, page });
    res.status(200).json({ success: true, data: history.items, meta: history });
  }
}

export default new InstancesController();
