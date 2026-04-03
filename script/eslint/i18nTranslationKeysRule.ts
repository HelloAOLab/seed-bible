import fs from "node:fs";
import path from "node:path";
import { ESLintUtils, TSESTree, type TSESLint } from "@typescript-eslint/utils";
import { getTranslationUsageStats } from "../getTranslationUsageStats";

type TranslationObject = Record<string, unknown>;

interface ProjectAnalysis {
  error: string | null;
  englishKeys: Set<string>;
  localeKeys: Map<string, Set<string>>;
  usedKeys: Set<string>;
}

type MessageIds =
  | "missing_key"
  | "incomplete_translation"
  | "unused_key"
  | "config_error";

type Options = [];

const analyzedProjects = new Map<string, ProjectAnalysis>();
let reportedGlobalDiagnostics = false;

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

function analyzeProject(projectRoot: string): ProjectAnalysis {
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

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/HelloAOLab/seed-bible/eslint-rules/${name}`
);

function getContextCwd(
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): string {
  const maybeContext = context as TSESLint.RuleContext<MessageIds, Options> & {
    cwd?: unknown;
  };
  return typeof maybeContext.cwd === "string"
    ? maybeContext.cwd
    : process.cwd();
}

const i18nTranslationKeysRule = createRule<Options, MessageIds>({
  name: "translation-keys",
  meta: {
    type: "problem",
    docs: {
      description:
        "Checks translation key usage and locale completeness against en.json",
    },
    schema: [],
    messages: {
      missing_key: "Missing translation key in en.json: '{{key}}'.",
      incomplete_translation:
        "Locale '{{locale}}' is missing key '{{key}}' from en.json.",
      unused_key: "Unused translation key in en.json: '{{key}}'.",
      config_error: "i18n lint rule configuration error: {{message}}",
    },
  },
  defaultOptions: [],

  create(context) {
    const projectRoot = getContextCwd(context);
    const analysis = analyzeProject(projectRoot);

    function reportGlobalDiagnostics(programNode: TSESTree.Program): void {
      if (reportedGlobalDiagnostics) {
        return;
      }
      reportedGlobalDiagnostics = true;

      if (analysis.error) {
        context.report({
          node: programNode,
          messageId: "config_error",
          data: { message: analysis.error },
        });
        return;
      }

      const englishKeys = analysis.englishKeys;

      for (const [locale, keys] of analysis.localeKeys) {
        if (locale === "en") {
          continue;
        }

        for (const key of englishKeys) {
          if (!keys.has(key)) {
            context.report({
              node: programNode,
              messageId: "incomplete_translation",
              data: { locale, key },
            });
          }
        }
      }

      for (const key of englishKeys) {
        if (!analysis.usedKeys.has(key)) {
          context.report({
            node: programNode,
            messageId: "unused_key",
            data: { key },
          });
        }
      }
    }

    return {
      Program(node): void {
        reportGlobalDiagnostics(node);
      },

      CallExpression(node): void {
        if (analysis.error) {
          return;
        }

        if (node.callee.type !== "Identifier" || node.callee.name !== "t") {
          return;
        }

        const firstArgument = node.arguments[0];
        if (!firstArgument) {
          return;
        }

        if (
          firstArgument.type === "Literal" &&
          typeof firstArgument.value === "string"
        ) {
          const key = firstArgument.value;
          if (!analysis.englishKeys.has(key)) {
            context.report({
              node: firstArgument,
              messageId: "missing_key",
              data: { key },
            });
          }
        }
      },
    };
  },
});

export default i18nTranslationKeysRule;
