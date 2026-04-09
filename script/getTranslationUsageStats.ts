import path from "node:path";
import {
  Project,
  SyntaxKind,
  type CallExpression,
  type Identifier,
  type Node,
} from "ts-morph";

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
  translationKeysByNamespace: Map<string, Set<string>>;
  keyUsage: TranslationKeyUsage[];
}

// let stats: TranslationUsageStats | null = null;

function getStaticString(node: Node | undefined): string | null {
  if (!node) {
    return null;
  }

  if (node.isKind(SyntaxKind.StringLiteral)) {
    return node.getLiteralText();
  }

  if (node.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
    return node.getLiteralText();
  }

  return null;
}

function getNsFromOptions(callExpression: CallExpression): {
  hasNsProperty: boolean;
  namespace: string | null;
} {
  const optionsArg = callExpression.getArguments()[1];

  if (!optionsArg || !optionsArg.isKind(SyntaxKind.ObjectLiteralExpression)) {
    return { hasNsProperty: false, namespace: null };
  }

  for (const property of optionsArg.getProperties()) {
    if (property.isKind(SyntaxKind.PropertyAssignment)) {
      if (property.getName() !== "ns") {
        continue;
      }

      const initializer = property.getInitializer();
      return {
        hasNsProperty: true,
        namespace:
          getStaticString(initializer) ?? initializer?.getText() ?? null,
      };
    }

    if (property.isKind(SyntaxKind.ShorthandPropertyAssignment)) {
      if (property.getName() !== "ns") {
        continue;
      }

      return {
        hasNsProperty: true,
        namespace: "ns",
      };
    }
  }

  return { hasNsProperty: false, namespace: null };
}

function getNsFromLocalUseI18n(identifier: Identifier): string | null {
  for (const definition of identifier.getDefinitions()) {
    const declarationNode = definition.getDeclarationNode();
    if (!declarationNode) {
      continue;
    }

    const bindingElement = declarationNode.isKind(SyntaxKind.BindingElement)
      ? declarationNode
      : declarationNode.getFirstAncestorByKind(SyntaxKind.BindingElement);

    if (!bindingElement) {
      continue;
    }

    const variableDeclaration = bindingElement.getFirstAncestorByKind(
      SyntaxKind.VariableDeclaration
    );

    if (!variableDeclaration) {
      continue;
    }

    const initializer = variableDeclaration.getInitializerIfKind(
      SyntaxKind.CallExpression
    );

    if (!initializer) {
      continue;
    }

    const initializerExpression = initializer.getExpression();
    if (
      !initializerExpression.isKind(SyntaxKind.Identifier) ||
      initializerExpression.getText() !== "useI18n"
    ) {
      continue;
    }

    return getStaticString(initializer.getArguments()[0]);
  }

  return null;
}

function recordTranslationUsage(
  usage: Map<string, { count: number; files: Set<string> }>,
  translationKeysByNamespace: Map<string, Set<string>>,
  key: string,
  namespace: string | null,
  filePath: string
): void {
  if (namespace) {
    const namespacedKeys =
      translationKeysByNamespace.get(namespace) ?? new Set<string>();
    namespacedKeys.add(key);
    translationKeysByNamespace.set(namespace, namespacedKeys);
  }

  const formattedKey = namespace ? `${namespace}:${key}` : key;
  const current = usage.get(formattedKey) ?? {
    count: 0,
    files: new Set<string>(),
  };
  current.count += 1;
  current.files.add(filePath);
  usage.set(formattedKey, current);
}

function getObjectPropertyStaticString(
  objectLiteral: Node,
  propertyName: string
): string | null {
  if (!objectLiteral.isKind(SyntaxKind.ObjectLiteralExpression)) {
    return null;
  }

  for (const property of objectLiteral.getProperties()) {
    if (property.isKind(SyntaxKind.PropertyAssignment)) {
      if (property.getName() !== propertyName) {
        continue;
      }

      return getStaticString(property.getInitializer());
    }

    if (property.isKind(SyntaxKind.ShorthandPropertyAssignment)) {
      if (property.getName() !== propertyName) {
        continue;
      }

      return property.getName();
    }
  }

  return null;
}

function getToolTitleTranslationKey(node: Node): {
  key: string;
  namespace: string | null;
} | null {
  if (!node.isKind(SyntaxKind.ObjectLiteralExpression)) {
    return null;
  }

  let titleObject: Node | undefined;

  for (const property of node.getProperties()) {
    if (!property.isKind(SyntaxKind.PropertyAssignment)) {
      continue;
    }

    if (property.getName() !== "title") {
      continue;
    }

    titleObject = property.getInitializer();
    break;
  }

  if (!titleObject || !titleObject.isKind(SyntaxKind.ObjectLiteralExpression)) {
    return null;
  }

  const key = getObjectPropertyStaticString(titleObject, "key");
  if (!key) {
    return null;
  }

  const namespace = getObjectPropertyStaticString(titleObject, "ns");
  return { key, namespace };
}

/**
 * Parses the TypeScript project and returns usage stats for t("...") translation calls.
 * Keys are formatted as "ns:key" when a namespace can be determined.
 */
export function getTranslationUsageStats(
  projectRoot = process.cwd()
): TranslationUsageStats {
  const tsconfigPath = path.resolve(projectRoot, "tsconfig.json");
  const project = new Project({ tsConfigFilePath: tsconfigPath });
  const sourceFiles = project.getSourceFiles("packages/**/*.ts{,x}");

  const usage = new Map<string, { count: number; files: Set<string> }>();
  const translationKeysByNamespace = new Map<string, Set<string>>();
  let totalTranslationCalls = 0;

  for (const sourceFile of sourceFiles) {
    const filePath = path.relative(projectRoot, sourceFile.getFilePath());

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

      const key = getStaticString(firstArg);

      if (!key) {
        continue;
      }

      const optionsNs = getNsFromOptions(callExpression);
      const namespace = optionsNs.hasNsProperty
        ? optionsNs.namespace
        : getNsFromLocalUseI18n(expression);

      totalTranslationCalls += 1;
      recordTranslationUsage(
        usage,
        translationKeysByNamespace,
        key,
        namespace,
        filePath
      );
    }

    for (const node of sourceFile.getDescendantsOfKind(
      SyntaxKind.ObjectLiteralExpression
    )) {
      const titleTranslation = getToolTitleTranslationKey(node);
      if (!titleTranslation) {
        continue;
      }

      totalTranslationCalls += 1;
      recordTranslationUsage(
        usage,
        translationKeysByNamespace,
        titleTranslation.key,
        titleTranslation.namespace,
        filePath
      );
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
    translationKeysByNamespace,
    keyUsage,
  };
}

// export function getTranslationUsageStats(
//   projectRoot = process.cwd()
// ): TranslationUsageStats {
//   if (!stats || stats.projectRoot !== projectRoot) {
//     stats = _getTranslationUsageStats(projectRoot);
//   }
//   return stats;
// }
