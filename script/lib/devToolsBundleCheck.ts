import {
  selectCoreAssetFiles,
  type ViteManifestChunk,
} from "./precacheManifest";

/**
 * Text that only appears in developer-tools code (app/devTools/devTools.ts,
 * the tools it lists, and Settings → Developer). Add one for a new tool whose
 * code doesn't contain any of these.
 */
export const DEV_TOOLS_MARKERS = [
  // The Developer view's description.
  "Tools for working on Seed Bible",
  // Show shared components.
  "data-sb-component",
];

/** Source modules that must only ever be loaded on demand. */
const DEV_TOOLS_SOURCES = [
  "app/devTools/devTools.ts",
  "app/devTools/showSharedComponents.ts",
  "components/SettingsPage/DeveloperSettingsView.tsx",
];

export interface DevToolsBundleCheckOptions {
  /**
   * The native apps' build, which must carry no developer-tools code at all;
   * the web build may, but only in chunks fetched after an unlock.
   */
  native: boolean;
  /** Reads an emitted file's text by its manifest path (`assets/x.js`). */
  readFile: (file: string) => string;
  /** Every emitted JavaScript file, by manifest path. */
  allScripts: string[];
}

/** Problems found, each a sentence naming the file; empty when the build is fine. */
export function findDevToolsLeaks(
  manifest: Record<string, ViteManifestChunk>,
  options: DevToolsBundleCheckOptions
): string[] {
  const problems: string[] = [];
  const startup = selectCoreAssetFiles(manifest);

  for (const [source, chunk] of Object.entries(manifest)) {
    if (!DEV_TOOLS_SOURCES.some((devSource) => source.endsWith(devSource))) {
      continue;
    }
    if (options.native) {
      problems.push(
        `${chunk.file} (${source}) is in the native build, which must have no developer tools.`
      );
    } else if (startup.has(chunk.file)) {
      problems.push(
        `${chunk.file} (${source}) loads at startup; developer tools must only load after they're unlocked.`
      );
    }
  }

  const scanned = options.native
    ? options.allScripts
    : [...startup].filter((file) => file.endsWith(".js"));
  for (const file of scanned) {
    const text = options.readFile(file);
    const marker = DEV_TOOLS_MARKERS.find((m) => text.includes(m));
    if (marker) {
      problems.push(
        options.native
          ? `${file} contains developer-tools code ("${marker}"), which the native build must not have.`
          : `${file} loads at startup and contains developer-tools code ("${marker}").`
      );
    }
  }

  return problems;
}
