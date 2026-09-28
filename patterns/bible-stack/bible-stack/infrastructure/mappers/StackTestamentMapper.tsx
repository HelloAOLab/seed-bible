import type { TestamentBot } from "../models/stack";
import type { Piece } from "../../domain/models/canvas";

export class StackTestamentMapper {
  toDomain(bot: TestamentBot): Piece<"StackTestament"> {
    return { id: bot.id, type: bot.tags.type };
  }

  toInfrastructure(piece: Piece<"StackTestament">): TestamentBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as TestamentBot) : undefined;
  }
}
