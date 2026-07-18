import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';

const serverScriptPath = fileURLToPath(new URL('../scripts/dev-server.mjs', import.meta.url));

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

test('dev-server handler ignores query strings when resolving the file to serve', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/src/main.js?ts=1234&reload=true' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/javascript');
  assert.match(bodyText(res), /workspace-data\.js/);
});

test('dev-server handler treats percent-encoded path separators literally instead of decoding them', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  // req.url's pathname is never percent-decoded by the handler, so
  // "%2F" is looked up as a literal filename segment (not as "/"),
  // which does not exist on disk and results in a 404 rather than a
  // successful lookup of src/main.js.
  await handler({ url: '/src%2Fmain.js' }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body, 'Not found');
});

test('dev-server handler returns 404 when the requested path is a directory rather than a file', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  // readFile() rejects with EISDIR for a directory, which the handler's
  // catch-all treats the same as a missing file.
  await handler({ url: '/src' }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body, 'Not found');
});

test('dev-server handler collapses repeated path separators before resolving the file', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/src//main.js' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/javascript');
  assert.match(bodyText(res), /workspace-data\.js/);
});

test('dev-server handler falls back to text/plain for extensionless files', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/LICENSE' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/plain');
});

test('dev-server handler serves the exact on-disk bytes of a static file', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/src/main.js' }, res);

  const expected = await readFile(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  assert.equal(res.statusCode, 200);
  assert.equal(bodyText(res), expected);
});

test('dev-server handler responds with 404 for percent-encoded traversal sequences', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  // Percent-encoded segments are never decoded by the handler, so
  // "%2e%2e" is looked up as a literal filename rather than being
  // interpreted as "..", which does not exist on disk and results in 404.
  await handler({ url: '/%2e%2e/%2e%2e/etc/passwd' }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body, 'Not found');
});

test('dev-server handler blocks traversal sequences that appear after a valid path segment', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/src/../../../../../../etc/passwd' }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body, 'Not found');
});

test('dev-server handler resolves internal .. segments that stay within the project root', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  // normalize() collapses "src/../src/main.js" down to "src/main.js"
  // before the leading-".." strip runs, so this resolves to a real file
  // instead of being treated as an escape attempt.
  await handler({ url: '/src/../src/main.js' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/javascript');
});

test('dev-server handler ignores query strings on non-JS files as well', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/package.json?cache=bust' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'application/json');
  const pkg = JSON.parse(bodyText(res));
  assert.equal(pkg.name, 'ai-coding-workspace');
});