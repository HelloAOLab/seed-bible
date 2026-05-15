declare global {
  // Add index signature to allow any property on globalThis
  interface GlobalThis {
    [key: string]: any;
  }

  // type Bot = import("./AuxLibraryDefinitions").Bot;
  // type SharedDocument = import("./AuxLibraryDefinitions").SharedDocument;
  // type SharedArray<T> = import("./AuxLibraryDefinitions").SharedArray<T>;
  // type SharedMap<T> = import("./AuxLibraryDefinitions").SharedMap<T>;
  // type ConnectionInfo = import("./AuxLibraryDefinitions").ConnectionInfo;
  // type FocusOnOptions = import("./AuxLibraryDefinitions").FocusOnOptions;
  // type BotTags = import("./AuxLibraryDefinitions").BotTags;
  // type StoredAux = import("./AuxLibraryDefinitions").StoredAux;

  // Your other specific globals (optional, for better intellisense)
  // const that: any;
  // const authBot: Bot;
  // const configBot: Bot;
  // const gridPortalBot: Bot;
  // const mapPortalBot: Bot;
  // const miniMapPortalBot: Bot;

  const posthog: any;
}

export const G = globalThis as unknown as Record<string, any>;

interface ImportMeta {
  glob: (
    pattern: string,
    options?: { eager?: boolean }
  ) => Record<string, unknown>;
}

declare module "*.css" {
  const url: string;
  export default url;
}
