import path from "node:path";
import { pathToFileURL } from "node:url";
import { Project, SyntaxKind } from "ts-morph";

export interface TranslationKeyUsage {
  key: string;
  count: number;
  files: string[];
}

export interface TranslationUsageStats {
  projectRoot: string;
  scannedSourceFiles: number;
  totalTranslationCalls: number;
  uniqueTranslationKeys: string[];
  keyUsage: TranslationKeyUsage[];
}

/**
 * Parses the TypeScript project and returns usage stats for t("...") translation calls.
 */
export function getTranslationUsageStats(
  projectRoot = process.cwd()
): TranslationUsageStats {
  const tsconfigPath = path.resolve(projectRoot, "tsconfig.json");
  const project = new Project({ tsConfigFilePath: tsconfigPath });
  const sourceFiles = project.getSourceFiles();

  const usage = new Map<string, { count: number; files: Set<string> }>();
  let totalTranslationCalls = 0;

  for (const sourceFile of sourceFiles) {
    for (const node of sourceFile.getDescendantsOfKind(
      SyntaxKind.CallExpression
    )) {
      const callExpression = node;
      const expression = callExpression.getExpression();

      if (!expression || !expression.isKind(SyntaxKind.Identifier)) {
        continue;
      }
      if (expression.getText() !== "t") {
        continue;
      }

      const firstArg = callExpression.getArguments()[0];
      if (!firstArg) {
        continue;
      }

      let key: string | null = null;
      if (firstArg.isKind(SyntaxKind.StringLiteral)) {
        key = firstArg.getLiteralText();
      } else if (firstArg.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
        key = firstArg.getLiteralText();
      }

      if (!key) {
        continue;
      }

      totalTranslationCalls += 1;

      const filePath = path.relative(projectRoot, sourceFile.getFilePath());
      const current = usage.get(key) ?? { count: 0, files: new Set<string>() };
      current.count += 1;
      current.files.add(filePath);
      usage.set(key, current);
    }
  }

  const keyUsage: TranslationKeyUsage[] = [...usage.entries()]
    .map(([key, data]) => ({
      key,
      count: data.count,
      files: [...data.files].sort(),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return {
    projectRoot,
    scannedSourceFiles: sourceFiles.length,
    totalTranslationCalls,
    uniqueTranslationKeys: keyUsage.map((entry) => entry.key),
    keyUsage,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const stats = getTranslationUsageStats();
  console.log(JSON.stringify(stats, null, 2));
}
