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
      description: "Checks locale JSON files for keys missing from en.json",
    },
    schema: [],
    messages: {
      incomplete_translation:
        "Locale '{{locale}}' is missing key '{{key}}' from en.json.",
      config_error: "i18n lint rule configuration error: {{message}}",
    },
  },
  defaultOptions: [],

  create(context) {
    const projectRoot = getContextCwd(context);
    const analysis = analyzeProject(projectRoot);

    return {
      Program(node): void {
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

        const locale = getLocaleFromFilePath(getContextFilename(context));
        if (!locale || locale === "en") {
          return;
        }

        const localeKeys = analysis.localeKeys.get(locale) ?? new Set<string>();
        for (const key of analysis.englishKeys) {
          if (!localeKeys.has(key)) {
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
