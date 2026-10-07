---
name: routine-pr-review
description: Entry point for the PR Claude Code routines. Runs every routine PR task for the pull request in the routine's GitHub context (or a PR number argument), in order: the manual test plan (routine-pr-human-review-plan), then the code review (routine-pr-code-review), which checks the code against that plan. Unattended; posts without asking.
---

Run the routine pull request tasks for one PR. The routines that fire when a PR opens and when it's marked for review both call only this skill, so what they do is defined here, in the repo, rather than in each routine's settings.

This skill runs unattended inside a Claude Code routine, so nobody can answer questions or approve anything. Running it **is** the approval for everything the skills below describe, and nothing more:

- posting or updating the test plan comment, and posting a code review comment, on the PR
- collapsing the code review skill's own earlier reviews on that PR (never anyone else's comments)
- committing one test plan file to `HelloAOLab/pr-test-plans`

**Reaching GitHub:** all three skills follow [`GITHUB.md`](GITHUB.md) in this folder. Only `gh api` REST calls work in a routine; `gh` itself is installed by the cloud environment's setup script.

## 1. Start from an up-to-date default branch

The routine may start this checkout on a generated branch (like `claude/<name>`) or on an older commit. Before anything else, switch to the repository's default branch and bring it up to date:

```bash
git fetch origin
git switch <default branch>        # develop for seed-bible; see `git remote show origin` if unsure
git merge --ff-only origin/<default branch>
```

Skill text you were given when the session started may be older than what's on the default branch now. So from here on, **read every routine skill from disk**, including this one: open `.claude/skills/<name>/SKILL.md` with your file tools rather than relying on a copy loaded earlier. If this file on disk differs from what you were given, follow the version on disk.

## 2. Find the PR

Use the PR number passed as an argument if there is one. Otherwise take it from the GitHub event context the routine provided. If neither gives you a PR number, stop without doing anything. Never guess a PR.

## 3. Run the tasks, in order

For each skill, read its `SKILL.md` from disk (step 1), then follow it fully with the PR number as its argument before moving on:

1. `routine-pr-human-review-plan` (`.claude/skills/routine-pr-human-review-plan/SKILL.md`): writes the manual test plan, publishes it, and posts or updates the PR's test plan comment.
2. `routine-pr-code-review` (`.claude/skills/routine-pr-code-review/SKILL.md`): does its own full review, then also checks the code against the plan, and posts the review. Tell it where the plan file for the current commit is (`plans/seed-bible/<n>/<short commit>.json` in the `pr-test-plans` checkout), or that there isn't one.

The plan comes first on purpose. Writing it means thinking through the change as the people using it will, and after its own full review, the review also checks the code against those tests. That catches problems a diff-only review tends to miss, like an empty state, a signed-out path, or a phone-width layout nobody handled.

This checkout must stay on the repository's default branch, because the skills are read from it. The skills put the PR's code in a separate folder (`../seed-bible-pr-<n>`) for that reason. After each task, check that this checkout is still on the default branch with no changes (`git status`). If anything moved it, for example a tool that checked out the PR, switch it back (`git switch <default branch>`) before starting the next task.

If one task fails or stops early, still run the other. The review works without a plan (for example when the PR has nothing to test by hand); it just skips the plan step. Each skill already checks whether it has done its work for this commit, so running both on both routine triggers is safe.

## 4. Finish

Remove the PR's code folder so it doesn't pile up if the session handles more PRs: `git worktree remove --force ../seed-bible-pr-<n>` (ignore the error if it doesn't exist).

End the run with a short summary in your output (not on the PR): what each task did, such as posted, skipped because already done, or fell back, and anything that failed, with the error.
