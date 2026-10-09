import type { useI18n } from "../i18n/I18nManager";
import type { ModalManager } from "../managers/ModalManager";
import type {
  PlayingState,
  PlaylistItemData,
} from "../managers/PlaylistManager";
import { PlaylistHtmlContent } from "./PlaylistHtmlContent/PlaylistHtmlContent";
import { PlaylistLinkContent } from "./PlaylistLinkContent/PlaylistLinkContent";
import { PlaylistItemNav } from "./PlaylistItemNav/PlaylistItemNav";

/**
 * Whether an item has content of its own to preview. Scripture is read in the
 * reader rather than previewed, so only text and link items qualify.
 */
export function canPreviewPlaylistItem(item: PlaylistItemData): boolean {
  return item.type !== "bible-verse";
}

/**
 * Opens a text or link item in the app's generic modal: an HTML snippet renders
 * sanitized, and a link renders as a video, an embed, or an "Open" button
 * depending on what its URL points at. Scripture items are ignored — they have
 * no preview.
 *
 * `modalId` is the caller's own, so a reading-plan preview can't close the
 * playlist playback modal (or the reverse) out from under the user.
 *
 * Pass `playing` when the item is a step of a playing playlist: the modal then
 * swaps its X button for Previous / Next buttons that move through the queue.
 *
 * Shared by playlist playback, the reading-plan wizard, and the plan detail
 * view so an item looks the same wherever it is previewed.
 */
export function openPlaylistItemPreview(
  modals: ModalManager,
  item: PlaylistItemData,
  modalId: string,
  t: ReturnType<typeof useI18n>["t"],
  playing?: PlayingState
): void {
  if (item.type === "bible-verse") {
    return;
  }
  modals.openModal({
    id: modalId,
    title:
      item.title?.trim() ||
      (item.type === "link" ? item.preview?.title : undefined) ||
      t("content", { defaultValue: "Content" }),
    content: () =>
      item.type === "html" ? (
        <PlaylistHtmlContent html={item.html} />
      ) : (
        <PlaylistLinkContent
          url={item.url}
          title={item.title}
          embed={item.embed}
          preview={item.preview}
        />
      ),
    ...(playing
      ? {
          footer: () => <PlaylistItemNav playing={playing} />,
          showCloseButton: false,
        }
      : {}),
  });
}
