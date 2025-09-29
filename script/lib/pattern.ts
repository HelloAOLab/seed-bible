import { createRecordsClient } from '@casual-simulation/aux-records/RecordsClient';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import hash from 'hash.js';
import axios from 'axios';
import stringify from '@casual-simulation/fast-json-stable-stringify';

const recordName = 'aoBot';
const headers = {
    'Origin': 'https://auth.ao.bot',
};

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
    }, {
        headers,
    });

    if (result.success === false) {
        console.error('Failed to download pattern:', result);
        return null;
    }

    const data = result.data;
    if (!data) {
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
 * @param telegramBotToken The Telegram bot token to use for sending upload notifications to Telegram. If not specified, notifications won't be sent to Telegram.
 * @param telegramChatId The Telegram chat ID to use for sending upload notifications to Telegram. If not specified, notifications won't be sent to Telegram.
 */
export async function uploadPattern(name: string, aux: StoredAux, sessionKey: string, recordKey?: string, telegramBotToken?: string, telegramChatId?: string) {
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

        for (const header of UNSAFE_HEADERS) {
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

    const url = new URL(`https://ao.bot/`);
    url.searchParams.set('pattern', name);
    url.searchParams.set('patternVersion', eggData.maxVersion.toString());
    const patternUrl = `${url.href}&noGridPortal`;

    if (telegramBotToken && telegramChatId) {
        const now = new Date();
        const date = now.toISOString().split('T')[0]; // YYYY-MM-DD format
        const time = now.toISOString().split('T')[1].split('.')[0] + ' UTC';
        const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        const telegramMessage = `**action:**  publishRecord.success\n**date:**     ${date}\n**time:     **${time}\n**pattern:** [${aoID}](${patternUrl})\n**key:**${key}\n**version:** **${eggData.maxVersion}`;
        const telegramParams = {
            chat_id: telegramChatId,
            text: telegramMessage,
            parse_mode: 'Markdown'
        };
        try {
            const telegramResponse = await fetch(telegramUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(telegramParams)
            });

            if (!telegramResponse.ok) {
                console.error(`Failed to send Telegram message (${telegramResponse.status}): ${await telegramResponse.text()}`);
            }
        } catch (error) {
            console.error('TelegramError:', error);
        }
    }

    console.log('Successfully uploaded pattern:', name);
    console.log(`View it at: ${patternUrl}`);
}

function getHash(buffer: Uint8Array): string {
    return hash.sha256().update(buffer).digest('hex');
}