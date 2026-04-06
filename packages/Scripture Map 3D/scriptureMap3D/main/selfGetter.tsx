import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

export function getSelf(): Bot {
  return thisBot;
}
