export function getAnnotationTime(
  dateTimeStr: string,
  isToDate: boolean = false
): number | null {
  if (!dateTimeStr) return null;

  const [datePart, timePart] = dateTimeStr.split("T");
  if (!datePart || !timePart) return null;

  const [month, day, year] = datePart.split("/").map(Number);
  if (!day || !month || !year) return null;

  return Date.UTC(
    year,
    month - 1,
    day,
    isToDate ? 23 : 0,
    isToDate ? 59 : 0,
    isToDate ? 59 : 0
  );
}
