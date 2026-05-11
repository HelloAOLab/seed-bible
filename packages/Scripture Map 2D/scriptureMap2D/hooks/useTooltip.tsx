import type { MutableRef } from "../../../../typings/AuxLibraryDefinitions";
import type { TooltipAnchor } from "scriptureMap2D.components.containers.Tooltip";

const { useRef, useState, useLayoutEffect, useMemo } = os.appHooks;

interface UseTooltipType {
  tooltipRef: MutableRef<null | HTMLSpanElement>;
  tooltipClass: string;
  style: React.CSSProperties;
}

type UseTooltip = (params: {
  anchor: TooltipAnchor;
  offsetY: number;
}) => UseTooltipType;

export const useTooltip: UseTooltip = ({ anchor, offsetY }) => {
  const tooltipRef = useRef<null | HTMLSpanElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    top: anchor.y + offsetY,
    left: anchor.x,
    "--arrowLeft": "50%",
  });
  const [direction, setDirection] = useState<string>("up");

  useLayoutEffect(() => {
    if (!tooltipRef.current) return;

    const rect = tooltipRef.current.getBoundingClientRect();
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

  const tooltipClass = useMemo(() => {
    return `tooltip tooltip-${direction}`;
  }, [direction]);

  return {
    tooltipRef,
    tooltipClass,
    style,
  };
};
