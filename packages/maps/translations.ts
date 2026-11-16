import { addTranslations } from "seed-bible/i18n";
import translations from "./translations.json";

/**
 * The namespace of this package's strings: its folder name, which is where the
 * i18n lint looks up their keys. `t()` calls spell it out as `ns: "maps"`,
 * since the lint only reads it written there.
 */
const MAPS_NS = "maps";

let isAdded = false;

/**
 * Adds this package's strings, the first time a map needs them. Not an
 * extension, so nothing installs it to load them. Bundled rather than
 * fetched, so a map that can't download Leaflet still says so in the reader's
 * language when offline.
 */
export function addMapTranslations() {
  if (!isAdded) {
    isAdded = true;
    addTranslations(MAPS_NS, translations);
  }
}
