import type { BibleShadowBot } from "bibleStack.models.stack";
import type { StackShadow } from "bibleStack.domain.models.pieces";
import type { StackShadowMapperPort } from "bibleStack.infrastructure.ports.stackPieceLifecycle";

export class StackShadowMapper implements StackShadowMapperPort {
  toDomain(bot: BibleShadowBot): StackShadow {
    return { id: bot.id, type: bot.tags.type, bibleId: bot.tags.stackBibleId };
  }

  toInfrastructure(piece: StackShadow): BibleShadowBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as BibleShadowBot) : undefined;
  }
}
