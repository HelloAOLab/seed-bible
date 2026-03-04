const G = globalThis as any;

if (that.tags.includes("drawingData") && G.HandleStorageChange) {
  G.HandleStorageChange({
    newValue: masks.drawingData,
  });
}
