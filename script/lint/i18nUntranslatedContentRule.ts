import { createRule } from "./i18nRuleShared";
import type { TSESTree } from "@typescript-eslint/utils";

type MessageIds = "untranslated_content" | "untranslated_attribute";
type Options = [];

const ALPHABETIC_PATTERN = /\p{L}/u;

function getAttributeValueAsString(
  attribute: TSESTree.JSXAttribute
): string | null {
  const value = attribute.value;
  if (!value) {
    return null;
  }

  if (value.type === "Literal" && typeof value.value === "string") {
    return value.value;
  }

  if (
    value.type === "JSXExpressionContainer" &&
    value.expression.type === "Literal" &&
    typeof value.expression.value === "string"
  ) {
    return value.expression.value;
  }

  if (
    value.type === "JSXExpressionContainer" &&
    value.expression.type === "TemplateLiteral" &&
    value.expression.expressions.length === 0 &&
    value.expression.quasis.length === 1
  ) {
    const quasi = value.expression.quasis[0];
    return quasi ? (quasi.value.cooked ?? null) : null;
  }

  return null;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function createPreview(value: string): string {
  return value.length > 80 ? `${value.slice(0, 77)}...` : value;
}

function isTranslatableAttributeName(name: string): boolean {
  return name === "aria-label" || name === "title" || name === "placeholder";
}

function hasMaterialSymbolsOutlinedClass(node: TSESTree.JSXElement): boolean {
  for (const attribute of node.openingElement.attributes) {
    if (attribute.type !== "JSXAttribute") {
      continue;
    }

    if (
      attribute.name.name !== "class" &&
      attribute.name.name !== "className"
    ) {
      continue;
    }

    const value = getAttributeValueAsString(attribute);
    if (!value) {
      continue;
    }

    const classes = value.split(/\s+/);
    if (classes.includes("material-symbols-outlined")) {
      return true;
    }
  }

  return false;
}

function shouldIgnoreNode(node: TSESTree.JSXText): boolean {
  let current: TSESTree.Node | undefined = node.parent ?? undefined;

  while (current) {
    if (current.type === "JSXElement") {
      const elementName = current.openingElement.name;

      if (elementName.type === "JSXIdentifier") {
        if (elementName.name === "MaterialIcon") {
          return true;
        }

        if (
          elementName.name === "span" &&
          hasMaterialSymbolsOutlinedClass(current)
        ) {
          return true;
        }
      }
    }

    current = current.parent ?? undefined;
  }

  return false;
}

const i18nUntranslatedContentRule = createRule<Options, MessageIds>({
  name: "i18n-untranslated-content",
  meta: {
    type: "problem",
    docs: {
      description:
        "Warns when JSX text nodes contain alphabetic content that is likely untranslated",
    },
    schema: [],
    messages: {
      untranslated_content:
        "Untranslated content detected in JSX text node: '{{text}}'.",
      untranslated_attribute:
        "Untranslated content detected in JSX attribute '{{attribute}}': '{{text}}'.",
    },
  },
  defaultOptions: [],

  create(context) {
    return {
      JSXText(node: TSESTree.JSXText): void {
        if (shouldIgnoreNode(node)) {
          return;
        }

        const normalizedText = normalizeText(node.value);

        if (!normalizedText) {
          return;
        }

        if (!ALPHABETIC_PATTERN.test(normalizedText)) {
          return;
        }

        context.report({
          node,
          messageId: "untranslated_content",
          data: {
            text: createPreview(normalizedText),
          },
        });
      },

      JSXAttribute(node: TSESTree.JSXAttribute): void {
        if (node.name.type !== "JSXIdentifier") {
          return;
        }

        if (!isTranslatableAttributeName(node.name.name)) {
          return;
        }

        const value = getAttributeValueAsString(node);
        if (!value) {
          return;
        }

        const normalizedText = normalizeText(value);
        if (!normalizedText) {
          return;
        }

        if (!ALPHABETIC_PATTERN.test(normalizedText)) {
          return;
        }

        context.report({
          node,
          messageId: "untranslated_attribute",
          data: {
            attribute: node.name.name,
            text: createPreview(normalizedText),
          },
        });
      },
    };
  },
});

export default i18nUntranslatedContentRule;
