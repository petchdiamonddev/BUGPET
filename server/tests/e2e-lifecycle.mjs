// End-to-end lifecycle test for PETBUG (requires db+redis; docker optional).
const BASE = 'http://localhost:3000/api';

let failures = 0;
const check = (name, cond, extra = '') => {
  if (cond) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${name} ${extra}`);
  }
};

async function req(path, { method = 'GET', token, body } = {}) {
  const started = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json, ms: Date.now() - started };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log('\n== auth ==');
  const login = await req('/auth/login', { method: 'POST', body: { identifier: 'hunter_x', password: 'Petbug@2026' } });
  check('login hunter_x', login.status === 200 && !!login.body.data?.accessToken);
  const token = login.body.data.accessToken;

  const badLogin = await req('/auth/login', { method: 'POST', body: { identifier: 'hunter_x', password: 'nope' } });
  check('wrong password -> 401 INVALID_CREDENTIALS', badLogin.status === 401 && badLogin.body.code === 'INVALID_CREDENTIALS');

  const me = await req('/auth/me', { token });
  check('GET /auth/me', me.status === 200 && me.body.data.username === 'hunter_x');
  check('me has solvesCount', typeof me.body.data.solvesCount === 'number');

  console.log('\n== catalog ==');
  const labs = await req('/labs', { token });
  check('GET /labs', labs.status === 200 && labs.body.data.length >= 6);
  check('meta.tags present', Array.isArray(labs.body.meta?.tags) && labs.body.meta.tags.length > 0);
  check('player never sees flag', labs.body.data.every((l) => l.flag === undefined));
  check('counts.byDifficulty present', labs.body.meta?.counts?.byDifficulty?.EASY > 0);

  const filtered = await req('/labs?difficulty=EASY&sort=points', { token });
  check('filter difficulty=EASY', filtered.body.data.every((l) => l.difficulty === 'EASY'));

  const searched = await req('/labs?search=SQLi', { token });
  check('search SQLi', searched.body.data.length >= 1);

  const unsolved = await req('/labs?status=unsolved', { token });
  check('status=unsolved filter', unsolved.body.data.every((l) => !l.isSolved));

  // Pick an easy lab backed by the small local demo image so the test does not
  // have to pull a large image just to prove routing works.
  const startTarget =
    labs.body.data.find((l) => l.title?.includes('Pixel Mart')) ?? labs.body.data.find((l) => !l.isSolved) ?? labs.body.data[0];
  const otherLab = labs.body.data.find((l) => l.id !== startTarget.id);
  const target = startTarget;
  const detail = await req('/labs', { token });
  const labDetail = await req(`/labs/${target.id}`, { token });
  check('GET /labs/:id', labDetail.status === 200 && labDetail.body.data.id === target.id);
  check('detail has attempts/successRate keys', 'attemptsCount' in labDetail.body.data && 'successRate' in labDetail.body.data);
  check('related labs', Array.isArray(labDetail.body.meta?.related));
  check('detail hides flag', labDetail.body.data.flag === undefined);
  check('catalog meta counts', detail.body.meta?.counts?.total >= 6);

  console.log('\n== instances (docker) ==');
  const before = await req('/instances/active', { token });
  check('GET /instances/active', before.status === 200);

  if (before.body.data) {
    const stop0 = await req(`/instances/${before.body.data.id}/stop`, { method: 'POST', token });
    check('stop pre-existing instance', stop0.status === 200);
    for (let i = 0; i < 15; i += 1) {
      await sleep(2000);
      const again = await req('/instances/active', { token });
      if (!again.body.data) break;
    }
  }

  const stillActive = await req('/instances/active', { token });
  check('no stale active instance before start', stillActive.body.data === null);

  const start = await req(`/instances/start/${target.id}`, { method: 'POST', token });
  check('POST /instances/start/:labId -> 201', start.status === 201, JSON.stringify(start.body).slice(0, 200));
  check('instance starts in STARTING', start.body.data?.status === 'STARTING');
  check('instance url uses base domain', /^https?:\/\/[a-f0-9]{12}\./.test(start.body.data?.url ?? ''));

  const dup = await req(`/instances/start/${otherLab.id}`, { method: 'POST', token });
  check('second different lab -> 409 ACTIVE_INSTANCE_EXISTS', dup.status === 409 && dup.body.code === 'ACTIVE_INSTANCE_EXISTS');

  const same = await req(`/instances/start/${target.id}`, { method: 'POST', token });
  check('restart same lab -> 200 reused (idempotent)', same.status === 200 && same.body.meta?.reused === true);

  // Wait for the worker + docker to finish.
  let instance = null;
  for (let i = 0; i < 40; i += 1) {
    await sleep(3000);
    const st = await req(`/instances/${start.body.data.id}/status`, { token });
    if (st.body.data?.status === 'RUNNING' || st.body.data?.status === 'ERROR') {
      instance = st.body.data;
      break;
    }
  }
  check('instance reached RUNNING', instance?.status === 'RUNNING', instance?.error ?? '');

  if (instance?.status === 'RUNNING') {
    // Traefik is published on http://localhost:80. Send the lab's Host header
    // directly so the test does not depend on public DNS resolution.
    // NOTE: Node's fetch speaks HTTP/1.0 and Traefik answers those with 404,
    // so the probe goes through curl (HTTP/1.1) instead.
    const { execFileSync } = await import('node:child_process');
    const host = new URL(instance.url).host;
    const curl = (url) => {
      try {
        return execFileSync('curl', ['-s', '-o', '-', '-w', '\n%{http_code}', '-H', `Host: ${host}`, url], {
          encoding: 'utf8',
        });
      } catch {
        return '';
      }
    };
    let reachable = false;
    let servedLab = false;
    for (let i = 0; i < 20; i += 1) {
      const out = curl('http://127.0.0.1/');
      const code = out.trim().split('\n').pop();
      if (code === '200') {
        reachable = true;
        servedLab = out.includes('Pocket Notes');
        break;
      }
      await sleep(2000);
    }
    check('traefik routes the lab subdomain', reachable, `(${host})`);
    check('lab page served through traefik', servedLab);
  }

  console.log('\n== solves / gamification ==');
  const wrong = await req(`/solves/labs/${target.id}/submit`, { method: 'POST', token, body: { flag: 'PETBUG{nope}' } });
  check('wrong flag -> 400 WRONG_FLAG', wrong.status === 400 && wrong.body.code === 'WRONG_FLAG');

  const labRow = await req('/admin/labs', { token: 'x' });
  check('non-admin blocked from admin API', labRow.status === 401 || labRow.status === 403);

  const adminLogin = await req('/auth/login', { method: 'POST', body: { identifier: 'admin', password: 'Petbug@2026' } });
  const adminToken = adminLogin.body.data.accessToken;
  const adminLabs = await req('/admin/labs', { token: adminToken });

  // Make the solve checks independent of earlier runs: reset this lab first.
  await req(`/admin/labs/${target.id}/reset`, { method: 'POST', token: adminToken });
  check('admin sees flags', adminLabs.status === 200 && adminLabs.body.data.every((l) => typeof l.flag === 'string'));

  const targetAdmin = adminLabs.body.data.find((l) => l.id === target.id);
  // A correct flag also tears down the player's container, so poll instead of
  // assuming a fixed delay is enough for the Docker stop.
  const correct = await req(`/solves/labs/${target.id}/submit`, { method: 'POST', token, body: { flag: targetAdmin.flag } });
  check('correct flag -> SOLVED', correct.status === 200 && correct.body.isCorrect === true, JSON.stringify(correct.body).slice(0, 200));
  check('points awarded', correct.body.earnedPoints > 0 && typeof correct.body.totalPoints === 'number');
  check('badges returned', Array.isArray(correct.body.newBadges));
  check('solve responds fast (cleanup is async)', correct.ms < 1500, `(${correct.ms}ms)`);

  const again = await req(`/solves/labs/${target.id}/submit`, { method: 'POST', token, body: { flag: targetAdmin.flag } });
  check('re-submit -> 400 ALREADY_SOLVED', again.status === 400 && again.body.code === 'ALREADY_SOLVED');

  const lb = await req('/leaderboard?limit=100');
  const hunter = lb.body.data.find((e) => e.username === 'hunter_x');
  check('leaderboard ranks hunter_x', hunter && hunter.rank >= 1 && hunter.points > 0);

  const weekly = await req('/leaderboard?period=week');
  check('weekly leaderboard works', weekly.status === 200 && Array.isArray(weekly.body.data));

  const profile = await req('/leaderboard/me', { token });
  check('profile has completion + byDifficulty', typeof profile.body.data.completion === 'number' && !!profile.body.data.byDifficulty);

  const playerProfile = await req(`/leaderboard/profile/${hunter.id}`);
  check('public player profile', playerProfile.status === 200 && playerProfile.body.data.username === 'hunter_x');

  const badges = await req('/leaderboard/badges');
  check('badges list with tiers', badges.body.data.length === 7 && badges.body.data.every((b) => b.tier));

  const activity = await req('/leaderboard/activity');
  check('activity feed', Array.isArray(activity.body.data) && activity.body.data.length > 0);

  const stats = await req('/leaderboard/stats');
  check('public stats', typeof stats.body.data.totalPlayers === 'number');

  console.log('\n== admin ==');
  const adminStats = await req('/admin/stats', { token: adminToken });
  check('admin stats', adminStats.status === 200 && !!adminStats.body.data.sparklines?.solves);

  const users = await req('/admin/users', { token: adminToken });
  check('admin users', users.status === 200 && users.body.data.length >= 4);

  const created = await req('/admin/labs', {
    method: 'POST',
    token: adminToken,
    body: {
      title: `Smoke Lab ${Date.now()}`,
      description: 'lab created by the automated smoke test',
      difficulty: 'MEDIUM',
      dockerImage: 'nginx:alpine',
      flag: 'PETBUG{smoke_test_flag}',
      points: 150,
      timeoutMin: 30,
      tags: ['Smoke'],
      isActive: true,
    },
  });
  check('admin create lab -> 201', created.status === 201, JSON.stringify(created.body).slice(0, 200));

  const updated = await req(`/admin/labs/${created.body.data.id}`, {
    method: 'PUT',
    token: adminToken,
    body: { points: 175 },
  });
  check('admin update lab', updated.status === 200 && updated.body.data.points === 175);

  const toggled = await req(`/admin/labs/${created.body.data.id}/toggle`, { method: 'PATCH', token: adminToken });
  check('admin toggle lab', toggled.status === 200 && toggled.body.data.isActive === false);

  const invalidLab = await req('/admin/labs', { method: 'POST', token: adminToken, body: { title: 'x' } });
  check('invalid lab -> 400 VALIDATION_ERROR', invalidLab.status === 400 && invalidLab.body.code === 'VALIDATION_ERROR');

  const reset = await req(`/admin/labs/${target.id}/reset`, { method: 'POST', token: adminToken });
  check('admin reset lab solves', reset.status === 200);

  const removed = await req(`/admin/labs/${created.body.data.id}`, { method: 'DELETE', token: adminToken });
  check('admin delete lab', removed.status === 200);

  const instAdmin = await req('/admin/instances', { token: adminToken });
  check('admin instances list', instAdmin.status === 200 && Array.isArray(instAdmin.body.data));

  const dockerList = await req('/admin/docker/containers', { token: adminToken });
  check('admin docker containers', dockerList.status === 200 && Array.isArray(dockerList.body.data));

  const selfBan = await req(`/admin/users/${adminLogin.body.data.user.id}`, { method: 'PATCH', token: adminToken, body: { isBanned: true } });
  check('admin cannot ban self', selfBan.status === 400 && selfBan.body.code === 'SELF_MODIFICATION');

  console.log('\n== stop instance ==');
  // The correct flag above already stopped this container; verify it drained.
  const stop = await req(`/instances/${start.body.data.id}/stop`, { method: 'POST', token });
  check('stop is idempotent', stop.status === 200);

  let after = null;
  for (let i = 0; i < 15; i += 1) {
    after = await req('/instances/active', { token });
    if (after.body.data === null) break;
    await sleep(2000);
  }
  check('no active instance after stop', after.body.data === null, JSON.stringify(after.body.data ?? ''));

  // Explicit start -> stop path (the one a "Stop" button hit) must also drain.
  const start2 = await req(`/instances/start/${target.id}`, { method: 'POST', token });
  check('restart after solve works', start2.status === 201, JSON.stringify(start2.body).slice(0, 160));
  await sleep(4000);
  const stop2 = await req(`/instances/${start2.body.data.id}/stop`, { method: 'POST', token });
  check('explicit stop accepted', stop2.status === 200);
  let after2 = null;
  for (let i = 0; i < 15; i += 1) {
    after2 = await req('/instances/active', { token });
    if (after2.body.data === null) break;
    await sleep(2000);
  }
  check('explicit stop drains the instance', after2.body.data === null, JSON.stringify(after2.body.data ?? ''));

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
