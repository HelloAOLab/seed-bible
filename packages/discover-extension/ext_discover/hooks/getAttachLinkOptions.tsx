import {
  SEARCH_ADD_VALUE,
  RECORDING_VALUE,
} from "ext_discover.models.attachLink";

export function getAttachLinkOptions(t: (key: string) => string) {
  return [
    // { value: "text", label: "Heading Text" },
    // { value: SEARCH_ADD_VALUE, label: "Search & Add Verse,Chapter" },
    { value: "youtube", label: t("youtube") },
    { value: "externalLink", label: t("externalLink") },
    { value: "Video", label: t("video") },
    { value: "iframe", label: t("iframe") },
    // { value: RECORDING_VALUE, label: "Recording" },
    // { value: "aux", label: "AUX", disabled: true }
  ];
}

export function getAttachLinkTextTypeOptions(t: (key: string) => string) {
  return [
    { value: "heading", label: t("heading") },
    { value: "text", label: t("text") },
  ];
}

export { SEARCH_ADD_VALUE, RECORDING_VALUE };
