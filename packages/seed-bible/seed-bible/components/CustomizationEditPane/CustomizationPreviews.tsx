import type { ComponentChildren } from "preact";
import type { BibleTheme } from "../../managers/ThemeManager";
import type { SeedBibleCustomization } from "../../managers/CustomizationsManager";
import type { Translation } from "../../managers/FreeUseBibleAPI";
import { useI18n, type I18nHook } from "../../i18n/I18nManager";

/**
 * Theme values that aren't a paintable color on their own (a sidebar that
 * shows whatever is behind it, a decoration that follows the text color).
 * Their swatches show a checkerboard instead, the usual "nothing here" cue.
 */
const NON_PAINTABLE_COLORS = new Set([
  "",
  "transparent",
  "inherit",
  "currentcolor",
]);

export function isPaintableColor(
  value: string | null | undefined
): value is string {
  return !!value && !NON_PAINTABLE_COLORS.has(value.trim().toLowerCase());
}

/**
 * How a customization's default translation reads in the editor and on its
 * card. The saved id can be absent from the catalog — a translation later
 * removed, or simply the brief window before `availableTranslations` has
 * loaded — in which case there's nothing to name it by except the raw id.
 */
export function getDefaultTranslationLabel(
  t: I18nHook["t"],
  record: SeedBibleCustomization,
  translations: Translation[]
): string {
  if (!record.defaultTranslationId) {
    return t("customization-default-translation-none", {
      defaultValue: "Seed Bible's default",
    });
  }
  const translation = translations.find(
    (tr) => tr.id === record.defaultTranslationId
  );
  if (translation) {
    return `${translation.name} (${translation.shortName})`;
  }
  return t("customization-default-translation-unavailable", {
    id: record.defaultTranslationId,
    defaultValue: "{{id}} (unavailable)",
  });
}

/**
 * The small "Aa" thumbnail on a theme card: the theme's background, its
 * text in its own font, and its primary and secondary colors as two bars.
 */
export function ThemeThumbnail(props: { theme: BibleTheme }) {
  const v = props.theme.variables;
  return (
    <div
      className="sb-cz-theme-thumb"
      aria-hidden="true"
      style={{ background: v.readerBackground, color: v.readerFontColor }}
    >
      <span
        className="sb-cz-theme-thumb-aa"
        style={{ fontFamily: v.bookTitleFontFamily }}
      >
        Aa
      </span>
      <span className="sb-cz-theme-thumb-bars">
        <span style={{ background: v.primaryColor }} />
        <span style={{ background: v.secondaryColor }} />
      </span>
    </div>
  );
}

/**
 * The banner on a customization's card in the list: a sketch of its default
 * theme's reader (a chapter heading over a few lines of text) beside a strip
 * showing its primary and secondary colors.
 */
export function CustomizationCardPreview(props: {
  theme: BibleTheme;
  logoUrl?: string | null;
  heading: string;
}) {
  const v = props.theme.variables;
  return (
    <div
      className="sb-cz-card-preview"
      aria-hidden="true"
      style={{ background: v.background }}
    >
      <div
        className="sb-cz-card-preview-reader"
        style={{ background: v.readerBackground }}
      >
        <span
          className="sb-cz-card-preview-heading"
          style={{
            color: v.chapterHeadingFontColor,
            fontFamily: v.bookTitleFontFamily,
          }}
        >
          {props.heading}
        </span>
        <span
          className="sb-cz-card-preview-line"
          style={{ background: v.verseFontColor }}
        />
        <span
          className="sb-cz-card-preview-line sb-cz-card-preview-line-short"
          style={{ background: v.verseFontColor }}
        />
      </div>
      <div className="sb-cz-card-preview-strip">
        {props.logoUrl ? (
          <img className="sb-cz-card-preview-logo" src={props.logoUrl} alt="" />
        ) : null}
        <span style={{ background: v.primaryColor }} />
        <span style={{ background: v.secondaryColor }} />
      </div>
    </div>
  );
}

