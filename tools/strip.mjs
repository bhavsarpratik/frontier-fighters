import { stripTypeScriptTypes } from 'node:module';

process.removeAllListeners('warning');
process.on('warning', (w) => { if (w.name !== 'ExperimentalWarning') console.warn(w); });

export function stripTs(code) {
  return stripTypeScriptTypes(code, { mode: 'strip' });
}

const SPEC = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]+?)\.ts\2/g;

export function rewriteImports(code, mapper) {
  return code.replace(SPEC, (_m, pre, q, path) => `${pre}${q}${mapper(path)}${q}`);
}
