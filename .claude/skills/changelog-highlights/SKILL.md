---
name: changelog-highlights
description: Pick the 2-4 biggest changes in the upcoming release and write a "🌟 Highlights" section at the top of its CHANGELOG.md section, with a short plain-language intro for each and a placeholder describing the GIF or screenshot to capture. Runs separately from changelog-update. Doesn't commit.
---

Write a `### 🌟 Highlights` section for the upcoming release in CHANGELOG.md. It picks the few changes most worth showing off, gives each a title and a sentence or two, and leaves a placeholder for a GIF or screenshot that a person captures and uploads afterwards.

## Who the highlights are for

The release notes go to the GitHub release page, the CHANGELOG.md page the About screen links to, and the Discord #announcements channel. Highlights are the part people actually read: Seed Bible users, churches and ministries, and supporters, most of whom aren't developers.

- **Plain language.** No code names (managers, components, settings keys, URL parameters, file paths). Name things the way the UI does.
- **Lead with what people get**, not what we built ("Bookmarks are back", not "Bookmark records rework").
- **Short.** A title and one to three sentences. The detailed bullets further down are the full record, so the highlight doesn't repeat every detail.
- **No PR or issue links** in highlights. The bullets below already carry them.
- Avoid em dashes; use a semicolon or a second short sentence instead.

## Steps

1. **Pick the target section.** By default this is `## TBD`. If the user passes a version (e.g. `1.13.0`), use `## v1.13.0 …` instead, but only if it hasn't been released yet: check that `git tag --list v1.13.0` prints nothing. Never add highlights to a released version. If the target section has no entries yet, stop and suggest running `/changelog-update` first.

2. **Read the target section** in full: its ✨ Added, 🔧 Changed, 🐛 Fixed and 🗑️ Removed bullets and their sub-bullets. These are the candidates. When a bullet alone doesn't make the user-facing effect clear, read its PR (`gh pr view <n> --json title,body`). This is read-only; never comment on or edit anything on GitHub.

3. **Rank the candidates.** A good highlight is:
   - **Something a user notices**, usually a new capability (Added) or a clear change to something they use often (Changed). Fixes rarely qualify, unless a long-standing, widely felt problem is gone.
   - **Visual.** It can be shown in a short GIF or a screenshot. A change that can't be shown can still be a highlight if it matters a lot, but prefer ones that can.
   - **For users, not developers.** Extension APIs, settings formats and other developer-facing work aren't highlights.

   Aim for 2-4 highlights. Fewer is fine for a small release; more than 4 and nothing stands out.

4. **Ask the user to choose.** Present the ranked candidates with `AskUserQuestion` (multi-select), each with a one-line reason it would make a good highlight, with your recommended picks first. If the section already has a `### 🌟 Highlights` section, say which ones are already there and only offer the others. Don't write anything until the user has picked.

5. **Write each highlight** in this shape:

   ```markdown
   ### 🌟 Highlights

   #### Bookmarks are back

   ![TODO-HIGHLIGHT-MEDIA: GIF, phone width. Crop to the chapter header and bookmark button. Tap the button, tap "My bookmark", then Save; the outline icon fills in with the bookmark's color.](TODO)

   Mark your place with up to five named, colored bookmarks, and move one to the chapter you're reading with a single tap. They show on your tabs, the Today screen and a new Bookmarks panel.
   ```

   - **Title:** a short phrase naming what people get, as a `#### ` heading.
   - **Media placeholder:** one per highlight, above the text. Use exactly the `TODO-HIGHLIGHT-MEDIA` marker and `(TODO)` URL shown, so leftover placeholders are easy to find with a search. Inside the alt text, write a shot list someone can follow without reading the code:
     - **GIF or screenshot.** Use a GIF when the point is something moving or a sequence of taps; a screenshot when one still picture says it.
     - **Phone width or desktop**, whichever the feature is mainly used on.
     - **What to crop to.** Crop to the feature itself (the button, panel or bar), not the whole window, so the eye goes straight to it.
     - **The steps to record**, in order, and what the viewer should see change.
   - **Text:** one to three plain sentences on what it is and why it's useful, below the media.

   Put the section first in the target section, directly under the `## ` heading and above `### ✨ Added`. If a Highlights section already exists, add new highlights to it and leave the existing ones alone, including any placeholder that has already been replaced with a real image.

6. **Don't change anything else.** Leave the Added, Changed, Fixed and Removed bullets exactly as they are; a highlight repeats the headline of a bullet, it doesn't replace it.

7. **Finish with a capture checklist** for the user: one line per new highlight with its title and what to capture, then these instructions for adding the media:
   - Record GIFs, not MP4s, so they display everywhere the notes go. Keep each one a few seconds long and under 5 MB (GitHub's limit is 10 MB).
   - To get a link, drag the GIF into any comment box on a GitHub issue or PR in this repo. GitHub uploads it straight away and inserts an `<img … src="https://github.com/user-attachments/assets/…">` tag. Copy the `src` URL; the comment doesn't need to be posted.
   - Replace `(TODO)` with the URL, and replace the `TODO-HIGHLIGHT-MEDIA: …` alt text with a short description of what the picture shows, for people using screen readers.
   - The first highlight's image is also the picture on the Discord announcement, so put the most eye-catching highlight first.
   - Search CHANGELOG.md for `TODO-HIGHLIGHT-MEDIA` before releasing; none should be left.

Don't commit.
