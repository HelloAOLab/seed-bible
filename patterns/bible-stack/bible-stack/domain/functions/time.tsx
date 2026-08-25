import type { LabelDateFormat } from "../models/label";

function ComputeAbsoluteDateText({
  range,
  currentYear,
}: {
  range: { min: number; max: number };
  currentYear: number;
}) {
  return `${currentYear - range.min}${range.min != range.max ? `-${currentYear - range.max}` : ``} years ago`;
}

function ComputeRelativeDateText(range: { min: number; max: number }) {
  return `${Math.abs(range.min)}${range.min != range.max ? `-${Math.abs(range.max)}` : ``} ${range.min < 0 ? "B.C." : "A.D."}`;
}

export function ComputeDateLabelText({
  format,
  range,
  currentYear,
}: {
  format: LabelDateFormat;
  range: { min: number; max: number };
  currentYear: number;
}) {
  switch (format) {
    case "Absolute":
      return ComputeAbsoluteDateText({ range, currentYear });
    case "Relative":
      return ComputeRelativeDateText(range);
  }
}
