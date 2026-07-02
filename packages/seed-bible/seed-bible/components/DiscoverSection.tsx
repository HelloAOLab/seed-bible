import type { ComponentChildren } from "preact";

export function DiscoverSection(props: {
  title: string;
  children: ComponentChildren;
}) {
  return (
    <section className="sb-discover-section">
      <h3 className="sb-discover-section-title">{props.title}</h3>
      {props.children}
    </section>
  );
}

export function DiscoverEmpty(props: { text: string }) {
  return <div className="sb-discover-empty">{props.text}</div>;
}
