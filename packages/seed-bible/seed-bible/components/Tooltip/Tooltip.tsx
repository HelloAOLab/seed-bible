import "./Tooltip.css";

import { createPortal } from "preact/compat";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

/** The on-screen rect a tooltip points at, in viewport coordinates. */
export type TooltipAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface TooltipProps {
  anchor: TooltipAnchor;
  /** Extra gap between the anchor and the tooltip, in pixels. */
  offsetY?: number;
  children?: preact.ComponentChildren;
}

/**
 * Positioned tooltip shell: portals to `document.body`, flips above or below
 * the anchor depending on the room available, and clamps itself inside the
 * viewport. It renders whatever children it is given and knows nothing about
 * their shape, so each caller owns its own content types.
 */
export const Tooltip = ({ anchor, offsetY = 0, children }: TooltipProps) => {
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
      className={`sb-tooltip sb-tooltip-${direction}`}
      style={style}
    >
      {children}
    </span>,
    document.body
  );
};
