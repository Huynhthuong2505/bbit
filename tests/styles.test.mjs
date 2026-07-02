import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(repoRoot, 'src/styles.css'), 'utf8');

test('styles.css has balanced braces', () => {
  const opens = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  assert.ok(opens > 0);
  assert.equal(opens, closes);
});

test('defines a selector for every class referenced by the rendered markup', () => {
  const requiredSelectors = [
    '.app-shell',
    '.hero',
    '.topbar',
    '.brand',
    '.hero-grid',
    '.hero-copy',
    '.eyebrow',
    '.cta-row',
    '.workspace-card',
    '.activity-bar',
    '.explorer',
    '.file',
    '.editor-pane',
    '.tabs',
    '.assistant-pane',
    '.agent-log',
    '.terminal',
    '.section',
    '.feature-panel',
    '.feature-heading',
    '.provider-grid',
    '.provider-card',
    '.comparison-grid',
    '.capability-grid',
    '.capability',
    '.marketplace',
    '.pill-row',
    '.deploy-item',
    '.monaco-mock',
    '.line-numbers',
    '.minimap',
  ];
  for (const selector of requiredSelectors) {
    assert.ok(css.includes(selector), `Expected styles.css to define a rule for ${selector}`);
  }
});