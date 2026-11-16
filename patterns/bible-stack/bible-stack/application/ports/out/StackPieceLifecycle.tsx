import type {
  ActivityIndicator,
  Piece,
  SectionShadow,
} from "../../../domain/models/canvas";
import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type {
  StackCover,
  StackCrossLine,
  StackShadow,
  StackTransformer,
} from "../../../domain/models/pieces";

export interface StackPieceLifecyclePort {
  spawnActivityIndicatorDomain(dataId: string): ActivityIndicator;
  spawnTestamentDomain(): Piece<"StackTestament">;
  despawnTestament(piece: Piece<"StackTestament">): void;
  spawnSectionDomain(): Piece<"StackSection">;
  despawnSection(piece: Piece<"StackSection">): void;
  spawnSectionBookDomain(): Piece<"StackSectionBook">;
  despawnSectionBook(piece: Piece<"StackSectionBook">): void;
  spawnBookDomain(): Piece<"StackBook">;
  despawnBook(piece: Piece<"StackBook">): void;
  spawnChapterDomain(): Piece<"StackChapter">;
  despawnChapter(piece: Piece<"StackChapter">): void;
  spawnSectionShadowDomain(sectionDataId: string): SectionShadow;
  despawnSectionShadow(piece: SectionShadow): void;
  spawnVersesBundleDomain(): Piece<"VersesBundle">;
  despawnVersesBundle(piece: Piece<"VersesBundle">): void;
  spawnVerseDomain(): Piece<"Verse">;
  despawnVerse(piece: Piece<"Verse">): void;
  despawn(piece: Piece): void;
  despawnPieces(pieces: Piece[]): void;
  spawnBibleTransformer(bibleId: StackBibleData["id"]): StackTransformer;
  spawnCover(bibleId: StackBibleData["id"]): StackCover;
  spawnCrossLine(bibleId: StackBibleData["id"]): StackCrossLine;
  spawnShadow(bibleId: StackBibleData["id"]): StackShadow;
}
