import type { StackPieceLifecycleAdapterPort } from "bibleStack.application.ports.pieceLifecycle";
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

export class StackPieceLifecycleAdapter implements StackPieceLifecycleAdapterPort {
  #objectPoolerPort: StackPieceLifecycleAdapterParams["objectPoolerPort"];
  #testamentMapperPort: StackPieceLifecycleAdapterParams["testamentMapperPort"];
  #sectionMapperPort: StackPieceLifecycleAdapterParams["sectionMapperPort"];
  #bookMapperPort: StackPieceLifecycleAdapterParams["bookMapperPort"];
  #chapterMapperPort: StackPieceLifecycleAdapterParams["chapterMapperPort"];
  #sectionShadowMapperPort: StackPieceLifecycleAdapterParams["sectionShadowMapperPort"];
  #sectionBookMapperPort: StackPieceLifecycleAdapterParams["sectionBookMapperPort"];
  #versesBundleMapperPort: StackPieceLifecycleAdapterParams["versesBundleMapperPort"];
  #verseMapperPort: StackPieceLifecycleAdapterParams["verseMapperPort"];

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
  }

  spawnTestament(): TestamentBot {
    return this.#objectPoolerPort.getObject("StackTestament");
  }

  despawnTestament(piece: Piece<"StackTestament">): void {
    const bot = this.#testamentMapperPort.toInfrastructure(piece);
    if (bot) this.#objectPoolerPort.releaseObject(bot, "StackTestament");
  }

  spawnSection(): SectionBot {
    return this.#objectPoolerPort.getObject("StackSection");
  }

  despawnSection(piece: Piece<"StackSection">): void {
    const bot = this.#sectionMapperPort.toInfrastructure(piece);
    if (bot) this.#objectPoolerPort.releaseObject(bot, "StackSection");
  }

  spawnBook(): BookBot {
    return this.#objectPoolerPort.getObject("StackBook");
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

  despawnSectionShadow(piece: Piece<"StackSectionShadow">): void {
    const bot = this.#sectionShadowMapperPort.toInfrastructure(piece);
    if (bot) this.#objectPoolerPort.releaseObject(bot, "StackSectionShadow");
  }

  despawnSectionBook(piece: Piece<"StackSectionBook">): void {
    const bot = this.#sectionBookMapperPort.toInfrastructure(piece);
    if (bot) this.#objectPoolerPort.releaseObject(bot, "StackSectionBook");
  }

  spawnVersesBundle(): VersesBundleBot {
    return this.#objectPoolerPort.getObject("VersesBundle");
  }

  despawnVersesBundle(piece: Piece<"VersesBundle">): void {
    const bot = this.#versesBundleMapperPort.toInfrastructure(piece);
    if (bot) this.#objectPoolerPort.releaseObject(bot, "VersesBundle");
  }

  spawnVerse(): VerseBot {
    return this.#objectPoolerPort.getObject("Verse");
  }

  despawnVerse(piece: Piece<"Verse">): void {
    const bot = this.#verseMapperPort.toInfrastructure(piece);
    if (bot) this.#objectPoolerPort.releaseObject(bot, "Verse");
  }
}
