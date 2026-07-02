import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

describe('package.json "test" script', () => {
  test('runs node --test against the test/ directory', async () => {
    const pkg = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts.test, 'node --test test/');
  });

  test('no longer references the old tests/ directory', async () => {
    const pkg = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'));
    assert.doesNotMatch(pkg.scripts.test, /\btests\//);
  });

  test('the test/ directory referenced by the script exists and contains test files', async () => {
    const entries = await readdir(join(repoRoot, 'test'));
    const testFiles = entries.filter((name) => name.endsWith('.test.js'));
    assert.ok(testFiles.length > 0, 'expected at least one *.test.js file in test/');
    for (const expected of ['build.test.js', 'dev-server.test.js', 'main.test.js', 'workspace-data.test.js']) {
      assert.ok(testFiles.includes(expected), `expected test/ to include ${expected}`);
    }
  });

  test('leaves the other npm scripts untouched', async () => {
    const pkg = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts.dev, 'node scripts/dev-server.mjs');
    assert.equal(pkg.scripts.build, 'node scripts/build.mjs');
    assert.equal(pkg.scripts.preview, 'node scripts/dev-server.mjs');
  });
});