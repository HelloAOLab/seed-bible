import { readFileSync, writeFileSync } from "node:fs";
import { mergeI18nJson, type JsonObject } from "./lib/mergeI18nJson";

/**
 * Git merge driver entry point for i18n translation JSON files.
 *
 * Git invokes this as:
 *   tsx script/mergeI18nJson.ts %O %A %B %L %P
 * where:
 *   %O = path to the common ancestor (base) version
 *   %A = path to our version (this file is OVERWRITTEN with the merged result)
 *   %B = path to their version
 *   %L = conflict marker length (optional)
 *   %P = the real pathname of the file being merged (optional, for labels)
 *
 * Exit code 0 means a clean merge; a non-zero exit tells git the path is still
 * conflicted (the file is left with standard conflict markers for the user).
 */

const [basePath, oursPath, theirsPath, markerSizeArg, realPath] =
  process.argv.slice(2);

if (!basePath || !oursPath || !theirsPath) {
  console.error(
    "merge-i18n-json: expected <base> <ours> <theirs> [markerSize] [path] arguments"
  );
  process.exit(2);
}

const label = realPath ?? oursPath;

/** Parses a side, treating a missing/empty/unparseable base as `{}`. */
function parseObject(path: string, allowEmpty: boolean): JsonObject | null {
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    return allowEmpty ? {} : null;
  }
  if (raw.trim() === "") {
    return allowEmpty ? {} : null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }
    return null;
  } catch {
    return allowEmpty ? {} : null;
  }
}

const base = parseObject(basePath, true) ?? {};
const ours = parseObject(oursPath, false);
const theirs = parseObject(theirsPath, false);

// If either side isn't a JSON object we can't safely key-merge. Leave our
// version untouched and report a conflict so the user resolves it manually.
if (ours === null || theirs === null) {
  console.error(
    `merge-i18n-json: ${label} is not a JSON object on one side; leaving for manual resolution`
  );
  process.exit(1);
}

const markerSize = Number.parseInt(markerSizeArg ?? "", 10);

const { text, hasConflict } = mergeI18nJson(base, ours, theirs, {
  conflictMarkerSize: Number.isFinite(markerSize) ? markerSize : 7,
  oursLabel: `ours (${label})`,
  theirsLabel: `theirs (${label})`,
});

writeFileSync(oursPath, text, "utf-8");

if (hasConflict) {
  console.error(`merge-i18n-json: conflicts remain in ${label}`);
  process.exit(1);
}

process.exit(0);
