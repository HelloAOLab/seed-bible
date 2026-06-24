import { isEqual } from "es-toolkit";

/**
 * Pure, I/O-free logic for performing a three-way merge of i18n translation
 * JSON files (used by the `merge=i18n-json` git merge driver).
 *
 * The translation files are flat `key -> string` objects, but the algorithm is
 * implemented recursively so that nested objects are handled correctly too.
 *
 * The merge resolves each key independently using the classic three-way rule:
 *
 *   - ours === theirs            -> take that value (covers: both added the same
 *                                   key/value, both deleted, both made the same
 *                                   edit, neither changed)
 *   - ours === base              -> only theirs changed -> take theirs
 *   - theirs === base            -> only ours changed   -> take ours
 *   - otherwise                  -> both sides diverged -> conflict
 *                                   (recurse when both sides are objects)
 *
 * "Deleted" is represented by the {@link ABSENT} sentinel so that an
 * update-on-one-side / delete-on-the-other is correctly detected as a conflict.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

/** Sentinel meaning "this key is not present on this side". */
export const ABSENT = Symbol("absent");
type Maybe = JsonValue | typeof ABSENT;

type MergeEntry =
  | { key: string; kind: "value"; value: JsonValue }
  | { key: string; kind: "nested"; entries: MergeEntry[] }
  | { key: string; kind: "conflict"; ours: Maybe; theirs: Maybe };

export interface MergeOptions {
  /** Spaces per indentation level. Defaults to 2 to match the repo style. */
  indent?: number;
  /** Length of the `<`, `=`, `>` conflict marker runs. Defaults to 7. */
  conflictMarkerSize?: number;
  /** Label shown on the "ours" side of a conflict marker. */
  oursLabel?: string;
  /** Label shown on the "theirs" side of a conflict marker. */
  theirsLabel?: string;
}

export interface MergeResult {
  /** The merged file contents, ending in a trailing newline. */
  text: string;
  /**
   * True when at least one key could not be auto-resolved. When true, `text`
   * contains standard git conflict markers and is intentionally not valid JSON.
   */
  hasConflict: boolean;
}

