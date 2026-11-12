/**
 * The design tokens (shared scales, stacking layers, speeds and shadows), as
 * `--sb-*` custom properties. The app gets these from `base.inline.css`;
 * sandboxed extension frames don't load that file, so the host sends them this
 * copy alongside the theme instead. Keep the two in step (a unit test compares
 * them, including any override inside a media query).
 */
export const SHARED_TOKENS = {
  "--sb-radius-xs": "0.25rem",
  "--sb-radius-sm": "0.375rem",
  "--sb-radius-md": "0.5rem",
  "--sb-radius-lg": "0.75rem",
  "--sb-radius-xl": "1rem",
  "--sb-radius-2xl": "1.25rem",
  "--sb-radius-full": "999px",
  "--sb-layer-chrome": "100",
  "--sb-layer-popover": "500",
  "--sb-layer-modal": "1000",
  "--sb-layer-prompt": "1100",
  "--sb-layer-tour": "1200",
  "--sb-layer-toast": "1300",
  "--sb-duration-fast": "0.15s",
  "--sb-duration-base": "0.2s",
  "--sb-duration-slow": "0.3s",
  "--sb-font-size-10": "0.625rem",
  "--sb-font-size-11": "0.6875rem",
  "--sb-font-size-12": "0.75rem",
  "--sb-font-size-13": "0.8125rem",
  "--sb-font-size-14": "0.875rem",
  "--sb-font-size-15": "0.9375rem",
  "--sb-font-size-16": "1rem",
  "--sb-font-size-18": "1.125rem",
  "--sb-font-size-20": "1.25rem",
  "--sb-font-size-22": "1.375rem",
  "--sb-font-size-24": "1.5rem",
  "--sb-font-size-32": "2rem",
  "--sb-shadow-raised": "0 1px 3px var(--sb-shadow-color)",
  "--sb-shadow-popover": "0 10px 30px var(--sb-shadow-color)",
  "--sb-shadow-modal":
    "0 20px 48px color-mix(in srgb, var(--sb-shadow-color) 85%, black)",
  "--sb-shadow-sheet": "0 -8px 24px var(--sb-shadow-color)",
} as const;

export const SHARED_TOKENS_CSS = Object.entries(SHARED_TOKENS)
  .map(([name, value]) => `${name}: ${value};`)
  .join("\n");

type DurationToken = Extract<
  keyof typeof SHARED_TOKENS,
  `--sb-duration-${string}`
>;

/**
 * A speed token in milliseconds, for a timer that has to wait out a CSS
 * transition using the same token.
 */
export function durationMs(token: DurationToken): number {
  const value: string = SHARED_TOKENS[token];
  return value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000;
}
