import type { VFXPieceKey } from "../../../domain/models/vfx";
import type { VFXBotTypeMap } from "../../models/vfx";

interface AdapterParams {
  vfxBots: {
    [K in VFXPieceKey]: VFXBotTypeMap[K];
  };
}

export class VFXBotFactory {
  #vfxBots: AdapterParams["vfxBots"];

  constructor({ vfxBots }: AdapterParams) {
    this.#vfxBots = vfxBots;
  }

  create<K extends VFXPieceKey>(key: K): VFXBotTypeMap[K] {
    return create(this.#vfxBots[key], {
      space: "tempLocal",
    }) as VFXBotTypeMap[K];
  }
}
