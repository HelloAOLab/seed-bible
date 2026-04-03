import path from "node:path";
import { ESLintUtils, type TSESLint } from "@typescript-eslint/utils";
import { getTranslationUsageStats } from "../getTranslationUsageStats";

export interface ProjectAnalysis {
  error: string | null;
  usedKeys: Set<string>;
}

const analyzedProjects = new Map<string, ProjectAnalysis>();

export const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/HelloAOLab/seed-bible/eslint-rules/${name}`
);

export function analyzeProject(projectRoot: string): ProjectAnalysis {
  const cached = analyzedProjects.get(projectRoot);
  if (cached) {
    return cached;
  }
  const usageStats = getTranslationUsageStats(projectRoot);
  const usedKeys = new Set<string>(usageStats.uniqueTranslationKeys);

  const result: ProjectAnalysis = {
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
