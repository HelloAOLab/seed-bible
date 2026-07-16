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
    const url =
      branch === "main"
        ? "https://prod.seedbible.org"
        : `https://alpha.seedbible.org/b/${branch}/${buildId}`;
    const summary =
      branch === "main"
        ? `Deployed **main** to the site root → ${url}`
        : `Deployed branch **${branch}** → ${url}`;
    const body = `${marker}\n## 🚀 Deployment\n\n${summary}\n\nCommit: \`${buildId}\``;

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
