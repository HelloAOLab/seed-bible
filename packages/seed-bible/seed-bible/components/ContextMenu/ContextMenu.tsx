import "./ContextMenu.css";
import { signal, useSignal } from "@preact/signals";
import {
  type ComponentChild,
  type ComponentChildren,
  type ComponentProps,
  type JSX,
  type Ref,
  type Signalish,
} from "preact";
import type { MutableRef } from "preact/hooks";
import {
  handleMenuTriggerKeyDown,
  handleVerticalListKeyNav,
} from "../../app/keyboardNav";

import { useEffect, useLayoutEffect, useRef } from "preact/hooks";
import { createPortal } from "preact/compat";
import {
  IconButton,
  type IconButtonLook,
  type IconButtonSize,
} from "../IconButton/IconButton";

/** Gap between the anchor and the menu, in px (matches the old 0.375rem). */
const MENU_GAP_PX = 6;

const activeContextMenuId = signal<string | null>(null);
let nextContextMenuId = 0;

function joinClassNames(
  ...classNames: Array<Signalish<string | undefined> | undefined>
) {
  return classNames
    .filter(Boolean)
    .map((className) =>
      typeof className === "string" ? className : className?.value
    )
    .join(" ");
}

export function closeContextMenus() {
  activeContextMenuId.value = null;
}

