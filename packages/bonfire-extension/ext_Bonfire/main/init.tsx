import { registerExtension, type SeedBibleState } from "seed-bible";
import { registerBonfireChatProvider } from "./bonfire";

export default function initBonfireExtension() {
  registerExtension({
    id: "ext_Bonfire",
    init: function* (context: SeedBibleState) {
      console.log("Bonfire extension initialized with context:", context);

      const url = context.navigation.currentUrl.value;
      const orgId = url.searchParams.get("bonfireOrgId");
      const aiId = url.searchParams.get("bonfireAiId");
      const apiKey = url.searchParams.get("bonfireApiKey");

      if (!orgId || !aiId || !apiKey) {
        console.error(
          "Bonfire extension requires bonfireOrgId, bonfireAiId, and bonfireApiKey to be set in configBot tags"
        );
        return;
      }

      const name = url.searchParams.get("bonfireName") ?? "Bonfire AI";
      const iconUrl = url.searchParams.get("bonfireIconUrl") ?? undefined;

      yield* registerBonfireChatProvider(context, {
        orgId,
        aiId,
        apiKey,
        name,
        iconUrl,
      });

      return {};
    },
  });
}
