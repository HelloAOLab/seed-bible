import * as esbuild from 'esbuild';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';

if (existsSync('lib/dist')) {
    await rm('lib/dist', { recursive: true });
}

await esbuild.build({
    entryPoints: [
        'lib/vendor.ts'
    ],
    assetNames: 'assets/[name]-[hash]',
    entryNames: '[name]-[hash]',
    bundle: true,
    minify: true,
    sourcemap: true,
    outdir: 'lib/dist',
    format: 'esm',
    platform: 'browser',
    target: ['es2022'],
});