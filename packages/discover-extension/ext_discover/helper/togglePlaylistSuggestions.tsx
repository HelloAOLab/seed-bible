export function togglePlaylistSuggestions(that?: any) {
  const G = globalThis as any;
  if (G.TogglePlaylistSuggestions) {
    G.TogglePlaylistSuggestions();
  }
}
