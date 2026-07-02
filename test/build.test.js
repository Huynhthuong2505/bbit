import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, rm, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const buildScript = join(repoRoot, 'scripts', 'build.mjs');
const distDir = join(repoRoot, 'dist');

describe('scripts/build.mjs', () => {
  after(async () => {
    // Keep the repo clean regardless of test outcome.
    await rm(distDir, { recursive: true, force: true });
  });

  test('builds a dist/ directory mirroring index.html and src/', async () => {
    // Guard against a stale dist/ directory affecting assertions.
    await rm(distDir, { recursive: true, force: true });

    const result = spawnSync(process.execPath, [buildScript], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, `build.mjs exited with status ${result.status}: ${result.stderr}`);
    assert.match(result.stdout, /Built static AI Coding Workspace into dist\//);

    assert.ok(existsSync(join(distDir, 'index.html')));
    assert.ok(existsSync(join(distDir, 'src', 'main.js')));
    assert.ok(existsSync(join(distDir, 'src', 'styles.css')));
    assert.ok(existsSync(join(distDir, 'src', 'workspace-data.js')));

    const [sourceIndex, builtIndex] = await Promise.all([
      readFile(join(repoRoot, 'index.html'), 'utf8'),
      readFile(join(distDir, 'index.html'), 'utf8'),
    ]);
    assert.equal(builtIndex, sourceIndex);

    const [sourceMain, builtMain] = await Promise.all([
      readFile(join(repoRoot, 'src', 'main.js'), 'utf8'),
      readFile(join(distDir, 'src', 'main.js'), 'utf8'),
    ]);
    assert.equal(builtMain, sourceMain);

    const [sourceCss, builtCss] = await Promise.all([
      readFile(join(repoRoot, 'src', 'styles.css'), 'utf8'),
      readFile(join(distDir, 'src', 'styles.css'), 'utf8'),
    ]);
    assert.equal(builtCss, sourceCss);
  });

  test('is idempotent when run twice in a row', () => {
    const first = spawnSync(process.execPath, [buildScript], { cwd: repoRoot, encoding: 'utf8' });
    const second = spawnSync(process.execPath, [buildScript], { cwd: repoRoot, encoding: 'utf8' });

    assert.equal(first.status, 0);
    assert.equal(second.status, 0);
    assert.ok(existsSync(join(distDir, 'index.html')));
  });

  test('fails with a non-zero exit code when required source files are missing', async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), 'ai-workspace-build-'));
    try {
      const result = spawnSync(process.execPath, [buildScript], {
        cwd: emptyDir,
        encoding: 'utf8',
      });

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /ENOENT/);
      assert.match(result.stderr, /index\.html/);
      assert.ok(!existsSync(join(emptyDir, 'dist')));
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
  });
});