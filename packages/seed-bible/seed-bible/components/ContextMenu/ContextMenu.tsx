import "./ContextMenu.css";
import { signal, useSignal } from "@preact/signals";
import {
  type ComponentChildren,
  type ComponentProps,
  type Signalish,
} from "preact";
import type { MutableRef } from "preact/hooks";
import {
  handleMenuTriggerKeyDown,
  handleVerticalListKeyNav,
} from "../../app/keyboardNav";

import { useEffect, useLayoutEffect, useRef } from "preact/hooks";
import { createPortal } from "preact/compat";

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

export function ContextMenuWithButton({
  children,
  anchorClassName,
  buttonClassName,
  menuClassName,
  iconClassName,
  className,
  onClick,
  onKeyDown,
  icon = "more_vert",
  ...props
}: {
  children: ComponentChildren;
  anchorClassName?: string;
  buttonClassName?: string;
  menuClassName?: string;
  iconClassName?: string;
  icon?: string | ComponentChildren;
} & ComponentProps<"button">) {
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
      if (distanceToLeftEdge < distanceToRightEdge) {
        style.left = `${anchorRect.left}px`;
      } else {
        style.right = `${window.innerWidth - anchorRect.right}px`;
      }

      const spaceBelow = window.innerHeight - anchorRect.bottom;
      const spaceAbove = anchorRect.top;
      if (spaceBelow >= spaceAbove) {
        style.top = `${anchorRect.bottom + MENU_GAP_PX}px`;
      } else {
        style.bottom = `${window.innerHeight - anchorRect.top + MENU_GAP_PX}px`;
      }

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

  const iconContent =
    typeof icon === "string" ? (
      <span
        className={joinClassNames(
          "material-symbols-outlined",
          "sb-context-more-icon",
          iconClassName
        )}
      >
        {icon}
      </span>
    ) : (
      icon
    );

  return (
    <div
      ref={anchorRef}
      className={joinClassNames("sb-context-menu-anchor", anchorClassName)}
    >
      <button
        ref={triggerRef}
        className={joinClassNames(
          "sb-context-menu-button",
          buttonClassName,
          className
        )}
        aria-haspopup="menu"
        aria-expanded={currentIsOpen}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) {
            return;
          }
          setIsOpen(!currentIsOpen);
          event.preventDefault();
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) return;
          handleMenuTriggerKeyDown(event, {
            isOpen: currentIsOpen,
            open: () => setIsOpen(true),
            getMenuContainer,
          });
        }}
        {...props}
      >
        {iconContent}
      </button>
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
