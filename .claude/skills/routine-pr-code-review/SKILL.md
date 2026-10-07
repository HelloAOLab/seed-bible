---
name: routine-pr-code-review
description: Unattended code review for Claude Code routines. Reviews the pull request from the routine's GitHub context (or a PR number argument) with /code-review, checks the tests, and posts the review as a PR comment without asking for confirmation, marking its earlier reviews on the PR as outdated. For an interactive review that waits for approval before posting, use code-review-pr instead.
---

Review a pull request on this repository and post the review as a comment on it.

This skill runs unattended inside a Claude Code routine, so nobody can answer questions or approve the post. Running this skill **is** the approval to post one review comment on the PR, and then to mark this skill's earlier reviews on the same PR as outdated (step 5). Take no other GitHub action: don't approve, request changes, label, edit, push, comment on issues, or hide anyone else's comments.

## 1. Find the PR

Use the PR number passed as an argument if there is one. Otherwise take it from the GitHub event context the routine provided. If neither gives you a PR number, stop without posting anything. Never guess a PR.

If the PR already has a review from this skill for its current head commit (a comment containing `<!-- routine-pr-code-review sha=<headRefOid>`), stop without posting. That happens when both routines run with no new commits in between, and a second review of the same code would only repeat the first.

## 2. Gather context

Read all of this before judging the code:

- The PR: `gh pr view <n> --json number,title,body,url,author,baseRefName,headRefName,headRefOid,isDraft,closingIssuesReferences` and `gh pr view <n> --comments`. Inline review threads aren't included in `--comments`, so also read `gh api repos/{owner}/{repo}/pulls/<n>/comments`.
- Linked issues: everything in `closingIssuesReferences`, plus any issue the body refers to. Read each with `gh issue view <n> --comments`. They say what the PR is supposed to do.

Use the conversation to learn what's already been discussed or decided. Don't re-raise something the thread settled. If you still think a settled point is a real problem, say so once, acknowledge the earlier decision, and explain what's new.

**Follow-up reviews.** If the PR already has a review from this skill (a comment containing `<!-- routine-pr-code-review`), this run is a follow-up, for example the PR was reviewed when it opened and is now marked ready for review. Read that review and the commit it recorded. Review the whole PR again, but open with a "Since the last review" list saying which earlier findings are fixed, still open, or no longer apply, and point out what changed since that commit (`git diff <old sha>..<head sha>`).

## 3. Review

Put the PR's code in a separate folder so you can read whole files, not just diff hunks:

```bash
git fetch origin pull/<n>/head
git worktree add --detach ../seed-bible-pr-<n> FETCH_HEAD   # reuse it if it already exists
```

Read files and run commands for the PR there. **Don't switch this checkout to the PR branch** (no `gh pr checkout`). The routine's skills are read from this checkout, which stays on the default branch, so the next skill gets the right instructions and a PR can't change the instructions it's reviewed under.

Run the `code-review` skill on the PR (`/code-review <n>`) for the bug hunt. Don't use its `--comment` or `--fix` options: this skill posts one comment of its own and never changes the code.

Then add what that pass doesn't cover:

