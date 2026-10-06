import type { ComponentChildren } from "preact";
import { useSignal } from "@preact/signals";
import "./DiscoverSection.css";

export function DiscoverSection(props: {
  title: string;
  children: ComponentChildren;
  className?: string;
  /** Shown beside the title, for sections whose length is worth knowing up front. */
  count?: number;
  /** Lets the reader fold the section away behind its title. */
  collapsible?: boolean;
  /** Only read on the first render; afterwards the reader's choice wins. */
  defaultCollapsed?: boolean;
}) {
  const isCollapsed = useSignal(!!props.defaultCollapsed);

  const label =
    props.count == null ? props.title : `${props.title} (${props.count})`;

  if (!props.collapsible) {
    return (
      <section className={`sb-discover-section ${props.className ?? ""}`}>
        <h3 className="sb-discover-section-title">{label}</h3>
        {props.children}
      </section>
    );
  }

  return (
    <section className={`sb-discover-section ${props.className ?? ""}`}>
      <h3 className="sb-discover-section-title">
        <button
          type="button"
          className="sb-discover-section-toggle"
          aria-expanded={!isCollapsed.value}
          onClick={() => (isCollapsed.value = !isCollapsed.value)}
        >
          <span
            className={`sb-discover-section-caret${
              isCollapsed.value ? "" : " sb-discover-section-caret--open"
            }`}
            aria-hidden="true"
          />
          {label}
        </button>
      </h3>
      {!isCollapsed.value && props.children}
    </section>
  );
}

export function DiscoverEmpty(props: { text: string }) {
  return <div className="sb-discover-empty">{props.text}</div>;
}
