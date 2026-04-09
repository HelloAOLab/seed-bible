import { createRule, analyzeProject, getContextCwd } from "./i18nRuleShared";
import type { TSESTree } from "@typescript-eslint/utils";

type MessageIds = "missing_key" | "missing_key_in_extension" | "config_error";
type Options = [];

let reportedConfigError = false;

type NamespaceInfo = {
  namespace: string | null;
};

function getStaticString(
  node: TSESTree.Node | null | undefined
): string | null {
  if (!node) {
    return null;
  }

  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }

  if (
    node.type === "TemplateLiteral" &&
    node.expressions.length === 0 &&
    node.quasis.length === 1
  ) {
    const quasi = node.quasis[0];
    return quasi ? (quasi.value.cooked ?? null) : null;
  }

  return null;
}

function getNamespaceOption(node: TSESTree.CallExpression): NamespaceInfo {
  const optionsArgument = node.arguments[1];
  if (!optionsArgument || optionsArgument.type !== "ObjectExpression") {
    return { namespace: null };
  }

  for (const property of optionsArgument.properties) {
    if (property.type !== "Property" || property.kind !== "init") {
      continue;
    }

    const propertyName =
      property.key.type === "Identifier"
        ? property.key.name
        : property.key.type === "Literal" &&
            typeof property.key.value === "string"
          ? property.key.value
          : null;

    if (propertyName !== "ns") {
      continue;
    }

    return {
      namespace: getStaticString(property.value),
    };
  }

  return { namespace: null };
}

function getPropertyName(node: TSESTree.Property["key"]): string | null {
  if (node.type === "Identifier") {
    return node.name;
  }

  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }

  return null;
}

function getObjectProperty(
  objectNode: TSESTree.ObjectExpression,
  propertyName: string
): TSESTree.Property | null {
  for (const property of objectNode.properties) {
    if (property.type !== "Property" || property.kind !== "init") {
      continue;
    }

    if (getPropertyName(property.key) === propertyName) {
      return property;
    }
  }

  return null;
}

function getTitleTranslationInfo(node: TSESTree.ObjectExpression): {
  key: string;
  namespace: string | null;
  keyNode: TSESTree.Node;
} | null {
  const titleProperty = getObjectProperty(node, "title");
  if (!titleProperty || titleProperty.value.type !== "ObjectExpression") {
    return null;
  }

  const titleObject = titleProperty.value;
  const keyProperty = getObjectProperty(titleObject, "key");
  if (!keyProperty) {
    return null;
  }

  const key = getStaticString(keyProperty.value);
  if (!key) {
    return null;
  }

  const nsProperty = getObjectProperty(titleObject, "ns");
  const namespace = nsProperty ? getStaticString(nsProperty.value) : null;

  return {
    key,
    namespace,
    keyNode: keyProperty.value,
  };
}

function isUseI18nCall(
  node: TSESTree.CallExpression["callee"] | null | undefined
): node is TSESTree.Identifier {
  return !!node && node.type === "Identifier" && node.name === "useI18n";
}

function objectPatternDefinesT(pattern: TSESTree.ObjectPattern): boolean {
  for (const property of pattern.properties) {
    if (property.type !== "Property") {
      continue;
    }

    if (property.value.type === "Identifier" && property.value.name === "t") {
      return true;
    }

    if (
      property.value.type === "AssignmentPattern" &&
      property.value.left.type === "Identifier" &&
      property.value.left.name === "t"
    ) {
      return true;
    }
  }

  return false;
}

function getNamespaceFromVariableDeclaration(
  declaration: TSESTree.VariableDeclarator
): NamespaceInfo {
  if (declaration.id.type !== "ObjectPattern") {
    return { namespace: null };
  }

  if (!objectPatternDefinesT(declaration.id)) {
    return { namespace: null };
  }

  if (!declaration.init || declaration.init.type !== "CallExpression") {
    return { namespace: null };
  }

  if (!isUseI18nCall(declaration.init.callee)) {
    return { namespace: null };
  }

  return {
    namespace: getStaticString(declaration.init.arguments[0]),
  };
}

