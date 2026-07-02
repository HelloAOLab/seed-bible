export function getProjectFromSelection(
  selection: Record<string, any>,
  projectChapterState: { NotStarted?: unknown; Unset?: unknown } | undefined
): Record<string, any> {
  const project = JSON.parse(JSON.stringify(selection));
  for (const testamentName of Object.keys(project)) {
    const testament = project[testamentName];
    for (const sectionName of Object.keys(testament)) {
      const section = testament[sectionName];
      for (const bookName of Object.keys(section)) {
        const chapters = section[bookName];

        section[bookName] = chapters.map((value: unknown) => {
          return value
            ? projectChapterState?.NotStarted
            : projectChapterState?.Unset;
        });
      }
    }
  }
  return project;
}
