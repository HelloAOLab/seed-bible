import { MenuIcon, ApologistIcon } from "app.components.icons";
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
      icon: <ApologistIcon />,
      title: "Apologist AI",
      onClick: () => {
        ClearUserSelection();
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
  ],
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
      // For dynamic title
      title: () => {
        return typeof el.title === "function" ? el.title(that) : item.title;
      },
    };
  });
  const panelKey = `${label.toUpperCase().replace(/\s/g, "_")}_PANEL_ID`;
  if (globalThis[panelKey]) {
    MenuOptions.items.push({ type: "line" });
    MenuOptions.items.push(...itemsHolder);
  }
});

that?.extraContext?.forEach(({ address, label, items }) => {
  const itemsHolder = items.map((el) => {
    return {
      ...el,
      onClick: () => {
        if (el.onClick) el.onClick(that);
        SetInHold(null);
      },
    };
  });
  MenuOptions.items.push({ type: "line" });
  MenuOptions.items.push(...itemsHolder);
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
