import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const port = process.env.PORT || 5173;

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    const safePath = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^\.\.(\/|\\|$)/, '');
    const file = await readFile(join(process.cwd(), safePath));
    res.writeHead(200, { 'Content-Type': types[extname(safePath)] || 'text/plain' });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(port, '0.0.0.0', () => console.log(`AI Coding Workspace running on http://localhost:${port}`));
