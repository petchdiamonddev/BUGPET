# 🐛 PETBUG

แพลตฟอร์มฝึกเจาะระบบความปลอดภัยเว็บ (แบบ BugForge) — ทุกคนได้คอนเทนเนอร์แยกเฉพาะตัว
เปิด URL ของด่านในเบราว์เซอร์แล้วเริ่มโจมตีได้ทันที

```
User ──▶ React SPA (Vite)  ──/api──▶  Express API  ──▶  PostgreSQL (Prisma)
                                          │
                                          ├──▶  Redis + BullMQ worker (lab lifecycle)
                                          └──▶  Docker (your lab container + flag)
                                                     │
                                     Traefik  ───────┘  <token>.127.0.0.1.nip.io
```

---

## 🚀 ทางที่เร็วที่สุด: ทั้งระบบใน Docker (ไม่ต้องลง Node)

```bash
docker build -t petbug/lab-pocket-notes:latest ./labs/pocket-notes   # image ของด่าน (ครั้งเดียว)
docker compose -f docker-compose.local.yml up -d --build
```

เปิด **http://petbug.localhost** — ด่านจะได้ `http://<token>.lab.localhost` (ระบบแสดงให้ตอนกด Start)
บัญชีเดโมถูก seed ให้อัตโนมัติในโหมดนี้

> ต้องการ HTTPS + โดเมนจริงบน VPS → ดู **[DEPLOY.md](DEPLOY.md)**

---

## 🧑‍💻 Local dev (hot reload)

### 1) สิ่งที่ต้องมี
- Node.js 20+
- Docker Desktop (เปิดอยู่ — ใช้ทั้ง Postgres/Redis/Traefik และคอนเทนเนอร์ของด่าน)

### 2) ยกサービスพื้นฐาน

```bash
docker compose up -d            # postgres :5432, redis :6379, traefik :80 / dashboard :8080
```

### 3) ติดตั้ง + เตรียมฐานข้อมูล

```bash
cd server
npm install
npx prisma generate
npx prisma db push              # sync schema (dev)
npm run seed                    # demo users, 6 labs, 7 badges
```

### 4) เริ่ม API และ Frontend (สอง terminal)

```bash
cd server   && npm run dev      # http://localhost:3000
cd frontend && npm run dev      # http://localhost:5173
```

เปิด **http://localhost:5173**

### 5) สร้าง Docker image ของด่านเดโม (ครั้งเดียว)

```bash
docker build -t petbug/lab-pocket-notes:latest ./labs/pocket-notes
```

ด่านอื่นใน seed ใช้ image สำเร็จรูปจาก Docker Hub (`bkimminich/juice-shop:latest`, `nginx:alpine`)
ระบบจะ pull ให้อัตโนมัติตอนกด Start ครั้งแรก (ครั้งแรกอาจใช้เวลาหลายนาที)

---

## 👤 บัญชีทดสอบ

| บัญชี | รหัสผ่าน | สิทธิ์ |
|-------|----------|--------|
| `admin` | `Petbug@2026` | ADMIN (เข้าถึงแผงควบคุม) |
| `hunter_x` | `Petbug@2026` | USER |
| `n0va` | `Petbug@2026` | USER |
| `shellfox` | `Petbug@2026` | USER |

---

## ✅ Feature checklist (เทียบกับ Blueprint)

