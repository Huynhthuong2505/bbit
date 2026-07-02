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

test('providers contains 8 unique entries with name, models and a hex accent color', () => {
  assert.equal(providers.length, 8);
  const names = providers.map((p) => p.name);
  assert.equal(new Set(names).size, names.length, 'provider names should be unique');
  for (const provider of providers) {
    assert.equal(typeof provider.name, 'string');
    assert.ok(provider.name.length > 0);
    assert.equal(typeof provider.models, 'string');
    assert.ok(provider.models.length > 0);
    assert.match(provider.accent, /^#[0-9a-f]{6}$/i, `accent "${provider.accent}" should be a hex color`);
  }
});

test('providers includes the documented AI providers', () => {
  const names = providers.map((p) => p.name);
  assert.deepEqual(names, [
    'OpenAI',
    'Anthropic',
    'Google AI',
    'OpenRouter',
    'Groq',
    'DeepSeek',
    'Mistral AI',
    'Ollama',
  ]);
});

test('files lists exactly one active file (App.tsx)', () => {
  assert.equal(files.length, 6);
  const active = files.filter((file) => file.active);
  assert.equal(active.length, 1);
  assert.equal(active[0].name, 'src/App.tsx');
  for (const file of files) {
    assert.equal(typeof file.name, 'string');
    assert.equal(typeof file.icon, 'string');
  }
});

test('promptTemplates is a list of unique, non-empty strings', () => {
  assert.equal(promptTemplates.length, 8);
  assert.equal(new Set(promptTemplates).size, promptTemplates.length);
  for (const template of promptTemplates) {
    assert.equal(typeof template, 'string');
    assert.ok(template.length > 0);
  }
  assert.ok(promptTemplates.includes('Landing Page'));
  assert.ok(promptTemplates.includes('Ecommerce'));
});

test('plugins is a list of unique, non-empty strings', () => {
  assert.equal(plugins.length, 9);
  assert.equal(new Set(plugins).size, plugins.length);
  assert.ok(plugins.includes('GitHub'));
  assert.ok(plugins.includes('SSH'));
});

test('deployTargets matches the documented deployment providers', () => {
  assert.deepEqual(deployTargets, ['Vercel', 'Netlify', 'Cloudflare Workers']);
});

test('modelComparison has a model and summary for each entry', () => {
  assert.equal(modelComparison.length, 3);
  for (const entry of modelComparison) {
    assert.equal(typeof entry.model, 'string');
    assert.ok(entry.model.length > 0);
    assert.equal(typeof entry.summary, 'string');
    assert.ok(entry.summary.length > 0);
  }
  assert.deepEqual(
    modelComparison.map((entry) => entry.model),
    ['Claude 4', 'GPT-5.5', 'Gemini 2.5 Pro'],
  );
});

test('sampleCode is a non-empty string with the expected shape', () => {
  assert.equal(typeof sampleCode, 'string');
  assert.match(sampleCode, /^import \{ AIWorkspace \} from '@bbit\/workspace';/);
  assert.match(sampleCode, /<AIWorkspace/);
  assert.match(sampleCode, /editor="monaco"/);
  assert.equal(sampleCode.split('\n').length, 12);
});