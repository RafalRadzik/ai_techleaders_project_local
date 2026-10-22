#!/usr/bin/env node
// Builds the prototype into the Storybook static folder so Storybook serves it at
// /prototypes/konta-i-role/index.html. Run from the repository root:
//   node prototypes/konta-i-role/build.mjs
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const here = dirname(fileURLToPath(import.meta.url));
const repository = resolve(here, '../..');

await build({
  configFile: false,
  root: here,
  base: '/prototypes/konta-i-role/',
  publicDir: false,
  plugins: [tailwindcss()],
  resolve: { dedupe: ['react', 'react-dom'] },
  build: { outDir: resolve(repository, 'packages/ui/.storybook/public/prototypes/konta-i-role'), emptyOutDir: true },
});

console.log('Prototype: /prototypes/konta-i-role/index.html (served by Storybook, port 3000 in the sandbox)');
