/**
 * The shared size scale, as `--sb-*` custom properties. The app gets these
 * from `:root` in `base.inline.css`; sandboxed extension frames don't load
 * that file, so the host sends them this copy alongside the theme instead.
 * Keep the two in step (a unit test compares them).
 */
export const SHARED_TOKENS = {
  "--sb-radius-xs": "0.25rem",
  "--sb-radius-sm": "0.375rem",
  "--sb-radius-md": "0.5rem",
  "--sb-radius-lg": "0.75rem",
  "--sb-radius-xl": "1rem",
  "--sb-radius-full": "999px",
} as const;

export const SHARED_TOKENS_CSS = Object.entries(SHARED_TOKENS)
  .map(([name, value]) => `${name}: ${value};`)
  .join("\n");
