import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import http from 'node:http';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverScript = path.join(repoRoot, 'scripts/dev-server.mjs');
const port = 5300 + (process.pid % 200);

let child;

function waitForServerReady(proc) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('dev server did not start in time')), 10000);
    let buffer = '';
    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      if (buffer.includes('running on')) {
        clearTimeout(timer);
        resolve();
      }
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`dev server exited early with code ${code}`));
    });
  });
}

// Use Node's core http client (rather than the global fetch/undici) so these
// requests are unaffected by HTTP_PROXY/HTTPS_PROXY environment variables
// that may be configured for the outer process/CI environment.
function get(requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: requestPath }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.on('error', reject);
  });
}

describe('scripts/dev-server.mjs', () => {
  before(async () => {
    child = spawn(process.execPath, [serverScript], {
      cwd: repoRoot,
      env: { ...process.env, PORT: String(port) },
    });
    await waitForServerReady(child);
  });

  after(() => {
    if (child) child.kill();
  });

  it('serves index.html at the root path', async () => {
    const res = await get('/');
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'text/html');
    assert.equal(res.body, fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8'));
  });

  it('serves JS files with the text/javascript content type', async () => {
    const res = await get('/src/main.js');
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'text/javascript');
    assert.equal(res.body, fs.readFileSync(path.join(repoRoot, 'src/main.js'), 'utf8'));
  });

  it('serves CSS files with the text/css content type', async () => {
    const res = await get('/src/styles.css');
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'text/css');
  });

  it('returns 404 for an unknown path', async () => {
    const res = await get('/does-not-exist.js');
    assert.equal(res.status, 404);
    assert.equal(res.body, 'Not found');
  });

  it('falls back to text/plain for unmapped extensions', async () => {
    const res = await get('/README.md');
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'text/plain');
    assert.equal(res.body, fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8'));
  });

  it('never serves files outside of the project root', async () => {
    const res = await get('/../../../../../../../../etc/passwd');
    assert.equal(res.status, 404);
  });
});