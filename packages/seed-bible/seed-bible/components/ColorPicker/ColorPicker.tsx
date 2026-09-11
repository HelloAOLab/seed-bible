import "./ColorPicker.css";
import { signal, useSignal } from "@preact/signals";
import type { JSX } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useLayoutEffect, useRef } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import { hexToHsv, hsvToHex, normalizeHex, parseHex, type Hsv } from "./color";

/** Matches `MOBILE_BREAKPOINT` without importing the state manager. */
const NARROW_VIEWPORT_PX = 480;
const POPOVER_GAP_PX = 8;
const VIEWPORT_MARGIN_PX = 8;
const PICKER_HOST_ID = "sb-color-picker-host";

function getPickerHost(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let host = document.getElementById(PICKER_HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = PICKER_HOST_ID;
    document.body.appendChild(host);
  }
  return host;
}

function removePickerHost() {
  if (typeof document === "undefined") return;
  document.getElementById(PICKER_HOST_ID)?.remove();
}

/**
 * Only one picker is open at a time. Opening another (or this same instance)
 * replaces the previous, so a settings list of swatches can't stack dialogs.
 */
const activePickerId = signal<string | null>(null);
let nextPickerId = 0;

export interface ColorPickerProps {
  /** Committed color. Intermediate drags never write back here. */
  value: string;
  /** Fires once, when the user confirms. */
  onChange: (hex: string) => void;
  /** Live, non-committing updates while the user is still adjusting. */
  onPreview?: (hex: string) => void;
  /** Fires when the picker closes without confirming. */
  onCancel?: () => void;
  ariaLabel?: string;
  className?: string;
  swatchClassName?: string;
  /** Render the swatch trigger. Default true. Set false when the caller has its own open button. */
  showTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Used to position the popover when `showTrigger` is false. */
  anchorRef?: { current: HTMLElement | null };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hueGradient(hue: number): string {
  return `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))`;
}

function bindDrag(
  event: PointerEvent,
  onMove: (clientX: number, clientY: number) => void
) {
  event.preventDefault();
  const move = (next: PointerEvent) => {
    onMove(next.clientX, next.clientY);
  };
  const up = (next: PointerEvent) => {
    onMove(next.clientX, next.clientY);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  onMove(event.clientX, event.clientY);
}

export function ColorPicker(props: ColorPickerProps) {
  const {
    value,
    onChange,
    onPreview,
    onCancel,
    ariaLabel,
    className,
    swatchClassName,
    showTrigger = true,
    open,
    onOpenChange,
    anchorRef,
  } = props;
  const { t } = useI18n();

  const pickerIdRef = useRef<string>("");
  if (!pickerIdRef.current) {
    nextPickerId += 1;
    pickerIdRef.current = `sb-color-picker-${nextPickerId}`;
  }
  const pickerId = pickerIdRef.current;

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const svRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);
  const committedRef = useRef(false);

  const hsv = useSignal<Hsv>(hexToHsv(normalizeHex(value)));
  const hexText = useSignal(normalizeHex(value).slice(1));
  const panelStyle = useSignal<JSX.CSSProperties | undefined>(undefined);

  const isOpen = open ?? activePickerId.value === pickerId;

  const setOpen = (next: boolean) => {
    if (next) {
      activePickerId.value = pickerId;
    } else if (activePickerId.value === pickerId) {
      activePickerId.value = null;
    }
    onOpenChange?.(next);
  };

  const draftHex = (): string => hsvToHex(hsv.value);

  const applyDraft = (next: Hsv, preview = true) => {
    hsv.value = next;
    hexText.value = hsvToHex(next).slice(1);
    if (preview) {
      onPreview?.(hsvToHex(next));
    }
  };

  const resetDraft = () => {
    const initial = hexToHsv(normalizeHex(value));
    hsv.value = initial;
    hexText.value = hsvToHex(initial).slice(1);
  };

  const confirm = () => {
    if (committedRef.current) return;
    const parsed = parseHex(hexText.value);
    const hex = parsed ?? draftHex();
    committedRef.current = true;
    // Close first so the full-viewport overlay is gone before callers save
    // the color. Saving a verse highlight or text-format color unmounts this
    // picker in the same click; if the overlay is still mounted then, it can
    // sit on `document.body` until refresh and wash out every theme color.
    setOpen(false);
    onChange(hex);
  };

  const cancel = () => {
    setOpen(false);
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    committedRef.current = false;
    resetDraft();
  }, [isOpen]);

