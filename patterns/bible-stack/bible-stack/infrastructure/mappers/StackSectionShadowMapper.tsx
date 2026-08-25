import type { SectionShadowBot } from "../models/stack";
import type { SectionShadow } from "../../domain/models/canvas";
import type { StackSectionData } from "../../domain/entities/StackSectionData";

export class StackSectionShadowMapper {
  toDomain(
    bot: SectionShadowBot,
    sectionDataId: StackSectionData["id"]
  ): SectionShadow {
    return { id: bot.id, type: bot.tags.type, sectionDataId };
  }

  toInfrastructure(piece: SectionShadow): SectionShadowBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as SectionShadowBot) : undefined;
  }
}
