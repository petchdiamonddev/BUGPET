# 🚀 Deploy PETBUG ด้วย Docker (production)

เอกสารนี้คือขั้นตอน deploy จริงบน VPS/Cloud ที่มี Docker จบในชุดเดียว
(Postgres + Redis + Traefik + API + Frontend) — **ไม่ต้องติดตั้ง Node.js บนเครื่องเลย**

---

## 0) สิ่งที่ต้องมีก่อนبدأ

| ต้องมี | รายละเอียด |
|---|---|
| VPS | Linux, RAM ≥ 2 GB (แนะนำ 4 GB ถ้าจะรันด่านหลายคนพร้อมกัน), Docker Engine 24+ |
| โดเมน | ควบคุม DNSได้ เช่น `example.com` |
| DNS records | `A petbug.example.com → <IP>` และ `A *.lab.example.com → <IP>` |
| ไฟร์วอลล์ | เปิด **80** และ **443** (80 จำเป็นสำหรับ ACME HTTP-01) |
| Docker socket | API mount `/var/run/docker.sock` เพื่อสร้าง/หยุดคอนเทนเนอร์ของด่าน |

> ⚠️ การให้ API เข้าถึง Docker socket = ให้สิทธิ์ระดับ root บนเครื่องนั้น
> ควร deploy บน VPS ที่อุทิศให้ระบบนี้เท่านั้น (หน้า hardening ด้านล่าง)

---

## 1) เตรียมโปรเจกต์

```bash
git clone <repo> petbug && cd petbug
cp .env.example .env
```

แก้ `.env` (ไฟล์นี้ถูก git-ignore ไว้แล้ว):

```env
APP_HOST=petbug.example.com          # โดเมนหน้าเว็บ + API
LAB_BASE_DOMAIN=lab.example.com      # ด่านจะได้ <token>.lab.example.com
SEED_ON_START=false                  # true เฉพาะครั้งแรกถ้าต้องการข้อมูลเดโม

POSTGRES_PASSWORD=<สุ่มยาว ๆ>
JWT_SECRET=<สุ่มอย่างน้อย 32 ตัวอักษร>
REDIS_PASSWORD=<สุ่มยาว ๆ>

TLS_ENABLED=true
ACME_EMAIL=you@example.com
ACME_CA_SERVER=https://acme-v02.api.letsencrypt.org/directory
```

สร้างรหัสสุ่ม:

```bash
openssl rand -base64 32   # ใช้กับ POSTGRES_PASSWORD / REDIS_PASSWORD / JWT_SECRET
```

---

## 2) สร้าง Docker image ของด่าน (สำคัญ)

คอนเทนเนอร์ของด่านถูกสร้าง **จาก image บน host เดียวกัน** ต้อง build ให้มีอยู่ก่อน:

```bash
docker build -t petbug/lab-pocket-notes:latest ./labs/pocket-notes
```

ด่านอื่นใน seed ใช้ image สาธารณะ (`bkimminich/juice-shop:latest`, `nginx:alpine`)
ซึ่งระบบจะ pull ให้เองตอนกด Start ครั้งแรก (ตั้ง `LAB_ALLOW_PULL=false` ถ้าต้องการปิดการ pull)

---

## 3) ยกทั้งระบบ

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

สิ่งที่เกิดขึ้นอัตโนมัติ:

1. สร้าง image ของ `api` (Node + Prisma) และ `web` (nginx + SPA ที่ build แล้ว)
2. **route-sync** รอ Traefik พร้อม แล้วเขียน `traefik/dynamic/petbug-app.yaml` จาก `APP_HOST`
3. **api** รอ DB → `prisma migrate deploy` → (ถ้า `SEED_ON_START=true`) seed → เริ่ม API
4. Traefik ออกใบรับรอง TLS ให้ `APP_HOST` และ `*.LAB_BASE_DOMAIN` ผ่าน ACME

ตรวจสถานะ:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api route-sync
```

เปิด **https://petbug.example.com** แล้วล็อกอิน

---

## 4) TLS แบบ wildcard ของด่าน (อ่านให้ครบ)

Let's Encrypt ออกใบรับรอง wildcard ได้เฉพาะผ่าน **DNS-01 challenge** เท่านั้น
(HTTP-01 ทำได้เฉพาะชื่อที่ระบุตรง ๆ) compose ตั้งค่าไว้เป็น HTTP-01 สำหรับ `APP_HOST`
ด่านจึงต้องมีใบรับรองของตัวเอง

**สองทางเลือก:**

### ตัวเลือก A (ง่ายสุด) — ใช้ ACME ต่อ host ของด่าน
ตั้ง `TLS_ENABLED=true` แล้ว Traefik จะขอใบรับรองแยกให้ `<token>.lab.example.com` ตาม router ที่ API สร้าง
ข้อจำกัด: Let's Encrypt จำกัด 50 ใบ/โดเมน/สัปดาห์ — ไม่เหมาะถ้ามีคนเปิดด่านบ่อย

### ตัวเลือก B (แนะนำสำหรับใช้งานจริง) — wildcard ผ่าน DNS provider
เพิ่ม DNS-01 ให้ resolver ใน `docker-compose.prod.yml`:

```yaml
      - "--certificatesresolvers.le.acme.dnschallenge=true"
      - "--certificatesresolvers.le.acme.dnschallenge.provider=cloudflare"
      - "--certificatesresolvers.le.acme.dnschallenge.delayBeforeChecks=10s"
    environment:
      - CF_DNS_API_TOKEN=${CF_DNS_API_TOKEN}     # หรือ credential ของ provider ที่ใช้
