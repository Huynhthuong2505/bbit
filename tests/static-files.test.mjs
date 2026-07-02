import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { providers, deployTargets } from '../src/workspace-data.js';

const resolve = (relativePath) => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));

test('index.html declares the app root and the module entry script', async () => {
  const html = await readFile(resolve('index.html'), 'utf8');
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<meta charset="UTF-8" \/>/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1\.0" \/>/);
  assert.match(html, /<title>AI Coding Workspace<\/title>/);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /<script type="module" src="\/src\/main\.js"><\/script>/);
});

test('package.json defines expected metadata and npm scripts', async () => {
  const raw = await readFile(resolve('package.json'), 'utf8');
  const pkg = JSON.parse(raw);

  assert.equal(pkg.name, 'ai-coding-workspace');
  assert.equal(pkg.version, '0.1.0');
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.scripts.dev, 'node scripts/dev-server.mjs');
  assert.equal(pkg.scripts.build, 'node scripts/build.mjs');
  assert.equal(pkg.scripts.preview, 'node scripts/dev-server.mjs');
});

test('package.json defines a test script that runs the node test runner against tests/', async () => {
  const raw = await readFile(resolve('package.json'), 'utf8');
  const pkg = JSON.parse(raw);

  assert.equal(pkg.scripts.test, 'node --test "tests/**/*.test.mjs"');
  assert.match(pkg.scripts.test, /^node --test /);
  assert.match(pkg.scripts.test, /tests\/\*\*\/\*\.test\.mjs/);
});

test('.gitignore excludes the build output directory', async () => {
  const content = await readFile(resolve('.gitignore'), 'utf8');
  assert.match(content, /(^|\n)dist\/(\n|$)/);
  // pre-existing entries should still be present
  assert.match(content, /__pycache__\//);
});

test('src/styles.css has balanced braces and defines the new workspace selectors', async () => {
  const css = await readFile(resolve('src/styles.css'), 'utf8');

  const openBraces = (css.match(/{/g) || []).length;
  const closeBraces = (css.match(/}/g) || []).length;
  assert.equal(openBraces, closeBraces, 'styles.css should have balanced braces');

  for (const selector of ['.workspace-card', '.monaco-mock', '.capability-grid', '.provider-card.active', '.marketplace']) {
    assert.ok(css.includes(selector), `expected styles.css to include selector ${selector}`);
  }

  assert.match(css, /@media \(max-width: 1100px\)/);
  assert.match(css, /@media \(max-width: 720px\)/);
});

test('README.md documents the product pillars and local dev/build commands', async () => {
  const readme = await readFile(resolve('README.md'), 'utf8');

  assert.match(readme, /^# AI Coding Workspace/m);
  assert.match(readme, /## Product pillars/);
  assert.match(readme, /## Local development/);
  assert.match(readme, /## Build/);
  assert.match(readme, /npm install/);
  assert.match(readme, /npm run dev/);
  assert.match(readme, /npm run build/);

  for (const pillar of [
    'AI Hub',
    'Monaco workspace',
    'Agent mode',
    'GitHub workflow',
    'Live preview and deployment',
    'Prompt and plugin marketplace',
    'Model comparison',
  ]) {
    assert.ok(readme.includes(pillar), `expected README.md to mention "${pillar}"`);
  }
});

test('index.html declares a lang attribute on the root html element', async () => {
  const html = await readFile(resolve('index.html'), 'utf8');
  assert.match(html, /<html lang="en">/);
});

test('README.md stays in sync with the deploy targets defined in src/workspace-data.js', async () => {
  const readme = await readFile(resolve('README.md'), 'utf8');
  for (const target of deployTargets) {
    assert.ok(readme.includes(target), `expected README.md to mention deploy target "${target}"`);
  }
});

test('README.md stays in sync with the AI providers defined in src/workspace-data.js', async () => {
  const readme = await readFile(resolve('README.md'), 'utf8');
  for (const provider of providers) {
    // README refers to "Google AI/Gemini" and "local Ollama" rather than the exact
    // provider.name strings, so check on the distinctive brand token instead.
    const token = provider.name.split(' ')[0];
    assert.ok(readme.includes(token), `expected README.md to mention provider "${token}"`);
  }
});