# Pocket Notes — PETBUG demo lab

ภาพขนาดเล็กที่สุดที่ใช้ทดสอบ pipeline ของ PETBUG (BullMQ → Docker → Traefik → subdomain)
โดยไม่ต้องดึง image ขนาดใหญ่

ช่องโหว่ที่จงใจใส่ไว้:

1. **Broken Access Control** — `GET /api/notes?debug=1` คืนค่า flag ให้ทุกคน
2. **Stored XSS** — ฟอร์มโพสต์โน้ตไม่ escape HTML

flag ถูกส่งเข้า container ผ่าน env `FLAG` ตามที่ blueprint กำหนด (`Env: ['FLAG=...']`)

## Build

```bash
docker build -t petbug/lab-pocket-notes:latest ./pocket-notes
```
