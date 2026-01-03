/**
 * Bundle the zen compiler for browser use
 * 
 * This script creates a browser-compatible bundle of the zen compiler
 * that can be loaded in the playground.
 */

import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = resolve(__dirname, '../..');
const outDir = resolve(__dirname, '../public');

async function bundle() {
  console.log('Bundling zen compiler for browser...');
  
  // Ensure output directory exists
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  try {
    const result = await esbuild.build({
      entryPoints: [resolve(rootDir, 'src/index.ts')],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: ['es2020'],
      outfile: resolve(outDir, 'zen-compiler.js'),
      minify: false, // Keep readable for debugging
      sourcemap: true,
      // External any Node.js modules (there shouldn't be any in parser/compiler)
      external: ['fs', 'path', 'node:*'],
      metafile: true,
    });

    // Get bundle size info
    const outputs = result.metafile.outputs;
    const mainOutput = Object.entries(outputs).find(([key]) => key.endsWith('zen-compiler.js'));
    
    if (mainOutput) {
      const bytes = mainOutput[1].bytes;
      const kb = (bytes / 1024).toFixed(2);
      console.log(`✓ Bundle created: public/zen-compiler.js (${kb} KB)`);
    }

    // Also create a minified version
    const minResult = await esbuild.build({
      entryPoints: [resolve(rootDir, 'src/index.ts')],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: ['es2020'],
      outfile: resolve(outDir, 'zen-compiler.min.js'),
      minify: true,
      sourcemap: true,
      external: ['fs', 'path', 'node:*'],
      metafile: true,
    });

    const minOutputs = minResult.metafile.outputs;
    const minMainOutput = Object.entries(minOutputs).find(([key]) => key.endsWith('zen-compiler.min.js'));
    
    if (minMainOutput) {
      const bytes = minMainOutput[1].bytes;
      const kb = (bytes / 1024).toFixed(2);
      console.log(`✓ Minified bundle: public/zen-compiler.min.js (${kb} KB)`);
    }

    console.log('Done!');
  } catch (error) {
    console.error('Bundle failed:', error);
    process.exit(1);
  }
}

bundle();
