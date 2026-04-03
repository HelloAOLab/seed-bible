import fs from "node:fs";
import path from "node:path";
import { ESLintUtils, type TSESLint } from "@typescript-eslint/utils";
import { getTranslationUsageStats } from "../getTranslationUsageStats";

type TranslationObject = Record<string, unknown>;

export interface ProjectAnalysis {
  error: string | null;
  englishKeys: Set<string>;
  localeKeys: Map<string, Set<string>>;
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
      localeKeys: new Map<string, Set<string>>(),
      usedKeys: new Set<string>(),
    };
    analyzedProjects.set(projectRoot, result);
    return result;
  }

  const localeFiles = fs
    .readdirSync(i18nDir)
    .filter((name) => name.endsWith(".json"))
    .sort();

  const localeKeys = new Map<string, Set<string>>();
  for (const fileName of localeFiles) {
    const locale = path.basename(fileName, ".json");
    const filePath = path.join(i18nDir, fileName);
    const json = parseJsonFile(filePath);
    localeKeys.set(locale, flattenTranslationKeys(json));
  }

  const englishKeys = localeKeys.get("en") ?? new Set<string>();
  const usageStats = getTranslationUsageStats(projectRoot);
  const usedKeys = new Set<string>(usageStats.uniqueTranslationKeys);

  const result: ProjectAnalysis = {
    englishKeys,
    localeKeys,
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
