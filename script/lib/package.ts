import { execSync } from 'child_process';
import { readdir, readFile } from 'fs/promises';
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
    const packages = await listPackages();
    for (const pkg of packages) {
        await packageSingle(pkg);
    }
}

export async function readPackage(packageName: string) {
    const packageAux = path.resolve('dist', `${packageName}.aux`);
    const packageData = await readFile(packageAux, 'utf-8')
    const aux = JSON.parse(packageData);
    return aux;
}

export async function listPackages() {
    return await readdir('packages');
}