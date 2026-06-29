import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { registerBonfireChatProvider } from "./bonfire";

registerExtension({
  id: "ext_Bonfire",
  init: function* (context: SeedBibleState) {
    console.log("Bonfire extension initialized with context:", context);

    const orgId: string = configBot.tags.bonfireOrgId;
    const aiId: string = configBot.tags.bonfireAiId;
    const apiKey: string = configBot.tags.bonfireApiKey;

    if (!orgId || !aiId || !apiKey) {
      console.error(
        "Bonfire extension requires bonfireOrgId, bonfireAiId, and bonfireApiKey to be set in configBot tags"
      );
      return;
    }

    yield* registerBonfireChatProvider(context, {
      orgId,
      aiId,
      apiKey,
      name: configBot.tags.bonfireName,
      iconUrl: configBot.tags.bonfireIconUrl,
    });

    return {};
  },
});
