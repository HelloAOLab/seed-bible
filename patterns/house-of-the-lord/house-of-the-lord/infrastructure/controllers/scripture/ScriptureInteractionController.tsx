import type { ReadingStatePort } from "../../../application/ports/in/readingState";
import type { ScriptureInteractionPort } from "../../../application/ports/in/scriptureInteraction";
import { ToPieceKeyOf } from "../../../domain/functions/keys";
import type { ExperienceKey } from "../../../domain/models/experience";

interface ControllerParams {
  scriptureInteractionPort: ScriptureInteractionPort;
  readingStatePort: ReadingStatePort;
  getExperienceKey: () => ExperienceKey;
}

export class ScriptureInteractionController {
  #scriptureInteractionPort: ControllerParams["scriptureInteractionPort"];
  #readingStatePort: ControllerParams["readingStatePort"];
  #getExperienceKey: ControllerParams["getExperienceKey"];

  constructor({
    scriptureInteractionPort,
    readingStatePort,
    getExperienceKey,
  }: ControllerParams) {
    this.#scriptureInteractionPort = scriptureInteractionPort;
    this.#readingStatePort = readingStatePort;
    this.#getExperienceKey = getExperienceKey;
  }

  handlePieceFocusRequest(key: string) {
    const pieceKey = ToPieceKeyOf(this.#getExperienceKey(), key);
    if (!pieceKey) {
      console.warn(
        "house-of-the-lord ScriptureInteractionController: key is not a piece of the experience on stage",
        { key }
      );
      return;
    }

    this.#scriptureInteractionPort.handlePieceFocusRequest(pieceKey);
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

  handleExperienceShowRequest(experience: ExperienceKey) {
    this.#scriptureInteractionPort.handleExperienceShowRequest(experience);
  }
}
