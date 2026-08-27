import { registerExtension, type SeedBibleState } from "seed-bible";

export default function initDefaultContentExtension() {
  registerExtension({
    id: "default-content-extension",
    init: (context: SeedBibleState) => {
      context.discover.registerDiscoverProvider({
        id: "default-content-extension",
        title: "Seed Bible Default Content",
        description: "Discover content selected by the Seed Bible authors.",
        discover: async () => {
          return [];
        },
      });

      return {};
    },
  });
}
