import {
  Tooltip,
  type TooltipContentData,
  type TooltipAnchor,
} from "scriptureMap2D.components.containers.Tooltip";
import { useReadingHistoryTimeline } from "scriptureMap2D.hooks.useReadingHistoryTimeline";
import type { Range } from "scriptureMap2D.models.commonTypes";

const { useState, useMemo } = os.appHooks;
const { memo } = os.appCompat;

export interface ReadingHistoryLabelProps {
  gridRow: React.CSSProperties["gridRow"];
  gridColumn: React.CSSProperties["gridColumn"];
  children: React.ReactNode | React.ReactNode[];
  isDay: boolean;
}

export interface ReadingHistoryLabelData extends ReadingHistoryLabelProps {
  key: string;
  type: "label";
}

export interface ReadingHistoryItemProps {
  style: React.CSSProperties;
  tooltipContentsData: TooltipContentData[];
  handleItemClick: (range: Range | null) => void;
  range: Range;
  readingHistoryRangeSeconds: Range | null;
  id: string;
  isUpcoming: boolean;
}

export interface ReadingHistoryItemData extends ReadingHistoryItemProps {
  key: string;
  type: "item";
}

export type ReadingHistoryContentData =
  | ReadingHistoryItemData
  | ReadingHistoryLabelData;

const Label = memo(
  ({ gridRow, gridColumn, children, isDay }: ReadingHistoryLabelProps) => {
    const style = useMemo<React.CSSProperties>(() => {
      return { gridRow, gridColumn };
    }, [gridRow, gridColumn]);

    return (
      <div
        style={style}
        className={`reading-history-timeline-label reading-history-timeline-label-${isDay ? "day" : "month"}`}
      >
        {children}
      </div>
    );
  }
);

const Item = memo(
  ({
    style,
    tooltipContentsData,
    handleItemClick,
    range,
    readingHistoryRangeSeconds,
    id,
    isUpcoming,
  }: ReadingHistoryItemProps) => {
    const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

    const selected = range === readingHistoryRangeSeconds;

    const { tooltipAnchor } = useMemo<{
      tooltipAnchor: TooltipAnchor | undefined;
    }>(() => {
      let tooltipAnchor;

      if (containerRect) {
        tooltipAnchor = {
          x: containerRect.left + containerRect.width / 2,
          y: containerRect.top,
          width: containerRect.width,
          height: containerRect.height,
        };
      }

      return { tooltipAnchor };
    }, [containerRect]);

    return (
      <div
        id={id}
        onPointerEnter={(e) =>
          setContainerRect(e.currentTarget.getBoundingClientRect())
        }
        onPointerLeave={() => {
          setContainerRect(null);
        }}
        style={style}
        className={`reading-history-timeline-item${selected ? " selected" : ""}${isUpcoming ? " upcoming" : ""}`}
        onClick={() => {
          handleItemClick(selected ? null : range);
        }}
      >
        {containerRect && tooltipAnchor && (
          <Tooltip anchor={tooltipAnchor} contentsData={tooltipContentsData} />
        )}
      </div>
    );
  }
);

export const ReadingHistoryTimeline = () => {
  const { itemsData, timelineRef } = useReadingHistoryTimeline();

  return (
    <div className="reading-history-timeline-container">
      <div ref={timelineRef} className="reading-history-timeline">
        {itemsData.map((data) => {
          switch (data.type) {
            case "item": {
              const {
                id,
                key,
                tooltipContentsData,
                range,
                handleItemClick,
                readingHistoryRangeSeconds,
                style,
                isUpcoming,
              } = data;

              return (
                <Item
                  id={id}
                  key={key}
                  tooltipContentsData={tooltipContentsData}
                  range={range}
                  handleItemClick={handleItemClick}
                  readingHistoryRangeSeconds={readingHistoryRangeSeconds}
                  style={style}
                  isUpcoming={isUpcoming}
                />
              );
            }
            case "label": {
              const { key, gridColumn, gridRow, isDay, children } = data;

              return (
                <Label
                  key={key}
                  gridRow={gridRow}
                  gridColumn={gridColumn}
                  isDay={isDay}
                >
                  {children}
                </Label>
              );
            }
          }
        })}
      </div>
    </div>
  );
};