  useEffect(() => {
    if (open === true) {
      activePickerId.value = pickerId;
    } else if (open === false && activePickerId.value === pickerId) {
      activePickerId.value = null;
    }
  }, [open, pickerId]);

  useLayoutEffect(() => {
    if (!isOpen) {
      removePickerHost();
      return;
    }
    return () => {
      removePickerHost();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (!committedRef.current) {
        onCancel?.();
      }
      if (activePickerId.value === pickerId) {
        activePickerId.value = null;
      }
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      panelStyle.value = undefined;
      return;
    }
    panelRef.current?.focus();

    const position = () => {
      const panel = panelRef.current;
      if (!panel) return;

      if (window.innerWidth <= NARROW_VIEWPORT_PX) {
        panelStyle.value = undefined;
        return;
      }

      const anchor =
        (showTrigger ? triggerRef.current : null) ?? anchorRef?.current;
      if (!anchor) {
        panelStyle.value = undefined;
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      let top = anchorRect.bottom + POPOVER_GAP_PX;
      if (top + panelRect.height > window.innerHeight - VIEWPORT_MARGIN_PX) {
        top = anchorRect.top - panelRect.height - POPOVER_GAP_PX;
      }
      top = clamp(
        top,
        VIEWPORT_MARGIN_PX,
        window.innerHeight - panelRect.height - VIEWPORT_MARGIN_PX
      );

      let left = anchorRect.left;
      if (left + panelRect.width > window.innerWidth - VIEWPORT_MARGIN_PX) {
        left = window.innerWidth - panelRect.width - VIEWPORT_MARGIN_PX;
      }
      left = Math.max(VIEWPORT_MARGIN_PX, left);

      panelStyle.value = { top: `${top}px`, left: `${left}px` };
    };

    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [isOpen, showTrigger, anchorRef]);

  const onSvPointerDown = (event: PointerEvent) => {
    const el = svRef.current;
    if (!el) return;
    bindDrag(event, (clientX, clientY) => {
      const rect = el.getBoundingClientRect();
      const s =
        rect.width === 0 ? 0 : clamp((clientX - rect.left) / rect.width, 0, 1);
      const v =
        rect.height === 0
          ? 0
          : clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
      applyDraft({ h: hsv.peek().h, s, v });
    });
  };

  const onHuePointerDown = (event: PointerEvent) => {
    const el = hueRef.current;
    if (!el) return;
    bindDrag(event, (clientX) => {
      const rect = el.getBoundingClientRect();
      const h =
        rect.width === 0
          ? 0
          : clamp(((clientX - rect.left) / rect.width) * 360, 0, 359.99);
      applyDraft({ ...hsv.peek(), h });
    });
  };

  const onSvKeyDown = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const current = hsv.peek();
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      applyDraft({ ...current, s: clamp(current.s - step, 0, 1) });
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      applyDraft({ ...current, s: clamp(current.s + step, 0, 1) });
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      applyDraft({ ...current, v: clamp(current.v - step, 0, 1) });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      applyDraft({ ...current, v: clamp(current.v + step, 0, 1) });
    }
  };

