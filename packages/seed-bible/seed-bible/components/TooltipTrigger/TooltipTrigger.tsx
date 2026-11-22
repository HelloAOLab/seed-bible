import { cloneElement, toChildArray, type VNode } from "preact";
import { useTooltip, withTooltipHandlers } from "./useTooltip";

export interface TooltipTriggerProps {
  /**
   * The short name shown in the tooltip. Leave it out when the element already
   * has an `aria-label` and the tooltip should say the same thing. An element
   * with neither gets this as its accessible name.
   */
  label?: string;
  /** One element (a button, an icon) that the tooltip points at. */
  children: VNode<Record<string, unknown>>;
}

/**
 * Wraps a single element so hovering it, focusing it with the keyboard or
 * holding a finger on it shows a tooltip. It adds nothing to the page around
 * the element: the element gets the handlers, and the tooltip draws over
 * everything else.
 *
 * The tooltip is drawn through a portal placed among the element's children,
 * so the element needs to be able to have children (a `<button>`, not an
 * `<img>`).
 *
 * For an element that is only an icon. An element with visible text already
 * says what it is. `IconButton` already does this, so wrap only what isn't
 * one.
 */
export function TooltipTrigger({ label, children }: TooltipTriggerProps) {
  const props = children.props;
  const ownName = props["aria-label"];
  const text = label ?? (typeof ownName === "string" ? ownName : "");
  const { handlers, tooltip } = useTooltip(text);
  const named = ownName !== undefined || props["aria-labelledby"] !== undefined;

  return cloneElement(
    children,
    {
      ...withTooltipHandlers(props, handlers),
      ...(named || !label ? {} : { "aria-label": label }),
    },
    ...toChildArray(props.children as never),
    tooltip
  );
}
