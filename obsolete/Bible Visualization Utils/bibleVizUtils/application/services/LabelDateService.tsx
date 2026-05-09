import {
  type LabelDateFormatType,
  LabelDateFormat,
} from "bibleVizUtils.domain.models.label";
import type { LabelDateEventPort } from "bibleVizUtils.domain.ports.labelDate";
import type { LabelDateFormatServicePort } from "bibleVizUtils.domain.ports.label";

interface LabelDateServiceProps {
  dateFormat?: LabelDateFormatType;
  eventPort: LabelDateEventPort;
}

export class LabelDateService implements LabelDateFormatServicePort {
  #dateFormat: NonNullable<LabelDateServiceProps["dateFormat"]>;
  #eventPort: LabelDateServiceProps["eventPort"];

  constructor({
    dateFormat = LabelDateFormat.Absolute,
    eventPort,
  }: LabelDateServiceProps) {
    this.#dateFormat = dateFormat;
    this.#eventPort = eventPort;
  }

  get dateFormat() {
    return this.#dateFormat;
  }

  changeDateFormat(newFormat: LabelDateFormatType): void {
    if (this.#dateFormat !== newFormat) {
      this.#dateFormat = newFormat;
      this.#eventPort.emit("OnLabelDateFormatChange");
    }
  }
}
