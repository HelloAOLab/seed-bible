import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { Skeleton, SkeletonContainer } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import type { LexiconSense } from "seed-bible/managers";
import type { VerseRef } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import { VerseReferenceText } from "@packages/seed-bible/seed-bible/app/verseReferenceLink";
import { parseDefinition, type OutlineItem } from "./definition";
import type { LexiconEntryResult, WordStudyProvider } from "./provider";
import {
  orderSenses,
  parseStrongsId,
  STRONGS_IN_TEXT_PATTERN,
} from "./strongs";
import { isRightToLeft, languageTag } from "./wordStudyState";

/**
 * Where the attribution links when an entry hasn't loaded to say otherwise.
 * CC BY 4.0 requires the credit wherever the definitions appear.
 */
const STEPBIBLE_WEBSITE = "https://github.com/STEPBible/STEPBible-Data";
const STEPBIBLE_LICENSE = "https://creativecommons.org/licenses/by/4.0/";

export interface LexiconCardProps {
  provider: WordStudyProvider;
  /** The Strong's number to show, plain ("G3056") or extended ("H0430G"). */
  strongsId: string;
  /** Opens another entry, for a Strong's number named in the definition. */
  onOpenStrongs: (strongsId: string) => void;
  onReferenceClick: (ref: VerseRef) => void;
}

/**
 * One STEPBible lexicon entry: every sense with its lemma, gloss and
 * definition, the sense the ID names (if any) first.
 */
