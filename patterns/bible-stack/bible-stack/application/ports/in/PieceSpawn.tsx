import type { Piece } from "../../../domain/models/canvas";

export interface BookSpawnerPort {
  spawnBookDomain(): Piece<"StackBook">;
}
