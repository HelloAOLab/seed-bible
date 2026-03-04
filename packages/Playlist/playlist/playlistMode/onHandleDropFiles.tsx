const G = globalThis;
if (G.HandleUploadFiles) {
  G.ToggleCommandBox();
  G.ThruCommandBox = that.thruCommandBox;
  G.HandleUploadFiles({
    files: that.files,
  });
}
