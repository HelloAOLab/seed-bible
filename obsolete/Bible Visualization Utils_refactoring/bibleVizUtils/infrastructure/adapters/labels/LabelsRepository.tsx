import type { Bot } from "../../../../../../typings/AuxLibraryDefinitions";

export class LabelsRepository {
  static getLabelTransformerByOwner(owner: Bot): Bot | undefined {
    return getBot(
      byTag("ownerBotId", getID(owner)),
      byTag("isInfoLabelTransformer", true),
      byTag("isInUse", true)
    );
  }
}
