import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const buildScript = fileURLToPath(new URL('../scripts/build.mjs', import.meta.url));

async function createTempProject() {
  return mkdtemp(join(tmpdir(), 'aicw-build-'));
}

async function writeFixtureFiles(dir) {
  await writeFile(join(dir, 'index.html'), '<html><body>fixture</body></html>');
  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(join(dir, 'src', 'main.js'), "console.log('main');");
  await writeFile(join(dir, 'src', 'styles.css'), 'body { color: red; }');
}

function runBuild(cwd) {
  return spawnSync(process.execPath, [buildScript], { cwd, encoding: 'utf8' });
}

async function pathExists(path) {
  return stat(path).then(() => true).catch(() => false);
}

test('build.mjs copies index.html and src assets into dist/', async () => {
  const dir = await createTempProject();
  try {
    await writeFixtureFiles(dir);
    const result = runBuild(dir);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Built static AI Coding Workspace into dist\//);

    assert.equal(await readFile(join(dir, 'dist', 'index.html'), 'utf8'), '<html><body>fixture</body></html>');
    assert.equal(await readFile(join(dir, 'dist', 'src', 'main.js'), 'utf8'), "console.log('main');");
    assert.equal(await readFile(join(dir, 'dist', 'src', 'styles.css'), 'utf8'), 'body { color: red; }');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('build.mjs recursively copies nested directories inside src/', async () => {
  const dir = await createTempProject();
  try {
    await writeFixtureFiles(dir);
    await mkdir(join(dir, 'src', 'nested'), { recursive: true });
    await writeFile(join(dir, 'src', 'nested', 'deep.js'), 'export const deep = true;');

    const result = runBuild(dir);
    assert.equal(result.status, 0, result.stderr);

    assert.equal(await readFile(join(dir, 'dist', 'src', 'nested', 'deep.js'), 'utf8'), 'export const deep = true;');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('build.mjs fails fast and does not create dist/ when index.html is missing', async () => {
  const dir = await createTempProject();
  try {
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(join(dir, 'src', 'main.js'), "console.log('main');");
    await writeFile(join(dir, 'src', 'styles.css'), 'body {}');

    const result = runBuild(dir);

    assert.notEqual(result.status, 0);
    assert.equal(await pathExists(join(dir, 'dist')), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('build.mjs fails fast when src/styles.css is missing', async () => {
  const dir = await createTempProject();
  try {
    await writeFile(join(dir, 'index.html'), '<html></html>');
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(join(dir, 'src', 'main.js'), "console.log('main');");

    const result = runBuild(dir);

    assert.notEqual(result.status, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('build.mjs is idempotent when dist/ already exists from a previous run', async () => {
  const dir = await createTempProject();
  try {
    await writeFixtureFiles(dir);
    const first = runBuild(dir);
    assert.equal(first.status, 0, first.stderr);

    await writeFile(join(dir, 'src', 'main.js'), "console.log('updated');");
    const second = runBuild(dir);
    assert.equal(second.status, 0, second.stderr);

    assert.equal(await readFile(join(dir, 'dist', 'src', 'main.js'), 'utf8'), "console.log('updated');");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});