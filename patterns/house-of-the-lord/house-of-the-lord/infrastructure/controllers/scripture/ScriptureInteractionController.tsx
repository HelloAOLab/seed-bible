import type { ExperienceServicePort } from "../../../application/ports/in/experience";
import type { ReadingStatePort } from "../../../application/ports/in/readingState";
import type { ScriptureInteractionPort } from "../../../application/ports/in/scriptureInteraction";
import { ToExperienceKey, ToPieceKeyOf } from "../../../domain/functions/keys";
import type { ExperienceKey } from "../../../domain/models/experience";

interface ControllerParams {
  scriptureInteractionPort: ScriptureInteractionPort;
  readingStatePort: ReadingStatePort;
  experienceServicePort: ExperienceServicePort;
}

export class ScriptureInteractionController {
  #scriptureInteractionPort: ControllerParams["scriptureInteractionPort"];
  #readingStatePort: ControllerParams["readingStatePort"];
  #experienceServicePort: ControllerParams["experienceServicePort"];

  constructor({
    scriptureInteractionPort,
    readingStatePort,
    experienceServicePort,
  }: ControllerParams) {
    this.#scriptureInteractionPort = scriptureInteractionPort;
    this.#readingStatePort = readingStatePort;
    this.#experienceServicePort = experienceServicePort;
  }

  handlePieceFocusRequest(experience: ExperienceKey, key: string) {
    const currExperience = this.#experienceServicePort.experience;
    const experienceKey = ToExperienceKey(experience);

    if (!experienceKey) {
      console.warn(
        "house-of-the-lord ScriptureInteractionController: experienceKey is not a valid experience key",
        { experienceKey }
      );
      return;
    }

    const isSameExperience = experienceKey === currExperience;

    if (isSameExperience) {
      const pieceKey = ToPieceKeyOf(currExperience, key);
      if (!pieceKey) {
        console.warn(
          "house-of-the-lord ScriptureInteractionController: key is not a piece of the experience on stage",
          { key }
        );
        return;
      }

      this.#scriptureInteractionPort.handlePieceFocusRequest(pieceKey);
    } else {
      this.#experienceServicePort.tryDisplayExperience(experienceKey);
    }
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
