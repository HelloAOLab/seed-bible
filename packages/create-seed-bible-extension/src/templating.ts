export interface TemplateContext {
  extensionId: string;
  packageName: string;
  extensionPascalName: string;
  scriptsVersion: string;
}

const PLACEHOLDER_KEYS = [
  "extensionId",
  "packageName",
  "extensionPascalName",
  "scriptsVersion",
] as const satisfies readonly (keyof TemplateContext)[];

// Matches only these exact, known placeholder names — not any arbitrary
// `{{word}}` — since some vendored template content (the ESLint rules'
// message templates, e.g. `"...key '{{key}}'"`) legitimately contains
// `{{...}}` syntax of its own (ESLint's message interpolation) that must be
// left untouched rather than mistaken for a scaffold placeholder.
const PLACEHOLDER_RE = new RegExp(
  `\\{\\{(${PLACEHOLDER_KEYS.join("|")})\\}\\}`,
  "g"
);

/** Substitutes this project's known `{{key}}` placeholders in `content` from `ctx`; anything else matching `{{...}}` is left as-is. */
export function renderTemplate(content: string, ctx: TemplateContext): string {
  return content.replace(
    PLACEHOLDER_RE,
    (_match, key: keyof TemplateContext) => ctx[key]
  );
}

/** Converts a kebab/snake/space-separated name into PascalCase, e.g. "my-cool-ext" -> "MyCoolExt". */
export function toPascalCase(name: string): string {
  return name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** Normalizes an arbitrary user-provided name into a valid extension id: lowercase, hyphen-separated. */
export function toExtensionId(name: string): string {
  const id = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!id) {
    throw new Error(`"${name}" doesn't produce a valid extension id.`);
  }
  return id;
}
