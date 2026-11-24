import { prisma } from '../src/config/prisma.js';
import bcrypt from 'bcrypt';
import { INITIAL_BADGES } from '../src/modules/badges/badges.service.js';

const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'Petbug@2026';

const demoLabs = [
  {
    title: 'Cafe Club — SQL Injection',
    description:
      'ระบบสมาชิกของร้านกาแฟ Cafe Club มีช่องโหว่ SQL Injection ซ่อนอยู่ในหน้าค้นหาสินค้าและหน้า Login\n\nภารกิจ:\n1. ตรวจสอบ query ที่ระบบส่งไปยังฐานข้อมูล\n2. ทำ Authentication Bypass หรือ UNION Extraction ผ่านจุดที่ไม่มี prepared statement\n3. ดึง Flag ที่จัดเก็บอยู่ฝั่ง server ออกมา',
    difficulty: 'EASY',
    dockerImage: 'bkimminich/juice-shop:latest',
    flag: 'PETBUG{sql_1nj3ct10n_m4st3r_cafe}',
    points: 100,
    timeoutMin: 45,
    tags: ['SQLi', 'Authentication Bypass', 'OWASP Top 10'],
  },
  {
    title: 'FurHire — IDOR & Broken Access Control',
    description:
      'แพลตฟอร์มหางานสำหรับสัตว์เลี้ยง FurHire ใช้ ID แบบเรียงลำดับใน API ทำให้ผู้ใช้สามารถเข้าถึง resume และข้อมูลเงินเดือนของผู้ใช้อื่นได้\n\nภารกิจ:\n1. สังเกต request ที่โหลดโปรไฟล์ของคุณ\n2. ดัดแปลง parameter ที่ระบุ object id\n3. อ่านข้อมูลที่ไม่อยู่ในสิทธิ์ของคุณเพื่อค้นหา Flag',
    difficulty: 'MEDIUM',
    dockerImage: 'nginx:alpine',
    flag: 'PETBUG{1d0r_pr1v1l3g3_3sc4l4t10n_furhire}',
    points: 200,
    timeoutMin: 60,
    tags: ['IDOR', 'Broken Access Control', 'API Security'],
  },
  {
    title: 'Galaxy Dash — Command Injection',
    description:
      'ฟังก์ชันทดสอบการเชื่อมต่อเครือข่ายของ Galaxy Dash Portal ประกอบ shell command จาก input ผู้ใช้โดยตรง ส่งผลให้สามารถทำ Remote Code Execution (RCE) ได้\n\nภารกิจ:\n1. ทดสอบช่องกรอก IP / hostname ในหน้า diagnostics\n2. ใช้ command separator เพื่อเรียกคำสั่งของระบบ\n3. อ่านไฟล์ Flag ในระบบเป้าหมาย',
    difficulty: 'HARD',
    dockerImage: 'nginx:alpine',
    flag: 'PETBUG{rce_r00t_c0mm4nd_3x3cut10n_galaxy}',
    points: 300,
    timeoutMin: 90,
    tags: ['RCE', 'Command Injection', 'Privilege Escalation'],
  },
  {
    title: 'Pixel Mart — Stored XSS',
    description:
      'ระบบรีวิวสินค้าของ Pixel Mart ไม่ได้ encode output เมื่อแสดง comment ผู้ขายสามารถฝัง script ที่ทำงานในเบราว์เซอร์ของผู้ดูแลระบบได้\n\nภารกิจ:\n1. ส่ง payload ที่ถูกเก็บลงฐานข้อมูล\n2. ทำให้บอทผู้ดูแลระบบเรียก endpoint ที่คุณควบคุม\n3. ใช้ข้อมูลจากบอทเพื่อขอ Flag',
    difficulty: 'EASY',
    dockerImage: 'nginx:alpine',
    flag: 'PETBUG{st0r3d_xss_p1x3l_m4rt}',
    points: 100,
    timeoutMin: 45,
    tags: ['XSS', 'OWASP Top 10', 'Client-side'],
  },
  {
    title: 'Vault Notes — JWT Confusion',
    description:
      'Vault Notes ออก JWT ที่ไม่ได้ตรวจสอบ algorithm signature อย่างรัดกุม พร้อมมี claim role ที่ client สามารถเสนอได้เอง\n\nภารกิจ:\n1. ถอดรหัส token ที่ได้รับ\n2. สร้าง token ปลอมที่มีสิทธิ์ admin\n3. เข้าถึงโน้ตส่วนตัวเพื่อดึง Flag',
    difficulty: 'MEDIUM',
    dockerImage: 'nginx:alpine',
    flag: 'PETBUG{jwt_alg_c0nfus10n_v4ult}',
    points: 200,
    timeoutMin: 60,
    tags: ['JWT', 'Broken Authentication', 'Crypto'],
  },
  {
    title: 'Inbox X — XXE File Disclosure',
    description:
      'ระบบ import รายชื่อผู้ติดต่อของ Inbox X รับไฟล์ XML โดยไม่ปิดการ resolve external entity\n\nภารกิจ:\n1. สร้าง payload XML ที่ประกาศ external entity\n2. อ้างอิงไฟล์ภายใน container ของเป้าหมาย\n3. ทำให้ response แสดงเนื้อหาไฟล์ที่ Flag ถูกเก็บไว้',
    difficulty: 'HARD',
    dockerImage: 'nginx:alpine',
    flag: 'PETBUG{xx3_3nt1ty_1nbox_d1scl0sur3}',
    points: 350,
    timeoutMin: 90,
    tags: ['XXE', 'SSRF', 'File Disclosure'],
  },
];

async function main() {
  console.log('--- SEEDING DATABASE ---');

  // 1. Seed Badges
  for (const badge of INITIAL_BADGES) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {
        description: badge.description,
        icon: badge.icon,
        condition: badge.condition,
        tier: badge.tier,
        points: badge.points,
      },
      create: badge,
    });
  }
  console.log(`Badges seeded: ${INITIAL_BADGES.length}`);

  // 2. Seed Admin User
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { role: 'ADMIN', password: hashedPassword },
    create: {
      username: 'admin',
      email: 'admin@petbug.io',
      password: hashedPassword,
      role: 'ADMIN',
      bio: 'ผู้ดูแลระบบ BUGPET Platform',
    },
  });
  console.log(`Admin user seeded (Username: admin, Password: ${DEMO_PASSWORD})`);

  // 3. Seed Labs
  for (const lab of demoLabs) {
    const existing = await prisma.lab.findFirst({
      where: { title: lab.title },
    });
    if (existing) {
      await prisma.lab.update({ where: { id: existing.id }, data: lab });
    } else {
      await prisma.lab.create({ data: lab });
    }
  }
  console.log(`Labs seeded: ${demoLabs.length}`);

  console.log('--- SEEDING COMPLETED ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
