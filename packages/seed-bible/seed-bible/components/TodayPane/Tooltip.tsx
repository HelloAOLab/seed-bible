import type { TooltipAnchor } from "../ReadingHistoryTimeline/ReadingHistoryTimeline";

import { createPortal } from "preact/compat";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

/**
 * Today's tooltip renders plain text. The `type` discriminant is kept because
 * Scripture Map's sibling tooltip also renders reading-history and presence
 * variants, and chunk B/E unifies the two into one shared component.
 */
export interface TooltipContentData {
  type: "text";
  content: string;
}

export interface TooltipProps {
  contentsData: TooltipContentData[];
  anchor: TooltipAnchor;
  offsetY?: number;
}

export const Tooltip = ({
  contentsData,
  anchor,
  offsetY = 0,
}: TooltipProps) => {
  const tooltipRef = useRef<null | HTMLSpanElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    top: anchor.y + offsetY,
    left: anchor.x,
    "--arrowLeft": "50%",
  });
  const [direction, setDirection] = useState<"up" | "down">("up");

  // A layout effect rather than a plain one: the flip and the clamp both need
  // the tooltip's own rendered width and height, which are unknown until it is
  // in the DOM, and the reposition has to land before the browser paints.
  useLayoutEffect(() => {
    if (!tooltipRef.current) return;

    const rect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const offset = 8;

    let newDirection: "up" | "down" = "up";
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

    // Clamping moved the body but not the thing being pointed at, so shift the
    // arrow back by the same distance to keep it over the anchor.
    const leftDiff = newLeft - anchor.x;
    if (leftDiff !== 0) {
      const leftDiffPercent = Math.round((leftDiff / rect.width) * 100);
      newArrowLeft = `${50 - leftDiffPercent}%`;
    }

    setDirection(newDirection);
    setStyle({ top: newTop, left: newLeft, "--arrowLeft": newArrowLeft });
  }, [anchor, offsetY]);

  return createPortal(
    <span
      ref={tooltipRef}
      className={`tooltip tooltip-${direction}`}
      style={style}
    >
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
