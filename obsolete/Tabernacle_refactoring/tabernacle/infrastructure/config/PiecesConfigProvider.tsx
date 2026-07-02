import type { TabernaclePieceConfigPort } from "../../domain/ports/pieceConfig";
import type { KeyStateEntry, PieceKey } from "../../domain/models/piece";

const highlightStatesMap: Partial<Record<PieceKey, KeyStateEntry[]>> = {
  "ark-of-covenant": [
    { key: "brown-curtain", state: "Hidden" },
    { key: "grey-curtain", state: "Hidden" },
    { key: "purple-curtain", state: "Hidden" },
    { key: "red-curtain", state: "Hidden" },
    { key: "rings", state: "Hidden" },
    { key: "walls", state: "Hidden" },
    { key: "bars", state: "Hidden" },
  ],
  bars: [
    { key: "brown-curtain", state: "Hidden" },
    { key: "grey-curtain", state: "Hidden" },
    { key: "purple-curtain", state: "Hidden" },
    { key: "red-curtain", state: "Hidden" },
  ],
  "bronze-laver": [
    { key: "grey-curtain", state: "Hidden" },
    { key: "red-curtain", state: "Hidden" },
    { key: "purple-curtain", state: "Shown" },
    { key: "rings", state: "Shown" },
    { key: "walls", state: "Shown" },
    { key: "bars", state: "Shown" },
  ],
  "front-curtain": [
    { key: "brown-curtain", state: "Hidden" },
    { key: "grey-curtain", state: "Hidden" },
    { key: "purple-curtain", state: "Hidden" },
    { key: "red-curtain", state: "Hidden" },
    { key: "front-pillars", state: "Translucent" },
    { key: "inner-pillars", state: "Translucent" },
    { key: "walls", state: "Translucent" },
    { key: "rings", state: "Translucent" },
    { key: "bars", state: "Translucent" },
  ],
  "front-pillars": [
    { key: "brown-curtain", state: "Hidden" },
    { key: "grey-curtain", state: "Hidden" },
    { key: "purple-curtain", state: "Hidden" },
    { key: "red-curtain", state: "Hidden" },
  ],
  "grey-curtain": [
    { key: "red-curtain", state: "Shown" },
    { key: "purple-curtain", state: "Shown" },
    { key: "brown-curtain", state: "Shown" },
    { key: "rings", state: "Shown" },
    { key: "walls", state: "Shown" },
    { key: "bars", state: "Shown" },
  ],
  "incense-altar": [
    { key: "brown-curtain", state: "Hidden" },
    { key: "grey-curtain", state: "Hidden" },
    { key: "purple-curtain", state: "Hidden" },
    { key: "red-curtain", state: "Hidden" },
    { key: "rings", state: "Hidden" },
    { key: "walls", state: "Hidden" },
    { key: "bars", state: "Hidden" },
  ],
  "inner-curtain": [
    { key: "brown-curtain", state: "Hidden" },
    { key: "grey-curtain", state: "Hidden" },
    { key: "purple-curtain", state: "Hidden" },
    { key: "red-curtain", state: "Hidden" },
    { key: "front-pillars", state: "Translucent" },
    { key: "inner-pillars", state: "Translucent" },
    { key: "walls", state: "Translucent" },
    { key: "rings", state: "Translucent" },
    { key: "bars", state: "Translucent" },
  ],
  "inner-pillars": [
    { key: "brown-curtain", state: "Hidden" },
    { key: "grey-curtain", state: "Hidden" },
    { key: "purple-curtain", state: "Hidden" },
    { key: "red-curtain", state: "Hidden" },
  ],
  menorah: [
    { key: "brown-curtain", state: "Hidden" },
    { key: "grey-curtain", state: "Hidden" },
    { key: "red-curtain", state: "Hidden" },
    { key: "rings", state: "Shown" },
    { key: "walls", state: "Shown" },
    { key: "bars", state: "Shown" },
  ],
  "purple-curtain": [
    { key: "grey-curtain", state: "Hidden" },
    { key: "purple-curtain", state: "Shown" },
    { key: "brown-curtain", state: "Shown" },
    { key: "rings", state: "Shown" },
    { key: "walls", state: "Shown" },
    { key: "bars", state: "Shown" },
  ],
  "red-curtain": [
    { key: "brown-curtain", state: "Hidden" },
    { key: "grey-curtain", state: "Hidden" },
    { key: "purple-curtain", state: "Hidden" },
    { key: "red-curtain", state: "Hidden" },
  ],
  rings: [
    { key: "brown-curtain", state: "Hidden" },
    { key: "grey-curtain", state: "Hidden" },
    { key: "purple-curtain", state: "Hidden" },
    { key: "red-curtain", state: "Hidden" },
    { key: "rings", state: "Hidden" },
    { key: "walls", state: "Hidden" },
    { key: "bars", state: "Hidden" },
  ],
  "table-of-showbread": [
    { key: "brown-curtain", state: "Hidden" },
    { key: "grey-curtain", state: "Hidden" },
    { key: "purple-curtain", state: "Hidden" },
    { key: "red-curtain", state: "Hidden" },
  ],
};

export class PiecesConfigProvider implements TabernaclePieceConfigPort {
  getHighlightStates(key: PieceKey): KeyStateEntry[] {
    return highlightStatesMap[key] ?? [];
  }
}
