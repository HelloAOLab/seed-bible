import { createRecordsClient } from '@casual-simulation/aux-records/RecordsClient';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import hash from 'hash.js';
import axios from 'axios';
import stringify from '@casual-simulation/fast-json-stable-stringify';
import { uploadFile } from './records';

const downloadRecordName = 'testingPublickKey';
const uploadRecordName = 'seedBibleExtensions';
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
            recordName: downloadRecordName,
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
        recordName: downloadRecordName,
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
 * Uploads the given extension to the records server.
 * @param meta The metadata of the extension to upload.
 * @param aux The extension data to upload.
 * @param sessionKey The session key to use for authentication.
 * @param recordKey The record key to use. If not specified, the default record name will be used.
 */
export async function uploadExtension(meta: unknown, aux: StoredAux, sessionKey: string, recordKey?: string) {
    const fileUrl = await uploadFile(recordKey ?? uploadRecordName, aux, sessionKey, ['publicRead']);
    console.log('Extension File URL:', fileUrl);

    const client = createRecordsClient('https://api.ao.bot');
    client.sessionKey = sessionKey;

    const recordResult = await client.recordData({
        recordKey: recordKey ?? uploadRecordName,
        address: meta.name,
        data: meta,
        markers: ['publicRead'],
    }, {
        headers
    });

    if (recordResult.success === false) {
        throw new Error('Failed to record extension: ' + recordResult.errorCode + ' ' + recordResult.errorMessage);
    }

    console.log('Successfully recorded extension.');
}