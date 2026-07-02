import { test } from 'node:test';
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

// src/main.js renders its markup as a side effect at import time by writing to
// `document.getElementById('root').innerHTML`. We stub out the minimal DOM
// surface it touches so the module can be imported under plain Node.
let capturedHTML = '';
const getElementByIdCalls = [];

globalThis.document = {
  getElementById(id) {
    getElementByIdCalls.push(id);
    return {
      set innerHTML(value) {
        capturedHTML = value;
      },
      get innerHTML() {
        return capturedHTML;
      },
    };
  },
};

await import('../src/main.js');

test('looks up the #root element exactly once', () => {
  assert.deepEqual(getElementByIdCalls, ['root']);
});

test('renders the top level app shell and hero copy', () => {
  assert.match(capturedHTML, /<main class="app-shell">/);
  assert.match(capturedHTML, /✦ AI Coding Workspace/);
  assert.match(capturedHTML, /<button>Docs<\/button>/);
  assert.match(capturedHTML, /🐙 Sign in GitHub/);
  assert.match(capturedHTML, /▶ Start workspace/);
  assert.match(capturedHTML, /▥ Compare models/);
});

test('renders every provider from workspace-data with the first marked active', () => {
  for (const provider of providers) {
    assert.ok(
      capturedHTML.includes(`<strong>${provider.name}</strong><span>${provider.models}</span>`),
      `expected provider card for ${provider.name}`,
    );
    assert.ok(capturedHTML.includes(`--accent:${provider.accent}`));
  }
  const firstCardMarkup = `<button class="provider-card active" style="--accent:${providers[0].accent}">`;
  assert.ok(capturedHTML.includes(firstCardMarkup));
  const secondCardMarkup = `<button class="provider-card " style="--accent:${providers[1].accent}">`;
  assert.ok(capturedHTML.includes(secondCardMarkup));
});

test('renders every file in the explorer, marking the active file', () => {
  for (const file of files) {
    const expectedClass = `file ${file.active ? 'active' : ''}`;
    assert.ok(
      capturedHTML.includes(`<div class="${expectedClass}"><span>${file.icon}</span>${file.name}</div>`),
      `expected explorer entry for ${file.name}`,
    );
  }
});

test('renders prompt templates and plugins as pills', () => {
  for (const template of promptTemplates) {
    assert.ok(capturedHTML.includes(`<span>${template}</span>`), `missing prompt template pill: ${template}`);
  }
  for (const plugin of plugins) {
    assert.ok(capturedHTML.includes(`<span>${plugin}</span>`), `missing plugin pill: ${plugin}`);
  }
});

test('renders deploy targets with a checkmark', () => {
  for (const target of deployTargets) {
    assert.ok(capturedHTML.includes(`<div class="deploy-item">✅ ${target}</div>`));
  }
});

test('renders model comparison entries', () => {
  for (const entry of modelComparison) {
    assert.ok(capturedHTML.includes(`<h4>${entry.model}</h4><p>${entry.summary}</p>`));
  }
});

test('renders the six product capabilities', () => {
  const expectedTitles = [
    'Monaco Editor',
    'AI Chat',
    'Agent Mode',
    'GitHub Workflow',
    'Live Preview',
    'Plugin Marketplace',
  ];
  for (const title of expectedTitles) {
    assert.match(capturedHTML, new RegExp(`<h3>${title}</h3>`));
  }
});

test('renders one line-number span per line of sample code', () => {
  const lineCount = sampleCode.split('\n').length;
  const spanCount = (capturedHTML.match(/<div class="line-numbers">.*?<\/div>/s)?.[0].match(/<span>/g) || []).length;
  assert.equal(spanCount, lineCount);
});

test('escapes HTML-sensitive characters in the sample code preview', () => {
  assert.ok(capturedHTML.includes('&lt;AIWorkspace'));
  assert.ok(capturedHTML.includes('editor=&quot;monaco&quot;'));
  assert.ok(capturedHTML.includes('/&gt;'));
  // The raw, unescaped tag must never appear in the output.
  assert.ok(!capturedHTML.includes('<AIWorkspace'));
});