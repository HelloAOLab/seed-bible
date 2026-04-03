declare module "https://esm.sh/*" {
  export interface I18nLike {
    isInitialized?: boolean;
    language: string;
    use(plugin: unknown): I18nLike;
    init(options: unknown): Promise<unknown>;
    changeLanguage(language: string): Promise<unknown>;
    on(event: string, callback: (lng: string) => void): void;
    off(event: string, callback: (lng: string) => void): void;
  }

  export interface TranslationHookResult {
    t: (key: string, options?: Record<string, unknown>) => string;
    i18n: I18nLike;
  }

  export const initReactI18next: unknown;
  export function useTranslation(): TranslationHookResult;
  export function I18nextProvider(props: {
    i18n: I18nLike;
    children: unknown;
  }): Preact.JSX.Element;
  const defaultExport: I18nLike;
  export default defaultExport;

  export interface Signal<T> {
    value: T;
  }

  export function signal<T>(value: T): Signal<T>;
  export function useSignal<T>(value: T): Signal<T>;

  export function useMemo<T>(fn: () => T, deps: unknown[]): T;
  export function useEffect(
    fn: () => void | (() => void),
    deps: unknown[]
  ): void;
  export function useState<T>(
    initialValue: T
  ): [T, (value: T | ((prev: T) => T)) => void];
  export function useRef<T>(initialValue: T): { current: T };

  export function render(element: unknown, container: Element): void;
}
