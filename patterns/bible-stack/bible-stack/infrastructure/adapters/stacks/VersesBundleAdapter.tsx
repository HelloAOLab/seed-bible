import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { VersesBundleAdapterPort } from "bibleStack.application.ports.versesBundle";
import type { Easing } from "../../../../../pattern-typings/AuxLibraryDefinitions";
import {
  AnimateStrictTag,
  SetStrictTag,
} from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/functions/casualos";
import type { VersesBundleMapper } from "../../mappers/VersesBundleMapper";
import type { VersesBundleTags } from "@packages/Bible Stack/bibleStack/models/stack";
import type { VisualStateRegistry } from "./VisualStateRegistry";
import type { VersesBundleData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/VersesBunbleData";
import type { VersesAdapter } from "./VersesAdapter";

interface AdapterParams {
  mapper: VersesBundleMapper;
  visualStateRegistry: VisualStateRegistry;
  versesAdapter: VersesAdapter;
}

export class VersesBundleAdapter implements VersesBundleAdapterPort {
  #mapper: AdapterParams["mapper"];
  #visualStateRegistry: AdapterParams["visualStateRegistry"];
  #versesAdapter: AdapterParams["versesAdapter"];
  constructor({ mapper, visualStateRegistry, versesAdapter }: AdapterParams) {
    this.#mapper = mapper;
    this.#visualStateRegistry = visualStateRegistry;
    this.#versesAdapter = versesAdapter;
  }

  highlight(piece: Piece<"VersesBundle">) {
    console.log("VersesBundleAdapte.highlight", { piece });
    // TODO: Bring verses bundle highlight logic here
  }
  unhighlight(piece: Piece<"VersesBundle">) {
    console.log("VersesBundleAdapte.unhighlight", { piece });
    // TODO: Bring verses bundle unhighlight logic here
  }
  async show({
    piece,
    dimension,
    delay,
    duration,
    easing = { type: "elastic", mode: "out" },
  }: {
    piece: Piece<"VersesBundle">;
    dimension: string;
    delay: number;
    duration: number;
    easing?: Easing;
  }): Promise<void> {
    await os.sleep(delay);
    const bundleBot = this.#mapper.toInfrastructure(piece);
    if (!bundleBot) {
      throw new Error(`VersesBundleAdapter: bundleBot not found at show.`);
    }
    SetStrictTag(bundleBot, dimension as keyof VersesBundleTags, true);
    await AnimateStrictTag(bundleBot, "scaleZ", {
      toValue: this.#visualStateRegistry.getStateProperty({
        piece,
        property: "desiredScaleZ",
      }),
      duration,
      easing,
    });
  }
  async hide({
    data,
    dimension,
    delay,
    duration,
    easing = { type: "elastic", mode: "in" },
  }: {
    data: VersesBundleData;
    dimension: string;
    delay: number;
    duration: number;
    easing?: Easing;
  }): Promise<void> {
    await os.sleep(delay);
    if (data.isSelected) {
      await this.#hideSelected({ data, dimension, delay, duration });
    } else {
      await this.#hideIdle({ data, dimension, duration, easing });
    }
  }

  /** A selected bundle hides its individual verses. */
  async #hideSelected({
    data,
    dimension,
    delay,
    duration,
  }: {
    data: VersesBundleData;
    dimension: string;
    delay: number;
    duration: number;
  }): Promise<void> {
    const reversedVerses = data.getReversedVerses();
    await Promise.all(
      reversedVerses.map((verse, index) => {
        if (!verse.piece) {
          throw new Error(
            "VersesBundleAdapter: verse.piece not defined at hide"
          );
        }
        return this.#versesAdapter.hide({
          piece: verse.piece,
          dimension,
          delay: delay * index,
          duration,
        });
      })
    );
  }

  /** An idle bundle collapses its depth and leaves the dimension. */
  async #hideIdle({
    data,
    dimension,
    duration,
    easing,
  }: {
    data: VersesBundleData;
    dimension: string;
    duration: number;
    easing: Easing;
  }): Promise<void> {
    if (!data.piece) {
      throw new Error("VersesBundleAdapter: bundle.piece not defined at hide");
    }
    const bundleBot = this.#mapper.toInfrastructure(data.piece);
    if (!bundleBot) {
      throw new Error("VersesBundleAdapter: bundleBot not found at hide");
    }
    await AnimateStrictTag(bundleBot, "scaleZ", {
      toValue: 0,
      duration,
      easing,
    });
    SetStrictTag(bundleBot, dimension as keyof VersesBundleTags, false);
  }
}
