import type { Piece } from "../../../domain/models/canvas";
import type { VersesBundleSelectionAdapterPort } from "../../../application/ports/out/VersesBundleSelection";
import type { VersesBundleConfigProvider } from "../../config/versesBundleSelection/VersesBundleConfigProvider";
import {
  AnimateStrictTag,
  ApplyStrictMod,
  GetBotScales,
  SetStrictTag,
} from "../../functions/casualos";
import type { VerseMapper } from "../../mappers/VerseMapper";
import type { VersesBundleMapper } from "../../mappers/VersesBundleMapper";
import type { VerseBotTags, VersesBundleBot } from "../../models/stack";
import type { VisualStateRegistry } from "./VisualStateRegistry";

interface AdapterParams {
  getDimension: () => string;
  versesBundleConfigProvider: VersesBundleConfigProvider;
  versesBundleMapper: VersesBundleMapper;
  verseMapper: VerseMapper;
  visualStateRegistry: VisualStateRegistry;
}

export class VersesBundleSelectionAdapter implements VersesBundleSelectionAdapterPort {
  #getDimension: AdapterParams["getDimension"];
  #versesBundleConfigProvider: AdapterParams["versesBundleConfigProvider"];
  #versesBundleMapper: AdapterParams["versesBundleMapper"];
  #visualStateRegistry: AdapterParams["visualStateRegistry"];
  #verseMapper: AdapterParams["verseMapper"];

  constructor({
    getDimension,
    versesBundleConfigProvider,
    versesBundleMapper,
    visualStateRegistry,
    verseMapper,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#versesBundleConfigProvider = versesBundleConfigProvider;
    this.#versesBundleMapper = versesBundleMapper;
    this.#visualStateRegistry = visualStateRegistry;
    this.#verseMapper = verseMapper;
  }

  async select({
    bundle,
    verseStart,
    verses,
  }: {
    bundle: Piece<"VersesBundle">;
    verseStart: number;
    verses: Piece<"Verse">[];
  }): Promise<void> {
    const bundleBot = this.#versesBundleMapper.toInfrastructure(bundle);
    if (!bundleBot) {
      throw new Error(
        "VersesBundleSelectionAdapter: bundleBot not found at select"
      );
    }
    const dimension = this.#getDimension();
    const gap = this.#versesBundleConfigProvider.getLayoutParam("gap");
    const maxColumns =
      this.#versesBundleConfigProvider.getLayoutParam("maxColumns");
    const maxRows = this.#versesBundleConfigProvider.getLayoutParam("maxRows");
    const verseDesiredScale = new Vector3(
      bundleBot.tags.scaleX / maxColumns - gap,
      bundleBot.tags.scaleY / maxRows - gap,
      this.#visualStateRegistry.getStateProperty({
        piece: bundle,
        property: "desiredScaleZ",
      }) - gap
    );
    const bundlePosition = getBotPosition(bundleBot, dimension);
    const bundleScales = GetBotScales(bundleBot);

    const duration = this.#versesBundleConfigProvider.getDuration();
    const firstSequenceEasing =
      this.#versesBundleConfigProvider.getFirstSequenceEasing();
    const secondSequenceEasing =
      this.#versesBundleConfigProvider.getSecondSequenceEasing();

    let column = 0;
    let row = 0;

    for (let index = 0; index < verses.length; index++) {
      const verseNumber = index + verseStart;
      const verse = verses[index]!;
      const verseBot = this.#verseMapper.toInfrastructure(verse);
      if (!verseBot) {
        throw new Error(
          "VersesBundleSelectionAdapter: verseBot not found at select."
        );
      }
      const positionX =
        bundlePosition.x -
        bundleScales.x / 2 +
        verseDesiredScale.x / 2 +
        gap / 2 +
        column * (verseDesiredScale.x + gap);
      const positionY =
        bundlePosition.y +
        bundleScales.y / 2 -
        verseDesiredScale.y / 2 -
        gap / 2 -
        row * (verseDesiredScale.y + gap);
      const positionZ = bundlePosition.z;

      const mod: Partial<VerseBotTags> = {
        [dimension + "X"]: positionX,
        [dimension + "Y"]: positionY,
        [dimension + "Z"]: positionZ,
        [dimension]: true,
        scaleX: verseDesiredScale.x,
        scaleY: verseDesiredScale.y,
        scaleZ: verseDesiredScale.z,
        label: String(verseNumber),
      };

      ApplyStrictMod(verseBot, mod);

      column++;
      if (column >= maxColumns) {
        column = 0;
        row++;
      }
    }

    await AnimateStrictTag(bundleBot, {
      fromValue: {
        scaleZ: bundleScales.z,
        labelOpacity: bundleBot.tags.labelOpacity,
      },
      toValue: {
        scaleZ: 0,
        labelOpacity: 0,
      },
      duration: duration / 2,
      easing: firstSequenceEasing,
      tagMaskSpace: false,
    });
    await AnimateStrictTag(bundleBot, {
      fromValue: {
        scaleX: bundleScales.x,
        scaleY: bundleScales.y,
      },
      toValue: {
        scaleX: 0,
        scaleY: 0,
      },
      duration: duration / 2,
      easing: secondSequenceEasing,
      tagMaskSpace: false,
    });
    SetStrictTag(bundleBot, dimension as keyof VersesBundleBot["tags"], false);
  }
}
