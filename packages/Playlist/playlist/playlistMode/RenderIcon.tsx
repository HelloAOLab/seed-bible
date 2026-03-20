const { useMemo, useState, useLayoutEffect } = os.appHooks;
const G = globalThis as any;
const RenderIcon = (props: any) => {
  const {
    isCustomIcons,
    big = false,
    small = false,
    isAllowSet = false,
    icon,
    list = [],
    onDelete,
    isReadingPlan,
  } = props;
  const [mylist, setMylist] = useState(list);

  const firstItemID = useMemo(() => {
    let name = isReadingPlan ? "📖" : "🎶";
    const firstItem = mylist.find((ele: any) => G.ValidTypes[ele?.type]);
    if (firstItem) {
      const lowerCase = firstItem?.additionalInfo?.book?.toLocaleLowerCase();
      name =
        firstItem.additionalInfo.data.bookId ||
        firstItem.additionalInfo.data.id ||
        firstItem.additionalInfo.data.bookId ||
        firstItem.additionalInfo.chapterData.id ||
        firstItem.additionalInfo.chapterData.bookId ||
        thisBot.tags.LowerCaseBookMapping[lowerCase];
    }
    return name;
  }, [mylist]);

  useLayoutEffect(() => {
    if (isAllowSet) {
      G.SetRenderMylist = setMylist;
    }
  }, [isAllowSet]);

  return (
    <div
      className={`playlist-details-icon ${big ? " big" : ""} ${small ? " small" : ""} `}
      style={{
        position: "relative",
        backgroundColor: "var(--panelBackground)",
      }}
    >
      {isCustomIcons ? (
        <img src={icon} style={{ width: "24px" }} />
      ) : (
        <span>{firstItemID}</span>
      )}
      {onDelete && isCustomIcons && (
        <span
          onClick={onDelete}
          style={{
            cursor: "pointer",
            position: "absolute",
            bottom: "0.2rem",
            color: "#D36433",
            right: "0.2rem",
            fontSize: "12px",
            zIndex: "10",
          }}
          className="material-symbols-outlined unfollow"
        >
          delete
        </span>
      )}
    </div>
  );
};

return RenderIcon;
