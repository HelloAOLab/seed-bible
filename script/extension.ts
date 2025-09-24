import { program } from 'commander';
import { rmdir, writeFile } from 'node:fs/promises';
import { downloadAndSave, listExtensions, uploadAll, upload } from './lib/extension';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const extensionNameMap = new Map([
]);

program.name('extension')
    .description('Commands for working with SeedBible extensions.')
    .version('0.1.0');

program.command('list')
    .description('Lists all the extensions.')
    .option('-v, --verbose', 'Whether to log verbose output.', false)
    .action(async (options) => {
        const list = await listExtensions();

        for (const ext of list) {
            if (options.verbose) {
                console.log(JSON.stringify(ext, null, 2));
            } else {
                console.log(ext.name);
            }
        }
    });

program.command('download')
    .description('Downloads the AUX for the given extension to the dist folder.')
    .argument('<name>', 'The name of the extension to download.')
    .action(async (name) => {
        await downloadAndSave(name);
    });

program.command('download-all')
    .description('Downloads all AUXes for the given extension to the dist folder.')
    .action(async () => {
        const list = await listExtensions();
        for (const ext of list) {
            await downloadAndSave(ext.name);
        }
    });


async function unpack(name: string) {
    const { filePath, ...ext } = await downloadAndSave(name, extensionNameMap.get(name) || `${name}.aux`);
    const extensionPath = path.resolve('packages', extensionNameMap.get(name) || name);
    if (existsSync(extensionPath)) {
        await rmdir(extensionPath, { recursive: true });
    }
    execSync(`casualos unpack-aux --overwrite "${filePath}" ./packages`, { stdio: 'ignore' });

    const extensionJsonPath = path.resolve(extensionPath, 'extension.json');
    await writeFile(extensionJsonPath, JSON.stringify(ext.meta, null, 2), 'utf-8');
    console.log(`Unpacked extension ${name} to packages folder.`);
}

program.command('unpack')
    .description('Downloads and unpacks the AUX for the given extension into the packages folder.')
    .argument('<name>', 'The name of the extension to download.')
    .action(async (name) => {
        await unpack(name);
    });

program.command('unpack-all')
    .description('Downloads and unpacks the AUX for all extensions into the packages folder.')
    .action(async () => {
        const list = await listExtensions();
        for (const ext of list) {
            await unpack(ext.name);
        }
    });

program.command('upload')
    .description('Uploads the given extension to the records server.')
    .argument('<name>', 'The name of the extension to upload.')
    .option('--session-key <sessionKey>', 'The session key to use for authentication.')
    .option('--record-key <recordKey>', 'The record key to use. If not specified, the default record name will be used.')
    .action(async (name, options) => {
        await upload(name, options);
    });

program.command('upload-all')
    .description('Uploads all extensions to the records server.')
    .option('--session-key <sessionKey>', 'The session key to use for authentication.')
    .option('--record-key <recordKey>', 'The record key to use. If not specified, the default record name will be used.')
    .action(async (options) => {
        await uploadAll(options);
    });

program.parse();