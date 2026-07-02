import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  providers,
  files,
  promptTemplates,
  plugins,
  deployTargets,
  modelComparison,
  sampleCode,
} from '../src/workspace-data.js';

// src/main.js is written for a browser environment and mutates
// `document.getElementById('root').innerHTML` as a top-level side effect.
// We stub out just enough of the DOM API before importing the module so we
// can inspect the HTML string it produces.
let rootElement;

before(async () => {
  rootElement = { innerHTML: '' };
  globalThis.document = {
    getElementById(id) {
      assert.equal(id, 'root');
      return rootElement;
    },
  };

  await import('../src/main.js');
});

describe('main.js rendering', () => {
  test('renders into the #root element', () => {
    assert.equal(typeof rootElement.innerHTML, 'string');
    assert.ok(rootElement.innerHTML.length > 0);
  });

  test('renders the top-level app shell and brand', () => {
    assert.match(rootElement.innerHTML, /class="app-shell"/);
    assert.match(rootElement.innerHTML, /AI Coding Workspace/);
  });

  test('renders the workspace preview card with explorer files', () => {
    for (const file of files) {
      assert.ok(
        rootElement.innerHTML.includes(file.name),
        `expected rendered HTML to include file name ${file.name}`
      );
      assert.ok(
        rootElement.innerHTML.includes(file.icon),
        `expected rendered HTML to include file icon ${file.icon}`
      );
    }
  });

  test('marks the active file with the active class', () => {
    const activeFile = files.find((file) => file.active);
    const activeFileMarkup = `<div class="file active"><span>${activeFile.icon}</span>${activeFile.name}</div>`;
    assert.ok(rootElement.innerHTML.includes(activeFileMarkup));
  });

  test('renders every provider name inside the provider grid', () => {
    for (const provider of providers) {
      assert.ok(rootElement.innerHTML.includes(provider.name));
      assert.ok(rootElement.innerHTML.includes(provider.models));
      assert.ok(rootElement.innerHTML.includes(`style="--accent:${provider.accent}"`));
    }
  });

  test('marks the first provider card as active', () => {
    const firstProviderMarkup = `class="provider-card active" style="--accent:${providers[0].accent}"`;
    assert.ok(rootElement.innerHTML.includes(firstProviderMarkup));
  });

  test('does not mark subsequent provider cards as active', () => {
    for (const provider of providers.slice(1)) {
      const inactiveMarkup = `class="provider-card active" style="--accent:${provider.accent}"`;
      assert.ok(!rootElement.innerHTML.includes(inactiveMarkup));
    }
  });

  test('renders every model comparison entry', () => {
    for (const entry of modelComparison) {
      assert.ok(rootElement.innerHTML.includes(entry.model));
      assert.ok(rootElement.innerHTML.includes(entry.summary));
    }
  });

  test('renders prompt templates and plugins as pills', () => {
    for (const template of promptTemplates) {
      assert.ok(rootElement.innerHTML.includes(`<span>${template}</span>`));
    }
    for (const plugin of plugins) {
      assert.ok(rootElement.innerHTML.includes(`<span>${plugin}</span>`));
    }
  });

  test('renders deploy targets as deploy items', () => {
    for (const target of deployTargets) {
      assert.ok(rootElement.innerHTML.includes(`<div class="deploy-item">✅ ${target}</div>`));
    }
  });

  test('renders the sample code, escaped for HTML', () => {
    assert.match(rootElement.innerHTML, /class="monaco-mock"/);
    // sampleCode contains raw `<AIWorkspace ...>` JSX which must be escaped.
    assert.ok(!rootElement.innerHTML.includes('<AIWorkspace'));
    assert.ok(rootElement.innerHTML.includes('&lt;AIWorkspace'));
  });

  test('renders one line-number span per line of sample code', () => {
    const lineCount = sampleCode.split('\n').length;
    for (let i = 1; i <= lineCount; i += 1) {
      assert.ok(rootElement.innerHTML.includes(`<span>${i}</span>`));
    }
  });

  test('renders the six capability cards', () => {
    const capabilityTitles = [
      'Monaco Editor',
      'AI Chat',
      'Agent Mode',
      'GitHub Workflow',
      'Live Preview',
      'Plugin Marketplace',
    ];
    for (const title of capabilityTitles) {
      assert.ok(rootElement.innerHTML.includes(`<h3>${title}</h3>`));
    }
  });
});