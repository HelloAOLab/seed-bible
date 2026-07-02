export interface PlaylistDateIssues {
  datesRepeat: Record<string, string[]>;
  datesInWrongOrder: Record<string, string[]>;
}

export function computePlaylistDateIssues(
  transformedHistory: any[]
): PlaylistDateIssues {
  const datesRepeat: Record<string, string[]> = {};
  const datesInWrongOrder: Record<string, string[]> = {};

  const seenDates = new Map<number, string>();
  const dateObjects = transformedHistory.filter(
    (obj: any) => obj.type === "date"
  );

  for (let i = 0; i < dateObjects.length; i++) {
    const current = dateObjects[i];
    const currentDate = new Date(current.additionalInfo.date);

    const dateKey = currentDate.getTime();
    if (seenDates.has(dateKey)) {
      const firstId = seenDates.get(dateKey)!;
      datesRepeat[firstId] = datesRepeat[firstId] || [];
      datesRepeat[firstId].push(current.id);
      datesRepeat[current.id] = [firstId];
    } else {
      seenDates.set(dateKey, current.id);
    }

    if (i > 0) {
      const previousDate = new Date(dateObjects[i - 1].additionalInfo.date);
      if (previousDate > currentDate) {
        const prevId = dateObjects[i - 1].id;
        datesInWrongOrder[prevId] = datesInWrongOrder[prevId] || [];
        datesInWrongOrder[prevId].push(current.id);
        datesInWrongOrder[current.id] = [prevId];
      }
    }
  }

  return { datesRepeat, datesInWrongOrder };
}
