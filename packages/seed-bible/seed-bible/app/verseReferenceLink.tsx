import { useMemo } from "preact/hooks";
import {
  scanVerseReferencesInText,
  type VerseRef,
} from "../managers/BibleDataManager";
import type { TranslationBook } from "../managers/FreeUseBibleAPI";
import { type ComponentChildren, type ComponentProps, type JSX } from "preact";
import { buildReadingUrl, parseReadingPath } from "../managers/ReadingUrlPath";
import { uiLocaleForDefaultTranslation } from "../managers/BibleReadingManager";
import { readInjectedConfig } from "./appConfig";

/**
 * Builds the href for an inline scripture reference (a footnote body, a chat
 * message, an annotation). The translation and language come from the URL the
 * reader is already on, so the reference opens in what they're reading.
 *
 * Query params from the current page are not copied. A saved note should not
 * hardcode a shared session, a scroll target, or any other page state — only
 * `?verse=` when the reference itself names a verse. Clearing the search
 * string (rather than deleting known keys) is what keeps a new, unrelated
 * param from quietly getting baked in later.
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
    : new URL(url.href);

  // Whitelist: nothing from the page, then only params the reference itself
  // needs. Legacy links still have to name book/chapter in the query because
  // there is no reading path to put them in.
  next.search = "";
  if (!parsed) {
    next.searchParams.set("book", ref.book);
    next.searchParams.set("chapter", String(ref.chapter));
  }
  if (ref.verse) {
    next.searchParams.set(
      "verse",
      ref.endVerse ? `${ref.verse}-${ref.endVerse}` : String(ref.verse)
    );
  }

  return next.toString();
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
  books,
  onReferenceClick,
}: {
  text: string;
  /** Current translation books; used so localized names (e.g. "Esdras") link. */
  books?: TranslationBook[];
  onReferenceClick?: (
    ref: VerseRef,
    event: JSX.TargetedMouseEvent<HTMLAnchorElement>
  ) => void;
}) {
  const matches = scanVerseReferencesInText(text, books);
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
