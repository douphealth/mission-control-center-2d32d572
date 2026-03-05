import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Fix dexie TS1540: replace 'module' keyword with 'namespace'
const dexiePath = resolve('node_modules/dexie/dist/dexie.d.ts');
try {
  let content = readFileSync(dexiePath, 'utf-8');
  content = content.replace(/export declare module Dexie/g, 'export declare namespace Dexie');
  writeFileSync(dexiePath, content);
  console.log('✅ Patched dexie.d.ts');
} catch (e) {
  console.log('⚠️ Could not patch dexie.d.ts:', e.message);
}
