import type { TabsManager } from "seed-bible.managers.TabsManager";
import type { PanesManager } from "seed-bible.managers.PanesManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { FreeUseBibleAPI } from "seed-bible.managers.FreeUseBibleAPI";
import type { ConfigManager } from "seed-bible.managers.ConfigManager";
import type { ThemeManager } from "seed-bible.managers.ThemeManager";
import type { I18nManager } from "seed-bible.i18n.I18nManager";
import type { ToolsManager } from "seed-bible.managers.BibleToolsManager";

import { registerExtension } from "seed-bible.app.api";

interface ExtensionContext {
  api: FreeUseBibleAPI;
  panes: PanesManager;
  tabs: TabsManager;
  selector: BibleSelectorState;
  config: ConfigManager;
  theme: ThemeManager;
  i18n: I18nManager;
  tools: ToolsManager;
}

registerExtension({
  id: "example-extension",
  init: (context: ExtensionContext) => {
    console.log("Example extension initialized with context:", context);

    // register a new tool
    context.tools.registerToolbarTool({
      id: "my-example-tool",
      title: "My Example Tool",
      icon: () => <span>🔧</span>,
      onSelect: () => {
        alert("Example tool selected!");
      },
      priority: 100,
    });

    // add a new pane
    context.panes.openDetachedPane(
      <div style={{ padding: 20 }}>Hello from the example extension!</div>
    );

    // add a new tab
    const tab = context.tabs.addTab();

    // fetch some bible data using the API
    context.api.getTranslationBookChapter("BSB", "JHN", 3).then((chapter) => {
      console.log("Fetched chapter data:", chapter);
    });

    // open the bible selector
    context.selector.setOpen(true, tab.readingState);

    // change a config setting
    context.config.setDisablePanels(true);

    // change the theme
    context.theme.setTheme("dark");

    // change the language
    context.i18n.setLanguage("es");
  },
});
