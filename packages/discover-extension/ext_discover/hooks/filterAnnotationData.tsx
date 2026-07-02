import { getAnnotationTime } from "ext_discover.hooks.getAnnotationTime";

export function getAnnotationListDateOptions(t: (key: string) => string) {
  return [
    { label: t("anytime"), value: "any" },
    { label: t("yesterday"), value: "yesterday" },
    { label: t("last_week"), value: "last_week" },
    { label: t("last_month"), value: "last_month" },
    { label: t("last_year"), value: "last_year" },
    { label: t("custom_date_range"), value: "custom" },
  ];
}

export function getVersesOptionsFromBook(currentOpenedBook: any) {
  const versesSources: Array<{ label: string; value: number }> = [];
  currentOpenedBook?.content
    ?.map((cnt: any) => cnt.verses)
    .flat()
    .forEach((ele: any) => {
      if (ele.verseNumber) {
        versesSources.push({
          label: `${currentOpenedBook.book} ${currentOpenedBook.chapter}:${ele.verseNumber}`,
          value: ele.verseNumber,
        });
      }
    });
  return versesSources;
}

export function filterAnnotationData(
  annotationData: any[],
  filters: any,
  G: Record<string, any>
) {
  let fromDate = "";
  let toDate = "";
  if (filters.dateOption === "any") {
    fromDate = "";
    toDate = "";
  } else if (filters.dateOption === "yesterday") {
    fromDate = new Date(
      new Date().setDate(new Date().getDate() - 1)
    ).toISOString();
    toDate = new Date().toISOString();
  } else if (filters.dateOption === "last_week") {
    fromDate = new Date(
      new Date().setDate(new Date().getDate() - 7)
    ).toISOString();
    toDate = new Date().toISOString();
  } else if (filters.dateOption === "last_month") {
    fromDate = new Date(
      new Date().setMonth(new Date().getMonth() - 1)
    ).toISOString();
    toDate = new Date().toISOString();
  } else if (filters.dateOption === "last_year") {
    fromDate = new Date(
      new Date().setFullYear(new Date().getFullYear() - 1)
    ).toISOString();
    toDate = new Date().toISOString();
  } else if (filters.dateOption === "custom") {
    fromDate = filters.fromDate || "";
    toDate = filters.toDate || "";
  }

  if (filters.dateOption !== "custom" && fromDate && toDate) {
    fromDate = G.FORMAT_DATE(
      fromDate.split("T")[0],
      "MM-DD-YYYY",
      "YYYY-MM-DD"
    );
    toDate = G.FORMAT_DATE(toDate.split("T")[0], "MM-DD-YYYY", "YYYY-MM-DD");
  }

  const fromDateMs = getAnnotationTime(
    `${fromDate.replaceAll("-", "/")}T00:00:00Z`
  );
  const toDateMs = getAnnotationTime(
    `${toDate.replaceAll("-", "/")}T23:59:59Z`,
    true
  );

  return annotationData.filter((ele: any) => {
    let isMatch = true;
    if (Object.keys(filters.sources).length > 0) {
      isMatch = filters.sources[ele.data[0].createdBy];
    }
    if (Object.keys(filters.tags).length > 0) {
      isMatch =
        isMatch && ele.data[0].tags?.some((tag: string) => filters.tags[tag]);
    }
    if (Object.keys(filters.verse).length > 0) {
      isMatch =
        isMatch &&
        (Array.isArray(ele.verse)
          ? ele.verse.some((verse: string) => filters.verse[verse])
          : filters.verse[ele.verse]);
    }
    if (fromDate && fromDateMs) {
      isMatch = isMatch && ele.data[0].updatedAtMs >= fromDateMs;
    }
    if (toDate && toDateMs) {
      isMatch = isMatch && ele.data[0].updatedAtMs <= toDateMs;
    }
    return isMatch;
  });
}