function isPlainObject(value: Maybe): value is JsonObject {
  return (
    value !== ABSENT &&
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getMaybe(obj: JsonObject | undefined, key: string): Maybe {
  if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
    const val = obj[key];
    if (typeof val === "undefined") {
      return ABSENT;
    }
    return val;
  }
  return ABSENT;
}

function equalMaybe(a: Maybe, b: Maybe): boolean {
  if (a === ABSENT || b === ABSENT) {
    return a === b;
  }
  return isEqual(a, b);
}

/**
 * Merges a single key's value across the three sides, returning either a
 * resolved value, a recursive merge of nested objects, the ABSENT sentinel
 * (resolved deletion), or a conflict descriptor.
 */
function mergeValue(
  base: Maybe,
  ours: Maybe,
  theirs: Maybe
):
  | { kind: "value"; value: JsonValue }
  | { kind: "absent" }
  | { kind: "nested"; entries: MergeEntry[] }
  | { kind: "conflict"; ours: Maybe; theirs: Maybe } {
  // Both sides agree (added same, deleted both, edited identically, unchanged).
  if (equalMaybe(ours, theirs)) {
    return ours === ABSENT
      ? { kind: "absent" }
      : { kind: "value", value: ours };
  }
  // Only theirs changed relative to base -> take theirs.
  if (equalMaybe(base, ours)) {
    return theirs === ABSENT
      ? { kind: "absent" }
      : { kind: "value", value: theirs };
  }
  // Only ours changed relative to base -> take ours.
  if (equalMaybe(base, theirs)) {
    return ours === ABSENT
      ? { kind: "absent" }
      : { kind: "value", value: ours };
  }
  // Both sides changed differently. Recurse when both are objects so that
  // independent edits to different nested keys can still auto-merge.
  if (isPlainObject(ours) && isPlainObject(theirs)) {
    return {
      kind: "nested",
      entries: mergeObjects(isPlainObject(base) ? base : {}, ours, theirs),
    };
  }
  return { kind: "conflict", ours, theirs };
}

/**
 * Merges two object versions against their common ancestor, key by key.
 * Key order follows `ours`, then any keys new in `theirs` are appended.
 */
export function mergeObjects(
  base: JsonObject,
  ours: JsonObject,
  theirs: JsonObject
): MergeEntry[] {
  const orderedKeys: string[] = [];
  const seen = new Set<string>();
  for (const key of Object.keys(ours)) {
    if (!seen.has(key)) {
      seen.add(key);
      orderedKeys.push(key);
    }
  }
  for (const key of Object.keys(theirs)) {
    if (!seen.has(key)) {
      seen.add(key);
      orderedKeys.push(key);
    }
  }

  const entries: MergeEntry[] = [];
  for (const key of orderedKeys) {
    const merged = mergeValue(
      getMaybe(base, key),
      getMaybe(ours, key),
      getMaybe(theirs, key)
    );
    switch (merged.kind) {
      case "absent":
        // Resolved deletion: omit the key entirely.
        break;
      case "value":
        entries.push({ key, kind: "value", value: merged.value });
        break;
      case "nested":
        entries.push({ key, kind: "nested", entries: merged.entries });
        break;
      case "conflict":
        entries.push({
          key,
          kind: "conflict",
          ours: merged.ours,
          theirs: merged.theirs,
        });
        break;
    }
  }
  return entries;
}

function hasAnyConflict(entries: MergeEntry[]): boolean {
  return entries.some(
    (entry) =>
      entry.kind === "conflict" ||
      (entry.kind === "nested" && hasAnyConflict(entry.entries))
  );
}

/** Rebuilds a plain object from conflict-free merge entries. */
function entriesToObject(entries: MergeEntry[]): JsonObject {
  const result: JsonObject = {};
  for (const entry of entries) {
    if (entry.kind === "value") {
      result[entry.key] = entry.value;
    } else if (entry.kind === "nested") {
      result[entry.key] = entriesToObject(entry.entries);
    }
  }
  return result;
}

/** Stringifies a JSON value, re-indenting continuation lines to `pad`. */
function stringifyValue(value: JsonValue, indent: number, pad: string): string {
  const json = JSON.stringify(value, null, indent);
  // Re-indent every line after the first so nested values sit under `pad`.
  return json.split("\n").join(`\n${pad}`);
}

/** Renders a single resolved member line (without a leading newline). */
function memberLine(
  key: string,
  value: JsonValue,
  indent: number,
  pad: string
): string {
  return `${pad}${JSON.stringify(key)}: ${stringifyValue(value, indent, pad)}`;
}

/**
 * Renders merge entries to lines, inserting git conflict markers for any
 * unresolved keys. Used only when a conflict exists; the conflict-free path
 * uses JSON.stringify for pristine output.
 */
function renderWithConflicts(
  entries: MergeEntry[],
  level: number,
  options: Required<MergeOptions>
): string[] {
  const pad = " ".repeat(options.indent * level);
  const open = "<".repeat(options.conflictMarkerSize);
  const sep = "=".repeat(options.conflictMarkerSize);
  const close = ">".repeat(options.conflictMarkerSize);
  const lines: string[] = [];

  entries.forEach((entry, index) => {
    // Conflicted output is not valid JSON anyway, so we append a trailing comma
    // to every member to keep the non-conflicting members easy to resolve.
    const isLast = index === entries.length - 1;
    const comma = isLast ? "" : ",";

    if (entry.kind === "value") {
      lines.push(
        memberLine(entry.key, entry.value, options.indent, pad) + comma
      );
    } else if (entry.kind === "nested") {
      lines.push(`${pad}${JSON.stringify(entry.key)}: {`);
      lines.push(...renderWithConflicts(entry.entries, level + 1, options));
      lines.push(`${pad}}${comma}`);
    } else {
      lines.push(`${open} ${options.oursLabel}`);
      if (entry.ours !== ABSENT) {
        lines.push(
          memberLine(entry.key, entry.ours, options.indent, pad) + ","
        );
      }
      lines.push(sep);
      if (entry.theirs !== ABSENT) {
        lines.push(
          memberLine(entry.key, entry.theirs, options.indent, pad) + ","
        );
      }
      lines.push(`${close} ${options.theirsLabel}`);
    }
  });

  return lines;
}

/**
 * Performs a three-way merge of two i18n JSON object versions against their
 * common ancestor and serializes the result.
 */
export function mergeI18nJson(
  base: JsonObject,
  ours: JsonObject,
  theirs: JsonObject,
  options: MergeOptions = {}
): MergeResult {
  const resolved: Required<MergeOptions> = {
    indent: options.indent ?? 2,
    conflictMarkerSize: options.conflictMarkerSize ?? 7,
    oursLabel: options.oursLabel ?? "ours",
    theirsLabel: options.theirsLabel ?? "theirs",
  };

  const entries = mergeObjects(base, ours, theirs);
  const hasConflict = hasAnyConflict(entries);

  if (!hasConflict) {
    const merged = entriesToObject(entries);
    return {
      text: `${JSON.stringify(merged, null, resolved.indent)}\n`,
      hasConflict: false,
    };
  }

  const body = renderWithConflicts(entries, 1, resolved);
  return {
    text: `{\n${body.join("\n")}\n}\n`,
    hasConflict: true,
  };
}
