# How we review code

Shared by everything that reviews code on this repository: the `routine-pr-code-review` skill (unattended; posts the review on the PR) and the `reviewer` subagent (local; returns the review to whoever asked). They follow this guide for what to read, what to check, and how to write the review, so every review is done the same way. Each one says for itself what it's reviewing, where that code is, what goes at the top of the review, and what happens to the review afterwards. Where this guide says "the caller", it means that skill or agent.

Every GitHub command here is a `gh api` REST call that names `HelloAOLab/seed-bible`, so it works both inside a routine (see `.claude/skills/routine-pr-review/GITHUB.md`) and locally.

## 1. Gather context

Read all of this before judging the code:

- **The PR conversation**, when there is a PR: its description, its comments (`gh api repos/HelloAOLab/seed-bible/issues/<n>/comments --paginate`), its inline code comments (`gh api repos/HelloAOLab/seed-bible/pulls/<n>/comments --paginate`) and its review summaries (`gh api repos/HelloAOLab/seed-bible/pulls/<n>/reviews --paginate`).
- **Linked issues:** issues the PR body refers to (`Fixes`/`Closes`/`Resolves` and plain references), plus issues linked in the PR's timeline (`gh api repos/HelloAOLab/seed-bible/issues/<n>/timeline --paginate --jq '.[] | select(.event == "connected" or .event == "cross-referenced")'`). With no PR, look for an issue number in the branch name and commit messages. Read each issue and its comments (`gh api repos/HelloAOLab/seed-bible/issues/<m>` and `.../issues/<m>/comments --paginate`). They say what the change is supposed to do.

Use the conversation to learn what's already been discussed or decided. Don't re-raise something the thread settled. If you still think a settled point is a real problem, say so once, acknowledge the earlier decision, and explain what's new.

**Follow-up reviews.** When the caller has found an earlier review of this PR, this run is a follow-up. Read the newest earlier review and the commit it recorded. Review the whole change again, but open with a "Since the last review" list saying which earlier findings are fixed, still open, or no longer apply, and point out what changed since that commit (`git diff <old sha>..<head sha>` where the code is, fetching the old commit first if needed). An earlier review that doesn't record a commit can only be compared by its findings.

## 2. Review

Read whole files where the code is, not just diff hunks.

**Do your own full review first, without looking at the manual test plan.** The review has to stand on its own; the plan check below adds to it, never replaces it.

Run the `code-review` skill on the target the caller gives you for the bug hunt. Don't use its `--comment` or `--fix` options: a review never posts inline comments or changes the code.

Then add what that pass doesn't cover:

- **Does the change deliver what the linked issues ask for?** Call out anything missing, or anything that behaves differently from what was asked.
- **Repo conventions** in `CLAUDE.md`: signals instead of hooks for state, CasualOS access only through `OsManager`, translation keys added only to `en.json`, `ThemeManager` overriding `--sb-*` CSS variables, built-in extensions never depending on each other, no `any`, comments that explain _why_ rather than narrate, and so on.
- **Tests.** We want tests that check real-world behavior and can fail. For each new or changed test, check it against the testing rules in `CLAUDE.md`: does it assert something a user or caller would see, mock only at the `OsManager`/CasualOS boundary, cover error paths and edge cases, and avoid fixed-time sleeps? Flag tests that would pass no matter what the code does (assertions on mocks, missing `await`, conditions that are always true, a `try` that swallows the failure). Point out important behavior in the change that has no test.
- **Run the tests when the environment allows it.** If `pnpm install` works where the code is, run the changed and added test files with `pnpm vitest run <file>`. For a test that claims to guard against a bug, check that it really fails without the fix: temporarily restore the base version of the non-test files (`git checkout origin/<base> -- <files>`), run the test, confirm it fails, then put the change's version back (`git checkout HEAD -- <files>`). Do this only in a folder the caller has set aside for it, never in a checkout someone is working in. Say in the review what you ran and what happened. If you couldn't run them, say so; never imply tests were run when they weren't.

**Last, check the code against the manual test plan**, as an extra pass on top of everything above. Plans exist only for PRs. Use the plan file the caller points you to, or read it from GitHub: `gh api repos/HelloAOLab/pr-test-plans/contents/plans/seed-bible/<n>/<short head commit>.json -H "Accept: application/vnd.github.raw"` (a 404 means there's no plan for this commit).

- For each test, trace through the code whether a tester following its steps would really see what it expects. A test the code won't pass is a finding: name the test ("T4 expects …") and show where the code goes another way.
- Notice what the plan's user's-eye view brings up that your own review missed, like an empty state, a signed-out path, an error message, or a phone-width layout nobody handled.
- Merge these into your findings; don't list them separately.
- If there's no plan for this commit (none was needed, writing it failed, or there's no PR), skip this pass and say so in one line under Summary.

Before writing a finding up, confirm it by re-reading the code it depends on. Drop findings you can't support. If something might be a problem but you can't tell, ask it as a question instead of stating it as a bug.

## 3. Write the review

Follow the writing style in `CLAUDE.md`: plain language, short answer first, and explain why each problem matters. Use this shape, starting with the header the caller gives you:

```markdown
<header from the caller>

## Summary

<2–4 sentences: what the change does, whether it delivers what the linked issue asks for, and the overall verdict: ready to merge, needs changes, or needs discussion.>

## Since the last review

<Follow-up reviews only: each earlier finding marked fixed, still open, or no longer applies.>

## Findings

### 🔴 Critical

### 🟠 High

### 🟡 Medium

### 🔵 Low

## Tests

<What the tests cover, which ones are weak or can't fail, what's missing, and what you ran and what happened.>
```

- Severity guide. **Critical**: data loss, security hole, crash, or a main flow broken for most users. **High**: a real bug users will hit, or the change doesn't do what the issue asks. **Medium**: edge-case bugs, missing error handling, weak tests for important behavior. **Low**: small cleanups and nits. Leave out empty severity headings. If there are no findings, say so plainly.
- Number findings in one sequence across all severities, written as **No. 1**, **No. 2**, and so on, so people can refer to them in replies.
- Each finding has:
  - A short title, with the file and line (`path/to/file.tsx:42`).
  - What's wrong and why it matters, in plain words.
  - **Steps to reproduce**, numbered, written so a human developer can see the problem in the app or a test. Include these only when the problem can actually be reproduced; don't invent steps for a theoretical issue.
  - **Suggested fix**: concrete, with a short code snippet when that's clearer than prose.

**Gotchas**

- GitHub turns `#` followed by a number into a link to that issue or PR. To refer to a list item or finding, write "No. 1", never "#1".
- A GitHub comment can be at most 65,536 characters. If the review would be longer, shorten the Low findings first.
