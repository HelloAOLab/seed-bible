---
name: routine-pr-human-review-plan
description: Unattended skill for Claude Code routines. Writes a step-by-step manual test plan for a pull request, publishes it to the HelloAO Test Plans site (helloaolab.github.io/pr-test-plans) by committing the plan JSON to HelloAOLab/pr-test-plans, and keeps one test plan comment on the PR up to date with the link. Takes the PR from the routine's GitHub context or a PR number argument.
---

Write a manual test plan for a pull request on this repository, publish it on the HelloAO Test Plans site, and link to it from the PR's test plan comment.

The plan is for **people, not developers**. Assume the tester has never seen the codebase, has never run `pnpm`, and may only know Seed Bible as a user. They should be able to go from the PR comment to finishing every test without asking anyone for help. The site lets them mark each test Pass / Fail / Blocked / Skip, add notes, pick up where they left off after a reload (results save in their browser), and copy their results as markdown to paste back into the PR.

**How publishing works.** The site (https://helloaolab.github.io/pr-test-plans/) is a static page in the public repo `HelloAOLab/pr-test-plans`. Each plan is one JSON file at `plans/seed-bible/<pr number>/<short commit>.json`, and every push to that repo's `main` redeploys the site within a minute or two. A PR gets one plan per commit it's tested at. Older plans are never overwritten, and the page links between them. That repo's `README.md` is the reference for the plan format, and its `tools/plan.mjs` checks a plan.

This skill runs unattended inside a Claude Code routine, so nobody can answer questions or approve anything. Running this skill **is** the approval to do exactly two things:

- commit **one new plan file** to `HelloAOLab/pr-test-plans` `main`
- post this skill's **one comment** on the PR, or edit it if it's already there (like the deployment comment, each PR has one test plan comment that's kept up to date), and mark any older duplicates of it as duplicates (GitHub folds them away)

Take no other GitHub action. Don't approve, request changes, label, edit or push to the PR, comment on issues, or change any other file in `pr-test-plans` (its page and tools change only through normal PRs).

## 1. Find the PR

Use the PR number passed as an argument if there is one. Otherwise take it from the GitHub event context the routine provided. If neither gives you a PR number, stop without posting anything. Never guess a PR.

Read the basics: `gh pr view <n> --json number,title,body,url,author,headRefName,headRefOid,isCrossRepository,closingIssuesReferences,files`. The **head commit** is `headRefOid`; its first 7 characters are the **short commit**.

## 2. Get the test plans repo, and stop early if there's nothing to do

Use an existing checkout of `HelloAOLab/pr-test-plans` if the routine already has one (update it with `git pull --ff-only`). Otherwise clone it next to this repo:

```bash
gh repo clone HelloAOLab/pr-test-plans ../pr-test-plans -- --depth 1
```

If you can't clone it, carry on anyway. Step 7 explains how to post without the site.

Then find this skill's comment on the PR, if there is one. It's the comment containing `<!-- routine-pr-human-review-plan`:

```bash
gh api repos/HelloAOLab/seed-bible/issues/<n>/comments --paginate \
  --jq '.[] | select(.body | contains("<!-- routine-pr-human-review-plan")) | {id, node_id, login: .user.login, created_at, body}'
```

If there's more than one (older runs posted new comments), use the newest; step 8 marks the others as duplicates. Then check what already exists for this commit:

- **The comment's marker already says `sha=<full head commit>`.** This commit is done. Stop.
- **A plan file already exists** at `plans/seed-bible/<n>/<short commit>.json`, but the comment doesn't point at it yet. Don't write another plan; skip to step 8 to update or post the comment.
- Otherwise, carry on and write the plan.

## 3. Gather context

- PR discussion: `gh pr view <n> --comments`.
- Linked issues: everything in `closingIssuesReferences`, plus issues the body refers to. Read each with `gh issue view <n> --comments`. Acceptance criteria and repro steps in issues are the best source of tests.
- The change itself: `gh pr diff <n>`, and read the changed files in full where you need to understand what the user will actually see. Read them from a separate folder holding the PR's code: reuse `../seed-bible-pr-<n>` if the code review already made it, or create it with `git fetch origin pull/<n>/head && git worktree add --detach ../seed-bible-pr-<n> FETCH_HEAD`. **Don't switch this checkout to the PR branch.** The routine's skills are read from it, so it must stay on the default branch. To learn which buttons, labels, and menu names a tester will see, use the English strings in `packages/seed-bible/seed-bible/i18n/en.json`, not component or function names.
- Earlier discussion: if a reviewer already reported a bug, or a comment explains how to reach a hidden feature, use it.
- Earlier plans for this PR: other files in `plans/seed-bible/<n>/`. If there are any, read "Building on earlier plans" in step 4 before deciding what to test.

**Preview build.** The CD workflow deploys every same-repo PR branch and keeps one PR comment up to date with the link. Find the comment containing `<!-- deployment-link -->` and take the `https://alpha.seedbible.org/b/...` URL from it. If there's no such comment and `isCrossRepository` is false, use `https://alpha.seedbible.org/b/<branch>`, where `<branch>` is `headRefName` with every character outside `a-zA-Z0-9-` replaced by `_`. That link starts working once the deploy finishes. A PR from a fork gets no preview. In that case leave out `preview` and make setup a local run (see below).

## 4. Decide what to test

Test what a person can see and do in the app, not how the code is built.

- Cover the main thing the PR delivers first, then the edge cases and error paths a person can actually trigger: signed out vs. signed in, empty state (no notes yet, no search results), very long text, a slow or offline connection (browser dev tools are too technical; use airplane mode or turning off Wi-Fi), phone-width screens, dark mode, a second language if UI text changed, and two browsers at once for shared/multiplayer features.
- Add a short "Things that should not have changed" section for nearby features the diff touches, so testers catch regressions.
- One behavior per test. Aim for about 5–15 tests in total; a tiny fix may need 2–3. Order them so earlier tests set up later ones (for example, create a note before the test that deletes one) and say so in `before`.
- Steps are exact actions with exact text to type ("Open **John 3**", "Type `Testing`"). Use the button and menu names the app shows. Give keyboard shortcuts for both Mac and Windows.
- Each expected result is something the tester can see on screen, not "it works" or "the record is saved".
- List anything that can't be checked through the app (refactors, build or CI changes, logic fully covered by unit tests) in `notCovered`, in plain words.
- Don't invent behavior. If the PR or issue is unclear about what should happen, write the test for what the code does and say in `why` that the intended behavior isn't stated, so testers can flag it.

**Building on earlier plans.** When the PR already has plans for earlier commits, the new plan builds on them rather than starting from scratch. Testers' results don't carry over between plans, so the new plan must still be **complete**: it tests everything that matters for the PR as it is now, not just the latest changes.

1. **Read the newest earlier plan.** That's the file in `plans/seed-bible/<n>/` with the latest `generatedAt`; its `pr.commit` is the commit it was written for.
2. **Find what changed since then.** In the PR folder, run `git diff <earlier commit>..<head commit>`, fetching the earlier commit first if git doesn't have it (`git fetch origin <earlier commit>`). If the earlier commit is gone (the branch was force-pushed), compare `gh pr diff <n>` with what the earlier plan covers instead.
3. **Read testers' results for earlier plans.** They're PR comments starting with `### 🧪 Manual test results`, and their `[Test plan](…?plan=seed-bible/<n>/<commit>)` link says which plan they used. Test IDs like `T3` refer to **that** plan's numbering, so match them to test titles in that plan's file. Also read any other comments where people describe testing the PR by hand.
4. **Write the new plan:**
   - Keep tests whose feature didn't change, with the same wording and order, so returning testers recognize them.
   - Update tests whose feature changed, and add tests for new behavior. Start their `why` with "New since commit `<earlier short commit>`." or "Changed since commit `<earlier short commit>`: <what changed>."
   - Make sure everything that **failed or was blocked** in earlier results gets tested again, whether or not the new commits touched it. Start its `why` with "Failed on the plan for commit `<earlier short commit>`: <the tester's note, shortened>." (or "Blocked on …"). If the new commits were meant to fix it, say so.
   - Drop tests for behavior the PR no longer includes, and mention it in the summary.
   - Start the `summary` with one sentence on what changed since the last plan, then describe the PR as a whole.

**Setup** must get a non-developer from zero to the first test. Put what every test needs in the plan's `setup`, and what only one section needs in that section's own `setup` (it shows as "Before these tests" at the top of the section). For example, signing in with a second account goes in the sharing section, not at the top. Include, as needed:

- Opening the preview link, which browsers to use, and that a hard refresh (Ctrl+Shift+R, or Cmd+Shift+R on Mac) fixes a page that still looks like the old version. The app caches itself, so this happens often.
- Signing in (email code: they need an email inbox they can check), and that a private/incognito window gives them a clean start.
- Any data the tests need first (highlights, notes, saved passages, a second account for sharing features), and how to make it.
- Any setting, extension, or screen size needed to reach the feature.
- Only when there's no preview build: a local run, written for someone who has never used a terminal. Take the install steps from `README.md` (Git, Node.js via nvm, pnpm 10 via corepack), then `git clone`, `gh pr checkout <n>` (or `git fetch origin pull/<n>/head:pr-<n> && git checkout pr-<n>`), `pnpm install`, `pnpm dev`, and open the address it prints. Put each command in a step's `code` field.

If the PR has **nothing a person can check in the app** (docs, CI, tooling, tests only, or an internal refactor with no visible effect), don't write a plan. Post or update the test plan comment instead (step 8), with just the note, marker and heading, then a sentence or two on why no manual testing is needed, and stop. If earlier commits did get plans, keep the "Earlier plans for this PR" list.

## 5. Write the plan

Write the plan to `plans/seed-bible/<n>/<short commit>.json` in the `pr-test-plans` checkout. The "Plan format" section of that repo's `README.md` is the authority on fields. In short:

```json
{
  "version": 1,
  "project": "Seed Bible",
  "title": "<PR title as on GitHub>",
  "summary": "Two or three plain sentences: what changed for the user and why.",
  "generatedAt": "<current UTC time, e.g. from: date -u +%Y-%m-%dT%H:%M:%SZ>",
  "pr": {
    "repo": "HelloAOLab/seed-bible",
    "number": 1234,
    "url": "https://github.com/HelloAOLab/seed-bible/pull/1234",
    "branch": "<headRefName>",
    "commit": "<full head commit sha>"
  },
  "links": [
    {
      "label": "Issue 1200: <issue title>",
      "url": "https://github.com/HelloAOLab/seed-bible/issues/1200"
    }
  ],
  "preview": {
    "url": "https://alpha.seedbible.org/b/feature_1234",
    "label": "Open the preview build"
  },
  "setup": [
    {
      "title": "Short step name",
      "body": "What to do, in plain words.",
      "code": "optional command to copy"
    }
  ],
  "sections": [
    {
      "title": "Section name",
      "intro": "Optional one-line description.",
      "setup": [{ "title": "Optional: preparation only this section needs" }],
      "tests": [
        {
          "title": "What this test checks, as a short sentence",
          "why": "Optional: why it matters / which part of the change it covers.",
          "before": "Optional: anything that must be true first.",
          "steps": ["Exact action one.", "Exact action two."],
          "expected": ["What appears on screen."]
        }
      ]
    }
  ],
  "notCovered": ["Optional plain-language list."]
}
```

- Text fields are plain text with three extras: `` `code` ``, `**bold**`, and bare `https://` links. HTML is shown as literal text, and every link must be `https://`.
- Don't number tests yourself. The page numbers them T1, T2, … in reading order.
- Never edit or delete another plan file, even an earlier plan for the same PR.

Check it from the `pr-test-plans` checkout, and fix the JSON until it passes:

```bash
node tools/plan.mjs validate plans/seed-bible/<n>/<short commit>.json
```

## 6. Publish it

From the `pr-test-plans` checkout, commit **only** the new plan file and push to `main`:

```bash
git add plans/seed-bible/<n>/<short commit>.json
git commit -m "chore: add test plan for seed-bible PR <n> (<short commit>)"
git push origin HEAD:main
```

If the push is rejected because `main` moved (another plan landed first), run `git pull --rebase origin main` and push again, up to three times. Plans never touch the same file, so the rebase won't conflict.

Go straight on to the comment once the push succeeds; don't wait for the site to update. The routine's sandbox can't reach `github.io` anyway, and the page tells anyone who clicks too early that new plans take a minute or two to appear.

## 7. If the site can't be used

If cloning, committing, or pushing fails, don't retry in other ways (no other repos, no file hosts, no artifacts). Post or update the comment without the link: keep the heading, note, marker and the plain checklist, and say in one line that the interactive page couldn't be published and why (the error, in plain words). If you couldn't clone the repo, write the checklist by hand in the same shape as `tools/plan.mjs checklist` produces.

## 8. Post or update the comment

Each PR has **one** test plan comment, kept up to date like the deployment comment. Make the plain checklist from the `pr-test-plans` checkout:

```bash
node tools/plan.mjs checklist plans/seed-bible/<n>/<short commit>.json > checklist.md
```

Write the whole comment to a file, in this format with the placeholders filled in:

```markdown
> [!NOTE]
> This test plan was generated by a Claude Code routine setup by Ryan Cook (ryan@helloao.org).

<!-- routine-pr-human-review-plan sha=<full head commit> -->

## 🧪 Manual test plan

**[Open the test plan](https://helloaolab.github.io/pr-test-plans/?plan=seed-bible/<n>/<short commit>)** · <N> tests · written for commit `<short commit>` on <date, e.g. Oct 7, 2026>

Work through the tests on the page and mark each one. Your results save in your browser, so you can stop and come back. When you're done, choose **Copy results** and paste them in a comment here. A brand-new plan can take a couple of minutes to appear on the site.

<sub>[Plan file](https://github.com/HelloAOLab/pr-test-plans/blob/main/plans/seed-bible/<n>/<short commit>.json)</sub>

<details>
<summary>Plain checklist (if the page doesn't open for you)</summary>

<contents of checklist.md>

</details>
```

Then post it, or update the existing comment from step 2 in place (both read the body from the file, which avoids shell-quoting problems):

```bash
gh pr comment <n> --body-file comment.md                                                  # no comment yet
gh api -X PATCH repos/HelloAOLab/seed-bible/issues/comments/<id> -F body=@comment.md      # update the existing one
```

- The main link always points at **this exact commit's plan**, so it's the newest plan for as long as this comment shows it.
- **If the PR has plans for earlier commits**, add this line under the instructions paragraph: "This plan replaced earlier ones as the PR changed. Results don't carry over between plans, so start fresh on this one. Tests that are new, changed, or failed last time say so at the top." Then, after the checklist, add a folded list of those plans, newest first, so their links aren't lost when the comment is updated:

  ```markdown
  <details>
  <summary>Earlier plans for this PR</summary>

  - [Commit `abc1234`](https://helloaolab.github.io/pr-test-plans/?plan=seed-bible/<n>/abc1234) · Oct 3, 2026
  - …

  </details>
  ```

- Keep the blank lines after each `</summary>` and before each `</details>`, or GitHub won't render the markdown inside.
- GitHub doesn't notify anyone when a comment is edited. That's fine: new commits and the new code review comment already do.
- **If step 2 found older duplicate test plan comments**, mark them as duplicates once the current comment is posted or updated, so only one is shown in full. Only touch comments containing `<!-- routine-pr-human-review-plan` that were written by the same account as the current one. Use their `node_id` from the step 2 listing:

  ```bash
  gh api graphql -F id=<node_id> -f query='
    mutation($id: ID!) {
      minimizeComment(input: { subjectId: $id, classifier: DUPLICATE }) { minimizedComment { isMinimized } }
    }'
  ```

  GitHub folds them to one line ("marked as duplicate"), and anyone can still expand them. If marking fails, leave it and mention it in your output.

**Gotchas**

- GitHub turns `#` followed by a number into a link to that issue or PR. Never write `#1` to mean "item 1". Test IDs are `T1`, `T2`, and plain items are "No. 1".
- A GitHub comment can be at most 65,536 characters. If the checklist would push it over, drop the `<details>` checklist and keep the link.
