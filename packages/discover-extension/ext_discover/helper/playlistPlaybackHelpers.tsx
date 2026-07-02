import { runPlaylistPlaying } from "ext_discover.helper.runPlaylistPlaying";
import { renderLinkContent } from "ext_discover.helper.renderLinkContent";

export function startPlaylistPlaying(opts: Record<string, any>) {
  const G = globalThis as Record<string, any>;
  const invoke = runPlaylistPlaying;
  if (typeof invoke === "function") {
    return invoke(opts);
  }
  const fallback = G.Playlist?.Playlistplaying ?? G.Playlistplaying;
  if (typeof fallback === "function") {
    return fallback(opts);
  }
}

export function invokeRenderLinkContent(data: Record<string, any>) {
  return renderLinkContent(data);
}
