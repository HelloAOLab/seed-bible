import type { Piece } from "../../../domain/models/canvas";

export interface BookSpawnerPort {
  spawnBookDomain(): Piece<"StackBook">;
  despawnBook(book: Piece<"StackBook">): void;
}

export interface SectionSpawnerPort {
  spawnSectionDomain(): Piece<"StackSection">;
  spawnSectionBookDomain(): Piece<"StackSectionBook">;
}
