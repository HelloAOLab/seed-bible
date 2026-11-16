import type { LabelDateFormat } from "../../../domain/models/label";

export interface LabelDateServicePort {
  readonly dateFormat: LabelDateFormat;
  changeDateFormat(newFormat: LabelDateFormat): void;
}
