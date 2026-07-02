import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const serverScript = join(repoRoot, 'scripts', 'dev-server.mjs');

// Pick a port derived from the PID to reduce the chance of collisions when
// multiple test files run concurrently.
const port = 20000 + (process.pid % 9000);
const baseUrl = `http://127.0.0.1:${port}`;

let child;

function waitForServerReady(proc) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for dev server to start'));
    }, 10000);

    proc.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('AI Coding Workspace running on')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    proc.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`dev server exited early with code ${code}`));
    });
  });
}

before(async () => {
  child = spawn(process.execPath, [serverScript], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(port) },
  });
  await waitForServerReady(child);
});

after(() => {
  child?.kill();
});

describe('scripts/dev-server.mjs', () => {
  test('serves index.html for the root path with the correct content type', async () => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/html');
    const body = await response.text();
    assert.match(body, /<div id="root"><\/div>/);
    assert.match(body, /<title>AI Coding Workspace<\/title>/);
  });

  test('serves JavaScript modules with the correct content type', async () => {
    const response = await fetch(`${baseUrl}/src/main.js`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/javascript');
    const body = await response.text();
    assert.match(body, /from '\.\/workspace-data\.js'/);
  });

  test('serves CSS files with the correct content type', async () => {
    const response = await fetch(`${baseUrl}/src/styles.css`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/css');
  });

  test('serves JSON files with the correct content type', async () => {
    const response = await fetch(`${baseUrl}/package.json`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json');
    const body = await response.json();
    assert.equal(body.name, 'ai-coding-workspace');
  });

  test('falls back to text/plain for unmapped extensions', async () => {
    const response = await fetch(`${baseUrl}/README.md`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/plain');
  });

  test('returns 404 for missing files', async () => {
    const response = await fetch(`${baseUrl}/this-file-does-not-exist.js`);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), 'Not found');
  });

  test('does not allow path traversal outside of the project root', async () => {
    const response = await fetch(`${baseUrl}/../../../../../../etc/passwd`);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), 'Not found');
  });

  test('does not allow path traversal via a leading ../ segment', async () => {
    const response = await fetch(`${baseUrl}/../package.json`);
    // The leading ".." is normalized/stripped so this should resolve inside
    // the project root (as /package.json) rather than escaping it.
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json');
  });
});