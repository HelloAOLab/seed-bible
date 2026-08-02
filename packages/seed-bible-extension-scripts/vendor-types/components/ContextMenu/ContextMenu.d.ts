import "./ContextMenu.css";
import { type ComponentChildren, type ComponentProps } from "preact";
import type { MutableRef } from "preact/hooks";
export declare function closeContextMenus(): void;
export declare function ContextMenu({
  isOpen,
  menuElementRef,
  ...props
}: {
  isOpen: boolean;
  children: ComponentChildren;
  menuElementRef: MutableRef<HTMLDivElement | null>;
} & ComponentProps<"div">): import("preact").JSX.Element | null;
export declare function ContextMenuItem({
  children,
  className,
  onClick,
  ...props
}: {
  children: ComponentChildren;
} & ComponentProps<"button">): import("preact").JSX.Element;
export declare function ContextMenuWithButton({
  children,
  anchorClassName,
  buttonClassName,
  menuClassName,
  iconClassName,
  className,
  onClick,
  onKeyDown,
  icon,
  ...props
}: {
  children: ComponentChildren;
  anchorClassName?: string;
  buttonClassName?: string;
  menuClassName?: string;
  iconClassName?: string;
  icon?: string | ComponentChildren;
} & ComponentProps<"button">): import("preact").JSX.Element;
