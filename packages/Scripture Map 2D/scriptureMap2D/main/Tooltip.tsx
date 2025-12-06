import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";

const { useRef, useState, useLayoutEffect, useMemo } = os.appHooks;

export const UserPresenceTooltipContent = ({ colors }) => {
  return (
    <span className="userPresenceTooltipContent">
      <div>
        {colors.slice(0, 3).map((color, index) => {
          return (
            <div style={{ backgroundColor: color, "z-index": index }}></div>
          );
        })}
        {colors.length > 3 && (
          <div
            style={{
              backgroundColor: "white",
              color: "black",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "12px",
              "z-index": "3",
              fontWeight: "600",
            }}
          >
            {`+${colors.length - 3}`}
          </div>
        )}
      </div>
      <span>reading now</span>
    </span>
  );
};

export const ReadingHistoryTooltipContent = ({ userId, fixedContent }) => {
  const { myAuthBotId } = useReadingHistoryContext();

  const { userName, backgroundColor, color } = useMemo(() => {
    const isMe = userId === myAuthBotId;
    const userName = isMe ? "You" : "Guest";
    const backgroundColor = isMe
      ? BibleVizUtils.Data.tags.myUserColor
      : (BibleVizUtils.Data.vars.userPresenceData?.[userId]?.user?.color ??
        thisBot.vars.FakeReadingHistoryUsersColorMap?.get(userId) ??
        "pink");
    const color = BibleVizUtils.Functions.GetTextColorBasedOnBackground({
      backgroundColor,
    });

    return { userName, backgroundColor, color };
  }, []);

  return (
    <span className="readingHistoryTooltipContent">
      <span style={{ backgroundColor, color }}>{userName}</span>
      <span>{fixedContent}</span>
    </span>
  );
};

export const Tooltip = ({ content, anchor }) => {
  const ref = useRef(null);
  const [style, setStyle] = useState({
    top: anchor.y,
    left: anchor.x,
    "--arrowLeft": "50%",
  });
  const [direction, setDirection] = useState("up");

  useLayoutEffect(() => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const offset = 8;

    let newDirection = "up";
    let newTop = anchor.y;

    if (anchor.y - rect.height - offset < 0) {
      newDirection = "down";
      newTop += anchor.height ?? 0;
    }

    let newLeft = anchor.x;
    const halfWidth = rect.width / 2;
    let newArrowLeft = "50%";

    if (anchor.x - halfWidth < 0) {
      newLeft = halfWidth;
    } else if (anchor.x + halfWidth > viewportWidth) {
      newLeft = viewportWidth - halfWidth;
    }

    const leftDiff = newLeft - anchor.x;
    if (leftDiff !== 0) {
      const leftDiffPercent = Math.round((leftDiff / rect.width) * 100);
      newArrowLeft = `${50 - leftDiffPercent}%`;
    }

    setDirection(newDirection);
    setStyle({ top: newTop, left: newLeft, "--arrowLeft": newArrowLeft });
  }, [anchor]);

  return (
    <span ref={ref} className={`tooltip tooltip-${direction}`} style={style}>
      {content}
    </span>
  );
};
