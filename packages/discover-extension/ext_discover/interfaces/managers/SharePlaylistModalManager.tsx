export interface SharePlaylistModalManager {
  playlistSharerName: string;
  playlistShared: Record<string, any> | null;
  shareProfilePic: string | false;
  init: (opts: {
    playlistSharerName: string;
    playlistShared: Record<string, any> | null;
    shareProfilePic?: string | false;
  }) => void;
  close: () => void;
  begin: () => void;
}
