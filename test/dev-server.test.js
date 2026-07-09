import { test, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import http from 'node:http';

// scripts/dev-server.mjs starts listening as a side effect of being imported.
// We give it a dedicated port via an env var set before the dynamic import,
// then exercise it over real HTTP requests. We use Node's core http client
// (rather than the global fetch/undici) so these requests are unaffected by
// HTTP_PROXY/HTTPS_PROXY environment variables that may be configured for
// the outer process/CI environment. Every request uses a bounded timeout so
// a broken/unreachable server fails the test quickly instead of hanging the
// test run.
const port = 20000 + (process.pid % 10000);
const REQUEST_TIMEOUT_MS = 2000;

function get(path, { method = 'GET' } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path, method, timeout: REQUEST_TIMEOUT_MS },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          resolve({
            status: res.statusCode,
            headers: { get: (name) => res.headers[name.toLowerCase()] },
            text: async () => body.toString('utf8'),
            arrayBuffer: async () => body,
          });
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error(`request to ${path} timed out`)));
    req.on('error', reject);
    req.end();
  });
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
  throw new Error(`Server at http://127.0.0.1:${port}${path} did not become ready in time`);
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

  test('serves nested files under src/ with the correct content-type', async () => {
    const [res, expected] = await Promise.all([
      get('/src/workspace-data.js'),
      readFile(join(process.cwd(), 'src', 'workspace-data.js'), 'utf8'),
    ]);

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/javascript');
    assert.equal(await res.text(), expected);
  });

  test('ignores query strings when resolving the file to serve', async () => {
    const [res, expected] = await Promise.all([
      get('/index.html?foo=bar&baz=1'),
      readFile(join(process.cwd(), 'index.html'), 'utf8'),
    ]);

    assert.equal(res.status, 200);
    assert.equal(await res.text(), expected);
  });

  test('returns 404 when the request path is a directory rather than a file', async () => {
    const res = await get('/src');

    assert.equal(res.status, 404);
  });

  test('serves a file regardless of HTTP method, since the handler does not branch on req.method', async () => {
    const res = await get('/index.html', { method: 'POST' });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/html');
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

  test('does not escape the working directory for percent-encoded ../ segments', async () => {
    const res = await get('/%2e%2e/%2e%2e/%2e%2e/%2e%2e/%2e%2e/%2e%2e/etc/passwd');

    assert.equal(res.status, 404);
  });
});