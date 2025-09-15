import { createServer } from 'http';
import { spawn } from 'child_process';
import { watch } from 'fs';
import { join, resolve, extname } from 'path';
import { readFile } from 'fs/promises';

const root = resolve('.');
const publicDir = resolve('public');

function copyStatic() {
  spawn('node', ['scripts/copy-static.js'], { stdio: 'inherit' });
}

copyStatic();
const tsc = spawn('tsc', ['-w'], { stdio: 'inherit' });

watch('src', (event, filename) => {
  if (['index.html', 'styles.css'].includes(filename)) {
    copyStatic();
  }
});

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
};

const server = createServer(async (req, res) => {
  const urlPath = req.url === '/' ? '/public/index.html' : req.url;
  const filePath = join(root, urlPath);
  try {
    const data = await readFile(filePath);
    res.setHeader('Content-Type', mime[extname(filePath)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  tsc.kill('SIGINT');
  server.close(() => process.exit(0));
});
