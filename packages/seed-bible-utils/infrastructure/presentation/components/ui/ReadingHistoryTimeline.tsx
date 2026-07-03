import "@packages/seed-bible-utils/infrastructure/presentation/styles/readingHistoryTimelineStyles.css";
import type { CSSProperties } from "preact";
import { useState, useMemo, useRef, useEffect } from "preact/hooks";
import { memo } from "preact/compat";

/** Calls `callback` when a click/focus lands outside every provided ref. */
const useClickOutside = (
  refs: { current: HTMLElement | null }[],
  callback: () => void
) => {
  useEffect(() => {
    const handleOutsideInteraction = (e: MouseEvent | FocusEvent) => {
      const isOutside = refs.every(
        (ref) => ref.current && !ref.current.contains(e.target as Node)
      );
      if (isOutside) {
        callback();
      }
    };

    document.addEventListener("mousedown", handleOutsideInteraction);
    document.addEventListener("focusin", handleOutsideInteraction);

    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("focusin", handleOutsideInteraction);
    };
  }, [refs, callback]);
};

export type Range = {
  start: number;
  end: number;
};

export type TooltipAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Injected tooltip renderer. Kept intentionally loose (`any[]` content) so the
 * timeline stays decoupled from any specific tooltip-content shape — each
 * consumer owns its own tooltip data type.
 */
export type ReadingHistoryTooltip = (props: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contentsData: any[];
  anchor: TooltipAnchor;
  offsetY?: number;
}) => preact.JSX.Element;

export interface ReadingHistoryLabelProps {
  gridRow: CSSProperties["gridRow"];
  gridColumn: CSSProperties["gridColumn"];
  children: React.ReactNode | React.ReactNode[];
  isDay: boolean;
}

export interface ReadingHistoryLabelData extends ReadingHistoryLabelProps {
  key: string;
  type: "label";
}

export interface ReadingHistoryItemProps<TTooltipData = unknown> {
  style: CSSProperties;
  tooltipContentsData: TTooltipData[];
  handleItemClick: (range: Range | null) => void;
  range: Range;
  readingHistoryRangeSeconds: Range | null;
  id: string;
  isUpcoming: boolean;
}

export interface ReadingHistoryItemData<
  TTooltipData = unknown,
> extends ReadingHistoryItemProps<TTooltipData> {
  key: string;
  type: "item";
}

export type ReadingHistoryContentData<TTooltipData = unknown> =
  | ReadingHistoryItemData<TTooltipData>
  | ReadingHistoryLabelData;

export interface ReadingHistoryLegendSquareData {
  key: number;
  style: CSSProperties;
}

export interface ReadingHistoryYearSelectorOptionData {
  key: number;
  className: string;
  onClick: () => void;
  content: number;
}

export interface ReadingHistoryTimelineFooterData {
  legendSquaresData: ReadingHistoryLegendSquareData[];
  lessText: string;
  moreText: string;
  yearSelectorLabelTextContent: string;
  yearSelectorOptionsData: ReadingHistoryYearSelectorOptionData[];
}

export interface ReadingHistoryTimelineProps<TTooltipData = unknown> {
  itemsData: ReadingHistoryContentData<TTooltipData>[];
  timelineRef: { current: HTMLDivElement | null };
  /** Optional tooltip renderer. When omitted, items render without tooltips. */
  Tooltip?: ReadingHistoryTooltip;
  /** Optional legend + year-selector footer. When omitted, no footer renders. */
  footer?: ReadingHistoryTimelineFooterData;
}

export type ReadingHistoryTimelineComponent = <TTooltipData = unknown>(
  props: ReadingHistoryTimelineProps<TTooltipData>
) => preact.JSX.Element;

const Label = memo(
  ({ gridRow, gridColumn, children, isDay }: ReadingHistoryLabelProps) => {
    const style = useMemo<CSSProperties>(() => {
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

type ItemProps =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ReadingHistoryItemProps<any> & {
    Tooltip?: ReadingHistoryTooltip;
  };

const Item = memo(
  ({
    style,
    tooltipContentsData,
    handleItemClick,
    range,
    readingHistoryRangeSeconds,
    id,
    isUpcoming,
    Tooltip,
  }: ItemProps) => {
    const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

    const selected =
      readingHistoryRangeSeconds &&
      range.start === readingHistoryRangeSeconds.start &&
      range.end === readingHistoryRangeSeconds.end;

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
        {containerRect && tooltipAnchor && Tooltip && (
          <Tooltip anchor={tooltipAnchor} contentsData={tooltipContentsData} />
        )}
      </div>
    );
  }
);

const LegendSquare = ({ style }: { style: CSSProperties }) => {
  return <span style={style}></span>;
};

const Legend = ({
  legendSquaresData,
  lessText,
  moreText,
}: {
  legendSquaresData: ReadingHistoryLegendSquareData[];
  lessText: string;
  moreText: string;
}) => {
  return (
    <div className="legend">
      <span>{lessText}</span>
      {legendSquaresData.map(({ key, style }) => (
        <LegendSquare key={key} style={style} />
      ))}
      <span>{moreText}</span>
    </div>
  );
};

const YearSelectorOption = ({
  className,
  onClick,
  content,
}: {
  className: string;
  onClick: () => void;
  content: number;
}) => {
  return (
    <span className={className} onClick={onClick}>
      {content}
    </span>
  );
};

const YearSelector = ({
  yearSelectorLabelTextContent,
  yearSelectorOptionsData,
}: {
  yearSelectorLabelTextContent: string;
  yearSelectorOptionsData: ReadingHistoryYearSelectorOptionData[];
}) => {
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);

  const [showOptions, setShowOptions] = useState<boolean>(false);

  useClickOutside([optionsRef, labelRef], () => setShowOptions(false));

  return (
    <div className="year-selector">
      <div
        ref={labelRef}
        className="year-selector-label"
        onClick={() => setShowOptions((prev) => !prev)}
      >
        <span>{yearSelectorLabelTextContent}</span>
        <span className="material-symbols-outlined">keyboard_arrow_down</span>
      </div>
      {showOptions && (
        <div ref={optionsRef} className="year-selector-options">
          {yearSelectorOptionsData.map(({ key, ...rest }) => (
            <YearSelectorOption key={key} {...rest} />
          ))}
        </div>
      )}
    </div>
  );
};

const Footer = ({ footer }: { footer: ReadingHistoryTimelineFooterData }) => {
  return (
    <div className="reading-history-timeline-footer">
      <Legend
        legendSquaresData={footer.legendSquaresData}
        lessText={footer.lessText}
        moreText={footer.moreText}
      />
      <YearSelector
        yearSelectorLabelTextContent={footer.yearSelectorLabelTextContent}
        yearSelectorOptionsData={footer.yearSelectorOptionsData}
      />
    </div>
  );
};

export function ReadingHistoryTimeline<TTooltipData = unknown>({
  itemsData,
  timelineRef,
  Tooltip,
  footer,
}: ReadingHistoryTimelineProps<TTooltipData>) {
  // const styles = useMemo(() => getReadingHistoryTimelineStyles(), []);

  return (
    <>
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
                    Tooltip={Tooltip}
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
        {footer && <Footer footer={footer} />}
      </div>
    </>
  );
}
