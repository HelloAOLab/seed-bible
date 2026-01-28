import { createRecordsClient } from "@casual-simulation/aux-records/RecordsClient";
import { writeFile, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { uploadFile } from "./records";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import type { StoredAux } from "@casual-simulation/aux-common";
import type {
  PackageRecordVersionKey,
  PackageRecordVersionKeySpecifier,
} from "@casual-simulation/aux-records";
import type {
  RecordPackageVersionResult,
  RecordPackageVersionSuccess,
} from "../../typings/AuxLibraryDefinitions";

const downloadRecordName = "testingPublickKey";
const uploadRecordName = "seedBibleExtensions";
const headers = {
  Origin: "https://auth.ao.bot",
};

export interface ExtensionData {
  meta: ExtensionMeta;
  aux: StoredAux;
}

export interface ExtensionMeta {
  author: string;
  configEditor: {
    app: string;
    author: string;
    contextMenuConfig: {
      optionsIsOn: string;
    };
    tabConfig: {
      title: string;
    };
    toolbarConfig: {
      label: string;
      icon: string;
      hasToggle: string;
    };
  };
  createdAt: string;
  dependencies: {
    depId: number;
    name: string;
    type: "package";
  }[];
  description: string;
  id: number;
  license: string;
  linkedDependencies: unknown[];
  name: string;
  otherBots: {
    description: string;
    tag: string;
  }[];
  recordFile?: {
    sha256Hash: string;
    success: boolean;
    url: string;
  };
  casualOsPackage?: {
    recordName: string;
    address: string;
    key?: string | PackageRecordVersionKeySpecifier;
  };
  source?: string;
  status: "active";
  type: "package";
  updatedAt: string;
  userAuth: string;
  version: string;
}

/**
 * Generates a new extension.json in the specified packages folder.
 * @param pckgName The name of the package.
 * @param author The author of the extension.
 */
export function generateExtension(pckgName: string, author: string) {
  const extensionPath = path.resolve("packages", pckgName);
  if (!existsSync(extensionPath)) {
    throw new Error(`Package folder: "${pckgName}" does not exist.`);
  }
  const extensionFilePath = path.resolve(extensionPath, "extension.json");
  if (existsSync(extensionFilePath)) {
    throw new Error(
      `Extension "${pckgName}" with extension.json already exists.`
    );
  }
  const extensionData: ExtensionMeta = {
    author,
    configEditor: {
      app: "",
      author,
      contextMenuConfig: {
        optionsIsOn: "<Context Menu Options Is On>",
      },
      tabConfig: {
        title: "<Tab Title>",
      },
      toolbarConfig: {
        label: "<Toolbar Label>",
        icon: "icon.png",
        hasToggle: "false",
      },
    },
    createdAt: new Date().toISOString(),
    dependencies: [],
    description: `Extension ${pckgName} description.`,
    id: Date.now(),
    license: "MIT",
    linkedDependencies: [],
    name: pckgName,
    otherBots: [],
    recordFile: undefined,
    source: undefined,
    status: "active",
    type: "package",
    updatedAt: new Date().toISOString(),
    userAuth: "",
    version: "0.0.1",
  };

  writeFile(extensionFilePath, JSON.stringify(extensionData, null, 2), "utf-8");
}

/**
 * Downloads the AUX for the given extension from the records server.
 * @param name The name of the extension to download.
 */
export async function listExtensions(): Promise<ExtensionMeta[]> {
  const client = createRecordsClient("https://api.ao.bot");

  const list: ExtensionMeta[] = [];
  let lastAddress: string | undefined = undefined;
  while (true) {
    const result = await client.listData(
      {
        recordName: downloadRecordName,
        address: lastAddress,
        marker: "publicRead",
      },
      {
        headers,
      }
    );

    if (result.success === false) {
      console.error("Failed to download extension:", result);
      break;
    } else {
      list.push(...result.items.map((i) => i.data));
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
export async function downloadExtension(
  name: string
): Promise<ExtensionData | null> {
  const client = createRecordsClient("https://api.ao.bot");

  const result = await client.getData(
    {
      recordName: downloadRecordName,
      address: name,
    },
    {
      headers,
    }
  );

  if (result.success === false) {
    console.error("Failed to download extension:", result);
    return null;
  }

  const data = result.data;
  if (!data) {
    console.error("No data found for extension:", name);
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
    console.error(
      "Failed to download extension bots:",
      await botsResult.text()
    );
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
    throw new Error("Failed to download extension: " + name);
  }
  const filePath = path.resolve("dist", fileName || `${name}.aux`);
  await writeFile(filePath, JSON.stringify(ext.aux, null, 2), "utf-8");
  return {
    ...ext,
    filePath,
  };
}

/**
 * Uploads the given extension to the records server.
 * @param meta The metadata of the extension to upload.
 * @param aux The extension data to upload.
 * @param sessionKey The session key to use for authentication.
 * @param recordKey The record key to use. If not specified, the default record name will be used.
 */
export async function uploadExtensionAux(
  meta: ExtensionMeta,
  filePath: string,
  sessionKey: string,
  recordKey: string | null | undefined,
  saveMeta: boolean
) {
  // const { fileUrl, sha256Hash } = await uploadFile(
  //   recordKey ?? uploadRecordName,
  //   aux,
  //   sessionKey,
  //   ["publicRead"]
  // );
  // console.log("Extension File URL:", fileUrl);

  let uploadCommand = `casualos --endpoint "${"https://api.ao.bot"}" upload-package --raw --record "${recordKey ?? uploadRecordName}" --address "${meta.name}" --file "${filePath}" --markers "publicRead" --entitlements "data:personal file:personal" --version "minor"`;
  if (sessionKey) {
    uploadCommand += ` --key "${sessionKey}"`;
  }

  console.log("Uploading extension with command:\n", uploadCommand);

  const output = execSync(uploadCommand.trim(), {
    encoding: "utf-8",
  });

  console.log("Upload Output:", output);

  const result: RecordPackageVersionSuccess & { key: PackageRecordVersionKey } =
    JSON.parse(output);

  meta.casualOsPackage = {
    recordName: result.recordName,
    address: result.address,
    key: result.key,
  };

  const client = createRecordsClient("https://api.ao.bot");
  client.sessionKey = sessionKey;

  // meta.recordFile = {
  //   sha256Hash,
  //   success: true,
  //   url: fileUrl,
  // };
  // meta.source = fileUrl;
  meta.updatedAt = new Date().toISOString();

  if (saveMeta) {
    const recordResult = await client.recordData(
      {
        recordKey: recordKey ?? uploadRecordName,
        address: meta.name,
        data: meta,
        markers: ["publicRead"],
      },
      {
        headers,
      }
    );

    if (recordResult.success === false) {
      throw new Error(
        "Failed to record extension: " +
          recordResult.errorCode +
          " " +
          recordResult.errorMessage
      );
    }
  } else {
    console.log("Skipping meta.");
  }

  console.log("Successfully recorded extension:", meta.name);

  return {
    meta,
    name: meta.name,
  };
}

/**
 * Uploads the given extension to the records server.
 * @param name The name of the extension to upload.
 * @param options The options for uploading the extension.
 */
export async function upload(
  name: string,
  options: { sessionKey?: string; recordKey?: string; saveMeta?: boolean }
) {
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
  const filePath = path.resolve("dist", `${extensionData.name}.aux`);

  console.log("Packaging:", packagePath);
  execSync(`casualos pack-aux --overwrite "${packagePath}" "${filePath}"`, {
    stdio: "ignore",
  });
  execSync(`casualos minify-aux "${filePath}"`, { stdio: "ignore" });

  return await uploadExtensionAux(
    extensionData,
    filePath,
    options.sessionKey,
    options.recordKey,
    options.saveMeta ?? true
  );
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

  const extensionData: {
    meta: ExtensionMeta;
    name: string;
  }[] = [];
  for (const name of extensions) {
    extensionData.push(await upload(name, options));
  }

  return extensionData;
}
