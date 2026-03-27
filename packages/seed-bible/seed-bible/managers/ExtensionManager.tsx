import { computed, effect, signal, type Signal } from "@preact/signals";
import type { PackageRecord } from "typings/AuxLibraryDefinitions";
import { url, z } from "zod";

export interface ExtensionMeta {
  titles: {
    en: string;
    [lang: string]: string;
  };
  descriptions: {
    en: string;
    [lang: string]: string;
  };
}

export interface UploadedExtension {
  name: string;
  recordName: string;
  address: string;
  meta: ExtensionMeta;
}

export interface ExtensionSet {
  recordName: string;
  id: string;
  extensions: UploadedExtension[];
}

export type ExtensionManager = ReturnType<typeof createExtensionManager>;

export function createExtensionManager() {
  const defaultExtensions = computed<ExtensionSet | null>(
    () => thisBot.tags.availableExtensions ?? null
  );

  const loadExtensionFromPackage = async (
    name: string,
    recordName: string,
    address: string
  ) => {
    try {
      const result = await os.installPackage(recordName, address);
      if (result.success) {
        shout("onExtensionInstall", name);
        console.log(`Successfully installed extension: ${name}`);
        return true;
      } else {
        console.error(`Failed to install extension ${name}:`, result);
        return false;
      }
    } catch (err) {
      console.error("Failed to install extension:", name, err);
      return false;
    }
  };

  const loadExtension = async (uploaded: UploadedExtension) =>
    await loadExtensionFromPackage(
      uploaded.name,
      uploaded.recordName,
      uploaded.address
    );

  const loadExtensionSet = async (set: ExtensionSet) => {
    const promises = set.extensions.map((ext) => loadExtension(ext));
    const results = await Promise.all(promises);
    const successCount = results.filter((r) => r).length;
    console.log(
      `Finished loading extension set '${set.id}'. Successfully loaded ${successCount} out of ${set.extensions.length} extensions.`
    );
  };

  const loadDefaultExtensions = async () => {
    if (!defaultExtensions.value) {
      console.warn("No available extensions found in bot tags.");
      return;
    }
    console.log("Loading default extension set:", defaultExtensions.value);
    await loadExtensionSet(defaultExtensions.value);
  };

  return {
    loadDefaultExtensions,
    loadExtensionSet,
    loadExtension,
    loadExtensionFromPackage,
  };
}