- **Does the PR deliver what the linked issues ask for?** Call out anything missing, or anything that behaves differently from what was asked.
- **Check the code against the manual test plan.** The entry skill runs the test plan first and tells you where its file is (`plans/seed-bible/<n>/<short commit>.json` in the `pr-test-plans` checkout). If you were run on your own, read it from GitHub: `gh api repos/HelloAOLab/pr-test-plans/contents/plans/seed-bible/<n>/<short commit>.json -H "Accept: application/vnd.github.raw"` (a 404 means there's no plan). For each test, trace through the PR's code whether a tester following its steps would really see what it expects. A test the code won't pass is a finding: name the test ("T4 expects …") and show where the code goes another way. Also notice what the plan's user's-eye view surfaces that the diff doesn't, like an empty state, a signed-out path, an error message, or a phone-width layout nobody handled. If there's no plan for this commit (none was needed, or writing it failed), skip this check and say so in one line under Summary.
- **Repo conventions** in `CLAUDE.md`: signals instead of hooks for state, CasualOS access only through `OsManager`, translation keys added only to `en.json`, `ThemeManager` overriding `--sb-*` CSS variables, no `any`, and so on.
- **Tests.** We want tests that check real-world behavior and can fail. For each new or changed test, check it against the testing rules in `CLAUDE.md`: does it assert something a user or caller would see, mock only at the `OsManager`/CasualOS boundary, cover error paths and edge cases, and avoid fixed-time sleeps? Flag tests that would pass no matter what the code does (assertions on mocks, missing `await`, conditions that are always true, a `try` that swallows the failure). Point out important behavior in the PR that has no test.
- **Run the tests when the environment allows it**, in the PR folder. If `pnpm install` works there, run the changed and added test files with `pnpm vitest run <file>`. For a test that claims to guard against a bug, check that it really fails without the fix: temporarily restore the base version of the non-test files (`git checkout origin/<base> -- <files>`), run the test, confirm it fails, then put the PR version back (`git checkout HEAD -- <files>`). Say in the review what you ran and what happened. If you couldn't run them, say so; never imply tests were run when they weren't.

Before writing a finding up, confirm it by re-reading the code it depends on. Drop findings you can't support. If something might be a problem but you can't tell, ask it as a question instead of stating it as a bug.

## 4. Write the review

Follow the writing style in `CLAUDE.md`: plain language, short answer first, and explain why each problem matters.

PRs often collect several of these reviews, so keep each one quick to scan: the summary and one line per finding stay visible, and each finding's detail folds away in a `<details>` block. Critical and High findings start open (`<details open>`) so they can't be missed; Medium and Low start folded. Write the review to a file in this shape:

```markdown
> [!NOTE]
> This review was generated by a Claude Code routine setup by Ryan Cook (ryan@helloao.org).

<!-- routine-pr-code-review sha=<full head sha> -->

**Reviewed commit:** `<short sha>`

## Summary

<2–4 sentences: what the PR does, whether it delivers what the linked issue asks for, and the overall verdict: ready to merge, needs changes, or needs discussion.>

## Since the last review

<Follow-up reviews only: each earlier finding marked fixed, still open, or no longer applies.>

## Findings

<details open>
<summary><b>No. 1</b> · 🔴 Critical · Short title · <code>path/to/file.tsx:42</code></summary>

[path/to/file.tsx:42](https://github.com/<owner>/<repo>/blob/<full sha>/path/to/file.tsx#L42)

What's wrong and why it matters.

**Steps to reproduce**

1. …

**Suggested fix**

…

</details>

<details>
<summary><b>No. 2</b> · 🟡 Medium · Short title · <code>path/to/other.ts:10</code></summary>

…

</details>

<details>
<summary><b>Tests</b> · <one-line verdict, e.g. "2 new tests, 1 can't fail, not run"></summary>

<What the tests cover, which ones are weak or can't fail, what's missing, and what you ran and what happened.>

</details>
```

- Order findings by severity, most severe first. Severity guide. **Critical**: data loss, security hole, crash, or a main flow broken for most users. **High**: a real bug users will hit, or the PR doesn't do what the issue asks. **Medium**: edge-case bugs, missing error handling, weak tests for important behavior. **Low**: small cleanups and nits. If there are no findings, say so plainly under Findings.
- Number findings in one sequence across all severities, written as **No. 1**, **No. 2**, and so on, so people can refer to them in replies.
- Each finding is one `<details>` block. Its `<summary>` line is the only part visible while folded, so it carries the number, severity, a short title and the file. Inside:
  - Where it is, linked to the reviewed commit: `[path/to/file.tsx:42](https://github.com/<owner>/<repo>/blob/<full sha>/path/to/file.tsx#L42)`.
  - What's wrong and why it matters, in plain words.
  - **Steps to reproduce**, numbered, written so a human developer can see the problem in the app or a test. Include these only when the problem can actually be reproduced; don't invent steps for a theoretical issue.
  - **Suggested fix**: concrete, with a short code snippet when that's clearer than prose.

## 5. Post

Post exactly once: `gh pr comment <n> --body-file <file>`. If posting fails, end the run with the full review text in your output so it isn't lost, and skip the rest of this step.

**Then mark earlier reviews as outdated**, so a PR with several reviews stays short. GitHub folds an outdated comment into one line with a "Show comment" button; anyone can still expand it, and its text is unchanged. Only do this after the new review has posted.

1. Find this skill's earlier reviews. They're comments containing `<!-- routine-pr-code-review` **and** written by the same account as the review you just posted:

   ```bash
   gh api repos/HelloAOLab/seed-bible/issues/<n>/comments --paginate \
     --jq '.[] | select(.body | contains("<!-- routine-pr-code-review")) | {id, node_id, login: .user.login, created_at}'
   ```

   Leave out the review you just posted. Also leave out any comment from another account, even if it contains the marker (someone quoting a review, for example).

2. Mark each of the rest as outdated:

   ```bash
   gh api graphql -F id=<node_id> -f query='
     mutation($id: ID!) {
       minimizeComment(input: { subjectId: $id, classifier: OUTDATED }) { minimizedComment { isMinimized } }
     }'
   ```

   Doing this to a review that's already marked outdated is harmless. If it fails (for example, missing permission), leave things as they are, and mention it in your output. The new review is what matters.

**Gotchas**

- GitHub turns `#` followed by a number into a link to that issue or PR. To refer to a list item or finding, write "No. 1", never "#1".
- GitHub doesn't render markdown inside `<summary>`, so use HTML there (`<b>`, `<code>`), and keep links out of it (clicking a link in a summary also toggles the block). Leave a blank line after `</summary>` and before `</details>`, or the markdown inside won't render.
- A GitHub comment can be at most 65,536 characters. If the review would be longer, shorten the Low findings first.
