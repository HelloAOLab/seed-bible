declare global {
  // Add index signature to allow any property on globalThis
  interface GlobalThis {
    [key: string]: any;
  }

  // Your other specific globals (optional, for better intellisense)
  const that: any;
  const authBot: Bot;
  const configBot: Bot;
  const gridPortalBot: Bot;
  const mapPortalBot: Bot;
  const miniMapPortalBot: Bot;
  const t: (key: string, options?: { [key: string]: any }) => string;
  const ShowNotification: (options: {
    message: string;
    severity: "error" | "warning" | "info" | "success";
  }) => void;
  const getPosition: () => { x: number; y: number };
  const FormatRelativeTime: (dateTime: number) => string;
  const setPlaylistLocale: (playLists: any[], id: string) => void;
  const setPlaylistsLocale: (playLists: any[]) => void;
  const setCollectionsLocale: (collections: any[]) => void;
  const PlaylistModeTypes: Record<string, string>;
}

export const G = globalThis as unknown as Record<string, any>;