function getNamespaceFromStatement(
  statement: TSESTree.ProgramStatement
): NamespaceInfo {
  if (statement.type === "VariableDeclaration") {
    for (
      let index = statement.declarations.length - 1;
      index >= 0;
      index -= 1
    ) {
      const declaration = statement.declarations[index];
      if (!declaration) {
        continue;
      }

      const namespaceInfo = getNamespaceFromVariableDeclaration(declaration);
      if (namespaceInfo.namespace) {
        return namespaceInfo;
      }
    }
  }

  if (
    statement.type === "ExportNamedDeclaration" ||
    statement.type === "ExportDefaultDeclaration"
  ) {
    const declaration = statement.declaration;
    if (declaration?.type === "VariableDeclaration") {
      for (
        let index = declaration.declarations.length - 1;
        index >= 0;
        index -= 1
      ) {
        const variableDeclaration = declaration.declarations[index];
        if (!variableDeclaration) {
          continue;
        }

        const namespaceInfo =
          getNamespaceFromVariableDeclaration(variableDeclaration);
        if (namespaceInfo.namespace) {
          return namespaceInfo;
        }
      }
    }
  }

  return { namespace: null };
}

function getNamespaceFromLocalUseI18n(
  node: TSESTree.CallExpression
): NamespaceInfo {
  let current: TSESTree.Node | undefined = node.parent ?? undefined;

  while (current) {
    if (current.type === "Program" || current.type === "BlockStatement") {
      const body = current.body;
      for (let index = body.length - 1; index >= 0; index -= 1) {
        const statement = body[index];
        if (!statement) {
          continue;
        }

        if (statement.range[0] >= node.range[0]) {
          continue;
        }

        const namespaceInfo = getNamespaceFromStatement(statement);
        if (namespaceInfo.namespace) {
          return namespaceInfo;
        }
      }
    }

    current = current.parent ?? undefined;
  }

  return { namespace: null };
}

function hasExtensionTranslationKey(
  key: string,
  namespace: string | null,
  extensionEnglishKeys: Map<string, Set<string>>
): boolean {
  if (namespace) {
    return extensionEnglishKeys.get(namespace)?.has(key) ?? false;
  }

  for (const keys of extensionEnglishKeys.values()) {
    if (keys.has(key)) {
      return true;
    }
  }

  return false;
}

const i18nMissingKeysRule = createRule<Options, MessageIds>({
  name: "translation-missing-keys",
  meta: {
    type: "problem",
    docs: {
      description: "Checks for missing translation keys in en.json",
    },
    schema: [],
    messages: {
      missing_key: "Missing translation key in en.json: '{{key}}'.",
      missing_key_in_extension:
        "Missing translation key for extension '{{namespace}}': '{{key}}'.",
      config_error: "i18n lint rule configuration error: {{message}}",
    },
  },
  defaultOptions: [],

  create(context) {
    const projectRoot = getContextCwd(context);
    const analysis = analyzeProject(projectRoot);

    return {
      Program(node): void {
        if (reportedConfigError || !analysis.error) {
          return;
        }

        reportedConfigError = true;
        context.report({
          node,
          messageId: "config_error",
          data: { message: analysis.error },
        });
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
          const namespaceOption = getNamespaceOption(node);
          const localNamespace = namespaceOption.namespace
            ? { namespace: null }
            : getNamespaceFromLocalUseI18n(node);
          const namespaceInfo = namespaceOption.namespace
            ? namespaceOption
            : localNamespace;
          const hasKey = namespaceInfo.namespace
            ? hasExtensionTranslationKey(
                key,
                namespaceInfo.namespace,
                analysis.extensionEnglishKeys
              )
            : analysis.englishKeys.has(key);

          if (!hasKey) {
            if (namespaceInfo.namespace) {
              context.report({
                node: firstArgument,
                messageId: "missing_key_in_extension",
                data: { key, namespace: namespaceInfo.namespace },
              });
              return;
            } else {
              context.report({
                node: firstArgument,
                messageId: "missing_key",
                data: { key: key },
              });
            }
          }
        }
      },

      ObjectExpression(node): void {
        if (analysis.error) {
          return;
        }

        const titleInfo = getTitleTranslationInfo(node);
        if (!titleInfo) {
          return;
        }

        const hasKey = titleInfo.namespace
          ? hasExtensionTranslationKey(
              titleInfo.key,
              titleInfo.namespace,
              analysis.extensionEnglishKeys
            )
          : analysis.englishKeys.has(titleInfo.key);

        if (hasKey) {
          return;
        }

        if (titleInfo.namespace) {
          context.report({
            node: titleInfo.keyNode,
            messageId: "missing_key_in_extension",
            data: { key: titleInfo.key, namespace: titleInfo.namespace },
          });
          return;
        }

        context.report({
          node: titleInfo.keyNode,
          messageId: "missing_key",
          data: { key: titleInfo.key },
        });
      },
    };
  },
});

export default i18nMissingKeysRule;
