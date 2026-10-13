/**
 * Reads a JSON object the host server injected into the page as a
 * `<script type="application/json" id="...">` tag (see `entry-ssr.tsx`).
 * Undefined when there is no document, no such tag, or it doesn't hold an
 * object. The result crossed a server/client boundary, so callers validate
 * it before trusting its shape.
 */
export function readInjectedJsonObject<T>(elementId: string): T | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const el = document.getElementById(elementId);
  if (!el?.textContent) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(el.textContent);
    return parsed && typeof parsed === "object" ? (parsed as T) : undefined;
  } catch (error) {
    console.error(`Failed to parse injected JSON #${elementId}:`, error);
    return undefined;
  }
}
