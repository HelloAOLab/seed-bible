const recencyThresholdTimeSeconds = 1; // TODO: Find the real value in previous versions at thisBot.masks.readingHistoryRecencyThresholdTimeSeconds;

export class ReadingHistoryConfigProvider {
  getRecencyThresholdTimeSeconds() {
    return recencyThresholdTimeSeconds;
  }
}
