import { MenuIcon, ApologistIcon } from "app.components.icons";
// import { SharePopup } from "app.components.shareModel";

const IconsURL = {
  "Align Box":
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/331e8e977c447758e00777c9a8dfcc57e3de69ee6789faf6386c687382e8b1b3.svg",
  Library:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/77406bff34d96bb3d4a2bdc6a2c6856f5b8e3fe706cc60f7c46f2264fa532d75.svg",
  "Playlist Add":
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/b2f097871a77c31728e20b957e471ee9f01e39d5d812171bd208c4028829f5d3.svg",
  "Share Fat":
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/ae98d7b6b237173814ecc3da8569a87e06ce9e83e363d91b76783be8a9e3d3d3.svg",
  Vector:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/15bab89b3dd86d820a648617386415693edd07f9aff39676dfad14645e5b480d.svg",
  Highlighter:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/16a6bc66099d9153e9ae5685c6e0d5517509811db6107405c0273af32b253801.svg",
};

const { SharePopup } = thisBot.Chips();
const MenuOptions = {
  type: "normal",
  items: [
    // {
    //   icon: <MenuIcon name={IconsURL.Highlighter} invert />,
    //   title: `Unhighlight verse`,
    //   onClick: (items) => {
    //     SetWordHighlightsBC((prev) => {
    //       const old = { ...prev };
    //       items.forEach((verse) => {
    //         if (globalThis.ToggleVerseHighlight) {
    //           delete old[verse.verseNumber];
    //           globalThis.ToggleVerseHighlight(verse.verseNumber);
    //         }
    //       });
    //       return old;
    //     });

    //     SetInHold({});
    //   },
    // },
    {
      icon: <MenuIcon name={IconsURL.Library} />,
      title: "Copy text",
      onClick: (items: any) => {
        let text = "";
        os.log("COPY TEXT VERSES", items);
        const textItems = items.map((verse: any) => {
          return verse.text;
        });

        text = textItems.join(" ");

        os.setClipboard(text);

        SetInHold({});
      },
    },
    {
      icon: <ApologistIcon invert={true} />,

      title: "Apologist AI",
      onClick: (items: any) => {
        ClearUserSelection();
        SetShowCommands(true);
        // SetInHold({});
      },
    },
    {
      icon: <MenuIcon name={IconsURL["Share Fat"]} />,
      title: "Share verse",
      onClick: (items: any) => {
        closePopupSettings();
        setTimeout(() => {
          let text = "";

          const textItems = items.map((verse: any) => {
            return verse.text;
          });

          text = textItems.join(" ");

          // Build verse reference from items
          const verseNumbers = items
            .map((verse: any) => verse.verseNumber)
            .filter(Boolean);
          const book = items[0]?.book || configBot.tags.book;
          const chapter = items[0]?.chapter || configBot.tags.chapter;
          const sorted = [...verseNumbers].sort((a, b) => a - b);
          const groups = [];
          if (sorted.length > 0) {
            let start = sorted[0];
            let end = sorted[0];
            for (let i = 1; i < sorted.length; i++) {
              if (sorted[i] === end + 1) {
                end = sorted[i];
              } else {
                groups.push(start === end ? `${start}` : `${start}-${end}`);
                start = sorted[i];
                end = sorted[i];
              }
            }
            groups.push(start === end ? `${start}` : `${start}-${end}`);
          }
          const reference =
            groups.length > 0
              ? `${book} ${chapter}:${groups.join(",")}`
              : `${book} ${chapter}`;

          openPopupSettings(
            <SharePopup
              shareTitle={`${text}`}
              shareReference={reference}
              translation={that.translation}
            />,
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
globalThis.ContextMenuOptions.forEach(({ address, label, items }: any) => {
  const itemsHolder = items.map((el: any) => {
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

that?.extraContext?.forEach(({ address, label, items }: any) => {
  const itemsHolder = items.map((el: any) => {
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

// globalThis.ContextMenuOptions = MenuOptions
// globalThis.OnClosePopup = () => SetInHold(null)
// openPopupSettings(MenuOptions);
