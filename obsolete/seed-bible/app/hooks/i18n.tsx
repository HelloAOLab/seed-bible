// i18n configuration using CDN
// Loads i18next and react-i18next from CDN
// Translations are loaded from app.locales bot tags

const i18nScripts = [
  "https://unpkg.com/i18next@23.16.4/i18next.min.js",
  "https://unpkg.com/react-i18next@15.1.3/react-i18next.min.js",
  "https://unpkg.com/i18next-browser-languagedetector@8.0.2/i18nextBrowserLanguageDetector.min.js",
];

// Supported language codes
const supportedLangCodes = [
  "am",
  "ar",
  "bn",
  "zh",
  "en",
  "fr",
  "hi",
  "iid",
  "ja",
  "ko",
  "mn",
  "ne",
  "ps",
  "fa",
  "pt",
  "ru",
  "es",
  "sw",
  "ti",
  "tr",
  "uk",
  "ur",
  "ug",
  "vi",
];

// Load translations from bot tags
function loadTranslations(): Record<
  string,
  { translation: Record<string, string> }
> {
  const localesBot = getBot("system", "app.assets");
  os.log("Loading translations from bot tags...", localesBot);
  const resources: Record<string, { translation: Record<string, string> }> = {};
  for (const langCode of supportedLangCodes) {
    const translations = localesBot?.tags?.[langCode];
    os.log(`Loaded translations for ${langCode}:`, translations);
    if (translations) {
      resources[langCode] = {
        translation:
          typeof translations === "string"
            ? JSON.parse(translations)
            : translations,
      };
    }
  }

  return resources;
}

// Available languages for UI
export const availableLanguages = [
  { code: "am", name: "Amharic", nativeName: "አማርኛ" },
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "iid", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "mn", name: "Mongolian", nativeName: "Монгол" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली" },
  { code: "ps", name: "Pashto", nativeName: "پښتو", rtl: true },
  { code: "fa", name: "Persian", nativeName: "فارسی", rtl: true },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili" },
  { code: "ti", name: "Tigrinya", nativeName: "ትግርኛ" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська" },
  { code: "ur", name: "Urdu", nativeName: "اردو", rtl: true },
  { code: "ug", name: "Uyghur", nativeName: "ئۇيغۇرچە", rtl: true },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
];

let i18nInstance: any = null;
let isInitialized = false;
let resources: Record<string, { translation: Record<string, string> }> = {};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

// Get browser language and map to supported language
export function getBrowserLanguage(): string {
  // Use navigator.language API
  const browserLang =
    navigator.language || (navigator as any).userLanguage || "en";

  // Extract the primary language code (e.g., "en" from "en-US")
  const primaryLang = browserLang.split("-")[0].toLowerCase();

  // Check if the primary language is supported
  if (supportedLangCodes.includes(primaryLang)) {
    return primaryLang;
  }

  // Check navigator.languages for fallback options
  if (navigator.languages && navigator.languages.length > 0) {
    for (const lang of navigator.languages) {
      const code = lang?.split("-")[0]?.toLowerCase();
      if (code && supportedLangCodes.includes(code)) {
        return code;
      }
    }
  }

  return "en"; // Default fallback
}

export async function initI18n(): Promise<any> {
  if (isInitialized && i18nInstance) {
    return i18nInstance;
  }

  // Load translations from bot tags
  resources = loadTranslations();

  // Load scripts sequentially
  for (const src of i18nScripts) {
    await loadScript(src);
  }

  // Access i18next from global
  const i18next = (globalThis as any).i18next;

  if (!i18next) {
    throw new Error("i18next failed to load from CDN");
  }

  // Check configBot.tags.lang first, then localStorage, then browser detection
  const tagLang = configBot?.tags?.lang;
  const savedLang = localStorage.getItem("i18nextLng");
  const detectedLang =
    (tagLang && supportedLangCodes.includes(tagLang) ? tagLang : null) ||
    savedLang ||
    getBrowserLanguage();

  await i18next.init({
    resources,
    lng: detectedLang,
    fallbackLng: "en",
    debug: false,
    interpolation: {
      escapeValue: false,
    },
  });

  // Save detected language to localStorage for persistence
  if (!savedLang) {
    localStorage.setItem("i18nextLng", detectedLang);
  }

  i18nInstance = i18next;
  isInitialized = true;

  // Expose globally
  (globalThis as any).i18n = i18next;
  (globalThis as any).t = i18next.t.bind(i18next);

  return i18next;
}

// Translation function that works before/after init
export function t(key: string, options?: any): string {
  if (i18nInstance) {
    return i18nInstance.t(key, options);
  }
  // Fallback to English if not initialized
  const keys = key.split(".");
  let value: any = resources.en?.translation;
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
}

// Change language
export function changeLanguage(lng: string): Promise<void> {
  if (i18nInstance) {
    localStorage.setItem("i18nextLng", lng);
    // Sync to configBot tags
    if (configBot?.tags) {
      configBot.tags.lang = lng;
    }
    // Update document direction for RTL languages
    const langConfig = availableLanguages.find((l) => l.code === lng);
    document.documentElement.dir = langConfig?.rtl ? "rtl" : "ltr";
    document.documentElement.lang = lng;
    if (lng !== getCurrentLanguage()) {
      shout("onLanguageChanged", { lng });
    }
    return i18nInstance.changeLanguage(lng);
  }
  return Promise.resolve();
}

// Get current language
export function getCurrentLanguage(): string {
  if (i18nInstance) {
    return i18nInstance.language;
  }
  return localStorage.getItem("i18nextLng") || "en";
}

// Check if current language is RTL
export function isRTL(): boolean {
  const lang = getCurrentLanguage();
  const langConfig = availableLanguages.find((l) => l.code === lang);
  return langConfig?.rtl || false;
}

// Get all translations for current language
export function getTranslations(): Record<string, string> {
  const lang = getCurrentLanguage();
  return (
    resources[lang as keyof typeof resources]?.translation ||
    resources.en?.translation ||
    {}
  );
}

const numberTranslations: Record<string, string[]> = {
  // Western Arabic numerals (default)
  en: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  es: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  fr: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  pt: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  iid: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  sw: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  tr: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  vi: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  ru: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  uk: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  mn: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  zh: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  ja: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  ko: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  am: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  ti: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  // Devanagari numerals
  hi: ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
  ne: ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
  // Arabic-Indic numerals
  ar: ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"],
  // Eastern Arabic-Indic numerals (Persian/Urdu/Pashto/Uyghur)
  fa: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"],
  ur: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"],
  ps: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"],
  ug: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"],
  // Bengali numerals
  bn: ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"],
};

export function getTranslatedNumber(num: number): string {
  const lang = getCurrentLanguage();
  const numStringArr = String(num).split("");
  const digitsForLang = numberTranslations[lang] ?? numberTranslations["en"];
  return numStringArr
    .map((digit) => {
      if (digit >= "0" && digit <= "9") {
        const idx = parseInt(digit, 10);
        const translated = digitsForLang?.[idx];
        return translated ?? digit;
      }
      return digit;
    })
    .join("");
}

export { resources };
