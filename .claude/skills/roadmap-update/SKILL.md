---
name: roadmap-update
description: Bring ROADMAP.md up to date with the current state of the develop branch. Finds what was merged and which linked issues closed since the roadmap's "Last updated" date, then updates each item's status and text in the roadmap's plain-language, public-facing style. Doesn't commit.
---

Update ROADMAP.md so it matches what's on the `develop` branch today.

## Who the roadmap is for

ROADMAP.md is public. Its readers include people who aren't developers: the people who use Seed Bible, churches and ministries, and partners and supporters who want to understand where it's headed. Every edit has to stay readable for them:

- **Plain language.** No code names (managers, functions, flags, file paths, URL parameters, storage details). If a technical idea is needed to explain _why_ something is hard, say it in everyday words. Explain terms like customization, extension, CasualOS and MCP the first time they appear, as the roadmap already does.
- **Name things by what people get**, not by what we build ("Private by default", not "Public/private data split").
- **Be specific about gaps.** A title or sentence must not make an existing feature sound missing. For example, AI chat can already take actions with Apologist's AI, so the item is "Bonfire AI that can take action", not "An AI that can take action".
- **Keep the existing shape** of each item: heading, status line, a short paragraph on what it is and why it matters, then **Where it stands**, **What's next** and **Still deciding** as needed, ending with one `_On GitHub:_` line of links.

## Rules for what counts as done

- The roadmap reflects the **`develop` branch**, not production. Anything merged into `develop` is done, described in the present tense.
- **Never mention versions or releases.** No "v1.12.0", "shipped in", "next release" or "coming soon".
- The **Last updated** line is only the date: `_Last updated YYYY-MM-DD_`.
- The **Status** column and each item's status line use exactly these, with the key above the table:
  - ✅ Done (add "— more to come" when follow-ups are still listed)
  - 🚧 In progress (some of the item is done, or work is actively underway)
  - ⏳ Waiting on a partner (blocked on someone outside the team)
  - 💭 Planned (not started)

## Steps

1. **Get up to date.** Run `git fetch origin develop` and work against `origin/develop`. If the local checkout isn't `develop`, say so but still compare against `origin/develop`. Read all of ROADMAP.md, and note its "Last updated" date. That date is the baseline below.

2. **Find what changed since the baseline.**
   - PRs merged into develop: `git log origin/develop --first-parent --merges --since=<baseline> --format='%h %ad %s' --date=short`. Read each PR's description with `gh pr view <n> --json title,body,closingIssuesReferences`.
   - The `## TBD` and newest version sections of CHANGELOG.md are a quick, user-facing summary of the same work.
   - Match each PR to the roadmap item it advances, including PRs that don't reference an issue the roadmap links. For example, a PR adding MCP support counts toward the MCP item even if it closes no issue.
   - Skip work that doesn't touch any roadmap item. The roadmap isn't a changelog.

3. **Check every issue and PR the roadmap links.** For each `#NNNN` link, check its state with `gh issue view <n> --json number,title,state,closedAt` (fall back to `gh pr view <n> --json number,title,state,mergedAt`).
   - Closed by a merged PR: the work is done. Update the text accordingly.
   - Closed some other way (not planned, a duplicate, folded into other work): read the last comments to see why, and describe that honestly. Don't call it done.

4. **Look for new follow-ups.** List issues opened since the baseline: `gh issue list --state open --search "created:>=<baseline>" --json number,title`. Add any that clearly belong to an existing item to that item's "What's next" and its `_On GitHub:_` line.

5. **Verify claims that matter.** PR descriptions sometimes describe a plan rather than what merged. Before writing that something works, especially for organizations or privacy, confirm it in the code on `origin/develop`.

6. **Edit ROADMAP.md.**
   - Update each affected item's status, "Where it stands" and "What's next". Move finished work from "What's next" to "Where it stands" (or "What's done"). Drop finished points from "Still deciding" when they've been settled.
   - Update the status in both the item's status line and the at-a-glance table, and keep the "How the pieces fit together" section accurate.
   - Keep `_On GitHub:_` lines to the issues and PRs a curious reader would want: open work, plus the main PR or issue for work that's done.
   - If you change a heading, update its link in the table. GitHub builds the anchor from the heading in lowercase, with spaces turned into hyphens and punctuation dropped (e.g. `## 12. Bonfire AI that can take action` → `#12-bonfire-ai-that-can-take-action`).
   - Don't renumber, reorder, add or remove items on your own. Suggest those changes in the summary instead.
   - Leave the closing "Want to help?" section as it is. It isn't a roadmap item and doesn't change with the state of `develop`.
   - Set the "Last updated" line to today's date.
   - Format with `npx prettier --write ROADMAP.md`. Never run `pnpm format`; it rewrites the whole repo.

7. **Don't commit, and take no GitHub actions.** All `gh` calls in this skill are read-only. Never comment on, edit or close issues or PRs.

8. **Summarize for the user**, in plain language:
   - What changed, item by item, with the status changes.
   - Judgment calls: issues closed without clear resolution, claims you verified or couldn't verify, and PRs you matched to an item without an explicit link.
   - Suggestions you didn't act on: items that now look finished and could be removed or moved down, new work that might deserve its own item, and reordering that the new state suggests.
