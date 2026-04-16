import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import type { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import type { ObjectPoolTagsType } from "bibleVizUtils.models.canvas";

interface PieceDataRepository {
  removeTestamentData: (data: StackTestamentData) => void;
  removeSectionData: (data: StackSectionData) => void;
  removeSectionBookData: (data: StackSectionBookData) => void;
  removeBookData: (data: StackBookData) => void;
  removeChapterData: (data: StackChapterData) => void;
}

interface LabelLifecyclePort {
  despawnPieceLabel: (piece: Bot) => void;
}

interface ObjectPoolerService {
  releaseObject: (params: {
    obj: Bot;
    tag: ObjectPoolTagsType;
    dimension?: string;
  }) => void;
}

interface PieceManagementServiceProps {
  pieceDataRepository: PieceDataRepository;
  labelLifecyclePort: LabelLifecyclePort;
  objectPoolerService: ObjectPoolerService;
}

export class PieceManagementService {
  #pieceDataRepository: PieceManagementServiceProps["pieceDataRepository"];
  #labelLifecyclePort: PieceManagementServiceProps["labelLifecyclePort"];
  #objectPoolerService: PieceManagementServiceProps["objectPoolerService"];

  constructor({
    pieceDataRepository,
    labelLifecyclePort,
    objectPoolerService,
  }: PieceManagementServiceProps) {
    this.#pieceDataRepository = pieceDataRepository;
    this.#labelLifecyclePort = labelLifecyclePort;
    this.#objectPoolerService = objectPoolerService;
  }

  deleteTestament(testament: StackTestamentData) {
    this.#pieceDataRepository.removeTestamentData(testament);

    const children = testament.clearChildren();
    const piece = testament.clearPiece();

    if (piece) {
      this.clearPiece(piece);
    }

    for (const child of children) {
      if (child instanceof StackSectionData) this.deleteSection(child);
      else this.deleteSectionBook(child);
    }

    // TODO: Send OnTestamentDelete event that will be listened by the StackInteractionManager to check if the deleted testament is the last interacted
  }

  deleteTestaments(testaments: StackTestamentData[]) {
    for (const testament of testaments) {
      this.deleteTestament(testament);
    }
  }

  deleteSection(section: StackSectionData) {
    this.#pieceDataRepository.removeSectionData(section);

    const children = section.clearChildren();
    const piece = section.clearPiece();
    const shadow = section.detachShadow();
    const flattenedChildren = children.flat();

    for (const child of flattenedChildren) {
      this.deleteBook(child);
    }

    if (piece) {
      this.clearPiece(piece);
    }

    if (shadow) {
      this.clearPiece(shadow);
    }

    // TODO: Send OnSectionDelete event that will be listened by the StackInteractionManager to check if the deleted section is the last interacted
  }

  deleteSections(sections: StackSectionData[]) {
    for (const section of sections) {
      this.deleteSection(section);
    }
  }

  deleteSectionBook(sectionBook: StackSectionBookData) {
    this.#pieceDataRepository.removeSectionBookData(sectionBook);

    const children = sectionBook.clearChildren();
    const piece = sectionBook.clearPiece();

    for (const child of children) {
      this.deleteChapter(child);
    }

    if (piece) {
      this.clearPiece(piece);
    }

    // TODO: Send OnSectionBookDelete event that will be listened by the StackInteractionManager to check if the deleted section book is the last interacted
  }

  deleteSectionBooks(sectionBooks: StackSectionBookData[]) {
    for (const sectionBook of sectionBooks) {
      this.deleteSectionBook(sectionBook);
    }
  }

  deleteBook(book: StackBookData) {
    this.#pieceDataRepository.removeBookData(book);

    const children = book.clearChildren();
    const piece = book.clearPiece();

    for (const child of children) {
      this.deleteChapter(child);
    }

    if (piece) {
      this.clearPiece(piece);
    }

    // TODO: Send OnBookDelete event that will be listened by the StackInteractionManager to check if the deleted book is the last interacted
  }

  deleteBooks(books: StackBookData[]) {
    for (const book of books) {
      this.deleteBook(book);
    }
  }

  deleteChapter(chapter: StackChapterData) {
    this.#pieceDataRepository.removeChapterData(chapter);
    const piece = chapter.clearPiece();
    if (piece) {
      // TODO: Move every non casualos's built-in tag and mask to the chapter data
      if (piece.masks.isOnTheGround) {
        if (chapter.isSelected && piece.vars.chunksOfVerses?.length > 0) {
          piece.vars.chunksOfVerses.forEach((chunk) => {
            if (chunk.masks.isSelected && chunk.vars.verses?.length > 0) {
              chunk.vars.verses.flat().forEach((verse) => {
                this.#objectPoolerService.releaseObject({
                  obj: verse,
                  tag: verse.tags.poolTag,
                  dimension: thisBot.tags.desiredDimension,
                });
              });
              chunk.vars.verses = [];
            }
            this.#objectPoolerService.releaseObject({
              obj: chunk,
              tag: chunk.tags.poolTag,
              dimension: thisBot.tags.desiredDimension,
            });
          });
          piece.vars.chunksOfVerses = [];
        }
      }
      this.clearPiece(piece);
    }
  }

  deleteChapters(chapters: StackChapterData[]) {
    for (const chapter of chapters) {
      this.deleteChapter(chapter);
    }
  }

  async clearPiece(piece: Bot) {
    // TODO: Create a PieceHighlightService, add the logic for highlight and unhighlight delay store and management and replace the following references

    const { unhighlightDelayInfo } = await thisBot.GetUnhighlightDelayInfo({
      piece,
    });
    if (unhighlightDelayInfo) {
      await thisBot.ClearUnhighlightDelay({
        unhighlightDelayInfo,
      });
    }

    const isHighlighted = await thisBot.IsBiblePieceHighlighted({ piece });

    if (isHighlighted) {
      await thisBot.RemovePieceFromHighlightedList({ piece });
    }

    this.#labelLifecyclePort.despawnPieceLabel(piece);
    this.#objectPoolerService.releaseObject({
      obj: piece,
      tag: piece.tags.poolTag,
      dimension: thisBot.tags.desiredDimension,
    });
  }
}
