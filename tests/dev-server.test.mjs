import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const serverScriptPath = fileURLToPath(new URL('../scripts/dev-server.mjs', import.meta.url));
const projectRoot = fileURLToPath(new URL('..', import.meta.url));

// scripts/dev-server.mjs wires up its request handler as a module-level side
// effect (`http.createServer(handler).listen(...)`) and never exports it.
// Rather than spinning up a real TCP listener and firing HTTP requests at it
// (unreliable across sandboxes/CI network policies), we monkey-patch
// http.createServer to intercept and return the request handler, and drive
// it directly with mock req/res objects. This exercises the exact routing,
// content-type and error-handling logic without any real network I/O.
async function loadRequestHandler() {
  const originalCreateServer = http.createServer;
  let handler;
  http.createServer = (requestListener) => {
    handler = requestListener;
    http.createServer = originalCreateServer;
    return { listen() { return this; } };
  };

  try {
    const url = `${pathToFileURL(serverScriptPath).href}?t=${Date.now()}-${Math.random()}`;
    await import(url);
  } finally {
    http.createServer = originalCreateServer;
  }

  assert.ok(typeof handler === 'function', 'expected dev-server.mjs to register a request handler');
  return handler;
}

function createMockResponse() {
  return {
    statusCode: undefined,
    headers: undefined,
    body: undefined,
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers || {};
    },
    end(data) {
      this.body = data;
    },
  };
}

function bodyText(res) {
  return Buffer.isBuffer(res.body) ? res.body.toString('utf8') : res.body;
}

test('dev-server handler serves index.html at the root path', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/html');
  assert.match(bodyText(res), /<div id="root"><\/div>/);
});

test('dev-server handler serves JS files with the text/javascript content type', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/src/main.js' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/javascript');
  assert.match(bodyText(res), /workspace-data\.js/);
});

test('dev-server handler serves CSS files with the text/css content type', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/src/styles.css' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/css');
});

test('dev-server handler serves JSON files with the application/json content type', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/package.json' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'application/json');
  const pkg = JSON.parse(bodyText(res));
  assert.equal(pkg.name, 'ai-coding-workspace');
});

test('dev-server handler falls back to text/plain for unrecognized extensions', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/README.md' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/plain');
});

test('dev-server handler responds with 404 "Not found" for missing files', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/does-not-exist.js' }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body, 'Not found');
});

test('dev-server handler does not escape the project root on path traversal attempts', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/../../../../../../etc/passwd' }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body, 'Not found');
});

test('dev-server handler responds with 404 for percent-encoded traversal sequences', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/%2e%2e/%2e%2e/etc/passwd' }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body, 'Not found');
});

test('dev-server handler ignores query strings when resolving the requested file', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/src/styles.css?v=123' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/css');
});

test('dev-server handler responds with 404 when the requested path is a directory', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/src' }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body, 'Not found');
});

test('dev-server handler serves files nested several directories below the project root', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/.github/ISSUE_TEMPLATE/bug_report.md' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/plain');
});

test('dev-server handler falls back to text/plain for recognized-but-unmapped file extensions', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/scripts/build.mjs' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/plain');
  assert.match(bodyText(res), /Built static AI Coding Workspace into dist\//);
});

test('dev-server handler serves "/" and "/index.html" identically', async () => {
  const handler = await loadRequestHandler();
  const rootRes = createMockResponse();
  const explicitRes = createMockResponse();

  await handler({ url: '/' }, rootRes);
  await handler({ url: '/index.html' }, explicitRes);

  assert.equal(rootRes.statusCode, explicitRes.statusCode);
  assert.equal(rootRes.headers['Content-Type'], explicitRes.headers['Content-Type']);
  assert.equal(bodyText(rootRes), bodyText(explicitRes));
});

test('dev-server handler treats file extensions case-sensitively, falling back to text/plain for uppercase extensions', async () => {
  const fixtureDir = join(projectRoot, 'aicw-dev-server-test-fixture');
  const fixturePath = join(fixtureDir, 'UPPER.JS');
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(fixturePath, "console.log('upper');");

  try {
    const handler = await loadRequestHandler();
    const res = createMockResponse();

    await handler({ url: '/aicw-dev-server-test-fixture/UPPER.JS' }, res);

    assert.equal(res.statusCode, 200);
    // extname() preserves case, so a ".JS" file does not match the
    // lowercase-only ".js" key in the content-type map and falls back to
    // text/plain instead of text/javascript.
    assert.equal(res.headers['Content-Type'], 'text/plain');
    assert.equal(bodyText(res), "console.log('upper');");
  } finally {
    await rm(fixtureDir, { recursive: true, force: true });
  }
});