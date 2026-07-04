import { inject } from '@vercel/analytics';
import { providers, files, promptTemplates, plugins, deployTargets, modelComparison, sampleCode } from './workspace-data.js';

// Initialize Vercel Web Analytics
inject();

const root = document.getElementById('root');

root.innerHTML = `
  <main class="app-shell">
    <section class="hero">
      <nav class="topbar">
        <div class="brand">✦ AI Coding Workspace</div>
        <div class="top-actions"><button>Docs</button><button class="primary">🐙 Sign in GitHub</button></div>
      </nav>
      <div class="hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">🤖 VS Code + OpenRouter + Claude Code + Replit Agent</span>
          <h1>AI IDE chạy hoàn toàn trên web, kết nối mọi model và tự xây toàn bộ project.</h1>
          <p>Workspace hợp nhất Monaco Editor, AI Agent, terminal, GitHub, live preview, deployment và marketplace plugin để biến một prompt thành sản phẩm thật.</p>
          <div class="cta-row"><button class="primary big">▶ Start workspace</button><button class="ghost big">▥ Compare models</button></div>
        </div>
        ${workspacePreview()}
      </div>
    </section>
    <section class="section two-col">
      ${featurePanel('🔑', 'AI Hub đa nhà cung cấp', 'Người dùng nhập API key, chọn model và chuyển đổi provider trong cùng một giao diện.', providerGrid())}
      ${featurePanel('▤', 'Model Comparison', 'Gửi một prompt cho nhiều model và xem kết quả cạnh nhau để chọn phương án tốt nhất.', comparisonGrid())}
    </section>
    <section class="section capability-grid">
      ${capability('⌨️', 'Monaco Editor', 'Tabs, multi-file, split view, explorer, search, terminal và preview giống VS Code.')}
      ${capability('🪄', 'AI Chat', 'Generate project, fix bug, refactor, explain code, convert framework, generate tests và build full app.')}
      ${capability('🤖', 'Agent Mode', 'Tự tạo folder/file, viết code, sửa lỗi, chạy build và commit Git thay vì chỉ trả lời chat.')}
      ${capability('🌿', 'GitHub Workflow', 'Clone, branch, commit, push, review PR, tạo pull request và merge trực tiếp trong workspace.')}
      ${capability('🌐', 'Live Preview', 'Hỗ trợ React, Vue, Next.js, HTML, Node, Express, Vite với auto reload.')}
      ${capability('🧩', 'Plugin Marketplace', 'Cài GitHub, Docker, Supabase, Firebase, Vercel, Cloudflare, Figma, Database và SSH.')}
    </section>
    <section class="section marketplace">
      ${featurePanel('📚', 'Prompt Library', 'Template nhanh cho các loại sản phẩm phổ biến.', pillRow(promptTemplates))}
      ${featurePanel('🧩', 'Plugin Marketplace', 'Mở rộng workspace bằng dịch vụ dev, cloud, database và design.', pillRow(plugins))}
      ${featurePanel('🚀', 'One-click Deployment', 'Deploy trực tiếp lên hạ tầng phổ biến sau khi agent build thành công.', deployTargets.map((target) => `<div class="deploy-item">✅ ${target}</div>`).join(''))}
    </section>
  </main>
`;

function workspacePreview() {
  return `<div class="workspace-card">
    <aside class="activity-bar">📄 🔎 🌿 🧩 🤖</aside>
    <aside class="explorer"><h3>Explorer</h3>${files.map((file) => `<div class="file ${file.active ? 'active' : ''}"><span>${file.icon}</span>${file.name}</div>`).join('')}</aside>
    <section class="editor-pane"><div class="tabs"><span>App.tsx</span><span>runner.ts</span><span>models.ts</span></div>${monacoMock(sampleCode)}</section>
    <aside class="assistant-pane"><h3>🤖 AI Agent</h3><textarea>Build a SaaS landing page with pricing, auth, dashboard and Stripe-ready API routes.</textarea><button class="primary">🪄 Run agent</button><div class="agent-log"><p>› Creating folders</p><p>› Writing code</p><p>› Running build</p><p>› Committing Git</p></div></aside>
    <footer class="terminal">▣ npm run build <span>✓ preview reloaded</span></footer>
  </div>`;
}
function monacoMock(code) { return `<div class="monaco-mock" aria-label="Monaco Editor preview"><div class="line-numbers">${code.split('\n').map((_, i) => `<span>${i + 1}</span>`).join('')}</div><pre><code>${escapeHtml(code)}</code></pre><div class="minimap"></div></div>`; }
function featurePanel(icon, title, description, children) { return `<article class="feature-panel"><div class="feature-heading"><span>${icon}</span><div><h2>${title}</h2><p>${description}</p></div></div>${children}</article>`; }
function providerGrid() { return `<div class="provider-grid">${providers.map((p, i) => `<button class="provider-card ${i === 0 ? 'active' : ''}" style="--accent:${p.accent}"><strong>${p.name}</strong><span>${p.models}</span></button>`).join('')}</div>`; }
function comparisonGrid() { return `<div class="comparison-grid">${modelComparison.map((item) => `<article><h4>${item.model}</h4><p>${item.summary}</p></article>`).join('')}</div>`; }
function capability(icon, title, text) { return `<article class="capability"><div>${icon}</div><h3>${title}</h3><p>${text}</p></article>`; }
function pillRow(items) { return `<div class="pill-row">${items.map((item) => `<span>${item}</span>`).join('')}</div>`; }
function escapeHtml(value) { return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
