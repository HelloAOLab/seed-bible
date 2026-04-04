const { items } = that;
const G = globalThis as any;
const id = "default";

const itemList = Array.isArray(items) ? items : [items];

const verses = itemList
  .map((ele: any) => ele.additionalInfo.verse || [])
  .sort((a: number, b: number) => a - b);
const ranges = G.GetVerseSummaryHeading(verses);
console.log("ranges", ranges);
const heading = `${itemList[0].content.split(":")[0]}${ranges.length ? `:${ranges.join(", ")}` : ""}`;

const msg = G.AddAnotationUI
  ? t("headingAddedToAnnotation", { heading })
  : t("headingAddedToPlaylist", { heading });
ShowNotification({
  message: msg,
  severity: "success",
  onUndoActions: () => {
    const lastListState = G.LastListState;
    console.log("lastListState", lastListState);
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