| Phase | รายการ | สถานะ |
|-------|--------|--------|
| 1 | Docker Compose (postgres + redis + traefik) | ✅ |
| 1 | Prisma schema + **SQL migrations** (`migrate deploy` ตอน boot) | ✅ |
| 1 | Express boilerplate (ESM, pino, Zod) | ✅ |
| 1 | Auth: register / login / logout (+ silent refresh cookie) | ✅ |
| 2 | dockerode: pull, create, start, stop, remove | ✅ |
| 2 | Traefik dynamic routing (wildcard subdomain) | ✅ + auto reload |
| 2 | BullMQ worker: start job + delayed auto-stop | ✅ |
| 2 | `LabInstance` API (`/api/instances/*`) | ✅ |
| 2 | Auto-stop เมื่อหมดเวลา (+ sweeper กัน job หาย) | ✅ |
| 2 | Wildcard DNS local dev (`*.127.0.0.1.nip.io`) | ✅ |
| 3 | Auth pages, Lab browser, Lab detail | ✅ |
| 3 | Start Lab → URL + countdown timer | ✅ + dock ลอยทุกหน้า |
| 3 | Stop button / cancel ระหว่าง STARTING | ✅ |
| 3 | Flag submit form | ✅ + reward toast / confetti |
| 4 | Points เมื่อ solve | ✅ (+ โบนัสจากเหรียญ) |
| 4 | Leaderboard (ตลอดกาล / 7 วัน) | ✅ |
| 4 | Badge system (7 เหรียญ, 3 ระดับ) | ✅ |
| 4 | Profile page (badges + solve history + settings) | ✅ |
| 5 | Admin CRUD Labs | ✅ |
| 5 | User management (role / ระงับบัญชี) | ✅ |
| 5 | Instance monitoring (DB + Docker container จริง) | ✅ |
| 6 | Rate limiting (login / register / flag / instance / API — IPv6-safe keys) | ✅ |
| 6 | Container security (cap-drop, no-new-privileges, memory/CPU/pids limit) | ✅ |
| 6 | `.env` management (local vs prod, secrets ไม่ commit) | ✅ |
| 6 | Docker production stack: multi-stage images, non-root, healthchecks, auto-migrate | ✅ |
| 6 | TLS + ACME (Let's Encrypt) สำหรับหน้าเว็บ, redirect HTTP→HTTPS | ✅ |
| 6 | Wildcard cert ของด่าน (`*.LAB_BASE_DOMAIN`) | ⬜ ต้องใช้ DNS-01 ของ provider (ดู DEPLOY.md §4) |

---

## 🐳 Deploy จริงด้วย Docker (จบในชุดเดียว)

ดูขั้นตอนละเอียดใน **[DEPLOY.md](DEPLOY.md)** — สรุปสั้น:

```bash
cp .env.example .env                 # ใส่ APP_HOST, LAB_BASE_DOMAIN, รหัสผ่าน, ACME_EMAIL
docker build -t petbug/lab-pocket-notes:latest ./labs/pocket-notes
docker compose -f docker-compose.prod.yml up -d --build
```

| Compose file | ใช้เมื่อ | เข้าที่ |
|---|---|---|
| `docker-compose.yml` | dev บนเครื่อง (DB + Redis + Traefik) | frontend `:5173`, API `:3000` |
| `docker-compose.local.yml` | ทดสอบทั้ง stack ใน Docker (ไม่มี TLS) | `http://petbug.localhost` |
| `docker-compose.prod.yml` | production บน VPS (TLS + ACME + secrets) | `https://<APP_HOST>` |

ทั้งสองชุดใช้ image เดียวกัน: `server/Dockerfile` (รัน `prisma migrate deploy` ตอน boot)
และ `frontend/Dockerfile` (build SPA → nginx เสิร์ฟ + proxy `/api`)

---

## 🎨 สิ่งที่ปรับในรอบ UI/UX

- **Design system**: กระดาษอุ่น (`paper/ink`) + accent เขียวมะนาว (`acid`) — ไม่ใช้ gradient ม่วง/ฟ้าแบบ template
  ฟอนต์ `Anuphan` (หัวข้อ) + `IBM Plex Sans Thai` (เนื้อหา) + `JetBrains Mono` (ตัวเลข/โค้ด)
- **Lab session dock** ลอยมุมขวาล่างทุกหน้า แสดงเวลาที่เหลือ (เปลี่ยนสีเมื่อใกล้หมด) ปุ่มเปิด/คัดลอก/หยุด — และซ่อนเองเมื่อแก้ด่านสำเร็จ
- **Command palette** `⌘K / Ctrl+K`: ค้นด่าน ผู้เล่น และเมนู
- **Flow หลักของด่าน**: stepper 3 ขั้น (เปิด container → เจาะ → ส่ง flag) คอนโซลเป้าหมาย (terminal) บน lab detail, ปุ่ม Start อยู่บนสุดบนจอเล็ก
- **Reward moment**: confetti + toast แยกเหตุการณ์ (ได้คะแนน / ได้เหรียญ / First Blood)
- **Toast ไม่บัง dock** และใช้ `confirm()` แบบ dialog ของระบบแทน `window.confirm`
- **Mobile**: bottom tab bar, ปุ่ม Start มาก่อน brief, dock ย่อขนาดอัตโนมัติ
- **Accessibility (audit แล้ว)**: filter/tag เป็น toggle ที่กดด้วยคีย์บอร์ดได้และมี `aria-pressed`,
  ปุ่มไอคอนมี `aria-label`, select ในตารางมีชื่อ, focus ring ชัด, ไม่มี horizontal overflow ที่ 320px
- รองรับ `prefers-reduced-motion`, ตัวเลข tabular

---

## 🌐 Traefik — เรื่องที่ต้องรู้ก่อนแก้

- Traefik ใช้ **file provider** อ่าน route จาก `traefik/dynamic/`
- **watcher ของ bind mount ไม่น่าเชื่อถือ** (Docker Desktop และ mount บางแบบ) — API จึงสั่ง reload
  Traefik เองหลังเพิ่ม/ลบ route (`TRAEFIK_RELOAD=restart` ค่าเริ่มต้น, `signal`/`watch` ก็มี)
- **ไฟล์ dynamic ผิดรูปแบบไฟล์เดียว → Traefik reject ทั้ง directory** (ทุก route หาย) — ใช้ `00-app.yml` เป็นต้นแบบ
- API ไม่ได้ใช้ Traefik dynamic API สำหรับ route เพราะ Traefik 3.1 เปิดให้อ่านอย่างเดียว (PUT ได้ 405)
- route ของด่านเขียนเป็น `lab-<token>.yaml`; ตอน boot API ลบไฟล์ที่คอนเทนเนอร์ไม่มีแล้ว
- Traefik ตอบ **404 กับ HTTP/1.0** — ทดสอบด้วย `curl` เสมอ

```bash
curl -H "Host: <subdomain>.lab.localhost" http://127.0.0.1/
```

---

## 🔌 API สรุปย่อ

| Method | Path | สิทธิ์ | หมายเหตุ |
|--------|------|--------|----------|
| POST | `/api/auth/register` · `/login` · `/refresh` · `/logout` | - | refresh token อยู่ใน HttpOnly cookie |
| GET | `/api/auth/me` | user | + `solvesCount`, `badgesCount` |
| PATCH | `/api/auth/me` · POST `/api/auth/me/password` | user | bio / เปลี่ยนรหัสผ่าน |
| GET | `/api/labs?difficulty&search&status&sort&tag` | - | ซ่อน `flag` จากผู้เล่น |
| GET | `/api/labs/:id` | - | + `activeInstance`, `recentSolvers`, `successRate`, related |
| POST | `/api/instances/start/:labId` | user | 409 `ACTIVE_INSTANCE_EXISTS` / 200 ถ้าเริ่มด่านเดิมซ้ำ |
| POST | `/api/instances/:id/stop` | user | idempotent |
| GET | `/api/instances/active` · `/history` · `/:id/status` | user | |
| POST | `/api/solves/labs/:labId/submit` | user | 400 `WRONG_FLAG` / `ALREADY_SOLVED` |
| GET | `/api/leaderboard?period=all\|week` · `/badges` · `/activity` · `/stats` · `/profile/:id` | - | |
| GET | `/api/admin/stats` · `/instances` · `/docker/containers` · `/users` · `/labs` | ADMIN | |
| POST/PUT/PATCH/DELETE | `/api/admin/labs...` | ADMIN | รองรับ toggle / reset solves |

Error contract: `{ success: false, code, message, details? }` — ใช้ `code` ฝั่ง frontend เพื่อแยกเงื่อนไขธุรกิจ

---

## 🧪 เทสต์

```bash
# 1) API + lab lifecycle (ต้องมี DB + Redis + Docker; รัน API ที่ localhost:3000)
cd server && node tests/e2e-lifecycle.mjs

# 2) ทั้ง stack ใน Docker: SPA → Traefik → nginx → API → Docker → ด่าน
docker compose -f docker-compose.local.yml up -d --build
cd server && node tests/docker-smoke.mjs
```

ชุดที่ 1 ครอบคลุม auth, catalog, start/stop container, Traefik routing, flag/badges/points,
leaderboard, admin CRUD และการกัน self-modification (59 checks)
ชุดที่ 2 พิสูจน์ว่า deployment ใน Docker ใช้งานได้จริงแบบ end to end

---

## 📁 โครงสร้าง

```
PETBUG/
├── docker-compose.yml          # dev: postgres + redis + traefik
├── docker-compose.local.yml    # ทั้ง stack ใน Docker (ไม่มี TLS)
├── docker-compose.prod.yml     # production: TLS + ACME + secrets
├── DEPLOY.md                   # คู่มือ deploy จริง
├── docker/traefik-bootstrap.sh # เขียน app route จาก APP_HOST ตอน boot
├── traefik/dynamic/            # ไฟล์ route (app + lab) ที่ Traefik อ่าน
├── labs/pocket-notes/          # ด่านเดโมขนาดเล็ก (Dockerfile + app)
├── server/
│   ├── Dockerfile · docker/entrypoint.sh
│   ├── app.js · server.js
│   ├── prisma/ (schema, migrations, seed)
│   ├── src/modules/{auth,labs,instances,solves,leaderboard,badges,admin}
│   ├── src/services/docker.service.js
│   ├── src/workers/labWorker.js
│   └── tests/{e2e-lifecycle,docker-smoke}.mjs
└── frontend/
    ├── Dockerfile · nginx.conf.template
    └── src/{pages,components/ui,hooks,lib,context}
```
