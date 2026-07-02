import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildScript = path.join(repoRoot, 'scripts/build.mjs');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aicw-build-'));
}

function runBuild(cwd) {
  return execFileSync(process.execPath, [buildScript], { cwd, encoding: 'utf8' });
}

test('copies index.html and the src directory into dist/', () => {
  const tmpDir = makeTempDir();
  try {
    fs.copyFileSync(path.join(repoRoot, 'index.html'), path.join(tmpDir, 'index.html'));
    fs.cpSync(path.join(repoRoot, 'src'), path.join(tmpDir, 'src'), { recursive: true });

    const output = runBuild(tmpDir);

    assert.match(output, /Built static AI Coding Workspace into dist\//);
    assert.equal(
      fs.readFileSync(path.join(tmpDir, 'dist', 'index.html'), 'utf8'),
      fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8'),
    );
    for (const file of ['main.js', 'styles.css', 'workspace-data.js']) {
      assert.equal(
        fs.readFileSync(path.join(tmpDir, 'dist', 'src', file), 'utf8'),
        fs.readFileSync(path.join(repoRoot, 'src', file), 'utf8'),
        `expected dist/src/${file} to match the source file`,
      );
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('recursively copies nested directories inside src/', () => {
  const tmpDir = makeTempDir();
  try {
    fs.copyFileSync(path.join(repoRoot, 'index.html'), path.join(tmpDir, 'index.html'));
    fs.cpSync(path.join(repoRoot, 'src'), path.join(tmpDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src', 'nested'));
    fs.writeFileSync(path.join(tmpDir, 'src', 'nested', 'extra.txt'), 'nested-content');

    runBuild(tmpDir);

    assert.equal(
      fs.readFileSync(path.join(tmpDir, 'dist', 'src', 'nested', 'extra.txt'), 'utf8'),
      'nested-content',
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('overwrites an existing dist/ directory on rebuild', () => {
  const tmpDir = makeTempDir();
  try {
    fs.copyFileSync(path.join(repoRoot, 'index.html'), path.join(tmpDir, 'index.html'));
    fs.cpSync(path.join(repoRoot, 'src'), path.join(tmpDir, 'src'), { recursive: true });

    runBuild(tmpDir);
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.js'), '// changed');
    runBuild(tmpDir);

    assert.equal(fs.readFileSync(path.join(tmpDir, 'dist', 'src', 'main.js'), 'utf8'), '// changed');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('fails without creating dist/ when index.html is missing', () => {
  const tmpDir = makeTempDir();
  try {
    fs.mkdirSync(path.join(tmpDir, 'src'));
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.js'), '');
    fs.writeFileSync(path.join(tmpDir, 'src', 'styles.css'), '');

    assert.throws(() => execFileSync(process.execPath, [buildScript], { cwd: tmpDir, stdio: 'pipe' }));
    assert.equal(fs.existsSync(path.join(tmpDir, 'dist')), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('fails when required src files are missing', () => {
  const tmpDir = makeTempDir();
  try {
    fs.copyFileSync(path.join(repoRoot, 'index.html'), path.join(tmpDir, 'index.html'));
    fs.mkdirSync(path.join(tmpDir, 'src'));
    // Intentionally omit src/main.js and src/styles.css.

    assert.throws(() => execFileSync(process.execPath, [buildScript], { cwd: tmpDir, stdio: 'pipe' }));
    assert.equal(fs.existsSync(path.join(tmpDir, 'dist')), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});