/**
 * A miniature reader drawn entirely from one theme's resolved values, shown
 * at the top of the theme editor so every color and font edit has a visible
 * effect right where it's made — including the ones (link, visited link,
 * highlight, floating button) the surrounding editor UI never uses itself.
 */
export function ThemeLivePreview(props: { theme: BibleTheme }) {
  const { t } = useI18n();
  const v = props.theme.variables;
  const highlight = props.theme.highlightColors.yellow;
  return (
    <div
      className="sb-cz-live-preview"
      aria-hidden="true"
      style={{ background: v.background, fontFamily: v.fontFamily }}
    >
      <div
        className="sb-cz-live-preview-toolbar"
        style={{
          background: v.readerToolbarBackground,
          color: v.readerToolbarFontColor,
        }}
      >
        <span
          className="sb-cz-live-preview-dot"
          style={{ background: v.primaryColor }}
        />
        <span className="sb-cz-live-preview-bar" />
      </div>
      <div
        className="sb-cz-live-preview-reader"
        style={{ background: v.readerBackground, color: v.readerFontColor }}
      >
        <div
          className="sb-cz-live-preview-book"
          style={{
            color: v.bookTitleFontColor,
            fontFamily: v.bookTitleFontFamily,
          }}
        >
          {t("customization-preview-book", {
            defaultValue: "The Gospel of John",
          })}
        </div>
        <div
          className="sb-cz-live-preview-chapter"
          style={{
            color: v.chapterHeadingFontColor,
            fontFamily: v.chapterHeadingFontFamily,
          }}
        >
          {t("customization-preview-chapter", { defaultValue: "John 1" })}
        </div>
        <p
          className="sb-cz-live-preview-verse"
          style={{ color: v.verseFontColor, fontFamily: v.verseFontFamily }}
        >
          {renderTagged(
            t("customization-preview-verse", {
              defaultValue:
                "In the beginning was the <0>Word</0>, and the Word was with <1>God</1>, and the Word was <2>God</2>.",
            }),
            [
              (text) => (
                <mark
                  style={{
                    background: highlight?.color,
                    color: highlight?.fontColor,
                  }}
                >
                  {text}
                </mark>
              ),
              (text) => (
                <span
                  className="sb-cz-live-preview-link"
                  style={{ color: v.linkColor }}
                >
                  {text}
                </span>
              ),
              (text) => (
                <span
                  className="sb-cz-live-preview-link"
                  style={{ color: v.linkVisitedColor }}
                >
                  {text}
                </span>
              ),
            ]
          )}
        </p>
        <div className="sb-cz-live-preview-buttons">
          <span
            style={{ background: v.primaryColor, color: v.primaryFontColor }}
          >
            {t("customization-primaryColor", { defaultValue: "Primary" })}
          </span>
          <span
            style={{
              background: v.secondaryColor,
              color: v.secondaryFontColor,
            }}
          >
            {t("customization-secondaryColor", { defaultValue: "Secondary" })}
          </span>
          <span style={{ background: v.tertiaryColor, color: v.fontColor }}>
            {t("customization-tertiaryColor", { defaultValue: "Tertiary" })}
          </span>
        </div>
        <span
          className="sb-cz-live-preview-fab"
          style={{
            background: v.readerToolbarFloatingButtonBackground,
            color: v.readerToolbarFloatingButtonFontColor,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Renders `text`, wrapping each `<n>…</n>` span (i18next's numbered-tag
 * convention, so translators can move the styled words) with `renderers[n]`.
 * A tag with no renderer is shown as plain text.
 */
function renderTagged(
  text: string,
  renderers: ((text: string) => ComponentChildren)[]
): ComponentChildren[] {
  const parts: ComponentChildren[] = [];
  const pattern = /<(\d+)>(.*?)<\/\1>/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const [whole, index, inner = ""] = match;
    parts.push(text.slice(last, match.index));
    const render = renderers[Number(index)];
    parts.push(render ? render(inner) : inner);
    last = (match.index ?? 0) + whole.length;
  }
  parts.push(text.slice(last));
  return parts;
}
