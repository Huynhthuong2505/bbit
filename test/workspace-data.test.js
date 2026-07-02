import { test, describe } from 'node:test';
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

describe('workspace-data providers', () => {
  test('exposes an array of provider entries', () => {
    assert.ok(Array.isArray(providers));
    assert.equal(providers.length, 8);
  });

  test('each provider has a name, models description, and hex accent color', () => {
    for (const provider of providers) {
      assert.equal(typeof provider.name, 'string');
      assert.ok(provider.name.length > 0);
      assert.equal(typeof provider.models, 'string');
      assert.ok(provider.models.length > 0);
      assert.match(provider.accent, /^#[0-9a-fA-F]{6}$/);
    }
  });

  test('includes the expected provider names in order', () => {
    assert.deepEqual(
      providers.map((provider) => provider.name),
      ['OpenAI', 'Anthropic', 'Google AI', 'OpenRouter', 'Groq', 'DeepSeek', 'Mistral AI', 'Ollama'],
    );
  });

  test('does not contain duplicate provider names', () => {
    const names = providers.map((provider) => provider.name);
    assert.equal(new Set(names).size, names.length);
  });
});

describe('workspace-data files', () => {
  test('exposes exactly six explorer entries', () => {
    assert.ok(Array.isArray(files));
    assert.equal(files.length, 6);
  });

  test('each file entry has a name and icon', () => {
    for (const file of files) {
      assert.equal(typeof file.name, 'string');
      assert.ok(file.name.length > 0);
      assert.equal(typeof file.icon, 'string');
      assert.ok(file.icon.length > 0);
    }
  });

  test('marks exactly one file as active: src/App.tsx', () => {
    const activeFiles = files.filter((file) => file.active === true);
    assert.equal(activeFiles.length, 1);
    assert.equal(activeFiles[0].name, 'src/App.tsx');
  });
});

describe('workspace-data pill lists', () => {
  test('promptTemplates lists the expected product templates', () => {
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

  test('plugins lists the expected marketplace integrations', () => {
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

  test('deployTargets lists the expected deployment providers', () => {
    assert.deepEqual(deployTargets, ['Vercel', 'Netlify', 'Cloudflare Workers']);
  });

  test('promptTemplates and plugins contain only non-empty strings', () => {
    for (const item of [...promptTemplates, ...plugins, ...deployTargets]) {
      assert.equal(typeof item, 'string');
      assert.ok(item.length > 0);
    }
  });
});

describe('workspace-data modelComparison', () => {
  test('exposes three model comparison entries', () => {
    assert.ok(Array.isArray(modelComparison));
    assert.equal(modelComparison.length, 3);
  });

  test('each entry has a model name and a summary', () => {
    for (const entry of modelComparison) {
      assert.equal(typeof entry.model, 'string');
      assert.ok(entry.model.length > 0);
      assert.equal(typeof entry.summary, 'string');
      assert.ok(entry.summary.length > 0);
    }
  });

  test('includes the expected model names', () => {
    assert.deepEqual(
      modelComparison.map((entry) => entry.model),
      ['Claude 4', 'GPT-5.5', 'Gemini 2.5 Pro'],
    );
  });
});

describe('workspace-data sampleCode', () => {
  test('is a non-empty string', () => {
    assert.equal(typeof sampleCode, 'string');
    assert.ok(sampleCode.length > 0);
  });

  test('contains characters that require HTML escaping (< and >)', () => {
    assert.ok(sampleCode.includes('<AIWorkspace'));
    assert.ok(sampleCode.includes('/>'));
  });

  test('spans multiple lines', () => {
    const lines = sampleCode.split('\n');
    assert.ok(lines.length > 1);
  });
});