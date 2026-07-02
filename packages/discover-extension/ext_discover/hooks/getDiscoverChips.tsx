import type { DiscoverChipItem } from "ext_discover.models.discover";

export function getDiscoverChips(): DiscoverChipItem[] {
  const chips: DiscoverChipItem[] = [
    { key: "all", label: "All" },
    { key: "shared", label: "Shared" },
    { key: "playlist", label: "Playlist" },
  ];

  if (DEV_ENV) {
    chips.push({ key: "annotations", label: "Annotations" });
  }

  return chips;
}
