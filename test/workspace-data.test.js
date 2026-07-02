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
  test('is a non-empty array', () => {
    assert.ok(Array.isArray(providers));
    assert.ok(providers.length > 0);
  });

  test('every provider has name, models and a valid hex accent color', () => {
    const hexColor = /^#[0-9a-fA-F]{6}$/;
    for (const provider of providers) {
      assert.equal(typeof provider.name, 'string');
      assert.ok(provider.name.length > 0);
      assert.equal(typeof provider.models, 'string');
      assert.ok(provider.models.length > 0);
      assert.match(provider.accent, hexColor);
    }
  });

  test('provider names are unique', () => {
    const names = providers.map((p) => p.name);
    assert.equal(new Set(names).size, names.length);
  });

  test('includes expected core providers', () => {
    const names = providers.map((p) => p.name);
    for (const expected of ['OpenAI', 'Anthropic', 'Google AI', 'OpenRouter', 'Ollama']) {
      assert.ok(names.includes(expected), `expected providers to include ${expected}`);
    }
  });
});

describe('workspace-data files', () => {
  test('is a non-empty array', () => {
    assert.ok(Array.isArray(files));
    assert.ok(files.length > 0);
  });

  test('every file entry has a name and icon', () => {
    for (const file of files) {
      assert.equal(typeof file.name, 'string');
      assert.ok(file.name.length > 0);
      assert.equal(typeof file.icon, 'string');
      assert.ok(file.icon.length > 0);
    }
  });

  test('exactly one file is marked active', () => {
    const activeFiles = files.filter((file) => file.active === true);
    assert.equal(activeFiles.length, 1);
    assert.equal(activeFiles[0].name, 'src/App.tsx');
  });

  test('file entries without an explicit active flag are not active', () => {
    const inactiveFiles = files.filter((file) => file.name !== 'src/App.tsx');
    for (const file of inactiveFiles) {
      assert.notEqual(file.active, true);
    }
  });
});

describe('workspace-data prompt templates, plugins and deploy targets', () => {
  test('promptTemplates is a non-empty array of strings', () => {
    assert.ok(Array.isArray(promptTemplates));
    assert.ok(promptTemplates.length > 0);
    for (const item of promptTemplates) {
      assert.equal(typeof item, 'string');
    }
  });

  test('plugins is a non-empty array of strings', () => {
    assert.ok(Array.isArray(plugins));
    assert.ok(plugins.length > 0);
    for (const item of plugins) {
      assert.equal(typeof item, 'string');
    }
  });

  test('deployTargets contains the expected hosting providers', () => {
    assert.deepEqual(deployTargets, ['Vercel', 'Netlify', 'Cloudflare Workers']);
  });

  test('promptTemplates and plugins entries are unique', () => {
    assert.equal(new Set(promptTemplates).size, promptTemplates.length);
    assert.equal(new Set(plugins).size, plugins.length);
  });
});

describe('workspace-data modelComparison', () => {
  test('is a non-empty array', () => {
    assert.ok(Array.isArray(modelComparison));
    assert.ok(modelComparison.length > 0);
  });

  test('every entry has a model name and a summary string', () => {
    for (const entry of modelComparison) {
      assert.equal(typeof entry.model, 'string');
      assert.ok(entry.model.length > 0);
      assert.equal(typeof entry.summary, 'string');
      assert.ok(entry.summary.length > 0);
    }
  });

  test('model names are unique', () => {
    const names = modelComparison.map((entry) => entry.model);
    assert.equal(new Set(names).size, names.length);
  });
});

describe('workspace-data sampleCode', () => {
  test('is a non-empty string', () => {
    assert.equal(typeof sampleCode, 'string');
    assert.ok(sampleCode.length > 0);
  });

  test('contains the AIWorkspace component usage', () => {
    assert.match(sampleCode, /import \{ AIWorkspace \} from '@bbit\/workspace';/);
    assert.match(sampleCode, /<AIWorkspace/);
  });

  test('spans multiple lines', () => {
    const lines = sampleCode.split('\n');
    assert.ok(lines.length > 1);
  });
});