import { Bot } from "./AuxLibraryDefinitions";
declare module "./AuxLibraryDefinitions" {
  export interface Bot {
    [key: string]: any;
  }
}

declare global {
  interface Bot {
    [key: string]: any;
  }
}
