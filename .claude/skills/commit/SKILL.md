Commit all staged changes.

1. Run `git diff --staged` to review what is staged.
2. If nothing is staged, inform the user and STOP. Do not look at unstaged changes or suggest staging them — only work with what is already staged.
3. Write a commit message following the repository style:
   - Prefix with commit type as defined by Conventional Commits (https://www.conventionalcommits.org/en/v1.0.0/) ie `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, etc.
   - Followed by a colon and a concise description of what changed and why
   - If a description is needed, keep it terse.
   - Example: `feat: simplify movement to orthogonal tile steps on shared position`
   - DO NOT include Co-authored by lines.
4. Commit using that message (do not amend — always create a new commit).
