export function isMobilePlaylistViewport(): boolean {
  const G = globalThis as Record<string, unknown>;
  const gridPortalBot = G.gridPortalBot as
    | { tags: { pixelWidth: number } }
    | undefined;
  const threshold = (G.MOBILE_VIEWPORT_THRESHOLD as number | undefined) ?? 600;

  return (
    (window?.innerWidth || gridPortalBot?.tags.pixelWidth || 0) < threshold
  );
}
