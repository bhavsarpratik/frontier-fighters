// Zero-dependency build: strips TS types with Node's built-in transformer.
// dist/        multi-file static site (GitHub Pages)
// dist-single/ one self-contained index.html (modules inlined via an import map of data: URLs)
import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve, posix } from 'node:path';
import { gzipSync } from 'node:zlib';
import { stripTs, rewriteImports } from './strip.mjs';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'dev') out.push(...(await walk(p))); }
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

const files = await walk(join(root, 'src'));
const modules = new Map();
for (const f of files) {
  const rel = relative(root, f).split('\\').join('/');
  modules.set(rel, stripTs(await readFile(f, 'utf8')));
}

const html = await readFile(join(root, 'index.html'), 'utf8');

// dist/
await rm(join(root, 'dist'), { recursive: true, force: true });
for (const [rel, code] of modules) {
  const out = join(root, 'dist', rel.replace(/\.ts$/, '.js'));
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, rewriteImports(code, (p) => `${p}.js`));
}
await writeFile(join(root, 'dist', 'index.html'), html.replace('/src/main.ts', './src/main.js'));
await writeFile(join(root, 'dist', '.nojekyll'), '');
const assets = {};
const artDir = join(root, 'assets', 'art');
for (const f of await readdir(artDir).catch(() => [])) {
  const json = f.endsWith('_rig.json') || f.endsWith('_frames.json');
  if (!f.endsWith('.webp') && !json) continue;
  const buf = await readFile(join(artDir, f));
  await mkdir(join(root, 'dist', 'assets', 'art'), { recursive: true });
  await writeFile(join(root, 'dist', 'assets', 'art', f), buf);
  assets[`assets/art/${f}`] = (json ? 'data:application/json;base64,' : 'data:image/webp;base64,') + buf.toString('base64');
}
await writeFile(join(root, 'dist', 'assets', 'art', 'manifest.json'), JSON.stringify(Object.keys(assets).map((k) => k.replace('assets/art/', ''))));

// dist-single/
const imports = {};
for (const [rel, code] of modules) {
  const base = posix.dirname(rel);
  const js = rewriteImports(code, (p) => `@ff/${posix.normalize(posix.join(base, p))}.js`);
  imports[`@ff/${rel.replace(/\.ts$/, '.js')}`] = 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
}
const map = `<script type="importmap">${JSON.stringify({ imports })}</script>`;
const single = html.replace(
  /<script type="module" src="\/src\/main.ts"><\/script>/,
  `<script>window.__FF_ASSETS=${JSON.stringify(assets)}</script>\n${map}\n<script type="module">import '@ff/src/main.js';</script>`,
);
if (single === html) throw new Error('index.html entry script tag not found');
await rm(join(root, 'dist-single'), { recursive: true, force: true });
await mkdir(join(root, 'dist-single'), { recursive: true });
await writeFile(join(root, 'dist-single', 'index.html'), single);

let raw = 0;
for (const code of modules.values()) raw += code.length;
const gz = gzipSync(Buffer.from([...modules.values()].join('\n') + html)).length;
const singleGz = gzipSync(Buffer.from(single)).length;
console.log(`modules: ${modules.size}, js: ${(raw / 1024).toFixed(1)} KB, gzipped: ${(gz / 1024).toFixed(1)} KB`);
console.log(`single-file: ${(single.length / 1024).toFixed(1)} KB, gzipped: ${(singleGz / 1024).toFixed(1)} KB`);
console.log(`art assets: ${Object.keys(assets).length}`);
