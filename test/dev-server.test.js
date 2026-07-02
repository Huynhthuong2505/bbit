import { test, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// scripts/dev-server.mjs starts listening as a side effect of being imported.
// We give it a dedicated port via an env var set before the dynamic import,
// then exercise it over real HTTP requests. Every request uses a bounded
// timeout so a broken/unreachable server fails the test quickly instead of
// hanging the test run.
const port = 20000 + (process.pid % 10000);
const baseUrl = `http://localhost:${port}`;
const REQUEST_TIMEOUT_MS = 2000;

function get(path) {
  return fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

async function waitForServer(path, attempts = 20) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await get(path);
      await res.arrayBuffer();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Server at ${baseUrl}${path} did not become ready in time`);
}

before(async () => {
  process.env.PORT = String(port);
  await import('../scripts/dev-server.mjs');
  await waitForServer('/index.html');
});

describe('dev-server.mjs static file serving', () => {
  test('serves index.html at the root path with an HTML content-type', async () => {
    const [res, expected] = await Promise.all([
      get('/'),
      readFile(join(process.cwd(), 'index.html'), 'utf8'),
    ]);

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/html');
    assert.equal(await res.text(), expected);
  });

  test('serves JavaScript files with a text/javascript content-type', async () => {
    const [res, expected] = await Promise.all([
      get('/src/main.js'),
      readFile(join(process.cwd(), 'src', 'main.js'), 'utf8'),
    ]);

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/javascript');
    assert.equal(await res.text(), expected);
  });

  test('serves CSS files with a text/css content-type', async () => {
    const [res, expected] = await Promise.all([
      get('/src/styles.css'),
      readFile(join(process.cwd(), 'src', 'styles.css'), 'utf8'),
    ]);

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/css');
    assert.equal(await res.text(), expected);
  });

  test('serves JSON files with an application/json content-type', async () => {
    const [res, expected] = await Promise.all([
      get('/package.json'),
      readFile(join(process.cwd(), 'package.json'), 'utf8'),
    ]);

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/json');
    assert.equal(await res.text(), expected);
  });

  test('falls back to text/plain for unrecognized extensions', async () => {
    const res = await get('/README.md');

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/plain');
  });

  test('returns 404 for a path that does not exist', async () => {
    const res = await get('/this-file-does-not-exist.html');

    assert.equal(res.status, 404);
    assert.equal(await res.text(), 'Not found');
  });
});

describe('dev-server.mjs path traversal handling', () => {
  test('does not escape the working directory for ../ style paths', async () => {
    const res = await get('/../../../../../../etc/passwd');

    // path.normalize() collapses leading ".." segments on an absolute
    // pathname, so the request is confined under process.cwd() and the
    // (nonexistent) file lookup results in a 404 rather than leaking
    // the real /etc/passwd.
    assert.equal(res.status, 404);
  });

  test('serves an existing file even when the request contains resolvable dot segments', async () => {
    const [res, expected] = await Promise.all([
      get('/src/../index.html'),
      readFile(join(process.cwd(), 'index.html'), 'utf8'),
    ]);

    assert.equal(res.status, 200);
    assert.equal(await res.text(), expected);
  });
});