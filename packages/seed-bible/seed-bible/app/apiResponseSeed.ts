/**
 * Reads the SSR API response snapshot the host server injected as a JSON
 * `<script>` tag (see `entry-ssr.tsx`'s `<!-- SEED_JSON -->` placeholder and
 * `FreeUseBibleAPI.snapshotResponseCache`). The client passes this to
 * `createSeedBibleState` (`apiResponseSnapshot`) so its own `FreeUseBibleAPI`
 * — a fresh instance with an empty cache — is seeded with whatever the
 * server already fetched to render the page, instead of re-fetching it.
 */
export function readInjectedApiResponseSnapshot(): Record<string, unknown> {
  if (typeof document === "undefined") {
    return {};
  }
  const el = document.getElementById("app-seed-data");
  if (!el?.textContent) {
    return {};
  }
  try {
    const parsed = JSON.parse(el.textContent);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
