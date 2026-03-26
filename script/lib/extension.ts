import { createRecordsClient } from "@casual-simulation/aux-records/RecordsClient";
import { writeFile, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { existsSync, write } from "node:fs";
import { execSync } from "node:child_process";
import {
  isRecordKey,
  parseRecordKey,
} from "@casual-simulation/aux-common/records/RecordKeys";
import fs from "fs";
import type {
  ExtensionMeta,
  ExtensionSet,
  UploadedExtension,
} from "@packages/seed-bible-refresh/seed-bible/managers/ExtensionManager";
import z from "zod";

const downloadRecordName = "testingPublickKey";
const uploadRecordName = "seedBibleExtensions";
const headers = {
  Origin: "https://auth.ao.bot",
};

/**
 * Generates a new extension.json in the specified packages folder.
 * @param pckgName The name of the package.
 * @param mainBot The main bot of the extension.
 * @param author The author of the extension.
 */
export function generateExtension(
  pckgName: string,
  mainBot: string,
  author: string
) {
  const extensionPath = path.resolve("packages", pckgName);
  const mainBotDirectoryPath = path.resolve(
    extensionPath,
    mainBot.replaceAll(".", path.sep)
  );
  if (!existsSync(extensionPath)) {
    // makes the directory if it doesn't exist
    fs.mkdirSync(extensionPath, { recursive: true });
  }
  if (!existsSync(mainBotDirectoryPath)) {
    // makes the main bot directory if it doesn't exist
    fs.mkdirSync(mainBotDirectoryPath, { recursive: true });
  }
  const extensionFilePath = path.resolve(extensionPath, "extension.json");
  if (existsSync(extensionFilePath)) {
    throw new Error(
      `Extension "${pckgName}" with extension.json already exists.`
    );
  }
  const extraAuxFilePath = path.resolve(extensionPath, "extra.aux");
  if (existsSync(extraAuxFilePath)) {
    throw new Error(`Extension "${pckgName}" with extra.aux already exists.`);
  }
  const mainBotFilePath = path.resolve(
    mainBotDirectoryPath,
    `${mainBot}.bot.aux`
  );
  if (existsSync(mainBotFilePath)) {
    throw new Error(
      `Extension "${pckgName}" with main bot "${mainBot}" already exists.`
    );
  }
  const extensionData: ExtensionMeta = {
    titles: {
      en: pckgName,
    },
    descriptions: {
      en: `Extension ${pckgName} description.`,
    },
  };

  writeFile(extensionFilePath, JSON.stringify(extensionData, null, 2), "utf-8");

  const extraAuxData = {
    version: 1,
    state: {},
  };

  writeFile(extraAuxFilePath, JSON.stringify(extraAuxData, null, 2), "utf-8");

  const mainBotData = {
    state: {
      "{id}": {
        id: "{id}",
        tags: {
          forPackage: pckgName,
          system: mainBot,
        },
      },
    },
    version: 1,
  };

  writeFile(mainBotFilePath, JSON.stringify(mainBotData, null, 2), "utf-8");
}

// /**
//  * Downloads the AUX for the given extension from the records server.
//  * @param name The name of the extension to download.
//  */
// export async function listExtensions(): Promise<ExtensionMeta[]> {
//   const client = createRecordsClient("https://api.ao.bot");

//   const list: ExtensionMeta[] = [];
//   let lastAddress: string | undefined = undefined;
//   while (true) {
//     const result = await client.listData(
//       {
//         recordName: downloadRecordName,
//         address: lastAddress,
//         marker: "publicRead",
//       },
//       {
//         headers,
//       }
//     );

//     if (result.success === false) {
//       console.error("Failed to download extension:", result);
//       break;
//     } else {
//       list.push(...result.items.map((i) => i.data));
//       if (result.items.length > 0) {
//         lastAddress = result.items[result.items.length - 1]?.address;
//       } else {
//         break;
//       }
//     }
//   }

//   return list;
// }

// /**
//  * Downloads the AUX for the given extension from the records server.
//  * @param name The name of the extension to download.
//  */
// export async function downloadExtension(
//   name: string
// ): Promise<ExtensionData | null> {
//   const client = createRecordsClient("https://api.ao.bot");

//   const result: any = await client.getData(
//     {
//       recordName: downloadRecordName,
//       address: name,
//     },
//     {
//       headers,
//     }
//   );

//   if (result.success === false) {
//     console.error("Failed to download extension:", result);
//     return null;
//   }

//   const data = result.data;
//   if (!data) {
//     console.error("No data found for extension:", name);
//     return null;
//   }

//   // if (!Array.isArray(data.eggVersionHistory)) {
//   //     console.error('Invalid eggVersionHistory for pattern:', name, data);
//   //     return null;
//   // }

//   // if (version === undefined) {
//   //     version = data.eggVersionHistory.length - 1;
//   // }

//   // if (version < 0 || version >= data.eggVersionHistory.length) {
//   //     console.error('Invalid version for pattern:', name, version);
//   //     return null;
//   // }

//   // const versionFile = data.eggVersionHistory[version];

//   const botsResult = await fetch(data.recordFile?.url || data.source);
//   if (!botsResult.ok) {
//     console.error(
//       "Failed to download extension bots:",
//       await botsResult.text()
//     );
//     return null;
//   }

//   const bots = await botsResult.json();
//   const aux: StoredAux = {
//     version: 1,
//     state: {},
//   };

//   for (const b of bots) {
//     aux.state[b.id] = b;
//   }

//   return {
//     meta: data,
//     aux,
//   };
// }

// /**
//  * Downloads and saves the given extension to the dist folder.
//  * @param name The name of the extension to download.
//  * @returns The path to the saved file.
//  */
// export async function downloadAndSave(name: string, fileName?: string) {
//   const ext = await downloadExtension(name);
//   if (!ext) {
//     throw new Error("Failed to download extension: " + name);
//   }
//   const filePath = path.resolve("dist", fileName || `${name}.aux`);
//   await writeFile(filePath, JSON.stringify(ext.aux, null, 2), "utf-8");
//   return {
//     ...ext,
//     filePath,
//   };
// }

/**
//  * Uploads the given extension to the records server.
//  * @param meta The metadata of the extension to upload.
//  * @param aux The extension data to upload.
//  * @param sessionKey The session key to use for authentication.
//  * @param recordKey The record key to use. If not specified, the default record name will be used.
//  */
// export async function uploadExtensionAux(
//   meta: ExtensionMeta,
//   aux: StoredAux,
//   sessionKey: string,
//   recordKey: string | null | undefined,
//   saveMeta: boolean
// ) {
//   const { fileUrl, sha256Hash } = await uploadFile(
//     recordKey ?? uploadRecordName,
//     aux,
//     sessionKey,
//     ["publicRead"]
//   );
//   console.log("Extension File URL:", fileUrl);

//   const client = createRecordsClient("https://api.ao.bot");
//   client.sessionKey = sessionKey;

//   meta.recordFile = {
//     sha256Hash,
//     success: true,
//     url: fileUrl,
//   };
//   meta.source = fileUrl;
//   meta.updatedAt = new Date().toISOString();

//   if (saveMeta) {
//     const recordResult: any = await client.recordData(
//       {
//         recordKey: recordKey ?? uploadRecordName,
//         address: meta.name,
//         data: meta,
//         markers: ["publicRead"],
//       },
//       {
//         headers,
//       }
//     );

//     if (recordResult.success === false) {
//       throw new Error(
//         "Failed to record extension: " +
//           recordResult.errorCode +
//           " " +
//           recordResult.errorMessage
//       );
//     }
//   } else {
//     console.log("Skipping meta.");
//   }

//   console.log("Successfully recorded extension:", meta.name);

//   return {
//     fileUrl: fileUrl,
//     meta,
//     name: meta.name,
//   };
// }

// interface UploadedExtension {
//   recordName: string;
//   address: string;
//   name: string;
//   meta: ExtensionMeta;
// }

// interface ExtensionSet {
//   id: string;
//   extensions: UploadedExtension[];
// }

function getRecordName(key: string) {
  if (!isRecordKey(key)) {
    return key;
  }
  const parsed = parseRecordKey(key);
  if (!parsed) {
    throw new Error("Invalid record key: " + key);
  }
  return parsed[0];
}

const ExtensionMetaSchema = z.looseObject({
  titles: z
    .object({
      en: z.string(),
    })
    .catchall(z.string()),
  descriptions: z
    .object({
      en: z.string(),
    })
    .catchall(z.string()),
});

/**
 * Uploads the given extension to the records server.
 * @param name The name of the extension to upload.
 * @param options The options for uploading the extension.
 */
export async function upload(
  name: string,
  options: { sessionKey?: string; recordKey?: string; saveMeta?: boolean }
): Promise<UploadedExtension> {
  if (!options.sessionKey) {
    throw new Error(
      "You must specify a session key using the --session-key option."
    );
  }
  const packagePath = path.resolve("packages", name);
  const packageExtensionPath = path.resolve(packagePath, "extension.json");
  if (!existsSync(packageExtensionPath)) {
    throw new Error(
      "No extension.json file found in package: " + packageExtensionPath
    );
  }
  const extensionData = JSON.parse(
    await readFile(packageExtensionPath, "utf-8")
  );
  const parseResult = ExtensionMetaSchema.safeParse(extensionData);
  if (!parseResult.success) {
    console.error(
      "Invalid extension.json for package:",
      name,
      z.treeifyError(parseResult.error)
    );
    throw new Error("Invalid extension.json for package: " + name);
  }

  const filePath = path.resolve("dist", `${name}.aux`);

  console.log("Packaging:", packagePath);
  execSync(`casualos pack-aux --overwrite "${packagePath}" "${filePath}"`, {
    stdio: "ignore",
  });
  execSync(`casualos minify-aux "${filePath}"`, { stdio: "ignore" });

  const programOptions: string[] = [
    `--endpoint "https://api.ao.bot"`,
    `--origin "https://auth.ao.bot"`,
  ];
  if (options.sessionKey) {
    programOptions.push(`--session-key "${options.sessionKey}"`);
  }

  const recordKey = options.recordKey ?? uploadRecordName;
  const recordName = getRecordName(recordKey);
  const address = options.saveMeta ? name : `${name}-${Date.now()}`;

  execSync(
    `casualos ${programOptions.join(" ")} upload-package --record "${recordKey}" --address "${address}" --key "minor" --file "${filePath}" --markers "publicRead:extension" --description "Extension ${name}"`
  );

  return {
    recordName,
    address,
    name,
    meta: parseResult.data,
  };
}

/**
 * Uploads all extensions in the packages folder to the records server.
 * @param options The options for uploading the extensions.
 */
export async function uploadAll(options: {
  sessionKey?: string;
  recordKey?: string;
  saveMeta?: boolean;
}) {
  const list = await readdir("packages");
  const extensions: string[] = [];
  for (const name of list) {
    if (existsSync(path.resolve("packages", name, "extension.json"))) {
      extensions.push(name);
    }
  }

  const extensionData: UploadedExtension[] = [];
  for (const name of extensions) {
    extensionData.push(await upload(name, options));
  }

  const recordName: string = getRecordName(
    options.recordKey ?? uploadRecordName
  );
  const set: ExtensionSet = {
    recordName: recordName,
    id: `set-${Date.now()}`,
    extensions: extensionData,
  };

  const client = createRecordsClient("https://api.ao.bot");

  if (options.sessionKey) {
    client.sessionKey = options.sessionKey;
  }

  const result: any = await client.recordData(
    {
      recordKey: options.recordKey ?? uploadRecordName,
      address: `set-${Date.now()}`,
      data: set,
      markers: ["publicRead:extensionSet"],
    },
    {
      headers,
    }
  );

  if (result.success === false) {
    throw new Error(
      "Failed to record extension set: " +
        result.errorCode +
        " " +
        result.errorMessage
    );
  }

  console.log("Successfully recorded extension set with id:", set.id);
  return set;
}
