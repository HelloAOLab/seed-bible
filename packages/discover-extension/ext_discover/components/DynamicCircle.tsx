import { getCircleProgressCss } from "ext_discover.hooks.getCircleProgressCss";
import type { CircleProgressProps } from "ext_discover.interfaces.components.DynamicCircle";

export function CircleProgress({
  id = "default",
  progress = "50",
}: CircleProgressProps) {
  return (
    <>
      <style>{getCircleProgressCss(id, progress)}</style>
      <div class={`progress-circle-${id}`} />
    </>
  );
}
