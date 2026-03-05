export const handleStorageChange = (
  e: any,
  isSyncing: any,
  mergeDrawingData: any,
  setDrawingData: any,
  redrawCanvas,
  drawingData
) => {
  if (e.newValue) {
    console.log("syncing");
    isSyncing.current = true;
    const newData = JSON.parse(e.newValue);

    // Merge and sort by timestamp to resolve conflicts
    const mergedData = mergeDrawingData(drawingData, newData);
    setDrawingData(mergedData);
    redrawCanvas(mergedData);

    setTimeout(() => {
      isSyncing.current = false;
    }, 100);
  }
};
