import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
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

test('dev-server handler falls back to text/plain for files without any extension', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/LICENSE' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/plain');
});

test('dev-server module binds the HTTP server to all interfaces on the default port', async () => {
  const originalCreateServer = http.createServer;
  let listenArgs;
  http.createServer = (requestListener) => {
    http.createServer = originalCreateServer;
    return {
      listen(...args) {
        listenArgs = args;
        return this;
      },
    };
  };

  try {
    const url = `${pathToFileURL(serverScriptPath).href}?t=${Date.now()}-${Math.random()}`;
    await import(url);
  } finally {
    http.createServer = originalCreateServer;
  }

  assert.equal(listenArgs[0], 5173);
  assert.equal(listenArgs[1], '0.0.0.0');
  assert.equal(typeof listenArgs[2], 'function');
});

test('dev-server module respects a custom PORT environment variable', async () => {
  const originalCreateServer = http.createServer;
  const originalPort = process.env.PORT;
  process.env.PORT = '4321';
  let listenArgs;
  http.createServer = (requestListener) => {
    http.createServer = originalCreateServer;
    return {
      listen(...args) {
        listenArgs = args;
        return this;
      },
    };
  };

  try {
    const url = `${pathToFileURL(serverScriptPath).href}?t=${Date.now()}-${Math.random()}`;
    await import(url);
  } finally {
    http.createServer = originalCreateServer;
    if (originalPort === undefined) delete process.env.PORT;
    else process.env.PORT = originalPort;
  }

  assert.equal(listenArgs[0], '4321');
});

test('dev-server handler serves /index.html directly with the text/html content type', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/index.html' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/html');
  assert.match(bodyText(res), /<div id="root"><\/div>/);
});

test('dev-server handler responds with 404 when the request URL cannot be parsed', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: 'http://[invalid' }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body, 'Not found');
});

test('dev-server handler ignores URL fragments when resolving the requested file', async () => {
  const handler = await loadRequestHandler();
  const res = createMockResponse();

  await handler({ url: '/src/styles.css#section' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/css');
});