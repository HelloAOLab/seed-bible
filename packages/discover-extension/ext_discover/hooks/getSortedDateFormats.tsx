import { DATE_FORMAT_OPTIONS } from "ext_discover.models.playlistConstants";
import type { SelectOption } from "ext_discover.models.playlistConstants";

export function getSortedDateFormats(selectedValue: string): SelectOption[] {
  return [
    ...DATE_FORMAT_OPTIONS.filter((option) => option.value === selectedValue),
    ...DATE_FORMAT_OPTIONS.filter((option) => option.value !== selectedValue),
  ];
}
