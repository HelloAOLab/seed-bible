import {
  analyzeProject,
  createRule,
  getContextCwd,
  getContextFilename,
  getLocaleFromFilePath,
} from "./i18nRuleShared";

type MessageIds = "incomplete_translation" | "config_error";
type Options = [];

let reportedConfigError = false;

const i18nIncompleteTranslationsRule = createRule<Options, MessageIds>({
  name: "translation-incomplete-translations",
  meta: {
    type: "problem",
    docs: {
      description: "Checks locale JSON files for missing keys",
    },
    schema: [],
    messages: {
      incomplete_translation: "Locale '{{locale}}' is missing key '{{key}}'",
      config_error: "i18n lint rule configuration error: {{message}}",
    },
  },
  defaultOptions: [],

  create(context) {
    const projectRoot = getContextCwd(context);
    const analysis = analyzeProject(projectRoot);

    let objectKeys = new Set<string>();

    return {
      Object(node): void {
        objectKeys = new Set<string>();
        if (analysis.error) {
          if (reportedConfigError) {
            return;
          }

          reportedConfigError = true;
          context.report({
            node,
            messageId: "config_error",
            data: { message: analysis.error },
          });
          return;
        }
      },

      Member(node: any): void {
        const key =
          node.name.type === "String" ? node.name.value : node.name.name;
        objectKeys.add(key);
      },

      "Object:exit"(node): void {
        const locale = getLocaleFromFilePath(getContextFilename(context));
        for (const key of analysis.englishKeys) {
          if (!objectKeys.has(key)) {
            context.report({
              node,
              messageId: "incomplete_translation",
              data: { locale, key },
            });
          }
        }
      },
    };
  },
});

export default i18nIncompleteTranslationsRule;
