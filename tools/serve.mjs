import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { stripTs } from './strip.mjs';

const root = resolve(process.argv[2] ?? '.');
const port = Number(process.argv[3] ?? process.env.PORT ?? 5173);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const server = http.createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (path.endsWith('/')) path += 'index.html';
      const file = normalize(join(root, path));
      if (!file.startsWith(root)) throw new Error('outside root');
      await stat(file);
      let body = await readFile(file);
      const ext = extname(file);
      if (ext === '.ts') body = stripTs(body.toString('utf8'));
      res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    }
});

let tryPort = port;
server.on('error', (e) => {
  if (e.code !== 'EADDRINUSE' || tryPort > port + 20) throw e;
  console.log(`Port ${tryPort} is busy, trying ${tryPort + 1}...`);
  server.listen(++tryPort);
});
server.on('listening', () => console.log(`Frontier Fighters dev server: http://localhost:${tryPort}/`));
server.listen(tryPort);
