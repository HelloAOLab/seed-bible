import type { Piece } from "../../domain/models/canvas";
import type { BookInteractionServicePort } from "../ports/in/BookInteraction";
import type { ChapterInteractionServicePort } from "../ports/in/ChapterInteraction";
import type { LabelInteractionPort } from "../ports/in/LabelInteraction";
import type { SectionInteractionServicePort } from "../ports/in/SectionInteraction";
import type { SectionShadowInteractionPort } from "../ports/in/SectionShadowInteraction";
import type { TestamentInteractionServicePort } from "../ports/in/TestamentInteraction";
import type { LabelDataRepositoryPort } from "../ports/out/LabelInteraction";

interface ServiceParams {
  labelDataRepositoryPort: LabelDataRepositoryPort;
  testamentInteractionServicePort: TestamentInteractionServicePort;
  sectionInteractionServicePort: SectionInteractionServicePort;
  sectionShadowInteractionPort: SectionShadowInteractionPort;
  bookInteractionServicePort: BookInteractionServicePort;
  chapterInteractionServicePort: ChapterInteractionServicePort;
}

export class LabelInteractionService implements LabelInteractionPort {
  #labelDataRepositoryPort: ServiceParams["labelDataRepositoryPort"];
  #sectionInteractionServicePort: ServiceParams["sectionInteractionServicePort"];
  #sectionShadowInteractionPort: ServiceParams["sectionShadowInteractionPort"];
  #bookInteractionServicePort: ServiceParams["bookInteractionServicePort"];
  #testamentInteractionServicePort: ServiceParams["testamentInteractionServicePort"];
  #chapterInteractionServicePort: ServiceParams["chapterInteractionServicePort"];

  constructor({
    labelDataRepositoryPort,
    sectionInteractionServicePort,
    sectionShadowInteractionPort,
    bookInteractionServicePort,
    testamentInteractionServicePort,
    chapterInteractionServicePort,
  }: ServiceParams) {
    this.#labelDataRepositoryPort = labelDataRepositoryPort;
    this.#sectionInteractionServicePort = sectionInteractionServicePort;
    this.#sectionShadowInteractionPort = sectionShadowInteractionPort;
    this.#bookInteractionServicePort = bookInteractionServicePort;
    this.#testamentInteractionServicePort = testamentInteractionServicePort;
    this.#chapterInteractionServicePort = chapterInteractionServicePort;
  }

  handleLabelSelected(transformer: Piece<"InfoLabelTransformer">) {
    const data = this.#labelDataRepositoryPort.getDataByTransformerId(
      transformer.id
    );

    if (!data) {
      throw new Error(
        "LabelInteractionService: data not found at handleLabelSelected."
      );
    }

    const owner = data.owner;

    switch (owner.type) {
      case "StackTestament":
        {
          this.#testamentInteractionServicePort.handleTestamentSelection({
            testament: owner,
            interaction: "Coarse",
          });
        }
        break;
      case "StackSection":
        {
          this.#sectionInteractionServicePort.handleSectionSelection({
            section: owner,
            interaction: "Coarse",
          });
        }
        break;
      case "StackSectionShadow":
        {
          this.#sectionShadowInteractionPort.handleSectionShadowSelected(owner);
        }
        break;
      case "StackBook":
      case "StackSectionBook":
        {
          this.#bookInteractionServicePort.handleBookSelection({
            book: owner,
            interaction: "Coarse",
          });
        }
        break;
      case "StackChapter":
        {
          this.#chapterInteractionServicePort.handleChapterSelection({
            chapter: owner,
          });
        }
        break;
    }
  }
}
