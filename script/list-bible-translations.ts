import {
  FreeUseBibleAPI,
  DEFAULT_API_ENDPOINT,
  type Translation,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

type WebResponse<T> = {
  status: number;
  statusText: string;
  data: Promise<T>;
};

function parseArgValue(flag: string): string | null {
  const prefix = `${flag}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function printUsage(): void {
  console.log(
    "Usage: pnpm list-bible-translations [--language=<iso-639-3>] [--endpoint=<url>]"
  );
  console.log("");
  console.log("Examples:");
  console.log("  pnpm list-bible-translations");
  console.log("  pnpm list-bible-translations --language=eng");
  console.log(
    "  pnpm list-bible-translations --endpoint=https://bible.helloao.org/"
  );
}

function compareTranslations(a: Translation, b: Translation): number {
  const byEnglishLanguageName = (a.languageEnglishName ?? "").localeCompare(
    b.languageEnglishName ?? ""
  );
  if (byEnglishLanguageName !== 0) {
    return byEnglishLanguageName;
  }

  const byLanguageCode = a.language.localeCompare(b.language);
  if (byLanguageCode !== 0) {
    return byLanguageCode;
  }

  const byEnglishName = (a.englishName ?? "").localeCompare(
    b.englishName ?? ""
  );
  if (byEnglishName !== 0) {
    return byEnglishName;
  }

  return a.id.localeCompare(b.id);
}

function getLanguageLabel(translation: Translation): string {
  const englishName = translation.languageEnglishName?.trim();
  const localName = translation.languageName?.trim();
  const code = translation.language;

  if (englishName && localName && englishName !== localName) {
    return `${englishName} (${localName}) [${code}]`;
  }

  if (englishName) {
    return `${englishName} [${code}]`;
  }

  if (localName) {
    return `${localName} [${code}]`;
  }

  return code;
}

function groupByLanguage(
  translations: Translation[]
): Map<string, Translation[]> {
  const groups = new Map<string, Translation[]>();

  for (const translation of translations) {
    const languageCode = translation.language;
    const existing = groups.get(languageCode) ?? [];
    existing.push(translation);
    groups.set(languageCode, existing);
  }

  for (const [languageCode, entries] of groups.entries()) {
    groups.set(languageCode, entries.sort(compareTranslations));
  }

  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

async function main(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    return;
  }

  const languageFilter =
    parseArgValue("--language")?.trim().toLowerCase() ?? null;
  const endpoint = parseArgValue("--endpoint")?.trim() || DEFAULT_API_ENDPOINT;

  // FreeUseBibleAPI expects a CasualOS-style `web.get()` API. In scripts,
  // provide a compatible shim backed by standard fetch.
  const globalWithWeb = globalThis as unknown as {
    web?: {
      get: (url: string) => Promise<WebResponse<unknown>>;
    };
  };

  globalWithWeb.web = {
    get: async (url: string): Promise<WebResponse<unknown>> => {
      const response = await fetch(url);
      return {
        status: response.status,
        statusText: response.statusText,
        data: response.json(),
      };
    },
  };

  const api = new FreeUseBibleAPI(endpoint);
  const { translations } = await api.getAvailableTranslations();

  const filtered = languageFilter
    ? translations.filter(
        (translation) => translation.language.toLowerCase() === languageFilter
      )
    : translations;

  if (filtered.length === 0) {
    if (languageFilter) {
      console.log(`No translations found for language: ${languageFilter}`);
      return;
    }

    console.log("No translations found.");
    return;
  }

  const grouped = groupByLanguage(filtered);

  console.log(`Endpoint: ${endpoint}`);
  if (languageFilter) {
    console.log(`Language filter: ${languageFilter}`);
  }
  console.log(`Total translations: ${filtered.length}`);
  console.log("");

  for (const entries of grouped.values()) {
    const languageLabel = getLanguageLabel(entries[0]!);
    console.log(`${languageLabel} (${entries.length})`);

    for (const translation of entries) {
      const direction = translation.textDirection;
      console.log(
        `  - ${translation.id} | ${translation.englishName} | ${translation.name} | ${direction}`
      );
    }

    console.log("");
  }
}

main().catch((error) => {
  console.error("Failed to list Bible translations:", error);
  process.exitCode = 1;
});
