Update the `TBD` section of CHANGELOG.md with changes made on the current branch that aren't reflected there yet. Only ever touch the `TBD` section — never edit an already-released version's section.

1. Determine the base commit to diff against:
   - If the current branch is `develop` (the repo's main branch), use the newest release tag as the base: `git tag --list 'v[0-9]*' --sort=-v:refname | head -1`. Don't use `git describe --tags`: release tags sit on the release merge into the production branch, which isn't part of `develop`'s history, so `describe` silently returns an older tag. `<tag>..HEAD` still gives the right range, because git stops at the point where the two branches split. Sanity-check that the tag matches the newest `## vX.Y.Z` heading in CHANGELOG.md.
   - Otherwise, use where the branch diverged from `develop`: `git merge-base HEAD develop` (fall back to `origin/develop` if there's no local `develop`).

2. List the real work commits since that base, ignoring merge bubbles:
   `git log <base>..HEAD --no-merges --format='%h %s'`
   Skip anything that isn't a user-facing product change — version-bump chores, changelog-only edits, CI/workflow/build/dev-tooling changes, docs, formatting, refactors, and test-only commits. Also skip bugs that were both introduced and fixed inside the range (e.g. a follow-up fix to a feature that is itself new since the base), since no user of the base release ever saw them.
   When a commit subject alone doesn't make the user-facing effect clear, read more:
   - The PR description and any issue it closes: `gh pr view <n> --json title,body` and `gh issue view <n> --json title,body`. These are read-only; never comment on or edit anything on GitHub.
   - The commit itself: `git show <hash>` or `git diff <base>..HEAD --stat`.
   - Changelog entries a PR branch drafted for itself, which are sometimes lost when branches merge: `git show <merge>^2:CHANGELOG.md`. Treat these as source material to verify and shorten, not as final copy.

3. Find the PR number each surviving commit came in through, since entries should cite it:
   - List PR merges in range: `git log <base>..HEAD --first-parent --merges --format='%H %s'`, and match subjects like `Merge pull request #1497 from ...` to capture the number.
   - For each such merge commit `M`, the commits it introduced are `git rev-list M^1..M^2`. Map any of those hashes that appear in your step-2 list to that PR number.
   - A commit that isn't covered by any PR merge (e.g. committed straight to the base branch) simply gets no PR reference — don't guess one.
   - If a consolidated bullet (step 5) draws on commits from more than one PR, keep all of their numbers.
   - Cite the PR, not the issue it closes.

4. Read the current `## TBD` section in CHANGELOG.md and its four subheadings: ✨ Added, 🔧 Changed, 🐛 Fixed, 🗑️ Removed.

5. For each real change found in step 2, check whether it's already represented by an existing TBD bullet (in substance, not exact wording) — skip anything already covered. Consolidate multiple commits that make up one logical change into a single bullet. Judge every change against what a user of the base release actually saw:
   - A feature that is entirely new since the base gets one Added bullet. Follow-up tweaks and fixes to it fold into that bullet or its sub-bullets, not into Changed or Fixed.
   - Before writing "X instead of Y", confirm Y really was the old behavior by looking at the base: `git show <base>:<path>`. PR descriptions often describe the state partway through the branch rather than the released one.

6. Write a bullet for each missing change under the correct subheading. The style reference is this step and the example below, not the older released sections, some of which have paragraph-long bullets; don't copy their length.
   - Start with an imperative verb ("Add", "Fix", "Change", "Remove", "Show", "Gate", …).
   - Keep each bullet to one short, user-facing sentence ending in a period. Describe the visible behavior, not the implementation, and name things the way the UI does. Leave root causes and reasoning to the PR description.
   - When a change genuinely needs more explanation, keep the top bullet short and put the detail in indented sub-bullets: two-space indent, one short sentence each, usually no more than three. Most bullets need no sub-bullets.
   - Use "X instead of Y" phrasing when a change replaces prior behavior, to make the before/after concrete.
   - End the top-level bullet with its PR reference(s) from step 3, placed after the sentence's period, as a markdown link to the actual GitHub PR — not a bare number: `([#1497](https://github.com/HelloAOLab/seed-bible/pull/1497))` (or `([#1497](https://github.com/HelloAOLab/seed-bible/pull/1497), [#1500](https://github.com/HelloAOLab/seed-bible/pull/1500))` for a consolidated bullet). Sub-bullets get no reference. Get the org/repo for the URL from `git remote get-url origin` rather than hardcoding it. Omit the reference entirely if no PR number was found — don't invent one.
   - Categorize like Keep a Changelog: Added = new capability, Changed = existing behavior changed, Fixed = bug fix, Removed = capability taken away. Don't let a commit's `feat:`/`fix:` prefix override your judgment if the actual change reads differently — e.g. a `feat:` commit that alters existing behavior is Changed, not Added.
   - Avoid using em dashes; use a semicolon or a second short sentence instead.

   Example of the target style:

   ```markdown
   ### ✨ Added

   - Add a profile screen for managing your content, opened from the new "You" tab on mobile or the avatar at the bottom of the sidebar on desktop. ([#1721](https://github.com/HelloAOLab/seed-bible/pull/1721))
     - Shows your picture, email, location and description, which you can change from an Edit profile screen.
     - "Your content" lists your notes, highlights, saves and playlists, searchable by reference or by highlighted verse text.
   - Save a note with Cmd+Enter on Mac or Ctrl+Enter on Windows and Linux, while Enter still starts a new line. ([#1789](https://github.com/HelloAOLab/seed-bible/pull/1789))

   ### 🔧 Changed

   - Open a saved passage's folders for editing when you press its save button again, instead of removing the save. ([#1763](https://github.com/HelloAOLab/seed-bible/pull/1763))

   ### 🐛 Fixed

   - Fix floating panes appearing behind the toolbar. ([#1801](https://github.com/HelloAOLab/seed-bible/pull/1801))
   ```

7. Leave subheadings with no new entries empty (don't delete them, don't write "no changes"). Don't rewrite a subheading's existing bullets — only add to them (unless an existing bullet is missing a PR reference you can now fill in).

8. Summarize for the user what was added and under which subheadings before finishing. Call out the judgment calls: changes skipped or folded into another bullet, branch-drafted entries that were dropped, and borderline entries (such as developer-facing extension APIs) the user may want to remove.
