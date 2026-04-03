import fs from "node:fs";
import path from "node:path";

const analyzedProjects = new Map();
let reportedGlobalDiagnostics = false;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function flattenTranslationKeys(value, prefix = "", output = new Set()) {
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

function collectFilesRecursively(root, matcher, output = []) {
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

function parseJsonFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content);
}

function collectUsedKeysFromSourceFiles(projectRoot) {
  const sourceRoot = path.join(projectRoot, "packages");
  const files = collectFilesRecursively(
    sourceRoot,
    (filePath) =>
      /\.(?:[mc]?[jt]sx?)$/u.test(filePath) &&
      !filePath.includes(`${path.sep}i18n${path.sep}`)
  );

  const used = new Set();
  const translationCallRegex = /\bt\s*\(\s*(["'])([\s\S]*?)\1\s*\)/gu;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    let match;
    while ((match = translationCallRegex.exec(content)) !== null) {
      used.add(match[2]);
    }
  }

  return used;
}

function analyzeProject(projectRoot) {
  if (analyzedProjects.has(projectRoot)) {
    return analyzedProjects.get(projectRoot);
  }

  const i18nDir = path.join(
    projectRoot,
    "packages",
    "seed-bible",
    "seed-bible",
    "i18n"
  );

  if (!fs.existsSync(i18nDir)) {
    const result = {
      error: `i18n directory not found: ${i18nDir}`,
      englishKeys: new Set(),
      localeKeys: new Map(),
      usedKeys: new Set(),
    };
    analyzedProjects.set(projectRoot, result);
    return result;
  }

  const localeFiles = fs
    .readdirSync(i18nDir)
    .filter((name) => name.endsWith(".json"))
    .sort();

  const localeKeys = new Map();
  for (const fileName of localeFiles) {
    const locale = path.basename(fileName, ".json");
    const filePath = path.join(i18nDir, fileName);
    const json = parseJsonFile(filePath);
    localeKeys.set(locale, flattenTranslationKeys(json));
  }

  const englishKeys = localeKeys.get("en") ?? new Set();
  const usedKeys = collectUsedKeysFromSourceFiles(projectRoot);

  const result = {
    englishKeys,
    localeKeys,
    usedKeys,
    error: null,
  };

  analyzedProjects.set(projectRoot, result);
  return result;
}

const i18nTranslationKeysRule = {
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
    const projectRoot = context.cwd || process.cwd();
    const analysis = analyzeProject(projectRoot);

    function reportGlobalDiagnostics(programNode) {
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
      Program(node) {
        reportGlobalDiagnostics(node);
      },

      CallExpression(node) {
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
