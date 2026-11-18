#!/bin/sh
set -e

echo "==> Waiting for PostgreSQL"
node --input-type=module -e '
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const deadline = Date.now() + 90_000;
let attempt = 0;
while (Date.now() < deadline) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    console.log("    database reachable");
    process.exit(0);
  } catch {
    attempt += 1;
    if (attempt === 1) console.log("    not ready yet, retrying…");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
console.error("    database unreachable after 90s");
process.exit(1);
'

echo "==> Applying migrations (prisma migrate deploy)"
# A database that was created with `prisma db push` during development already
# has the schema but no migration history. Baseline it once so `migrate deploy`
# does not try to recreate existing tables. On a fresh (empty) database the
# existence check fails and deploy simply applies every migration.
if npx prisma migrate status 2>&1 | grep -q "have not been applied"; then
  node --input-type=module -e '
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const rows = await prisma.$queryRaw`
  SELECT COUNT(*)::int AS n FROM information_schema.tables
  WHERE table_schema = current_schema() AND table_name = ''User''
`;
await prisma.$disconnect();
process.exit(Array.isArray(rows) && rows[0].n > 0 ? 0 : 1);
' && {
    echo "    existing schema detected — baselining 20261117000000_init"
    for migration in $(ls prisma/migrations | grep -v migration_lock); do
      npx prisma migrate resolve --applied "$migration"
    done
  }
fi

npx prisma migrate deploy

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "==> Seeding demo data (SEED_ON_START=true)"
  node prisma/seed.js
fi

echo "==> Starting API"
# The API talks to the host Docker socket to create lab containers. Docker's
# docs recommend running such a container with the socket's group id; the
# compose file sets `group_add` from DOCKER_GID (default 0, which is the gid
# of /var/run/docker.sock on most Docker Desktop / Linux setups).
if [ -S /var/run/docker.sock ] && [ ! -w /var/run/docker.sock ]; then
  echo "    WARNING: /var/run/docker.sock is not writable — labs cannot start."
  echo "             Set DOCKER_GID in .env to the socket's gid (run: stat -c %g /var/run/docker.sock)"
fi

exec "$@"
