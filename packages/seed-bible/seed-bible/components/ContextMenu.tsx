import { signal, useSignal } from "@preact/signals";
import {
  type ComponentChildren,
  type ComponentProps,
  type Signalish,
} from "preact";
import { useEffect, useRef } from "preact/hooks";

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

export function ContextMenu({
  isOpen,
  children,
  className,
  menuElementRef,
  ...props
}: {
  isOpen: boolean;
  children: ComponentChildren;
  menuElementRef?: (element: HTMLDivElement | null) => void;
} & ComponentProps<"div">) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={menuElementRef}
      className={joinClassNames("sb-context-menu", className)}
      {...props}
    >
      {children}
    </div>
  );
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
  ...props
}: {
  children: ComponentChildren;
  anchorClassName?: string;
  buttonClassName?: string;
  menuClassName?: string;
  iconClassName?: string;
} & ComponentProps<"button">) {
  const menuId = useSignal("");
  const menuStyle = useSignal<ComponentProps<"div">["style"]>(undefined);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  if (!menuId.value) {
    nextContextMenuId += 1;
    menuId.value = `context-menu-${nextContextMenuId}`;
  }

  const setIsOpen = (nextIsOpen: boolean) => {
    activeContextMenuId.value = nextIsOpen ? menuId.value : null;
  };

  const currentIsOpen = activeContextMenuId.value === menuId.value;

  useEffect(() => {
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

      const distanceToRightEdge = window.innerWidth - anchorRect.right;
      const distanceToLeftEdge = anchorRect.left;

      if (distanceToLeftEdge < distanceToRightEdge) {
        menuStyle.value = {
          left: `0px`,
        };
      } else {
        menuStyle.value = {
          right: `0px`,
        };
      }
    };

    const updateMenuPosition = () => {
      requestAnimationFrame(positionMenu);
    };

    updateMenuPosition();

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [currentIsOpen]);

  return (
    <div
      ref={anchorRef}
      className={joinClassNames("sb-context-menu-anchor", anchorClassName)}
    >
      <button
        className={joinClassNames(
          "sb-context-menu-button",
          buttonClassName,
          className
        )}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) {
            return;
          }
          setIsOpen(!currentIsOpen);
          event.preventDefault();
        }}
        {...props}
      >
        <span
          className={joinClassNames(
            "material-symbols-outlined",
            "sb-context-more-icon",
            iconClassName
          )}
          // eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content
        >
          more_vert
        </span>
      </button>
      <ContextMenu
        isOpen={currentIsOpen}
        menuElementRef={(element) => {
          menuRef.current = element;
        }}
        style={menuStyle.value}
        className={joinClassNames("sb-context-menu", menuClassName)}
      >
        {children}
      </ContextMenu>
    </div>
  );
}