  const onHueKeyDown = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 10 : 2;
    const current = hsv.peek();
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      applyDraft({ ...current, h: (current.h - step + 360) % 360 });
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      applyDraft({ ...current, h: (current.h + step) % 360 });
    }
  };

  const onHexInput = (event: Event) => {
    const raw = (event.currentTarget as HTMLInputElement).value
      .replace(/[^0-9a-fA-F]/g, "")
      .slice(0, 6);
    hexText.value = raw;
    const parsed = parseHex(raw);
    if (parsed) {
      hsv.value = hexToHsv(parsed, hsv.peek().h);
      onPreview?.(parsed);
    }
  };

  const onHexKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirm();
    }
  };

  const committed = normalizeHex(value);
  const preview = draftHex();
  const triggerLabel =
    ariaLabel ?? t("customize-colors", { defaultValue: "Customize colors" });

  const host = isOpen ? getPickerHost() : null;
  const dialog =
    isOpen && host
      ? createPortal(
          <div
            className="sb-color-picker-layer"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div
              className="sb-color-picker-backdrop"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                cancel();
              }}
            />
            <div
              ref={panelRef}
              className={`sb-color-picker-dialog${
                typeof window !== "undefined" &&
                window.innerWidth <= NARROW_VIEWPORT_PX
                  ? " sb-color-picker-dialog-sheet"
                  : ""
              }`}
              style={panelStyle.value}
              role="dialog"
              aria-modal="true"
              aria-label={triggerLabel}
              tabIndex={-1}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  event.target === event.currentTarget
                ) {
                  event.preventDefault();
                  confirm();
                }
              }}
            >
              <div
                ref={svRef}
                className="sb-color-picker-sv"
                style={{ background: hueGradient(hsv.value.h) }}
                role="slider"
                tabIndex={0}
                aria-label={t("color-saturation", {
                  defaultValue: "Saturation and brightness",
                })}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(hsv.value.s * 100)}
                aria-valuetext={preview}
                onPointerDown={onSvPointerDown}
                onKeyDown={onSvKeyDown}
              >
                <span
                  className="sb-color-picker-sv-thumb"
                  style={{
                    left: `${hsv.value.s * 100}%`,
                    top: `${(1 - hsv.value.v) * 100}%`,
                    background: preview,
                  }}
                />
              </div>

              <div
                ref={hueRef}
                className="sb-color-picker-hue"
                role="slider"
                tabIndex={0}
                aria-label={t("color-hue", { defaultValue: "Hue" })}
                aria-valuemin={0}
                aria-valuemax={360}
                aria-valuenow={Math.round(hsv.value.h)}
                onPointerDown={onHuePointerDown}
                onKeyDown={onHueKeyDown}
              >
                <span
                  className="sb-color-picker-hue-thumb"
                  style={{ left: `${(hsv.value.h / 360) * 100}%` }}
                />
              </div>

              <div className="sb-color-picker-meta">
                <span
                  className="sb-color-picker-preview"
                  style={{ background: preview }}
                  aria-hidden="true"
                />
                <label className="sb-color-picker-hex-label">
                  <span className="sb-color-picker-hex-hash">#</span>
                  <input
                    className="sb-color-picker-hex"
                    value={hexText.value}
                    spellcheck={false}
                    autocomplete="off"
                    autocapitalize="off"
                    aria-label={t("hex-color", { defaultValue: "Hex color" })}
                    onInput={onHexInput}
                    onKeyDown={onHexKeyDown}
                  />
                </label>
              </div>

              <div className="sb-color-picker-actions">
                <button
                  type="button"
                  className="sb-color-picker-cancel"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    cancel();
                  }}
                >
                  {t("cancel", { defaultValue: "Cancel" })}
                </button>
                <button
                  type="button"
                  className="sb-color-picker-confirm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    confirm();
                  }}
                >
                  {t("confirm", { defaultValue: "Confirm" })}
                </button>
              </div>
            </div>
          </div>,
          host
        )
      : null;

  return (
    <>
      {showTrigger && (
        <button
          ref={triggerRef}
          type="button"
          className={`sb-color-picker-trigger${className ? ` ${className}` : ""}`}
          aria-label={triggerLabel}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          title={triggerLabel}
          onClick={() => {
            if (isOpen) {
              cancel();
            } else {
              setOpen(true);
            }
          }}
        >
          <span
            className={`sb-color-picker-swatch${
              swatchClassName ? ` ${swatchClassName}` : ""
            }`}
            style={{ background: committed }}
          />
        </button>
      )}
      {dialog}
    </>
  );
}