```

แล้วเปลี่ยน router ของด่านใน `server/src/services/docker.service.js` ให้ชี้ `tls.domains`
ไปที่ wildcard (หรือเพิ่ม label/ไฟล์ static ที่มี `tls.domains.main = LAB_BASE_DOMAIN`) —
รายชื่อ provider ดูที่ [Lego DNS providers](https://go-acme.github.io/lego/dns/)

> ระหว่างทดลอง ให้ใช้ `ACME_CA_SERVER=https://acme-staging-v02.api.letsencrypt.org/directory`
> (ใบรับรองจะไม่ trusted แต่ไม่กินโควตาจริง)

---

## 5) ทดสอบในเครื่องตัวเอง (ไม่ต้องมีโดเมน)

```bash
docker compose -f docker-compose.local.yml up -d --build
```

| อะไร | URL |
|---|---|
| หน้าเว็บ | http://petbug.localhost |
| โดเมนของด่าน | `http://<token>.lab.localhost` (ระบบแสดงให้ตอนกด Start) |
| Traefik dashboard | http://localhost:8080 |

รันชุดทดสอบทั้ง stack (SPA → Traefik → nginx → API → Docker → ด่าน):

```bash
cd server && node tests/docker-smoke.mjs
```

## 6) อัปเดต / ดูแล

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build   # rebuild เฉพาะส่วนที่เปลี่ยน
docker compose -f docker-compose.prod.yml logs -f api
```

สำรองฐานข้อมูล:

```bash
docker exec petbug-db pg_dump -U pet bugpet | gzip > backup-$(date +%F).sql.gz
```

สร้าง admin คนแรก (ถ้าไม่ได้ seed):

```bash
docker exec -it petbug-api node -e "
import('bcrypt').then(async (b) => {
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  await prisma.user.create({ data: { username: 'admin', email: 'admin@example.com', password: await b.default.hash('ChangeMe@2026', 10), role: 'ADMIN' } });
  console.log('admin created'); process.exit(0);
});"
```

---

## 7) Hardening ที่ควรทำต่อ

- [ ] จำกัดสิทธิ์ Docker socket: สร้าง user กลุ่มเฉพาะ หรือใช้ socket proxy (เช่น `tecnativa/docker-socket-proxy`) แทนการ mount ตรง
- [ ] แยก network ของด่านออกจาก `petbug_net` (API ต้องเข้าถึงTraefik และ DB; ด่านไม่ต้อง)
- [ ] egress firewall สำหรับคอนเทนเนอร์ของด่าน (block internet ยกเว้นที่จำเป็น)
- [ ] ตั้ง `RATE_LIMIT_STORE=redis` เมื่อรัน API มากกว่า 1 replica
- [ ] หมุน `JWT_SECRET` / รหัสผ่าน DB ตามรอบ
- [ ] เปิด log shipping (stdout เป็น JSON อยู่แล้ว)

---

## 8) ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| 502 จากหน้าเว็บ | `api` ยังไม่ healthy: `docker logs petbug-api` (รอ migrate/seed) |
| ด่านเปิดไม่ได้ (ขึ้น ERROR) | `docker ps` ดูว่ามี `petbug-lab-*` ไหม; ตรวจว่า image มีอยู่ หรือ Docker socket mount ถูก |
| เข้า `https://...` ไม่ได้ | DNS ยังไม่ชี้มา / port 80-443 ปิด / ACME ยังไม่ผ่าน (`docker logs petbug-traefik`) |
| เพิ่มด่านแล้ว URL 404 | Traefik ยังไม่โหลด route: API จะ reload ให้เอง (TRAEFIK_RELOAD=restart) — ดู log `Reloading Traefik routes` |
| `traefik/dynamic` ไฟล์เสียไฟล์เดียว แล้วทุก route หาย | Traefik จะ reject ทั้ง directory — ตรวจว่าไฟล์ JSON/YAML ทุกไฟล์ถูกต้อง |
