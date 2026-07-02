import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  providers,
  files,
  promptTemplates,
  plugins,
  deployTargets,
  modelComparison,
  sampleCode,
} from '../src/workspace-data.js';

const mainScriptPath = fileURLToPath(new URL('../src/main.js', import.meta.url));

// src/main.js is a script with a module-level side effect: it grabs
// document.getElementById('root') and sets its innerHTML. There is no DOM
// available under node:test, so we stub the minimal `document` API the
// script relies on and re-import the module fresh for each test (a unique
// query string forces Node's ESM loader to re-evaluate the module).
function stubDocument(rootExists = true) {
  const rootElement = { innerHTML: '' };
  globalThis.document = {
    getElementById(id) {
      if (id === 'root' && rootExists) return rootElement;
      return null;
    },
  };
  return rootElement;
}

async function renderMain(rootExists = true) {
  const rootElement = stubDocument(rootExists);
  const url = `${pathToFileURL(mainScriptPath).href}?t=${Date.now()}-${Math.random()}`;
  await import(url);
  return rootElement;
}

afterEach(() => {
  delete globalThis.document;
});

test('renders the hero brand, headline and call-to-actions', async () => {
  const root = await renderMain();
  assert.match(root.innerHTML, /AI Coding Workspace/);
  assert.match(root.innerHTML, /class="hero-grid"/);
  assert.match(root.innerHTML, /Start workspace/);
  assert.match(root.innerHTML, /Compare models/);
});

test('renders a provider card for every configured provider with exactly one active', async () => {
  const root = await renderMain();
  for (const provider of providers) {
    assert.ok(root.innerHTML.includes(`<strong>${provider.name}</strong>`), `missing card for ${provider.name}`);
    assert.ok(root.innerHTML.includes(provider.models));
    assert.ok(root.innerHTML.includes(`--accent:${provider.accent}`));
  }
  const activeCount = (root.innerHTML.match(/provider-card active/g) || []).length;
  assert.equal(activeCount, 1, 'exactly the first provider should be marked active');
});

test('renders the explorer file list with only the active file highlighted', async () => {
  const root = await renderMain();
  for (const file of files) {
    assert.ok(root.innerHTML.includes(file.name), `missing explorer entry for ${file.name}`);
  }
  const activeFileMatches = root.innerHTML.match(/class="file active"/g) || [];
  assert.equal(activeFileMatches.length, 1);
});

test('renders the model comparison grid for every compared model', async () => {
  const root = await renderMain();
  for (const entry of modelComparison) {
    assert.ok(root.innerHTML.includes(`<h4>${entry.model}</h4>`));
    assert.ok(root.innerHTML.includes(entry.summary));
  }
});

test('renders prompt templates and plugins as pill rows', async () => {
  const root = await renderMain();
  for (const template of promptTemplates) {
    assert.ok(root.innerHTML.includes(`<span>${template}</span>`), `missing prompt template pill ${template}`);
  }
  for (const plugin of plugins) {
    assert.ok(root.innerHTML.includes(`<span>${plugin}</span>`), `missing plugin pill ${plugin}`);
  }
});

test('renders every deploy target as a checked deploy item', async () => {
  const root = await renderMain();
  for (const target of deployTargets) {
    assert.ok(root.innerHTML.includes(`<div class="deploy-item">\u2705 ${target}</div>`));
  }
});

test('renders all six capability cards with their titles', async () => {
  const root = await renderMain();
  const capabilityMatches = root.innerHTML.match(/class="capability"/g) || [];
  assert.equal(capabilityMatches.length, 6);
  for (const title of [
    'Monaco Editor',
    'AI Chat',
    'Agent Mode',
    'GitHub Workflow',
    'Live Preview',
    'Plugin Marketplace',
  ]) {
    assert.ok(root.innerHTML.includes(`<h3>${title}</h3>`), `missing capability title ${title}`);
  }
});

test('escapes HTML-sensitive characters in the sample code preview', async () => {
  const root = await renderMain();
  assert.ok(!root.innerHTML.includes(sampleCode), 'raw unescaped sample code should not be embedded');
  assert.ok(root.innerHTML.includes('&lt;AIWorkspace'));
  assert.ok(root.innerHTML.includes('/&gt;'));
  assert.ok(root.innerHTML.includes('&quot;openai&quot;'));
});

test('renders exactly one line-number span per line of sample code', async () => {
  const root = await renderMain();
  const expectedLines = sampleCode.split('\n').length;
  const lineNumberMatches = root.innerHTML.match(/<span>\d+<\/span>/g) || [];
  assert.equal(lineNumberMatches.length, expectedLines);
});

test('renders the agent panel with the default agent prompt and log entries', async () => {
  const root = await renderMain();
  assert.ok(root.innerHTML.includes('AI Agent'));
  assert.ok(root.innerHTML.includes('Run agent'));
  assert.ok(root.innerHTML.includes('Creating folders'));
  assert.ok(root.innerHTML.includes('Committing Git'));
});

test('throws when the #root element is missing from the document', async () => {
  await assert.rejects(() => renderMain(false));
});

test('renders the top navigation bar with docs and sign-in actions', async () => {
  const root = await renderMain();
  assert.match(root.innerHTML, /class="topbar"/);
  assert.match(root.innerHTML, /<button>Docs<\/button>/);
  assert.match(root.innerHTML, /Sign in GitHub/);
});

test('renders the workspace preview with activity bar, editor tabs and terminal', async () => {
  const root = await renderMain();
  assert.match(root.innerHTML, /class="workspace-card"/);
  assert.match(root.innerHTML, /class="activity-bar"/);
  assert.match(root.innerHTML, /<span>App\.tsx<\/span><span>runner\.ts<\/span><span>models\.ts<\/span>/);
  assert.match(root.innerHTML, /class="terminal"/);
  assert.match(root.innerHTML, /npm run build/);
});

test('renders the AI Hub and Model Comparison feature panels with their headings', async () => {
  const root = await renderMain();
  assert.match(root.innerHTML, /<h2>AI Hub đa nhà cung cấp<\/h2>/);
  assert.match(root.innerHTML, /<h2>Model Comparison<\/h2>/);
  assert.match(root.innerHTML, /<h2>Prompt Library<\/h2>/);
  assert.match(root.innerHTML, /<h2>One-click Deployment<\/h2>/);
});

test('escapeHtml only escapes &, <, >, and " in the sample code preview, leaving single quotes untouched', async () => {
  const root = await renderMain();
  // Documents the current (narrow) escaping scope of escapeHtml in src/main.js:
  // apostrophes used around import specifiers are passed through verbatim.
  assert.ok(root.innerHTML.includes("from '@bbit/workspace';"), 'expected raw single-quoted import to remain unescaped');
  assert.ok(!root.innerHTML.includes('&#39;') && !root.innerHTML.includes('&apos;'), 'single quotes should not be HTML-entity encoded');
});