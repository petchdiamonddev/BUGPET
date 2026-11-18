// A deliberately tiny, deliberately vulnerable "Pocket Notes" web lab.
// Vulnerability: no input escaping on the note list (stored XSS) and the
// /api/notes endpoint returns the flag when the `debug` query param is present
// (broken access control). Both stay inside the container, which is why the lab
// is a learning target rather than a real product.
const http = require('http');

const PORT = process.env.PORT || 80;
const FLAG = process.env.FLAG || 'PETBUG{default_flag_set_at_runtime}';

const notes = [
  { id: 1, author: 'admin', text: 'Welcome to Pocket Notes! <b>Release 1.0</b>' },
  { id: 2, author: 'moderator', text: 'Remember: never paste your password anywhere.' },
];

const page = () => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Pocket Notes</title>
<style>
 body{font-family:system-ui,sans-serif;background:#f4f2ec;color:#191818;margin:0;padding:40px}
 main{max-width:560px;margin:auto;background:#fff;border:1px solid #e2ded3;border-radius:14px;padding:24px}
 h1{font-size:20px;margin:0 0 4px} .muted{color:#6f6a62;font-size:13px;margin:0 0 20px}
 form{display:flex;gap:8px;margin-bottom:20px}
 input{flex:1;padding:8px 10px;border:1px solid #d5cfc1;border-radius:10px;font:inherit}
 button{padding:8px 14px;border:0;border-radius:10px;background:#191818;color:#fff;font:inherit;cursor:pointer}
 li{list-style:none;border-bottom:1px dashed #e2ded3;padding:10px 0}
 .who{font:600 12px ui-monospace,monospace;color:#6f6a62}
 code{background:#f4f2ec;padding:2px 6px;border-radius:6px;font:12px ui-monospace,monospace}
</style></head><body><main>
 <h1>Pocket Notes</h1>
 <p class="muted">A tiny note wall. Try the API at <code>/api/notes</code>.</p>
 <form method="POST" action="/notes">
  <input name="author" placeholder="your name" value="guest">
  <input name="text" placeholder="leave a note…">
  <button>Post</button>
 </form>
 <ul>${notes.map((n) => `<li><div class="who">${n.author}</div><div>${n.text}</div></li>`).join('')}</ul>
</main></body></html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/notes') {
    // Broken access control: "debug" exposes internal data to anyone.
    if (url.searchParams.get('debug') === '1') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ notes, flag: FLAG }, null, 2));
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(notes));
  }

  if (url.pathname === '/notes' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => {
      body += c;
    });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      // Deliberately unescaped (stored XSS).
      notes.unshift({ id: notes.length + 1, author: params.get('author') || 'anon', text: params.get('text') || '' });
      res.writeHead(302, { location: '/' });
      res.end();
    });
    return undefined;
  }

  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  return res.end(page());
});

server.listen(PORT, () => console.log(`Pocket Notes lab listening on ${PORT}`));
