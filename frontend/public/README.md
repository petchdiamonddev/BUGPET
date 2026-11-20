# Frontend assets (โฟลเดอร์ `public/`)

ไฟล์ในโฟลเดอร์นี้ถูกเสิร์ฟที่ URL ราก เช่น `public/logo.svg` → `http://.../logo.svg`
และถูก **คัดลอกเข้า image ตอน `docker build`** — แก้แล้วต้อง rebuild `web`:

```bash
docker compose -f docker-compose.local.yml build web
docker compose -f docker-compose.local.yml up -d web
```

## ไฟล์ที่ใช้อยู่

| ไฟล์ | ใช้ที่ไหน | วิธีเปลี่ยน |
|------|-----------|-------------|
| `logo.svg` | โลโก้ใน header, footer, หน้าล็อกอิน/สมัคร | วางไฟล์ทับชื่อ `logo.svg` ได้เลย ไม่ต้องแก้โค้ด |
| `favicon.svg` | ไอคอนบนแท็บเบราว์เซอร์ | วางไฟล์ทับชื่อ `favicon.svg` |

## ข้อกำหนดของ `logo.svg`

- ใช้ **SVG** เป็นหลัก (คมทุกขนาด) — ถ้าจำเป็นใช้ PNG ก็ได้ แต่ต้องเปลี่ยนชื่ออ้างอิงใน `src/components/ui/Logo.jsx` จาก `/logo.svg`
- ควรเป็นไฟล์ **สี่เหลี่ยมจัตุรัส** (viewBox เช่น `0 0 64 64`) เพราะถูกแสดงที่ขนาด 36×36 (header), 32×32 (footer)
- พื้นหลังโปร่งใสได้ — header พื้นขาว โลโก้สีเข้มจะอ่านชัดที่สุด
- ถ้าไฟล์หาย/โหลดไม่ขึ้น ระบบจะแสดงชื่อ **BUGPET** แทน (ไม่ขึ้นรูปแตก)

## เปลี่ยนชื่อแบรนด์

ชื่อที่แสดงทุกจุด (header, footer, page title, ตัวอย่างรูปแบบ flag) มาจากที่เดียว:
`src/config/brand.js` → แก้ `name` / `tagline` / `flagFormat` แล้ว rebuild

> รูปแบบ flag ฝั่ง API ใช้ `FLAG_FORMAT` ใน `server/.env` (ค่าเริ่มต้น `BUGPET`)
> และยอมรับรูปแบบเก่า `PETBUG{...}` ด้วยเพื่อไม่ให้ flag ที่มีอยู่เดิมใช้ไม่ได้
