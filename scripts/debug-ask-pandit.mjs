import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const { default: handler } = await import('../api/ask-pandit.js');

const headers = {};
const req = {
  method: 'POST',
  headers: {},
  body: {
    user_question: process.argv.slice(2).join(' ') || 'What is dharma?',
    visible_screen_text: 'GitaLife 312 home page',
    book_filter: null,
    history: [],
    debug: true,
  },
};

const res = {
  statusCode: 200,
  body: '',
  setHeader(key, value) {
    headers[key] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(value) {
    this.body = JSON.stringify(value);
    printResult();
  },
  send(value) {
    this.body = String(value);
    printResult();
  },
};

const startedAt = performance.now();
await handler(req, res);

function printResult() {
  const elapsedMs = Math.round(performance.now() - startedAt);
  console.log(JSON.stringify({
    status: res.statusCode,
    elapsed_ms: elapsedMs,
    debug: headers['x-pandit-debug'] ? JSON.parse(headers['x-pandit-debug']) : null,
    body_preview: res.body.slice(0, 900),
  }, null, 2));
}
