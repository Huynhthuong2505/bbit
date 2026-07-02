import { access, mkdir, copyFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

async function copyDir(source, target) {
  await mkdir(target, { recursive: true });
  for (const entry of await readdir(source)) {
    const from = join(source, entry);
    const to = join(target, entry);
    const info = await stat(from);
    if (info.isDirectory()) await copyDir(from, to);
    else await copyFile(from, to);
  }
}

await access('index.html');
await access('src/main.js');
await access('src/styles.css');
await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
await copyDir('src', 'dist/src');
console.log('Built static AI Coding Workspace into dist/');
