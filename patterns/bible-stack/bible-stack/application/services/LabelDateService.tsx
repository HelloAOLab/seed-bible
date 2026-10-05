import {
  type LabelDateFormat,
  LabelDateFormats,
} from "../../domain/models/label";
import type { EventManagerPort } from "../ports/out/EventManager";
import type { BibleStackEvents } from "../../domain/models/events";
import type { LabelDateServicePort } from "../ports/in/LabelDate";

interface LabelDateServiceProps {
  dateFormat?: LabelDateFormat;
  eventManagerPort: EventManagerPort<BibleStackEvents>;
}

export class LabelDateService implements LabelDateServicePort {
  #dateFormat: NonNullable<LabelDateServiceProps["dateFormat"]>;
  #eventManagerPort: LabelDateServiceProps["eventManagerPort"];

  constructor({
    dateFormat = LabelDateFormats.Absolute,
    eventManagerPort,
  }: LabelDateServiceProps) {
    this.#dateFormat = dateFormat;
    this.#eventManagerPort = eventManagerPort;
  }

  get dateFormat() {
    return this.#dateFormat;
  }

  changeDateFormat(newFormat: LabelDateFormat): void {
    if (this.#dateFormat !== newFormat) {
      this.#dateFormat = newFormat;
      this.#eventManagerPort.emit("OnLabelDateFormatChange");
    }
  }
}
