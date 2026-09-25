# Tutorial links

You can send someone straight into a Seed Bible tutorial with two query parameters:

| Parameter      | Meaning                                                                               |
| -------------- | ------------------------------------------------------------------------------------- |
| `tutorial`     | The ID of the tutorial to play (see the table below).                                 |
| `tutorialStep` | Which step to open on, counting from `0` (the first step). Optional; defaults to `0`. |

Example: `https://seedbible.org/?tutorial=introduction&tutorialStep=2`

The tutorial starts as soon as the reader has loaded a chapter. It plays even if the person has already finished it or turned tutorials off, because the link is an explicit request.

While a tutorial is playing, the page address keeps these two parameters up to date. Refreshing the page, or copying its address, brings you back to the same step. When the tutorial ends, both parameters are removed.

A step number past the end of a tutorial opens its last step. An unknown ID is ignored and the app loads normally.

## Available tutorials

| ID             | What it teaches                                                           | Steps                                         |
| -------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| `introduction` | The first-run tour: choosing books, translations, tabs, and settings.     | 6 on desktop (`0`–`5`), 4 on mobile (`0`–`3`) |
| `pane-layout`  | Arranging several passages side by side. Desktop only; ignored on mobile. | 1 (`0`)                                       |
| `add-tab`      | Opening more passages in new tabs.                                        | 1 (`0`)                                       |
| `search`       | Searching by book, chapter, or verse in the book selector.                | 1 (`0`)                                       |

The `introduction` tour shows a different set of steps on phones, because some desktop controls are not on the mobile screen. The same link works on both; the step number counts within whichever set is showing.

The in-app tips `mobile-settings` and `offline-download` cannot be linked. They point at a panel that only exists after the person opens it, so launched from a link they would point at nothing.
