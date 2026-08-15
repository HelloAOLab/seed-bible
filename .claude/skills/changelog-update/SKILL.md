Update the `TBD` section of CHANGELOG.md with changes made on the current branch that aren't reflected there yet. Only ever touch the `TBD` section — never edit an already-released version's section.

1. Determine the base commit to diff against:
   - If the current branch is `develop` (the repo's main branch), use the latest release tag as the base: `git describe --tags --abbrev=0`.
   - Otherwise, use where the branch diverged from `develop`: `git merge-base HEAD develop` (fall back to `origin/develop` if there's no local `develop`).

2. List the real work commits since that base, ignoring merge bubbles:
   `git log <base>..HEAD --no-merges --format='%h %s'`
   Skip anything that isn't a user-facing product change — version-bump chores, changelog-only edits, CI/workflow/build/dev-tooling changes, docs, formatting, and test-only commits. When a commit subject alone doesn't make the user-facing effect clear, read more: `git show <hash>` or `git diff <base>..HEAD --stat`.

3. Find the PR number each surviving commit came in through, since entries should cite it:
   - List PR merges in range: `git log <base>..HEAD --first-parent --merges --format='%H %s'`, and match subjects like `Merge pull request #1497 from ...` to capture the number.
   - For each such merge commit `M`, the commits it introduced are `git rev-list M^1..M^2`. Map any of those hashes that appear in your step-2 list to that PR number.
   - A commit that isn't covered by any PR merge (e.g. committed straight to the base branch) simply gets no PR reference — don't guess one.
   - If a consolidated bullet (step 5) draws on commits from more than one PR, keep all of their numbers.

4. Read the current `## TBD` section in CHANGELOG.md and its four subheadings: ✨ Added, 🔧 Changed, 🐛 Fixed, 🗑️ Removed.

5. For each real change found in step 2, check whether it's already represented by an existing TBD bullet (in substance, not exact wording) — skip anything already covered. Consolidate multiple commits that make up one logical change into a single bullet.

6. Write a bullet for each missing change under the correct subheading, matching the existing style exactly (the released version sections below TBD are the style reference):
   - Start with an imperative verb ("Add", "Fix", "Change", "Remove", "Show", "Gate", …).
   - One concise, user-facing sentence ending in a period — describe the visible behavior, not the implementation.
   - Use "X instead of Y" phrasing when a change replaces prior behavior, to make the before/after concrete.
   - End the bullet with its PR reference(s) from step 3, placed after the sentence's period, as a markdown link to the actual GitHub PR — not a bare number: `([#1497](https://github.com/HelloAOLab/seed-bible/pull/1497))` (or `([#1497](https://github.com/HelloAOLab/seed-bible/pull/1497), [#1500](https://github.com/HelloAOLab/seed-bible/pull/1500))` for a consolidated bullet). Get the org/repo for the URL from `git remote get-url origin` rather than hardcoding it. Omit the reference entirely if no PR number was found — don't invent one.
   - Categorize like Keep a Changelog: Added = new capability, Changed = existing behavior changed, Fixed = bug fix, Removed = capability taken away. Don't let a commit's `feat:`/`fix:` prefix override your judgment if the actual change reads differently — e.g. a `feat:` commit that alters existing behavior is Changed, not Added.
   - Avoid using em dashes.

7. Leave subheadings with no new entries empty (don't delete them, don't write "no changes"). Don't rewrite a subheading's existing bullets — only add to them (unless an existing bullet is missing a PR reference you can now fill in).

8. Summarize for the user what was added and under which subheadings before finishing.
