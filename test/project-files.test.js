import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

describe('package.json', () => {
  let pkg;

  before(async () => {
    const raw = await readFile(join(repoRoot, 'package.json'), 'utf8');
    pkg = JSON.parse(raw);
  });

  test('is valid JSON with the expected identity fields', () => {
    assert.equal(pkg.name, 'ai-coding-workspace');
    assert.equal(pkg.version, '0.1.0');
    assert.equal(pkg.private, true);
    assert.equal(pkg.type, 'module');
  });

  test('exposes dev, build and preview scripts backed by the local scripts/ files', () => {
    assert.equal(pkg.scripts.dev, 'node scripts/dev-server.mjs');
    assert.equal(pkg.scripts.build, 'node scripts/build.mjs');
    assert.equal(pkg.scripts.preview, 'node scripts/dev-server.mjs');
  });
});

describe('index.html', () => {
  let html;

  before(async () => {
    html = await readFile(join(repoRoot, 'index.html'), 'utf8');
  });

  test('declares an HTML5 doctype and UTF-8 charset', () => {
    assert.match(html, /^<!doctype html>/i);
    assert.match(html, /<meta charset="UTF-8" \/>/);
  });

  test('sets the expected document title', () => {
    assert.match(html, /<title>AI Coding Workspace<\/title>/);
  });

  test('has a #root mount element', () => {
    assert.match(html, /<div id="root"><\/div>/);
  });

  test('loads src/main.js as an ES module', () => {
    assert.match(html, /<script type="module" src="\/src\/main\.js"><\/script>/);
  });

  test('mount point appears before the module script tag', () => {
    const rootIndex = html.indexOf('id="root"');
    const scriptIndex = html.indexOf('src="/src/main.js"');
    assert.ok(rootIndex > -1 && scriptIndex > -1);
    assert.ok(rootIndex < scriptIndex);
  });
});

describe('.gitignore', () => {
  let gitignore;

  before(async () => {
    gitignore = await readFile(join(repoRoot, '.gitignore'), 'utf8');
  });

  test('ignores the build output directory', () => {
    assert.match(gitignore, /(^|\n)dist\/(\n|$)/);
  });

  test('has a comment documenting the build output entry', () => {
    assert.match(gitignore, /# Build output\ndist\//);
  });
});

describe('README.md', () => {
  let readme;

  before(async () => {
    readme = await readFile(join(repoRoot, 'README.md'), 'utf8');
  });

  test('has the project title heading', () => {
    assert.match(readme, /^# AI Coding Workspace/);
  });

  test('documents the local development commands', () => {
    assert.match(readme, /## Local development/);
    assert.match(readme, /npm install/);
    assert.match(readme, /npm run dev/);
  });

  test('documents the build command', () => {
    assert.match(readme, /## Build/);
    assert.match(readme, /npm run build/);
  });

  test('lists the product pillars section', () => {
    assert.match(readme, /## Product pillars/);
    assert.match(readme, /\*\*AI Hub:\*\*/);
    assert.match(readme, /\*\*Model comparison:\*\*/);
  });
});