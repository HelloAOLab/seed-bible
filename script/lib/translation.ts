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

type Segment =
  | {
      kind: "placeholder";
      value: string;
    }
  | {
      kind: "text";
      value: string;
      translatedValue?: string;
    };

function splitTranslationValue(value: string): Segment[] {
  return value.split(PLACEHOLDER_REGEX).map((segment) => {
    if (segment.match(/^\{\{[^{}]+\}\}$/)) {
      return {
        kind: "placeholder",
        value: segment,
      };
    }

    return {
      kind: "text",
      value: segment,
    };
  });
}

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
  const resourceSegments = new Map<string, Segment[]>();
  const textSegmentsToTranslate: Array<{ key: string; segmentIndex: number }> =
    [];

  for (const [key, value] of entries) {
    const segments = splitTranslationValue(value);
    resourceSegments.set(key, segments);

    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
      const segment = segments[segmentIndex]!;
      if (segment.kind !== "text") {
        continue;
      }

      // Skip empty/whitespace-only chunks to preserve exact spacing around placeholders.
      if (!segment.value.trim()) {
        continue;
      }

      textSegmentsToTranslate.push({ key, segmentIndex });
    }
  }

  try {
    for (let i = 0; i < textSegmentsToTranslate.length; i += BATCH_SIZE) {
      const batch = textSegmentsToTranslate.slice(i, i + BATCH_SIZE);
      const [response] = await client.translateText({
        parent: `projects/${projectId}/locations/global`,
        sourceLanguageCode: input.language,
        targetLanguageCode: outputLanguage,
        mimeType: "text/plain",
        contents: batch.map(({ key, segmentIndex }) => {
          const segments = resourceSegments.get(key)!;
          const segment = segments[segmentIndex]!;
          return segment.value;
        }),
      });

      if (response.translations) {
        for (
          let j = 0;
          j < response.translations.length && j < batch.length;
          j++
        ) {
          const t = response.translations[j];
          const { key, segmentIndex } = batch[j]!;
          const segments = resourceSegments.get(key)!;
          const segment = segments[segmentIndex]!;

          if (t?.translatedText) {
            segment.value = t.translatedText;
          } else {
            console.warn(
              `Missing translated text for language "${outputLanguage}" in batch starting at index ${i}. Original key was: "${key}", segment index: ${segmentIndex}.`
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

  const resources: TranslationResources = {};
  for (const [key, segments] of resourceSegments) {
    resources[key] = segments
      .map((segment) => {
        if (segment.kind === "placeholder") {
          return segment.value;
        }

        return segment.translatedValue ?? segment.value;
      })
      .join("");
  }

  return { language: outputLanguage, resources };
}
