/**
 * trae-pet 本地事件服务（零第三方依赖）
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8787;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const EVENT_TO_STATUS = {
  SessionStart: 'idle',
  UserPromptSubmit: 'running',
  PreToolUse: 'running',
  PostToolUse: 'running',
  Stop: 'done',
  Notification: 'waiting',
};

const state = { status: 'idle', event: null, prompt: '', toolName: '', ts: Date.now(), history: [] };
const clients = new Set();

function broadcast() {
  const payload = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of clients) res.write(payload);
}
function update(next) {
  Object.assign(state, next, { ts: Date.now() });
  state.history.push({ event: state.event, status: state.status, ts: state.ts });
  if (state.history.length > 50) state.history.shift();
  broadcast();
}
function handleEvent(body) {
  const evt = body.event || body.hook_event_name;
  const status = EVENT_TO_STATUS[evt] || 'idle';
  update({ status, event: evt, prompt: body.prompt || body.user_prompt || state.prompt, toolName: body.tool_name || body.toolName || '' });
  return { behavior: 'allow' };
}

const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml' };
function serveFile(file, res) {
  const ext = path.extname(file).slice(1);
  res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
  fs.createReadStream(file).pipe(res);
}

function startServer(port = PORT) {
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    if (req.method === 'POST' && url === '/event') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        let body = {};
        try { body = raw ? JSON.parse(raw) : {}; } catch {}
        const r = handleEvent(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(r));
      });
      return;
    }
    if (req.method === 'GET' && url === '/stream') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(`data: ${JSON.stringify(state)}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (req.method === 'GET' && url === '/state') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(state, null, 2));
      return;
    }
    if (req.method === 'GET' && (url === '/' || url === '/desktop.html')) {
      serveFile(path.join(PUBLIC_DIR, 'desktop.html'), res);
      return;
    }
    const file = path.join(PUBLIC_DIR, path.normalize(url.slice(1)));
    if (url.startsWith('/') && file.startsWith(PUBLIC_DIR) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      serveFile(file, res);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`trae-pet 服务已启动: http://localhost:${port}`);
      resolve({ server, port });
    });
  });
}

if (require.main === module) startServer();
module.exports = { startServer, getState: () => state };