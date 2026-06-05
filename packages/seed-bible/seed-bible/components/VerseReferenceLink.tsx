import { useMemo } from "preact/hooks";
import type { VerseRef } from "../managers/BibleDataManager";
import { type ComponentChildren, type ComponentProps } from "preact";
import type { SeedBibleState } from "../managers/SeedBibleStateManager";
import { DEFAULT_TRANSLATION_ID } from "../managers/BibleReadingManager";
import { range } from "es-toolkit";

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

export async function openVerseReference(state: SeedBibleState, ref: VerseRef) {
  let tab = state.app.selectedTab.value;

  if (!tab) {
    tab = state.tabs.tabs.value[0] ?? null;
  }

  if (tab) {
    const translationid =
      tab.readingState.translationId.value ?? DEFAULT_TRANSLATION_ID;
    await tab.readingState.selectTranslationAndChapter(
      translationid,
      ref.book,
      ref.chapter,
      {
        scrollToVerse: ref.verse,
      }
    );
  } else {
    tab = state.tabs.addTab(undefined, {
      initialBookId: ref.book,
      initialChapterNumber: ref.chapter,
      scrollToVerse: ref.verse,
    });
  }

  if (ref.verse) {
    const verses = ref.endVerse
      ? range(ref.verse, ref.endVerse + 1)
      : ref.verse;
    tab.readingState.decorateVerses(ref.book, ref.chapter, verses, {
      className: "sb-verse-decoration-open-reference-highlight",
      removeAfterMs: 3000,
    });
  }
}

export function VerseReferenceLink({
  state,
  reference,
  children,
  ...props
}: {
  state: SeedBibleState;
  reference: VerseRef;
  children: ComponentChildren;
} & ComponentProps<"a">) {
  const link = useMemo(() => getVerseReferenceLinkHref(reference), [reference]);
  const className = ["sb-verse-reference-link", props.className]
    .filter(Boolean)
    .join(" ");
  return (
    <a
      {...props}
      href={link}
      className={className}
      onClick={async (e) => {
        e.preventDefault();
        await openVerseReference(state, reference);
      }}
    >
      {children}
    </a>
  );
}
