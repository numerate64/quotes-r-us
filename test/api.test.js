import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
let child;
let base;
const samples = JSON.parse(readFileSync(new URL('../sample-quotes.json', import.meta.url)));
before(async () => {
  child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('..', import.meta.url), env: { ...process.env, PORT: '0', QUOTE_STORE: 'local' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timed out')), 10000);
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`Server exited: ${code}`)));
    child.stdout.on('data', (data) => {
      const match = String(data).match(/listening on port (\d+)/);
      if (match) { base = `http://127.0.0.1:${match[1]}`; clearTimeout(timer); resolve(); }
    });
  });
});
after(() => child?.kill());
test('public random endpoint returns bundled anonymous samples and allows cross-origin reads', async () => {
  const ids = new Set();
  for (let i = 0; i < 20; i++) {
    const response = await fetch(`${base}/api/v1/quotes/random`, { headers: { Origin: 'https://example.com' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const { quote } = await response.json();
    assert.deepEqual(quote, samples.find((item) => item.id === quote.id));
    assert.equal(quote.source, 'Anonymous');
    ids.add(quote.id);
  }
  assert(ids.size > 1);
});
test('public v1 endpoint is read-only and supports preflight', async () => {
  assert.equal((await fetch(`${base}/api/v1/quotes/random`, { method: 'OPTIONS' })).status, 204);
  assert.equal((await fetch(`${base}/api/v1/quotes/random`, { method: 'POST' })).status, 404);
});
test('only intended files are publicly served', async () => {
  for (const path of ['server.js', 'package.json', 'data/quotes.local.json', 'src/quote-store.js']) {
    assert.equal((await fetch(`${base}/${path}`)).status, 404);
  }
  for (const path of ['admin.html', 'api.html', 'quote-api.js', 'sample-quotes.json']) {
    assert.equal((await fetch(`${base}/${path}`)).status, 200);
  }
});
