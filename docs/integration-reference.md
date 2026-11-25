# Seed Bible Integration Reference

This page is for ministries, websites and AI assistants that want to send people into Seed Bible: link to a passage, embed the reader, or have a chatbot hand out reading links. Everything here works with plain links. No account, API key or code changes to Seed Bible are needed.

- [Part 1: Links and URL parameters](#part-1-links-and-url-parameters)
- [Part 2: Embedding Seed Bible in your site](#part-2-embedding-seed-bible-in-your-site)
- [Part 3: AI system prompts](#part-3-ai-system-prompts)
- [Branding](#branding)

## Part 1: Links and URL parameters

A Seed Bible link is `https://seedbible.org/?` followed by parameters joined with `&`. Parameters can come in any order, and any you leave out get a sensible default.

```
https://seedbible.org/?translation=BSB&book=JHN&chapter=3&verse=16
```

Once the page opens, the address in the browser changes to a shorter form (for example `https://seedbible.org/es/spa_onbv/john/3`). That's expected. Keep building links in the `?book=…&chapter=…` form shown here: it's the format we promise to keep working.

### Reading parameters

| Parameter     | Value                                                                                                                                                                                                          | Example                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `translation` | A translation ID (see [Translation IDs](#translation-ids)). If omitted, Seed Bible picks one from the reader's language (see [Default translation for each language](#default-translation-for-each-language)). | `BSB`, `NASB2020`, `spa_onbv` |
| `book`        | The book's standard three-letter code, in capitals (the USFM code used across Bible software).                                                                                                                 | `GEN`, `PSA`, `JHN`, `REV`    |
| `chapter`     | Chapter number.                                                                                                                                                                                                | `1`, `23`, `119`              |
| `verse`       | The verses to highlight: one verse, a range, or a comma-separated list (ranges can go in the list too).                                                                                                        | `16`, `3-7`, `3,5,7`          |
| `lang`        | The language for menus and labels (not the Bible text). Usually the standard two-letter language code; Indonesian is `ind`.                                                                                    | `en`, `es`, `ar`, `fr`, `zh`  |

### Display parameters

These set the _starting_ value for the visit. If the reader changes the setting while they're on the page, their choice wins.

| Parameter             | Value                                                          | Example |
| --------------------- | -------------------------------------------------------------- | ------- |
| `app.themeId`         | `light`, `dark`, or `system` (follow the device's setting).    | `dark`  |
| `app.fontSize`        | Size of the Bible text: `XS`, `S`, `M`, `L`, `XL` or `XXL`.    | `L`     |
| `app.uiSize`          | Size of the interface (menus, buttons): `S`, `M`, `L` or `XL`. | `M`     |
| `app.keepScreenAwake` | `true` keeps the phone's screen from dimming while reading.    | `true`  |

### Navigation and session parameters

| Parameter      | Value                                                                                                                       | Example                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `settingsView` | Opens a settings page on arrival: `main`, `display-and-theme` or `extensions`.                                              | `display-and-theme`    |
| `sessionId`    | Joins a shared group reading session. Copy the whole link from the session's share button rather than building it yourself. | `session-6ace2ad9-...` |
| `embed`        | `minimal` shows the compact reader for embedding in another site. See [Part 2](#part-2-embedding-seed-bible-in-your-site).  | `minimal`              |

### Translation IDs

Some common ones:

| Name                                                  | ID         | Language             |
| ----------------------------------------------------- | ---------- | -------------------- |
| Accessible Ancients Bible                             | `AAB`      | English              |
| Berean Standard Bible                                 | `BSB`      | English              |
| King James (Authorized) Version                       | `eng_kjv`  | English              |
| King James Version + Apocrypha                        | `eng_kja`  | English              |
| New American Standard Bible 1995                      | `NASB95`   | English              |
| New American Standard Bible 2020                      | `NASB2020` | English              |
| Amplified Bible                                       | `AMP`      | English              |
| New Arabic Version                                    | `ARBNAV`   | Arabic               |
| Biblica® Open Nueva Biblia Viva 2008                  | `spa_onbv` | Spanish              |
| Mandarin Chinese Open Contemporary Bible (Simplified) | `cmn_cbs`  | Chinese (Simplified) |
| Hindi Indian Revised Version Bible                    | `HINIRV`   | Hindi                |
| French Ostervald Bible                                | `fra_ost`  | French               |

For the full list of 1,000+ translations, open this address from the [Free Use Bible API](https://bible.helloao.org). It returns the list as JSON (a structured text format that code can read):

```
GET https://bible.helloao.org/api/available_translations.json
```

Use each entry's `id` field as the `translation=` value. To match what a person asked for ("the Russian Bible", "KJV"), compare against `englishName` and `languageEnglishName`.

`NASB95`, `NASB2020` and `AMP` are licensed from the Lockman Foundation, so they aren't in the Free Use Bible API's list. Use the IDs above directly.

### Default translation for each language

When a link has no `translation`, Seed Bible uses the default for the reader's interface language (from `lang`, or else their browser):

| Language (code)    | Translation ID | Translation name                                          |
| ------------------ | -------------- | --------------------------------------------------------- |
| English (`en`)     | `AAB`          | Accessible Ancients Bible                                 |
| Spanish (`es`)     | `spa_onbv`     | Biblica® Open Nueva Biblia Viva 2008                      |
| Amharic (`am`)     | `amh_amh`      | Amharic NT                                                |
| Arabic (`ar`)      | `ARBNAV`       | New Arabic Version (Book of Life)                         |
| Bengali (`bn`)     | `ben_ocv`      | Open Bengali Contemporary Version Bible                   |
| Persian (`fa`)     | `pes_opcb`     | Biblica® Open Persian Contemporary Bible 2022             |
| French (`fr`)      | `fra_ncl`      | French néo-Crampon Libre                                  |
| Hindi (`hi`)       | `hin_cvb`      | Hindi Contemporary Version Bible                          |
| Indonesian (`ind`) | `ind_ayt`      | Indonesian AYT Bible                                      |
| Japanese (`ja`)    | `jpn_loc`      | New Japanese NT                                           |
| Korean (`ko`)      | `kor_old`      | Korean Bible 1910                                         |
| Nepali (`ne`)      | `npi_ncb`      | Nepali Contemporary Bible                                 |
| Portuguese (`pt`)  | `por_onbv`     | Biblica® Open Nova Bíblia Viva 2007                       |
| Russian (`ru`)     | `rus_syn`      | Russian Synodal Bible                                     |
| Swahili (`sw`)     | `swh_onmm`     | Biblica® Toleo Wazi Neno: Maandiko Matakatifu             |
| Turkish (`tr`)     | `tur_ytc`      | Turkish TVR Bible                                         |
| Uyghur (`ug`)      | `uig_ara`      | Uyghur Bible (Arabic script)                              |
| Ukrainian (`uk`)   | `ukr_ufb`      | Ukrainian Freedom Bible                                   |
| Urdu (`ur`)        | `urd_oucv`     | Urdu: Biblica® آزادانہ اردو ہم عصر ترجمہ (Bible)          |
| Vietnamese (`vi`)  | `vie_vcb`      | Vietnamese Contemporary Bible                             |
| Chinese (`zh`)     | `cmn_cbt`      | Chinese, Mandarin: Biblica® 聖經,當代譯本開放資源 (Bible) |

Any other language falls back to `AAB`.

<!-- Maintainers: this table mirrors DEFAULT_TRANSLATIONS_BY_LANGUAGE in packages/seed-bible/seed-bible/managers/BibleReadingManager.tsx. Update both together. -->

### Example links

| What it opens                   | Link                                                                    |
| ------------------------------- | ----------------------------------------------------------------------- |
| John 3 in the BSB               | https://seedbible.org/?translation=BSB&book=JHN&chapter=3               |
| Esther 1 in the KJV             | https://seedbible.org/?translation=eng_kjv&book=EST&chapter=1           |
| Jude, Arabic interface          | https://seedbible.org/?book=JUD&lang=ar                                 |
| Psalm 23 in Spanish             | https://seedbible.org/?book=PSA&chapter=23&lang=es                      |
| John 3:16 in Spanish            | https://seedbible.org/?translation=spa_onbv&book=JHN&chapter=3&verse=16 |
| Psalm 23:1–6, Spanish interface | https://seedbible.org/?lang=es&book=PSA&chapter=23&verse=1-6            |
| Romans 8:28, 31 and 38          | https://seedbible.org/?book=ROM&chapter=8&verse=28,31,38                |
| Genesis 1, dark theme           | https://seedbible.org/?book=GEN&chapter=1&app.themeId=dark              |

## Part 2: Embedding Seed Bible in your site

Add `embed=minimal` to any link and put it in an `<iframe>`. The reader then shows a compact layout suited to a box inside another page, with an "Open in new tab" button that takes the visitor to the full app at the same chapter.

```html
<iframe
  src="https://seedbible.org/?book=JHN&chapter=3&embed=minimal&app.themeId=light"
  title="John 3 on Seed Bible"
  width="100%"
  height="600"
  style="border: 0"
></iframe>
```

Set `app.themeId` to match your site; without it the embed follows the visitor's device.

## Part 3: AI system prompts

### General assistant

Paste this into the system prompt of an AI assistant so it hands out Seed Bible links.

```text
You are a helpful assistant. When relevant, you generate Seed Bible links so
users can read Scripture directly.

---

GENERATING LINKS

Base URL: https://seedbible.org/?

Append parameters as needed, joined with &:
  book=        USFM book code (e.g. GEN, PSA, JHN, ROM, REV)
  chapter=     Chapter number (e.g. 1, 23, 119)
  verse=       Verse, range, or list (e.g. 16, 3-7, 3,5,7)
  translation= Translation ID (see sources below)
  lang=        UI language code (e.g. en, es, ar, fr, zh)

Rules:
- Only include parameters the user has specified or that you can confidently infer.
- Do not guess a translation if unspecified. Omit translation= and the app uses its default.
- Do not guess a language if unknown. Omit lang=.
- USFM book codes are always 3-letter uppercase: GEN, not Genesis.
- Present the link clearly so the user can tap or click it.

---

TRANSLATION IDs: TWO SOURCES

1. Free Use Bible API (primary, 1,000+ translations)
   GET https://bible.helloao.org/api/available_translations.json
   Use the `id` field as the translation= value.
   Match user requests using `englishName` and `languageEnglishName`.
   Always query this endpoint rather than assuming IDs from memory.

2. Lockman Foundation translations (licensed; not in the Free Use Bible API)
   NASB95   - New American Standard Bible (1995)
   NASB2020 - New American Standard Bible (2020)
   AMP      - Amplified Bible
   Use these IDs directly when the user requests them by name or abbreviation.

---

WHEN TO OFFER A LINK

1. The user asks for a Bible, or says they want to read or explore the text.

2. A specific passage has been the sustained focus of the conversation. If the
   user has been studying or discussing a particular chapter at length, offer
   the link naturally toward the end of your reply. Keep it light: "Here's a
   link to John 2 if you'd like to read it directly." Do not offer links for
   every passage mentioned in passing, only when a chapter has been the clear
   center of the conversation.

3. At the natural close of a conversation. If the user signals they are
   wrapping up ("thanks", "that's all I needed", "got it") and a specific
   passage was central to the exchange, offer the link as a send-off: "Glad I
   could help. Here's a link to Romans 8 if you'd like to read further on
   your own."

In all cases, match the link to the chapter being discussed. If the user's UI
language or preferred translation is known from context, include those
parameters.

---

EXAMPLES

- "Open Genesis 1 in English with KJV"
  -> https://seedbible.org/?book=GEN&chapter=1&translation=eng_kjv&lang=en

- "Arabic reading of Genesis 15"
  -> https://seedbible.org/?book=GEN&chapter=15&lang=ar

- "Psalm 23 in the Amplified Bible"
  -> https://seedbible.org/?book=PSA&chapter=23&translation=AMP

- "Romans 8 in the NASB"
  -> https://seedbible.org/?book=ROM&chapter=8&translation=NASB2020

- Close of a conversation centered on John 2:
  "Glad I could help. Here's a link to John 2 if you'd like to read further
  on your own: https://seedbible.org/?book=JHN&chapter=2"

- "Just open the Bible"
  -> https://seedbible.org/
```

### Apologist agents

For an agent built on Apologist, add this under the "Scripture" heading of the agent's instructions (Agent → Behavior → Instructions). The `autoinstall-ext_Apologist=true` part of the link turns on Seed Bible's Apologist extension (an optional add-on) for the reader when they open it.

```text
When you cite scripture, include markdown-formatted links to
`https://seedbible.org/?autoinstall-ext_Apologist=true` with these additional
query parameters:

- `book` - The three-letter USFM book code to link to (GEN, EXO, etc.)
- `chapter` - The number of the chapter to link to.
- `verse` - The verse or range of verses to link to (e.g. 5, 4-6)
```

## Branding

Seed Bible's logos and other branding assets are in [this shared folder](https://drive.google.com/drive/folders/17Omctu_aCJGNAm8mIRT-OmslGy9Yoe7E?usp=sharing).

Your ministry doesn't have to use the Seed Bible brand. If you'd like a white-label version under your own name, get in touch and we're happy to talk about it.
