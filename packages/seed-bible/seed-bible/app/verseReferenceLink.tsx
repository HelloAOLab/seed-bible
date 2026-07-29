import { useMemo } from "preact/hooks";
import {
  parseVerseReferences,
  type VerseRef,
} from "../managers/BibleDataManager";
import { type ComponentChildren, type ComponentProps, type JSX } from "preact";

export function getVerseReferenceLinkHref(ref: VerseRef) {
  const url = new URL(window.location.href);
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

/**
 * Renders plain text with any detected scripture references turned into
 * clickable {@link VerseReferenceLink}s (e.g. footnote bodies, chat messages).
 */
export function VerseReferenceText({
  text,
  onReferenceClick,
}: {
  text: string;
  onReferenceClick?: (
    ref: VerseRef,
    event: JSX.TargetedMouseEvent<HTMLAnchorElement>
  ) => void;
}) {
  const matches = parseVerseReferences(text);
  if (matches.length === 0) {
    return <>{text}</>;
  }

  const parts: ComponentChildren[] = [];
  let lastIndex = 0;

  for (const [index, match] of matches.entries()) {
    if (lastIndex < match.start) {
      parts.push(text.slice(lastIndex, match.start));
    }

    const label = text.slice(match.start, match.end);
    parts.push(
      <VerseReferenceLink
        key={`${match.start}-${match.end}-${index}`}
        reference={match.ref}
        onClick={(event) => {
          if (!onReferenceClick) {
            return;
          }
          event.preventDefault();
          onReferenceClick(match.ref, event);
        }}
      >
        {label}
      </VerseReferenceLink>
    );
    lastIndex = match.end;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
