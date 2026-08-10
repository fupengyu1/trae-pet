import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// Shared pet state + event bus (SSE)
// ---------------------------------------------------------------------------
const history = [];
const MAX_HISTORY = 50;

let state = {
  status: 'idle',
  event: null,
  prompt: '',
  history: [],
};

const clients = new Set();

function broadcast() {
  const payload = JSON.stringify({
    ...state,
    history,
    ts: Date.now(),
  });
  for (const res of clients) {
    res.write(`data: ${payload}\n\n`);
  }
}

function transition(status, { event = null, prompt = '', duration = 0 } = {}) {
  state = { status, event, prompt };
  history.push({ ts: Date.now(), event, status });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
  broadcast();

  // auto-advance for the demo flow
  if (duration > 0) {
    setTimeout(() => {
      if (state.status === status) transition('idle', { event: null, prompt: '' });
    }, duration);
  }
}

// Seed a bit of history so the panel isn't empty on first load
for (const [status, event] of [
  ['waiting', '需要你确认一下'],
  ['running', '正在构建项目'],
  ['done', '任务完成'],
  ['idle', null],
]) {
  history.push({ ts: Date.now(), event, status });
  state = { status, event, prompt: '' };
}

// ---------------------------------------------------------------------------
// Static
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// SSE: streams real-time task state to the pet overlay
// ---------------------------------------------------------------------------
app.get('/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  clients.add(res);
  // send current snapshot immediately
  res.write(`data: ${JSON.stringify({ ...state, history, ts: Date.now() })}\n\n`);

  const keepAlive = setInterval(() => res.write(': ping\n\n'), 15000);
  req.on('close', () => {
    clearInterval(keepAlive);
    clients.delete(res);
  });
});

// ---------------------------------------------------------------------------
// Control API
// ---------------------------------------------------------------------------
app.get('/api/state', (_req, res) => res.json({ ...state, history }));

app.post('/api/state', (req, res) => {
  const { status, event, prompt, duration } = req.body || {};
  const valid = ['idle', 'running', 'waiting', 'done'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${valid.join(', ')}` });
  }
  transition(status, { event, prompt, duration: Number(duration) || 0 });
  res.json({ ...state, history });
});

// Convenience: run the full simulated task flow
app.post('/api/simulate', (_req, res) => {
  const steps = [
    ['running', '正在构建项目', 1200],
    ['done', '任务完成', 900],
    ['idle', null, 0],
  ];
  let i = 0;
  const run = () => {
    if (i >= steps.length) return;
    const [status, event, ms] = steps[i++];
    transition(status, { event, prompt: '' });
    if (ms > 0) setTimeout(run, ms);
  };
  run();
  res.json({ ...state, history });
});

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`Trae Desktop Pet running at http://localhost:${PORT}`);
});