// Shared by cd.yml's push-triggered deploy job and its pull_request-triggered
// job, so both post an identical, marker-matched comment (upsert, not append).
module.exports = async ({
  github,
  context,
  core,
  branch,
  buildId,
  prNumbers,
}) => {
  const marker = "<!-- deployment-link -->";

  try {
    // Without a buildId, the link points at the bare `/b/<branch>` path,
    // which the host resolves + redirects to the latest build itself (see
    // resolveRoute()/302 handling in server/index.ts) — no buildId needed.
    const url =
      branch === "main"
        ? "https://prod.seedbible.org"
        : buildId
          ? `https://alpha.seedbible.org/b/${branch}/${buildId}`
          : `https://alpha.seedbible.org/b/${branch}`;
    const summary =
      branch === "main"
        ? `Deployed **main** to the site root → ${url}`
        : `Deployed branch **${branch}** → ${url}`;
    const commitLine = buildId ? `\n\nCommit: \`${buildId}\`` : "";
    const body = `${marker}\n## 🚀 Deployment\n\n${summary}${commitLine}`;

    for (const prNumber of prNumbers) {
      const { data: comments } = await github.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
      });
      const existing = comments.find((c) => c.body && c.body.includes(marker));
      if (existing) {
        await github.rest.issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: existing.id,
          body,
        });
      } else {
        await github.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: prNumber,
          body,
        });
      }
    }
  } catch (error) {
    core.warning(`Failed to post deployment comment: ${error}`);
  }
};
