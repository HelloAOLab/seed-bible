const { items } = that;
const G = globalThis as any;
const id = "default";

const itemList = Array.isArray(items) ? items : [items];

const NOTIFICATION_CONTENT_TITLE: any = {
  // "verse-grouped": true,
  // "verse": true,
  // "chapter": true,
  // "chapter-range": true,
  heading: "Text HTML",
  "attachment-link": "Attachment link",
  "voice-recording": "Voice recording",
  "video-recording": "Video recording",
  file: "File",
};

const areItemsTypesVaring = itemList.some(
  (ele: any) => ele.type !== itemList[0].type
);

const verses = itemList
  .map((ele: any) => ele.additionalInfo.verse)
  .filter((ele: any) => ele)
  .sort((a: number, b: number) => a - b);
const ranges = G.GetVerseSummaryHeading(verses);
const heading = `${itemList[0].content.split(":")[0]}${ranges.length ? `:${ranges.join(", ")}` : ""}`;

let msg = "";

if (
  NOTIFICATION_CONTENT_TITLE[itemList[0].type] ||
  NOTIFICATION_CONTENT_TITLE[itemList[0].additionalInfo.type] === "File"
) {
  msg =
    NOTIFICATION_CONTENT_TITLE[itemList[0].additionalInfo.type] ||
    NOTIFICATION_CONTENT_TITLE[itemList[0].type] ||
    "Item";
  msg = t("playlistNotificationContentAddedToPlaylist", { contentLabel: msg });
} else if (areItemsTypesVaring) {
  msg = t("playlistNotificationCountItemsAddedToPlaylist", {
    count: itemList.length,
  });
} else {
  msg = G.AddAnotationUI
    ? t("headingAddedToAnnotations", { heading })
    : t("headingAddedToPlaylist", { heading });
}

ShowNotification({
  message: msg,
  severity: "success",
  onUndoActions: () => {
    const lastListState = G.LastListState;
    if (G[`${id}AddDataToPlaylist`]) {
      G[`${id}AddDataToPlaylist`](lastListState, false, false, true);
    } else {
      G[`${id}currentPlaylist`] = lastListState;
    }
    ShowNotification({
      message: t("undoActionSuccessfull", { heading }),
      severity: "success",
    });
  },
});
