import type { ReadingStatePort } from "../../../application/ports/in/readingState";
import type { ScriptureInteractionPort } from "../../../application/ports/in/scriptureInteraction";
import { ToExperienceKey, ToPieceKeyOf } from "../../../domain/functions/keys";
import type { ExperienceKey } from "../../../domain/models/experience";

interface ControllerParams {
  scriptureInteractionPort: ScriptureInteractionPort;
  readingStatePort: ReadingStatePort;
}

export class ScriptureInteractionController {
  #scriptureInteractionPort: ControllerParams["scriptureInteractionPort"];
  #readingStatePort: ControllerParams["readingStatePort"];

  constructor({
    scriptureInteractionPort,
    readingStatePort,
  }: ControllerParams) {
    this.#scriptureInteractionPort = scriptureInteractionPort;
    this.#readingStatePort = readingStatePort;
  }

  handlePieceFocusRequest(experience: ExperienceKey, key: string) {
    const experienceKey = ToExperienceKey(experience);

    if (!experienceKey) {
      console.warn(
        "house-of-the-lord ScriptureInteractionController: experienceKey is not a valid experience key",
        { experience }
      );
      return;
    }

    // Validated against the requested experience, not the one on stage: the
    // service may still have to swap to it before the piece can be focused.
    const pieceKey = ToPieceKeyOf(experienceKey, key);
    if (!pieceKey) {
      console.warn(
        "house-of-the-lord ScriptureInteractionController: key is not a piece of the requested experience",
        { key }
      );
      return;
    }

    void this.#scriptureInteractionPort.handlePieceFocusRequest(
      experienceKey,
      pieceKey
    );
  }

  handleReadingChanged(bookId: string, chapterNumber: number) {
    if (!bookId || !chapterNumber) {
      console.warn(
        "house-of-the-lord ScriptureInteractionController: reading changed without bookId or chapterNumber",
        { bookId, chapterNumber }
      );
      return;
    }

    this.#readingStatePort.setCurrentReading(bookId, chapterNumber);
  }
}
