import { createRecordsClient } from '@casual-simulation/aux-records/RecordsClient';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const recordName = 'aoBot';


/**
 * Downloads the AUX for the given pattern from the records server.
 * @param name The name of the pattern to download.
 * @param version The version of the pattern to download. If not specified, the latest version will be downloaded.
 */
export async function downloadPattern(name: string, version?: number): Promise<StoredAux | null> {
    const client = createRecordsClient('https://api.ao.bot');

    const result = await client.getData({
        recordName,
        address: name,
    });

    if (result.success === false) {
        console.error('Failed to download pattern:', result);
        return null;
    }

    const data = result.data;
    if(!data) {
        console.error('No data found for pattern:', name);
        return null;
    }

    if (!Array.isArray(data.eggVersionHistory)) {
        console.error('Invalid eggVersionHistory for pattern:', name, data);
        return null;
    }

    if (version === undefined) {
        version = data.eggVersionHistory.length - 1;
    }

    if (version < 0 || version >= data.eggVersionHistory.length) {
        console.error('Invalid version for pattern:', name, version);
        return null;
    }

    const versionFile = data.eggVersionHistory[version];

    const versionResult = await fetch(versionFile);
    if (!versionResult.ok) {
        console.error('Failed to download pattern version file:', await versionResult.text());
        return null;
    }

    const aux = await versionResult.json();

    return aux;
}

/**
 * Downloads and saves the given pattern to the dist folder.
 * @param name The name of the pattern to download.
 * @param version The version of the pattern to download. If not specified, the latest version will be downloaded.
 * @returns The path to the saved file.
 */
export async function downloadAndSave(name: string, version?: number, fileName?: string) {
    const pattern = await downloadPattern(name, version);
    if (!pattern) {
        throw new Error('Failed to download pattern: ' + name);
    }
    const filePath = path.resolve('dist', fileName || `${name}.aux`);
    await writeFile(filePath, JSON.stringify(pattern, null, 2), 'utf-8');
    return filePath;
}