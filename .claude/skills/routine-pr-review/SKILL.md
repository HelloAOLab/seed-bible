---
name: routine-pr-review
description: Entry point for the PR Claude Code routines. Runs every routine PR task for the pull request in the routine's GitHub context (or a PR number argument), in order: the manual test plan (routine-pr-human-review-plan), then the code review (routine-pr-code-review), which checks the code against that plan. Unattended; posts without asking.
---

Run the routine pull request tasks for one PR. The routines that fire when a PR opens and when it's marked for review both call only this skill, so what they do is defined here, in the repo, rather than in each routine's settings.

This skill runs unattended inside a Claude Code routine, so nobody can answer questions or approve anything. Running it **is** the approval for everything the skills below describe, and nothing more:

- posting or updating the test plan comment, and posting a code review comment, on the PR
- hiding these skills' own earlier comments on that PR as outdated or duplicate (never anyone else's)
- committing one test plan file to `HelloAOLab/pr-test-plans`

## 1. Find the PR

Use the PR number passed as an argument if there is one. Otherwise take it from the GitHub event context the routine provided. If neither gives you a PR number, stop without doing anything. Never guess a PR.

## 2. Run the tasks, in order

Invoke each skill with the PR number as its argument, and follow its instructions fully before moving on:

1. `routine-pr-human-review-plan`: writes the manual test plan, publishes it, and posts or updates the PR's test plan comment.
2. `routine-pr-code-review`: reviews the code and posts the review. Tell it where the plan file for the current commit is (`plans/seed-bible/<n>/<short commit>.json` in the `pr-test-plans` checkout), or that there isn't one.

The plan comes first on purpose. Writing it means thinking through the change as the people using it will, and the review then checks the code against those tests. That catches problems a diff-only review tends to miss, like an empty state, a signed-out path, or a phone-width layout nobody handled.

This checkout must stay on the repository's default branch, because the skills are read from it. The skills put the PR's code in a separate folder (`../seed-bible-pr-<n>`) for that reason. After each task, check that this checkout is still on the default branch with no changes (`git status`). If anything moved it, for example a tool that checked out the PR, switch it back (`git switch <default branch>`) before starting the next task.

If one task fails or stops early, still run the other. The review works without a plan (for example when the PR has nothing to test by hand); it just skips the plan step. Each skill already checks whether it has done its work for this commit, so running both on both routine triggers is safe.

## 3. Finish

End the run with a short summary in your output (not on the PR): what each task did, such as posted, skipped because already done, or fell back, and anything that failed, with the error.
