import fs from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";

type TranslationObject = Record<string, unknown>;

interface ProjectAnalysis {
  error: string | null;
  englishKeys: Set<string>;
  localeKeys: Map<string, Set<string>>;
  usedKeys: Set<string>;
}

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

function collectFilesRecursively(
  root: string,
  matcher: (filePath: string) => boolean,
  output: string[] = []
): string[] {
  if (!fs.existsSync(root)) {
    return output;
  }

  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === "obsolete" ||
        entry.name === "typings"
      ) {
        continue;
      }
      collectFilesRecursively(fullPath, matcher, output);
      continue;
    }

    if (matcher(fullPath)) {
      output.push(fullPath);
    }
  }

  return output;
}

function parseJsonFile(filePath: string): unknown {
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content) as unknown;
}

function collectUsedKeysFromSourceFiles(projectRoot: string): Set<string> {
  const sourceRoot = path.join(projectRoot, "packages");
  const files = collectFilesRecursively(
    sourceRoot,
    (filePath) =>
      /\.(?:[mc]?[jt]sx?)$/u.test(filePath) &&
      !filePath.includes(`${path.sep}i18n${path.sep}`)
  );

  const used = new Set<string>();
  const translationCallRegex = /\bt\s*\(\s*(["'])([\s\S]*?)\1\s*\)/gu;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    let match: RegExpExecArray | null;
    while ((match = translationCallRegex.exec(content)) !== null) {
      const key = match[2];
      if (typeof key === "string") {
        used.add(key);
      }
    }
  }

  return used;
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
  const usedKeys = collectUsedKeysFromSourceFiles(projectRoot);

  const result: ProjectAnalysis = {
    englishKeys,
    localeKeys,
    usedKeys,
    error: null,
  };

  analyzedProjects.set(projectRoot, result);
  return result;
}

const i18nTranslationKeysRule: Rule.RuleModule = {
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

  create(context) {
    const projectRoot =
      typeof context.cwd === "string" ? context.cwd : process.cwd();
    const analysis = analyzeProject(projectRoot);

    function reportGlobalDiagnostics(programNode: Rule.Node): void {
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
};

export default i18nTranslationKeysRule;
