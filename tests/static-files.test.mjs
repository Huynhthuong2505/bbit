import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

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
  assert.equal(pkg.scripts.test, 'node --test "tests/**/*.test.mjs"');
});

test('package.json test script invokes the built-in node test runner against every test file', async () => {
  const raw = await readFile(resolve('package.json'), 'utf8');
  const pkg = JSON.parse(raw);

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

test('index.html contains exactly one root mount point and one module entry script', async () => {
  const html = await readFile(resolve('index.html'), 'utf8');

  const rootMatches = html.match(/id="root"/g) || [];
  const scriptMatches = html.match(/<script /g) || [];
  assert.equal(rootMatches.length, 1, 'expected exactly one #root element');
  assert.equal(scriptMatches.length, 1, 'expected exactly one entry <script> tag');
});

test('.gitignore excludes the dist/ build output exactly once', async () => {
  const content = await readFile(resolve('.gitignore'), 'utf8');
  const distMatches = content.match(/(^|\n)dist\/(\n|$)/g) || [];
  assert.equal(distMatches.length, 1, 'expected the dist/ entry to appear exactly once');
});

test('README.md lists every product pillar as its own bullet point under "## Product pillars"', async () => {
  const readme = await readFile(resolve('README.md'), 'utf8');

  const pillarsSection = readme.split('## Product pillars')[1]?.split('## Local development')[0] ?? '';
  const bulletLines = pillarsSection.split('\n').filter((line) => line.trim().startsWith('- **'));
  assert.equal(bulletLines.length, 7, 'expected 7 bulleted product pillars');
});

test('README.md wraps the install/dev and build commands in fenced bash code blocks', async () => {
  const readme = await readFile(resolve('README.md'), 'utf8');

  const bashFences = readme.match(/```bash/g) || [];
  const allFences = readme.match(/```/g) || [];
  assert.equal(bashFences.length, 2, 'expected two fenced bash code blocks (dev + build)');
  assert.equal(allFences.length % 2, 0, 'code fences should be balanced (opened and closed)');
});

test('package.json omits a main entry point and dependency fields for this static site', async () => {
  const raw = await readFile(resolve('package.json'), 'utf8');
  const pkg = JSON.parse(raw);

  assert.equal(pkg.main, undefined);
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
});

test('index.html declares an English document language and contains no inline scripts', async () => {
  const html = await readFile(resolve('index.html'), 'utf8');
  assert.match(html, /<html lang="en">/);
  assert.doesNotMatch(html, /<script>/);
});

test('.gitignore does not exclude essential project source paths', async () => {
  const content = await readFile(resolve('.gitignore'), 'utf8');
  const lines = content.split('\n').map((line) => line.trim());
  for (const essential of ['src/', 'index.html', 'package.json', 'scripts/']) {
    assert.ok(!lines.includes(essential), `expected .gitignore to not ignore ${essential}`);
  }
});

test('README.md orders its bash fences as install/dev instructions followed by build instructions', async () => {
  const readme = await readFile(resolve('README.md'), 'utf8');
  const devIndex = readme.indexOf('npm run dev');
  const buildIndex = readme.indexOf('npm run build');
  assert.ok(devIndex > -1 && buildIndex > -1, 'expected both npm run dev and npm run build to be documented');
  assert.ok(devIndex < buildIndex, 'expected the dev instructions to appear before the build instructions');
});