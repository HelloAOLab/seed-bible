import { computed, effect, signal, type Signal } from "@preact/signals";
import type { PackageRecord } from "typings/AuxLibraryDefinitions";
import { z } from "zod";

// const DEFAULT_EXTENSION_RECORD = 'a';

// export interface ExtensionManager {

// }

export function createExtensionManager() {
  const loadExtensionFromAuxFile = async (url: string) => {
    try {
      const response = await web.get(url);

      if (response.status >= 400) {
        console.error(
          "Failed to fetch extension from URL:",
          url,
          "Response:",
          response
        );
        return false;
      }
      await os.installAuxFile(response.data);
      return true;
    } catch (err) {
      console.error("Failed to load extension from URL:", url, err);
      return false;
    }
  };

  const loadDefaultExtensions = async () => {};

  // const installPackage = async (packageRecord: PackageRecord) => {
  //   os.installPackage(packageRecord.address);
  // }

  // const listExtensionsInRecord = async (recordName: string = DEFAULT_EXTENSION_RECORD): Promise<PackageRecord[]> => {
  //   try {
  //     const packages = await os.listPackageContainers(recordName);

  //     if (packages.success) {
  //       return packages.items;
  //     } else {
  //       console.error("Failed to list extensions for record:", recordName, "Error:", packages);
  //       return [];
  //     }
  //   } catch(err) {
  //     console.error("Error while listing extensions for record:", recordName, err);
  //     return [];
  //   }
  // };

  return {
    loadDefaultExtensions,
    loadExtensionFromAuxFile,
    // listExtensionsInRecord,
  };
}
