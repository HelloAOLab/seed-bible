import type { ComponentChildren, JSX } from "preact";

export interface ToolActionElementProps {
  /**
   * Where this action leads. When set (and the action is enabled) a real
   * `<a href>` is rendered instead of a `<button>`; otherwise the button is
   * unchanged.
   */
  href?: string | null;
  disabled?: boolean;
  /** Runs on a plain activation — click, Enter, or Space. */
  onActivate: () => void;
  className?: string;
  ariaLabel?: string;
  /**
   * Stable identifier for tests to select the element by, independent of its
   * translatable `aria-label` — rendered as `data-tool-id`.
   */
  dataToolId?: string;
  onPointerDown?: JSX.PointerEventHandler<HTMLElement>;
  children?: ComponentChildren;
}

/**
 * A toolbar action that renders as a link when it has an address, and as a
 * button when it doesn't.
 *
 * The point of the link form is reachability: chapter navigation used to be
 * buttons, so a crawler reading a chapter page found no way to any other
 * chapter and the whole Bible was discoverable only through the sitemap. An
 * `<a href>` also gives readers the things links do — middle-click and
 * ctrl/cmd-click to open in a new tab, right-click to copy the address.
 *
 * A plain click is still handled in-app rather than by the browser. That is
 * not just to avoid a page reload: navigating for real would bypass the
 * reading-extension navigation hooks and the swipe animation, and the app
 * writes its own history entry afterwards. Note this cannot be left to the
 * Navigation API — it only exists in Chromium, so in Safari and Firefox a bare
 * anchor would reload the document.
 *
 * A disabled action stays a `<button>`: `disabled` has no anchor equivalent,
 * and an `aria-disabled` link is still followable by everything that follows
 * links.
 */
export function ToolActionElement({
  href,
  disabled,
  onActivate,
  className,
  ariaLabel,
  dataToolId,
  onPointerDown,
  children,
}: ToolActionElementProps) {
  if (href && !disabled) {
    return (
      <a
        href={href}
        className={className}
        aria-label={ariaLabel}
        data-tool-id={dataToolId}
        // Anchors are draggable by default, which starts a link-drag ghost on
        // press-and-move — jarring on a button-shaped chevron that used to be
        // a real `<button>` (never draggable).
        draggable={false}
        onPointerDown={onPointerDown}
        onKeyDown={(event: JSX.TargetedKeyboardEvent<HTMLAnchorElement>) => {
          // A native <a> activates on Enter (as a click) but not Space — only
          // a <button> does that. This tool used to be a <button>, so Space
          // has to keep working: a keyboard reader who tabs to "Next Chapter"
          // and presses Space, as they always could, should still advance.
          if (event.key !== " " && event.key !== "Spacebar") {
            return;
          }
          event.preventDefault();
          onActivate();
        }}
        onClick={(event: JSX.TargetedMouseEvent<HTMLAnchorElement>) => {
          // Leave new-tab/new-window/download intents to the browser — that is
          // the whole benefit of having a real href here. Middle-click never
          // reaches this handler at all (it fires `auxclick`, not `click`, in
          // every current browser); the modifier-key checks are what actually
          // does the work, `button` is just cheap defense against whatever a
          // future browser or synthetic event does differently.
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          ) {
            return;
          }
          event.preventDefault();
          onActivate();
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
      data-tool-id={dataToolId}
      onPointerDown={onPointerDown}
      onClick={() => onActivate()}
    >
      {children}
    </button>
  );
}
