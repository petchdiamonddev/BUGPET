import { prisma } from '../src/config/prisma.js';
import bcrypt from 'bcrypt';
import { INITIAL_BADGES } from '../src/modules/badges/badges.service.js';

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Seed Badges
  for (const badge of INITIAL_BADGES) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {},
      create: badge,
    });
  }
  console.log('✅ Badges seeded');

  // 2. Seed Admin User
  const adminPassword = await bcrypt.hash('Admin@123456', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@petbug.io',
      password: adminPassword,
      role: 'ADMIN',
      points: 500,
    },
  });
  console.log('✅ Admin user created: admin / Admin@123456');

  // 3. Seed Demo Player
  const userPassword = await bcrypt.hash('Player@123456', 10);
  const player = await prisma.user.upsert({
    where: { username: 'hunter_x' },
    update: {},
    create: {
      username: 'hunter_x',
      email: 'hunter@petbug.io',
      password: userPassword,
      role: 'USER',
      points: 100,
    },
  });
  console.log('✅ Demo player created: hunter_x / Player@123456');

  // 4. Seed Labs
  const demoLabs = [
    {
      title: 'Cafe Club — SQL Injection',
      description: 'ระบบสมาชิกของร้านกาแฟ Cafe Club มีช่องโหว่ SQL Injection ในหน้าค้นหาสินค้าและหน้า Login คุณสามารถ Bypass Authentication เพื่อดึง Flag ของ Admin ออกมาได้หรือไม่?',
      difficulty: 'EASY',
      dockerImage: 'bkimminich/juice-shop:latest',
      flag: 'PETBUG{sql_1nj3ct10n_m4st3r_cafe}',
      points: 100,
      timeoutMin: 45,
      tags: ['SQLi', 'Authentication Bypass', 'OWASP Top 10'],
    },
    {
      title: 'FurHire — Broken Access Control & IDOR',
      description: 'แพลตฟอร์มหางานสำหรับสัตว์เลี้ยง FurHire อนุญาตให้ผู้ใช้เข้าถึง Resume และข้อมูลเงินเดือนของผู้ใช้อื่นผ่านการดัดแปลง parameter ID (Insecure Direct Object Reference)',
      difficulty: 'MEDIUM',
      dockerImage: 'nginx:alpine',
      flag: 'PETBUG{1d0r_pr1v1l3g3_3sc4l4t10n_furhire}',
      points: 200,
      timeoutMin: 60,
      tags: ['IDOR', 'Broken Access Control', 'API Security'],
    },
    {
      title: 'Galaxy Dash — Command Injection & RCE',
      description: 'ฟังก์ชันทดสอบการเชื่อมต่อเครือข่ายของ Galaxy Dash Portal ไม่ได้กรอง input จากผู้ใช้งาน ส่งผลให้สามารถทำ Remote Code Execution (RCE) และอ่านไฟล์ Flag ในระบบได้',
      difficulty: 'HARD',
      dockerImage: 'nginx:alpine',
      flag: 'PETBUG{rce_r00t_c0mm4nd_3x3cut10n_galaxy}',
      points: 300,
      timeoutMin: 90,
      tags: ['RCE', 'Command Injection', 'Privilege Escalation'],
    },
  ];

  for (const lab of demoLabs) {
    const existing = await prisma.lab.findFirst({
      where: { title: lab.title },
    });
    if (!existing) {
      await prisma.lab.create({ data: lab });
    }
  }
  console.log('✅ Demo labs seeded');

  console.log('🚀 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
