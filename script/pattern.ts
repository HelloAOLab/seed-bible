import { program } from 'commander';
import { rmdir } from 'node:fs/promises';
import { downloadAndSave } from './lib/pattern';
import path from 'node:path';
import { execSync } from 'node:child_process';

const packageNameMap = new Map([
    ['SeedBible', 'seed-bible'],
]);

program.name('pattern')
    .description('Commands for working with AUX patterns.')
    .version('0.1.0');

program.command('download')
    .description('Downloads the AUX for the given pattern to the dist folder.')
    .argument('<name>', 'The name of the pattern to download.')
    .option('-v, --version <version>', 'The version of the pattern to download. If not specified, the latest version will be downloaded.', parseInt)
    .action(async (name, options) => {
        await downloadAndSave(name, options.version);
    });

program.command('unpack')
    .description('Downloads and unpacks the AUX for the given pattern into the packages folder.')
    .argument('<name>', 'The name of the pattern to download.')
    .option('-v, --version <version>', 'The version of the pattern to download. If not specified, the latest version will be downloaded.', parseInt)
    .action(async (name, options) => {
        const filePath = await downloadAndSave(name, options.version, packageNameMap.get(name) || `${name}.aux`);
        const packagePath = path.resolve('packages', packageNameMap.get(name) || name);
        await rmdir(packagePath, { recursive: true });
        execSync(`casualos unpack-aux --overwrite ${filePath} ./packages`, { stdio: 'ignore' });
        console.log(`Unpacked pattern ${name} to packages folder.`);
    });

program.parse();