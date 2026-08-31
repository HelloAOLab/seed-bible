import { PortalComponent } from "@packages/seed-bible/seed-bible/components";
import { useI18n } from "@packages/seed-bible/seed-bible/i18n";
import {
  registerExtension,
  type BibleToolContext,
  type SeedBibleState,
} from "@packages/seed-bible/seed-bible/managers";
import { v4 as uuid } from "uuid";
import pattern from "virtual:@pattern/house-of-the-lord";
import { getPiecesForExperience, toPieceLabel } from "./verseReference";
import { EXPERIENCE_KEYS } from "./experience";
import { EXPERIENCE_META } from "./experienceMeta";

const extensionId = "house-of-the-lord";

export const bootstrapExtension = () => {
  registerExtension({
    id: extensionId,
    init: function* (context: SeedBibleState) {
      const versesFor = (ctx: BibleToolContext) =>
        ctx.readingState.selectedVerses.value.map((v) => ({
          bookId: v.bookId,
          chapter: v.chapterNumber,
          verse: v.verse.number,
        }));

      for (const experience of Object.values(EXPERIENCE_KEYS)) {
        const meta = EXPERIENCE_META[experience];

        yield context.tools.registerVerseToolbarTool({
          id: `${extensionId}-verse-${experience}`,
          priority: 300,
          title: meta.title,
          icon: meta.icon,
          isVisible: (ctx) =>
            getPiecesForExperience(experience, versesFor(ctx)).length > 0,
          getItems: (ctx) =>
            getPiecesForExperience(experience, versesFor(ctx)).map((key) => ({
              id: `${extensionId}-piece-${experience}-${key}`,
              title: {
                key: `piece-${key}`,
                ns: extensionId,
                defaultValue: toPieceLabel(key),
              },
              icon: meta.icon,
              onSelect: () => {
                const inst = uuid();
                context.panes.openPane({
                  placement: "floating",
                  title: () => {
                    const { t } = useI18n();
                    return t(meta.title.key, {
                      ns: meta.title.ns,
                      defaultValue: meta.title.defaultValue,
                    });
                  },
                  icon: meta.icon,
                  component: () => (
                    <PortalComponent
                      portal={experience}
                      portalType="grid"
                      inst={inst}
                      pattern={pattern}
                      query={{
                        dimension: experience,
                        experience,
                        highlightedPiece: key,
                      }}
                    />
                  ),
                });
                ctx.readingState.clearSelectedVerses();
              },
            })),
        });
      }
    },
  });
};
