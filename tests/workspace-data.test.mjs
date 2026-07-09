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

test('provider accent colors are all unique', () => {
  assert.equal(new Set(providers.map((p) => p.accent)).size, providers.length);
});

test('only the designated file entry is marked active; all others omit or falsy the active flag', () => {
  const nonActiveEntries = files.filter((file) => file.name !== 'src/App.tsx');
  assert.equal(nonActiveEntries.length, files.length - 1);
  for (const file of nonActiveEntries) {
    assert.notEqual(file.active, true, `expected ${file.name} to not be marked active`);
  }
});

test('sampleCode declares the expected agent mode capabilities and live preview frameworks', () => {
  assert.match(sampleCode, /agentMode=\{\{ canWriteFiles: true, canRunBuilds: true, canCommit: true \}\}/);
  assert.match(sampleCode, /providers=\{\["openai", "anthropic", "gemini", "openrouter"\]\}/);
  for (const framework of ['React', 'Vue', 'Next.js', 'Vite']) {
    assert.ok(sampleCode.includes(framework), `expected sampleCode to list the ${framework} framework`);
  }
});