import { createRule, analyzeProject, getContextCwd } from "./i18nRuleShared";
import type { TSESTree } from "@typescript-eslint/utils";

type MessageIds = "missing_key" | "missing_key_in_extension" | "config_error";
type Options = [];

let reportedConfigError = false;

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

function getNamespaceOption(node: TSESTree.CallExpression): {
  hasNamespace: boolean;
  namespace: string | null;
} {
  const optionsArgument = node.arguments[1];
  if (!optionsArgument || optionsArgument.type !== "ObjectExpression") {
    return { hasNamespace: false, namespace: null };
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
      hasNamespace: true,
      namespace: getStaticString(property.value),
    };
  }

  return { hasNamespace: false, namespace: null };
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
          const hasKey = namespaceOption.hasNamespace
            ? hasExtensionTranslationKey(
                key,
                namespaceOption.namespace,
                analysis.extensionEnglishKeys
              )
            : analysis.englishKeys.has(key);

          if (!hasKey) {
            if (namespaceOption.hasNamespace) {
              context.report({
                node: firstArgument,
                messageId: "missing_key_in_extension",
                data: { key, namespace: namespaceOption.namespace },
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
    };
  },
});

export default i18nMissingKeysRule;
