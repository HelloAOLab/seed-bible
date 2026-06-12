import { useTooltip } from "../../hooks/useTooltip";
import type { TooltipContentData } from "@packages/today-screen/todayScreen/domain/models/tooltip";

const { createPortal } = os.appCompat;

export interface TooltipProps {
  contentsData: TooltipContentData[];
  anchor: TooltipAnchor;
  offsetY?: number;
}

export type TooltipAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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
          case "text":
            return data.content;
        }
      })}
    </span>,
    document.body
  );
};
