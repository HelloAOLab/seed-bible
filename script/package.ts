import { execSync } from 'child_process';
import { readdir } from 'fs/promises';
import * as path from 'path';

async function packageAll() {
    const packages = await readdir('packages');
    for (const pkg of packages) {
        try {
            console.log(`Packaging: ${pkg}`);
            const packagePath = path.resolve('packages', pkg);
            const distPath = path.resolve('dist', `${pkg}.aux`);
            execSync(`casualos pack-aux --overwrite ${packagePath} ${distPath}`, { stdio: 'inherit' });
            console.log(`Wrote: ${distPath}`);
        } catch (e) {
            console.error(`Failed to package ${pkg}:`, e);
        }
    }
}

packageAll();