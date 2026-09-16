import { VFX_PIECE_KEYS } from "../../domain/models/vfx";
import type { VFXBot } from "./casualos";

export interface VFXBotTypeMap {
  [VFX_PIECE_KEYS.CONE]: VFXBot<typeof VFX_PIECE_KEYS.CONE>;
  [VFX_PIECE_KEYS.GLOW]: VFXBot<typeof VFX_PIECE_KEYS.GLOW>;
}
