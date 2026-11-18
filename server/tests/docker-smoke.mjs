// Resolve the .localhost subdomain to loopback so requests carry the right Host
// header (Node neither expands *.localhost nor drops the port like a browser
// would on port 80, so Host is set explicitly to the bare hostname).
import http from 'node:http';

const APP_HOST = process.env.APP_HOST || 'petbug.localhost';
// No keep-alive: the test is sequential and Traefik closes idle sockets,
// which surfaces as ECONNRESET on a reused connection.
const agent = new http.Agent({ keepAlive: false });

// Traefik is restarted by the API after route changes (TRAEFIK_RELOAD=restart),
// which briefly drops connections. Retry like a browser would instead of
// failing the run on a transient reset.
async function raw(path, opts = {}) {
  const first = await requestOnce(path, opts);
  if (first.status !== 0) return first;
  await sleep(2000);
  return requestOnce(path, opts);
}

function requestOnce(path, { method = 'GET', token, body, host = APP_HOST } = {}) {
  return new Promise((resolve) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: 80,
        path,
        method,
        agent,
        // Node rewrites the Host header unless this is off.
        setHost: false,
        headers: {
          // Callers targeting a lab subdomain pass their own host.
          ...(host ? { host } : {}),
          ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', (err) => resolve({ status: 0, body: err.code }));
    if (payload) req.write(payload);
    req.end();
  });
}

const results = [];
const ok = (name, cond, info = '') => results.push({ name, pass: Boolean(cond), info: String(info).slice(0, 200) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const app = await raw('/');
ok('SPA served', typeof app.body === 'string' && /<!doctype html>/i.test(app.body), app.status);

const health = await raw('/api/health');
ok('API health via proxy', health.status === 200, JSON.stringify(health.body));

const login = await raw('/api/auth/login', { method: 'POST', body: { identifier: 'admin', password: 'Petbug@2026' } });
const token = login.body?.data?.accessToken;
ok('admin login', Boolean(token), login.body?.message);

const labs = await raw('/api/labs');
ok('lab catalog', labs.status === 200 && labs.body.data?.length >= 6, `${labs.body.data?.length} labs`);

// A lab created by a previous run may still be running; the constraint is
// 1 user = 1 container, so drain it first.
const active0 = await raw('/api/instances/active', { token });
if (active0.body?.data) {
  await raw(`/api/instances/${active0.body.data.id}/stop`, { method: 'POST', token });
  for (let i = 0; i < 20; i += 1) {
    await sleep(2000);
    const a = await raw('/api/instances/active', { token });
    if (!a.body?.data) break;
  }
}

const lab = labs.body.data.find((l) => l.title.includes('Pixel Mart')) ?? labs.body.data[0];
const start = await raw(`/api/instances/start/${lab.id}`, { method: 'POST', token });
ok('start lab', start.status === 201, JSON.stringify(start.body).slice(0, 150));

let inst = null;
const instanceId = start.body?.data?.id;
if (instanceId) {
  for (let i = 0; i < 40; i += 1) {
    await sleep(3000);
    const st = await raw(`/api/instances/${instanceId}/status`, { token });
    if (st.body.data?.status === 'RUNNING' || st.body.data?.status === 'ERROR') {
      inst = st.body.data;
      break;
    }
  }
}
ok('lab reached RUNNING', inst?.status === 'RUNNING', inst?.error ?? '');

if (inst?.status === 'RUNNING') {
  console.log('   lab url:', inst.url);
  const labHost = new URL(inst.url).host;
  let last = { status: 0 };
  for (let i = 0; i < 20; i += 1) {
    last = await raw('/', { host: labHost });
    if (last.status === 200) break;
    await sleep(2000);
  }
  ok('lab reachable via Traefik wildcard route', last.status === 200, `${labHost} -> ${last.status} ${typeof last.body === 'string' ? last.body.slice(0, 60) : ''}`);

  const adminLabs = await raw('/api/admin/labs', { token });
  const flag = adminLabs.body.data.find((l) => l.id === lab.id)?.flag;
  // Earlier runs may have solved this lab already — reset it so the check is
  // about the deployment, not about leftover data.
  await raw(`/api/admin/labs/${lab.id}/reset`, { method: 'POST', token });
  const solve = await raw(`/api/solves/labs/${lab.id}/submit`, { method: 'POST', token, body: { flag } });
  ok('solve flag through proxy', solve.status === 200 && solve.body.isCorrect === true, JSON.stringify(solve.body).slice(0, 150));
}

const board = await raw('/api/leaderboard?limit=5');
ok('leaderboard through proxy', board.status === 200 && Array.isArray(board.body.data));

console.log('\n=== RESULTS ===');
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.pass ? '' : `  ${r.info}`}`);
const failed = results.filter((r) => !r.pass).length;
console.log(failed === 0 ? '\nALL PASSED' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
