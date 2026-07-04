type Range = {
  start: number;
  end: number;
};

export type GetDayRangeSecondsType = (timestamp: number) => Range;
export type GetPastDateInfoType = (
  time: number,
  lang?: string
) => {
  weekday: string | undefined;
  day: number;
  month: number;
  monthName: string;
  year: number;
};

export const GetDayRangeSeconds: GetDayRangeSecondsType = (timestamp) => {
  const date = new Date(timestamp);

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return {
    start: Math.floor(start.getTime() / 1000),
    end: Math.floor(end.getTime() / 1000),
  };
};

export const GetPastDateInfo: GetPastDateInfoType = (time, lang = "en-US") => {
  const date = new Date(time);

  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const weekday = weekdays[date.getDay()];
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const monthName = date.toLocaleString(lang, { month: "short" });

  return { weekday, day, month, monthName, year };
};
