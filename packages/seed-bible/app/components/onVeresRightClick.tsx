import { MenuIcon, ApologistIcon } from "app.components.icons";
// import { SharePopup } from "app.components.shareModel";
const SharePopup = thisBot.Chips();
const MenuOptions = {
  type: "normal",
  items: [
    {
      icon: <MenuIcon name="format_ink_highlighter" />,
      title: that.highlighted ? `Unhighlight verse` : `Highlight verse`,
      onClick: (items) => {
        items.forEach((verse) => {
          if (globalThis.ToggleVerseHighlight) {
            globalThis.ToggleVerseHighlight(verse.verseNumber);
          }
        });
        SetInHold({});
      },
    },
    {
      icon: <MenuIcon name="copy_all" />,
      title: "Copy text",
      onClick: (items) => {
        let text = "";

        const textItems = items.map((verse) => {
          return verse.text;
        });

        text = textItems.join(" ");

        console.log("text", text, items);

        os.setClipboard(text);

        SetInHold({});
      },
    },
    {
      icon: <ApologistIcon noFilter />,
      title: "Apologist AI",
      onClick: (items) => {
        ClearUserSelection();
        SetShowCommands(true);
        SetInHold({});
      },
    },
    {
      icon: <MenuIcon name="share" />,
      title: "Share verse",
      onClick: (items) => {
        closePopupSettings();
        setTimeout(() => {
          let text = "";

          const textItems = items.map((verse) => {
            return verse.text;
          });

          text = textItems.join(" ");
          openPopupSettings(
            <SharePopup shareTitle={`Check this out! ${text}`} />,
            null,
            true
          );
          SetInHold({});
        }, 50);
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
      onClick: (items) => {
        if (el.onClick) el.onClick(items);
        SetInHold({});
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
      onClick: (items) => {
        if (el.onClick) el.onClick(items);
        SetInHold({});
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
//                 onClick: () => { option.onClick(that); SetInHold({}) }
//             }
//         }

//     })
//     MenuOptions.items.push({ ...optionsHolder })
// })

globalThis.VerseActionItems = MenuOptions.items;
// globalThis.OnClosePopup = () => SetInHold({})
// closePopupSettings();
// setTimeout(() => {
//   openPopupSettings(MenuOptions);
// }, 50);
