import { useReadingHistoryContext } from "scriptureMap2D.contexts.RadingHistory.ReadingHistoryContext";
import { useSideBarContext } from "app.hooks.sideBar";
import { userColorStore } from "bibleVizUtils.services.index";
import type {
  UserPresenceTooltipContentType,
  ReadingHistoryTooltipContentType,
  TooltipType,
  ReadingHistoryTooltipHeaderType,
} from "scriptureMap2D.main.types";

const { useRef, useState, useLayoutEffect, useMemo } = os.appHooks;
const { createPortal, memo } = os.appCompat;

export const UserPresenceTooltipContent: UserPresenceTooltipContentType = ({
  colors,
}) => {
  const { t } = useSideBarContext();
  return (
    <span className="user-presence-tooltip-content">
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
      <span>{t("readingNow")}</span>
    </span>
  );
};

export const ReadingHistoryTooltipContent: ReadingHistoryTooltipContentType = ({
  userId,
  fixedContent,
}) => {
  const { t } = useSideBarContext();
  const { myAuthBotId } = useReadingHistoryContext();

  const { userName, backgroundColor } = useMemo(() => {
    const isMe = userId === myAuthBotId;
    const userName = isMe ? t("you") : t("guest");
    const backgroundColor = userColorStore.getUserColor({ authId: userId });

    return { userName, backgroundColor };
  }, [t]);

  return (
    <span className="tooltip-reading-history-content">
      <span style={{ backgroundColor }}></span>
      <span>{userName}</span>
      <span>{fixedContent}</span>
    </span>
  );
};

export const ReadingHistoryTooltipHeader =
  memo<ReadingHistoryTooltipHeaderType>(
    ({ monthName, dayOfTheMonth, year, minutesCount }) => {
      const { t } = useSideBarContext();
      const showMinutesCount = useMemo(() => {
        return minutesCount > 0;
      }, [minutesCount]);

      return (
        <>
          <span
            className={"tooltip-reading-history-title"}
          >{`${monthName} ${dayOfTheMonth}, ${year}`}</span>
          {showMinutesCount ? (
            <>
              <span
                className={"tooltip-reading-history-count"}
              >{`${minutesCount} Minutes of reading`}</span>
              <span className={"horizontal-divider"}></span>
            </>
          ) : null}
        </>
      );
    }
  );

export const Tooltip: TooltipType = ({ contentsData, anchor, offsetY = 0 }) => {
  const ref = useRef<null | HTMLSpanElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    top: anchor.y + offsetY,
    left: anchor.x,
    "--arrowLeft": "50%",
  });
  const [direction, setDirection] = useState<string>("up");

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

    newTop += newDirection === "down" ? offsetY : -offsetY;

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

  return createPortal(
    <span ref={ref} className={`tooltip tooltip-${direction}`} style={style}>
      {contentsData.map((data) => {
        switch (data.type) {
          case "readingHistory":
            return (
              <ReadingHistoryTooltipContent
                userId={data.userId}
                fixedContent={data.fixedContent}
              />
            );
          case "userPresence":
            return <UserPresenceTooltipContent colors={data.colors} />;
          case "readingHistoryHeader":
            return (
              <ReadingHistoryTooltipHeader
                monthName={data.monthName}
                dayOfTheMonth={data.dayOfTheMonth}
                year={data.year}
                minutesCount={data.minutesCount}
              />
            );
          case "text":
            return data.content;
        }
      })}
    </span>,
    document.body
  );
};
