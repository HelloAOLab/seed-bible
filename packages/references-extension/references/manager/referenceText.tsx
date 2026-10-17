import { Fragment } from "preact";
import { Skeleton, SkeletonContainer } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import type { ReferenceVerseText } from "./interfaces";

/** Where a reference's text is: still loading, missing, or here. */
export type ReferenceText =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; verses: ReferenceVerseText[] };

/** A reference's text as one line, shown under it in a list. */
export function ReferencePreview(props: { text: ReferenceText }) {
  const { text } = props;
  if (text.status === "loading") {
    return (
      <span className="sb-references-row-preview">
        <Skeleton shape="line" width="70%" />
      </span>
    );
  }
  if (text.status === "unavailable") {
    return null;
  }
  return (
    <span className="sb-references-row-preview">
      {text.verses.map((verse) => verse.text).join(" ")}
    </span>
  );
}

/** A reference's full text, numbered by verse when it spans several. */
export function ReferenceBody(props: {
  text: ReferenceText;
  /** Added to the text's paragraph, for a surface that styles it its own way. */
  className?: string;
}) {
  const { text, className } = props;
  const { t } = useI18n("ext_references");

  if (text.status === "loading") {
    return (
      <SkeletonContainer
        label={t("loading-references", { defaultValue: "Loading verse text" })}
        className="sb-references-text-placeholder"
      >
        <Skeleton shape="line" width="100%" />
        <Skeleton shape="line" width="100%" />
        <Skeleton shape="line" width="60%" />
      </SkeletonContainer>
    );
  }

  if (text.status === "unavailable") {
    return (
      <p className="sb-references-note">
        {t("text-unavailable", { defaultValue: "Verse text unavailable." })}
      </p>
    );
  }

  const isNumbered = text.verses.length > 1;
  return (
    <p className={`sb-references-text${className ? ` ${className}` : ""}`}>
      {text.verses.map((verse, verseIndex) => (
        <Fragment key={verse.number}>
          {isNumbered && (
            <span className="sb-references-verse-number">{verse.number}</span>
          )}
          {verse.text}
          {verseIndex < text.verses.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </p>
  );
}
