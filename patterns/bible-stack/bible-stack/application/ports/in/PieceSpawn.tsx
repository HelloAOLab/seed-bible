import type { Piece } from "../../../domain/models/canvas";

export interface BookSpawnerPort {
  spawnBookDomain(): Piece<"StackBook">;
}

export interface SectionSpawnerPort {
  spawnSectionDomain(): Piece<"StackSection">;
  spawnSectionBookDomain(): Piece<"StackSectionBook">;
}
