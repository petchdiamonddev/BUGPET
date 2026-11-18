// One-off cleanup of QA artefacts created by the e2e/browser runs.
import 'dotenv/config';
import { prisma } from '../src/config/prisma.js';

const users = await prisma.user.findMany({
  where: { OR: [{ username: { startsWith: 'tester_' } }, { username: { startsWith: 'dbg_' } }] },
  select: { id: true },
});
const labs = await prisma.lab.findMany({ where: { title: { startsWith: 'Smoke Lab' } }, select: { id: true } });

const delUsers = await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
const delLabs = await prisma.lab.deleteMany({ where: { id: { in: labs.map((l) => l.id) } } });

const remaining = await prisma.user.findMany({ select: { username: true, points: true } });
console.log(`removed ${delUsers.count} test users, ${delLabs.count} smoke labs`);
console.log('users:', remaining.map((u) => `${u.username}:${u.points}`).join(', '));
console.log('labs:', await prisma.lab.count(), 'badges:', await prisma.badge.count());

await prisma.$disconnect();
