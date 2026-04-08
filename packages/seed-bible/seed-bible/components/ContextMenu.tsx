import { useSignal } from "@preact/signals";
import type { ComponentChildren, ComponentProps } from "preact";

export function ContextMenu({
  isOpen,
  children,
  ...props
}: {
  isOpen: boolean;
  children: ComponentChildren;
} & ComponentProps<"div">) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="sb-context-menu" {...props}>
      {children}
    </div>
  );
}

export function ContextMenuItem({
  children,
  ...props
}: {
  children: ComponentChildren;
} & ComponentProps<"button">) {
  return (
    <button className="sb-context-menu-item" {...props}>
      {children}
    </button>
  );
}

export function ContextMenuWithButton({
  children,
  ...props
}: {
  children: ComponentChildren;
} & ComponentProps<"button">) {
  const isOpen = useSignal(false);
  return (
    <div className="sb-context-menu-anchor">
      <button
        className="sb-context-menu-button"
        onClick={() => {
          isOpen.value = !isOpen.value;
        }}
        {...props}
      >
        <span className="material-symbols-outlined sb-context-more-icon">
          more_vert
        </span>
      </button>

      <ContextMenu isOpen={isOpen.value}>{children}</ContextMenu>
    </div>
  );
}
