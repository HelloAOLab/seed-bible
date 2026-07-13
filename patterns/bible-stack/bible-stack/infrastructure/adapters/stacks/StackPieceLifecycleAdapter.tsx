import type { StackPieceLifecycleAdapterPort as PieceLifecycleAdapterPort } from "../../../application/ports/pieceLifecycle";
import type { StackPieceLifecycleAdapterPort as BibleLifecycleAdapterPort } from "../../../application/ports/bibleLifecycle";
import type {
  BookBot,
  ChapterBot,
  SectionBot,
  SectionShadowBot,
  TestamentBot,
  VerseBot,
  VersesBundleBot,
} from "../../models/stack";
import type { Piece, SectionShadow } from "../../../domain/models/canvas";
import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type {
  StackCover,
  StackCrossLine,
  StackShadow,
  StackTransformer,
} from "../../../domain/models/pieces";
import { SetStrictTag } from "../../functions/casualos";
import type { ObjectPooler } from "../environment/ObjectPooler";
import type { BibleStackObjectPoolerMap } from "../../models/objectPooler";
import type { StackTestamentMapper } from "../../mappers/StackTestamentMapper";
import type { StackSectionMapper } from "../../mappers/StackSectionMapper";
import type { StackBookMapper } from "../../mappers/StackBookMapper";
import type { StackChapterMapper } from "../../mappers/StackChapterMapper";
import type { StackSectionShadowMapper } from "../../mappers/StackSectionShadowMapper";
import type { StackSectionBookMapper } from "../../mappers/StackSectionBookMapper";
import type { VersesBundleMapper } from "../../mappers/VersesBundleMapper";
import type { VerseMapper } from "../../mappers/VerseMapper";
import type { StackTransformerMapper } from "../../mappers/StackTransformerMapper";
import type { StackCoverMapper } from "../../mappers/StackCoverMapper";
import type { StackCrossLineMapper } from "../../mappers/StackCrossLineMapper";
import type { StackShadowMapper } from "../../mappers/StackShadowMapper";
import type { PieceLifecycleAdapterPort as BibleLifecyclePieceLifecycleAdapterPort } from "../../../application/ports/bibleLifecycle";

export interface StackPieceLifecycleAdapterParams {
  objectPoolerPort: ObjectPooler<BibleStackObjectPoolerMap>;
  testamentMapperPort: StackTestamentMapper;
  sectionMapperPort: StackSectionMapper;
  bookMapperPort: StackBookMapper;
  chapterMapperPort: StackChapterMapper;
  sectionShadowMapperPort: StackSectionShadowMapper;
  sectionBookMapperPort: StackSectionBookMapper;
  versesBundleMapperPort: VersesBundleMapper;
  verseMapperPort: VerseMapper;
  stackTransformerMapperPort: StackTransformerMapper;
  coverMapperPort: StackCoverMapper;
  crossLineMapperPort: StackCrossLineMapper;
  stackShadowMapperPort: StackShadowMapper;
}

export class StackPieceLifecycleAdapter
  implements
    PieceLifecycleAdapterPort,
    BibleLifecycleAdapterPort,
    BibleLifecyclePieceLifecycleAdapterPort
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

  spawnSectionShadowDomain(sectionDataId: string): SectionShadow {
    return this.#sectionShadowMapperPort.toDomain(
      this.spawnSectionShadow(),
      sectionDataId
    );
  }

  despawnSectionShadow(piece: SectionShadow): void {
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
        return this.despawnSectionShadow(piece as SectionShadow);
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

  despawnPieces(pieces: Piece[]): void {
    for (const piece of pieces) {
      this.despawn(piece);
    }
  }

  spawnBibleTransformer(bibleId: StackBibleData["id"]): StackTransformer {
    const bot = this.#objectPoolerPort.getObject("StackTransformer");
    SetStrictTag(bot, "stackBibleId", bibleId);
    const piece = this.#stackTransformerMapperPort.toDomain(bot);
    return piece;
  }

  spawnCover(bibleId: StackBibleData["id"]): StackCover {
    const bot = this.#objectPoolerPort.getObject("StackCover");
    SetStrictTag(bot, "stackBibleId", bibleId);
    const piece = this.#coverMapperPort.toDomain(bot);
    return piece;
  }

  spawnCrossLine(bibleId: StackBibleData["id"]): StackCrossLine {
    const bot = this.#objectPoolerPort.getObject("StackCrossLine");
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
