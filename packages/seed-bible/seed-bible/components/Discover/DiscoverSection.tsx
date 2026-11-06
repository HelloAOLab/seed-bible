import type { ComponentChildren } from "preact";
import "./DiscoverSection.css";

export function DiscoverSection(props: {
  title: string;
  children: ComponentChildren;
  className?: string;
  /** Shown beside the title, for sections whose length is worth knowing up front. */
  count?: number;
  /** Follows the title after a middle dot, such as how long the section takes. */
  detail?: string;
}) {
  const title =
    props.count == null ? props.title : `${props.title} (${props.count})`;
  const label = props.detail ? `${title} · ${props.detail}` : title;

  return (
    <section className={`sb-discover-section ${props.className ?? ""}`}>
      <h3 className="sb-discover-section-title">{label}</h3>
      {props.children}
    </section>
  );
}

export function DiscoverEmpty(props: { text: string }) {
  return <div className="sb-discover-empty">{props.text}</div>;
}
