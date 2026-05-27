import {
  type LabelDateFormatType,
  LabelDateFormat,
} from "bibleVizUtils.models.label";

class LabelService {
  #dateFormat: LabelDateFormatType = LabelDateFormat.Absolute;

  getDateFormat(): LabelDateFormatType {
    return this.#dateFormat;
  }

  setDateFormat(newFormat: LabelDateFormatType): void {
    this.#dateFormat = newFormat;
  }
}

const labelService = new LabelService();

export { labelService };
