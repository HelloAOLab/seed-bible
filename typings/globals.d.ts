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
    onUndoActions?: () => void;
  }) => void;
  const getPosition: () => { x: number; y: number };
  const FormatRelativeTime: (dateTime: number | null | Date) => string;
  const setPlaylistLocale: (playLists: any[], id: string) => void;
  const setPlaylistsLocale: (playLists: any[]) => void;
  const setCollectionsLocale: (collections: any[]) => void;
  const PlaylistModeTypes: Record<string, string>;
  const DataManager: {
    playSound: (options: { data: string }) => Promise<void>;
    cancelCurrentPlayingSound: () => void;
    endVoiceRecord: (options?: { setData?: (data: string) => void }) => void;
    recordVoice: () => void;
  };
  const getPsalmsBookName: (chapter: number) => string;
  const getSectionRanking: () => Record<string, any>;
  const getPsalmsBookData: (chapter: number) => Record<string, any>;
  const findNameRank: (
    bookName: string,
    returnRanks?: boolean,
    isFindByRank?: boolean
  ) => Record<string, any>;
  const CheckMultiFuntionHold: () => boolean;
  const EmitData: (functionName: string, data: any) => void;
}

export const G = globalThis as unknown as Record<string, any>;
