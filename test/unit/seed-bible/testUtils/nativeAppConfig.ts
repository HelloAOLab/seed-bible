/**
 * Makes the page look like the native app build, which injects an
 * `app-config` naming the public website (see `AppConfig.publicOrigin`).
 * Returns a function that removes it again.
 */
export function injectNativeAppConfig(
  publicOrigin = "https://seedbible.org"
): () => void {
  const el = document.createElement("script");
  el.type = "application/json";
  el.id = "app-config";
  el.textContent = JSON.stringify({ publicOrigin });
  document.head.appendChild(el);
  return () => el.remove();
}
