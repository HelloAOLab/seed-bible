import { useTooltip } from "../../hooks/useTooltip";

import { createPortal, memo } from "preact/compat";

export interface ReadingHistoryTooltipHeaderProps {
  monthName: string;
  dayOfTheMonth: number;
  year: number;
  minutesCount: number;
}

export interface ReadingHistoryTooltipHeaderData extends ReadingHistoryTooltipHeaderProps {
  type: "readingHistoryHeader";
}

export interface ReadingHistoryTooltipContentParams {
  fixedContent: string;
  userName: string;
  dotStyle: React.CSSProperties;
}

export interface ReadingHistoryTooltipContentData extends ReadingHistoryTooltipContentParams {
  type: "readingHistory";
}

export interface UserPresenceTooltipContentParams {
  colors: React.CSSProperties["backgroundColor"][];
  labelText: string;
}

export interface UserPresenceTooltipContentData extends UserPresenceTooltipContentParams {
  type: "userPresence";
}

export interface TextTooltipContentData {
  type: "text";
  content: string;
}

export type TooltipContentData =
  | ReadingHistoryTooltipContentData
  | ReadingHistoryTooltipHeaderData
  | UserPresenceTooltipContentData
  | TextTooltipContentData;

export type TooltipAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface TooltipProps {
  contentsData: TooltipContentData[];
  anchor: TooltipAnchor;
  offsetY?: number;
}

const UserPresenceTooltipContent = ({
  colors,
  labelText,
}: UserPresenceTooltipContentParams) => {
  return (
    <span className="user-presence-tooltip-content">
      <div>
        {colors.slice(0, 3).map((color, index) => {
          return <div style={{ backgroundColor: color, Zindex: index }}></div>;
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
              zIndex: "3",
              fontWeight: "600",
            }}
          >
            {`+${colors.length - 3}`}
          </div>
        )}
      </div>
      <span>{labelText}</span>
    </span>
  );
};

const ReadingHistoryTooltipContent = ({
  fixedContent,
  dotStyle,
  userName,
}: ReadingHistoryTooltipContentParams) => {
  return (
    <span className="tooltip-reading-history-content">
      <span style={dotStyle}></span>
      <span>{userName}</span>
      <span>{fixedContent}</span>
    </span>
  );
};

const ReadingHistoryTooltipHeader = memo(
  ({
    monthName,
    dayOfTheMonth,
    year,
    minutesCount,
  }: ReadingHistoryTooltipHeaderProps) => {
    const showMinutesCount = minutesCount > 0;

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

export const Tooltip = ({
  contentsData,
  anchor,
  offsetY = 0,
}: TooltipProps) => {
  const { tooltipRef, tooltipClass, style } = useTooltip({ anchor, offsetY });

  return createPortal(
    <span ref={tooltipRef} className={tooltipClass} style={style}>
      {contentsData.map((data) => {
        switch (data.type) {
          case "readingHistory":
            return (
              <ReadingHistoryTooltipContent
                dotStyle={data.dotStyle}
                userName={data.userName}
                fixedContent={data.fixedContent}
              />
            );
          case "userPresence":
            return (
              <UserPresenceTooltipContent
                colors={data.colors}
                labelText={data.labelText}
              />
            );
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
