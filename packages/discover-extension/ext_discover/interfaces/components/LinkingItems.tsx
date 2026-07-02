export interface LinkingItemsProps {
  data: {
    id: string;
    links?: unknown[];
    [key: string]: unknown;
  };
  linkingMode?: boolean;
  playlistName?: string;
  playListId?: string;
}
