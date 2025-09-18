import { execSync } from 'child_process';
import { readdir } from 'fs/promises';
import * as path from 'path';

export async function packageSingle(pkg: string, stdio: 'inherit' | 'ignore' = 'inherit') {
    try {
        console.log(`Packaging: ${pkg}`);
        const packagePath = path.resolve('packages', pkg);
        const distPath = path.resolve('dist', `${pkg}.aux`);
        execSync(`casualos pack-aux --overwrite ${packagePath} ${distPath}`, { stdio });
        console.log(`Wrote: ${distPath}`);
        return true;
    } catch (e) {
        console.error(`Failed to package ${pkg}:`, e);
        return false;
    }
}

export async function packageAll() {
    const packages = await readdir('packages');
    for (const pkg of packages) {
        await packageSingle(pkg);
    }
}