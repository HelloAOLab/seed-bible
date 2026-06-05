import { useMemo } from "preact/hooks";
import type { VerseRef } from "../managers/BibleDataManager";
import { type ComponentChildren, type ComponentProps } from "preact";

export function getVerseReferenceLinkHref(ref: VerseRef) {
  const url = new URL(configBot.tags.url ?? window.location.href);
  url.searchParams.set("book", ref.book);
  url.searchParams.set("chapter", String(ref.chapter));
  if (ref.verse) {
    if (ref.endVerse) {
      url.searchParams.set("verse", `${ref.verse}-${ref.endVerse}`);
    } else {
      url.searchParams.set("verse", String(ref.verse));
    }
  }

  return url.toString();
}

export function VerseReferenceLink({
  reference,
  children,
  ...props
}: {
  reference: VerseRef;
  children: ComponentChildren;
} & ComponentProps<"a">) {
  const link = useMemo(() => getVerseReferenceLinkHref(reference), [reference]);
  const className = ["sb-verse-reference-link", props.className]
    .filter(Boolean)
    .join(" ");
  return (
    <a {...props} href={link} className={className}>
      {children}
    </a>
  );
}
