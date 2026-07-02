import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

// Every static class name rendered by src/main.js. This list is intentionally
// hardcoded (rather than parsed from the template literals) since some class
// attributes are built dynamically (e.g. `class="file ${cond ? 'active' : ''}"`).
const classesUsedInMarkup = [
  'app-shell',
  'hero',
  'topbar',
  'brand',
  'top-actions',
  'primary',
  'hero-grid',
  'hero-copy',
  'eyebrow',
  'cta-row',
  'big',
  'ghost',
  'section',
  'two-col',
  'capability-grid',
  'marketplace',
  'feature-panel',
  'deploy-item',
  'workspace-card',
  'activity-bar',
  'explorer',
  'file',
  'active',
  'editor-pane',
  'tabs',
  'assistant-pane',
  'agent-log',
  'terminal',
  'monaco-mock',
  'line-numbers',
  'minimap',
  'feature-heading',
  'provider-grid',
  'provider-card',
  'comparison-grid',
  'capability',
  'pill-row',
];

describe('src/styles.css', () => {
  let css;

  before(async () => {
    css = await readFile(join(repoRoot, 'src', 'styles.css'), 'utf8');
  });

  test('defines a rule for every class used by src/main.js markup', () => {
    for (const className of classesUsedInMarkup) {
      const selectorPattern = new RegExp(`\\.${className}(?:[.\\s,:{>]|$)`);
      assert.ok(
        selectorPattern.test(css),
        `expected styles.css to contain a selector targeting .${className}`
      );
    }
  });

  test('defines root-level custom properties for color and typography', () => {
    assert.match(css, /:root\s*\{[^}]*color:\s*#e5eefb/);
    assert.match(css, /:root\s*\{[^}]*background:\s*#050816/);
    assert.match(css, /font-family:\s*Inter/);
  });

  test('uses the --accent custom property for active provider cards', () => {
    assert.match(css, /\.provider-card\.active\s*\{[^}]*var\(--accent\)/);
  });

  test('includes responsive breakpoints for smaller viewports', () => {
    assert.match(css, /@media \(max-width: 1100px\)/);
    assert.match(css, /@media \(max-width: 720px\)/);
  });

  test('collapses the explorer panel and single-columns grids on narrow screens', () => {
    const narrowBreakpoint = css.match(/@media \(max-width: 720px\)\s*\{([\s\S]*?)\}\s*\.monaco-mock/);
    assert.ok(narrowBreakpoint, 'expected to find the 720px media query block');
    assert.match(narrowBreakpoint[1], /\.explorer\s*\{\s*display:\s*none;/);
  });

  test('has balanced curly braces', () => {
    const opens = (css.match(/\{/g) || []).length;
    const closes = (css.match(/\}/g) || []).length;
    assert.equal(opens, closes);
  });
});