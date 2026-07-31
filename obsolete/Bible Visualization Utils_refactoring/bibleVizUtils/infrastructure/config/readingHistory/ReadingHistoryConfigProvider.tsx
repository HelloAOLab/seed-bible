const tenDaysAgo = new Date();
tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
tenDaysAgo.setHours(0, 0, 0, 0);
const recencyThresholdTimeSeconds = Math.floor(tenDaysAgo.getTime() / 1000);
export class ReadingHistoryConfigProvider {
  getRecencyThresholdTimeSeconds() {
    return recencyThresholdTimeSeconds;
  }
}
