import { uuid } from "casualos";

export class HistoryTimePeriodInfo {
  id: any;
  isNowTimePeriod: boolean;
  timeUnit: any;
  timeAmount: number;
  value: any;

  constructor({
    value,
    timeAmount = 0,
    timeUnit = BibleVizUtils.Data.tags.TimeUnit.Minutes,
    isNowTimePeriod = false,
  }) {
    this.value = value;
    this.timeAmount = timeAmount;
    this.timeUnit = timeUnit;
    this.isNowTimePeriod = isNowTimePeriod;
    this.id = uuid();
  }

  GetTimePeriodInMs() {
    let time;
    switch (this.timeUnit) {
      case BibleVizUtils.Data.tags.TimeUnit.Minutes:
        time = this.timeAmount * 60 * 1000;
        break;
      case BibleVizUtils.Data.tags.TimeUnit.Hours:
        time = this.timeAmount * 60 * 60 * 1000;
        break;
      case BibleVizUtils.Data.tags.TimeUnit.Days:
        time = this.timeAmount * 24 * 60 * 60 * 1000;
        break;
      case BibleVizUtils.Data.tags.TimeUnit.Weeks:
        time = this.timeAmount * 7 * 24 * 60 * 60 * 1000;
        break;
      case BibleVizUtils.Data.tags.TimeUnit.Months:
        time = this.timeAmount * 30.44 * 24 * 60 * 60 * 1000;
        break;
      case BibleVizUtils.Data.tags.TimeUnit.Years:
        time = this.timeAmount * 365.25 * 24 * 60 * 60 * 1000;
        break;

      default:
        break;
    }
    return time;
  }
}
