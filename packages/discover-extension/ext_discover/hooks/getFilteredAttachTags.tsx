import { WITHOUTLOGIN_TAGS } from "ext_discover.models.attachLink";
import { getAttachLinkTags } from "ext_discover.hooks.getAttachLinkTags";

export interface GetFilteredAttachTagsParams {
  isLoggedIn: boolean;
  isPlaylist: boolean;
  isTags: boolean;
  isDate: boolean;
  canRecord: boolean;
}

export function getFilteredAttachTags({
  isLoggedIn,
  isPlaylist,
  isTags,
  isDate,
  canRecord,
}: GetFilteredAttachTagsParams): string[] {
  return getAttachLinkTags().filter(
    (ele) =>
      (isLoggedIn || !WITHOUTLOGIN_TAGS[ele]) &&
      (ele === "PLAYLIST"
        ? isPlaylist
        : ele === "TAG"
          ? isTags
          : ele === "DATE"
            ? isDate
            : ele === "RECORDING"
              ? canRecord
              : true)
  );
}
