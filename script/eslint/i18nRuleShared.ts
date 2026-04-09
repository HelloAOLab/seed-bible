import fs from "node:fs";
import path from "node:path";
import { ESLintUtils, type TSESLint } from "@typescript-eslint/utils";
import { getTranslationUsageStats } from "../getTranslationUsageStats";
import { ExtensionMetaSchema } from "../lib/extension";
import { treeifyError } from "zod";

type TranslationObject = Record<string, unknown>;

export interface ProjectAnalysis {
  error: string | null;
  englishKeys: Set<string>;
  extensionEnglishKeys: Map<string, Set<string>>;
  usedKeys: Set<string>;
}

const analyzedProjects = new Map<string, ProjectAnalysis>();

export const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/HelloAOLab/seed-bible/eslint-rules/${name}`
);

function isObject(value: unknown): value is TranslationObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function flattenTranslationKeys(
  value: unknown,
  prefix = "",
  output = new Set<string>()
): Set<string> {
  if (typeof value === "string") {
    if (prefix) {
      output.add(prefix);
    }
    return output;
  }

  if (!isObject(value)) {
    if (prefix) {
      output.add(prefix);
    }
    return output;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPrefix = prefix ? `${prefix}.${key}` : key;
    flattenTranslationKeys(child, childPrefix, output);
  }

  return output;
}

function parseJsonFile(filePath: string): unknown {
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content) as unknown;
}

function collectExtensionManifestPaths(packagesDir: string): string[] {
  if (!fs.existsSync(packagesDir)) {
    return [];
  }

  const paths: string[] = [];

  for (const pkg of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!pkg.isDirectory()) {
      continue;
    }

    const packagePath = path.join(packagesDir, pkg.name);

    for (const entry of fs.readdirSync(packagePath, { withFileTypes: true })) {
      if (entry.isFile() && entry.name === "extension.json") {
        paths.push(path.join(packagePath, entry.name));
      }
    }
  }

  return paths;
}

function getExtensionEnglishKeys(
  projectRoot: string
): Map<string, Set<string>> {
  const extensionEnglishKeys = new Map<string, Set<string>>();
  const packagesDir = path.join(projectRoot, "packages");
  const extensionJsonPaths = collectExtensionManifestPaths(packagesDir);

  for (const extensionJsonPath of extensionJsonPaths) {
    const extensionConfig = parseJsonFile(extensionJsonPath);

    const parseResult = ExtensionMetaSchema.safeParse(extensionConfig);

    if (!parseResult.success) {
      console.warn(treeifyError(parseResult.error));
      continue;
    }

    const extensionMeta = parseResult.data;
    const id = extensionMeta.id;
    const translations = extensionMeta.translations;

    const englishTranslations = translations.en;
    if (englishTranslations === undefined) {
      continue;
    }

    const englishKeys = flattenTranslationKeys(englishTranslations);
    extensionEnglishKeys.set(id, englishKeys);
  }

  return extensionEnglishKeys;
}

export function analyzeProject(projectRoot: string): ProjectAnalysis {
  const cached = analyzedProjects.get(projectRoot);
  if (cached) {
    return cached;
  }

  const i18nDir = path.join(
    projectRoot,
    "packages",
    "seed-bible",
    "seed-bible",
    "i18n"
  );

  if (!fs.existsSync(i18nDir)) {
    const result: ProjectAnalysis = {
      error: `i18n directory not found: ${i18nDir}`,
      englishKeys: new Set<string>(),
      extensionEnglishKeys: new Map<string, Set<string>>(),
      usedKeys: new Set<string>(),
    };
    analyzedProjects.set(projectRoot, result);
    return result;
  }

  const filePath = path.join(i18nDir, "en.json");
  const json = parseJsonFile(filePath);
  const englishKeys = flattenTranslationKeys(json);
  const extensionEnglishKeys = getExtensionEnglishKeys(projectRoot);

  const usageStats = getTranslationUsageStats(projectRoot);
  const usedKeys = new Set<string>(usageStats.uniqueTranslationKeys);

  const result: ProjectAnalysis = {
    englishKeys,
    extensionEnglishKeys,
    usedKeys,
    error: null,
  };

  analyzedProjects.set(projectRoot, result);
  return result;
}

export function getContextCwd<
  MessageIds extends string,
  Options extends readonly unknown[],
>(context: Readonly<TSESLint.RuleContext<MessageIds, Options>>): string {
  const maybeContext = context as TSESLint.RuleContext<MessageIds, Options> & {
    cwd?: unknown;
  };
  return typeof maybeContext.cwd === "string"
    ? maybeContext.cwd
    : process.cwd();
}

export function getContextFilename<
  MessageIds extends string,
  Options extends readonly unknown[],
>(context: Readonly<TSESLint.RuleContext<MessageIds, Options>>): string {
  const maybeContext = context as TSESLint.RuleContext<MessageIds, Options> & {
    filename?: unknown;
    getFilename?: () => string;
  };

  if (typeof maybeContext.filename === "string") {
    return maybeContext.filename;
  }

  if (typeof maybeContext.getFilename === "function") {
    return maybeContext.getFilename();
  }

  return "";
}

export function getLocaleFromFilePath(filePath: string): string | null {
  if (!filePath.toLowerCase().endsWith(".json")) {
    return null;
  }
  return path.basename(filePath, ".json");
}
