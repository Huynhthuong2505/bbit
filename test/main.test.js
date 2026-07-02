import { test, before, describe } from 'node:test';
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

// src/main.js runs its rendering logic as a side effect at module load time,
// writing markup into `document.getElementById('root').innerHTML`. There is
// no DOM/build tooling in this project, so we stub out just enough of the
// `document` global for the module to execute, then assert against the
// captured HTML string.
let html = '';

before(async () => {
  let capturedHtml = '';
  const rootElement = {
    get innerHTML() {
      return capturedHtml;
    },
    set innerHTML(value) {
      capturedHtml = value;
    },
  };

  globalThis.document = {
    getElementById(id) {
      return id === 'root' ? rootElement : null;
    },
  };

  await import('../src/main.js');
  html = rootElement.innerHTML;
});

describe('main.js top-level layout', () => {
  test('renders non-empty markup into the root element', () => {
    assert.equal(typeof html, 'string');
    assert.ok(html.length > 0);
  });

  test('renders the brand and hero call-to-action buttons', () => {
    assert.ok(html.includes('AI Coding Workspace'));
    assert.ok(html.includes('Start workspace'));
    assert.ok(html.includes('Compare models'));
    assert.ok(html.includes('Sign in GitHub'));
  });

  test('renders the topbar Docs button', () => {
    assert.ok(html.includes('<button>Docs</button>'));
  });
});

describe('main.js workspace preview', () => {
  test('lists every explorer file from workspace-data', () => {
    for (const file of files) {
      assert.ok(html.includes(file.name), `expected html to include file name ${file.name}`);
    }
  });

  test('marks the active file with the "active" class', () => {
    const activeFile = files.find((file) => file.active);
    const activeMarkup = `<div class="file active"><span>${activeFile.icon}</span>${activeFile.name}</div>`;
    assert.ok(html.includes(activeMarkup));
  });

  test('does not mark inactive files with the "active" class', () => {
    const inactiveFile = files.find((file) => !file.active);
    const inactiveMarkup = `<div class="file "><span>${inactiveFile.icon}</span>${inactiveFile.name}</div>`;
    assert.ok(html.includes(inactiveMarkup));
  });

  test('renders the agent prompt textarea and log lines', () => {
    assert.ok(html.includes('Run agent'));
    assert.ok(html.includes('Creating folders'));
    assert.ok(html.includes('Committing Git'));
  });

  test('marks exactly one explorer file as active, regardless of how many files exist', () => {
    const activeMatches = html.match(/<div class="file active">/g) || [];
    assert.equal(activeMatches.length, 1);
  });

  test('renders the editor tabs and terminal footer', () => {
    assert.ok(html.includes('<span>App.tsx</span>'));
    assert.ok(html.includes('<span>runner.ts</span>'));
    assert.ok(html.includes('<span>models.ts</span>'));
    assert.ok(html.includes('npm run build'));
    assert.ok(html.includes('preview reloaded'));
  });
});

describe('main.js monaco mock / sample code rendering', () => {
  test('escapes angle brackets in the sample code instead of injecting raw JSX', () => {
    assert.ok(!html.includes('<AIWorkspace'), 'raw unescaped JSX tag should not appear in output');
    assert.ok(html.includes('&lt;AIWorkspace'));
    assert.ok(html.includes('/&gt;'));
  });

  test('renders one line-number span per line of sample code', () => {
    const lineCount = sampleCode.split('\n').length;
    for (let i = 1; i <= lineCount; i += 1) {
      assert.ok(html.includes(`<span>${i}</span>`), `expected line number span for line ${i}`);
    }
  });
});

describe('main.js provider grid', () => {
  test('renders every provider name and marks the first as active', () => {
    for (const provider of providers) {
      assert.ok(html.includes(provider.name));
      assert.ok(html.includes(provider.models));
      assert.ok(html.includes(`--accent:${provider.accent}`));
    }
    const firstProviderMarkup = `<button class="provider-card active" style="--accent:${providers[0].accent}">`;
    assert.ok(html.includes(firstProviderMarkup));
  });
});

describe('main.js model comparison grid', () => {
  test('renders every model name and summary', () => {
    for (const entry of modelComparison) {
      assert.ok(html.includes(entry.model));
      assert.ok(html.includes(entry.summary));
    }
  });
});

describe('main.js capability grid', () => {
  test('renders all six capability cards', () => {
    const titles = [
      'Monaco Editor',
      'AI Chat',
      'Agent Mode',
      'GitHub Workflow',
      'Live Preview',
      'Plugin Marketplace',
    ];
    for (const title of titles) {
      assert.ok(html.includes(`<h3>${title}</h3>`));
    }
  });
});

describe('main.js marketplace section', () => {
  test('renders every prompt template as a pill', () => {
    for (const template of promptTemplates) {
      assert.ok(html.includes(`<span>${template}</span>`));
    }
  });

  test('renders every plugin as a pill', () => {
    for (const plugin of plugins) {
      assert.ok(html.includes(`<span>${plugin}</span>`));
    }
  });

  test('renders every deploy target with a checkmark', () => {
    for (const target of deployTargets) {
      assert.ok(html.includes(`<div class="deploy-item">✅ ${target}</div>`));
    }
  });
});