export interface PlaylistPlayingOpts {
  playingPlaylist?: string;
  skipAll?: boolean;
  startIndex?: number;
  startSubIndex?: number;
  parentId?: string;
  name?: string;
  list?: any[];
  remoteClick?: boolean;
  features?: Record<string, any>;
  playlist?: Record<string, any>;
}

export interface PlaylistPlayingManager {
  run: (opts: PlaylistPlayingOpts) => Promise<void>;
}
