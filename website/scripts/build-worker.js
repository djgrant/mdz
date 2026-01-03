/**
 * Bundle the zen worker for browser use
 *
 * This script creates a browser-compatible bundle of the zen language server worker
 * that provides LSP-like functionality in the playground.
 */

import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = resolve(__dirname, '../..');
const outDir = resolve(__dirname, '../public');

async function bundle() {
  console.log('Bundling zen worker for browser...');

  // Ensure output directory exists
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  try {
    const result = await esbuild.build({
      entryPoints: [resolve(__dirname, '../src/zen-worker-entry.ts')],
      bundle: true,
      format: 'iife', // IIFE format is suitable for web workers
      platform: 'browser',
      target: ['es2020'],
      outfile: resolve(outDir, 'zen-worker.js'),
      minify: false, // Keep readable for debugging
      sourcemap: true,
      // External any Node.js modules (there shouldn't be any in parser/LSP)
      external: ['fs', 'path', 'node:*'],
      metafile: true,
      // Define global for worker context
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    });

    // Get bundle size info
    const outputs = result.metafile.outputs;
    const mainOutput = Object.entries(outputs).find(([key]) => key.endsWith('zen-worker.js'));

    if (mainOutput) {
      const bytes = mainOutput[1].bytes;
      const kb = (bytes / 1024).toFixed(2);
      console.log(`✓ Bundle created: public/zen-worker.js (${kb} KB)`);
    }

    // Also create a minified version for production
    const minResult = await esbuild.build({
      entryPoints: [resolve(__dirname, '../src/zen-worker-entry.ts')],
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: ['es2020'],
      outfile: resolve(outDir, 'zen-worker.min.js'),
      minify: true,
      sourcemap: true,
      external: ['fs', 'path', 'node:*'],
      metafile: true,
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    });

    const minOutputs = minResult.metafile.outputs;
    const minMainOutput = Object.entries(minOutputs).find(([key]) => key.endsWith('zen-worker.min.js'));

    if (minMainOutput) {
      const bytes = minMainOutput[1].bytes;
      const kb = (bytes / 1024).toFixed(2);
      console.log(`✓ Minified bundle: public/zen-worker.min.js (${kb} KB)`);
    }

    console.log('Done!');
  } catch (error) {
    console.error('Bundle failed:', error);
    process.exit(1);
  }
}

bundle();
