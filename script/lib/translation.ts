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

/**
 * Translates the given translation resources from the input language to the output language using the Google Cloud Translation API.
 * @param googleCloudApiKey The API key for the Google Cloud Translation API.
 * @param projectId The project ID for the Google Cloud project that has the Translation API enabled.
 * @param input The translation language object containing the input language code and its translation resources.
 */
export async function translateResources(
  googleCloudApiKey: string,
  projectId: string,
  input: TranslationLanguage,
  outputLanguage: string
): Promise<TranslationLanguage> {
  const client = new TranslationServiceClient({
    key: googleCloudApiKey,
    projectId,
  });

  const entries = Object.entries(input.resources);

  const resources: TranslationResources = {};
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batchEntries = entries.slice(i, i + BATCH_SIZE);
    const [response] = await client.translateText({
      sourceLanguageCode: input.language,
      targetLanguageCode: outputLanguage,
      mimeType: "text/plain",
      contents: batchEntries.map(([_, value]) => value),
    });

    if (response.translations) {
      for (
        let j = 0;
        j < response.translations.length && j < batchEntries.length;
        j++
      ) {
        const t = response.translations[j];
        const [key] = batchEntries[j]!;

        if (t?.translatedText) {
          resources[key] = t.translatedText;
        } else {
          console.warn(
            `Missing translated text for language "${outputLanguage}" in batch starting at index ${i}. Original key was: "${key}".`
          );
        }
      }
    }
  }

  return { language: outputLanguage, resources };
}
