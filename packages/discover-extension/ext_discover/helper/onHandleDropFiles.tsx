export function onHandleDropFiles(that?: any) {
  const G = globalThis as any;
  if (G.HandleUploadFiles) {
    G.ToggleCommandBox();
    G.ThruCommandBox = that.thruCommandBox;
    G.HandleUploadFiles({
      files: that.files,
    });
  }
}
