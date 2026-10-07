---
name: routine-pr-human-review-plan
description: Unattended skill for Claude Code routines. Writes a step-by-step manual test plan for a pull request, publishes it to the HelloAO Test Plans site (helloaolab.github.io/pr-test-plans) by committing the plan JSON to HelloAOLab/pr-test-plans, and posts the link on the PR. Takes the PR from the routine's GitHub context or a PR number argument.
---

Write a manual test plan for a pull request on this repository, publish it on the HelloAO Test Plans site, and post the link on the PR.

The plan is for **people, not developers**. Assume the tester has never seen the codebase, has never run `pnpm`, and may only know Seed Bible as a user. They should be able to go from the PR comment to finishing every test without asking anyone for help. The site lets them mark each test Pass / Fail / Blocked / Skip, add notes, pick up where they left off after a reload (results save in their browser), and copy their results as markdown to paste back into the PR.

**How publishing works.** The site (https://helloaolab.github.io/pr-test-plans/) is a static page in the public repo `HelloAOLab/pr-test-plans`. Each plan is one JSON file at `plans/seed-bible/<pr number>/<short commit>.json`, and every push to that repo's `main` redeploys the site within a minute or two. A PR gets one plan per commit it's tested at. Older plans are never overwritten, and the page links between them. That repo's `README.md` is the reference for the plan format, and its `tools/plan.mjs` checks a plan.

This skill runs unattended inside a Claude Code routine, so nobody can answer questions or approve anything. Running this skill **is** the approval to do exactly two things:

- commit **one new plan file** to `HelloAOLab/pr-test-plans` `main`
- post **one comment** on the PR

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

Then check what already exists for this commit:

- **A plan file already exists** at `plans/seed-bible/<n>/<short commit>.json`, which happens when both routines run without new commits in between. Don't write another. If the PR already has a comment containing `<!-- routine-pr-human-review-plan sha=<full head commit>`, stop: there's nothing to do. Otherwise skip to step 8 and post the comment for the existing plan.
- **No plan file, but the PR already has this skill's comment for this commit** (for example a "no manual testing needed" note). Stop.

## 3. Gather context

- PR discussion: `gh pr view <n> --comments`.
- Linked issues: everything in `closingIssuesReferences`, plus issues the body refers to. Read each with `gh issue view <n> --comments`. Acceptance criteria and repro steps in issues are the best source of tests.
- The change itself: `gh pr diff <n>`, and read the changed files in full where you need to understand what the user will actually see. Read them from a separate folder holding the PR's code: reuse `../seed-bible-pr-<n>` if the code review already made it, or create it with `git fetch origin pull/<n>/head && git worktree add --detach ../seed-bible-pr-<n> FETCH_HEAD`. **Don't switch this checkout to the PR branch.** The routine's skills are read from it, so it must stay on the default branch. To learn which buttons, labels, and menu names a tester will see, use the English strings in `packages/seed-bible/seed-bible/i18n/en.json`, not component or function names.
- Earlier discussion: if a reviewer already reported a bug, or a comment explains how to reach a hidden feature, use it.
- Earlier plans for this PR (other files in `plans/seed-bible/<n>/`): reuse what still applies, and focus new or changed tests on what the new commits changed.

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

**Setup** must get a non-developer from zero to the first test. Put what every test needs in the plan's `setup`, and what only one section needs in that section's own `setup` (it shows as "Before these tests" at the top of the section). For example, signing in with a second account goes in the sharing section, not at the top. Include, as needed:

- Opening the preview link, which browsers to use, and that a hard refresh (Ctrl+Shift+R, or Cmd+Shift+R on Mac) fixes a page that still looks like the old version. The app caches itself, so this happens often.
- Signing in (email code: they need an email inbox they can check), and that a private/incognito window gives them a clean start.
- Any data the tests need first (highlights, notes, saved passages, a second account for sharing features), and how to make it.
- Any setting, extension, or screen size needed to reach the feature.
- Only when there's no preview build: a local run, written for someone who has never used a terminal. Take the install steps from `README.md` (Git, Node.js via nvm, pnpm 10 via corepack), then `git clone`, `gh pr checkout <n>` (or `git fetch origin pull/<n>/head:pr-<n> && git checkout pr-<n>`), `pnpm install`, `pnpm dev`, and open the address it prints. Put each command in a step's `code` field.

If the PR has **nothing a person can check in the app** (docs, CI, tooling, tests only, or an internal refactor with no visible effect), don't write a plan. Post a short comment instead (the step 8 heading, note and marker, then a sentence or two on why no manual testing is needed), and stop.

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

Then wait for the plan to go live, so the link works when people click it. Check `https://helloaolab.github.io/pr-test-plans/plans/seed-bible/<n>/<short commit>.json` about every 20 seconds, for up to 5 minutes, until it returns 200. If it still isn't live, post anyway; the comment says it can take a few minutes.

## 7. If the site can't be used

If cloning, committing, or pushing fails, don't retry in other ways (no other repos, no file hosts, no artifacts). Post the comment without the link: keep the heading, note, marker and the plain checklist, and say in one line that the interactive page couldn't be published and why (the error, in plain words). If you couldn't clone the repo, write the checklist by hand in the same shape as `tools/plan.mjs checklist` produces.

## 8. Post the comment

Make the plain checklist from the `pr-test-plans` checkout:

```bash
node tools/plan.mjs checklist plans/seed-bible/<n>/<short commit>.json > checklist.md
```

Write the comment to a file and post it with `gh pr comment <n> --body-file <file>` (avoids shell-quoting problems). Post exactly once. Use this format, filling in the placeholders:

```markdown
> [!NOTE]
> This test plan was generated by a Claude Code routine setup by Ryan Cook (ryan@helloao.org).

<!-- routine-pr-human-review-plan sha=<full head commit> -->

## 🧪 Manual test plan

**[Open the test plan](https://helloaolab.github.io/pr-test-plans/?plan=seed-bible/<n>/<short commit>)** · <N> tests · written for commit `<short commit>`

Work through the tests on the page and mark each one. Your results save in your browser, so you can stop and come back. When you're done, choose **Copy results** and paste them in a comment here.

<details>
<summary>Plain checklist (if the page doesn't open for you)</summary>

<contents of checklist.md>

</details>
```

- Keep the blank lines around the checklist inside `<details>`, or GitHub won't render it as markdown.
- If this PR already has plans for earlier commits, add one line under the bold link: "Plans for earlier commits are still available from the page. Results don't carry over between plans, so start fresh on this one."
- The link points at this exact commit's plan, so it stays correct when later commits add newer plans.

**Gotchas**

- GitHub turns `#` followed by a number into a link to that issue or PR. Never write `#1` to mean "item 1". Test IDs are `T1`, `T2`, and plain items are "No. 1".
- A GitHub comment can be at most 65,536 characters. If the checklist would push it over, drop the `<details>` checklist and keep the link.
