import type { KeyStateEntry } from "../models/piece";
import type { PieceKey } from "../models/piece";

export interface TabernaclePieceConfigPort {
  getHighlightStates(key: PieceKey): KeyStateEntry[];
}
