import { useMemo } from "preact/hooks";
import {
  parseVerseReferences,
  type VerseRef,
} from "../managers/BibleDataManager";
import { type ComponentChildren, type ComponentProps, type JSX } from "preact";
import { buildReadingUrl, parseReadingPath } from "../managers/ReadingUrlPath";
import { uiLocaleForDefaultTranslation } from "../managers/BibleReadingManager";
import { readInjectedConfig } from "./appConfig";

/**
 * Builds the href for an inline scripture reference (a footnote body, a chat
 * message). The translation and language come from the URL the reader is
 * already on, so the reference opens in what they're reading.
 *
 * Note this has to write the path, not `?book=`/`?chapter=`. Those params lost
 * to the path when the position moved into it, so setting them on top of the
 * current URL produced a link that looked right and navigated nowhere — it
 * reopened the chapter the reader was already on.
 */
export function getVerseReferenceLinkHref(ref: VerseRef) {
  const url = new URL(window.location.href);
  const { basePath } = readInjectedConfig();
  const parsed = parseReadingPath(url.pathname, basePath);

  // No reading path to take a translation from (a bare "/", say). Fall back to
  // the legacy params, which the server still redirects to the canonical form.
  const next = parsed
    ? buildReadingUrl({
        currentUrl: url,
        basePath,
        translationId: parsed.translationId,
        bookId: ref.book,
        chapter: ref.chapter,
        fallbackLanguage:
          uiLocaleForDefaultTranslation(parsed.translationId) ?? undefined,
      })
    : legacyVerseReferenceUrl(url, ref);

  if (ref.verse) {
    next.searchParams.set(
      "verse",
      ref.endVerse ? `${ref.verse}-${ref.endVerse}` : String(ref.verse)
    );
  }

  return next.toString();
}

function legacyVerseReferenceUrl(currentUrl: URL, ref: VerseRef): URL {
  const url = new URL(currentUrl.href);
  url.searchParams.set("book", ref.book);
  url.searchParams.set("chapter", String(ref.chapter));
  return url;
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
