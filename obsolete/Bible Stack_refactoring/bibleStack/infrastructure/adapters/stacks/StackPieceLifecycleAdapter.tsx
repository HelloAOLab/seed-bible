import type { StackPieceLifecycleAdapterPort as PieceLifecycleAdapterPort } from "bibleStack.application.ports.pieceLifecycle";
import type { StackPieceLifecycleAdapterPort as BibleLifecycleAdapterPort } from "bibleStack.application.ports.bibleLifecycle";
import type {
  BookBot,
  ChapterBot,
  SectionBot,
  SectionShadowBot,
  TestamentBot,
  VerseBot,
  VersesBundleBot,
} from "bibleStack.models.stack";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { StackPieceLifecycleAdapterParams } from "bibleStack.infrastructure.ports.stackPieceLifecycle";
import type { StackBibleData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBibleData";
import type {
  StackCover,
  StackCrossLine,
  StackShadow,
  StackTransformer,
} from "bibleStack.domain.models.pieces";
import { SetStrictTag } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/functions/casualos";

export class StackPieceLifecycleAdapter
  implements PieceLifecycleAdapterPort, BibleLifecycleAdapterPort
{
  #objectPoolerPort: StackPieceLifecycleAdapterParams["objectPoolerPort"];
  #testamentMapperPort: StackPieceLifecycleAdapterParams["testamentMapperPort"];
  #sectionMapperPort: StackPieceLifecycleAdapterParams["sectionMapperPort"];
  #bookMapperPort: StackPieceLifecycleAdapterParams["bookMapperPort"];
  #chapterMapperPort: StackPieceLifecycleAdapterParams["chapterMapperPort"];
  #sectionShadowMapperPort: StackPieceLifecycleAdapterParams["sectionShadowMapperPort"];
  #sectionBookMapperPort: StackPieceLifecycleAdapterParams["sectionBookMapperPort"];
  #versesBundleMapperPort: StackPieceLifecycleAdapterParams["versesBundleMapperPort"];
  #verseMapperPort: StackPieceLifecycleAdapterParams["verseMapperPort"];
  #stackTransformerMapperPort: StackPieceLifecycleAdapterParams["stackTransformerMapperPort"];
  #coverMapperPort: StackPieceLifecycleAdapterParams["coverMapperPort"];
  #crossLineMapperPort: StackPieceLifecycleAdapterParams["crossLineMapperPort"];
  #stackShadowMapperPort: StackPieceLifecycleAdapterParams["stackShadowMapperPort"];

  constructor({
    objectPoolerPort,
    testamentMapperPort,
    sectionMapperPort,
    bookMapperPort,
    chapterMapperPort,
    sectionShadowMapperPort,
    sectionBookMapperPort,
    versesBundleMapperPort,
    verseMapperPort,
    stackTransformerMapperPort,
    coverMapperPort,
    crossLineMapperPort,
    stackShadowMapperPort,
  }: StackPieceLifecycleAdapterParams) {
    this.#objectPoolerPort = objectPoolerPort;
    this.#testamentMapperPort = testamentMapperPort;
    this.#sectionMapperPort = sectionMapperPort;
    this.#bookMapperPort = bookMapperPort;
    this.#chapterMapperPort = chapterMapperPort;
    this.#sectionShadowMapperPort = sectionShadowMapperPort;
    this.#sectionBookMapperPort = sectionBookMapperPort;
    this.#versesBundleMapperPort = versesBundleMapperPort;
    this.#verseMapperPort = verseMapperPort;
    this.#stackTransformerMapperPort = stackTransformerMapperPort;
    this.#coverMapperPort = coverMapperPort;
    this.#crossLineMapperPort = crossLineMapperPort;
    this.#stackShadowMapperPort = stackShadowMapperPort;
  }

  spawnTestament(): TestamentBot {
    return this.#objectPoolerPort.getObject("StackTestament");
  }

  spawnTestamentDomain(): Piece<"StackTestament"> {
    return this.#testamentMapperPort.toDomain(this.spawnTestament());
  }

  despawnTestament(piece: Piece<"StackTestament">): void {
    const bot = this.#testamentMapperPort.toInfrastructure(piece);
    if (bot) this.#objectPoolerPort.releaseObject(bot, "StackTestament");
  }

  spawnSection(): SectionBot {
    return this.#objectPoolerPort.getObject("StackSection");
  }

  spawnSectionDomain(): Piece<"StackSection"> {
    return this.#sectionMapperPort.toDomain(this.spawnSection());
  }

  despawnSection(piece: Piece<"StackSection">): void {
    const bot = this.#sectionMapperPort.toInfrastructure(piece);
    if (bot) this.#objectPoolerPort.releaseObject(bot, "StackSection");
  }

  spawnSectionBook(): BookBot {
    return this.#objectPoolerPort.getObject("StackSectionBook");
  }

  spawnSectionBookDomain(): Piece<"StackSectionBook"> {
    return this.#sectionBookMapperPort.toDomain(this.spawnSectionBook());
  }

  despawnSectionBook(piece: Piece<"StackSectionBook">): void {
    const bot = this.#sectionBookMapperPort.toInfrastructure(piece);
    if (bot) this.#objectPoolerPort.releaseObject(bot, "StackSectionBook");
  }

  spawnBook(): BookBot {
    return this.#objectPoolerPort.getObject("StackBook");
  }

  spawnBookDomain(): Piece<"StackBook"> {
    return this.#bookMapperPort.toDomain(
      this.spawnBook()
    ) as Piece<"StackBook">;
  }

  despawnBook(piece: Piece<"StackBook">): void {
    const bot = this.#bookMapperPort.toInfrastructure(piece);
    if (bot) this.#objectPoolerPort.releaseObject(bot, "StackBook");
  }

  spawnChapter(): ChapterBot {
    return this.#objectPoolerPort.getObject("StackChapter");
  }

  despawnChapter(piece: Piece<"StackChapter">): void {
    const bot = this.#chapterMapperPort.toInfrastructure(piece);
    if (bot) this.#objectPoolerPort.releaseObject(bot, "StackChapter");
  }

  spawnSectionShadow(): SectionShadowBot {
    return this.#objectPoolerPort.getObject("StackSectionShadow");
  }

  spawnSectionShadowDomain(): Piece<"StackSectionShadow"> {
    return this.#sectionShadowMapperPort.toDomain(this.spawnSectionShadow());
  }

  despawnSectionShadow(piece: Piece<"StackSectionShadow">): void {
    const bot = this.#sectionShadowMapperPort.toInfrastructure(piece);
    if (bot) this.#objectPoolerPort.releaseObject(bot, "StackSectionShadow");
  }

  spawnVersesBundle(): VersesBundleBot {
    return this.#objectPoolerPort.getObject("VersesBundle");
  }

  spawnVersesBundleDomain(): Piece<"VersesBundle"> {
    return this.#versesBundleMapperPort.toDomain(this.spawnVersesBundle());
  }

  despawnVersesBundle(piece: Piece<"VersesBundle">): void {
    const bot = this.#versesBundleMapperPort.toInfrastructure(piece);
    if (bot) this.#objectPoolerPort.releaseObject(bot, "VersesBundle");
  }

  spawnVerse(): VerseBot {
    return this.#objectPoolerPort.getObject("Verse");
  }

  spawnVerseDomain(): Piece<"Verse"> {
    return this.#verseMapperPort.toDomain(this.spawnVerse());
  }

  despawnVerse(piece: Piece<"Verse">): void {
    const bot = this.#verseMapperPort.toInfrastructure(piece);
    if (bot) this.#objectPoolerPort.releaseObject(bot, "Verse");
  }

  /**
   * Routes a piece to its type-specific despawn, returning it to the pool.
   * Casts are safe: each branch is guarded by the runtime `type` discriminant
   * (`Piece<T>` is not a discriminated union, so the generic cannot narrow).
   */
  despawn(piece: Piece): void {
    switch (piece.type) {
      case "StackTestament":
        return this.despawnTestament(piece as Piece<"StackTestament">);
      case "StackSection":
        return this.despawnSection(piece as Piece<"StackSection">);
      case "StackSectionBook":
        return this.despawnSectionBook(piece as Piece<"StackSectionBook">);
      case "StackBook":
        return this.despawnBook(piece as Piece<"StackBook">);
      case "StackChapter":
        return this.despawnChapter(piece as Piece<"StackChapter">);
      case "StackSectionShadow":
        return this.despawnSectionShadow(piece as Piece<"StackSectionShadow">);
      case "VersesBundle":
        return this.despawnVersesBundle(piece as Piece<"VersesBundle">);
      case "Verse":
        return this.despawnVerse(piece as Piece<"Verse">);
      default:
        throw new Error(
          `StackPieceLifecycleAdapter: cannot despawn piece of type "${piece.type}".`
        );
    }
  }

  spawnBibleTransformer(bibleId: StackBibleData["id"]): StackTransformer {
    const bot = this.#objectPoolerPort.getObject("StackTransformer");
    SetStrictTag(bot, "stackBibleId", bibleId);
    const piece = this.#stackTransformerMapperPort.toDomain(bot);
    return piece;
  }

  spawnCover(bibleId: StackBibleData["id"]): StackCover {
    const bot = this.#objectPoolerPort.getObject("Cover");
    SetStrictTag(bot, "stackBibleId", bibleId);
    const piece = this.#coverMapperPort.toDomain(bot);
    return piece;
  }

  spawnCrossLine(bibleId: StackBibleData["id"]): StackCrossLine {
    const bot = this.#objectPoolerPort.getObject("CrossLine");
    SetStrictTag(bot, "stackBibleId", bibleId);
    const piece = this.#crossLineMapperPort.toDomain(bot);
    return piece;
  }

  spawnShadow(bibleId: StackBibleData["id"]): StackShadow {
    const bot = this.#objectPoolerPort.getObject("StackShadow");
    SetStrictTag(bot, "stackBibleId", bibleId);
    const piece = this.#stackShadowMapperPort.toDomain(bot);
    return piece;
  }
}
