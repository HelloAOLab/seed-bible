const G = globalThis;

if (that.tags.includes("drawingData") && G.HandleStorageChange) {
  G.HandleStorageChange({
    newValue: masks.drawingData,
  });
}
