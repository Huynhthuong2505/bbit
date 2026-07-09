import test from 'node:test';
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

test('providers lists all supported AI providers with accent colors', () => {
  assert.equal(providers.length, 8);
  assert.deepEqual(
    providers.map((p) => p.name),
    ['OpenAI', 'Anthropic', 'Google AI', 'OpenRouter', 'Groq', 'DeepSeek', 'Mistral AI', 'Ollama'],
  );
  for (const provider of providers) {
    assert.equal(typeof provider.name, 'string');
    assert.equal(typeof provider.models, 'string');
    assert.match(provider.accent, /^#[0-9a-f]{6}$/i);
  }
});

test('files lists workspace explorer entries with exactly one active file', () => {
  assert.equal(files.length, 6);
  for (const file of files) {
    assert.equal(typeof file.name, 'string');
    assert.equal(typeof file.icon, 'string');
  }
  const activeFiles = files.filter((file) => file.active === true);
  assert.equal(activeFiles.length, 1);
  assert.equal(activeFiles[0].name, 'src/App.tsx');
});

test('promptTemplates contains the marketplace template pills', () => {
  assert.deepEqual(promptTemplates, [
    'Landing Page',
    'Dashboard',
    'SaaS',
    'AI Chatbot',
    'CRM',
    'ERP',
    'Portfolio',
    'Ecommerce',
  ]);
});

test('plugins contains the marketplace integration pills', () => {
  assert.deepEqual(plugins, [
    'GitHub',
    'Docker',
    'Supabase',
    'Firebase',
    'Vercel',
    'Cloudflare',
    'Figma',
    'Database',
    'SSH',
  ]);
});

test('deployTargets contains the supported deployment providers', () => {
  assert.deepEqual(deployTargets, ['Vercel', 'Netlify', 'Cloudflare Workers']);
});

test('modelComparison summarizes results for each compared model', () => {
  assert.equal(modelComparison.length, 3);
  assert.deepEqual(
    modelComparison.map((entry) => entry.model),
    ['Claude 4', 'GPT-5.5', 'Gemini 2.5 Pro'],
  );
  for (const entry of modelComparison) {
    assert.equal(typeof entry.summary, 'string');
    assert.ok(entry.summary.length > 0);
  }
});

test('sampleCode is a well-formed JSX snippet referencing the AIWorkspace component', () => {
  assert.match(sampleCode, /import \{ AIWorkspace \} from '@bbit\/workspace';/);
  assert.match(sampleCode, /<AIWorkspace/);
  assert.match(sampleCode, /export default function App/);

  const openBraces = (sampleCode.match(/\{/g) || []).length;
  const closeBraces = (sampleCode.match(/\}/g) || []).length;
  assert.equal(openBraces, closeBraces, 'sampleCode should have balanced curly braces');
});

test('exported collections are arrays (defensive shape check)', () => {
  for (const value of [providers, files, promptTemplates, plugins, deployTargets, modelComparison]) {
    assert.ok(Array.isArray(value));
  }
  assert.equal(typeof sampleCode, 'string');
});

test('providers use a distinct accent color for each entry', () => {
  const accents = providers.map((p) => p.accent.toLowerCase());
  assert.equal(new Set(accents).size, providers.length, 'expected no two providers to share an accent color');
});

test('providers, files, and modelComparison entries have no duplicate names', () => {
  assert.equal(new Set(providers.map((p) => p.name)).size, providers.length);
  assert.equal(new Set(files.map((f) => f.name)).size, files.length);
  assert.equal(new Set(modelComparison.map((m) => m.model)).size, modelComparison.length);
});

test('promptTemplates, plugins, and deployTargets contain no empty or duplicate pill labels', () => {
  for (const list of [promptTemplates, plugins, deployTargets]) {
    assert.equal(new Set(list).size, list.length, 'expected no duplicate pill labels');
    for (const label of list) {
      assert.equal(typeof label, 'string');
      assert.ok(label.trim().length > 0, 'pill label should not be empty');
    }
  }
});

test('sampleCode has the expected number of lines for the line-numbers gutter', () => {
  // src/main.js renders one <span>N</span> gutter entry per line of sampleCode;
  // pinning the exact line count guards against accidental whitespace/line
  // changes silently shifting the rendered line-numbers gutter.
  assert.equal(sampleCode.split('\n').length, 12);
});

test('provider models, prompt template, plugin and deploy target labels contain no unescaped HTML-sensitive characters', () => {
  // src/main.js interpolates these values directly into innerHTML without
  // escaping, so the data itself must never contain raw &, <, >, or " to
  // avoid breaking markup or enabling injection.
  const unsafe = /[&<>"]/;
  for (const provider of providers) {
    assert.ok(!unsafe.test(provider.name), `provider name "${provider.name}" contains unsafe characters`);
    assert.ok(!unsafe.test(provider.models), `provider models "${provider.models}" contains unsafe characters`);
  }
  for (const list of [promptTemplates, plugins, deployTargets]) {
    for (const label of list) {
      assert.ok(!unsafe.test(label), `label "${label}" contains unsafe characters`);
    }
  }
});

test('only the active file entry defines the "active" property; all others omit it', () => {
  for (const file of files) {
    if (file.name === 'src/App.tsx') {
      assert.equal(file.active, true);
    } else {
      assert.equal(file.active, undefined, `expected "${file.name}" to omit the active property`);
    }
  }
});