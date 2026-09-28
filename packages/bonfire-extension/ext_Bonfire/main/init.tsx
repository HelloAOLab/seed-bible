import { registerExtension, type SeedBibleState } from "seed-bible";
import { registerBonfireChatProvider } from "./bonfire";

const DEFAULT_ORG_ID = "9f522666-75ed-4fe4-8c3a-5b1543f904ef";
const DEFAULT_AI_ID = "dc42eeb4-1992-43e7-abd5-30b1b05e93e6";

export default function initBonfireExtension() {
  registerExtension({
    id: "ext_Bonfire",
    init: function* (context: SeedBibleState) {
      console.log("Bonfire extension initialized with context:", context);

      const url = context.navigation.currentUrl.value;
      const orgId = url.searchParams.get("bonfireOrgId") ?? DEFAULT_ORG_ID;
      const aiId = url.searchParams.get("bonfireAiId") ?? DEFAULT_AI_ID;

      if (!orgId || !aiId) {
        console.error(
          "Bonfire extension requires bonfireOrgId and bonfireAiId to be set in the URL query parameters."
        );
        return;
      }

      const name = url.searchParams.get("bonfireName") ?? "Bonfire AI";
      const iconUrl = url.searchParams.get("bonfireIconUrl") ?? undefined;

      yield* registerBonfireChatProvider(context, {
        orgId,
        aiId,
        name,
        iconUrl,
      });

      return {};
    },
  });
}
