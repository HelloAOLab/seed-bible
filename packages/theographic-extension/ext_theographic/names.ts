/**
 * A name without the trailing qualifier Theographic adds to tell same-named
 * entities apart: "Jacob (Israel)" → "Jacob", "Bethel (of Palestine)" →
 * "Bethel". Neither verse text nor the locations file uses the qualifier.
 */
export function withoutQualifier(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "").trim();
}