function ContextMenuInner({
  children,
  className,
  onKeyDown,
  elementRef,
  ...props
}: {
  elementRef: MutableRef<HTMLDivElement | null>;
  children: ComponentChildren;
} & ComponentProps<"div">) {
  const ref = elementRef;
  // const ref = useRef<HTMLDivElement | null>(null);

  // Auto-focus the first menu item when the menu mounts. The menu is
  // remounted on each open (since `ContextMenu` returns null when
  // `isOpen` is false), so this fires for every open.
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    if (container.contains(document.activeElement)) return;
    const first = container.querySelector<HTMLElement>(
      '[role="menuitem"]:not([disabled]),[role="menuitemradio"]:not([disabled]),[role="menuitemcheckbox"]:not([disabled])'
    );
    first?.focus();
  }, []);

  return (
    <div
      ref={ref}
      className={joinClassNames("sb-context-menu", className)}
      role="menu"
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        handleVerticalListKeyNav(event, event.currentTarget);
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function ContextMenu({
  isOpen,
  menuElementRef,
  ...props
}: {
  isOpen: boolean;
  children: ComponentChildren;
  menuElementRef: MutableRef<HTMLDivElement | null>;
} & ComponentProps<"div">) {
  if (!isOpen) {
    return null;
  }
  return <ContextMenuInner elementRef={menuElementRef} {...props} />;
}

export function ContextMenuItem({
  children,
  className,
  onClick,
  ...props
}: {
  children: ComponentChildren;
} & ComponentProps<"button">) {
  return (
    <button
      className={joinClassNames("sb-context-menu-item", className)}
      role="menuitem"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          closeContextMenus();
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * What a menu's own button needs so it opens the menu: spread it onto a
 * `Button` (which takes `buttonRef`), or onto a `<button>` with
 * `ref={buttonRef}`.
 */
export type ContextMenuTriggerProps = {
  buttonRef: Ref<HTMLButtonElement>;
  className: string;
  disabled?: boolean;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  onClick: (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: JSX.TargetedKeyboardEvent<HTMLButtonElement>) => void;
};

export type ContextMenuWithButtonProps = {
  children: ComponentChildren;
  anchorClassName?: string;
  menuClassName?: string;
  /** Extra classes for the button that opens the menu, for placement. */
  buttonClassName?: string;
  disabled?: boolean;
  /** Runs before the menu opens or closes; `preventDefault()` keeps it as it is. */
  onClick?: (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (event: JSX.TargetedKeyboardEvent<HTMLButtonElement>) => void;
} & (
  | {
      /** What the menu is for, for screen readers and the tooltip: "Bookmark options". */
      label: string;
      /** A Material Symbols name or an icon element. Defaults to ⋮ (`more_vert`). */
      icon?: string | ComponentChild;
      /** IconButton's size; sm (28px) by default, for a row's ⋮. */
      size?: IconButtonSize;
      look?: IconButtonLook;
      trigger?: undefined;
    }
  | {
      /**
       * Draws the button yourself, for a menu opened from text or a row (a
       * "+ Create" pill) rather than an icon. Spread the props onto it.
       */
      trigger: (props: ContextMenuTriggerProps) => ComponentChild;
      label?: undefined;
      icon?: undefined;
      size?: undefined;
      look?: undefined;
    }
);

/** A menu opened by its own button: an IconButton (⋮ by default), or a button you draw with `trigger`. */
export function ContextMenuWithButton({
  children,
  anchorClassName,
  buttonClassName,
  menuClassName,
  disabled,
  onClick,
  onKeyDown,
  ...button
}: ContextMenuWithButtonProps) {
  const menuId = useSignal("");
  const menuStyle = useSignal<ComponentProps<"div">["style"]>(undefined);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  if (!menuId.value) {
    nextContextMenuId += 1;
    menuId.value = `context-menu-${nextContextMenuId}`;
  }

  const setIsOpen = (nextIsOpen: boolean) => {
    activeContextMenuId.value = nextIsOpen ? menuId.value : null;
  };

  const currentIsOpen = activeContextMenuId.value === menuId.value;

  // The menu is portaled to <body> and positioned in viewport (`fixed`)
  // coordinates computed from the anchor's rect, so it can't be clipped by
  // an ancestor's `overflow: hidden` or scroll container. Runs in a layout
  // effect (not a rAF-deferred effect) so it's positioned before first
  // paint — the menu no longer flows after the anchor, so there's no
  // sane fallback position to show while waiting a frame.
  useLayoutEffect(() => {
    if (!currentIsOpen) {
      menuStyle.value = undefined;
      return;
    }

    const positionMenu = () => {
      const anchor = anchorRef.current;
      const menu = menuRef.current;
      if (!anchor || !menu) {
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const style: ComponentProps<"div">["style"] = { position: "fixed" };

      const distanceToRightEdge = window.innerWidth - anchorRect.right;
      const distanceToLeftEdge = anchorRect.left;
      const alignLeft = distanceToLeftEdge < distanceToRightEdge;
      if (alignLeft) {
        style.left = `${anchorRect.left}px`;
      } else {
        style.right = `${window.innerWidth - anchorRect.right}px`;
      }

      const spaceBelow = window.innerHeight - anchorRect.bottom;
      const spaceAbove = anchorRect.top;
      const openBelow = spaceBelow >= spaceAbove;
      if (openBelow) {
        style.top = `${anchorRect.bottom + MENU_GAP_PX}px`;
      } else {
        style.bottom = `${window.innerHeight - anchorRect.top + MENU_GAP_PX}px`;
      }

      // The opening animation grows the menu out of the corner by its button.
      style.transformOrigin = `${alignLeft ? "left" : "right"} ${
        openBelow ? "top" : "bottom"
      }`;

      menuStyle.value = style;
    };

    positionMenu();

    const updateMenuPosition = () => {
      requestAnimationFrame(positionMenu);
    };

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [currentIsOpen]);

  // Closes the menu on any click that isn't on the anchor (trigger button)
  // or the menu itself. Needed because the menu is portaled to <body> — a
  // click landing on it no longer bubbles through the app root, so the
  // app-level "close all context menus" click handler (see main.tsx) can't
  // see it.
  useEffect(() => {
    if (!currentIsOpen) return;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideMouseDown, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideMouseDown, true);
    };
  }, [currentIsOpen]);

  const getMenuContainer = () => menuRef.current;

  const triggerProps: ContextMenuTriggerProps = {
    buttonRef: triggerRef,
    // `sb-context-menu-button` styles nothing; it's how code and tests find
    // the button that opens a menu.
    className: joinClassNames("sb-context-menu-button", buttonClassName),
    disabled,
    "aria-haspopup": "menu",
    "aria-expanded": currentIsOpen,
    onClick: (event) => {
      onClick?.(event);
      if (event.defaultPrevented) {
        return;
      }
      setIsOpen(!currentIsOpen);
      event.preventDefault();
    },
    onKeyDown: (event) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      handleMenuTriggerKeyDown(event, {
        isOpen: currentIsOpen,
        open: () => setIsOpen(true),
        getMenuContainer,
      });
    },
  };

  return (
    <div
      ref={anchorRef}
      className={joinClassNames("sb-context-menu-anchor", anchorClassName)}
    >
      {button.trigger ? (
        button.trigger(triggerProps)
      ) : (
        <IconButton
          {...triggerProps}
          icon={button.icon ?? "more_vert"}
          label={button.label}
          size={button.size ?? "sm"}
          look={button.look}
        />
      )}
      {currentIsOpen &&
        createPortal(
          <ContextMenu
            isOpen={currentIsOpen}
            menuElementRef={menuRef}
            style={menuStyle.value}
            className={joinClassNames("sb-context-menu", menuClassName)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setIsOpen(false);
                triggerRef.current?.focus();
              }
            }}
          >
            {children}
          </ContextMenu>,
          document.body
        )}
    </div>
  );
}
