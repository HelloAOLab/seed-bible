import "./SearchableSelect.css";
import { useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import {
  handleMenuTriggerKeyDown,
  handleVerticalListKeyNav,
} from "../../app/keyboardNav";

export interface SearchableSelectOption {
  id: string;
  label: string;
  leading?: ComponentChildren;
}

/**
 * The searchable picker used by Settings for the UI language: a closed
 * trigger that opens a filterable list. Selecting an option commits it and
 * closes the menu.
 */
export function SearchableSelect(props: {
  id?: string;
  value: string;
  options: readonly SearchableSelectOption[];
  onChange: (id: string) => void;
  searchPlaceholder: string;
  searchLabel?: string;
  emptyLabel: string;
  buttonClassName?: string;
}) {
  const {
    id,
    value,
    options,
    onChange,
    searchPlaceholder,
    searchLabel,
    emptyLabel,
    buttonClassName = "",
  } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.id === value) ?? options[0];
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? options.filter(
        (option) =>
          option.id.toLowerCase().includes(normalizedQuery) ||
          option.label.toLowerCase().includes(normalizedQuery)
      )
    : options;

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="sb-language-picker">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={`sb-language-picker-button${
          buttonClassName ? ` ${buttonClassName}` : ""
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={(event) => {
          handleMenuTriggerKeyDown(event, {
            isOpen: open,
            open: () => setOpen(true),
            getMenuContainer: () => menuRef.current,
          });
        }}
      >
        {selected?.leading}
        <span>{selected?.label ?? ""}</span>
        <span className="material-symbols-outlined" aria-hidden="true">
          expand_more
        </span>
      </button>
      {open && (
        <>
          <div className="sb-language-picker-overlay" onClick={close} />
          <div
            ref={(el) => {
              menuRef.current = el;
              if (el && !el.contains(document.activeElement)) {
                const search = el.querySelector<HTMLInputElement>(
                  ".sb-language-picker-search-input"
                );
                if (search) {
                  search.focus();
                  return;
                }
                const selectedOption = el.querySelector<HTMLElement>(
                  '[role="option"][aria-selected="true"]:not([disabled])'
                );
                const first = el.querySelector<HTMLElement>(
                  '[role="option"]:not([disabled])'
                );
                (selectedOption ?? first)?.focus();
              }
            }}
            className="sb-language-picker-menu"
            role="listbox"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                close();
                triggerRef.current?.focus();
                return;
              }
              const target = event.target as HTMLElement | null;
              const isSearchInput = target?.classList.contains(
                "sb-language-picker-search-input"
              );
              if (isSearchInput) {
                if (event.key === "ArrowDown" || event.key === "Enter") {
                  event.preventDefault();
                  const firstOption =
                    event.currentTarget.querySelector<HTMLElement>(
                      '[role="option"]:not([disabled])'
                    );
                  firstOption?.focus();
                }
                return;
              }
              handleVerticalListKeyNav(event, event.currentTarget);
            }}
          >
            <div className="sb-language-picker-search">
              <span
                className="material-symbols-outlined sb-language-picker-search-icon"
                aria-hidden="true"
              >
                search
              </span>
              <input
                type="text"
                className="sb-language-picker-search-input"
                placeholder={searchPlaceholder}
                aria-label={searchLabel ?? searchPlaceholder}
                value={query}
                onInput={(event: Event) => {
                  setQuery((event.currentTarget as HTMLInputElement).value);
                }}
              />
            </div>
            {filtered.length === 0 ? (
              <div className="sb-language-picker-empty">{emptyLabel}</div>
            ) : (
              filtered.map((option) => {
                const isSelected = option.id === value;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`sb-language-picker-item${
                      isSelected ? " sb-language-picker-item-selected" : ""
                    }`}
                    onClick={() => {
                      onChange(option.id);
                      close();
                    }}
                  >
                    {option.leading}
                    <span>{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
