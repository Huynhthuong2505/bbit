import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const buildScript = join(repoRoot, 'scripts', 'build.mjs');

function runBuild(cwd) {
  return spawnSync(process.execPath, [buildScript], { cwd, encoding: 'utf8' });
}

describe('scripts/build.mjs against the real project', () => {
  const distDir = join(repoRoot, 'dist');

  after(async () => {
    await rm(distDir, { recursive: true, force: true });
  });

  test('copies index.html and src/* into dist/ and logs a success message', async () => {
    const result = runBuild(repoRoot);

    assert.equal(result.status, 0, `build script exited with status ${result.status}: ${result.stderr}`);
    assert.match(result.stdout, /Built static AI Coding Workspace into dist\//);

    const [sourceIndex, distIndex] = await Promise.all([
      readFile(join(repoRoot, 'index.html'), 'utf8'),
      readFile(join(distDir, 'index.html'), 'utf8'),
    ]);
    assert.equal(distIndex, sourceIndex);

    const [sourceMain, distMain] = await Promise.all([
      readFile(join(repoRoot, 'src', 'main.js'), 'utf8'),
      readFile(join(distDir, 'src', 'main.js'), 'utf8'),
    ]);
    assert.equal(distMain, sourceMain);

    const [sourceStyles, distStyles] = await Promise.all([
      readFile(join(repoRoot, 'src', 'styles.css'), 'utf8'),
      readFile(join(distDir, 'src', 'styles.css'), 'utf8'),
    ]);
    assert.equal(distStyles, sourceStyles);

    const [sourceData, distData] = await Promise.all([
      readFile(join(repoRoot, 'src', 'workspace-data.js'), 'utf8'),
      readFile(join(distDir, 'src', 'workspace-data.js'), 'utf8'),
    ]);
    assert.equal(distData, sourceData);
  });

  test('is safe to run twice in a row (idempotent, mkdir recursive)', () => {
    const first = runBuild(repoRoot);
    const second = runBuild(repoRoot);
    assert.equal(first.status, 0);
    assert.equal(second.status, 0);
  });
});

describe('scripts/build.mjs against a scratch project', () => {
  test('recursively copies nested directories under src/ into dist/', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'aicw-build-'));
    try {
      await writeFile(join(tempDir, 'index.html'), '<html>scratch</html>');
      await mkdir(join(tempDir, 'src', 'nested'), { recursive: true });
      await writeFile(join(tempDir, 'src', 'main.js'), 'console.log("main");');
      await writeFile(join(tempDir, 'src', 'styles.css'), 'body { margin: 0; }');
      await writeFile(join(tempDir, 'src', 'nested', 'deep.js'), 'export const x = 1;');

      const result = runBuild(tempDir);

      assert.equal(result.status, 0, `build script exited with status ${result.status}: ${result.stderr}`);

      const deepFile = await readFile(join(tempDir, 'dist', 'src', 'nested', 'deep.js'), 'utf8');
      assert.equal(deepFile, 'export const x = 1;');

      const indexFile = await readFile(join(tempDir, 'dist', 'index.html'), 'utf8');
      assert.equal(indexFile, '<html>scratch</html>');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test('fails with a non-zero exit code when required source files are missing', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'aicw-build-missing-'));
    try {
      const result = runBuild(tempDir);

      assert.notEqual(result.status, 0);
      await assert.rejects(access(join(tempDir, 'dist')));
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test('fails when index.html exists but src/styles.css is missing', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'aicw-build-partial-'));
    try {
      await writeFile(join(tempDir, 'index.html'), '<html></html>');
      await mkdir(join(tempDir, 'src'), { recursive: true });
      await writeFile(join(tempDir, 'src', 'main.js'), '// main');

      const result = runBuild(tempDir);

      assert.notEqual(result.status, 0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});