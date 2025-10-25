import axios from 'axios';
const client = createRecordsClient('https://api.ao.bot');
import hash from 'hash.js';

function getHash(buffer: Uint8Array): string {
    return hash.sha256().update(buffer).digest('hex');
}

type StoredAuxOrFile = { [key: string]: string } | Uint8Array | Buffer | Blob;

const files = await os.showUploadFiles()
if (files.length === 0)
    return

export async function uploadPattern(
    name: string,
    aux: StoredAuxOrFile,
    sessionKey: string,
    recordKey?: string,
    telegramBotToken?: string,
    telegramChatId?: string,
    fileDescription?: string,
    instances?: string[],
    markers: string[] = ['publicRead'],
    userRole?: string // adjust type as needed
) {
    client.sessionKey = sessionKey;

    let data: Uint8Array;
    let mimeType = 'application/json';

    // Handle file or AUX
    if (aux instanceof Uint8Array || aux instanceof Buffer) {
        data = aux;
        mimeType = 'application/octet-stream';
    } else if (aux instanceof Blob) {
        data = new Uint8Array(await aux.arrayBuffer());
        mimeType = aux.type || 'application/octet-stream';
    } else {
        const json = JSON.stringify(aux);
        data = new TextEncoder().encode(json);
    }

    const byteLength = data.byteLength;
    const hash = getHash(data);
    const rName = recordKey ?? name;
    const headers = {}; // add your custom headers if needed

    console.log(`Uploading file... (${byteLength} bytes, sha256=${hash})`);

    // Call recordFile with full parameters
    const recordFileResult = await client.recordFile({
        recordKey: rName,
        fileSha256Hex: hash,
        fileMimeType: mimeType,
        fileByteLength: byteLength,
        fileDescription: fileDescription ?? `${name} uploaded`,
        markers,
        instances,
        userRole,
    }, { headers });

    let fileUrl: string;

    if (!recordFileResult.success) {
        if (recordFileResult.errorCode !== 'file_already_exists') {
            throw new Error(`Failed to record file: ${recordFileResult.errorCode} ${recordFileResult.errorMessage}`);
        } else {
            fileUrl = recordFileResult.existingFileUrl;
        }
    } else {
        const { uploadMethod, uploadUrl, uploadHeaders } = recordFileResult;
        const safeHeaders = { ...uploadHeaders };
        const UNSAFE_HEADERS = ['content-length', 'host']; // example
        for (const h of UNSAFE_HEADERS) delete safeHeaders[h];

        const uploadResult = await axios.request({
            method: uploadMethod.toLowerCase(),
            url: uploadUrl,
            headers: safeHeaders,
            data: data,
        });

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
            throw new Error('Failed to upload file.');
        } else {
            fileUrl = uploadUrl;
            console.log('Successfully uploaded file.');
        }
    }

    // Optional: Notify via Telegram
    if (telegramBotToken && telegramChatId) {
        const url = new URL(`https://ao.bot/`);
        url.searchParams.set('pattern', name);
        const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        const telegramMessage = `**File uploaded:** [${name}](${url.href})`;
        const telegramParams = {
            chat_id: telegramChatId,
            text: telegramMessage,
            parse_mode: 'Markdown'
        };
        try {
            const telegramResponse = await fetch(telegramUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(telegramParams)
            });
            if (!telegramResponse.ok) {
                console.error(`Failed to send Telegram message: ${await telegramResponse.text()}`);
            }
        } catch (err) {
            console.error('TelegramError:', err);
        }
    }

    console.log('Upload complete:', fileUrl);
    return fileUrl;
}
