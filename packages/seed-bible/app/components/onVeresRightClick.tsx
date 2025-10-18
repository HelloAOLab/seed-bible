import { MenuIcon } from "app.components.icons";
console.log(that);
const MenuOptions = {
  type: "normal",
  items: [
    {
      icon: <MenuIcon name="format_ink_highlighter" />,
      title: that.highlighted ? `Unhighlight verse` : `Highlight verse`,
      onClick: () => {
        if (globalThis.ToggleVerseHighlight) {
          globalThis.ToggleVerseHighlight(that.verseNumber);
        }
        SetInHold(null);
      },
    },
    {
      icon: <MenuIcon name="copy_all" />,
      title: "Copy text",
      onClick: () => {
        os.setClipboard(that.text);
        SetInHold(null);
      },
    },
    {
      icon: <MenuIcon name="terminal" />,
      title: "commands",
      onClick: () => {
        SetShowCommands(true);
        SetInHold(null);
      },
    },
    {
      icon: <MenuIcon name="share" />,
      title: "Share verse",
      onClick: () => {
        SetInHold(null);
      },
    },
    {
      icon: <MenuIcon name="search" />,
      title: "AI Search",
      onClick: () => {
        aiSearch();
        SetInHold(null);
      },
    },
  ],
};

const aiSearch = () => {
  let App = <></>;
  let id = uuid();
  
  // Dynamic checks - get components from globalThis
  const ApologistSearch = globalThis.ApologistSearch;
  const SgSearch = globalThis.TaposSearch;
  
  if (!ApologistSearch && !SgSearch) {
    os.toast('StudyNote extension not installed (AI Search unavailable)', 3);
    return;
  }
  
  if (globalThis.ApologistSearchPresent && ApologistSearch) {
    App = (
      <ApologistSearch
        id={id}
        search={globalThis.GlobalSearch ?? "galations 5"}
      />
    );
  } else if (globalThis.TaposSearchPresent && SgSearch) {
    App = (
      <SgSearch id={id} search={globalThis.GlobalSearch ?? "galations 5"} />
    );
  } else if (!globalThis.panelMode && ApologistSearch) {
    App = (
      <ApologistSearch
        id={id}
        search={globalThis.GlobalSearch ?? "galations 5"}
      />
    );
  }

  SetShowSearch({
    App,
    verseNumber:
      typeof that.verseNumber === "object"
        ? that.verseNumber[that.verseNumber.length - 1]
        : that.verseNumber,
  });
};

if (!globalThis.ContextMenuOptions) globalThis.ContextMenuOptions = [];

os.log(globalThis.ContextMenuOptions, "up");
globalThis.ContextMenuOptions.forEach(({ address, label, items }) => {
  const itemsHolder = items.map((el) => {
    return {
      ...el,
      onClick: () => {
        if (el.onClick) el.onClick(that);
        SetInHold(null);
      },
    };
  });
  const panelKey = `${label.toUpperCase().replace(/\s/g, "_")}_PANEL_ID`;
  if (globalThis[panelKey]) {
    MenuOptions.items.push({ type: "line" });
    MenuOptions.items.push(...itemsHolder);
  }
});
// globalThis.ContextMenuOptions.forEach(({ address, items: options }) => {
//     if (!Array.isArray(options))
//         return
//     //make sure the context data is passed :)
//     const optionsHolder = options.map((option) => {
//         if (option.onClick) {
//             return {
//                 ...option,
//                 onClick: () => { option.onClick(that); SetInHold(null) }
//             }
//         }

//     })
//     MenuOptions.items.push({ ...optionsHolder })
// })

// globalThis.ContextMenuOptions = MenuOptions
// globalThis.OnClosePopup = () => SetInHold(null)
openPopupSettings(MenuOptions);
