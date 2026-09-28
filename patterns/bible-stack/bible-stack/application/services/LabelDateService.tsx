import {
  type LabelDateFormat,
  LabelDateFormats,
} from "../../domain/models/label";
import type { LabelDateEventPort } from "../ports/out/LabelDate";
import type { LabelDateFormatGetterPort } from "../ports/in/LabelDate";

interface LabelDateServiceProps {
  dateFormat?: LabelDateFormat;
  eventPort: LabelDateEventPort;
}

export class LabelDateService implements LabelDateFormatGetterPort {
  #dateFormat: NonNullable<LabelDateServiceProps["dateFormat"]>;
  #eventPort: LabelDateServiceProps["eventPort"];

  constructor({
    dateFormat = LabelDateFormats.Absolute,
    eventPort,
  }: LabelDateServiceProps) {
    this.#dateFormat = dateFormat;
    this.#eventPort = eventPort;
  }

  get dateFormat() {
    return this.#dateFormat;
  }

  changeDateFormat(newFormat: LabelDateFormat): void {
    if (this.#dateFormat !== newFormat) {
      this.#dateFormat = newFormat;
      this.#eventPort.emit("OnLabelDateFormatChange");
    }
  }
}
