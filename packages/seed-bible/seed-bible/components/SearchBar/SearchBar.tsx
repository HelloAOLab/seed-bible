import "./SearchBar.css";
import type { Ref } from "preact";
import { useRef } from "preact/hooks";
import { MaterialIcon } from "../icons";
import { SearchClearButton } from "../SearchClearButton/SearchClearButton";

export interface SearchBarProps {
  value: string;
  /** Called with the box's new text as the user types, and with "" on clear. */
  onInput: (value: string) => void;
  placeholder: string;
  /** Defaults to the placeholder. */
  "aria-label"?: string;
  id?: string;
  /** The typed text's direction; "auto" for names in any script. */
  dir?: "auto" | "ltr" | "rtl";
  /** For callers that also need the input, e.g. to focus it themselves. */
  inputRef?: Ref<HTMLInputElement>;
  /**
   * The bar's surface. `filled` (the default) is for a screen's own
   * background; `panel` sits inside a floating panel.
   */
  variant?: "filled" | "panel";
  onKeyDown?: (event: KeyboardEvent) => void;
  onFocus?: (event: FocusEvent) => void;
  /** Sizes or places the bar within its screen; the look comes from here. */
  className?: string;
}

/**
 * The search box every screen uses: an icon, the input and, once something is
 * typed, a × that empties it and puts the cursor back. Only the bar: what a
 * search does (filtering, results, keyboard navigation) stays with the screen.
 */
export function SearchBar(props: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setInput = (element: HTMLInputElement | null) => {
    inputRef.current = element;
    const callerRef = props.inputRef;
    if (typeof callerRef === "function") {
      callerRef(element);
    } else if (callerRef) {
      callerRef.current = element;
    }
  };

  return (
    <label
      className={`sb-search-bar sb-search-bar-${props.variant ?? "filled"}${
        props.className ? ` ${props.className}` : ""
      }`}
    >
      <MaterialIcon className="sb-search-bar-icon" aria-hidden="true">
        search
      </MaterialIcon>
      <input
        ref={setInput}
        id={props.id}
        type="search"
        dir={props.dir}
        className="sb-search-bar-input"
        value={props.value}
        placeholder={props.placeholder}
        aria-label={props["aria-label"] ?? props.placeholder}
        onInput={(event) => props.onInput(event.currentTarget.value)}
        onKeyDown={props.onKeyDown}
        onFocus={props.onFocus}
      />
      {props.value ? (
        <SearchClearButton
          onClear={() => {
            props.onInput("");
            inputRef.current?.focus();
          }}
        />
      ) : null}
    </label>
  );
}
