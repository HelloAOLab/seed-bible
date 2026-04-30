/**
 * The translation resources for a language, which is just a mapping of translation keys to translated strings.
 */
type TranslationResources = Record<string, string>;

type TranslationLanguage = {
  language: string;
  resources: TranslationResources;
};

import { TranslationServiceClient } from "@google-cloud/translate";

const BATCH_SIZE = 128;
const PLACEHOLDER_REGEX = /(\{\{[^{}]+\}\})/g;

function htmlEncode(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlDecode(text: string): string {
  // Decode in reverse order of encoding so &amp; is always decoded last,
  // preventing double-decoding of sequences like &amp;lt; → &lt; → <.
  return text
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

/**
 * Encodes a translation value for the Google Cloud Translate HTML mode.
 * Non-placeholder text is HTML-encoded; each placeholder is wrapped in a
 * `<span translate="no">` tag so the API preserves it verbatim.
 */
export function encodeValueForHtml(value: string): string {
  return value
    .split(PLACEHOLDER_REGEX)
    .map((part) =>
      part.match(/^\{\{[^{}]+\}\}$/)
        ? `<span translate="no">${part}</span>`
        : htmlEncode(part)
    )
    .join("");
}

/**
 * Strips `<span translate="no">…</span>` wrappers left by the API and
 * HTML-decodes the remaining text.
 */
export function decodeValueFromHtml(html: string): string {
  return htmlDecode(html.replace(/<span translate="no">(.*?)<\/span>/gs, "$1"));
}

const languageMap = new Map([
  ["ind", "id"], // Google Translate uses "id" for Indonesian, but we use "ind" because "id" is a reserved tag in CasualOS.
]);

/**
 * Translates the given translation resources from the input language to the output language using the Google Cloud Translation API.
 * @param projectId The project ID for the Google Cloud project that has the Translation API enabled.
 * @param input The translation language object containing the input language code and its translation resources.
 */
export async function translateResources(
  projectId: string,
  input: TranslationLanguage,
  outputLanguage: string
): Promise<TranslationLanguage> {
  const client = new TranslationServiceClient({
    projectId,
  });

  const entries = Object.entries(input.resources);
  const resources: TranslationResources = {};

  try {
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const [response] = await client.translateText({
        parent: `projects/${projectId}/locations/global`,
        sourceLanguageCode: languageMap.get(input.language) ?? input.language,
        targetLanguageCode: languageMap.get(outputLanguage) ?? outputLanguage,
        mimeType: "text/html",
        contents: batch.map(([, value]) => encodeValueForHtml(value)),
      });

      if (response.translations) {
        for (
          let j = 0;
          j < response.translations.length && j < batch.length;
          j++
        ) {
          const t = response.translations[j];
          const [key] = batch[j]!;

          if (t?.translatedText) {
            resources[key] = decodeValueFromHtml(t.translatedText);
          } else {
            console.warn(
              `Missing translated text for language "${outputLanguage}" in batch starting at index ${i}. Original key was: "${key}".`
            );
          }
        }
      }
    }
  } catch (err) {
    console.error(
      "Error translating resources for language:",
      outputLanguage,
      err
    );
    throw err;
  }

  return { language: outputLanguage, resources };
}
