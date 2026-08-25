import type { Piece } from "../../../domain/models/canvas";
import type { Easing } from "../../../../../pattern-typings/AuxLibraryDefinitions";
import type { VerseMapper } from "../../mappers/VerseMapper";
import { AnimateStrictTag, SetStrictTag } from "../../functions/casualos";
import type { VerseBotTags } from "../../models/stack";

interface AdapterParams {
  mapper: VerseMapper;
}

export class VersesAdapter {
  #mapper: AdapterParams["mapper"];

  constructor({ mapper }: AdapterParams) {
    this.#mapper = mapper;
  }

  async hide({
    piece,
    dimension,
    delay,
    duration,
    easing = { type: "elastic", mode: "in" },
  }: {
    piece: Piece<"Verse">;
    dimension: string;
    delay: number;
    duration: number;
    easing?: Easing;
  }): Promise<void> {
    const verseBot = this.#mapper.toInfrastructure(piece);
    if (!verseBot) {
      throw new Error("VersesAdapter: verseBot not found at hide");
    }
    await os.sleep(delay);
    await AnimateStrictTag(verseBot, "scaleZ", {
      toValue: 0,
      duration,
      easing,
      tagMaskSpace: false,
    });
    SetStrictTag(verseBot, dimension as keyof VerseBotTags, false);
  }
}
