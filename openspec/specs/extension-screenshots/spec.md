# extension-screenshots Specification

## Purpose

Lets people see an extension in action before installing it, through a set of screenshots with optional translated captions on the extension's page.

## Requirements

### Requirement: Extensions can declare screenshots

An extension's `extension.json` SHALL accept an optional `screenshots` list of up to 8 entries, kept in the order given. Each entry SHALL be an object with:

- `src`: an image file in the extension's project, or, for link-installed extensions only, a full `https:` link.
- `caption` (optional): a translation key whose English text is defined in the manifest's `translations.en`.

A screenshot file SHALL be `.png`, `.webp`, `.jpg` or `.jpeg`, and smaller than 1 MB. This SHALL apply to built-in and link-installed extensions alike.

#### Scenario: Built-in extension with captioned screenshots

- **WHEN** a built-in extension declares two screenshots, and the first has `"caption": "screenshot-map"` with `translations.en["screenshot-map"]` set to "Tap a place to open its map"
- **THEN** its page shows both screenshots in that order, and the first is captioned "Tap a place to open its map"

#### Scenario: No screenshots declared

- **WHEN** an extension's manifest has no `screenshots` field, or an empty list
- **THEN** its page shows no screenshots section

### Requirement: Invalid built-in screenshots fail the build

The app build SHALL fail when a built-in extension's `screenshots` field breaks any of these rules:

- it isn't a list;
- it has more than 8 entries;
- an entry names a missing file, an unsupported type, or a file of 1 MB or more;
- an entry's caption key has no English text.

The error message SHALL name the extension, the entry and the reason.

#### Scenario: Caption key without English text

- **WHEN** a built-in extension's screenshot has `"caption": "screenshot-map"` and `translations.en` has no `screenshot-map`
- **THEN** the build stops with an error naming the extension and the missing key

#### Scenario: Too many screenshots

- **WHEN** a built-in extension declares 9 screenshots
- **THEN** the build stops with an error giving the limit of 8

### Requirement: Link-installed extensions' screenshots are checked, packaged and published

`seed-bible-extension-scripts` SHALL handle each screenshot file the way it already handles the icon:

- `check` SHALL report every rule from the requirement above that a screenshot breaks, and SHALL exit with status 1.
- `dev` SHALL serve each screenshot so the app can load it from the development server.
- `package` SHALL copy each screenshot next to the bundle, under a name derived from its contents, and SHALL point the set's manifest at those copies.
- `publish` SHALL upload each screenshot and SHALL replace its `src` with the uploaded link.

A `src` that is already an `https:` link SHALL be published as it is.

#### Scenario: Check reports an oversized screenshot

- **WHEN** a project's `extension.json` names a 2 MB screenshot and the developer runs `check`
- **THEN** it prints a message giving the file, its size and the 1 MB limit, and exits with status 1

#### Scenario: Publish uploads screenshots

- **WHEN** a project with two screenshot files is published
- **THEN** the published set's manifest lists both screenshots, in the same order, as uploaded `https:` links, and keeps their captions

### Requirement: Fetched screenshot links are resolved and filtered

When Seed Bible loads a link-installed extension set, it SHALL resolve each screenshot `src` relative to the set's URL. It SHALL keep only screenshots whose resolved link is `https:` (or `http://localhost` while developing). If the `screenshots` field is malformed, Seed Bible SHALL drop that field without rejecting the extension.

#### Scenario: Relative screenshot path in a hosted set

- **WHEN** a set at `https://example.com/ext/set.json` lists a screenshot with `src` set to `./shot-1.png`
- **THEN** Seed Bible loads it from `https://example.com/ext/shot-1.png`

#### Scenario: Insecure screenshot link

- **WHEN** a fetched set lists a screenshot at `http://example.com/shot.png`
- **THEN** that screenshot isn't shown, the extension's other valid screenshots are, and the extension can still be installed

### Requirement: Screenshots appear on the extension's page

The About tab of an extension's page SHALL show its screenshots as a horizontally scrolling strip of thumbnails. The thumbnails SHALL share one height and keep their own aspect ratio, so portrait and landscape screenshots can sit side by side. This SHALL work whether or not the extension is installed, and in both the narrow and the wide page layouts. Captions SHALL appear in the user's language when the extension provides one, and in English otherwise. A screenshot whose image fails to load SHALL be left out of the strip and the viewer.

#### Scenario: Uninstalled built-in extension shows captions

- **WHEN** a user opens the page of a built-in extension they haven't installed, and its screenshots have captions
- **THEN** the strip shows the thumbnails, and each caption appears as the thumbnail's accessible name and in the viewer

#### Scenario: Caption falls back to English

- **WHEN** the app language is Spanish and the extension defines a caption only in English
- **THEN** the English caption is shown

#### Scenario: One screenshot fails to load

- **WHEN** one of three screenshot links responds with a 404
- **THEN** the strip shows the other two, and the viewer counts "1 of 2" and "2 of 2"

### Requirement: Full-size screenshot viewer

Selecting a thumbnail SHALL open a full-size viewer over the app, showing:

- that screenshot, scaled to fit the screen without cropping;
- its caption, if it has one;
- a position counter such as "2 of 5";
- previous and next buttons;
- a close button.

The viewer SHALL support all of the following:

- moving between screenshots with the buttons, the left and right arrow keys, and swiping left or right on touch screens;
- closing with the close button, the Escape key, or a click outside the image;
- keeping keyboard focus inside itself while it's open, and returning focus to the thumbnail that opened it when it closes.

In right-to-left languages, the arrow keys and swipe directions SHALL be mirrored.

The previous button SHALL be disabled on the first screenshot and the next button on the last; the viewer SHALL NOT wrap around. With a single screenshot, the previous and next controls SHALL be hidden.

#### Scenario: Open, step through and close with the keyboard

- **WHEN** a user focuses the second thumbnail, presses Enter, presses the right arrow key, then presses Escape
- **THEN** the viewer opens on screenshot 2 of N, moves to screenshot 3, closes, and focus returns to the second thumbnail

#### Scenario: Swipe to the next screenshot

- **WHEN** a user on a touch screen swipes left on the viewer's image in a left-to-right language
- **THEN** the viewer shows the next screenshot

#### Scenario: Last screenshot

- **WHEN** the viewer shows the last screenshot
- **THEN** the next button is disabled, and pressing the right arrow key does nothing

#### Scenario: Single screenshot

- **WHEN** an extension has exactly one screenshot and the user opens it
- **THEN** the viewer shows the image, its caption and the close button, with no previous/next controls
