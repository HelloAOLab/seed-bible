import { useSignal, type ReadonlySignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { MaterialIcon, SeedBibleIcon } from "../icons";
import { useI18n } from "../../i18n";
import type { LoginManager } from "../../managers/LoginManager";
import type { BibleTheme } from "../../managers/ThemeManager";
import type {
  TodayManager,
  TodayPassageTarget,
} from "../../managers/TodayManager";

/** Splits a marked verse on its `<hl>`/`</hl>` boundaries; odd parts were inside. */
const HIGHLIGHT_MARKERS = /<hl>|<\/hl>/;

export const Welcome = (props: {
  today: TodayManager;
  login: LoginManager;
  theme: ReadonlySignal<BibleTheme>;
  onOpenBookSelector: () => void;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) => {
  const { bookNames, getVerseText, lastTranslationId, getDefaultTranslation } =
    props.today;
  const username = props.login.profile.value?.name;
  const { t } = useI18n();
  // Read here in the render body, which is a reactive scope, so a theme switch
  // recolours the icon immediately (see useReadingHistoryTimeline).
  const theme = props.theme.value;

  const welcomeVerse = useSignal("");

  useEffect(() => {
    let isActive = true;

    const translationId =
      lastTranslationId.value ?? getDefaultTranslation() ?? "";
    const mappedVerse = WELCOME_VERSE_MAP[translationId];

    // The table is the common case and needs no network round trip; the API
    // is only a fallback for a translation the table has not been given yet.
    if (mappedVerse !== undefined) {
      welcomeVerse.value = `"${mappedVerse}"`;
    } else {
      void getVerseText(translationId, "JHN", 1, 1).then((rawVerseText) => {
        if (isActive) {
          welcomeVerse.value = `"${rawVerseText ?? ""}"`;
        }
      });
    }

    return () => {
      isActive = false;
    };
  }, [lastTranslationId.value]);

  return (
    <div className={"sb-today-welcome-screen"}>
      <h1 className={"sb-today-welcome-screen-greeting"}>
        {username
          ? t("personal-greeting", {
              name: username,
              defaultValue: "Welcome, {{name}}!",
            })
          : t("anonymous-greeting", { defaultValue: "Welcome!" })}
      </h1>
      <span className={"sb-today-welcome-screen-book"}>
        {`${bookNames.value.get("JHN")?.toUpperCase()} 1:1`}
      </span>
      {/*
        Real nodes rather than `dangerouslySetInnerHTML`. The `<hl>` markers are
        author-controlled -- they come only from the table below -- but the
        unmapped fallback path renders text straight from the Bible API through
        this same element, and as raw HTML that text was never escaped.
      */}
      <div className="sb-today-welcome-screen-verse">
        {welcomeVerse.value.split(HIGHLIGHT_MARKERS).map((part, index) =>
          index % 2 === 1 ? (
            <span
              className="sb-today-welcome-screen-verse-highlight"
              key={index}
            >
              {part}
            </span>
          ) : (
            part
          )
        )}
      </div>
      <div className={"sb-today-welcome-screen-navigation"}>
        <button
          className="sb-today-book-selector-button sb-today-clickable"
          type="button"
          onClick={props.onOpenBookSelector}
        >
          <SeedBibleIcon
            className="sb-today-seed-bible-icon"
            style={{
              width: "1.25rem",
              height: "1.25rem",
              fill: theme.variables.readerFontColor,
            }}
          />
          {t("open-bible", { defaultValue: "Open Bible" })}
        </button>
        <button
          className={"sb-today-welcome-screen-start-button sb-today-clickable"}
          onClick={() =>
            // `onOpenPassage` falls back to the default translation when unset.
            props.onOpenPassage({
              bookId: "GEN",
              chapter: 1,
              translationId: lastTranslationId.value,
            })
          }
        >
          {t("read-first-chapter", {
            defaultValue: "Read the first chapter",
          })}
          <MaterialIcon>arrow_right_alt</MaterialIcon>
        </button>
      </div>
    </div>
  );
};

/**
 * Maps a `translationId` to its pre-highlighted John 1:1 text.
 *
 * Keyed by exactly the unique translation IDs declared in
 * `DEFAULT_TRANSLATIONS_BY_LANGUAGE` (`BibleReadingManager`). Each value is the
 * verse text from the Free Use Bible API (helloao) with `<hl>…</hl>` tags
 * wrapped around the two semantic anchors of the verse:
 *   - the word for "beginning" (e.g. "principio", "commencement"), and
 *   - the clause "the Word was God" (e.g. "el Verbo era Dios").
 */
type WelcomeVerseMap = Record<string, string>;

const WELCOME_VERSE_MAP: WelcomeVerseMap = {
  // English — AAB (Ancients Accessible Bible)
  AAB: "In the <hl>beginning</hl> was the Word, and the Word was with God, and the <hl>Word was God.</hl>",
  // Amharic — amh_amh
  amh_amh:
    "<hl>በመጀመሪያው</hl> ቃል ነበረ፥ ቃልም በእግዚአብሔር ዘንድ ነበረ፥ <hl>ቃልም እግዚአብሔር ነበረ።</hl>",
  // Arabic — ARBNAV (New Arabic Version)
  ARBNAV:
    "فِي <hl>الْبَدْءِ</hl> كَانَ الْكَلِمَةُ، وَالْكَلِمَةُ كَانَ عِنْدَ اللهِ. <hl>وَكَانَ الْكَلِمَةُ اللهُ.</hl>",
  // Bengali — ben_ocv
  ben_ocv:
    "<hl>আদিতে</hl> বাক্য ছিলেন, সেই বাক্য ঈশ্বরের সঙ্গে ছিলেন এবং <hl>বাক্যই ঈশ্বর ছিলেন।</hl>",
  // Spanish — spa_onbv (Open Nueva Biblia Viva)
  spa_onbv:
    "<hl>Antes que nada existiera</hl>, ya existía la Palabra, y la Palabra estaba con Dios porque <hl>aquel que es la Palabra era Dios.</hl>",
  // Persian — pes_opcb
  pes_opcb:
    "در <hl>آغاز</hl> کلمه بود، کلمه با خدا بود، <hl>و کلمه، خدا بود.</hl>",
  // French — fra_ncl (néo-Crampon Libre)
  fra_ncl:
    "Au <hl>commencement</hl> était le Verbe, et le Verbe était en Dieu, et le <hl>Verbe était Dieu.</hl>",
  // Hindi — hin_cvb
  hin_cvb:
    "<hl>आदि</hl> में वचन था, वचन परमेश्वर के साथ था और <hl>वचन परमेश्वर था.</hl>",
  // Indonesian — ind_ayt
  ind_ayt:
    "Pada <hl>mulanya</hl> adalah Firman, Firman itu bersama-sama dengan Allah dan <hl>Firman itu adalah Allah.</hl>",
  // Japanese — jpn_loc
  jpn_loc:
    "<hl>初め</hl>に、ことばがあった。ことばは神とともにあった。<hl>ことばは神であった。</hl>",
  // Korean — kor_old
  kor_old:
    "<hl>태초</hl>에 말씀이 계시니라 이 말씀이 하나님과 함께 계셨으니 <hl>이 말씀은 곧 하나님이시니라</hl>",
  // Nepali — npi_ncb
  npi_ncb:
    "<hl>आदिमा</hl> वचन हुनुहुन्थ्यो र वचन परमेश्‍वरसँग हुनुहुन्थ्यो। अनि <hl>वचन परमेश्‍वर हुनुहुन्थ्यो।</hl>",
  // Portuguese — por_onbv (Open Nova Bíblia Viva)
  por_onbv:
    "No <hl>princípio</hl> era aquele que é a Palavra, e ele estava com Deus e <hl>era Deus.</hl>",
  // Russian — rus_syn (Synodal)
  rus_syn:
    "В <hl>начале</hl> было Слово, и Слово было у Бога, и <hl>Слово было Бог.</hl>",
  // Swahili — swh_onmm
  swh_onmm:
    "Hapo <hl>mwanzo</hl> alikuwako Neno, naye huyo Neno alikuwa pamoja na Mungu, naye <hl>Neno alikuwa Mungu.</hl>",
  // Turkish — tur_ytc
  tur_ytc:
    "<hl>Başlangıçta</hl> Söz vardı ve Söz Tanrı'yla birlikteydi ve <hl>Söz Tanrı’ydı.</hl>",
  // Uyghur — uig_ara
  uig_ara:
    "<hl>مۇقەددەمدە</hl> «كالام» بار ئىدى؛ كالام خۇدا بىلەن بىللە ئىدى ھەم <hl>كالام خۇدا ئىدى.</hl>",
  // Ukrainian — ukr_ufb
  ukr_ufb:
    "У <hl>починї</hl> було Слово, й Слово було в Бога, й <hl>Бог було Слово.</hl>",
  // Urdu — urd_oucv
  urd_oucv:
    "<hl>اِبتدا</hl> میں کلام تھا اَور کلام خُدا کے ساتھ تھا اَور <hl>کلام خُدا ہی تھا۔</hl>",
  // Vietnamese — vie_vcb
  vie_vcb:
    "<hl>Ban đầu</hl> có Ngôi Lời, Ngôi Lời ở với Đức Chúa Trời, và <hl>Ngôi Lời là Đức Chúa Trời.</hl>",
  // Chinese (Mandarin) — cmn_cbt
  cmn_cbt: "<hl>太初</hl>，道已經存在，道與上帝同在，<hl>道就是上帝。</hl>",
};
