import fs from "node:fs";
import path from "node:path";
import { difference } from "es-toolkit";
import {
  analyzeProject,
  flattenTranslationKeys,
  forgetProjectAnalysis,
} from "../lint/i18nRuleShared";

export type I18nRule =
  | "translation-unused-keys"
  | "translation-incomplete-translations"
  | "translation-extension-incomplete-translations";

export interface I18nFinding {
  file: string;
  line: number;
  rule: I18nRule;
  message: string;
}

export interface CheckI18nOptions {
  exemptKeys: ReadonlySet<string>;
}

// Keys en.json must keep even though no `t("…")` call names them: they are
// looked up dynamically (font weights, colours, animal icons, policy pages,
// text-section styles, psalm book divisions).
export const EXEMPT_KEYS: ReadonlySet<string> = new Set([
  "text-section-bookTitle",
  "text-section-heading",
  "text-section-verse",
  "bold",
  "regular",
  "light",
  "1-psalms",
  "2-psalms",
  "3-psalms",
  "4-psalms",
  "5-psalms",
  "color-emerald",
  "color-blue",
  "color-pink",
  "color-amber",
  "color-violet",
  "color-red",
  "color-green",
  "color-orange",
  "color-cyan",
  "color-rose",
  "color-purple",
  "color-teal",
  "animal-forest",
  "animal-park",
  "animal-eco",
  "animal-pets",
  "animal-cruelty_free",
  "animal-local_cafe",
  "animal-local_florist",
  "animal-grass",
  "animal-potted_plant",
  "animal-nature",
  "terms-of-service-policy",
  "privacy-policy-policy",
  "code-of-conduct-policy",
]);

const I18N_DIR = path.join("packages", "seed-bible", "seed-bible", "i18n");

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toPosix(relative: string): string {
  return relative.split(path.sep).join("/");
}

/**
 * 1-based line of the first `"<key>":` member in a JSON file's text, or 1 if
 * not found. Locale files are flat, so a text scan is enough and avoids a
 * JSON AST dependency just for line numbers.
 */
function lineOfKey(text: string, key: string): number {
  const needle = `${JSON.stringify(key)}:`;
  const lines = text.split("\n");
  const index = lines.findIndex((line) => line.trimStart().startsWith(needle));
  return index === -1 ? 1 : index + 1;
}

function localeFiles(projectRoot: string): string[] {
  const dir = path.join(projectRoot, I18N_DIR);
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => path.join(dir, name));
}

function isUsed(key: string, usedKeys: Set<string>): boolean {
  if (usedKeys.has(key)) return true;
  // `key_one` / `key_other` plural forms count as used when the base key is.
  const underscore = key.lastIndexOf("_");
  return underscore !== -1 && usedKeys.has(key.slice(0, underscore));
}

export function checkI18n(
  projectRoot: string,
  options: CheckI18nOptions
): I18nFinding[] {
  const analysis = analyzeProject(projectRoot);
  if (analysis.error) {
    throw new Error(analysis.error);
  }

  const findings: I18nFinding[] = [];

  for (const filePath of localeFiles(projectRoot)) {
    const file = toPosix(path.relative(projectRoot, filePath));
    const text = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(text) as JsonObject;
    const locale = path.basename(filePath, ".json");
    const keys = new Set(Object.keys(json));

    for (const key of keys) {
      if (options.exemptKeys.has(key) || isUsed(key, analysis.usedKeys))
        continue;
      findings.push({
        file,
        line: lineOfKey(text, key),
        rule: "translation-unused-keys",
        message: `Unused translation key: '${key}'.`,
      });
    }

    for (const key of analysis.englishKeys) {
      if (keys.has(key)) continue;
      findings.push({
        file,
        line: 1,
        rule: "translation-incomplete-translations",
        message: `Locale '${locale}' is missing key '${key}'`,
      });
    }
  }

  const packagesDir = path.join(projectRoot, "packages");
  for (const pkg of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!pkg.isDirectory()) continue;
    const manifestPath = path.join(packagesDir, pkg.name, "extension.json");
    if (!fs.existsSync(manifestPath)) continue;

    const file = toPosix(path.relative(projectRoot, manifestPath));
    const text = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(text) as JsonObject;
    const translations = manifest.translations;
    if (!isObject(translations)) continue;

    const englishKeys = [...flattenTranslationKeys(translations.en)];
    for (const [locale, value] of Object.entries(translations)) {
      if (locale === "en") continue;
      for (const key of difference(englishKeys, [
        ...flattenTranslationKeys(value),
      ])) {
        findings.push({
          file,
          line: lineOfKey(text, locale),
          rule: "translation-extension-incomplete-translations",
          message: `Locale '${locale}' is missing key '${key}'`,
        });
      }
    }
  }

  return findings;
}

export function fixUnusedKeys(
  projectRoot: string,
  findings: I18nFinding[]
): string[] {
  const keysByFile = new Map<string, Set<string>>();
  for (const finding of findings) {
    if (finding.rule !== "translation-unused-keys") continue;
    const key = finding.message.match(/'(.*)'\.$/)?.[1];
    if (!key) continue;
    const set = keysByFile.get(finding.file) ?? new Set<string>();
    set.add(key);
    keysByFile.set(finding.file, set);
  }

  const rewritten: string[] = [];
  for (const [file, keys] of keysByFile) {
    const filePath = path.join(projectRoot, file);
    const json = JSON.parse(fs.readFileSync(filePath, "utf8")) as JsonObject;
    for (const key of keys) delete json[key];
    // Same shape `script/i18n.ts` writes, so `vp fmt` has nothing to change.
    fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
    rewritten.push(file);
  }
  if (rewritten.length > 0) {
    forgetProjectAnalysis(projectRoot);
  }
  return rewritten;
}

export function formatFindings(findings: I18nFinding[]): string {
  return findings
    .map((f) => `${f.file}:${f.line}  warning  ${f.message}  ${f.rule}`)
    .join("\n");
}
