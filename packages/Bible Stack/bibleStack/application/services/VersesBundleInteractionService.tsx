import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type {
  VersesBundleInteractionServicePort,
  SequenceStateServicePort,
  VersesBundleDataRepositoryPort,
} from "bibleStack.application.ports.versesBundle";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
  versesBundleDataRepositoryPort: VersesBundleDataRepositoryPort;
}

export class VersesBundleInteractionService implements VersesBundleInteractionServicePort {
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #versesBundleDataRepositoryPort: ServiceParams["versesBundleDataRepositoryPort"];

  constructor({
    sequenceStateServicePort,
    versesBundleDataRepositoryPort,
  }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#versesBundleDataRepositoryPort = versesBundleDataRepositoryPort;
  }

  handleBundleSelection(bundle: Piece<"VersesBundle">): void {
    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const bundleData =
      this.#versesBundleDataRepositoryPort.getBundleData(bundle);

    if (!bundleData) {
      throw new Error(
        `VersesBundleInteractionService: bundleData not found at handleBundleSelection`
      );
    }

    if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
      // TODO: Refactor the logic to piece highlight to its own service/adapter
      BibleVizUtils.Functions.HighlightBiblePiece({ piece: bundle });
    } else {
      if (!bundleData.isSelected) {
        shout("OnBiblePieceSelected", { piece: chunkOfVerses });
        setTagMask(thisBot, "isBibleAnimating", true);
        await chunkOfVerses.Select();
        setTagMask(thisBot, "isBibleAnimating", false);
      }
    }
  }

  handleVersesBundleFocusBegin(bundle: Piece<"VersesBundle">): void {}

  handleVersesBundleFocusEnd(bundle: Piece<"VersesBundle">): void {}
}

export function HandleChunkOfVersesPointerEnter({
  chunkOfVerses,
}: BibleStackEvents["OnChunkOfVersesPointerEnter"]) {
  if (
    thisBot.masks.isBibleAnimating ||
    chunkOfVerses.masks.isSelected ||
    chunkOfVerses.masks.isBeingDragged
  )
    return;

  chunkOfVerses.Highlight();
}

export function HandleChunkOfVersesPointerExit({
  chunkOfVerses,
}: BibleStackEvents["OnChunkOfVersesPointerExit"]) {
  if (
    thisBot.masks.isBibleAnimating ||
    chunkOfVerses.masks.isSelected ||
    chunkOfVerses.masks.isBeingDragged
  )
    return;

  chunkOfVerses.Unhighlight();
}
