import { program } from 'commander';
import { readFile, rmdir } from 'node:fs/promises';
import { downloadAndSave, uploadPattern } from './lib/pattern';
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
        execSync(`casualos unpack-aux --overwrite "${filePath}" ./packages`, { stdio: 'ignore' });
        console.log(`Unpacked pattern ${name} to packages folder.`);
    });

program.command('upload')
    .description('Uploads the given pattern to the records server.')
    .argument('<package>', 'The name of the package to upload.')
    .option('-p, --pattern <pattern>', 'The name of the pattern to upload.')
    .option('--session-key <sessionKey>', 'The session key to use for authentication.')
    .option('--record-key <recordKey>', 'The record key to use. If not specified, the default record name will be used.')
    .action(async (name, options) => {
        if (!options.sessionKey) {
            throw new Error('You must specify a session key using the --session-key option.');
        }
        const packagePath = path.resolve('packages', name);
        console.log('Packaging:', packagePath);
        const filePath = path.resolve('dist', `${name}.aux`);
        execSync(`casualos pack-aux --overwrite "${packagePath}" "${filePath}"`, { stdio: 'inherit' });
        const aux = await readFile(filePath, 'utf-8');
        const auxJson = JSON.parse(aux);
        await uploadPattern(options.pattern || name, auxJson, options.sessionKey, options.recordKey);
    });

program.parse();