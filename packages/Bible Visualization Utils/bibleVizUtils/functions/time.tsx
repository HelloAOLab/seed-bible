type Range = {
  start: number;
  end: number;
};

type GetDayRangeSecondsType = (timestamp: number) => Range;

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
