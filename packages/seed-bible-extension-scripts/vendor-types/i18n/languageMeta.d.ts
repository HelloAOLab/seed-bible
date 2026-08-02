export interface LanguageMeta {
  cc: string;
  display: string;
  /** UI language to use for the default Bible translation when none exists for this language. */
  fallback?: string;
}
export declare const LANG_META: Record<string, LanguageMeta>;
