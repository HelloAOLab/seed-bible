import { computed } from "@preact/signals";

export interface ExtensionMeta {
  /**
   * The identifier of this extension, which should be unique across all extensions.
   */
  id: string;

  /**
   * The titles of this extension in different languages. The "en" key is required and serves as the default title if a specific language is not available.
   */
  titles: {
    en: string;
    [lang: string]: string;
  };

  /**
   * The descriptions of this extension in different languages. The "en" key is required and serves as the default description if a specific language is not available.
   */
  descriptions: {
    en: string;
    [lang: string]: string;
  };
}

export interface UploadedExtension {
  /**
   * The name of the record that this extension is stored in.
   */
  recordName: string;

  /**
   * The address of the uploaded extension package.
   */
  address: string;

  /**
   * The metadata for this extension.
   */
  meta: ExtensionMeta;
}

export interface ExtensionSet {
  /**
   * The ID of this extension set.
   */
  id: string;
  /**
   * The name of the record that this extension set is stored in.
   */
  recordName: string;

  /**
   * The extensions included in this set.
   */
  extensions: UploadedExtension[];
}

export type ExtensionManager = ReturnType<typeof createExtensionManager>;

export function createExtensionManager() {
  const defaultExtensions = computed<ExtensionSet | null>(
    () => thisBot.tags.availableExtensions ?? null
  );

  const loadExtensionFromPackage = async (
    id: string,
    recordName: string,
    address: string
  ) => {
    try {
      const result = await os.installPackage(recordName, address);
      if (result.success) {
        shout("onExtensionInstalled", id);
        console.log(`Successfully installed extension: ${id}`);
        return true;
      } else {
        console.error(`Failed to install extension ${id}:`, result);
        return false;
      }
    } catch (err) {
      console.error("Failed to install extension:", id, err);
      return false;
    }
  };

  const loadExtension = async (uploaded: UploadedExtension) =>
    await loadExtensionFromPackage(
      uploaded.meta.id,
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
    shout("onExtensionSetLoaded", set.id);
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
