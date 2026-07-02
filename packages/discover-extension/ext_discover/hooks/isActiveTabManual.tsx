export function isActiveTabManual(activeTab: string): boolean {
  return activeTab === t("createManually");
}

export function getAddNewPlaylistTabsVals(): string[] {
  return [t("createManually"), t("importTab")];
}

export function getAddNewPlaylistImportTabsVals(): string[] {
  return [t("googleSheet"), t("jsonFormat")];
}

export function isActiveSheetImport(
  importTab: string,
  importTabsVal = getAddNewPlaylistImportTabsVals()
): boolean {
  return importTabsVal[0] === importTab;
}
