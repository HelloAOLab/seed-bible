import { createRecordsClient } from '@casual-simulation/aux-records/RecordsClient';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import hash from 'hash.js';
import axios from 'axios';
import stringify from '@casual-simulation/fast-json-stable-stringify';

const recordName = 'testingPublickKey';
const headers = {
    'Origin': 'https://auth.ao.bot',
};

export interface ExtensionData {
    meta: unknown;
    aux: StoredAux;
}

/**
 * Downloads the AUX for the given extension from the records server.
 * @param name The name of the extension to download.
 */
export async function listExtensions(): Promise<unknown[]> {
    const client = createRecordsClient('https://api.ao.bot');

    const list: unknown[] = [];
    let lastAddress: string | undefined = undefined;
    while(true) {
        const result = await client.listData({
            recordName,
            address: lastAddress,
            marker: 'publicRead',
        }, {
            headers,
        });

        if (result.success === false) {
            console.error('Failed to download extension:', result);
            break;
        } else {
            list.push(...result.items.map(i => i.data));
            if (result.items.length > 0) {
                lastAddress = result.items[result.items.length - 1]?.address;
            } else {
                break;
            }
        }
    }

    return list;
}

/**
 * Downloads the AUX for the given extension from the records server.
 * @param name The name of the extension to download.
 */
export async function downloadExtension(name: string): Promise<ExtensionData | null> {
    const client = createRecordsClient('https://api.ao.bot');

    const result = await client.getData({
        recordName,
        address: name,
    }, {
        headers,
    });

    if (result.success === false) {
        console.error('Failed to download extension:', result);
        return null;
    }

    const data = result.data;
    if(!data) {
        console.error('No data found for extension:', name);
        return null;
    }

    // if (!Array.isArray(data.eggVersionHistory)) {
    //     console.error('Invalid eggVersionHistory for pattern:', name, data);
    //     return null;
    // }

    // if (version === undefined) {
    //     version = data.eggVersionHistory.length - 1;
    // }

    // if (version < 0 || version >= data.eggVersionHistory.length) {
    //     console.error('Invalid version for pattern:', name, version);
    //     return null;
    // }

    // const versionFile = data.eggVersionHistory[version];

    const botsResult = await fetch(data.recordFile?.url || data.source);
    if (!botsResult.ok) {
        console.error('Failed to download extension bots:', await botsResult.text());
        return null;
    }

    const bots = await botsResult.json();
    const aux: StoredAux = {
        version: 1,
        state: {},
    };

    for (const b of bots) {
        aux.state[b.id] = b;
    }

    return {
        meta: data,
        aux,
    };
}

/**
 * Downloads and saves the given extension to the dist folder.
 * @param name The name of the extension to download.
 * @returns The path to the saved file.
 */
export async function downloadAndSave(name: string, fileName?: string) {
    const ext = await downloadExtension(name);
    if (!ext) {
        throw new Error('Failed to download extension: ' + name);
    }
    const filePath = path.resolve('dist', fileName || `${name}.aux`);
    await writeFile(filePath, JSON.stringify(ext.aux, null, 2), 'utf-8');
    return {
        ...ext,
        filePath,
    };
}

const UNSAFE_HEADERS = new Set([
    'accept-encoding',
    'referer',
    'sec-fetch-dest',
    'sec-fetch-mode',
    'sec-fetch-site',
    'origin',
    'sec-ch-ua-platform',
    'user-agent',
    'sec-ch-ua-mobile',
    'sec-ch-ua',
    'content-length',
    'connection',
    'host',
]);

/**
 * Uploads the given pattern to the records server.
 * @param name The name of the pattern to upload.
 * @param aux The pattern data to upload.
 * @param sessionKey The session key to use for authentication.
 * @param recordKey The record key to use. If not specified, the default record name will be used.
 */
export async function uploadPattern(name: string, aux: StoredAux, sessionKey: string, recordKey?: string) {
    const client = createRecordsClient('https://api.ao.bot');

    client.sessionKey = sessionKey;

    const json = stringify(aux);
    const data = new TextEncoder().encode(json);
    const byteLength = data.byteLength;
    const mimeType = 'application/json';
    const hash = getHash(data);
    const rName = recordKey ?? recordName;

    console.log(`Uploading AUX file... (${data.byteLength} bytes, sha256=${hash})`);
    const recordFileResult = await client.recordFile({
        recordKey: rName,
        fileSha256Hex: hash,
        fileMimeType: mimeType,
        fileByteLength: byteLength,
        markers: ['publicRead'],
    }, {
        headers,
    });

    let fileUrl: string;
    if (recordFileResult.success === false) {
        if (recordFileResult.errorCode !== 'file_already_exists') {
            throw new Error('Failed to record file: ' + recordFileResult.errorCode + ' ' + recordFileResult.errorMessage);
        } else {
            fileUrl = recordFileResult.existingFileUrl;
        }
    } else {
        const method = recordFileResult.uploadMethod;
        const url = fileUrl = recordFileResult.uploadUrl;
        const headers = { ...recordFileResult.uploadHeaders };

        for(const header of UNSAFE_HEADERS) {
            delete headers[header];
        }

        const uploadResult = await axios.request({
            method: method.toLowerCase(),
            url: url,
            headers: headers,
            data: data,
        });

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
            throw new Error('Failed to upload file.');
        } else {
            console.log('Successfully uploaded AUX file.');
        }
    }

    const eggDataResult = await client.getData({
        recordName: rName,
        address: name
    }, {
        headers,
    });
    let eggData;

    if (eggDataResult.success === false) {
        if (eggDataResult.errorCode === 'data_not_found') {
            // Create new egg data
            eggData = {
                aoID: name,
                eggVersionHistory: [],
                label: `v0`,
                maxVersion: 0,
                targetVersion: 0,
                xp: 0,
            };
        } else {
            throw new Error('Failed to get egg data: ' + eggDataResult.errorCode + ' ' + eggDataResult.errorMessage);
        }
    } else {
        eggData = eggDataResult.data;
    }

    eggData.eggVersionHistory.push(fileUrl);
    eggData.targetVersion = eggData.maxVersion = eggData.eggVersionHistory.length;
    eggData.label = `v${eggData.maxVersion}`;

    console.log(`Recording pattern (v${eggData.maxVersion})...`);
    const recordDataResult = await client.recordData({
        recordKey: rName,
        address: name,
        data: eggData,
    }, {
        headers,
    });

    if (recordDataResult.success === false) {
        throw new Error('Failed to record data: ' + recordDataResult.errorCode + ' ' + recordDataResult.errorMessage);
    }

    console.log('Successfully uploaded pattern:', name);
    const url = new URL(`https://ao.bot/`);
    url.searchParams.set('pattern', name);
    console.log(`View it at: ${url.href}`);
}

function getHash(buffer: Uint8Array): string {
    return hash.sha256().update(buffer).digest('hex');
}