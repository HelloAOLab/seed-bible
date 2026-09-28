import type { BookBot } from "../models/stack";
import type { Piece } from "../../domain/models/canvas";

export class StackSectionBookMapper {
  toDomain(bot: BookBot): Piece<"StackSectionBook"> {
    return { id: bot.id, type: "StackSectionBook" };
  }

  toInfrastructure(piece: Piece<"StackSectionBook">): BookBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as BookBot) : undefined;
  }
}