export function LexiconCard(props: LexiconCardProps) {
  const { provider, strongsId, onOpenStrongs, onReferenceClick } = props;
  const { t } = useI18n("word-study-extension");
  const result = useSignal<LexiconEntryResult | null>(null);
  const attempt = useSignal(0);
  const attemptNumber = attempt.value;

  useEffect(() => {
    let isCurrent = true;
    result.value = null;
    provider
      .getLexiconEntry(strongsId)
      .catch(
        (error: unknown): LexiconEntryResult => ({
          status: "error",
          error,
        })
      )
      .then((loaded) => {
        if (isCurrent) {
          result.value = loaded;
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [provider, strongsId, attemptNumber]);

  const loaded = result.value;
  let body: ComponentChildren;
  if (!loaded) {
    body = (
      <SkeletonContainer
        label={t("loading-definition", {
          defaultValue: "Loading definition",
        })}
        className="sb-word-study-skeleton"
      >
        <Skeleton shape="line" width="40%" height="1.5rem" />
        <Skeleton shape="line" width="95%" />
        <Skeleton shape="line" width="88%" />
        <Skeleton shape="line" width="70%" />
      </SkeletonContainer>
    );
  } else if (loaded.status === "not-found") {
    body = (
      <p className="sb-word-study-message">
        {t("no-definition", { defaultValue: "No definition available" })}
      </p>
    );
  } else if (loaded.status === "error") {
    body = (
      <div className="sb-word-study-message" role="alert">
        <p>
          {t("definition-load-failed", {
            defaultValue:
              "Couldn't load this definition. Check your connection and try again.",
          })}
        </p>
        <button
          type="button"
          className="sb-word-study-retry"
          onClick={() => {
            attempt.value = attemptNumber + 1;
          }}
        >
          {t("retry", { defaultValue: "Retry" })}
        </button>
      </div>
    );
  } else {
    const fullId = parseStrongsId(strongsId)?.fullId;
    const senses = orderSenses(loaded.entry.senses, fullId);
    const hasMatch =
      senses.length > 1 && senses[0]?.id.toUpperCase() === fullId;

    body = senses.map((sense, index) => (
      <div key={sense.id}>
        {hasMatch && index === 0 && (
          <h4 className="sb-word-study-sense-group">
            {t("matching-sense", { defaultValue: "Sense referred to" })}
          </h4>
        )}
        {hasMatch && index === 1 && (
          <h4 className="sb-word-study-sense-group">
            {t("other-senses", { defaultValue: "Other senses" })}
          </h4>
        )}
        <SenseView
          sense={sense}
          onOpenStrongs={onOpenStrongs}
          onReferenceClick={onReferenceClick}
        />
      </div>
    ));
  }

  const dataset = loaded?.status === "ok" ? loaded.dataset : undefined;
  return (
    <div className="sb-word-study-lexicon">
      {body}
      <p className="sb-word-study-attribution">
        {t("lexicon-attribution-prefix", { defaultValue: "Definitions:" })}{" "}
        <a
          href={dataset?.website || STEPBIBLE_WEBSITE}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("lexicon-attribution-source", {
            defaultValue: "STEPBible.org / Tyndale House, Cambridge",
          })}
        </a>
        {", "}
        <a
          href={dataset?.licenseUrl || STEPBIBLE_LICENSE}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("lexicon-attribution-license", { defaultValue: "CC BY 4.0" })}
        </a>
      </p>
    </div>
  );
}

function SenseView(props: {
  sense: LexiconSense;
  onOpenStrongs: (strongsId: string) => void;
  onReferenceClick: (ref: VerseRef) => void;
}) {
  const { sense, onOpenStrongs, onReferenceClick } = props;

  return (
    <article className="sb-word-study-sense">
      <header className="sb-word-study-sense-header">
        <span
          className="sb-word-study-lemma"
          dir={isRightToLeft(sense.language) ? "rtl" : "ltr"}
          lang={languageTag(sense.language)}
        >
          {sense.lemma}
        </span>
        <span className="sb-word-study-transliteration">
          {sense.transliteration}
        </span>
        <span className="sb-word-study-gloss">{sense.gloss}</span>
        <span className="sb-word-study-sense-meta">
          {sense.partOfSpeech} · {sense.id}
        </span>
      </header>
      <div className="sb-word-study-definition">
        {parseDefinition(sense.definition).map((block, index) =>
          block.type === "paragraph" ? (
            <p key={index}>
              <DefinitionText
                text={block.text}
                onOpenStrongs={onOpenStrongs}
                onReferenceClick={onReferenceClick}
              />
            </p>
          ) : (
            <OutlineList
              key={index}
              items={block.items}
              onOpenStrongs={onOpenStrongs}
              onReferenceClick={onReferenceClick}
            />
          )
        )}
      </div>
    </article>
  );
}

function OutlineList(props: {
  items: OutlineItem[];
  onOpenStrongs: (strongsId: string) => void;
  onReferenceClick: (ref: VerseRef) => void;
}) {
  const { items, onOpenStrongs, onReferenceClick } = props;
  return (
    <ul className="sb-word-study-outline">
      {items.map((item, index) => (
        <li key={index}>
          <span className="sb-word-study-outline-marker">{item.marker}</span>{" "}
          <DefinitionText
            text={item.text}
            onOpenStrongs={onOpenStrongs}
            onReferenceClick={onReferenceClick}
          />
          {item.children.length > 0 && (
            <OutlineList
              items={item.children}
              onOpenStrongs={onOpenStrongs}
              onReferenceClick={onReferenceClick}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Definition text with its Strong's numbers as buttons that open that entry
 * and its scripture references ("Mat.8:8") as links. A reference the app's
 * parser can't read stays plain text, so nothing becomes a broken link.
 */
function DefinitionText(props: {
  text: string;
  onOpenStrongs: (strongsId: string) => void;
  onReferenceClick: (ref: VerseRef) => void;
}) {
  const { text, onOpenStrongs, onReferenceClick } = props;
  const { t } = useI18n("word-study-extension");
  const parts: ComponentChildren[] = [];
  let last = 0;

  const pushText = (end: number) => {
    if (end > last) {
      parts.push(
        <VerseReferenceText
          key={`text-${last}`}
          text={text.slice(last, end)}
          onReferenceClick={(ref) => onReferenceClick(ref)}
        />
      );
    }
  };

  for (const match of text.matchAll(STRONGS_IN_TEXT_PATTERN)) {
    const id = match[0];
    pushText(match.index);
    parts.push(
      <button
        key={`strongs-${match.index}`}
        type="button"
        className="sb-word-study-strongs-link"
        aria-label={t("open-strongs", {
          defaultValue: "Open the lexicon entry for {{id}}",
          id,
        })}
        onClick={() => onOpenStrongs(id)}
      >
        {id}
      </button>
    );
    last = match.index + id.length;
  }
  pushText(text.length);

  return <>{parts}</>;
}
