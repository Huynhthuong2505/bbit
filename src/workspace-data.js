export const providers = [
  { name: 'OpenAI', models: 'GPT-5.5, GPT-4.1, o-series', accent: '#10a37f' },
  { name: 'Anthropic', models: 'Claude 4, Claude Sonnet', accent: '#d97706' },
  { name: 'Google AI', models: 'Gemini 2.5 Pro, Flash', accent: '#4285f4' },
  { name: 'OpenRouter', models: 'Hundreds of hosted models', accent: '#8b5cf6' },
  { name: 'Groq', models: 'Llama, Mixtral, Gemma', accent: '#f97316' },
  { name: 'DeepSeek', models: 'DeepSeek Coder, Reasoner', accent: '#2563eb' },
  { name: 'Mistral AI', models: 'Large, Codestral, Nemo', accent: '#ef4444' },
  { name: 'Ollama', models: 'Local Llama, Qwen, Phi', accent: '#22c55e' },
];

export const files = [
  { name: 'package.json', icon: '📦' },
  { name: 'src/App.tsx', icon: '⚛️', active: true },
  { name: 'src/agent/runner.ts', icon: '🤖' },
  { name: 'src/lib/models.ts', icon: '🧠' },
  { name: 'api/github.ts', icon: '🐙' },
  { name: 'README.md', icon: '📝' },
];

export const promptTemplates = ['Landing Page', 'Dashboard', 'SaaS', 'AI Chatbot', 'CRM', 'ERP', 'Portfolio', 'Ecommerce'];
export const plugins = ['GitHub', 'Docker', 'Supabase', 'Firebase', 'Vercel', 'Cloudflare', 'Figma', 'Database', 'SSH'];
export const deployTargets = ['Vercel', 'Netlify', 'Cloudflare Workers'];
export const modelComparison = [
  { model: 'Claude 4', summary: 'Strong architecture plan, careful refactor steps, production-ready copy.' },
  { model: 'GPT-5.5', summary: 'Full-stack implementation plan with tests, API contracts, and migration notes.' },
  { model: 'Gemini 2.5 Pro', summary: 'Fast UI generation with accessibility and responsive layout recommendations.' },
];

export const sampleCode = `import { AIWorkspace } from '@bbit/workspace';

export default function App() {
  return (
    <AIWorkspace
      editor="monaco"
      providers={["openai", "anthropic", "gemini", "openrouter"]}
      agentMode={{ canWriteFiles: true, canRunBuilds: true, canCommit: true }}
      livePreview={{ frameworks: ["React", "Vue", "Next.js", "Vite"] }}
    />
  );
}`;
